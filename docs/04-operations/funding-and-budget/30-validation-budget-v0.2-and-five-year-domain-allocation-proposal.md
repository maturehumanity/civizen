---
title: Validation Budget v0.2 and Five-Year Domain-Deployment Allocation Proposal
status: planning-proposal
version: 0.2
date: 2026-08-11
currency: USD
related:
  - 29-validation-and-five-year-financial-coverage-audit-v0.1.md
  - 14-pre-major-build-validation-program-v0.1.md
  - 15-independent-review-and-domain-study-briefs-v0.1.md
  - 11-program-financial-model-and-funding-responsibility-v0.1.md
  - 26-comprehensive-financial-classification-and-chart-of-accounts-v0.1.md
  - 30-validation-budget-v0.2-financial-model.csv
  - 30-validation-budget-v0.2-financial-model.meta.json
canonical: false
---

# Validation Budget v0.2 proposal + five-year domain-deployment allocation

**Status:** Financial-planning proposal only. **Does not** change the app, database, existing **$446M** draft record, approval, publication, receipts, allocations, participation, or payouts.  
**Machine-readable:** `30-validation-budget-v0.2-financial-model.csv` · provenance: `30-validation-budget-v0.2-financial-model.meta.json`.  
**Basis:** Coverage audit `29`. Existing `$446M` / `$32M` WS-12 / `~$37.5B` five-year figures are **hypotheses**, not caps.

### Decision in one line

**Replace** the current validation draft with a revised **Base ~$524M** plan (Low ~$436M · High ~$642M): keep delivery workstreams, **reprice WS-12 bottom-up**, **disclose** embedded EX-02, **add** missing EX-02 gap + EX-16 (+ small treasury/tax/facilities gaps), and **recalculate** contingency / safe-pause. Do **not** keep `$446M` unless scope is narrowed enough to leave studies underfunded and demos uninsured.

---

## 1. Bridge from current $446M (Base, USD millions)

Anti-double-count rule: EX-02 already inside loaded personnel is **reclassified for disclosure only** (net **$0**). Only the **gap** beyond loaded rates is additive. EX-16 premiums are **not** assumed inside FTE loads.

| Step | Amount $M | Running |
| --- | ---: | ---: |
| Current validation Base (`14`) | **446.0** | 446.0 |
| − Remove opaque WS-12 $32M envelope | −32.0 | 414.0 |
| + Bottom-up ten studies + coordination (Base) | +54.0 | 468.0 |
| − Embedded EX-02 extracted for disclosure | −25.9 | *(memo only; restored below)* |
| + Restore same dollars as explicit EX-02 disclosure | +25.9 | 468.0 |
| + Newly identified EX-02 gap (duty-of-care / OHS / EAP beyond load) | +5.5 | 473.5 |
| + Newly identified EX-16 program insurance envelope | +9.0 | 482.5 |
| + EX-17 banking / treasury / FX (validation period) | +1.0 | 483.5 |
| + EX-28 taxes / duties (entity / compliance) | +1.0 | 484.5 |
| + EX-09 facilities / equipment gap (beyond WS-01 embed) | +1.5 | 486.0 |
| ± Contingency: −40.0 + 65.0 (≈16% of revised work program) | +25.0 | 511.0 |
| ± Safe-pause: −42.0 + 55.0 | +13.0 | **524.0** |

**Revised validation totals:** Low **~$436M** · **Base ~$524M** · High **~$642M**.  
Cash vs in-kind (Base): cash **~$490M** · tracked in-kind **~$34M** (jurisdiction/community time; not additive to cash ask).

---

## 2. WS-12 — bottom-up domain studies (not equal split)

Method (each study): core FTE-months × blended loaded rate (~$22–28k/mo) + specialist days + affected-community / independent participants + multi-jurisdiction sample + research/data + travel + translation/a11y + peer review + publication. Confidence: **low–medium** until WS-20 quotes. In-kind = host institutions / J experts / community time.

