---
title: Comprehensive Financial Classification and Chart of Accounts v0.1
status: planning-framework
version: 0.1
date: 2026-08-11
currency: USD
audience: owner-internal
related:
  - 26-chart-of-accounts-v0.1.csv
  - 26-chart-of-accounts-v0.1.meta.json
  - 27-founder-investor-and-contributor-participation-policy-v0.1.md
  - 03-budget-module-spec.md
  - 11-program-financial-model-and-funding-responsibility-v0.1.md
canonical: false
---

# Comprehensive financial classification and chart of accounts v0.1

> **Participation policy status (2026-08-11, rev 0.1.1):** Founder Participation Pool = **1% of Eligible External Monetary Receipts**, assessed once at first receipt (`founder_allocation_assessed`). Eligible distributable commercial profit: **10% Investor / 10% Contributor / 80% Ecosystem**. Dual founder pools and **10/10/1/79** are **superseded** (`27`).

**Status:** Planning taxonomy. **Not** an implemented app schema, approved budget chart, or authorization to accept funds.  
**Machine-readable:** `26-chart-of-accounts-v0.1.csv` (31 expense groups + subaccounts + dimension catalog).

---

## 1. Purpose

Classify every Civizen expenditure, inflow, contribution, and allocation so finance, program, and participation calculations stay auditable and non-duplicative across entities.

---

## 2. Expense taxonomy (31 groups)

| Code | Group |
| --- | --- |
| EX-01 | Personnel and contributor compensation |
| EX-02 | Benefits, health, safety, and wellbeing |
| EX-03 | Professional and specialist services |
| EX-04 | Research, studies, and scientific validation |
| EX-05 | Product, software, and system development |
| EX-06 | Data, AI, knowledge, and statistics |
| EX-07 | Security, privacy, assurance, and auditing |
| EX-08 | Digital infrastructure and connectivity |
| EX-09 | Physical facilities, equipment, and capital assets |
| EX-10 | Federation, operators, and decentralized hosting |
| EX-11 | Jurisdiction and institutional implementation |
| EX-12 | Integration, interoperability, and migration |
| EX-13 | Operations, administration, and program management |
| EX-14 | Governance, rights, ethics, and independent oversight |
| EX-15 | Legal, regulatory, accounting, tax, and compliance |
| EX-16 | Insurance, risk transfer, claims, and liability |
| EX-17 | Banking, payment, treasury, financing, and currency |
| EX-18 | Procurement, vendors, licenses, and intellectual property |
| EX-19 | Education, training, adoption, and user support |
| EX-20 | Accessibility, inclusion, localization, and nondigital access |
| EX-21 | Communications, partnerships, and public engagement |
| EX-22 | Travel, events, logistics, and field operations |
| EX-23 | Grants, subsidies, prizes, and ecosystem transfers |
| EX-24 | Domain-program delivery |
| EX-25 | Utilities, energy, environment, and sustainability |
| EX-26 | Maintenance, renewal, remediation, and technical debt |
| EX-27 | Incident, emergency, disaster recovery, and continuity |
| EX-28 | Taxes, duties, assessments, and mandatory charges |
| EX-29 | Refunds, reversals, bad debt, losses, and adjustments |
| EX-30 | Contingency, reserves, safe pause, transfer, and decommissioning |
| EX-31 | Controlled exceptional or newly identified expenses |

Each group has ~5 subaccounts in the CSV (e.g. `EX-07-03` penetration testing). **EX-24** holds civilization-domain delivery (health, economy, education, justice, environment, and other inventory domains) without duplicating shared platform costs (anti-double-count rule from `11`).

---

## 3. Accounting dimensions (required on every posting)

| Dimension | Role |
| --- | --- |
| Legal entity | Which legal person books the item |
| Responsible organization | Steward / commercial / operator / J / oversight / sector |
| Cost center | Maps to program model centers |
| Program / workstream | Validation WS, first-wave program, etc. |
| System / subsystem | Inventory ID when applicable |
| Civilization domain | Domain tag |
| Jurisdiction | J code or GLOBAL |
| Institution / operator | Named counterparty |
| Phase / period | Validation, FY, month |
| Funding source | Source-ledger link |
| Restriction | Unrestricted / restricted purpose |
| Cash or in-kind | Cash vs fair-value in-kind |
| Capital or operating | Capex vs opex |
| Recurring or one-time | Cadence |
| Cost behavior | Fixed / variable / usage-based |
| Lifecycle state | Planned / committed / accrued / actual / reversed |
| Visibility | Public / internal / restricted / confidential |
| Evidence / confidence | Evidence link + H/M/L |
| Allocation eligibility | Investor / contributor / founder / ecosystem flags |
| Founder assessment provenance | `founder_allocation_assessed` (or equivalent) on receipt lots — once-only rule (`27`) |

### Preventing duplicate accounting

- **One monetary amount, one primary account** (EX-xx). Dimensions are **tags**, not additional amounts.  
- Shared platform costs post once under EX-05/EX-08/EX-07; domain work uses EX-24 only for incremental domain delivery (`11` anti-double-count).  
- Pass-through grants post as agency liability + EX-23 offset — **not** as operating expense of the steward and again as recipient spend in the same consolidation without elimination.  
- In-kind posts as memorandum / fair-value schedule **separate** from cash ledgers (`21`).  
- Inter-entity transfers use EX-23-05 with matching eliminations on consolidation.  
- Founder Participation eligibility is on **eligible external receipts**, not a second flag on accounting profit of already-assessed receipts (`27` v0.1.1).

---

## 4. Relationship to existing models

| Artifact | Use |
| --- | --- |
| `11` cost centers | Map into EX groups + cost-center dimension |
| `14` validation WS | Program/workstream dimension |
| `03` budget module | Future schema may adopt CoA codes; **not implemented this pass** |
| `27` participation | Receipt eligibility + `founder_allocation_assessed` for 1% Founder Participation; profit flags for 10/10/80 only |

---

## 5. Document control

Version 0.1 · 2026-08-11 · App finance schema **unchanged**.
