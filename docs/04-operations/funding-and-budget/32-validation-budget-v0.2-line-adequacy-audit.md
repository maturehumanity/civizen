---
title: Validation Budget v0.2 — line-item cost-adequacy audit
status: analysis-only
version: 0.1
date: 2026-08-11
related:
  - validation-budget-v0.2.meta.json
  - 30-validation-budget-v0.2-reconciliation-and-adoption.md
  - 31-validation-budget-v0.2-coa-coverage-review.md
  - 11-program-financial-model-and-funding-responsibility-v0.1.md
  - 32-validation-budget-v0.2-line-adequacy-audit.csv
canonical: false
changes_app_or_database: false
---

# Validation Budget v0.2 — line-item cost-adequacy audit

**Analysis only.** Does **not** change the application, remote draft, exact Base **$530,200,000.00**, contingency/safe-pause holdings, approval, or publication status.

Companion data: [`32-validation-budget-v0.2-line-adequacy-audit.csv`](./32-validation-budget-v0.2-line-adequacy-audit.csv) (all 53 lines) · [`32-validation-budget-v0.2-line-adequacy-bridge.json`](./32-validation-budget-v0.2-line-adequacy-bridge.json).

Prior CoA coverage (doc `31`) asked whether every cost had a **home**. This audit asks whether each **amount** is realistically enough for the **stated validation scope**.

---

## 0. Scale distinctions (apply to every line)

| Scale | What it means | Rule |
| --- | --- | --- |
| **1. Validation (18–24 mo)** | Bounded research, design, sample consultations, stoppable prototypes, institutional formation | Only this scale is funded by Validation Budget v0.2 |
| **2. Five-year first-wave** | Shared frameworks + participating J/institution deployment (~$30–50B / ~$37.5B base in `11`) | Map each validation line to a 5y envelope; **do not** treat validation $ as 5y funding |
| **3. Worldwide mature ops** | Full geographic/language coverage and continuing operations | **Out of scope** for validation dollars; cite only to prevent misreading |

**Anti-double-count:** Shared platform (identity, localization tooling, security, operators) stays in horizontal envelopes (CP-ID, AL-LOC, GC-CP, OE-OP/OR-OP). Domain deployment stays in JP-IMP/II-LEG / SD-* frameworks — not added again inside domain study lines.

---

## 1. Executive verdict

Of **53** lines (CSV):

| Adequacy verdict | Count | Meaning |
| --- | ---: | --- |
| Sufficient | 0 | None are firmly sufficient on evidence |
| Marginal | 30 | Plausible if scope stays tightly bounded |
| Insufficient | 20 | Stated validation ambition exceeds current $ |
| Unverified | 1 | VAL-EX16 — quote-required |
| Formula recalc | 2 | Contingency / safe-pause after direct-cost revision |

Most round millions are **inherited** from Validation Program v0.1 (`14` CSV) rather than bottom-up quotes. Studies (WS-12.*) are relatively better documented (docs `15`/`30`) but still low–medium confidence until WS-20 supplier evidence.

**Headline (analysis, not applied):**

| | Current working draft | Adequacy-adjusted (validation scope) |
| --- | ---: | ---: |
| Direct work program (ex-contingency & safe-pause) | **410.2** | **510.6** Base |
| Contingency (recalculated once @ ~16% Base / ~9% Low / ~19% High) | 65.0 held | **81.7** Base |
| Safe-pause (recalculated once @ ~13.6% Base) | 55.0 held | **69.4** Base |
| **Total** | **530.2** | **~661.7** Base · **~385.5** Low · **~1,206.9** High |

External description of any future adopted Base should remain approximate (e.g. ~$660M) while storing exact cents internally.

---

## 2. Identity (WS-10) — deep dive

**Proposed label:** **Identity & credential interoperability validation**  
**Current:** **$10M** (inherited v0.1 Base).

### What $10M currently buys (honest bound)

