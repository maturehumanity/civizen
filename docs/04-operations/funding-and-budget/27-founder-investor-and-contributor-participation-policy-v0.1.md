---
title: Founder, Investor, and Contributor Participation Policy v0.1
status: provisional-policy-model
version: 0.1.2
date: 2026-08-11
currency: USD
audience: owner-internal
related:
  - 27-participation-model-v0.1.csv
  - 27-participation-model-v0.1.meta.json
  - 26-comprehensive-financial-classification-and-chart-of-accounts-v0.1.md
  - 23-investable-vehicles-and-private-capital-architecture-v0.1.md
  - 24-investor-return-and-contributor-waterfall-v0.1.md
  - 21-contributor-compensation-and-in-kind-framework-v0.1.md
  - 28-entity-legal-and-implementation-action-plan-v0.1.md
  - 22-private-investor-economics-brief-v0.1.md
canonical: false
---

# Founder, investor, and contributor participation policy v0.1

**Status:** Provisional economic policy model. **Not** an offering, contract, payout authorization, securities term sheet, or approval to accept funds.  
**Revision 0.1.2:** Numerical reconciliation of Founder Participation Pool (policy unchanged from 0.1.1).  
**Data:** `27-participation-model-v0.1.csv` (+ `.meta.json`).  
**App / DB:** **Unchanged** — no units, balances, markers, or distributions implemented.

---

## Supersession notice

| Superseded formulation | Status |
| --- | --- |
| Separate **Founder Funding Pool** (1% of inflows) **plus** **Founder Profit Pool** (1% of profit) | **Superseded** |
| Single profit pie **10% / 10% / 1% / 79%** (investor / contributor / founder profit / ecosystem) | **Superseded** |
| Treating commercial **profit** as an additional founder assessment base after receipts already assessed | **Prohibited** |

Historical analysis in earlier `20`–`27` drafts may retain those phrases for audit trail; **this document controls** for current planning.

---

## Confirmed provisional model (owner direction)

### A. Eligible External Monetary Receipts (assessment base #1)

| Allocation | Share |
| --- | ---: |
| **Founder Participation Pool** | **1%** — assessed **once** at the point of **first receipt** |
| Retained for project use | **99%** — per source restrictions, financing agreements, and approved budgets |

Eligible receipts may include qualifying investment proceeds, commercial revenue, unrestricted funding and donations, and financial returns — **subject to** the governing agreement, funding restrictions, applicable law, and the responsible entity’s authorization.

### B. Eligible distributable commercial profit (assessment base #2)

Calculated **after** applicable costs **and after** the founder receipt allocation has already been applied to underlying receipts (no second founder cut):

| Pool | Share |
| --- | ---: |
| Monetary Investor Pool | 10% |
| Contributor Pool | 10% |
| Civizen / Ecosystem Allocation | 80% |
| **Total** | **100%** |

Investor and Contributor pools are funded **simultaneously** from the same profit base with **no** payout priority between them.

**Do not implement or externally promise** the Founder Participation Pool until legal, tax, funding-restriction, accounting, and disclosure treatment is approved.

---

## 1. Founder Participation Pool (consolidated)

**Definition:** 1% of **Eligible External Monetary Receipts**, assessed once at first receipt by an authorized participating entity.

### 1.1 Candidate eligible (illustrative)

Qualifying investment proceeds; unrestricted commercial-entity funding; commercial revenue and subscriptions when authorized; unrestricted donations/philanthropy when authorized; financial returns when treated as external receipts under policy.

### 1.2 Excluded (do not assess)

- Internal transfers among Civizen entities, accounts, or vehicles  
- Distributions of **already-assessed** funds  
- Pass-through or custodial money; escrow  
- Refundable deposits  
- Tax collections  
- Restricted public or charitable funds (unless express written permit — rare)  
- Debt proceeds **unless** financing terms **expressly authorize** the allocation  
- Cost-recovery processing receipts (fee policy — not founder base)  
- Funds never controlled by a participating entity  

### 1.3 Once-only provenance

Maintain a traceable `founder_allocation_assessed` marker (or equivalent lot/provenance rule) on the monetary value so the **same value cannot be assessed twice** as it moves among entities, accounts, vehicles, or profit distributions.

### 1.4 Lifecycle (keep distinct)

| Stage | Meaning |
| --- | --- |
| Allocation | 1% assessed at first eligible receipt |
| Vesting | If any schedule applies under written terms |
| Payment | Settlement when liquidity, legal, and reserve gates met |
| Tax recognition | Per counsel — may differ from allocation or payment timing |

**Mechanism (provisional):** accrual and/or founder participation units — **not** immediate cash diversion during planning. Immediate payment requires separate approval.

### 1.5 Authority and related-party rules

