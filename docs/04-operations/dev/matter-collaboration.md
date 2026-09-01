# Matter Collaboration System

**Project:** Civizen  
**Routes:** `/contribute/matters`, `/contribute/matters/new`, `/contribute/matters/:matterId`  
**Status:** Phase 1 + Phase 2 (Collaborative Work) implemented; Phase 2 stabilization (work-completion gates + shared-responsibility acceptance) applied  
**Version:** 2.1

Canonical product/UX note for agents. Contribute hub: [`contribute-page.md`](./contribute-page.md).

A **Matter** is something one Civizen actor brings to one or more other actors for attention, response, discussion, consideration, or action. It is a generic collaboration object, not an Issues module and not limited to government/citizen interactions.

User-facing Contribute label: **Questions, Issues & Ideas**. Internal model remains `Matter`.

## Principle

Every **active** Matter must make clear:

1. who is expected to act next,
2. what action is expected,
3. when it is due,
4. what happens if no action is taken.

Operational state lives on **Matter Action Requirements**, not on one oversized Matter status enum.

## Lifecycle vs action state

Matter lifecycle: `draft` · `submitted` · `active` · `closed`.

User-facing status is **derived** (waiting for response, clarification needed, waiting for initiator, response overdue, addressed, automatically closed, reopened, …).

## Actors

Initiator and recipient are polymorphic:

- person (`profiles`)
- organization (business-linked `profiles` via `linked_accounts`)
- group (reserved; no groups table in this phase)

Do not model only `user_id`. Organization representatives use `current_profile_manages_publisher`.

## Invariants

1. A comment is not a formal action.
2. Disputing responsibility does not close or hide the Matter.
3. Auto-close is not initiator confirmation. Silence uses: *Closed automatically after no response from the initiator within the resolution-review period.*
4. Reopening is append-only; prior closure stays on the ledger.
5. Active Matters have a current action requirement, one or more pending actions, or an explicit waiting condition.
6. Deadline and history changes are attributable (human vs system).
7. Simple Matters stay simple: contextual formal actions only. Collaborative work is opt-in.
8. Completing a Task never marks the Matter resolved.

## Timing

Reusable `matter_timing_policies` (calendar days now; business days/hours reserved). Defaults for testing only:

| Policy | Period |
|--------|--------|
| Question response | 3 calendar days |
| Responsibility response | 2 calendar days |
| Clarification response | 5 calendar days |
| Resolution confirmation | 3 calendar days |
| Task acceptance | 1 calendar day |
| Task execution | 5 calendar days |
| Task review | 2 calendar days |
| Decision confirmation | 2 calendar days |
| Final work response | 3 calendar days |

Timeout behaviors are catalogued. Phase 1 **runs** `remind` and `auto_close` (initiator confirmation). Other types are stored for later (escalate, forward, involve, continue without response, return to initiator, mark unresponsive, require manual review).

`list_matters` is read-only. Timeouts, reminders, and auto-close run only in `process_matter_action_timeouts`, serialized by a transaction advisory lock and `FOR UPDATE SKIP LOCKED`. Production invocation:

1. **pg_cron** job `matter_action_timeout_tick` at minute 15 of every hour, when the `pg_cron` extension is installed.
2. Otherwise (or to run immediately): `scripts/db/run-matter-timeout-tick.sh`, which executes the same function as `postgres` over the remote database SSH path.

Page and list reads may **display** overdue from `due_at` without mutating workflow state.

## Question workflow

Comments and other ordinary discussion never start the initiator confirmation timer. Only **Provide final answer** (`respond`) does. The initiator can mark **Answered / satisfied** from discussion, ask for more information after a final answer, or record that the Question revealed an Issue without converting Matter type.

## Suggest Improvements

The Contribute card stays. `/contribute/improvements` is a shortcut into Matter create (`type=Suggestion`, intended recipient = official Civizen org). Area is left unset unless a future mapping is safe.

## Phase 1 surfaces

- Contribute lane **Questions, Issues & Ideas**
- Queues: Needs Your Action · My Matters · Participating · Organization
- Matter create, detail (current action, description, conversation, formal actions, activity)
- Formal actions, comments with replies, optional evidence URL/file
- Reminders, overdue, auto-close, reopen
- **Phase 2 Work:** optional **Start collaborative work**; Work / Decisions sections; Tasks with acceptance, execution, review, dependencies, subtasks; Decision records; Task comments and completion evidence; Contribute queue includes Task and Decision actions

## Distinct objects (Phase 2)

