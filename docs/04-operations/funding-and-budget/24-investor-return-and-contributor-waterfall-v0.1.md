---
title: Investor Return and Contributor Waterfall v0.1
status: scenario-policy
version: 0.1
date: 2026-08-11
currency: USD
audience: owner-internal
related:
  - 23-investable-vehicles-and-private-capital-architecture-v0.1.md
  - 23-vehicle-financial-model-v0.1.csv
  - 21-contributor-compensation-and-in-kind-framework-v0.1.md
  - 20-capital-stack-revenue-and-roi-model-v0.1.md
  - 27-founder-investor-and-contributor-participation-policy-v0.1.md
  - 26-comprehensive-financial-classification-and-chart-of-accounts-v0.1.md
canonical: false
---
# Investor return and contributor waterfall v0.1

> **Participation policy status (2026-08-11, rev 0.1.1):** Founder Participation Pool = **1% of Eligible External Monetary Receipts**, assessed once at first receipt (`founder_allocation_assessed`). Eligible distributable commercial profit (after costs and after founder receipt allocation): **10% Investor / 10% Contributor / 80% Ecosystem**. Dual Founder Funding + Founder Profit pools and the **10/10/1/79** profit pie are **superseded**. Spec: `27` (+ CSV); entity/legal: `28`. CoA: `26`. Unapproved; no app units/payouts.

**Status:** Provisional redesign of participation mechanics. **Not** adopted payout policy. **Not** an offering.  
**Preserves:** Doc `20` finding that a flat 10% investor slice of thin commercial CF cannot make ~$800M undifferentiated equity competitive without terminal value.

---

## 1. Do not apply one 10% pool to all capital

Investors have **different contractual rights**. Senior lenders are paid in the debt waterfall; preferred/capped instruments have defined recovery; common equity and surplus pools are residual. Collapsing everyone into one “10% of distributable CF” recreates the unattractive doc `20` result.

---

## 2. Revised waterfall (per commercial / operator vehicle)

1. Protected liabilities, refunds, customer funds, mandatory liabilities  
2. Essential operations and service continuity  
3. Security, privacy, IR/DR, insurance  
4. Employee and **contractual** contributor compensation (salaries, invoices, milestones)  
5. Protected operating and continuity reserves  
6. **Senior debt** and senior contractual obligations  
7. **Subordinated debt**  
8. **Preferred return or capped investor recovery** (including capped revenue participation progress)  
9. Required maintenance and reinvestment  
10. **Contributor participation pool** (owner hypothesis **10%** of *eligible surplus after 1–9*)  
11. **Mission-aligned investor surplus pool** (owner hypothesis **10%** of same surplus)  
12. **Civizen / Ecosystem Allocation** (**80%** of same surplus — see `27` table; includes operator, public-interest, inclusion, research, continuity)  
13. Retained surplus within ecosystem policy (if any residual after ecosystem sub-allocation)

**Founder Participation Pool is not a step in this profit waterfall.** It is assessed once on Eligible External Monetary Receipts at first receipt (`27`). Do not insert a founder % here, and do not treat accounting profit as an additional founder inflow when underlying receipts were already assessed.

Essential safety and protected public obligations are **never** subordinated to investor seniority.

---

## 3. When 10%/10% begin

| Gate | Rule |
| --- | --- |
| Entity | Only in investable commercial/operator vehicles — **never** foundation restricted funds |
| Solvency | Positive eligible surplus after steps 1–9 |
| Reserves | Continuity reserves ≥ policy |
| Debt | Senior/sub debt current; no covenant breach |
| Preferred / capped RR | Prefer pools only after ≥50% progress on approved recovery/cap (Alt B) |
| Suspension | Same stress triggers as doc `20` (revenue shortfall, incidents, going-concern) |

**Alternatives tested**

| Alt | Rule | Tradeoff |
| --- | --- | --- |
| A | 10/10 from first positive surplus year | Optics early; underfunds reinvestment/debt competitiveness |
| **B (preferred)** | 10/10 after capped/preferred recovery progress ≥50% | Protects contract capital; delays surplus pools |
| C | 5/5 until year 10, then 10/10 | Smoother; still needs debt priority |

---

## 4. Return classes (provisional targets — not promises)

| Class | Indicative target IRR / yield | TV dependence |
| --- | --- | --- |
| Senior contract-backed debt | ~5.5–9% yield | Low if contracts exist |
| Subordinated debt | ~9–15% | Low–medium |
| Infrastructure equity | ~8–15% | Medium |
| Preferred commercial equity | ~8–16% | Medium |
| Common growth equity | ~15–30% targets | **High** (scale/TV) |
| Capped revenue participation | ~8–15% with MOIC cap | Low if volumes |
| Impact / concessionary | 0–6% | Low |
| Strategic access | 5–12% cash + access value | Medium |

Market-assumption basis: project/infra debt and growth-equity ranges (CSV `target_return_classes`). Selected to reflect markets — **not** to force investability.

**Without TV:** debt and capped RR can clear targets with signed/procurable contracts. **With TV or ~1B-user commercial scale:** common equity and surplus pools can look competitive (see `23` scale + Meta-maturity sections).

---

## 5. Contributor participation (surplus pool)

Separate from guaranteed pay:

| Layer | Treatment |
| --- | --- |
| Salary / contract | Waterfall step 4 — before any surplus pool |
| Grants / institutional overhead | Grant instruments |
| In-kind | Fair-value ledger (`21`) — not auto-equity |
| Deferred / milestone | Written contract |
| **10% surplus pool** | After steps 1–9; units = verified fair value × acceptance × vesting |
| Commercial equity | Only where lawful written plan |

**Allocation controls:** independent valuation; milestone gates; duration/quality weights; **max individual concentration** (planning: ≤5% of annual pool); **no civic governance authority** purchasable with units.

---

## 6. Coexistence verdict

**10% investor surplus + 10% contributor surplus can coexist with competitive private capital** only if they attach to **post-contract surplus**. Applying them early to thin CF (doc `20` style) makes broad equity unattractive and should not be presented externally as an investable structure.
