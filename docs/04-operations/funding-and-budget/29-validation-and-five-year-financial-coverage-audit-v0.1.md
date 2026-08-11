---
title: Validation and Five-Year Financial Coverage Audit v0.1
status: audit
version: 0.1
date: 2026-08-11
currency: USD
related:
  - 14-pre-major-build-validation-program-v0.1.md
  - 14-validation-workstreams-and-budget-v0.1.csv
  - 15-independent-review-and-domain-study-briefs-v0.1.md
  - 11-program-financial-model-and-funding-responsibility-v0.1.md
  - 12-comprehensive-system-inventory-v0.1.md
  - 26-comprehensive-financial-classification-and-chart-of-accounts-v0.1.md
canonical: false
---

# Validation and five-year financial coverage audit v0.1

**Status:** Read-only audit. **Does not** change the validation draft total (**$446,000,000.00**), approval, publication, workstream amounts, or app UI.  
**Sources:** `14` / CSV, `15`, `11` / CSV, `12`, `26` CoA. Unknown amounts = **TBD** (not invented).

### Required distinctions (do not merge)

| # | Requirement | Kind |
| --- | --- | --- |
| 1 | Health as a civilization-scale **system domain** | Domain / inventory / study |
| 2 | Workforce health, benefits, safety, wellbeing as **program expenses** | OpEx (EX-02) |
| 3 | Insurance as an economic/social **system domain** | Domain / inventory / study |
| 4 | Insurance and liability **coverage as program expenses** | OpEx (EX-16) |

---

## 1. Coverage matrix (concise)

Legend: **E** explicit · **H** hidden/embedded · **I** insufficient · **M** missing · **D** deferred to implementation · **O** outside Civizen operate-role (standards/integration research only)

### 1.1 Four required distinctions

| Subject | Validation | Five-year first wave | Notes |
| --- | --- | --- | --- |
| 1 Health system domain | **H** inside WS-12 Study H1 + panel A9; not a Budget line | **E** SD-HEA-01 **$280M** framework; clinical in **JP/II** | Inventory 36 `D-HEA-*` mostly framework-only/absent |
| 2 Workforce benefits / safety / wellbeing | **H** assumed in loaded personnel (WS-01 etc.); **no** EX-02 line | **H** in personnel cost drivers; **no** standalone EX-02 envelope | Amounts **TBD** |
| 3 Insurance as system domain | **I** partly inside Study F1 / inventory `D-FIN-007` etc.; not named WS-12 sub-line | **I** under SD-FIN-01 framework; deployment in JP/II; several insurance bridges **absent** | Do not fold into health |
| 4 Program insurance / liability OpEx | **M** as named line; `14` §3.2 lists demo insurance as **evidence still required** | **H** priority inside RV-ALL / waterfall text; premiums **not** itemized | Amounts **TBD** |

### 1.2 Validation workstreams (WS-01…WS-25) — coverage status

Base amounts from `14` CSV (USD millions). Status = primary audit call for domain/OpEx completeness, not a claim that the line is “wrong.”