| Element | Validation sample funded by $10M (planning interpretation) | Not funded |
| --- | --- | --- |
| Jurisdictions | **~8–12** representative jurisdictions spanning several legal traditions | Every country / every civil-registration authority |
| Credential patterns | **4–6** interop profiles (e.g. W3C VC-class, national eID bridge patterns, organizational credentials) | Production population binding |
| Legal/institutional interop | Comparative memos + counsel for the sample set | Nationwide legal reform |
| Prototype scope | Lab / non-authoritative interop tests; synthetic or authorized test subjects only | Authoritative identity claims about real populations (doc `14` prohibition) |
| Deliverables | Interop profiles, schema drafts, test-suite seeds, boundary/prohibition list, public technical reports | National ID program build |
| Staffing | ~10–16 FTE-eq architects/engineers + specialized counsel | National enrollment workforce |
| Travel/consultation | Depends on WS-22 / WS-13 | Universal diplomatic rollout |
| Community QA | Limited expert review | Mass public enrollment campaigns |

### Adequacy

- **If** the public claim is “design-and-sample validation for ~8–12 J”: **$10M is thin / insufficient** once legal counsel, multi-tradition workshops, and conformance seeds are realistic — **proposed validation Base ~$14M** (Low ~$8M · High ~$22M).
- **If** $10M is read as “identity for every country”: **grossly insufficient** and misleading.

### Horizon estimates (do not load into validation Budget table)

| Horizon | Low | Base | High | Envelope |
| --- | ---: | ---: | ---: | --- |
| Validation (sample) | 8 | **14** | 22 | WS-10 |
| Five-year shared identity infrastructure | 200 | **350** | 600 | **CP-ID-01** (`11`) |
| Five-year jurisdictional identity deployment | — | **inside JP/II** | — | Not added on top of CP-ID |
| Worldwide mature national ID systems | country-specific | often **$100M–$B+** each | — | World Bank ID4D cost drivers (2018 study + model; country characteristics dominate) — **inference:** not a Civizen validation ask |

**Sources (identity):** World Bank ID4D *Understanding Cost Drivers of Identification Systems* / reference cost model (public ID4D materials; study of 15 countries). **Applicability:** five-year/ww national systems — **not** direct validation pricing. Civizen `11` CP-ID-01 for shared first-wave infrastructure.

---

## 3. Localization & accessibility (WS-15) — deep dive

**Proposed label:** **Accessibility, localization & nondigital inclusion validation**  
**Current:** **$10M** (inherited). Doc `14` note: “Priority languages; paper/phone/kiosk patterns for demos.”

### What $10M currently buys (honest bound)

| Element | Validation sample interpretation | Unfunded / out of scope |
| --- | --- | --- |
| Languages | **~12–20** priority languages for UI/strings + key docs (not all languages) | ~7,000 living languages; complete UN-language parity forever |
| Scripts / RTL | Sample RTL (e.g. Arabic) + complex-script tests | Full global script coverage |
| Terminology domains | Civic/legal/health/finance glossaries for sample languages | Exhaustive domain terminology worldwide |
| Indigenous / minority | **2–3** partner communities with compensated participation | All Indigenous languages globally |
| Sign language / disability | **1–2** sign languages + WCAG-oriented engineering patterns | Universal disability service delivery |
| Low-literacy / offline / assisted / nondigital | Pattern prototypes (paper, phone, kiosk, assisted access) for demos | Nationwide assisted-access networks |
| Community linguistic QA | Sample community review cycles | Continuous worldwide LQA ops |
| Prototype scope | Non-authoritative localized demo surfaces | Production multilingual platform for all J |
| Staffing | ~12–20 FTE-eq + LSP vendors | Standing global localization org |
| Travel | Depends on WS-22 / community visits | Universal field presence |

### Adequacy

**$10M is insufficient** for a credible inclusion-validation sample that includes indigenous participation, sign-language, RTL, low-literacy/nondigital channels, and linguistic QA — even when **explicitly not** claiming every language.

**Proposed validation:** Low **~$14M** · Base **~$22M** · High **~$40M**.  
**Proposed adjustment:** **+$12M** Base (not applied).

### Horizon estimates

