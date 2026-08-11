---
title: Program Financial Model and Funding Responsibility v0.1
status: model
version: 0.1
date: 2026-08-10
currency: USD
related:
  - 09-civilization-scale-program-requirements-and-cost-framework-v0.1.md
  - 10-five-year-ecosystem-cost-reconciliation-v0.1.md
  - 11-program-financial-model-v0.1.csv
  - 12-comprehensive-system-inventory-v0.1.md
  - 13-ten-and-twenty-year-program-cost-framework-v0.1.md
canonical: true
---

# Program financial model and funding-responsibility framework v0.1

> ## First-wave clarification (read first)
>
> The approximately **$37.5B** base five-year figure in this document is a preliminary **five-year first-wave ecosystem program**. It is **not** the total cost of completing Civizen or making it available to all humanity.
>
> - It funds **shared foundations**, **domain frameworks**, **initial operators**, **capacity development**, and **selected** jurisdiction/institution deployments.
> - It does **not** complete all domain systems.
> - It does **not** place approximately **200** jurisdictions into production.
> - Its **~$2–5B+** post-Year-5 annual figure represents **first-wave continuity**, not mature worldwide operation or continued global expansion.
> - **Domain-framework allocations are not full domain-implementation budgets.**
>
> System-level decomposition and longer horizons: **`12-comprehensive-system-inventory-v0.1.md`** · **`13-ten-and-twenty-year-program-cost-framework-v0.1.md`**.

**Status:** Preliminary planning model — **not** an approved budget, bid, commitment, or public funding request.  
**Machine-readable companion:** `11-program-financial-model-v0.1.csv` (+ `11-program-financial-model-v0.1.meta.json`).  
**Database:** Unchanged. Demonstration Draft Budget remains **0** / draft / unapproved / unpublished.

**Accepted framing (tested, not forced):** constrained ~$15–25B · base ~$30–50B · accelerated ~$75–150B+ · ~$35B midpoint for modeling · first wave ≠ worldwide completion · post-Year-5 ~$2–5B+/yr · continuity floor ~$2–4B before irreversible work.

**Bottom-up base result:** **~$37.5B** five-year ecosystem (low ~$22.8B · high ~$60.9B). Difference vs ~$35B midpoint: **+$2.5B**, explained by **explicit civilization-domain frameworks** (~$5.3B) that were only implicit in `10`, **without** double-counting shared identity/payments/platform into every domain. Remains inside the **$30–50B** base band.

---

## 1. Participation and production thresholds

| Term | Measurable threshold (must meet **all** listed) |
| --- | --- |
| **Interested jurisdiction** | Documented inquiry only; **no** budget count |
| **Participating jurisdiction** | Signed participation instrument **and** named responsible authority **and** Year-1 funded workstream ≥ threshold (planning: ≥$0.5M cash or documented in-kind with valuation method) |
| **Implementation jurisdiction** | Participating **and** active procurement/build against Civizen interfaces **and** quarterly progress report |
| **Pilot jurisdiction** | Implementation **and** controlled real-user or institutional pilot charter **and** independent review gate scheduled/passed for pilot scope |
| **Limited-production jurisdiction** | Pilot complete for claimed subset **and** production gates (`09` G1–G11 adapted to subset) **and** funded support/IR **and** public honesty statement of scope limits |
| **Mature production jurisdiction** | Limited production **and** multi-year ops funding **and** recurring assurance **and** broad service coverage within that J — **out of scope as Year-5 default** |
| **Participating institution** | Named entity with integration SOW, data-sharing basis, and funded delivery owner |
| **Certified operator** | Passed operator certification, independent admin, diversity criteria, removal clause |
| **Active user** | Authenticated account with ≥1 in-scope productive action in rolling 90 days (exclude test/bots) |
| **Resident potentially covered** | Lawful resident of a **limited-production** or **pilot** J for a service that J has authorized — **not** “served” |

Expressions of interest and workshop attendance **do not** count as participating jurisdictions.

### 1.1 Base Year-5: what ~15–25 limited-production jurisdictions operate

**In limited production (subset, not full map):** federation participation; identity/credential **interop** for agreed credentials; privacy-preserving exchange for authorized datasets; security/IR baseline; public-records provenance for designated record types; AI-agent governance for Civizen-operated agents; **one or two** substantive domain services per J chosen from a shortlist (e.g. selected social-protection intake **or** selected licensing **or** selected education credential verify — **not** full health systems).