| WS | Base $M | Explicit subjects | Hidden / insufficient | Missing vs needs | Horizon |
| --- | ---: | --- | --- | --- | --- |
| WS-01 | 28 | Program office, stewardship | Benefits, payroll taxes, facilities (loaded) | Named EX-02 / EX-16 splits | Val |
| WS-02 | 16 | Constitutional / institutional design | — | Clinical health domain (correctly out) | Val |
| WS-03 | 11 | Rights / anti-capture | — | — | Val |
| WS-04 | 12 | Inventory validation (467) | Health/insurance rows only as inventory challenges | Domain *delivery* | Val → feeds 5y |
| WS-05 | 22 | Architecture / threat models | — | — | Val |
| WS-06 | 15 | Federation / operator-network **design** | ≥100 operators **ops** | Operator OpEx (5y OE/OR) | Val design / 5y ops |
| WS-07 | 10 | Privacy / data governance | Health PHI boundaries (cross-study) | — | Val |
| WS-08 | 16 | Security / crypto research | Cyber insurance buy (OpEx) | EX-16 premiums | Val |
| WS-09 | 9 | AI governance | — | — | Val |
| WS-10 | 10 | Identity / credentials | — | — | Val |
| WS-11 | 12 | Economic, payments, accounting, tax **feasibility** | Insurance-as-market **light** | Named insurance-system study depth | Val |
| **WS-12** | **32** | **“10 priority domain studies” aggregate** | **All 10 domains collapsed to one line** | **Named sub-lines (see §2)** | Val |
| WS-13 | 22 | Jurisdiction / institutional consultations | — | — | Val |
| WS-14 | 8 | Standards / interop planning | — | — | Val |
| WS-15 | 10 | Accessibility / localization / nondigital | — | — | Val |
| WS-16 | 34 | 16 independent panels (incl. A9 Health, A6 Economics) | Panel cost shares not line-itemized | — | Val |
| WS-17 | 24 | Non-authoritative demonstrators | Demo insurance / participant liability | Explicit EX-16 for demos | Val |
| WS-18 | 14 | Legal entity / org formation | Entity insurance placement | Premium schedule | Val |
| WS-19 | 7 | Procurement / financial-control **setup** | Banking fees, FX once live | Ongoing EX-17 | Val setup / later OpEx |
| WS-20 | 10 | Cost-model validation (RFI/quotes/actuarial) | Actuarial **method**; not premium purchase | Buying cover | Val |
| WS-21 | 6 | Public documentation | — | — | Val |
| WS-22 | 10 | Travel / international coordination | Travel medical / trip insurance | Explicit travel insurance | Val |
| WS-23 | 26 | Grants / civil-society participation | Participant injury cover | — | Val |
| WS-24 | 40 | Program contingency | May absorb unmapped OpEx | Not a substitute for EX-02/16 | Val |
| WS-25 | 42 | Safe-pause reserve | Continuity; not domain delivery | — | Val |

### 1.3 Program-expense classes ↔ validation (31-account CoA)

Crosswalk to `26` EX groups. **Responsible WS** = best current home; **$** = known base line total only when the whole WS is that class (otherwise **TBD** inside loaded costs).

| Cost class (user) | CoA | Responsible WS (primary) | Amount | Status |
| --- | --- | --- | ---: | --- |
| Personnel / professional contributors | EX-01 / EX-03 | WS-01 (+ most core WS) | **TBD** (inside WS totals) | **H** |
| Payroll taxes / employment costs | EX-01 / EX-28 | WS-01 | **TBD** | **H** |
| Health, benefits, occupational safety, wellbeing | **EX-02** | WS-01 (implied) | **TBD** | **M** as named |
| Legal, accounting, audit, tax, compliance | EX-15 / EX-07 | WS-18, WS-19, WS-02/03, WS-16 | **TBD** (+ WS-18 **$14M**, WS-19 **$7M** envelopes) | **E/H** |
| Cyber, D&O, GL, travel, participant, workers’ comp insurance | **EX-16** (+ EX-02-03 WC) | WS-17/18/20/22 evidence; no buy-line | **TBD** | **M** as named |
| Independent experts / review panels | EX-04 / EX-14 | **WS-16 $34M** | **$34M** base | **E** |
| Contractors, vendors, procurement | EX-18 | WS-19 + embedded | **TBD** | **H** |
| Software, cloud, AI, security, data, communications infra | EX-05–08 | WS-05–09, WS-17 | **TBD** | **H** |
| Facilities, equipment, supplies | EX-09 | WS-01 / WS-17 | **TBD** | **H** / likely thin |
| Travel, fieldwork, events, logistics | EX-22 | **WS-22 $10M** + embedded | **$10M** + **TBD** | **E/H** |
| Accessibility, localization, interpretation, nondigital | EX-20 | **WS-15 $10M** | **$10M** | **E** |
| Grants / participant compensation | EX-23 | **WS-23 $26M** (+ WS-12 pass-through) | **$26M** + WS-12 **$32M** | **E** |
| Banking, treasury, FX, payment costs | EX-17 | WS-19 setup; live OpEx later | **TBD** | **I** |
| Taxes, duties, refunds, losses | EX-28 / EX-29 | Entity formation / later | **TBD** | **M/D** |
| Contingency / safe-pause | EX-30 | **WS-24 $40M**, **WS-25 $42M** | **$82M** | **E** |

### 1.4 Five-year first-wave (~$37.5B) vs required envelopes

