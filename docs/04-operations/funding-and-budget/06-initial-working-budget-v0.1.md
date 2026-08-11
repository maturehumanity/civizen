---
title: Civizen Initial Working Budget v0.1
status: draft
version: 0.1
date: 2026-08-10
currency: USD
planning_horizon: Conceptual Phase 1–3 placeholders (Timing TBD) — not Months 1–24 / Years 1–5
canonical: true
---

# Civizen Draft Budget v0.1

**Status:** Historical **demonstration** planning skeleton — **retired from ordinary application use** (not an approved financial statement; never published).  
**Program-funding status:** **Superseded for civilization-scale / production capitalization decisions** by `09` / `11` / `14`. Retain as historical line-structure documentation and test/local fixtures only. Prototype-sized totals must not be presented as funding Civizen’s intended outcome.  
**Version:** 0.1  
**Date:** 2026-08-10  
**Currency:** USD (planning-display assumption; requires owner confirmation)  
**Planning horizon:** Conceptual Phase 1–3 labels are **placeholders with Timing TBD** — not calendar periods and **not** the Program plan’s **Months 1–24** validation or **Years 1–5** first-wave horizons. This skeleton must be **replaced or formally remapped** before it becomes a real operational budget.  

**Application record:** **Retired** from the remote application database and ordinary Budget selector. Default working budget is `Civizen Pre-Major-Build Validation Program v0.1`. Structure remains in `src/lib/finance/initial-budget-v01.ts` and may be recreated only via explicit local-dev seed (`scripts/db/local-dev-only/seed-initial-working-budget-v01.sql`) or gated client helper (`force` / `VITE_ALLOW_DEMO_BUDGET_SEED`). Settings → Funding → **Program plan** remains the read-only surface for validation/five-year estimates.

---

## Executive summary

Civizen needs a transparent internal planning budget so founders and future finance editors can track categories of cost across the next credible delivery phases—without pretending that quotes, payroll, or cash receipts already exist.

A repository search found **no authoritative operational budget figures**, vendor invoices, staffing contracts, or committed expenses in public documentation. Therefore this v0.1 budget:

- defines expense groups and line items aligned with Civizen’s present stage;
- defines planning phases and expected outcomes;
- leaves **all monetary amounts as TBD (zero in the application)** until the project owner supplies estimates or evidence;
- keeps **committed** and **actual** at zero;
- creates **no** funding prospects, commitments, receipts, or allocations.

This is a planning skeleton. Filling amounts is a project-owner / counsel task.

---

## Phase definitions

| Phase | Definition | Expected outcome (not a funding claim) |
| --- | --- | --- |
| **Phase 1 — Foundation and working prototype** | Continue founder-led platform and documentation work already underway | Credible public identity, working software continuity, governance/finance docs, inquiry-only funding surfaces |
| **Phase 2 — Security hardening and limited pilot** | Focused hardening plus one or more scoped pilots | Measurable pilot evidence; stronger security/privacy posture; readiness for targeted (not broad) funding conversations |
| **Phase 3 — Production readiness and institutional integration** | Entity/compliance readiness and institutional partnership capacity | Counsel-ready receiving posture; operational reporting; ability to engage institutions without implying awards exist |
| **Ongoing annual operations** | Steady-state run costs after foundation work | Hosting, tooling, light coordination, communications continuity, contingency reserve |

Later phases are **not** funded or approved by virtue of appearing here.

Aligned qualitative roadmaps (no dollars): `funding-readiness-roadmap.md`, `funding-and-sustainability-plan.md` §5.

---

## Expense groups and line items

All amounts: **TBD**. Application planned/committed/actual minor units: **0**.

Cost classes used in line `period_label` metadata: `one_time` · `recurring` · `personnel_or_service` · `infrastructure_or_vendor` · `reserve`.

### 1. Product and engineering

| Line | Phase | Cost class | Planned | Notes |
| --- | --- | --- | --- | --- |
| Core platform engineering (Phase 1) | Phase 1 | personnel_or_service | TBD | Active development evidenced in repo; no contracted rate on file |
| Core platform engineering (Phase 2) | Phase 2 | personnel_or_service | TBD | Pilot-ready engineering support |
| Core platform engineering (Phase 3) | Phase 3 | personnel_or_service | TBD | Production-readiness engineering |
| Automated test and release quality capacity | Phase 1 | one_time | TBD | Vitest / `verify:ci` capacity |