No civic, constitutional, governmental, data, auditing, or unilateral governance authority. Related-party approval and disclosure required. Distinct from salary, expense reimbursement, and Contributor Pool units for professional work — **netting rules** where the same person could otherwise stack overlapping claims.

---

## 2. Eligible distributable commercial profit

```text
Eligible commercial revenue
− refunds, taxes, and mandatory obligations
− salaries, benefits, health, safety, and contractual compensation
− professional services
− insurance
− infrastructure and operators
− security, privacy, assurance, and incident costs
− software, systems, maintenance, and domain delivery
− legal, accounting, compliance, accessibility, and support
− depreciation, replacement, bad debt, and liabilities
− required reserves
= eligible distributable commercial profit
```

**Do not** subtract an additional founder percentage here. Founder economics were assessed on eligible **receipts**.

**Allocation base (provisional):** lower of (a) audited eligible distributable commercial profit and (b) distributable cash after debt covenants and reserve policy.

Participating entities for profit pools: commercial / operator / sector vehicles (`23`). Foundation restricted surplus never funds Investor or Contributor pools.

---

## 3. Monetary Investor Pool (10%)

From profit allocation base only. Inflation/FX-adjusted capital units (provisional). No unilateral authority; no civic voting power.

---

## 4. Contributor Pool (10%)

From the same profit allocation base, simultaneous with Investor Pool. Fair-value units per `21` / this policy. In-kind ≠ automatic equity or governance.

---

## 5. Civizen / Ecosystem Allocation (80%)

| Purpose | % of profit allocation |
| --- | ---: |
| Continued core and shared-system development | 20 |
| Continuity, security, resilience, and long-term reserves | **13** |
| Civilization-domain development fund | 15 |
| Operators, jurisdictions, and local implementation | 8 |
| Public-interest governance, rights, and open standards | 7 |
| Research, innovation, and open-source stewardship | 6 |
| Inclusion, accessibility, localization, and nondigital access | 5 |
| Ecosystem grants, education, and professional capacity | 4 |
| Strategic renewal and emergency adaptation | 2 |
| **Total** | **80** |

**Note:** Continuity/reserves line is **13%** (was 12% under the superseded 79% table); the +1 point absorbs the former in-pie founder profit share into ecosystem continuity. Domain fund still covers health, economy, education, justice, environment, housing, food, water, energy, transportation, social protection, emergencies, culture, migration, science, statistics, and other inventory domains.

**Stress:** If allocation base collapses, suspend/accrue Investor and Contributor pools and temporarily overweight continuity reserves.

---

## 6. Founder Participation Pool — numerical reconciliation (v0.1.2)

**Policy unchanged.** This section makes the FPP denominator traceable. Horizon = **five-year first-wave capital-formation** for L/B/H private stacks (`20`/`23`), not the full ecosystem cash path.

### 6.1 Correction of the prior $14.0M figure

| Item | Prior placeholder | Reconciled |
| --- | ---: | ---: |
| Eligible External Monetary Receipts | $1,400M (undocumented round) | **$1,470M** |
| Founder Participation Pool (exactly 1%) | $14.0M | **$14.7M** |

**Source of the $1,470M base:** candidate-eligible layers of the **~$2.8B** vehicle-assigned private capital stack (`23`), not the ~$37.5B ecosystem and not commercial profit.

| Vehicle | Stack total ($M) | Eligible for FPP ($M) | Instruments included as eligible |
| --- | ---: | ---: | --- |
| V-ENT | 700 | **500** | preferred 200 + common 250 + capped RR 50 |
| V-OPS | 900 | **200** | operator equity 150 + strategic 50 (special review) |
| V-JUR | 500 | **100** | delivery equity 100 only |
| V-DISC | 350 | **350** | common 200 + preferred 80 + capped RR 50 + strategic 20 |
| V-SEC-EDU | 150 | **120** | common 80 + strategic 40 |
| V-SEC-EMP | 200 | **200** | common 100 + preferred 50 + capped RR 50 |
| **Sum** | **2,800** | **1,470** | |

**Excluded from that $2.8B (not in the $1,470M):** restricted public/grant/first-loss/guarantees/co-finance **$530M**; debt proceeds without express authorization **$800M**.

**Not in the $1,470M:** ~$37.5B ecosystem lines that never enter a Civizen-controlled entity; validation grants (~$446M) — enter steward if funded, but **restricted → excluded**; internal transfers / redistributions of already-assessed lots.

**Commercial operating receipts** (e.g. APIs, discovery) are a **separate** eligible class when first received in operating years. They are **not** added into this capital-formation $1,470M. When assessed at receipt, they are **not** assessed again when those receipts later appear as accounting profit.

### 6.2 Compact private-capital eligibility cases within the ~$37.5B base ecosystem scenario ($M, 5y capital-formation)