**Pilot only (selected J):** civic consultation/proposal; limited delegation/voting experiments; administrative case patterns with partner agencies.

**Reference / not production:** full health clinical systems; universal tax authority; complete justice stacks; monetary issuance; defense C2; worldwide elections.

---

## 2. Cost-center hierarchy

Every cost has **one primary** cost center. Shared costs use **explicit allocation** (see CSV `core_controlled_share` / notes). Reserves are **not** ordinary expenditure.

| ID prefix | Cost center | Primary owner type |
| --- | --- | --- |
| `global-core.*` | Global-core organization | Civizen global-core entity |
| `independent-governance.*` | Independent governance & oversight | Independent oversight body |
| `core-platform.*` | Core platform capability programs | Global-core (with co-finance) |
| `assurance.*` | Security, privacy, AI, assurance | Core + independent split |
| `operator-network.establishment` | Operator-network establishment | Certified operators (+ core seed) |
| `operator-network.recurring` | Operator-network recurring ops | Certified operators |
| `jurisdiction.implementation` | Jurisdiction programs | Governments / regional institutions |
| `institutional.legacy-integration` | Institutional & legacy integrations | Participating institutions |
| `accessibility-localization.*` | Accessibility & localization | Core + J co-finance |
| `adoption-education-support.*` | Adoption, education, support | Mostly J |
| `ecosystem-grants.*` | Ecosystem grants & capacity | Philanthropy / multilaterals (pass-through) |
| `reserves.*` | Legal, insurance, incident, migration, continuity | Multi-party pooled |
| `sector-domain.*` | Civilization-domain **frameworks** (incremental) | Multilateral/research consortia (+ core share) |

**Anti-double-count rule:** Shared identity, payments hooks, audit, notification, case-pattern engines are charged under `core-platform.*` / `assurance.*` **once**. Domain lines fund **only** domain-specific standards, safety models, terminologies, and reference adapters. Domain **deployment** (e.g. hospital EHR integration, tax engine localization) sits in `jurisdiction.*` and `institutional.*`.

---

## 3. Global-core estimate decomposition ($5–8B framing)

### 3.1 Bottom-up core picture

| View | Amount (base, 5y) | Meaning |
| --- | ---: | --- |
| Lines with **primary responsible** = Civizen global-core | **~$4.8B** | Inside prior **$5–8B** band |
| **Core must raise** (Σ base × `core_controlled_share`) | **~$8.2B** | Includes co-finance shares of domains, a11y, economic hooks, reserve tranche, operator seed |
| Pass-through grants administered | **~$1.35B** of $1.5B grants | **Not** core organizational expense |

### 3.2 Breakout of ~$4.8B primary core budget

| Component | Base ~$M | Notes |
| --- | ---: | --- |
| Research & stewardship | 450 | Office, program science |
| Core platform engineering | 1,600 | Horizontal platform only |
| Governance / core legal | 400 | Not J counsel |
| Assurance (core-procured) | 700 | Plus independent line elsewhere |
| A11y / localization (core share of program) | 800 | Co-financed |
| Identity interop program | 350 | |
| Economic hooks / standards | 500 | Not full rails |
| **Subtotal primary core lines** | **~4,800** | |

### 3.3 What should **not** stay purely “global core”

| Program | Recommendation |
| --- | --- |
| Sector-domain frameworks (~$5.3B) | **Consortium-funded**; core raises ~35% share, does not own all |
| Jurisdiction/institutional deployment | **J / institutions** |
| Operator OpEx | **Operators** |
| Independent oversight & independent assurance contracts | **Ring-fenced independent** |
| Grant pass-through | **Administered**, not core P&L spend |

---

## 4. Formula-driven five-year model

**Formula (each line):** `subtotal_{L|B|H} = quantity × unit_cost_{L|B|H}` (USD millions).  
**Annual base:** `yN = subtotal_base × yN_qty_share` with shares **0.08 / 0.14 / 0.20 / 0.26 / 0.32**.  
**Currency:** USD; conversion-date assumption **2026-08-10**; no silent FX.  
**Escalation:** 3% annual noted in CSV (bands already planning-rounded).

