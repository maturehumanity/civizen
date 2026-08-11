---
title: Capital Stack, Revenue, and ROI Model v0.1
status: scenario-model
version: 0.1
date: 2026-08-11
currency: USD
audience: owner-internal
related:
  - 20-capital-stack-and-roi-model-v0.1.csv
  - 20-capital-stack-and-roi-model-v0.1.meta.json
  - 21-contributor-compensation-and-in-kind-framework-v0.1.md
  - 22-private-investor-economics-brief-v0.1.md
  - 11-program-financial-model-and-funding-responsibility-v0.1.md
  - 14-pre-major-build-validation-program-v0.1.md
  - 17-funding-readiness-memorandum-v0.1.md
  - 27-founder-investor-and-contributor-participation-policy-v0.1.md
  - 26-comprehensive-financial-classification-and-chart-of-accounts-v0.1.md
canonical: false
---
# Capital stack, revenue, and ROI model v0.1

> **Participation policy status (2026-08-11, rev 0.1.1):** Founder Participation Pool = **1% of Eligible External Monetary Receipts**, assessed once at first receipt (`founder_allocation_assessed`). Eligible distributable commercial profit (after costs and after founder receipt allocation): **10% Investor / 10% Contributor / 80% Ecosystem**. Dual Founder Funding + Founder Profit pools and the **10/10/1/79** profit pie are **superseded**. Spec: `27` (+ CSV); entity/legal: `28`. CoA: `26`. Unapproved; no app units/payouts.

**Status:** Scenario model for planning and discussion. **Not** an investment offer, securities solicitation, return guarantee, approved payout policy, or legal conclusion.  
**Companions:** machine-readable model `20-capital-stack-and-roi-model-v0.1.csv` (+ `.meta.json`); investor brief `22`; contributor brief `21`.  
**App / DB:** **Unchanged.** No payouts, investment accounts, contributor units, equity, tokens, or finance-record mutations.

**Answer first:** Of the ~$37.5B five-year first-wave ecosystem hypothesis (`11`), only about **~$0.9B / ~$2.8B / ~$6.3B** (low/base/high) is modeled as realistically addressable by **private return-seeking** capital (~2–17%). Most of the stack is government, institutional, grant, reserve, or oversight funding with **no** investor repayment path. Commercial-entity break-even is roughly **Year 8** (base). Illustrative equity returns from a **10%** pool of eligible distributable commercial cash flow are **weak without terminal value** and only potentially attractive **with speculative exit assumptions**.

---

## 1. Progression (read this way)

`capital required → revenue → costs → reserves → distributable cash flow → payouts → retained public benefit`

Detailed annual math lives in the CSV. This memo states conclusions and controls.

---

## 2. Organizational layers (keep separate)

| Layer | Role | May pay private investors? |
| --- | --- | --- |
| Public-interest foundation / steward | Constitution, open standards, reference public goods, grants, HR protections, public docs | **No** (restricted/charitable surplus) |
| Commercial services entity(ies) | Enterprise APIs, integrations, optional workflows, managed commercial support, certified enterprise services | **Yes — primary equity/RR layer** |
| Operator / infrastructure vehicles | Hosting, regional ops, SLAs, security ops, jurisdiction infra | Via project finance / concessions / debt — **not** foundation surplus |
| Jurisdiction / institutional programs | Local implementation, migration, training, public-service operation | Procurement / public budgets / PPP — **not** Civizen equity |
| Independent oversight & assurance | Review, audit, governance assurance | **No** — structurally protected from investor control |

Legacy token, distribution-engine, and capital-ledger percentage formulas remain **historical / unapproved** and are **not** revived here (`01` deferrals; institutional integrity policy).

---

## 3. Classification of the ~$37.5B five-year base

Primary roll-up (full line table in CSV `capital_classification`):

| Classification | ~$B | % of 5y base | Typical instrument | Repayment |
| --- | ---: | ---: | --- | --- |
| Government / multilateral funded | 15.1 | 40% | Public budgets, procurement, consortia | No Civizen equity repayment |
| Institutional procurement | 10.0 | 27% | Institution SOWs | Contract consideration only |
| Protected reserve | 4.0 | 11% | Restricted reserve contributions | No investor payout |
| Public / grant funded | 2.8 | 7% | Grants, gifts, pass-through | No investor repayment |
| Potentially blended | 2.3 | 6% | Grants + limited private tranche | Private tranche capped, commercial-adjacent only |
| Not appropriate for return-seeking | 1.7 | 4% | Ring-fenced oversight / identity public goods | None |
| Operator financed | 1.2 | 3% | Operator equity/debt/concessions | Via operator CF / availability payments |
| Commercially investable (primary label) | 0.5 | 1% | Commercial equity/debt/RR | Commercial entity only |

