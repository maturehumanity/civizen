---
title: Validation Program — scope, priority, and tranche decision memorandum
status: decision-applied-as-v0.3
version: 0.1.1
date: 2026-08-11
related:
  - 32-validation-budget-v0.2-line-adequacy-audit.md
  - 33-validation-scope-priority-tranche-decision.csv
  - 33-validation-scope-priority-tranche-bridge.json
  - validation-budget-v0.3.meta.json
canonical: false
changes_app_or_database: true
changes_external_funding_materials: true
selection: recommended_applied_as_validation_budget_v0.3
---

# Validation scope, priority, and tranche — decision memorandum

Originally analysis-only. **Owner selected Recommended (2026-08-11)** and applied as **Validation Budget v0.3** (exact **$634,400,000.00**). This memo retains the decision rationale; historical v0.2 draft **$530,200,000.00** is preserved as superseded.

Companion: [`33-validation-scope-priority-tranche-decision.csv`](./33-validation-scope-priority-tranche-decision.csv) · [`33-validation-scope-priority-tranche-bridge.json`](./33-validation-scope-priority-tranche-bridge.json) · [`validation-budget-v0.3.meta.json`](./validation-budget-v0.3.meta.json).

---

## 1. Fixed Recommended Base scope (18–24 months)

The **Recommended Validation Base** must complete these deliverables (and only these at Base):

| # | Deliverable | Class |
| ---: | --- | --- |
| 1 | Form receiving entities, controls, procurement, audit readiness | Mandatory for safe validation |
| 2 | Program office, documentation, rights/constitutional design packages | Mandatory for safe validation |
| 3 | Inventory method applied across 467 entries (catalog validation, not builds) | Mandatory for safe validation |
| 4 | Architecture, privacy, security, AI-governance, identity-interop, standards, econ/tax hooks **design** | Mandatory before controlled prototypes |
| 5 | Supplier evidence program (RFIs/quotes/benchmarks) | Mandatory for safe validation |
| 6 | Independent multidisciplinary panels (16) with minority reports | Mandatory for safe validation |
| 7 | Accessibility/localization/nondigital **sample** (≈12–16 languages; 2 indigenous partners; 1–2 sign; a11y + nondigital patterns) — **not** every language | Mandatory before external/field participation |
| 8 | Identity & credential **interop validation** for ≈8–12 jurisdictions — **not** national ID rollout | Mandatory before controlled prototypes |
| 9 | Jurisdiction/institutional consultations (≈12–20) + civil-society grants/participant pay | Mandatory before external/field participation |
| 10 | Named domain studies WS-12.1–12.8 + 12.10 + coordination (12.9 energy/nuclear **deferrable**) | Gate-conditioned |
| 11 | Controlled non-authoritative prototypes (synthetic/authorized data), hosting, shutdown | Gate-conditioned |
| 12 | Role-based screening/safeguarding; emergency assistance SOP; program insurance **bound or formally waived** before field/multi-party demos | Mandatory before external/field participation |
| 13 | Policy contingency + safe-pause capacity for this validation program only | Mandatory for safe validation |

**Class key:** Mandatory for safe validation · Mandatory before controlled prototypes · Mandatory before external/field participation · Gate-conditioned · Deferrable · Optional.

A cheaper case that removes deliverables, assurance, insurance, participation, or safe-pause is **Constrained scope** — not “Low” for the same program.

---

## 2. Separate scope from cost uncertainty

### A. Same-scope cost range (Recommended deliverables fixed)

| | Direct $M | Contingency once | Safe-pause once | **Total $M** |
| --- | ---: | ---: | ---: | ---: |
| Unit-cost Low (~0.88×) | 426.2 | (in total) | (in total) | **~552.4** |
| **Unit-cost Base** | **489.5** | **78.3** | **66.6** | **~634.4** |
| Unit-cost High (~1.30×) | 642.9 | (in total) | (in total) | **~833.2** |

VAL-EX16 stays a **planning allowance** inside these figures — not validated cover.

### B. Scope alternatives (different deliverables)

| Alternative | What changes | Total $M (incl. reserves once) |
| --- | --- | ---: |
| **Constrained validation** | Fewer studies/languages/J; lab-only prototypes; thinner panels/grants; thinner insurance/safe-pause | **~373.8** |
| **Recommended validation** | Fixed Base scope above | **~634.4** |
| **Expanded validation** | More languages/J/panels/demos; deeper insurance/studies | **~1,032.7** |

