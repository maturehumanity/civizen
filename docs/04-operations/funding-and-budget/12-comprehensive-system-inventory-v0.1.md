---
title: Comprehensive System Inventory v0.1
status: inventory
version: 0.1
date: 2026-08-10
related:
  - 09-civilization-scale-program-requirements-and-cost-framework-v0.1.md
  - 11-program-financial-model-and-funding-responsibility-v0.1.md
  - 12-comprehensive-system-inventory-v0.1.csv
  - 13-ten-and-twenty-year-program-cost-framework-v0.1.md
canonical: true
---

# Comprehensive system inventory v0.1

**Status:** Planning inventory — not an approved build list, budget, or commitment.  
**Machine-readable:** `12-comprehensive-system-inventory-v0.1.csv` (+ `.meta.json`).  
**Generator:** `scripts/generate-system-inventory-and-horizon-costs.py`.  
**Database:** Unchanged. App Draft Budget remains **0** / draft / demonstration / unapproved / unpublished.

**Inventory size:** **467** distinct systems and major subsystems (106 horizontal / shared-fabric · 361 civilization-domain). The catalog is extensive but not metaphysically complete; expect growth as professional domain studies proceed.

---

## 0. Relation to the ~$37.5B model (document `11`)

Document `11` is a **five-year first-wave ecosystem program**, not the cost of completing Civizen or serving all humanity. This inventory maps every listed system to that first-wave envelope and shows where work is **adequate**, **partial**, **framework-only**, **hidden in jurisdiction/institutional envelopes**, or **absent**.

---

## 1. Method

1. Decompose **18 horizontal capability domains** into concrete shared systems (identity, privacy, civic participation, case patterns, payments hooks, security, a11y, APIs, operators, adoption, research, plus shared fabric extras).
2. Decompose **26 substantive civilization domains** into systems at the grain of health (consent, EHR/HIE, terminology, licensing, public health, medicines, facilities, break-glass, claims, safety, …) and economy (enterprises, employment, labor, contracts, procurement, insolvency, competition, trade, …) — not domain labels alone.
3. Assign architecture boundaries so Civizen does **not** become one global database or one operator of every civilization function.
4. Assign maturity targets M0–M8 at Year 5 / 10 / 20 independently per system.
5. Reconcile each system’s first-five-year funding status against `11`.

Shared capabilities (notifications, case engine, consent ledger, audit bus, etc.) appear **once** as shared-core rows; domain lines do not re-cost them.

---

## 2. Inventory summary

| Lens | Count |
| --- | ---: |
| Total systems / major subsystems | **467** |
| Horizontal / shared fabric (`H-*`) | 106 |
| Civilization domain (`D-*`) | 361 |
| Shared-core classification | 99 |
| Domain-specific | 296 |
| Integration | 72 |
| Architecture: operate directly | 44 |
| Architecture: reference implementation | 161 |
| Architecture: standards / interop only | 110 |
| Architecture: integrate existing | 87 |
| Architecture: multi-implementation | 22 |
| Architecture: federate | 7 |
| Architecture: leave to jurisdiction | 27 |
| Architecture: prohibit global centralization | 9 |
| Flagged **never centralize globally** | 42 |

### 2.1 First-wave funding status vs document `11`

| Status | Count | Meaning |
| --- | ---: | --- |
| adequate | 5 | First-wave envelope covers credible progress to Y5 target |
| partial | 94 | Some funded work; short of Y5 maturity ambition |
| framework-only | 252 | Covered mainly by `sector-domain.*` allowances (~$5.3B total), not full builds |
| hidden-in-J-II | 34 | Assumed inside jurisdiction (~$7B) / institutional (~$10B) envelopes — not itemized |
| absent | 82 | No credible first-wave line; deferred or excluded |

**Indicative weak/unfunded first-wave gap (order-of-magnitude):** ~**$8–12B** beyond what `11` already places in frameworks + J/II envelopes (meta uses ~$9.6B as a planning signal, not a bid). This gap is **why** Years 6–20 exist — not a call to inflate Year 1–5 into worldwide completion.

---

## 3. Architectural boundaries (anti-centralization)

| Decision | When Civizen uses it | Example |
| --- | --- | --- |
| **operate** | Shared fabric Civizen must run (or tightly steward) for federation integrity | Consent ledger, API gateway, Study platform, language resources |
| **reference** | Publish a reviewed reference; others may run equivalents | Benefits intake patterns, legal-aid intake |
| **standards** | Specs, terminologies, conformance — no operational monopoly | Clinical terminology, e-invoicing profiles, MRV patterns |
| **integrate** | Bridge to authoritative external systems | EHR/HIE, land cadastre, payment rails |
| **multi-impl** | Multiple competing implementations encouraged | Procurement marketplaces, legislative workspaces |
| **federate** | Multi-operator / multi-region without single global store of record | Archival vaults, continuity escrow |
| **leave-to-J** | Jurisdictions/institutions remain sole authority | Child protection, antitrust adjudication, corrections |
| **prohibit-global-central** | Global centralization forbidden | Police records DB, border DB, military C2, monetary issuance, warrants |