Full line register: **`11-program-financial-model-v0.1.csv`** (43 lines).

### 4.1 Reconciled scenario ranges (ecosystem)

| Scenario | Five-year mid (model) | Planning band |
| --- | ---: | --- |
| Constrained | **~$20.6B** | ~$15–25B |
| **Base** | **~$37.5B** | **~$30–50B** (compare to ~$35B midpoint) |
| Accelerated | **~$87B** | ~$75–150B+ (mid below top of band; high CSV path ~$61B is **same topology** high units — accelerated uses scale multipliers on J/institutions) |

### 4.2 Base Year 1–5 cash (ecosystem, incl. reserve provisioning path)

| Year | Base ~$B | Cumulative |
| ---: | ---: | ---: |
| 1 | **3.0** | 3.0 |
| 2 | **5.25** | 8.25 |
| 3 | **7.5** | 15.75 |
| 4 | **9.75** | 25.5 |
| 5 | **12.0** | **37.5** |

Ordinary expenditure vs reserves: reserves **~$4.0B** of base (protected; not OpEx). In-kind excluded from cash requirements (document separately when valued).

### 4.3 Totals by funding-party type (base)

| Responsible type | ~$B |
| --- | ---: |
| Participating public institutions | 10.0 |
| Government / regional | 9.8 |
| Multilateral / research consortium (domain frameworks) | 5.3 |
| Civizen global-core (primary) | 4.8 |
| Multi-party pooled reserves | 4.0 |
| Philanthropy / grants | 1.5 |
| Certified operators | 1.2 |
| Independent oversight | 0.9 |

### 4.4 Horizontal vs domain reporting (no double count)

| Lens | Base ~$B | Contents |
| --- | ---: | --- |
| Horizontal + ops + oversight + grants + reserves + J/II | **~32.2** | Shared platform, J/II envelopes |
| Sector-domain **frameworks** only | **~5.3** | Incremental standards/safety models |
| **Sum** | **~37.5** | |

Domain **deployment** (hospitals, tax engines, courts, grids, etc.) is **inside** jurisdiction (~$7B) and institutional (~$10B) envelopes — not re-added per domain.

---

## 5. Civilization-domain coverage (required)

Civizen is **not** primarily a legal/identity/software project. Those are **foundational cross-cutting** layers. Substantive civilization domains must be modeled.

### 5.1 Domain set (non-exhaustive)

Health & public health · economy/commerce/employment/labor · finance/banking/payments/monetary · taxation/fiscal · education/qualifications/research · science/innovation/knowledge · housing/land/property/urban · food/agriculture/water/supply · energy/natural resources · transportation/mobility/logistics · communications/digital infra · environment/climate/biodiversity/waste · social protection/disability/aging/family · justice/public safety/corrections/rehabilitation · civil & human rights / equality / protection from abuse · migration/residency/citizenship/refugees/statelessness · emergency/disaster/humanitarian · culture/media/language/heritage/public information · industry/business formation/licensing/regulation · consumer protection/product safety · defense/peace/international security/conflict resolution · international relations/treaties/cross-border · elections/representation/legislation/public administration · community/civil society/voluntary · measurement/statistics/forecasting/public evidence · **additional:** digital commons, care economy, space/orbital commons interfaces, sports & recreation public goods, religious/belief organizational interfaces (non-theocratic), indigenous governance interfaces.

### 5.2 Per-domain analysis pattern (applied in CSV `sector-domain.*`)

For each domain the model records (detail in program annex work):

| Question | Rule |
| --- | --- |
| Shared capabilities used | Identity, consent, records, notifications, payments **hooks**, audit, case patterns, localization |
| Domain-specific to build | e.g. health: clinical safety, terminologies (SNOMED/ICD-class), emergency break-glass, epidemiology feeds, professional licensing registries |
| Integrate existing | National EHR, HIE, labs, insurers — **do not rebuild** |
| Remains J/institutional authority | Clinical decisions, tax assessment, policing powers, monetary issuance |
| Specialists / institutions | Domain ministries, regulators, professional bodies, operators |
| Data sensitivity | Often highest (health, justice, children, location) |
| Risks | Safety, discrimination, surveillance, exclusion |
| Regulation / standards | Domain professional + data-protection law |
| Audit / appeal | Domain ombuds + technical audit |
| L10n / a11y | Mandatory for claimed services |
| Year-5 maturity target | **Framework + 0–2 limited services in few J** — not full national systems |
| Cost split | Framework → `sector-domain.*`; deployment → J/II |