**Axis label:** These Low / Base / High columns are **private-capital eligibility cases within the ~$37.5B base ecosystem scenario** — not ecosystem Low/Base/High totals. Gross ecosystem investment stays ~$37.5B in every column; only the private-vehicle and validation slices vary.

| Line | Low | Base | High |
| --- | ---: | ---: | ---: |
| 1. Gross external monetary receipts (5y ecosystem hypothesis `11`) | 37,500 | 37,500 | 37,500 |
| 2. Receipts entering participating Civizen entities | 1,102 | 3,246 | 7,298 |
| — of which private vehicle stacks (`23`) | 900 | 2,800 | 6,400 |
| — of which validation program ask (`14`) | 202 | 446 | 898 |
| 3a. Excluded — restricted public/charitable (validation + stack grants/TA/public layers) | 372 | 976 | 2,109 |
| 3b. Excluded — debt proceeds (no express FPP authorization) | 257 | 800 | 1,829 |
| 3c. Excluded — pass-through / custodial / refundable / tax / internal / already-assessed | 0 | 0 | 0 |
| 3. Excluded or restricted (sum) | 630 | 1,776 | 3,938 |
| 4. **Eligible External Monetary Receipts** (= 2 − 3) | **472.5** | **1,470** | **3,360** |
| 5. **Founder Participation Pool (exactly 1%)** | **4.725** | **14.7** | **33.6** |
| 6. Net receipts remaining for approved purposes (= 2 − 5) | 1,097.3 | 3,231.3 | 7,264.4 |
| 7a. Allocation **accrued** (planning default) | 4.725 | 14.7 | 33.6 |
| 7b. Allocation **vested** | 0 | 0 | 0 |
| 7c. Allocation **payable** | 0 | 0 | 0 |
| 7d. Allocation **paid** | 0 | 0 | 0 |

Low/High private stacks scale from base vehicle mix (`23`: ~$0.9B / ~$2.8B / ~$6.4B). Validation L/B/H from `14` (~$202M / ~$446M / ~$898M). Rows 3c are zero in this **capital-formation** build; they remain mandatory exclusion rules when those flows appear.

**Ecosystem reminder:** ~$34B+ of the ~$37.5B base hypothesis stays in jurisdiction/institutional/other paths and **does not** pass through a Civizen-controlled entity — so it never meets the FPP assessment gate.

### 6.3 Confirmations

| Rule | Status |
| --- | --- |
| Commercial profit is **not** assessed again when underlying receipts were already assessed | Confirmed |
| Internal entity transfers and distributions of assessed lots are **not** reassessed | Confirmed |
| “Units” and “accrual” are the **same entitlement** (two representations), not separate claims | Confirmed |
| Restricted funding excluded unless terms **expressly authorize** participation | Confirmed |
| Civizen/Ecosystem allocation of profit totals **80%** (not 79%) | Confirmed — continuity/reserves line **13%** of profit allocation |
| Profit example on $310M allocation base: Investor **$31M** / Contributor **$31M** / Ecosystem **$248M** | Confirmed (separate base from FPP; no founder % in this pie) |

### 6.4 Combined operating illustration (profit pools; annual $M)

FPP capital-formation figure and annual profit pools use **different bases**. Do not add them into one pie.

| Scenario | FPP note | Profit alloc. base | Investor 10% | Contributor 10% | Ecosystem 80% |
| --- | --- | ---: | ---: | ---: | ---: |
| Conservative (ops) | see §6.2 Low for 5y capital FPP | 5 | 0.5 | 0.5 | 4.0 |
| Base (ops) | 5y capital FPP **$14.7M** on **$1,470M** eligible | **310** | **31** | **31** | **248** |
| Population-scale* | CSV | 2,400 | 240 | 240 | 1,920 |
| Meta-like maturity* | CSV | 17,500 | 1,750 | 1,750 | 14,000 |

\*Speculative — not a forecast. Founder amounts use accrual/units (cash not diverted until authorized).

---

## 7. Owner decision sheet (provisional — not approved)

| Topic | Provisional decision |
| --- | --- |
| Founder Participation Pool | 1% of Eligible External Monetary Receipts, once at first receipt |
| No founder % on profit | Confirmed |
| Provenance | `founder_allocation_assessed` (or equivalent) mandatory |
| Mechanism | Accrual / units = **one** entitlement; not immediate cash in planning |
| Investor / Contributor | 10% / 10% of eligible distributable commercial profit |
| Ecosystem | 80% with table above |
| 10/10/1/79 pie | **Superseded** |
| Dual founder pools | **Superseded** |
| Legal work | Required before any promise or payment |
| Exploratory talk | Provisional unapproved model only — not terms or entitlement |

---

## 8. Document control

Version 0.1.2 · 2026-08-11 · Reconciliation only · Policy unchanged from 0.1.1 · No funds accepted · No units issued · No application features or finance-record markers created.
