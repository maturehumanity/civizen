---
title: Investable Vehicles and Private Capital Architecture v0.1
status: scenario-architecture
version: 0.1
date: 2026-08-11
currency: USD
audience: owner-internal
related:
  - 23-vehicle-financial-model-v0.1.csv
  - 23-vehicle-financial-model-v0.1.meta.json
  - 24-investor-return-and-contributor-waterfall-v0.1.md
  - 25-private-capital-readiness-gap-analysis-v0.1.md
  - 20-capital-stack-revenue-and-roi-model-v0.1.md
  - 22-private-investor-economics-brief-v0.1.md
  - 27-founder-investor-and-contributor-participation-policy-v0.1.md
  - 26-comprehensive-financial-classification-and-chart-of-accounts-v0.1.md
canonical: false
---
# Investable vehicles and private capital architecture v0.1

> **Participation policy status (2026-08-11, rev 0.1.1):** Founder Participation Pool = **1% of Eligible External Monetary Receipts**, assessed once at first receipt (`founder_allocation_assessed`). Eligible distributable commercial profit (after costs and after founder receipt allocation): **10% Investor / 10% Contributor / 80% Ecosystem**. Dual Founder Funding + Founder Profit pools and the **10/10/1/79** profit pie are **superseded**. Spec: `27` (+ CSV); entity/legal: `28`. CoA: `26`. Unapproved; no app units/payouts.

**Status:** Scenario architecture for redesign. **Not** an offer, solicitation, or approved financing plan.  
**Data:** `23-vehicle-financial-model-v0.1.csv` (+ `.meta.json`).  
**Prior finding preserved:** Doc `20` undifferentiated ~$800M commercial equity ≈ **0.3× MOIC / negative IRR without terminal value** remains **unattractive** and is not cosmetically improved.  
**App / DB:** Unchanged.

---

## 1. Answer first

| Question | Answer |
| --- | --- |
| What is privately investable? | Ring-fenced **commercial**, **operator/infra**, **jurisdiction-delivery**, **discovery**, and selected **sector** vehicles — **not** foundation, oversight, or citizen-essential core |
| How much private capital (vehicle-assigned)? | ~**$0.9B / $2.8B / $6.4B** low/base/high |
| What returns without TV? | **Contract-backed senior debt** (~5.5–9% target yield) and capped RR if volumes exist; common equity still weak until scale |
| What needs TV or billion-user scale? | Undifferentiated growth equity; Meta-like advertising maturity |
| Is doc `20` ~$21.3B 15y revenue wrong? | **Undercounted as multi-vehicle gross** if OPS/JUR/DISC execute; **overstated as private-equity CF** if JUR public budgets are treated as investor cash |

---

## 2. Platform benchmarks (FY2025 disclosures — not Civizen targets)

| Comparator | Scale | Annual revenue | Ad / commercial | Op. income | Net income | Rev/user | Model | Differs from Civizen |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Meta | 3.58B Family DAP | $201.0B | Ads $196.2B | $83.3B | $60.5B | ARPP **$57.03** | Behavioral ads | Civic mission, data bans, no Meta-style targeting |
| Alphabet | Search/YT scale | $402.8B | Ads ~$295B class | $129.0B | $132.2B | n/a single | Search/YT/Cloud | Intent auction + cloud; not identity steward |
| LinkedIn (MSFT FY25) | ~1B+ members | $17.8B | Ads+talent+prem | n/a seg. | n/a | ~high teens class | Talent/premium/ads | Closest jobs/directory soft comp |
| Amazon marketplace | Large buyer base | consolidated | Take-rate commerce | n/a | n/a | n/a | Seller fees/FBA | B2B discovery only for Civizen |
| Visa / Mastercard | Global networks | ~$36B / $32.8B | Network fees | MA op.inc. $18.9B | MA NI $15.0B | n/a | Payment volume fees | Personal Civizen fees remain $0 |
| Identity SaaS (e.g. Okta class) | Enterprise customers | low $B class | Subscriptions | SaaS margins | n/a | high $/customer | Enterprise IdP | Public identity core ≠ paid mandatory access |
| GovTech / SI | Agencies | project-variable | Procurement | ~10–25% svc | n/a | contract | Public procurement | Closest to JUR vehicles |

Sources: Meta/Alphabet/Mastercard SEC or earnings releases FY/CY2025; LinkedIn via Microsoft FY25 product revenue. **Do not** set Civizen base RPU to Meta’s $57.

---

## 3. Vehicles (ring-fenced)