**Example — health:** An identity API + generic case tool **≠** a health system. Clinical safety, consent for care, controlled emergency access, and health-system integration are **mandatory domain work**, funded as framework (CSV `SD-HEA-01`) plus institutional integrations (inside `II-LEG-01` / `JP-IMP-01`).

**Example — economy:** Payments hooks **≠** an economic system. Employment, enterprises, contracts, insolvency, competition, consumer protection, trade, market integrity, and measurement require domain frameworks (`SD-ECO`, `SD-FIN`, `SD-CON`, `SD-IND`, `SD-MEA`) plus J/institutional deployment.

### 5.3 Matrix (summary)

|  | Reference framework | Pilot service | Limited production service |
| --- | --- | --- | --- |
| **Horizontal caps** | Core platform Y1–3 | Selected J | 15–25 J subsets |
| **Each sector domain** | CSV domain line | Optional 1 service / few J | Rare in Y5; mostly later |
| **J / institutional** | Legal prep | Integration SOW | Funded ops |

---

## 6. Funding responsibility

### 6.1 Distinctions

| Concept | Meaning |
| --- | --- |
| Money core **must raise** | Σ (line × `core_controlled_share`) ≈ **$8.2B** base |
| Co-financing core **coordinates** | Domain consortia, J matches, operator seeds |
| J-direct expenditure | ~$9.8B government/regional primary |
| Institutional budgets | ~$10.0B |
| Operator-funded infra/ops | ~$1.2B primary (+ core seed inside shares) |
| Independent oversight/assurance | ~$0.9B |
| Philanthropic grants | ~$1.5B (mostly pass-through) |
| Pooled reserves | ~$4.0B |
| In-kind | Excluded from cash totals until valued with method |

**No named institutional commitments are asserted.**

### 6.2 Reclassification recommendations

Move **domain frameworks** to multilateral/research consortia (done in CSV). Keep **independent oversight** off core P&L. Treat **grants** as administered pass-through. Keep **J/II** outside core raise except tiny facilitation shares.

---

## 7. Commitment vocabulary and continuity ($2–4B)

### 7.1 Definitions

| Term | Definition |
| --- | --- |
| Approved budget | Internal authorization to plan — **not** cash |
| Nonbinding indication | Soft interest |
| Conditional commitment | Binding if gates met |
| Legally committed | Enforceable instrument |
| Cash received | In bank / escrow |
| Restricted reserve | Ring-fenced purpose |
| Matching funds | Released when counterpart arrives |
| J co-financing | J-side legally committed share |
| Committed operating runway | Months of critical-path burn covered |

### 7.2 Continuity package (~$2–4B) — model split

| Element | Legally committed | Received/escrowed at start | May be conditional | Protects |
| --- | ---: | ---: | ---: | --- |
| Core runway (≤36 months peak) | ~$0.8–1.2B | ≥50% | ≤30% | Y1–Y2 core burn |
| Operator seed + early OpEx | ~$0.3–0.5B | ≥40% | ≤40% | OE start |
| Early reserves (sec/legal/incident) | ~$0.5–1.0B | ≥60% | ≤20% | Breach/injunction |
| First-wave J/institutional matches | ~$0.5–1.0B | Proof of J instruments | Commonly conditional on gates | JP/II start |
| **Total order** | **~$2–4B** | **≥~$1.0–1.8B** cash/escrow | Remainder | Y1–Y3 critical path |

**May begin before full package:** research, standards drafts, governance formation, non-authoritative validation, institutional preparation (see §7.3).  
**Must wait:** mass migration, authoritative production cutovers, irreversible identity binding of populations, spending that assumes Years 2–3 exist without instruments.

### 7.3 Pre-major-build program (bottom-up)

