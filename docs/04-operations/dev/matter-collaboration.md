# Matter Collaboration System (Phase 1)

**Project:** Civizen  
**Routes:** `/contribute/matters`, `/contribute/matters/new`, `/contribute/matters/:matterId`  
**Status:** Phase 1 implemented  
**Version:** 1.0

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
5. Active Matters have a current action requirement or an explicit waiting condition.
6. Deadline and history changes are attributable (human vs system).
7. Simple Matters stay simple: contextual formal actions only.

## Timing

Reusable `matter_timing_policies` (calendar days now; business days/hours reserved). Defaults for testing only:

| Policy | Period |
|--------|--------|
| Question response | 3 calendar days |
| Responsibility response | 2 calendar days |
| Clarification response | 5 calendar days |
| Resolution confirmation | 3 calendar days |

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

## Deferred

Tasks, Decisions, Projects, advanced Evidence, AI collaborators/routing, department trees beyond current org profiles, Score consequences, outcome measurement, Challenge/Governance conversion, advanced escalation trees.

## Implementation map

- Domain: `src/lib/matters.ts`, `src/lib/matters-workflow.ts`
- API: `src/lib/matters-api.ts`
- UI: `src/pages/contribute/Matters.tsx`, `MatterForm.tsx`, `MatterDetail.tsx`
- Schema: `supabase/migrations/20260831010000_matter_collaboration_system.sql`, `20260831200000_matter_collaboration_stabilization.sql`

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
