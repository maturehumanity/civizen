# Funding implementation roadmap v0.1

**Status:** Active  
**Source:** Funding Constitution §21, adapted for product delivery order  
**Goal:** Enable Civizen to solicit and later accept funding lawfully, with classified ledgers and public transparency.

---

## Guiding sequence

Do **not** accept capital before Phase 0 legal gates and Phase 1 docs are in place. Public pages in Phase 2 collect **interest only**.

```text
Phase 0  Legal gates (counsel)          ← blocks real capital acceptance
Phase 1  Documentation                  ← this folder
Phase 2  Public Fund Civizen surfaces    ← interest / information
Phase 3  Internal ledger MVP            ← classify & record
Phase 4  Admin funding ops              ← review queues & exports
Phase 5  Compliance integrations        ← KYC/AML, payments, custody
Phase 6  Distribution engine            ← LSP pools & payouts
```

---

## Phase 0 — Legal gates (external)

Must be answered before Civizen accepts investment capital or regulated donations/grants:

- Which entity accepts investor capital vs donations/grants?
- Hybrid Foundation + Operating Company plan approved by counsel?
- Offering structure / securities exemption?
- Accredited-investor and non-U.S. rules?
- USDT / digital asset acceptance at launch: yes / custodian / no?
- Initial jurisdictions for funders?

Tracker: [`open-legal-questions.md`](./open-legal-questions.md)

---

## Phase 1 — Documentation (done for v0.1)

| Deliverable | Location | Done when |
|---|---|---|
| Funding Constitution promoted | `funding-constitution-v0.1.md` | Canonical path linked from governance README |
| Supporting document index | `supporting-documents-index.md` | All 20 items listed with owners/status |
| Risk disclosure draft | `risk-disclosure-v0.1.md` | Used on `/fund/invest` |
| Implementation roadmap | this file | Phases match shipped work |

Priority policy stubs after Constitution:

1. Investor revenue participation terms (draft)  
2. Donation acceptance policy  
3. Grant / restricted funds policy  
4. KYC/AML/sanctions policy outline  
5. Public transparency ledger policy  

---

## Phase 2 — Public Fund Civizen (shipped interest-ready MVP)

| Route | Purpose | Acceptance of funds? |
|---|---|---|
| `/fund` | Hub explaining lanes + public wording (§22) | No |
| `/fund/support` | Mission support / donation interest | No — interest only |
| `/fund/invest` | Investor pathway + risk disclosure | No — not an offering |
| `/fund/institutional` | Grants, gov, partnerships | No — inquiry only |
| `/fund/contribute` | Contributor recognition / rewards path | Info + link to civic contribute |
| `/fund/transparency` | Public totals by lane (prototype) | Read-only summaries |

Also shipped:

- Footer + onboarding “Fund Civizen” links
- `funding_interest_inquiries` table (applied remotely)
- Admin review: `/settings/admin/funding-interest` (with CSV export)
- LSP math library + admin calculator: `/settings/admin/funding-calculator`
- Additional policy stubs (grant, KYC outline, transparency, contributor, sponsorship, crypto, founder clause, conflicts)

---

## Fast vs slow (working order)

**Fast (prefer first):** policy stubs, public copy pages, interest forms, CSV export, pure distribution math, calculator UI.

**Slow (later):** full ledger schema + RLS, payment processors, KYC provider, custody, live distribution approval workflow, offering documents.

## Phase 3 — Internal ledger MVP (shipped core)

Schema applied:

- `funders`
- `funding_commitments`
- `funding_ledger_entries` (append-only)
- `investor_positions` (created when investor capital is recorded as received)
- `funding_ledger_audit_events`
- `record_funding_commitment()` RPC
- `funding_lane_totals` view

Admin: `/settings/admin/funding-ledger` — manual entry, lane totals, CSV export.

Deferred to later phases: contributor_profiles / contribution_records, distribution_periods / payouts, transparency publish controls.

---

## Phase 4 — Admin funding ops (shipped)

Shipped:

- Convert interest inquiry → pledged ledger commitment
- Mark commitment status (received creates ledger entry + investor position)
- Lane/status filters + CSV export on funding ledger
- Public transparency publish switch + live `/fund/transparency`
- Funding audit log UI (`/settings/admin/funding-audit`)
- Self-test: `scripts/db/test-funding-ledger-smoke.sql`, `scripts/test-funding-public-surfaces.mjs`
- Manual QA guide: [`TESTING.md`](./TESTING.md)

Deferred:

- Contributor records / distribution periods (Phase 6)
- Compliance/payment rails (Phase 5)

---

## Phase 5 — Compliance integrations

**Scaffolding shipped (manual ops):**

- `funding_compliance_cases` + admin queue (`/settings/admin/funding-compliance`)
- `funding_payment_receipts` + manual receipt recording
- `mark_funding_commitment_status` blocks on sanctions hit / blocked compliance cases
- Self-test: `scripts/db/test-funding-compliance-distribution-smoke.sql`

**Still gated on Phase 0 counsel:**

- Live KYC/KYB provider  
- Automated sanctions screening  
- Payment processor / wire reconciliation APIs  
- Regulated crypto custody if approved  
- Tax and grant reporting workflows  

---

## Phase 6 — Distribution engine

**Scaffolding shipped:**

- `contributor_profiles` / `contribution_records` + admin UI (`/settings/admin/funding-contributors`)
- `distribution_periods` / `funding_payouts` + create/approve UI (`/settings/admin/funding-distribution`)
- RPCs: `create_distribution_period`, `approve_distribution_period` (proportional investor + contributor payouts + pool residuals)
- Manual QA: [`TESTING.md`](./TESTING.md) sections G–I

**Still later:**

- Paid payout workflow / bank transfer integration  
- Public transparency summaries for approved periods  
- Contributor scoring UX beyond verified points  

---

## Definition of “ready to receive funding”

| Milestone | Meaning |
|---|---|
| **Interest-ready** | Phase 1–2 done; public can inquire |
| **Donation-ready** | Entity + donation policy + payment rails + receipts (counsel-approved) |
| **Investor-ready** | Offering docs + KYC + investor agreements + ledger (counsel-approved) |
| **Grant-ready** | Restricted-funds controls + reporting calendar |
| **Distribution-ready** | Phase 6 + audited books + approved period |

---

## Version history

| Version | Date | Notes |
|---|---:|---|
| 0.1 | 2026-07-18 | Initial roadmap from Funding Constitution discussion |
| 0.1.1 | 2026-07-18 | Phase 5–6 scaffolding (manual compliance + distribution engine) |
