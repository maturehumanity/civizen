# Project finance workspace — implementation note (v1)

**Date:** 2026-08-10 (updated same day for permissions + quarantine)  
**Scope:** Smallest production-credible budget + funding-source ledger per `01-decisions-and-scope.md`, `03-budget-module-spec.md`, `04-funding-source-ledger-spec.md`.

## Product decisions (approved)

1. **Budget remains the default Funding tab.** Interest stays available as a separate primary tab.
2. **Fine-grained finance permissions** are required before real financial data or broader team access:
   - `finance.view`
   - `finance.edit`
   - `finance.approve`
   - `finance.publish`
   - `finance.admin` (administration / allocation override / self-approve exception)
3. **Legacy capital-ledger and distribution scaffolding is quarantined**, not deleted. Ordinary navigation shows only Budget · Sources · Interest. Ledger · Audit · Compliance · Contributors require `?legacy=1` and are labeled inactive/experimental. They are **not** linked to project finance records.
4. Approval and publication are separate permissions and separate actions.
5. An approver cannot approve a budget revision they submitted unless they also hold `finance.admin` (or temporary legacy compat).
6. Allocation overrides require `finance.admin` (or legacy compat) **and** a recorded reason.

## Reused

- Admin shell: Settings → Funding hub (`FundingAdmin` `?section=` tabs)
- Public shell: `FundPageShell`; public page `/fund/project-finance`
- Explicit publish: approval ≠ publication
- Export: `downloadTextFile` CSV helper
- Audit: `finance_audit_events` + `budget_revisions` / `budget_publications`
- Evidence: text reference fields only
- Client modules: `src/lib/finance/`

## Authz

| Capability | Permission | Notes |
| --- | --- | --- |
| View internal finance | `finance.view` (or edit/approve/publish/admin) | RLS SELECT |
| Edit budgets/sources/receipts | `finance.edit` | Mutations; submit for review |
| Approve budget | `finance.approve` | RPC `finance_approve_budget`; not publish |
| Publish public summary | `finance.publish` | RPC `finance_publish_budget` |
| Override allocation / self-approve | `finance.admin` | Override also requires reason |

**Temporary compatibility path:** `settings.manage`, `role.assign`, and `can_manage_funding_ledger()` still satisfy finance gates via `has_finance_legacy_compat()` so founders/admins are not locked out during migration. This bridge should be removed once dedicated finance roles are assigned in production.

## Assumptions

- Existing `funders` / `funding_commitments` / distribution tables remain historical scaffolding only.
- New project-finance tables use **integer minor units**.
- Public reader = `get_public_project_finance_summary()` SECURITY DEFINER allowlist RPC only.
- No seed of live funders/amounts. If a budget is marked `is_demonstration`, the public page shows a non-production notice.
- Multi-currency: per-currency totals only; no FX.

## Migrations

- `20260811000000_project_finance_workspace.sql`
- `20260811001000_finance_audit_actor_default.sql`
- `20260811010000_finance_permissions_and_gates.sql`

## Entry points

- Internal: `/settings/admin/funding` (default Budget)
- Legacy: `/settings/admin/funding?legacy=1`
- Public: `/fund/project-finance` (last published timestamp + published version required)

## Draft Budget v0.1 (retired demonstration skeleton)

- Spec (historical): `06-initial-working-budget-v0.1.md`
- Structure module (test/local fixture): `src/lib/finance/initial-budget-v01.ts`
- **Retired** from ordinary remote application use via `scripts/db/retire-demo-draft-budget-v01.sql` (audit event `budget.demonstration_retired`)
- Ordinary SQL path `scripts/db/seed-initial-working-budget-v01.sql` **refuses** to recreate it
- Explicit local-only seed: `scripts/db/local-dev-only/seed-initial-working-budget-v01.sql`
- Gated client helper: `src/lib/finance/seed-initial-budget-v01.ts` (requires `{ force: true }` or `VITE_ALLOW_DEMO_BUDGET_SEED=true`)
- Was **draft** + **`is_demonstration=true`** with **all amounts 0** — never approved/published; no commitments/receipts/allocations
- Default ordinary Budget selection is **`Civizen Pre-Major-Build Validation Program v0.1`**
- **Program-funding note:** Prototype estimates in `06`/`07`/`08` are **superseded** for capitalization by `09-civilization-scale-program-requirements-and-cost-framework-v0.1.md`. Do not enter civilization-scale figures into the DB until cost-center schema redesign (`09` §9).

## Funding-layer distinction (post-`09`)

| Layer | Authority |
| --- | --- |
| Bootstrap research | Limited; honesty rules in `08`/`09` |
| Full program capitalization | `09` |
| Jurisdiction deployment | `09` |
| Worldwide ecosystem investment | `09` |
| Continuing annual operations | `09` |

## Deferred (explicit)

- Finance schema redesign for global-core / operator / jurisdiction / ecosystem / reserves cost centers (`09` §9)
- Professional studies and quotations listed in `09` §10
- Owner-confirmed monetary estimates for Draft Budget v0.1 (amounts currently zero; prototype bands not program truth)
- Remove legacy finance compatibility once dedicated finance roles are live
- Legacy funder-record migration / linking to `funding_commitments`
- Real payment rails, custody, refunds
- FX conversion / consolidated multi-currency accounting
- Investment distributions / contributor-return logic
- Contributor equity, tokens, dividends
- Document storage bucket for evidence
- Separate unpublish RPC permission split beyond `finance.publish`
