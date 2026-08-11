---
title: Validation Budget v0.2 — CoA coverage review (labels, splits, proposed adds)
status: coverage-review
version: 0.2.1
date: 2026-08-11
related:
  - 26-comprehensive-financial-classification-and-chart-of-accounts-v0.1.md
  - 30-validation-budget-v0.2-reconciliation-and-adoption.md
  - 29-validation-and-five-year-financial-coverage-audit-v0.1.md
canonical: false
---

# Validation Budget v0.2 — expense taxonomy coverage review

**Budget status:** draft · unapproved · unpublished · exact Base **$530,200,000.00** (~$530M externally).  
**Applied:** seven Base coverage adds (+$6.2M). Contingency/safe-pause **held flat** (formula deltas reported in doc 30 reconciliation — not applied).

Classification key:

| Code | Meaning |
| --- | --- |
| **E** | Explicit named line |
| **I** | Clearly included within an existing line |
| **U** | Included but insufficiently described *(resolved this review where noted)* |
| **M** | Missing — propose L/B/H addition; do **not** draw from contingency/safe-pause |

---

## 1. Required confirmations

| Requirement | Line | Class | Notes |
| --- | --- | --- | --- |
| Travel / fieldwork / intl coordination (airfare, lodging, visas, per diem, ground, logistics, travel safety, a11y travel, coordination) | **WS-22** renamed **Travel, fieldwork & international coordination** | **E** | Description updated; medical/evac risk transfer → VAL-EX16; cash emergency → WS-25.IR |
| Health-system validation study | **WS-12.1** (title leads with Health) | **E** | Full technical scope in description |
| Insurance-system validation study | **WS-12.4** (title leads with Insurance) | **E** | Distinct from VAL-EX16 OpEx |
| Workforce health, benefits, safety & wellbeing | **VAL-EX02-GAP** (+ embedded $25.9M disclosure in personnel WS) | **E** + **I** | Gap explicit; embed disclosed-only |
| Program insurance & liability | **VAL-EX16** | **E** | Quote-required package listed |

---

## 2. Checklist coverage

| Checklist item | Class | Budget home(s) | Action |
| --- | --- | --- | --- |
| Technology, cloud, communications, AI/API use, prototype hosting, security tooling | was **U** → now **E**/**I** | **WS-05.TEC** (split $5M from WS-05); **WS-17.HST** (split $3M from WS-17); research labor remains WS-05/08/09 | Label/split applied |
| Equipment, facilities, supplies, secure asset disposal | was **U** → **E**/**I** | **VAL-EX09-GAP** (title now includes secure disposal); prototype disposal also **WS-17.HST** | Label applied |
| Data acquisition, specialist research tools, publications, licensing | was **U** → **E**/**I** | **WS-20.LIC** (split $2M from WS-20); also inside each WS-12.x study description | Split applied |
| Recruitment, onboarding, training, background checks, workforce admin | was **U** → **E** | **WS-01.ADM** (split $2M from WS-01) | Split applied |
| Accounting, independent financial audit, tax, banking, treasury, payment, FX | was **U** → **E** | **WS-19.FIN** (split $2M from WS-19); **VAL-EX17**; **VAL-EX28**; feasibility WS-11 | Split + explicit lines |
| Translation, interpretation, localization, accessibility, nondigital participation | was **U** → **E** | **WS-15** (description expanded) | Description applied |
| Community/participant compensation, consultations, events | was **U** → **I**/**E** | **WS-23**, **WS-13**, study lines; travel/events logistics **WS-22** | Descriptions applied |
| Incident response, emergency assistance, demonstrator shutdown/decommissioning | was **U** → **E** | **WS-25.IR** (split $4M from WS-25); prototype shutdown tooling **WS-17.HST** | Split applied |

---

## 3. EX-01 … EX-31 primary homes (validation phase)