### 2. Design and accessibility

| Line | Phase | Cost class | Planned | Notes |
| --- | --- | --- | --- | --- |
| UX/UI and accessibility review (Phase 1–2) | Phase 2 | personnel_or_service | TBD | No agency quote in-repo |

### 3. Security, privacy, auditing, and resilience

| Line | Phase | Cost class | Planned | Notes |
| --- | --- | --- | --- | --- |
| Security hardening sprint | Phase 2 | one_time | TBD | Before limited pilot |
| Independent security / privacy review | Phase 3 | one_time | TBD | Vendor not selected |
| Ongoing security monitoring and incident readiness | Annual | recurring | TBD | Not a live contract |

### 4. Infrastructure and development tools

| Line | Phase | Cost class | Planned | Notes |
| --- | --- | --- | --- | --- |
| Application hosting and database (annual) | Annual | infrastructure_or_vendor | TBD | VPS/nginx + Supabase implied by ops/stack; no public invoices |
| DNS, edge, and CI tooling (annual) | Annual | infrastructure_or_vendor | TBD | Cloudflare + GitHub Actions referenced; tier unknown |
| AI model/API usage for in-app agents | Annual | infrastructure_or_vendor | TBD | OpenAI / Gemini / Anthropic usage implied; no spend history published |
| Environment bootstrap and staging capacity | Phase 1 | one_time | TBD | Staging/isolation improvements |

### 5. Legal, governance, accounting, and compliance preparation

| Line | Phase | Cost class | Planned | Notes |
| --- | --- | --- | --- | --- |
| Legal entity and counsel engagement | Phase 3 | personnel_or_service | TBD | Receiving entity still open (`open-legal-questions.md`) |
| Accounting setup and bookkeeping readiness | Phase 3 | personnel_or_service | TBD | Software ledger ≠ legal books |
| Compliance preparation (KYC/AML outline readiness) | Phase 3 | one_time | TBD | Outline exists; live providers gated |

### 6. Research, testing, and pilots

| Line | Phase | Cost class | Planned | Notes |
| --- | --- | --- | --- | --- |
| Limited pilot facilitation (Phase 2) | Phase 2 | one_time | TBD | No partner/pilot budget locked |
| Evaluation and research partnership support | Phase 2 | personnel_or_service | TBD | No MoU/award in-repo |

### 7. Project and organizational operations

| Line | Phase | Cost class | Planned | Notes |
| --- | --- | --- | --- | --- |
| Project coordination and administration (annual) | Annual | personnel_or_service | TBD | Founder-led; not payroll |
| Administrative tooling and productivity software (annual) | Annual | recurring | TBD | No SaaS spend register |

### 8. Partnerships, communications, and funding outreach

| Line | Phase | Cost class | Planned | Notes |
| --- | --- | --- | --- | --- |
| Public documentation and messaging capacity | Phase 1 | personnel_or_service | TBD | Readiness Stages 1–2 |
| Targeted institutional outreach (Phase 2–3) | Phase 3 | one_time | TBD | Selective; not broad campaigns |

### 9. Contingency

| Line | Phase | Cost class | Planned | Notes |
| --- | --- | --- | --- | --- |
| Planning contingency reserve | Annual | reserve | TBD | Set after base estimates exist |

---

## Per-phase subtotals

| Phase | Planned (USD) | Committed | Actual |
| --- | ---: | ---: | ---: |
| Phase 1 | TBD (structure only; app total **$0**) | $0 | $0 |
| Phase 2 | TBD (structure only; app total **$0**) | $0 | $0 |
| Phase 3 | TBD (structure only; app total **$0**) | $0 | $0 |
| Ongoing annual | TBD (structure only; app total **$0**) | $0 | $0 |
| **All phases** | **TBD / $0 in application** | **$0** | **$0** |

Currencies: USD only in this draft. No FX conversion.

---

## One-time vs recurring (structure)