Base figures from `11` CSV ($M). Domain lines are **framework only**; clinical/economic **deployment** lives in **JP-IMP (~$7.0B)** + **II-LEG (~$10.0B)**.

| Required envelope | Planning provision | Base $M | Call |
| --- | --- | ---: | --- |
| Health & public health | SD-HEA-01 | 280 | **E** framework; deployment **H** in JP/II |
| Insurance & social-risk **systems** | SD-FIN (+ inventory bridges); unemployment etc. in ECO/SOC | FIN 350 (+ others) | **I** — no dedicated “insurance systems” line |
| Economy, labor, commerce, banking, payments, accounting, taxation | SD-ECO 320 · SD-FIN 350 · SD-TAX 240 · CP-PAY 500 | 1,410 | **E** frameworks + hooks |
| Education & research | SD-EDU 250 · SD-SCI 160 · AE-ADS 2,800 | 3,210 | **E** |
| Housing, land, food, water, energy, transport, environment | SD-HOU/FOO/ENE/TRA/ENV | 200+190+210+210+220 | **E** frameworks |
| Identity, governance, elections, justice, rights, dispute | CP-ID 350 · GC-LG · SD-ELE 260 · SD-JUS 280 · SD-RGT 160 · CP-AUD 350 | large | **E** frameworks / tooling |
| Social protection, disability, children, aging, care | SD-SOC 220 · SD-ADD (care note) | 220+ | **E** framework |
| Communications, information, culture, media | SD-COM 150 · SD-CUL 130 | 280 | **E** frameworks |
| Emergency / humanitarian continuity | SD-EMR 200 · EX-27 class · reserves | 200+ | **E** framework |
| Accessibility / localization / nondigital | AL-LOC 800 · WS-15 precursor | 800 | **E** |
| Federation ops, ≥100 hosting/operator envs, SecOps, DR, support | OE-OP 600 + OR-OP 600 (+ core platform / assurance) | 1,200+ | **E** (100–150 operators in OE-OP text) |
| Jurisdictional & institutional integration | JP-IMP 7,000 · II-LEG 10,000 | 17,000 | **E** |
| Independent oversight, auditing, public accountability | GOV-OV 400 · SA-AS-02 150 · CP-AUD 350 | 900 | **E** |
| Program EX-02 benefits | — | **TBD** | **M** as named envelope |
| Program EX-16 insurance premiums | Inside RV-ALL narrative / waterfall; not itemized | **TBD** (RV-ALL 4,000 pooled) | **H** |

---

## 2. WS-12 — ten proposed named sub-lines

Parent: **WS-12 Commissioned priority domain studies (10)** — base **$32M** · low ~$18M · high ~$60M (`14`/`15`). Control: **grant_pass_through**. Period parent: **Months 3–22**.

**Rules for this audit:** Do **not** divide $32M equally. Do **not** change $32M until a defensible bottom-up mapping exists. Indicative per-study ranges below are from `15` (already commissioned as briefs). Midpoints of those ranges **sum above $32M** before coordination — so shares are **assumed inside the envelope only as a planning hypothesis**, not as an allocated ledger.