| ID | Vehicle | Base capital | Customers | Investable? |
| --- | --- | ---: | --- | --- |
| V-ENT | Commercial enterprise-services | ~$0.70B | Enterprises/institutions | Yes |
| V-OPS | Operator / infrastructure SPVs | ~$0.90B | J / institutions | Yes (mostly debt + operator equity) |
| V-JUR | Jurisdiction implementation | ~$0.50B | Governments | Delivery slice only |
| V-DISC | Commercial discovery & marketplace | ~$0.35B | Businesses/employers | Yes if ad policy adopted |
| V-SEC-EDU | Education/credentials commercial | ~$0.15B | Schools/employers | Yes (narrow) |
| V-SEC-EMP | Business & employment services | ~$0.20B | Employers | Yes (narrow) |
| V-FOUND | Public-interest foundation | — | Grantors/public | **No** investor distributions |
| V-OVR | Independent oversight | — | — | **No** |

Full assets, mission locks, transfer-pricing, CoI, and exit rules: CSV `vehicles`.

**Health interoperability** and other sensitive domains: commercial layer only where payer/service/regulatory path is defensible; **no** health-record advertising or targeting.

---

## 4. Permitted advertising & discovery (V-DISC)

Contextual ads; directory promotion; sponsored B2B listings; commercial search; jobs/education/local discovery; optional procurement premium notices; ads in optional third-party commercial apps; privacy-preserving aggregate measurement.

**Prohibited:** personal-data sales; targeting from health/political/voting/justice/identity/financial/gov-service records; political microtargeting; paid governance influence; ads affecting public-service eligibility; undisclosed sponsorship; mandatory citizen fees; addictive engagement requirements; preferential civic/audit/justice treatment.

Stream-level consent, data, and margin: CSV `ad_discovery_streams`.

---

## 5. Revenue verdict vs doc `20` ~$21.3B

| Lens | Conservative | Base | High |
| --- | ---: | ---: | ---: |
| Multi-vehicle 15y gross (mid-wave ramp) | ~$36B | ~$104B | ~$227B |
| of which private-equity-relevant (ENT+DISC+SEC, rough) | much lower | subset | subset |

- **Undercounted** if lawful discovery + operator + multi-J delivery were omitted.  
- **Not all investable CF** — JUR revenue is largely public procurement.  
- **Evidence class:** mid-wave vehicle totals = scenario; billion-user ad RPU = adoption-sensitive; Meta-like = **speculative maturity only**.

---

## 6. Scale scenarios (commercial RPU ≠ Meta)

Base RPU examples: early institutional high $/user on small base; at population scale **$8–16**/user/yr base — not $57.

| Active users | Base RPU | Annual commercial rev | Dist. CF (base) | 10% investor pool |
| ---: | ---: | ---: | ---: | ---: |
| 100M | $8 | $0.8B | ~$0.08B | ~$8M |
| 1B | $12 | $12B | ~$1.45B | ~$145M |
| 4B | $16 | $64B | ~$7.7B | ~$0.77B |

On ~$1.05B ENT+DISC capital, **~1B users at ~$12 RPU** is the order-of-magnitude threshold for ~12% cash yield via a 10% surplus pool **without TV** (optimistic constant-scale annuity). Years to that threshold: **12–20+ / speculative**.

**Meta-like maturity (labeled, not forecast):** ~3.5B users × ~$55 RPU × ~40% margin makes 10%/10% pools look extremely strong — **technically possible upside**, **not** evidence-supported.

---

## 7. Capital stacks (principle)

Prefer **public first-loss / guarantees / TA** and **senior contract debt** for OPS/JUR contracted cash flows. Reserve **common equity** for ENT/DISC growth where margins and scale can support it. Do not fund contracted availability payments primarily with VC equity.

Instrument layers: CSV `vehicle_capital_stack`. Target return classes: CSV `target_return_classes`.

---

## 8. Investment-stage pathway

Validation (grants) → contracted demos → first OPS SPVs → JUR delivery → ENT commercialization → scaled deployment → population-scale discovery (**disclose scale/TV dependence**). Details: CSV `investment_stages`.

---

## 9. Required conclusions (compact)

1. Investable: ENT, OPS, JUR-delivery, DISC, EDU/EMP commercial — not foundation/oversight/core.  
2. Private capital base by vehicle: see §3 (~$2.8B sum).  
3. Contract debt: availability, hosting SLAs, milestones, MSA backlog.  
4. Commercial equity: API/ARR, discovery/ads at scale, sector SaaS.  
5. Without TV: debt yields and capped RR; equity weak until scale.  
6. With TV/scale: growth equity and Meta-like cases.  
7. 10%/10% pools coexist with competitive capital **only post-contract surplus**.  
8. Pools begin after waterfall steps 1–7 (see `24`).  
9. Need public first-loss, guarantees, TA, J co-finance.  
10. External investable pitch blocked until gaps in `25` close.

---

## 10. Document control

Version 0.1 · 2026-08-11 · No investment offer or application payout features created.