| Horizon | Low | Base | High | Envelope |
| --- | ---: | ---: | ---: | --- |
| Validation (priority sample) | 14 | **22** | 40 | WS-15 |
| Five-year shared a11y/l10n tooling | 500 | **800** | 1400 | **AL-LOC-01** (`11`) |
| Five-year continuing local-language ops | — | **mostly J / AE-ADS** | — | Do not double-count into AL-LOC |
| Worldwide mature continuing localization | — | **multi-$B** | — | Inference from language count × continuous content velocity |

**Sources (localization):** Market LSP per-word ranges commonly cited ~**$0.05–$0.25**/word by region/specialty (e.g. industry localization pricing summaries, 2024); specialized civic/legal content often +20–40%. **Inference:** even 15 languages × multi-million-word civic corpus + engineering + community QA exceeds $10M. Civizen AL-LOC-01 for first-wave shared program.

---

## 4. Travel (WS-22) — driver model

**Current:** **$10M**. Events venues largely in **VAL-EVT**; medical/evac risk transfer in **VAL-EX16**.

### Explicit drivers (Base planning model)

| Driver | Base assumption | Unit evidence |
| --- | --- | --- |
| Travelers (core + partners) | ~60 distinct people over 24 mo with repeated trips | Inference |
| Person-trips | **~320** (mix of short consults + week-long fieldwork) | Inference |
| Fully loaded intl trip | **~$4,500** median (airfare + lodging + per diem + ground) | Ramp (~2024) median ~$3.2k for 4-day intl city set; GBTA BTI Outlook cite ~$3.6k for 5-day intl — **plus** visas/accessible uplift |
| Visas/permits | ~$200–800/trip where required | Inference / public fee schedules vary |
| Accessible travel uplift | **+15–25%** on affected trips | Inference |
| Safety/medical support (ops, not premiums) | Embedded logistics; premiums in VAL-EX16 | Split |
| Field logistics | Kits, local transport, fixers | Inference |
| Remote-participation substitution | Saves ~20–40% of trips if enforced | Inference |
| Inflation/disruption allowance | **~10%** on travel book | Inference |
| Equity / Global South participant travel | Material share of book | Doc `14` intent |

**Bottom-up Base sketch:** 320 × $4,500 ≈ **$1.44M** is only the thin trip math — **too low** once multi-person delegations, longer stays, accessible travel, disruption, and equity participation are included. A program-shaped book for this validation ambition lands nearer **$12–16M** Base; **$10M is insufficient** without leaning on contingency (forbidden for adequacy).

**Proposed validation:** Low **~$8M** · Base **~$14M** · High **~$24M** (**+$4M** Base).  
Keep WS-22 as the home for airfare/lodging/visas/per diem/ground/logistics/travel safety/accessible travel/coordination.

---

## 5. Five-year reconciliation (selected critical mappings)

| Validation line | Five-year home (do not double-count) |
| --- | --- |
| WS-10 Identity validation | **CP-ID-01** shared ($200–600M) + J identity deployment **inside JP/II** |
| WS-15 Localization/a11y validation | **AL-LOC-01** shared ($500–1400M) + continuing local-language ops **mostly J / AE-ADS** |
| WS-12.1 Health study | **SD-HEA** framework ($180–450M) + health deployment **JP/II attrib. ~$1.87B** (doc `30`) — not worldwide health |
| WS-12.4 Insurance systems study | **SD-INS** framework carve (~$120M) + market/J implementation in JP/II — **not** VAL-EX16 premiums |
| WS-06 Operator design | **OE-OP** establishment + **OR-OP** recurring (100–150 operators) |
| WS-22 / VAL-EVT travel & events | Mostly absorbed in JP/II / AE-ADS field costs in first wave |
| WS-17 Prototypes | Feeds **GC-CP** productization — not JP domain production |
| WS-25 Safe-pause | Distinct from production continuity hypothesis **~$2–4B** (`11`) |

---

## 6. Bridge: $530.2M → revised Low / Base / High (not applied)

| Step | Low $M | Base $M | High $M |
| ---: | ---: | ---: | ---: |
| 0 Current working draft total | 438.3* | **530.2** | 654.5* |
| 1 Current direct (ex WS-24 & WS-25 group) | — | **410.2** | — |
| 2 Adequacy-adjusted direct (all non-reserve lines) | **323.9** | **510.6** | **900.7** |
| 3 Contingency recalculated **once** | 29.2 (~9%) | **81.7** (~16%) | 171.1 (~19%) |
| 4 Safe-pause recalculated **once** | 32.4 | **69.4** (~13.6%) | 135.1 |
| **5 Revised totals** | **~385.5** | **~661.7** | **~1,206.9** |