| ID | Proposed sub-line (user naming) | Maps to `15` | Scope | Exclusions | Specialties | Deliverables | Dependencies | Period | Preliminary cost basis (`15`) | Confidence | Share already inside $32M? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WS-12.1 | Health systems, public health, clinical safety, medicines, health financing | H1 | Safety boundaries; integrate-not-rebuild; financing/HIE law; inventory `D-HEA-*` | Operating EHRs/clinical stacks; PHI in demos | Clinicians, public health, patients, HIE advisory, bioethics | Safety model; inventory markup; framework vs deployment cost drivers | A3, A5, A9 | 12–15 mo after kickoff | **$3.5–7M** (base ~$5M) | Medium | **Assumed yes — unmapped** |
| WS-12.2 | Justice and dispute-resolution systems | J1 | Court bridges; ADR safety; juvenile protections | Central police/warrant DB; binding adjudication by Civizen | Bench/bar, legal aid, victims, accused-rights, forensic privacy | Never-centralize justice catalog; demo prohibitions; `D-JUS-*` | A2, A3, A10 | 12–15 mo | **$3–6.5M** | Medium | **Assumed yes — unmapped** |
| WS-12.3 | Tax and public-revenue systems | T1 | Tax **hooks** without becoming tax authority | Collecting tax; replacing MoF systems | Tax counsel, fiscal transparency NGOs | Sovereignty boundary memo; `D-TAX-*` | A6, A16 | 9–12 mo | **$2–4.5M** | Medium | **Assumed yes — unmapped** |
| WS-12.4 | Finance, banking, **insurance**, payments, monetary interfaces | F1 (+ deepen insurance) | Open banking vs issuance; AML; remittances; **insurance market/registry bridges** as **system domain** (distinct from EX-16 OpEx) | Monetary issuance; Civizen as insurer of record | Payments, banking counsel, AML, consumer finance; **insurance regulation** | Feasibility & prohibitions; `D-FIN-*` incl. insurance bridges | A3, A6 | 10–14 mo | **$3–6M** (insurance depth may need uplift — **TBD**) | Low–medium | **Assumed yes — unmapped**; insurance depth **I** |
| WS-12.5 | Migration, borders, residency, mobility | M1 | Status/asylum confidentiality; honest pathway language | Global border database; authoritative citizenship grant | Refugee NGOs, migration counsel, diaspora | Prohibitions; ethical protocol; `D-MIG-*` | A2, A14; pathway doc | 12–15 mo | **$3–6M** | Medium | **Assumed yes — unmapped** |
| WS-12.6 | Elections and democratic participation | E1 | Demo vs never-binding; voter-roll bridges without global voter DB | Binding elections run by Civizen | Election admins, observers, political scientists | Legitimacy red lines; `D-ELE-*` | A1, A2, A5 | 10–14 mo | **$2.5–5.5M** | Medium | **Assumed yes — unmapped** |
| WS-12.7 | Social protection, children, disability, pensions, care | S1 | Heightened protection; benefits intake patterns; care | Authoritative child-protection case management as Civizen-operated | Social work, DPOs, child-rights, care ethics | Sensitivity model; `D-SOC-*` | A2, A8, A9 | 10–14 mo | **$2.5–5.5M** | Medium | **Assumed yes — unmapped** |
| WS-12.8 | Land, housing, property, communal, Indigenous rights | L1 | Cadastre bridges; FPIC; non-centralization of Indigenous governance | Dispossessory land registry operated by Civizen | Indigenous designated experts, registries, housing NGOs | Rights-preserving interop; `D-HOU-*` | A2, A12 | 12–15 mo | **$3–6M** | Medium | **Assumed yes — unmapped** |
| WS-12.9 | Energy, environmental systems, nuclear-material accounting boundaries | N1 (+ ENV cross-read) | Utility bridges; **nuclear materials accounting exclusion**; just transition data | Operating grids/plants; nuclear custody | Energy regulators, grid ops, EJ groups, nuclear governance | High-risk exclusion list; `D-ENE-*` / ENV links | A3, A12 | 9–12 mo | **$2–4.5M** | Medium | **Assumed yes — unmapped** |
| WS-12.10 | Official statistics, measurement, public evidence | Q1 | Authoritative stats vs open evidence; census remains J | Becoming national statistical office | NSOs, SDMX, journalists, open data | Authority boundary memo; `D-MEA-*` | A2, A7, A16 | 9–12 mo | **$2–4M** | Medium | **Assumed yes — unmapped** |

**Coordination / shared study overhead** (multidisciplinary management, translation, publication): **TBD** — must be residual of $32M after bottom-up study quotes, not a forced equal split.

**Pressure finding:** Sum of `15` indicative midpoints ≈ **$40M+** before coordination → either studies compress toward low ends, coordination is minimal, high scenario ($60M) is needed, or **additional funding** is required. Resolve via WS-20 quotes — **do not** edit $32M in this audit.

---

## 3. Short audit narrative

### 3.1 What is explicit

- Validation: 12 groups / 25 WS; base **$446M**; WS-12 **$32M** “10 studies”; WS-16 panels; WS-15 inclusion; WS-24/25 contingency/safe-pause.  
- Five-year: sector-domain frameworks (incl. health **$280M**); operator network **100–150**; JP/II **~$17B**; oversight/assurance lines; accessibility **$800M**.  
- CoA `26`: EX-02 (workforce benefits) and EX-16 (program insurance) exist as **taxonomy**, not as funded validation lines.