| EX | Name | Class | Primary home(s) |
| ---: | --- | --- | --- |
| 01 | Personnel compensation | **I** | WS-01 (+ most core WS labor) |
| 02 | Benefits, health, safety, wellbeing | **E**/**I** | VAL-EX02-GAP + embedded disclosure |
| 03 | Professional / specialist services | **I** | WS-16, studies, WS-18, WS-19.FIN |
| 04 | Research / studies / validation | **E** | WS-12.*, WS-04, WS-16, WS-20 |
| 05 | Product / software / system development | **E**/**I** | WS-05, WS-05.TEC, WS-17 |
| 06 | Data / AI / knowledge / statistics | **I**/**E** | WS-09, WS-05.TEC, WS-12.10 |
| 07 | Security / privacy / assurance | **I** | WS-07, WS-08, WS-16 assurance |
| 08 | Digital infrastructure / connectivity | **E** | WS-05.TEC, WS-17.HST |
| 09 | Facilities / equipment / capital assets | **E** | VAL-EX09-GAP (+ thin WS-01 embed) |
| 10 | Federation / operators / hosting | **I** | WS-06 (design only) |
| 11 | Jurisdiction / institutional implementation | **E** | WS-13 |
| 12 | Integration / interoperability / migration | **I** | WS-10, WS-14 |
| 13 | Operations / admin / PMO / HR | **E**/**I** | WS-01, WS-01.ADM, WS-12.C |
| 14 | Governance / rights / ethics / oversight | **E** | WS-02, WS-03, WS-16 |
| 15 | Legal / regulatory / accounting / tax / compliance | **E**/**I** | WS-18, WS-19, WS-19.FIN, VAL-EX28 |
| 16 | Insurance / risk transfer / liability | **E** | VAL-EX16 |
| 17 | Banking / payment / treasury / FX | **E** | VAL-EX17 (+ WS-19.FIN controls) |
| 18 | Procurement / vendors / licenses / IP | **E**/**I** | WS-19, WS-20.LIC, WS-05.TEC |
| 19 | Education / training / adoption / support | **E** | WS-01.ADM (validation-phase training) |
| 20 | Accessibility / inclusion / localization / nondigital | **E** | WS-15 |
| 21 | Communications / partnerships / public engagement | **E**/**I** | WS-21, WS-13 |
| 22 | Travel / events / logistics / field ops | **E** | WS-22 (+ study-local travel inside studies) |
| 23 | Grants / subsidies / ecosystem transfers | **E** | WS-23 (+ study pass-through character) |
| 24 | Domain-program delivery | **I** | Validation = studies only (WS-12.*); not production delivery |
| 25 | Utilities / energy / environment | **I** | Thin inside facilities / cloud; not separately named |
| 26 | Maintenance / renewal / tech debt | **I** | Thin inside WS-05/08/17 (validation-scale) |
| 27 | Incident / emergency / DR / continuity | **E** | WS-25.IR (+ WS-17.HST shutdown) |
| 28 | Taxes / duties / mandatory charges | **E** | VAL-EX28 |
| 29 | Refunds / reversals / losses / adjustments | **M** | Not expected at scale; see proposed add if needed |
| 30 | Contingency / reserves / safe-pause / decommission | **E** | WS-24, WS-25, WS-25.IR, WS-17.HST |
| 31 | Controlled exceptional / newly identified | **M** | Empty by design until owner opens EX-31 |

---

## 4. Zero-sum splits applied (source amounts)

| Child | $M | Parent before → after | Source |
| --- | ---: | --- | --- |
| WS-01.ADM | 2.0 | WS-01 $28 → $26 | WS-01 |
| WS-05.TEC | 5.0 | WS-05 $22 → $17 | WS-05 |
| WS-17.HST | 3.0 | WS-17 $24 → $21 | WS-17 |
| WS-19.FIN | 2.0 | WS-19 $7 → $5 | WS-19 |
| WS-20.LIC | 2.0 | WS-20 $10 → $8 | WS-20 |
| WS-25.IR | 4.0 | WS-25 $55 → $51 | WS-25 |
| **Net** | **0** | **Total remains $524.0M** | |

---

## 5. Proposed additions — **accepted and applied** (Base)

Owner accepted all Base amounts. Working draft Base is now exact **$530.2M**. Contingency/safe-pause were **not** increased.

| ID | Line | Low $M | Base $M | High $M | Status |
| --- | --- | ---: | ---: | ---: | --- |
| ADD-AUD | VAL-AUD Recurring independent financial audit | 0.5 | 1.5 | 3.0 | **Applied Base** |
| ADD-BGC | VAL-SCR Role-based screening, safeguarding & background checks | 0.3 | 0.8 | 1.5 | **Applied Base** |
| ADD-EVT | VAL-EVT Convenings, consultations & events beyond travel | 0.5 | 1.5 | 3.0 | **Applied Base** |
| ADD-DISP | VAL-DISP Secure disposal & e-waste handling | 0.2 | 0.6 | 1.2 | **Applied Base** |
| ADD-EMR | VAL-EMR Emergency participant/field assistance | 0.5 | 1.0 | 2.0 | **Applied Base** |
| ADD-UTIL | VAL-UTIL Utilities & energy for validation compute | 0.2 | 0.5 | 1.0 | **Applied Base** |
| ADD-LOSS | VAL-LOSS Refunds, reversals, bad debt & loss adjustments | 0.1 | 0.3 | 0.8 | **Applied Base** |
| | **Sum** | **2.3** | **6.2** | **12.5** | |

**Resulting planning range:** Low ~**$438.3M** · Base exact **$530.2M** (~$530M) · High ~**$654.5M**.

---

## 6. What was intentionally not done

- No new expense-group rows for EX accounts.
- No move of dollars out of contingency/safe-pause into named gaps.
- No approval, publication, commitments, receipts, or FPP changes.