| Cost class | Line count (v0.1) | Planned |
| --- | ---: | ---: |
| one_time | 7 | TBD / $0 |
| recurring | 2 | TBD / $0 |
| personnel_or_service | 9 | TBD / $0 |
| infrastructure_or_vendor | 3 | TBD / $0 |
| reserve | 1 | TBD / $0 |

Exact counts are defined in `src/lib/finance/initial-budget-v01.ts` and validated by tests.

---

## Assumptions and estimate methodology

1. **Evidence rule:** Only reuse documented figures. Repository search found none suitable for operational budgeting; therefore amounts remain TBD.
2. **Vendor inference:** Hosting (VPS/nginx), Supabase, Cloudflare, GitHub Actions, and AI API vendors are named because the stack/docs imply them—not because invoices exist in-repo.
3. **Confidence:** Structure confidence medium (aligned with strategy docs). Amount confidence **none** until owner input.
4. **Currency:** USD for planning display only; confirm with owner.
5. **Committed/actual:** Remain zero unless evidence of contracts or payments appears.
6. **No conflation:** Prospects ≠ commitments ≠ receipts ≠ allocations (none created by this budget).

Sources consulted:

- `docs/04-operations/funding-and-budget/01-decisions-and-scope.md`
- `docs/01-governance/funding-and-monetary/funding-and-sustainability-plan.md`
- `docs/01-governance/funding-and-monetary/funding-readiness-roadmap.md`
- `docs/01-governance/funding-and-monetary/open-legal-questions.md`
- `docs/04-operations/dev/solutions-council.md` (AI providers)
- Ops notes implying VPS/Supabase/Cloudflare (without publishing secrets)

---

## Known exclusions

- Payment rails, custody, refunds, chargebacks  
- Taxation and government reporting automation  
- Investment distributions, tokens, contributor-return logic  
- FX automation  
- Legacy capital-ledger / distribution scaffolding amounts  
- Multibillion or percentage-pool financing targets (superseded; not policy)  
- Store fees, marketing campaigns, and speculative country-activation programs beyond a limited pilot  

---

## Uncertainty and contingency

Contingency is a **separate line** with amount TBD. Do not silently inflate other lines. When base estimates are filled, owner should set contingency as an explicit percentage or fixed reserve and record the basis.

---

## Information still required from the project owner

1. Confirm planning currency (USD assumption OK?).  
2. Provide Phase 1–3 and annual planning ranges or point estimates for each line (or mark lines out of scope).  
3. Confirm which vendors are actually billed today and approximate monthly/annual spend.  
4. Confirm whether any contractors/employees exist with rates or retainers.  
5. Confirm receiving-entity timeline (affects Phase 3 legal/accounting sizing).  
6. Confirm whether `is_demonstration` should be cleared once amounts are filled (recommended: yes).  
7. Confirm contingency policy (e.g. 10–20% of base once base exists).  
8. Confirm which line items may later set `publish_flag` for funder-facing summary.

---

## Short public-summary draft (for eventual funder review)

> **Not published.** Draft language only.
>
> Civizen is preparing a multi-phase project budget covering product engineering, security and privacy, infrastructure, legal/compliance readiness, limited pilots, operations, and communications. The current Draft Budget v0.1 establishes the cost structure for planning. Monetary estimates are being completed with the project owner; Civizen does not treat planning lines as commitments or received funds. Public financial figures will appear only after an approved budget is explicitly published and, where required, after an authorized receiving entity is in place.

Do not include internal notes, contacts, evidence refs, bank details, or unpublished amounts in any public surface.

---

## Application integration

| Field | Value |
| --- | --- |
| Structure fixture | `src/lib/finance/initial-budget-v01.ts` |
| Ordinary remote seed | **Refused** (`scripts/db/seed-initial-working-budget-v01.sql` stub) |
| Explicit local-only seed | `scripts/db/local-dev-only/seed-initial-working-budget-v01.sql` |
| Retirement | `scripts/db/retire-demo-draft-budget-v01.sql` → audit `budget.demonstration_retired` |
| Lifecycle (when present) | `draft` |
| `is_demonstration` | `true` |
| Planned / committed / actual | `0` |
| Approved / published | **No** |
| Ordinary Budget selector | **Hidden** (filtered); default = validation subprogram |

Do not apply the demonstration seed on remote/production. Ordinary migrations and startup must not recreate it.