| Workstream | Base estimate | Stop condition |
| --- | ---: | --- |
| Constitutional / governance formation | $40–80M | No independent oversight charter path |
| Architecture + threat model + privacy/HR review | $50–100M | Failed independent review without remediation fund |
| Reference implementation + adversarial tests | $80–150M | Cannot demonstrate federation properties |
| Operator design validation (≤10 pilot operators) | $30–60M | Diversity/independence criteria fail |
| Institutional preparation / legal feasibility (≤8 J) | $40–80M | No participating J threshold |
| Program office / transparent accounting | $20–40M | — |
| **Pre-major-build total (historical hypothesis in this section)** | **~$0.25–0.50B** over **18–24 months** | **Superseded as working cash total** by **`14-pre-major-build-validation-program-v0.1.md`** bottom-up (**~$202M / ~$446M / ~$898M** low/base/high). Retain stop conditions; use document `14` for budgeting. |

Independently valuable even if full program pauses.

---

## 8. Funding release gates

| Gate | Evidence | Releases |
| --- | --- | --- |
| RG1 Constitutional & governance readiness | Charters, SoD, oversight seat | Core governance spend beyond formation |
| RG2 Architecture & threat-model review | Independent report | Large platform build tranches |
| RG3 Privacy & human-rights review | Independent report | Personal-data pilots |
| RG4 Legal feasibility | Counsel memos for first-wave J | J implementation funds |
| RG5 Operator-design validation | Certified pilot operators | Operator network scale-out |
| RG6 Independent technical assurance | Pentest/privacy/a11y as scoped | Production claims |
| RG7 Jurisdiction participation | Count of **participating** J ≥ plan | Wave-N JP budgets |
| RG8 Workforce & procurement readiness | Hiring/procurement capacity | Burn-rate increase |
| RG9 Continuity funding | Legally committed + escrow thresholds (§7.2) | Irreversible implementation |
| RG10 Safe-pause capability | Tested decommission/export drill | Each production expansion |

Gates **control expenditure**; they must **not** hide an unfunded critical path (RG9 fails closed).

---

## 9. Financial-system redesign (requirements only — no implementation)

Current DB suits a **single small project budget**. Future needs:

| Requirement | Notes |
| --- | --- |
| Multiple legal/operational entities | Core, oversight, operators, J ledgers |
| Ecosystem cost centers | Match hierarchy §2 |
| Program / J / institution / operator sub-budgets | Hierarchical FK |
| Funding responsibility & ownership | Party type + instrument |
| Low/base/high scenarios | Scenario dimension |
| Annual & multi-year forecasts | Period table |
| Commitments vs receipts | Already partly in finance_commitments/receipts — extend |
| Restricted & matching funds | Restriction tags + match rules |
| Protected reserves | `is_reserve` / drawdown rules |
| In-kind / deferred | Separate from cash planned |
| Currencies + explicit FX assumptions | Rate date required |
| Formula provenance | Store formula + inputs (CSV is prototype) |
| Confidence & evidence | Fields on lines |
| Versioned public summaries | Existing publications pattern |
| Consolidation without double count | Cost-center uniqueness + allocation rules |

**Migration/compatibility:** Keep Draft Budget v0.1 demonstration rows (`is_demonstration=true`, amounts 0). Add new tables alongside; do not overload `project_budgets` alone. No schema change in this pass.

---

## 10. Post-Year-5 obligations

If base first-wave outcome holds: combined ongoing often **~$2–5B+/year** (core stewardship + operators + live J/institutional ops), rising with production footprint (`10` §8.2).

---

## 11. Quality checks

| Check | Result |
| --- | --- |
| Annual sums to five-year | 3.0+5.25+7.5+9.75+12.0 = **37.5** |
| L/B/H reproducible from CSV | Yes |
| One primary cost center per line | Yes |
| Pass-through ≠ core expense | Grants 90% pass-through flagged |
| Reserves ≠ ordinary OpEx | `is_reserve=TRUE` |
| In-kind excluded from cash | Yes |
| J/institutional not flat hidden multiplier | Separate lines |
| $35B as preliminary rounded midpoint | Yes; model mid **$37.5B** explained |
| Limited-production scope explicit | §1.1 |
| Worldwide completion not claimed | Yes |

**Evidence confidence:** Structure **medium**; unit costs **low–medium**; domain frameworks **low** until consortia quotes; continuity package **medium** as order-of-magnitude.

---

## 12. Document control

| Field | Value |
| --- | --- |
| Version | 0.1 |
| Date | 2026-08-10 |
| Companions | `11-program-financial-model-v0.1.csv`, `.meta.json` |
| DB / schema changes | **None** |