\*Current L/H are scenario framings from docs `30`/`31`, not line-adequacy bottoms.

**Direct uplift Base:** **+$100.4M** before reserve recalc.  
**Reserve uplift Base (once):** contingency **+$16.7M**, safe-pause **+$14.4M**.  
**Total Base uplift:** **+$131.5M** → **~$661.7M**.

No incremental reserve tweaking beyond this single recalculation.

---

## 7. Assumptions requiring quotations or professional studies

1. **VAL-EX16** full broker/carrier quote pack (D&O, E&O, cyber, GL, EPL, travel/medical, participant, prototype, property, SIR).  
2. **VAL-EX02-GAP** benefits/OHS/EAP/WC and participant duty-of-care quotes by workforce geography.  
3. **WS-20** supplier RFIs for cloud, tooling, audit, facilities, translation LSPs, panel honoraria.  
4. **WS-10** legal interop counsel estimates for the chosen 8–12 jurisdiction sample.  
5. **WS-15** LSP + community participation quotes for the chosen language/disability sample.  
6. **WS-22** travel-management company forecast under hybrid-first + equity rules.  
7. **WS-18** multi-entity formation fee quotes in chosen formation jurisdictions.  
8. **WS-16** panel honoraria/secretariat market rates.  
9. **WS-04** effort model for 467-entry deep review (pilot on 30 entries then extrapolate).  
10. Actuarial review of contingency **16%** and safe-pause **13.6%** policy rates.

---

## 8. Prioritized corrections before external budget use

Do **not** present $530.2M externally as “adequacy-tested” until these are resolved (still **not** applied here):

| Priority | Line | Issue | Proposed Base adj. |
| ---: | --- | --- | ---: |
| P0 | **WS-15** | $10M cannot fund honest inclusion-validation sample | **+$12M** → $22M |
| P0 | **VAL-EX16** | Unverified premiums | **Quote**; planning **+$5M** → $14M pending quote |
| P0 | **WS-22** | Trip math + equity/accessible travel exceed $10M | **+$4M** → $14M |
| P1 | **WS-10** | Legal/interop sample depth thin; rename to validation label | **+$4M** → $14M |
| P1 | **WS-13** | Multi-tradition consultation sample underfunded | **+$6M** → $28M |
| P1 | **WS-04** | 467-entry campaign underfunded if reviews are real | **+$3M** → $15M |
| P1 | **WS-23** | Inclusion grants/participant pay thin vs ambition | **+$6M** → $32M |
| P2 | **WS-17**, **WS-08**, **WS-20**, **VAL-EX17/28/09**, **VAL-AUD** | Round/inherited or placeholder thin | See CSV |

After P0–P1 Base directs are accepted, **recalculate contingency and safe-pause once** (as in §6) — do not nibble reserves repeatedly.

---

## 9. Evidence hygiene

| Claim type | Examples in this audit |
| --- | --- |
| **Sourced** | Civizen `11`/`14`/`15`/`30` envelopes; World Bank ID4D cost-driver framework; GBTA/Ramp international trip cost ranges; market LSP per-word bands |
| **Inference** | FTE counts, person-trip volumes, most Low/Base/High adequacy dollars, “insufficient” judgments where no quote exists |

Currency: **USD**. Geography: global program with multi-region sampling. Dates: evidence accessed **2026-08-11**; underlying publications mostly **2018–2025**.

---

## 10. UI / presentation constraint

Keep the main Budget page compact. Costing evidence, worldwide estimates, and five-year envelopes belong in Program plan / diligence docs / exports — **not** as default table columns on Budget.

---

## 11. Status statement

Validation Budget v0.2 remains **draft · unapproved · unpublished** at exact **$530,200,000.00**. This audit proposes a revised adequacy Base near **~$662M** (exact figure to be locked only if/when owner accepts line adjustments and the one-time reserve recalculation). **No increases applied in this task.**