Keep these separate: **Matter** · **Matter Responsibility** · **Task** (`collaboration_tasks`) · **Task Assignment** · **Decision** · **Evidence** (matter attachments).

`matter_action_requirements` remains the only action clock. Task and Decision actions use `context_kind` + `context_id` so several pending clocks can exist at once. Timeout still runs only in `process_matter_action_timeouts`. Task overdue reminds; it does not auto-close the Matter. Auto-close remains initiator `confirm_resolution` only.

Responsible Lead is explicit (`matter_responsibilities`). A Task assignee is not automatically responsible for the Matter. Organizations can hold responsibility or Task assignment through the existing actor model. AI actors are reserved and not activated.

When work is finished, Responsible Lead calls **Review completed work and provide final response**, which assigns the existing Phase 1 `address` / `mark_addressed` flow, then initiator confirmation. No second resolution system.

Ordinary completion is allowed only when every required Task is in a **terminal** state: **Completed** or **Cancelled**. These are unfinished and block ordinary completion: Proposed, Assigned, Awaiting Acceptance, Accepted, In Progress, Blocked, Waiting, Submitted, Under Review. **Declined is not silently terminal.** The Responsible Lead must reassign, cancel, replace, or waive that assignment before ordinary completion.

**Complete with outstanding work** is an explicit exceptional path. It requires a reason, identifies the outstanding Tasks, is attributed to the Responsible Lead, and writes `collaborative_work_completed_with_outstanding` (not `collaborative_work_completed`). Outstanding Task statuses are not changed to Completed. The Matter waiting condition and final-response copy must be able to say that some work remained outstanding.

Reopening keeps completed Tasks, Decisions, and evidence. New work is additive; old Tasks are not silently reset.

### Shared responsibility vs participation

Inviting a Contributor, Specialist, Contractor, Observer, or Evaluator is **participation**. It does not create an accepted Responsible Collaborator.

Asking someone to become a **Responsible Collaborator** is a **shared-responsibility request**: a timed Action Requirement (`shared_responsibility_response` / *Respond to shared responsibility request*) using the existing Matter action clock. Responses: Accept responsibility, Accept partially, Request clarification, Decline / dispute, Suggest another responsible actor. `matter_responsibilities` shows that actor as an accepted collaborator only after acceptance. Decline stays in Matter history (status `declined`, with reason). Suggested reassignment and Task decline reasons are stored on the assignment and in event payload `reason`.

### Decision authority (current default, not a future-universal rule)

When a Responsible Lead proposes a Decision on a Matter where that Lead currently has decision authority, the Decision may be accepted in the same step. That is the **current default** for these Matters. It is not an architectural assumption that every future Decision is unilaterally decidable by the Responsible Lead. Later rules may require multi-party approval, organizational approval, voting, governance rules, or external authority. No advanced approval engine is implemented in this phase.

## Deferred

AI participants and routing, Projects as a separate collaboration layer, Community Challenge / Governance conversion, department trees and auto-assignment, Score/reputation/capability consequences, analytics dashboards, Gantt/Kanban, advanced evidence certification.

## Implementation map

- Domain: `src/lib/matters.ts`, `src/lib/matters-workflow.ts`, `src/lib/matters-work.ts`, `src/lib/matters-work-workflow.ts`
- API: `src/lib/matters-api.ts`
- UI: `src/pages/contribute/Matters.tsx`, `MatterForm.tsx`, `MatterDetail.tsx`, `MatterWorkPanel.tsx`
- Schema: `supabase/migrations/20260831010000_matter_collaboration_system.sql`, `20260831200000_matter_collaboration_stabilization.sql`, `20260901120000_matter_collaborative_work.sql`, `20260901140000_matter_collaborative_work_stabilization.sql`

## Security: `search_path` and schema CREATE (2026-09-01)

Matter `SECURITY DEFINER` functions use `SET search_path = public`. That is safe on the deployed database because untrusted roles cannot create objects that would shadow unqualified names those functions resolve.

Live check (read-only) on schema `public`:

| Role | CREATE | USAGE |
|------|--------|-------|
| `anon` | no | yes |
| `authenticated` | no | yes |
| `authenticator` | no | yes |
| `service_role` | no | yes |
| `PUBLIC` (default ACL `=U/`) | no | yes |

`CREATE` remains with privileged owners only (`postgres`, `supabase_admin`, `pg_database_owner`). No Matter function change was required. Repeat with `scripts/db/verify-public-schema-create.sql`.
