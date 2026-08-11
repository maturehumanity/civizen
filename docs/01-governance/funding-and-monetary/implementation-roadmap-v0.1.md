# Funding implementation roadmap v0.1

**Status:** Historical / Superseded — product scaffolding history. **Not** an adopted financing strategy and **not** current public policy.

**Prefer instead:**

- Strategy: [`funding-and-sustainability-plan.md`](./funding-and-sustainability-plan.md)
- Readiness: [`funding-readiness-roadmap.md`](./funding-readiness-roadmap.md)
- Public integrity: [`funding-and-financial-integrity.md`](../../02-policies/institutional/funding-and-financial-integrity.md)
- Open institutional questions: [`open-legal-questions.md`](./open-legal-questions.md)

> Fixed LSP / percentage pool formulas, public funding calculators, and Phase 6 “distribution engine” designs described historically below are **not** authorized Civizen policy. They must not be treated as current financing terms.

---

## What remains useful from this file

| Topic | Current use |
| --- | --- |
| Phase 0 legal gates | Still relevant as open institutional questions (see below) |
| Interest-only public Fund surfaces | Still describes the live inquiry posture |
| Ledger / admin scaffolding notes | Historical record of what was built in-app for classification experiments |
| LSP calculator & distribution periods | Historical / prototype only — not policy |

---

## Phase 0 — Legal gates (still open)

Before Civizen accepts investment capital or regulated donations/grants, counsel and institutional design must resolve the questions in [`open-legal-questions.md`](./open-legal-questions.md). Entity design is **not** decided in this roadmap.

Indicative gates (unchanged in substance):

- Receiving entity/entities for grants, donations, commercial revenue, and any future investment
- Offering structure only if investment is pursued
- Digital-asset acceptance (product default remains **disabled**)
- Initial jurisdictions for funders and receipts

---

## Interest-ready public surfaces (still accurate)

| Route | Purpose | Acceptance of funds? |
|---|---|---|
| `/fund` | Hub | No |
| `/fund/support` | Donation interest | No — interest only |
| `/fund/invest` | Investor inquiry | No — not an offering |
| `/fund/institutional` | Grants, gov, partnerships | No — inquiry only |
| `/fund/contribute` | Contributor recognition path | Info only — no fixed reward pool |
| `/fund/transparency` | Public totals when published | Read-only; prototype when empty |

---

## Definition of readiness (policy-aligned)

| Milestone | Meaning |
|---|---|
| **Interest-ready** | Public can inquire; no capital accepted in-app |
| **Donation-ready** | Receiving entity + donation policy + rails + receipts (counsel-approved) |
| **Grant-ready** | Receiving entity + restricted-funds controls + reporting (counsel-approved) |
| **Investor-ready** | Only if investment is pursued: offering docs + KYC + agreements (counsel-approved) |
| **Distribution-ready** | Not defined by historical LSP pools; any future payouts require lawful written arrangements and authoritative books |

---

## Historical / prototype context

The remainder of this document records an earlier build sequence. It is retained so operators can understand scaffolding that may still exist in the product. **It does not authorize percentage-based investor, contributor, or founder share pools.**

### Historical phase outline

```text
Phase 0  Legal gates (counsel)
Phase 1  Documentation (many items since superseded or redrafted)
Phase 2  Public Fund Civizen surfaces (interest / information) — still live posture
Phase 3  Internal ledger MVP — classify & record (scaffolding)
Phase 4  Admin funding ops — review queues & exports (scaffolding)
Phase 5  Compliance integrations — manual ops scaffolding; live rails gated
Phase 6  Distribution engine — HISTORICAL PROTOTYPE (LSP pools & payouts) — NOT POLICY
```

### Historical Phase 1 note

Earlier “Funding Constitution promoted” and fixed risk/investor terms deliverables are **Historical / Superseded**. Current drafts live under donation, grant, sponsorship, transparency, conflict, and KYC outline policies; strategy lives in the three Funding Strategy documents.

### Historical Phase 2 extras (not policy)

Earlier notes listed an LSP math library and admin calculator (`/settings/admin/funding-calculator`). Those artifacts, if still present in the product, are **prototype scaffolding**, not public financing policy.

### Historical Phases 3–5 (scaffolding summary)

Earlier work added funders/commitments/ledger tables, interest→ledger conversion, transparency publish switches, audit log UI, and manual compliance/receipt queues. Software ledger ≠ legal books. Live KYC, payment processors, and crypto custody remain gated; crypto acceptance stays **Disabled**.

### Historical Phase 6 — distribution engine (prototype only)

Earlier scaffolding described contributor profiles, distribution periods, and RPCs that computed proportional investor/contributor payouts and pool residuals from an LSP amount.

**Clarification:** That design assumed fixed public pool percentages. It is **not** current Civizen policy. Approving prototype periods (if UI still exists) must not be treated as authorizing real payouts or adopted allocation formulas. See [`TESTING.md`](./TESTING.md) historical section.

---

## Version history

| Version | Date | Notes |
|---|---:|---|
| 0.1 | 2026-07-18 | Initial roadmap from Funding Constitution discussion |
| 0.1.1 | 2026-07-18 | Phase 5–6 scaffolding notes |
| 0.1.2 | 2026-08-10 | Relabeled Historical / Superseded; LSP/distribution demoted to prototype context |