Do not mix reduced deliverables with cheaper unit costs in one Low/Base/High table.

---

## 3. Reconciling $410.2M → $489.5M direct

| Increase bucket | $M | Meaning |
| --- | ---: | --- |
| Mandatory corrections | **+58.4** | Same Recommended scope; current $ inadequate |
| Gate-conditioned additions | **+18.9** | Needed if prototypes/studies/events proceed |
| Unresolved quotation allowances | **+3.0** | Primarily VAL-EX16 planning uplift pending broker quotes |
| **Direct uplift** | **+79.3** | 410.2 → **489.5** |

All 53 lines with current / recommended / Δ / priority / tranche / gates: **CSV**.

---

## 4. WS-22 travel mathematics (corrected)

### Error in audit `32`

Stating **~$14M for ~320 person-trips** implied **~$43,750 per person-trip**, which contradicts the cited ~$3.5–6.5k loaded international trip benchmarks. **Person-trip count and dollars were inconsistent.** That $14M figure is **withdrawn**.

### Corrected Recommended Base travel book — **$11.5M**

| Component | Assumption | $M |
| --- | --- | ---: |
| Intercontinental person-trips | 180 × ~$6,200 (airfare+lodging+per diem+ground+visa share) | 1.12 |
| Regional person-trips | 200 × ~$3,800 | 0.76 |
| Domestic / short-haul person-trips | 70 × ~$1,800 | 0.13 |
| **Subtotal traveler payments** | **~450 person-trips** | **~2.01** |
| Multi-traveler field teams already counted as person-trips | — | — |
| Accessible-travel uplift | ~12% of affected trips | 0.35 |
| Safety/medical/security **logistics** (not premiums) | Escorts, clinics, briefings | 0.90 |
| Field logistics | Local transport, fixers, kits, shipping | 1.40 |
| Travel desk / booking / compliance | 24 mo | 0.35 |
| Disruption / inflation / rebooking | ~12% of travel book | 0.70 |
| Equity participant travel reserve (Global South) | Additional person-trips & routing | 1.50 |
| Coordination / hybrid facilitation travel buffer | — | 0.50 |
| **Contingency within line (not WS-24)** | Small ops buffer | 0.30 |
| **Rounded Recommended Base** | | **11.5** |

**Implied average on pure airfare+lodging+perdiem person-trips:** ~$4,500–$5,200 — consistent with GBTA/Ramp-class international benchmarks. The rest of the $11.5M is **not** “airfare per trip”; it is logistics, accessibility, equity routing, and disruption.

### Overlap prevention

| Cost | Home | Not in WS-22 |
| --- | --- | --- |
| Venue/facilitation/event support | VAL-EVT | ✓ |
| Participant stipends/grants | WS-23 | ✓ |
| Staff salaries | WS-01 (+ loaded lines) | ✓ |
| Localization/a11y production | WS-15 | ✓ |
| Insurance premiums | VAL-EX16 | ✓ |
| Program contingency | WS-24 | ✓ |

**Current $10M → Recommended $11.5M (+$1.5M).** Mandatory before external/field use if Recommended scope is chosen; TMC quotation can move it ±20%.

---

## 5. P0 corrections

| | WS-15 | VAL-EX16 | WS-22 |
| --- | --- | --- | --- |
| Current scope | Priority languages; demo a11y/nondigital (ambiguous) | Program insurance package | Travel & fieldwork |
| Current $ | 10.0 | 9.0 | 10.0 |
| Corrected scope | **Sample** 12–16 languages + indigenous/sign/nondigital patterns; rename to validation label | Same covers; **quote-dependent** | Corrected travel book §4 |
| Corrected Recommended $ | **18.0** | **12.0 planning allowance** | **11.5** |
| Evidence | LSP market rates + sample design (inference) | No binder quotes yet | Trip math + logistics rebuild |
| Mandatory before external use? | **Yes** (for Recommended scope) | **Yes to bind or waive**; $ amount **not** validated | **Yes** if Recommended field/consultation load |
| Quotes can change materially? | **Yes** (LSP/community RFPs) | **Yes — controlling** | **Yes** (TMC forecast) |

**Do not describe $12M (or $14M) insurance as validated coverage.**

---

## 6. Gate-conditioned tranches

