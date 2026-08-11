---
title: Entity, Legal, and Implementation Action Plan v0.1
status: action-plan
version: 0.1.1
date: 2026-08-11
currency: USD
audience: owner-internal
related:
  - 27-founder-investor-and-contributor-participation-policy-v0.1.md
  - 26-comprehensive-financial-classification-and-chart-of-accounts-v0.1.md
  - 25-private-capital-readiness-gap-analysis-v0.1.md
  - 17-funding-readiness-memorandum-v0.1.md
  - 23-investable-vehicles-and-private-capital-architecture-v0.1.md
canonical: false
---

# Entity, legal, and implementation action plan v0.1

**Status:** Planning actions only. **Not** jurisdiction selection, counsel opinion, or authorization to accept funds.  
**Revision 0.1.1:** Aligns with consolidated **Founder Participation Pool** (1% of eligible external receipts, once) and profit split **10% / 10% / 80%**.  
**Do not choose a final jurisdiction without qualified counsel.**

---

## 1. Entity separation (required structure)

| Entity class | Holds | May fund Investor/Contributor profit pools? | May assess Founder Participation 1% on eligible external receipts? |
| --- | --- | --- | --- |
| Public-interest steward / foundation | Standards, grants, rights, public goods | **No** (restricted) | **No** on restricted/public/pass-through funds |
| Commercial services entities | Enterprise APIs, discovery, workflows | **Yes** if eligible profit | **Yes** if receipt eligible and not already assessed |
| Operator / infra vehicles | Hosting, SLAs, availability | Yes on vehicle surplus only | Special review; respect provenance |
| Jurisdiction delivery vehicles | Procurement delivery | Thin equity surplus only | Usually no / special review |
| Independent oversight | Assurance, panels | **Never** | **Never** |
| Sector ventures | Narrow commercial products | Yes if ring-fenced | If eligible external receipt |

**Provenance:** Any inter-entity movement of value that already carries `founder_allocation_assessed` must **not** be re-assessed.

---

## 2. Legal and regulatory workstreams

| Area | Requirement |
| --- | --- |
| Securities | Founder participation units / investor units may be securities — analysis before any offer |
| Charitable / private benefit | No founder assessment on restricted charitable/public funds |
| Tax | Separate allocation, vesting, payment, and tax recognition events |
| Fundraising compensation | Some jurisdictions limit % of raised funds to insiders |
| Related-party | Independent approval for founder assessments and payments |
| Grants / procurement / debt | Honor exclusions; debt only if expressly authorized |
| Cross-border / sanctions / KYC | Before issuance or payout |
| Audit | Receipt lots + assessed marker; profit base without second founder % |
| Conflicts / succession | No civic authority; estate rules with disclosure |

**D6** (receiving entity / fiscal pathway / jurisdiction) remains the hard blocker for fund acceptance (`17`, `25`).

---

## 3. Implementation sequence

| Step | Action | Gate |
| ---: | --- | --- |
| 1 | Freeze consolidated founder + 10/10/80 model as **unapproved** (`27` v0.1.1) | Owner acknowledgment |
| 2 | Engage counsel on D6 + securities/tax/private benefit + once-only assessment | Engagement letter |
| 3 | Design provenance (`founder_allocation_assessed`) in future ledger — **not this pass** | Design review |
| 4 | Draft related-party founder participation schedule | Counsel |
| 5 | Prefer accrual/units; forbid immediate cash until approved | Owner + counsel |
| 6 | Align investor/contributor instruments with 10/10 of profit (`23`/`24`) | After readiness |
| 7 | App implementation — **only after** legal approval | Explicit owner order |

**This pass:** documentation update only.

---

## 4. Exploratory discussion language

- May describe a **provisional, unapproved** model: 1% Founder Participation on eligible external receipts (once); then 10% Investor / 10% Contributor / 80% Ecosystem on eligible distributable commercial profit.  
- Must **not** present dual founder pools or a 10/10/1/79 profit pie as current terms.  
- Must **not** present as entitlement or solicitation.  
- External inquiry materials remain validation-first (`16`/`18`).

---

## 5. Confirmation

No funds accepted. No founder balances, assessed markers in production data, investor/contributor units, payouts, equity, debt, tokens, securities, or distributions implemented. Finance records unchanged.