**Privately investable range (refined, not equal to the 0.5B primary label alone):**

| | Low | Base | High |
| --- | ---: | ---: | ---: |
| Commercial entity equity/debt | 0.4 | 1.2 | 2.5 |
| Operator project finance | 0.3 | 0.9 | 2.0 |
| Blended first-loss / mezzanine | 0.1 | 0.4 | 1.0 |
| Capped revenue participation | 0.1 | 0.3 | 0.8 |
| **Total addressable private return-seeking** | **~0.9** | **~2.8** | **~6.3** |

Confidence: **low**. Do **not** treat ~$37.5B as a private raise.

---

## 4. Permitted vs prohibited revenue

**Preserve fee policy (`01`):** natural persons in personal capacity pay **zero** Civizen transaction-processing fees; legal entities cover documented processing/audit costs on a **cost-recovery** basis — **not** investor profit.

| Status | Examples |
| --- | --- |
| Permitted (commercial / operator / J vehicles) | Enterprise API subscriptions; institutional integrations; implementation/migration; managed hosting; operator certification/support; optional enterprise workflows; B2B marketplace aids (flagged); training/TA; open-compatible licensing; availability payments; lawful J/institutional support tiers |
| Cost-recovery only (not profit) | Legal-entity transaction processing/audit fees |
| Prohibited | Sale of personal data; sale of governmental authority; investor control of civic governance/voting; profit from mandatory identity access; citizen personal transaction-processing profit; undisclosed surveillance/ads; diversion of taxes/restricted funds; pay-to-govern / pay-to-influence; monetization that excludes ordinary people from essential services |

Stream-level payer, pricing unit, start year, margin, and entity mapping: CSV `revenue_streams`.

---

## 5. Adoption and revenue scenarios (commercial entity, 15 years)

Horizon is an **investor cash-flow analysis**, not an approved 15-year Civizen budget. Long-horizon scale cues from `13` used only for ROI timing.

| Metric (commercial entity) | Conservative | Base | Growth |
| --- | ---: | ---: | ---: |
| Capital drawn Y1–5 ($B) | 0.4 | 1.2 | 2.5 |
| 15y gross revenue ($M) | ~8,531 | ~21,327 | ~38,389 |
| 15y eligible distributable CF ($M) | ~1,424 | ~3,528 | ~6,299 |
| Entity break-even year | ~7 | ~8 | ~8 |

Revenue starts as training/TA (~Y2) and enterprise APIs/integrations (~Y3+). Annual rows: CSV `annual_commercial_cf`. Confidence: **low / low–medium**.

---

## 6. Payout base and percentage tests

**Recommended calculation base:** eligible **distributable commercial cash flow** after taxes, essential ops, security/continuity, employee/contractor compensation, protected reserves, senior debt, and required reinvestment.  
**Not** gross revenue, grants, restricted funds, or citizen fee cost-recovery.

| Scenario | Investor pool | Contributor pool |
| --- | ---: | ---: |
| Public-interest weighted | 5% | 5% |
| Owner working hypothesis (planning case) | 10% | 10% |
| Commercial-growth case | 15% | 15% |

Remainder is **explicitly allocated** (not “unallocated”): retained earnings/expansion; security top-up; operator/J participation; public-interest/access fund; research/OSS stewardship; local capacity/inclusion (CSV `waterfall_15y_cumulative`).

**Provisional recommendation (unapproved):** plan at **10%/10%** of eligible distributable commercial CF, with automatic **step-down to 5%/5%** (or suspend/accrue) under stress triggers; consider **15%/15%** only after sustained growth and reserves above policy.

**Waterfall order:** (1) taxes/refunds/protected customer funds/mandatory liabilities → (2) essential ops → (3) security/IR/DR/insurance → (4) employee & contracted pay → (5) protected reserves → (6) senior debt → (7) required reinvestment → (8) investor pool → (9) contributor pool → (10) operator/ecosystem → (11) public-interest/inclusion/research → (12) retained surplus. Instrument seniority may reorder **within** investor claims; it must **not** subordinate safety or protected public obligations.

---

## 7. Investor instruments and illustrative ROI

Evaluate separately — do not merge into one class. Full matrix in CSV `instrument_returns`.