| Tranche | Direct+alloc. $M (Rec. Base) | Duration | Commit before start | Stop conditions | Value if later stop |
| --- | ---: | --- | --- | --- | --- |
| **T1 Formation & quotation** | **~132** | M1–M6 | Entity path, controls, WS-20 launch, insurance RFP, screening rules | Legal incapacity; failed controls | Entities, policies, quote pack, early designs |
| **T2 Core research/design** | **~146** | M3–M14 | T1 controls live; insurance **quote in hand** (bind may wait) | Assurance failure; rights red-flag | Architecture/privacy/security/identity/standards artifacts |
| **T3 Participation & domain studies** | **~145** | M4–M20 | T2 gates; WS-15 sample locked; VAL-EMR SOP; insurance **bound or waiver recorded** | Safeguarding breach; FPIC failure | Study volumes, consultation record, grants outputs |
| **T4 Controlled prototypes** | **~29** | M6–M23 | T2+T3 gates; EX-16 bound/waived; demo charter | Safety/privacy incident; scope creep to authoritative data | Stoppable prototypes + teardown |
| **T5 Independent assurance** | **~38** | M1–M24 | Ring-fenced panel funding | Capture of panels | Panel reports (incl. dissent) |
| **T6 Contingency & safe-pause** | **78.3 + 66.6** | Full period | Drawdown policy | Pause/kill decision | Publish/archive/wind-down capacity |

**Rule:** Do not use later uncertain funding to cover obligations created earlier. T3/T4 must not start on a promise of future insurance money.

**Minimum first committed tranche (T1):** **~$132M** direct.  
**Minimum cash before work begins:** T1 cash for formation + quotation ops (**≈$40–60M** first 90 days inside T1) **plus** ability to bind insurance before any field/multi-party activity — exact bind premium from broker quote (not assumed spent on day 1).

---

## 7. Final recommendation

| Item | $M |
| --- | ---: |
| Constrained-scope total | **~373.8** |
| Recommended same-scope Low / Base / High | **~552.4 / ~634.4 / ~833.2** |
| Expanded-scope total | **~1,032.7** |
| Recommended direct-cost Base | **489.5** |
| Contingency (once @ ~16%) | **78.3** |
| Safe-pause (once @ ~13.6%, incl. IR) | **66.6** |
| **Recommended total Base** | **~634.4** |
| Amount requiring quotations (material) | Insurance + benefits + LSP/travel/audit (**order-of-magnitude $15–40M** of the Base is quote-sensitive; VAL-EX16 alone **$6–22M** band) |
| Minimum first committed tranche | **T1 ~$132M** |
| Minimum cash before work begins | **~$40–60M** inside T1 + insurance bind path before field |

### Does ~$661.7M remain the recommended Base?

**No.** After correcting WS-22 travel mathematics and tightening Recommended vs Expanded (especially WS-15 sample vs expanded language set), the decision-ready **Recommended Base is ~$634M**, not ~$662M. The prior ~$661.7M figure from audit `32` is **superseded as the recommended Base** (still useful as an upper adequacy stress from the broader line-by-line Highs).

**Current draft $530.2M** was the working app/DB number when this memo was written. **Owner selection (2026-08-11):** Recommended case applied as **Validation Budget v0.3** (exact **$634,400,000.00**). v0.2 retained as superseded/historical.

---

## 8. External-language recommendation

**Applied inquiry language (v0.3):**

> Civizen’s recommended 18–24 month pre-major-build validation program currently has a provisional Base of approximately $634M, with a same-scope planning range of approximately $552–833M pending quotations and professional validation. This is separate from the approximately $37.5–38B five-year first-wave implementation hypothesis.

Historical note (pre-selection draft language, superseded for external use): v0.2 working draft was exact $530.2M with Recommended near ~$634M pending owner selection.

---

## Owner decisions

1. ~~Select Constrained / Recommended / Expanded~~ — **Selected: Recommended (~$634.4M)** as Validation Budget v0.3.  
2. ~~Accept corrected WS-22 = $11.5M~~ — **Accepted** in v0.3.  
3. ~~Treat VAL-EX16 as quote-gated~~ — **Accepted** ($12M planning allowance, quote-dependent).  
4. T1 commitment sizing (~$132M framing; provisional $60M received/escrowed floor) — **documented**; no legal commitments, receipts, or fund acceptance created. Receiving-entity path remains unresolved.