| ID | Study | Specialties (indicative effort) | Independent / community | Jurisdictions | Timing | Low | Base | High | In-kind | Conf. | In old $32M | Add’l vs $32M share |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| S-HEA | Health systems, public health, clinical safety, medicines, workforce, data, financing | 10–14 FTE-eq × 12–15 mo; HIE/bioethics consultants | Patients, DPOs, clinicians (non-vendor-captive) | ≥6 legal traditions; low-resource systems | M3–M22 | 5.5 | **8.5** | 14.0 | 1.5–3.0 | M | ~5.0 assumed | **+3.5** |
| S-JUS | Justice & dispute resolution | 6–10 FTE-eq; bench/bar advisors | Legal aid, victims, accused-rights | Accusatorial + inquisitorial + transitional | M3–M22 | 3.0 | **5.0** | 8.5 | 0.8–1.8 | M | ~3.5 | **+1.5** |
| S-TAX | Tax & public revenue | 4–7 FTE-eq; tax counsel | Fiscal transparency NGOs | VAT/GST, income, resource states | M4–M20 | 2.0 | **3.5** | 6.0 | 0.5–1.2 | M | ~2.5 | **+1.0** |
| S-FIN | Finance, banking, **insurance systems**, payments, monetary interfaces | 8–12 FTE-eq; payments/AML/**insurance regulation** | Consumer finance advocates | Plural rails + remittance corridors | M3–M22 | 4.0 | **7.0** | 12.0 | 1.0–2.5 | L–M | ~4.0 | **+3.0** |
| S-MIG | Migration, borders, residency, mobility | 6–10 FTE-eq | Refugee NGOs, diaspora | Asylum / free-movement / destination | M3–M22 | 3.0 | **5.0** | 8.5 | 0.8–2.0 | M | ~3.5 | **+1.5** |
| S-ELE | Elections & democratic participation | 5–8 FTE-eq | Observers, disability voting | Parliamentary + presidential + post-conflict | M4–M21 | 2.5 | **4.5** | 7.5 | 0.6–1.5 | M | ~3.0 | **+1.5** |
| S-SOC | Social protection, children, disability, pensions, care | 5–9 FTE-eq | DPOs, child-rights, care ethics | Varied welfare + customary care | M4–M21 | 2.5 | **4.5** | 7.5 | 0.8–1.8 | M | ~3.0 | **+1.5** |
| S-HOU | Land, housing, property, communal, Indigenous rights | 6–10 FTE-eq | Indigenous designated experts | Torrens/deed/customary/restitution | M3–M22 | 3.0 | **5.0** | 8.5 | 1.0–2.5 | M | ~3.5 | **+1.5** |
| S-ENE | Energy, environment, nuclear-accounting boundaries | 4–7 FTE-eq | EJ groups; nuclear governance | Liberalized + state-utility | M4–M20 | 2.0 | **3.5** | 6.0 | 0.5–1.2 | M | ~2.5 | **+1.0** |
| S-MEA | Official statistics, measurement, public evidence | 4–7 FTE-eq | NSOs, journalists, open data | Plural statistical acts | M4–M20 | 2.0 | **3.5** | 6.0 | 0.5–1.2 | M | ~2.5 | **+1.0** |
| S-COO | Coordination & synthesis (not a domain) | PMO 2–4 FTE; editors; cross-study integration | — | — | M3–M24 | 2.5 | **4.0** | 7.0 | 0.2–0.5 | M | ~0 residual | **+4.0** |
| | **Total studies package** | | | | | **32.0** | **54.0** | **91.5** | **~8–20** | | **32.0** | **+22.0** |

Deliverables (all studies): public-interest volume; inventory markup; cost drivers framework-vs-deployment; never-operate / never-centralize list; steward response to dissent.  
**Civizen role:** standards, integration research, federation patterns — **not** insurer, clinic, court, tax authority, border authority, or statistical office.

---

## 3. EX-02 — workforce health & benefits (explicit)

### 3.1 Composition (validation Base, $M)

| Component | Embedded in loaded WS (disclosure) | Gap (new cash) | Notes |
| --- | ---: | ---: | --- |
| Employer health / jurisdictional equivalent | 10.5 | 0.5 | Most inside load; gap = uninsured jurisdictions / dependents |
| Disability & life | 3.0 | 0.3 | |
| Occupational health & safety | 2.5 | 1.0 | Program OHS beyond WC load |
| Mental health / wellbeing / EAP | 1.5 | 1.0 | Global hybrid uplift |
| Workers’ compensation / equivalents | 4.0 | 0.2 | Primary here; excess liability in EX-16 |
| Leave & statutory benefits | 3.5 | 0.5 | |
| Payroll-linked benefits & employment costs | 0.9 | 0.5 | Portion of statutory; rest EX-01/28 |
| Contractor / participant duty-of-care | 0.0 | **1.5** | **Not** in employee load |
| **Subtotal** | **25.9** | **5.5** | |

Embedded **$25.9M** stays inside existing WS totals (primarily personnel-heavy lines) — shown as EX-02 dimension, **not added again**. Gap **$5.5M** is additive (line `VAL-EX02-GAP` in CSV).

---

## 4. EX-16 — program insurance & liability (quote-required)

| Cover | Low | Base | High | Quote? | Typical exclusions / gate |
| --- | ---: | ---: | ---: | --- | --- |
| Directors & officers | 0.4 | 0.8 | 1.5 | Yes | Intentional misconduct; prior acts |
| Professional indemnity / E&O | 0.5 | 1.0 | 2.0 | Yes | Known claims; some advisory carve-outs |
| Cyber & privacy liability | 0.8 | 1.8 | 3.5 | Yes | War/infra; unpatched known vulns |
| General liability | 0.2 | 0.4 | 0.8 | Yes | Professional services (use E&O) |
| Employment-practices liability | 0.15 | 0.3 | 0.6 | Yes | Wage/hour often limited |
| Employers liability / excess WC | 0.2 | 0.4 | 0.8 | Yes | Primary WC in EX-02 |
| Travel & fieldwork | 0.3 | 0.6 | 1.2 | Yes | High-risk regions may need riders |
| Event & participant | 0.4 | 0.9 | 1.8 | Yes | Contact sports / medical research N/A |
| Research / demonstrator risks | 0.5 | 1.2 | 2.5 | Yes | **Authoritative / real PHI demos uninsurable → prohibited** |
| Property / equipment | 0.1 | 0.25 | 0.5 | Yes | Wear-and-tear |
| Claims admin, deductibles, SIR | 0.3 | 0.6 | 1.2 | Yes | Cash reserve for deductibles |
| **Total EX-16** | **~4.0** | **~9.0** | **~17.0** | | |

Insurance **reduces** transferrable risk; it does **not** eliminate it. **Do not begin** multi-party demonstrators, international fieldwork, or entity-scale contracting until D&O + E&O + cyber + participant covers (or approved alternative) are bound or formally waived by governance with recorded residual risk.

---

## 5. Complete validation cost structure (primary EX account)

Every cash dollar has **one primary EX**. Nonfinancial dimensions (entity, WS, system, geography) ride alongside (`26`).

| Primary EX | What it holds in v0.2 Base | $M (approx) |
| --- | --- | ---: |
| EX-01 / EX-03 | Personnel & professional services inside retained WS (net of EX-02 disclosure slice) | ~118 |
| EX-02 | Disclosure **25.9** + gap **5.5** | 31.4 |
| EX-04 / EX-14 | Studies package + independent panels (WS-16 **34**) | 88.0 |
| EX-05–08 | Tech / infra inside architecture, security, AI, demos | ~45 |
| EX-09 | Facilities disclosure + gap | ~3.5 |
| EX-15 / EX-07 | Legal/org (WS-18), assurance elements | ~20 |
| EX-16 | Program insurance | 9.0 |
| EX-17 | Banking / treasury / FX | 1.0 |
| EX-18 | Procurement setup (WS-19) + vendor slice | ~10 |
| EX-20 | Accessibility (WS-15) | 10.0 |
| EX-21 | Public documentation (WS-21) | 6.0 |
| EX-22 | Travel (WS-22) + study travel (in studies) | ~12+ |
| EX-23 | Grants WS-23 **26** + study pass-through character | 26+ |
| EX-28 | Taxes / duties | 1.0 |
| EX-30 | Contingency **65** + safe-pause **55** | 120.0 |
| Other WS remainder | Consultations, standards, inventory, identity, econ feasibility, etc. | bal. to **524** |

Retained WS-01…11, 13–23 bases unchanged except WS-12 replaced and new explicit lines added (see CSV). Full WS↔EX crosswalk rows are in the CSV (`record_type=ws_ex_map`).

---

## 6. Five-year domain-deployment reconciliation

### 6.1 Structure (must distinguish)

| Layer | Treatment in this proposal |
| --- | --- |
| Shared framework & standards | Keep SD-* lines (`11`); add **explicit insurance-systems framework** |
| System engineering | GC-CP / CP-* horizontal — **not** double-counted into domains |
| Independent assurance | GOV-OV / SA-AS / CP-AUD |
| Operator-network | OE-OP + OR-OP (100–150) |
| Jurisdictional adaptation | Share of JP-IMP |
| Institutional integration | Share of II-LEG |
| Domain production deployment | **Attributed** inside JP/II (below) — not inside SD-* |
| Adoption / training / nondigital | AE-ADS + AL-LOC |
| Ongoing ops / continuity | OR-OP + reserves; production continuity package still **separate** ($2–4B hypothesis in `11`) |

### 6.2 Health (separate views)

| Slice | Base $M | Status |
| --- | ---: | --- |
| SD-HEA framework (existing) | **280** | Retain |
| Shared platform dependencies | *(subset of GC-CP, CP-ID, SA — not additive)* | Disclose only |
| Clinical / public-health deployment in JP/II | **~1,870** (11% of $17B) | Provisional attribution |
| Workforce / safety / medicines / data / financing **interfaces** | Inside S-HEA validation + JP/II health share | Not Civizen clinical employer-of-record |
| Independent clinical / privacy / safety assurance | Panel A9 + SA slice **TBD ~80–150** | Quote |
| Still unallocated / unknown (absent inventory bridges) | **TBD** (order-of-magnitude gap signal in `12`) | Do not invent |

### 6.3 Insurance systems (explicit; ≠ EX-16 OpEx)

| Slice | Proposed Base $M | Civizen role |
| --- | ---: | --- |
| Commercial insurance systems framework | **120** (new SD-INS **or** carve from SD-FIN/ADD) | Standards / interop — **not** underwriter |
| Health insurance / financing interfaces | **80** (HEA∩FIN; mostly inside JP/II health + FIN shares) | Interface patterns only |
| Social insurance (unemployment, disability, pensions, care) | **100** attributed in JP/II social share + SD-SOC | No benefits authority |
| Agricultural / property / disaster insurance interfaces | **60** in EMR/ENV/FIN JP shares | Interface only |
| Licensing, solvency, claims, fraud, actuarial, consumer protection **requirements research** | **40** framework / study spillover into 5y | Requirements — not claims store |
| JP/II integration for insurance systems | **680** (4% of $17B) | Local systems remain J/market |

**Do not centralize** insurers, claims stores, clinical records, or jurisdictional authority in Civizen.

### 6.4 JP/II ~$17B provisional attribution matrix

Confidence: **low**. Logic: inventory weight × first-wave criticality × “hidden-in-J-II” flags — **not** quotes.

| Domain | Stage mix (design/pilot/scale) | Archetype mix | Institution types | Shared vs local | Cash vs in-kind | % of $17B | $B | Conf. |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| Health / public health | 20/30/50 | Mixed income | Ministries, providers, HIE | 15% shared / 85% local | 60/40 | 11 | 1.87 | L |
| Insurance systems | 25/35/40 | Market+social | Supervisors, carriers, exchanges | 20/80 | 55/45 | 4 | 0.68 | L |
| Finance / banking / payments | 20/30/50 | Plural rails | Banks, PSPs, supervisors | 25/75 | 65/35 | 8 | 1.36 | L |
| Tax / public revenue | 15/30/55 | VAT/income/resource | MoF, revenue agencies | 10/90 | 50/50 | 5 | 0.85 | L |
| Justice / dispute | 20/30/50 | Plural legal | Courts, legal aid | 15/85 | 45/55 | 6 | 1.02 | L |
| Elections / public admin | 15/25/60 | Plural systems | EMBs, admin | 10/90 | 40/60 | 5 | 0.85 | L |
| Migration / residency | 20/30/50 | Origin/transit/dest. | Interior, asylum | 10/90 | 40/60 | 5 | 0.85 | L |
| Social protection / care | 20/30/50 | Welfare regimes | Agencies, NGOs | 15/85 | 50/50 | 7 | 1.19 | L |
| Education / research | 15/30/55 | Mixed | Schools, unis | 15/85 | 45/55 | 6 | 1.02 | L |
| Housing / land / Indigenous | 20/30/50 | Tenure plural | Cadastre, nations | 10/90 | 40/60 | 5 | 0.85 | L |
| Energy / environment | 15/30/55 | Utility mix | Regulators, operators | 15/85 | 50/50 | 5 | 0.85 | L |
| Food / water | 15/30/55 | Mixed | Agencies | 10/90 | 45/55 | 4 | 0.68 | L |
| Transport | 15/30/55 | Mixed | Agencies | 10/90 | 50/50 | 4 | 0.68 | L |
| Emergency / humanitarian | 25/35/40 | Hazard mix | NDMA, humanitarians | 20/80 | 55/45 | 5 | 0.85 | L |
| Identity / gov shared at J | 20/40/40 | — | Civil registry | 30/70 | 60/40 | 6 | 1.02 | L |
| Other / multi-domain residual | — | — | — | — | — | 14 | 2.38 | L |
| **Total** | | | | | | **100** | **17.0** | |

### 6.5 Five-year totals recommendation

| Scenario | $B | Notes |
| --- | ---: | --- |
| Low | ~23–24 | Existing low + light insurance explicitness via carve |
| **Base (reconciled)** | **~37.5–38.0** | Keep `11` bottom-up; **prefer carve** SD-INS **$120M** from FIN/ADD rather than inflate; JP/II attribution above |
| Base (additive insurance frameworks) | **~37.9–38.3** | If SD-INS added without carve |
| High | ~61–63 | Existing high + insurance/health deployment pressure |

**Recommendation:** Support existing **~$37.5B** as the ecosystem Base **with explicit insurance-system and JP/II attribution**; do **not** treat $17B as undifferentiated residual. Optional **+$0.4B** only if owner rejects carving SD-INS from existing domain frameworks.

---

## 7. Scenarios & decisions

### 7.1 Validation scenarios (cash ask)

| | Low | Base (recommended) | High |
| --- | ---: | ---: | ---: |
| Total | **~$436M** | **~$524M** | **~$642M** |
| Studies+coord | 32 | 54 | 91.5 |
| EX-02 gap | 3 | 5.5 | 9 |
| EX-16 | 4 | 9 | 17 |
| Contingency | 35 | 65 | 95 |
| Safe-pause | 28 | 55 | 90 |
| Tracked in-kind | ~20 | ~34 | ~55 |

### 7.2 What to do with the current $446M draft

| Option | Verdict |
| --- | --- |
| Retain $446M with narrower scope | Only if owner **cuts** study depth / accepts uninsured demo pause — **not recommended** |
| **Increase** to ~$524M Base | **Recommended** |
| Reallocate only inside $446M | Forces studies ≤$32M while midpoints need ~$54M → **inadequate** |
| Replace draft with v0.2 proposal | **Yes** — as next **planning** draft after owner decision (app seed later, not this task) |

### 7.3 Decision table

| Item | Fund now (validation) | Gate-conditioned | Must not start without continuity / cover |
| --- | --- | --- | --- |
| Core office, rights, architecture, inventory | Yes | — | — |
| Named domain studies S-HEA…S-MEA + S-COO | Yes (Base package) | High-side uplifts after quotes | — |
| Independent panels WS-16 | Yes | — | — |
| EX-02 gap (duty-of-care) | Yes | Full benefits quotes | — |
| EX-16 bind (D&O, E&O, cyber, participant) | Bind before demos/field | Full schedule after broker | Multi-party demos / fieldwork |
| Non-authoritative demonstrators | After insurance gate | Scale-up | Authoritative / PHI / real money |
| JP/II production deployment | No (validation consults only) | After V-gates | Without production continuity package |
| Clinical / insurance **operation** by Civizen | **Never** | — | Prohibited centralization |

### 7.4 Principal omissions / quote requirements

Broker/actuarial EX-16; regional benefits load factors; study RFPs; facilities leases; FX/banking fee schedule; JP/II domain % validation via WS-20; inventory absent-system costing.

---

## 8. Future app presentation (do not implement)

`Program → Domain/workstream → Cost breakdown`

- Default Budget: compact groups / WS (validation v0.1 record unchanged until owner decides).  
- Expand WS-12: named study children.  
- EX accounts & systems: drill-down / filter / export only — **not** 31 accounts or 467 systems on the main page.

---

## 9. Confirmation

No application code, database records, budget amounts, approval/publication state, receipts, allocations, participation, or payout state were changed in producing this proposal.