**Civizen should operate (~44 systems):** primarily shared horizontal fabric, selected public goods (Study, open evidence indicators, language resources, selected transparency pubs), and operator-certification / federation directory tooling — **not** clinical EHRs, tax authorities, courts, police, or defense C2.

---

## 4. Maturity levels (applied to every CSV row)

| Level | Definition |
| --- | --- |
| M0 | Concept and research |
| M1 | Standards and governance defined |
| M2 | Demonstrator or sandbox |
| M3 | Independently reviewed reference implementation |
| M4 | Controlled institutional pilot |
| M5 | Limited production within defined jurisdictions |
| M6 | Multi-jurisdiction interoperable production |
| M7 | Broadly adopted, resilient worldwide federation |
| M8 | Mature, continuously improved civilization infrastructure |

**Rules:** Systems do **not** advance in lockstep. Prerequisites and evidence live in program gates (`09` G1–G11) plus domain professional reviews. **Unacceptable shortcuts:** production without funded IR/support; claiming worldwide coverage from a framework line; centralizing prohibited classes “for convenience.”

**Typical first-wave pattern:** horizontal shared-core → M3–M5 in limited J; most domain systems → M1–M3 (framework + sandbox); a few domain services → M4–M5 in 15–25 limited-production jurisdictions.

---

## 5. What the $37.5B first wave can and cannot deliver (system level)

### Can (with discipline)

- Shared foundations: identity interop, privacy/security baselines, case patterns, records provenance, AI governance for Civizen agents, a11y/l10n programs, operator network establishment (~100 certified operators), assurance baselines.
- Domain **frameworks** across the 26 domains (standards, safety models, reference adapters) — not full national systems.
- Selected jurisdiction packages (~50–80 participating; ~15–25 limited production for **subsets**).
- Selected institutional integrations inside the ~$10B institutional envelope.
- Capacity development / grants (~$1.5B class).

### Cannot

- Complete all 361 domain systems to production.
- Place ~200 jurisdictions into production.
- Deliver full health clinical stacks, universal tax engines, complete justice stacks, monetary issuance, defense C2, or worldwide elections.
- Treat post-Year-5 ~$2–5B+/yr as mature worldwide OpEx (that figure is **first-wave continuity** only).

---

## 6. Domains requiring dedicated professional studies before credible costing

Priority study set (not exclusive):

1. Health & public health (clinical safety, HIE law, break-glass, financing)
2. Justice / public safety / corrections (strict non-centralization + due process)
3. Taxation & fiscal (sovereign authority boundaries)
4. Finance / payments / monetary interfaces (rails vs issuance)
5. Migration / asylum / borders (humanitarian + sovereignty)
6. Elections & voter credentials (integrity without global voter DB)
7. Social protection & child/family (highest sensitivity)
8. Land / cadastre / communal rights
9. Energy / nuclear materials accounting
10. Measurement & official statistics (authoritative vs open evidence)

Until those studies exist, domain costs remain **framework-class** or **J/II envelope** assumptions.

---

## 7. Required conclusions (inventory)

1. **467** systems/major subsystems identified in v0.1.
2. Civizen should **operate ~44**; most others are reference, standards, integrate, multi-impl, federate, leave-to-J, or prohibit-global-central.
3. **$37.5B** funds first-wave foundations, frameworks, initial operators, capacity, and selected J/institution deployments — not completion.
4. Weak/absent first-wave coverage: **252** framework-only · **82** absent · **34** only inside J/II — indicative extra pressure **~$8–12B** if Y5 ambitions were raised without extending the horizon.
5–8. See document `13` for 10/20-year ranges, annual maintain/expand, deployment plausibility, and continuity commitments.
9. See §6 for domains needing professional studies.
10. **Never centralize globally** (illustrative): military C2; global police/warrant/border databases; monetary issuance; nuclear materials accounting as a Civizen store; biometric as mandatory global ID; indigenous governance authorities; juvenile/child-protection case stores; extradition case stores — see CSV `never_centralize_globally=true` (42 rows).

---

## 8. CSV field dictionary

See header row of `12-comprehensive-system-inventory-v0.1.csv`. Maturity columns are integer M0–M8 targets for Years 5/10/20. `doc11_mapping` points at cost-center or sector-domain IDs where known.