| Instrument | Role |
| --- | --- |
| Commercial common / preferred equity | Primary return-seeking in commercial entity |
| Senior / convertible debt | Contractual; service before pools |
| Operator project-finance notes / concessions | Availability-payment or operator CF backed |
| Capped revenue participation | Hard MOIC/cap in counsel-drafted docs |
| Blended first-loss / guarantees | Catalytic; protects public senior capital |

**Illustrative only (base, ~$800M common equity share of 10% investor pool):**

| Case | Payback | MOIC | IRR |
| --- | --- | ---: | ---: |
| Distributions only (no terminal value) | None in 15y | ~0.3× | negative |
| With speculative Y15 terminal value | ~Y15 | ~5× | ~15% |

**Reading:** mission-compatible payout discipline makes **cash distributions alone** a weak equity payback path inside 15 years at modeled adoption. Attractive equity IRRs in this model **depend on speculative terminal value / exit**. Prefer mixing **debt, preferred, capped RR, and operator project finance** with equity. Downside: full loss of commercial equity if adoption fails.

---

## 8. Cash vs non-cash (validation + first wave)

| | Validation (`14` ~$446M base) | Five-year ecosystem (`11`) |
| --- | --- | --- |
| Cash requirement (base share) | ~92% of program | ~82% of ecosystem mix framing |
| In-kind / secondments / donated infra | Tracked separately; **does not** 1:1 replace cash | Same rule |
| Private investment share | ~0–8% (mostly inappropriate; tiny commercial-prep only) | ~2–17% addressable |
| Critical path | **Must be cash-funded** — not dependent on unpaid labor | Same |

CSV: `cash_noncash_validation`, `cash_noncash_five_year`.

---

## 9. Stress and suspension

If revenue is 25%/50%/75% of base, or launch slips 2–5 years, **10%/10% pools** become unsafe → **reduce to 5%/5%, accrue, or suspend**. Other stresses: regulatory block of major streams; 2× security costs; no private capital; no in-kind; no TV exit; major J withdrawal; FX/inflation. Triggers: CSV `stress_tests` / `POL-SUSPEND`.

---

## 10. Governance protections (proposed)

No investor ownership of citizen data; no investment-linked civic voting; no unilateral control; ownership/voting caps; mission lock; independent directors/trustees; reserved public-interest matters; CoI controls; transparent related-party deals; independent valuation/audit; separation of commercial and public funds; **no payout from restricted grants**; **no payout while continuity reserves below policy**; clawback for fraud/misrepresentation. CSV `governance_protections`.

---

## 11. Owner decision sheet (provisional — not approved)

| Topic | Provisional model position |
| --- | --- |
| Entity separation | Maintain foundation / commercial / operator / oversight separation |
| Addressable private capital (5y) | ~$0.9B / ~$2.8B / ~$6.3B low/base/high |
| Approved revenue streams | Permitted list in §4 — pending counsel |
| Prohibited monetization | §4 hard prohibits |
| Investor pools 5/10/15% | Tested; planning case **10%** with step-down — **not adopted** |
| Contributor pools 5/10/15% | Tested; planning case **10%** with step-down — **not adopted** |
| Payout base | Eligible distributable commercial CF |
| Reserve thresholds | No investor/contributor payout below continuity reserve policy |
| Instruments to research | Commercial equity/preferred; debt; capped RR; operator PF; blended first-loss; availability concessions |
| Contributor valuation | Fair-value in-kind ledger in `21` — no auto-equity |
| Founder treatment | **Superseded by `27` v0.1.1:** Founder Participation Pool = 1% of eligible external receipts (once); not a second cut of profit. Historical “no fixed founder %” phrasing here is obsolete for planning. |
| Educational institutions | Grants, overhead, sponsored research, attribution — not automatic investor status |
| Ownership caps | Required on commercial entity; zero civic-vote linkage |
| Legal studies required | Entity formation (17 **D6**); securities; tax; grant restrictions; employment/IP; procurement; data |
| What may be shared now | Internal model + controlled inquiry materials per `16`/`17`; **do not** publish or authorize external investor offer from this pack |

---

## 12. Gaps

Receiving entity / fiscal pathway (**D6**); securities counsel; audited commercial forecasts; seated independent assurance administration; hard unit-cost quotes; jurisdiction MoUs; insurance; formal reserve policy percentages; IP/open-licensing memo for commercial vs public outputs.

---

## 13. Document control

| Field | Value |
| --- | --- |
| Version | 0.1 |
| Date | 2026-08-11 |
| Data | `20-capital-stack-and-roi-model-v0.1.csv`, `.meta.json` |
| Finance records / payout systems / offerings created | **None** |