### 3.2 What is embedded

- Workforce benefits/safety inside “loaded” personnel across WS-01+.  
- Program insurance/risk inside contingency, safe-pause, and (5y) pooled reserves / waterfall language.  
- Insurance-as-system inside finance/economy studies and inventory bridges.  
- Clinical/economic **deployment** inside JP/II, not SD-* lines.

### 3.3 What is missing or insufficient

- Named Budget sub-lines for WS-12.1–12.10.  
- Named validation OpEx for **EX-02** and **EX-16** (esp. demo / D&O / cyber / travel / participant / WC).  
- Explicit five-year **insurance systems** envelope separate from FIN framework.  
- Itemized premium schedules and benefits load factors (**TBD** everywhere).

### 3.4 What requires a named sub-line (validation)

- The ten WS-12 studies in §2 (presentation + commissioning clarity).  
- Later (not this audit): optional EX-02 / EX-16 **memo lines** under WS-01/17/18/22 once quotes exist — or keep as dimensions on existing WS without raising $446M until bottom-up proves need.

### 3.5 Validation vs five-year vs decentralized

| Belongs in validation (18–24 mo) | Belongs in five-year first wave | Must stay decentralized / J-operated |
| --- | --- | --- |
| Studies, panels, inventory challenge, architecture, demos (non-authoritative), org formation, inclusion design, contingency | Domain frameworks, operator networks, JP/II deployment envelopes, shared platform, reserves | Clinical care delivery, insurance underwriting as state/market function, tax collection, elections binding authority, borders, energy/nuclear custody, national statistics authority, most social-protection case management |

### 3.6 Amounts that may need later redistribution or additional funding

| Item | Action later | Change now? |
| --- | --- | --- |
| WS-12 $32M vs sum of study ranges | Bottom-up mapping / WS-20 quotes; possible high-scenario or add-on | **No** |
| EX-02 benefits load | Extract from loaded FTE or add funding | **No** — TBD |
| EX-16 premiums (incl. demos) | Broker/actuarial quotes (`14` §3.2) | **No** — TBD |
| Insurance system domain depth in F1 | May need study uplift or 5y SD-FIN carve-out | **No** |
| Inventory absent insurance/health bridges | Feed WS-04 + 5y JP/II priority | **No** dollar move |

---

## 4. Proposed presentation changes (do not implement yet)

Preserve default: Budget = validation **Group → Workstream**; Program plan = five-year summary. Hierarchy target:

`Program → Domain → Subprogram/system → Workstream → Expense account`

| Surface | Proposal | Responsive |
| --- | --- | --- |
| **Budget** (validation) | Keep 12 groups / 25 WS as default. Under WS-12 only: expandable **named sub-lines** WS-12.1–12.10 (read-only labels + indicative ranges from `15` until owner maps $). Do **not** put 467 systems or 31 EX accounts on the main screen. | Wide: nested rows under WS-12. Narrow: WS-12 detail sheet / accordion. Search already filters titles. |
| **Budget** advanced | Optional “Expense class” filter mapping WS → EX-xx (`26`) for finance editors — progressive disclosure, export CSV with EX codes. | Desktop filter; mobile export-first. |
| **Program plan** | Domain cards (SD-*) remain summary. Link “Health domain” ≠ “Program benefits (EX-02)” ≠ “Program insurance (EX-16)” as three separate callouts. Operator line already cites 100–150 — keep visible. | Stack cards; advanced = inventory status counts. |
| **Neither** | No new tabs/cards/schemas/migrations/versions in this pass. No $37.5B master ledger row. | — |

### Placement sketch

1. Validation Budget table: after expanding WS-12, show ten child rows (names only; amounts “indicative / unallocated within $32M” until mapping).  
2. Program plan five-year: domain list unchanged; add footnote distinguishing **system-domain insurance** vs **organizational insurance OpEx**.  
3. Export: Group/WS today; later columns Domain, System ID, EX account.

---

## 5. Non-actions (this document)

- No UI elements added  
- No database / seed / amount / approval / publication changes  
- No equal split of $32M  
- No new budget version  

**Next owner step (outside this audit):** commission bottom-up WS-12 quote sheet + EX-02/EX-16 loaded-cost study via WS-20 before any redistribution.
