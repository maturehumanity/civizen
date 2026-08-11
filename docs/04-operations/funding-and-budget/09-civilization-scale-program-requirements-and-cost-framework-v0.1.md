---
title: Civilization-Scale Civizen Program Requirements and Cost Framework v0.1
status: framework
version: 0.1
date: 2026-08-10
currency: USD
canonical: true
supersedes_for_program_funding:
  - 06-initial-working-budget-v0.1.md
  - 07-budget-estimate-scenarios-v0.1.md
  - 08-budget-realism-and-scope-audit-v0.1.md
---

# Civilization-scale Civizen program requirements and cost framework v0.1

> **Preliminary ecosystem totals — reconciliation required**  
> The five- and ten-year **ecosystem monetary totals** in this document (including the ~**$4B** five-year base) are **preliminary** and **internally inconsistent** with a serious multi-jurisdiction reading of the same unit costs. They are **superseded for five-year ecosystem planning** by  
> **`10-five-year-ecosystem-cost-reconciliation-v0.1.md`**, which rebuilds an additive model (realistic base midpoint ~**$35B** over five years; band **$30–50B**).  
> **Retain** this document’s capability map, production-launch gates, operator-network *requirements*, funding-layer distinctions, comparator table, and schema notes. **Do not** use §6.5 / §12 ecosystem dollar summaries as capitalization authority.

**Purpose:** Determine what must be funded to build and launch a sufficiently complete, safe, resilient, independently governed **initial production** version of Civizen — and to operate toward a federated system potentially usable by nearly eight billion people and their institutions.

**Method:** Requirements and cost centers first. **No** affordability target. **No** optimization to look fundable. A website, demonstrator, reference architecture, or limited feature pilot is **not** delivery of Civizen.

**Currency:** USD planning units. Multi-currency reality will appear in jurisdiction and operator budgets; do not silently FX-convert.

**Application database:** Do **not** enter these figures into project-finance tables. Draft Budget v0.1 remains amounts **0**, `draft`, `is_demonstration=true`, unapproved, unpublished.

**Historical records preserved but superseded for program-level funding:**

| Doc | Role now |
| --- | --- |
| `06` | Historical skeleton / app line structure |
| `07` | Historical prototype-sized estimate proposal (~$53k–$789k) |
| `08` | Historical realism audit of prototype cases A/B/C |

Those documents may guide **bootstrap research** tooling only. They must **not** guide full program capitalization, jurisdiction deployment, worldwide ecosystem investment, or continuity-safe production funding.

No file named `09-staged-funding-and-budget-plan-v0.2.md` was created; if one appears later as a prototype-sized plan, treat it as superseded historical material for the same reason.

---

## Governing principles

1. **Civilization-scale target:** Federated civic infrastructure for people, countries/territories, public institutions, companies, civil society, and other lawful entities — not a single product demo.
2. **Continuity before scale claims:** Production launch must not depend on funding expected to expire before a continuity-safe operating state.
3. **Partial work ≠ fulfillment:** Research, components, and pilots may be valuable; they must not be labeled as Civizen delivered.
4. **Not one app / one database:** Capabilities may live in standards, multiple systems, operator networks, jurisdictional overlays, and human institutions.
5. **No invented commitments:** Funding architecture maps *suitable* responsibilities; it does not assert that any named institution has agreed to fund or join.
6. **Essential labor is paid:** Do not treat permanent unpaid labor as the operating model for production-critical roles.
7. **100 operators = initial topology:** An initial production assumption for diversity and resilience — **not** proof of eventual worldwide sufficiency.

---

## Funding-layer distinction (read before numbers)

| Layer | What it funds | Typical order of magnitude (indicative) | Must not be confused with |
| --- | --- | --- | --- |
| **Bootstrap research** | Discovery, standards drafts, reference code, adversarial tests, non-authoritative sandboxes | Tens of millions USD over multi-year research (not `$226k` program claims) | Production Civizen |
| **Full program capitalization** | Global-core build + assurance + continuity reserves through initial production | **Hundreds of millions to low billions** USD (see §8) | One-country GovTech project alone |
| **Jurisdiction deployment** | National/regional adaptation, legal localization, institutional change, migration | **Millions to hundreds of millions per jurisdiction** | Global-core budget |
| **Worldwide ecosystem investment** | Core + operators + many jurisdictions + institutional transition + reserves | **Billions to tens of billions** USD over a decade (see §8) | Any single org’s budget |
| **Continuing annual operations** | Global stewardship + operator network + jurisdiction run costs | **Hundreds of millions+ USD/year** at multi-jurisdiction production | Prototype hosting bills |

---

## 1. Capability map (hierarchical)

Scope class key: **G** global-core · **J** jurisdiction-specific · **O** operator-specific · **S** shared standard/ecosystem.

For each domain: why required · minimum safe launch · dependencies · specialties · build/integrate/adapt/regulate · legal prerequisites · independent assurance · if omitted · scope class.

### 1.1 Constitutional and institutional governance — G/S/J

| Item | Content |
| --- | --- |
| Why | Without legitimate governance rules, software cannot claim civic authority |
| Min safe launch | Published constitutional/instruments; decision rights; amendment rules; conflict-of-interest; independent oversight charter |
| Dependencies | Law, human rights, representation design |
| Specialties | Constitutional law, political science, public admin, facilitation |
| Decision | **Regulate + design** institutions; software encodes procedures only |
| Legal | Instruments recognized by participating entities or clearly non-authoritative until then |
| Assurance | Independent governance review; public comment record |
| If omitted | Product becomes private platform with civic branding — **invalidates mission claims** |
| Scope | G (meta-governance) + J (local adoption) + S (model charters) |

### 1.2 Identity, credentials, personhood, representation, recovery — G/J/S

| Item | Content |
| --- | --- |
| Why | Civic acts require attributable, recoverable, abuse-resistant identity without single-state capture |
| Min safe launch | Multi-path identity; recovery; delegation/representation rules; anti-sybil strategy; minors/assisted access policy |
| Dependencies | Cryptography, privacy, legal personhood rules, accessibility |
| Specialties | IAM, cryptography, civil registration expertise, UX |
| Decision | **Build + integrate** (wallets, IdPs) + **regulate** acceptance |
| Legal | Jurisdictional recognition pathways; data-protection bases |
| Assurance | Security + privacy + inclusion audits |
| If omitted | Fraud, exclusion, or coercive single-issuer dependence |
| Scope | G protocols + J civil-registry bridges + S credential formats |

### 1.3 Privacy-preserving data storage and exchange — G/O/S

| Item | Content |
| --- | --- |
| Why | Civic data is weaponizable; federation without privacy design fails human rights |
| Min safe launch | Data-minimization defaults; encryption at rest/in transit; purpose limitation; cross-border transfer rules |
| Dependencies | Key management, operator trust model, law |
| Specialties | Privacy engineering, cryptography, DPO-class roles |
| Decision | **Build** core protocols; **adapt** per jurisdiction |
| Legal | GDPR-class and local regimes; DPIA where required |
| Assurance | Independent privacy assessment before real production data |
| If omitted | Catastrophic breach / injunction risk |
| Scope | G/S protocols + O custody + J overlays |

### 1.4 Civic discussion, proposals, consultation, delegation, voting — G/J

| Item | Content |
| --- | --- |
| Why | Core political participation substrate |
| Min safe launch | Integrity of records; coercion resistance strategy; auditability; accessibility of channels |
| Dependencies | Identity, security, localization |
| Specialties | Civic tech, election integrity, UX, moderation policy |
| Decision | **Build** reference + **regulate** official uses |
| Legal | Election/consultation law where authoritative |
| Assurance | Integrity review; adversarial testing |
| If omitted | No legitimate collective decision substrate |
| Scope | G reference + J official bindings |

### 1.5 Legislation, policy, implementation tracking, public records — G/J

| Item | Content |
| --- | --- |
| Why | Bridge from decisions to enforceable, traceable public action |
| Min safe launch | Versioned public records; provenance; implementation status fields |
| Dependencies | Governance, identity, archives |
| Specialties | Legislative informatics, records management |
| Decision | **Integrate/adapt** with official gazettes where possible |
| Legal | Official publication rules |
| Assurance | Records integrity audit |
| If omitted | “Governance theater” without administrative reality |
| Scope | Mostly J + S formats |

### 1.6 Agreements, signatures, evidence, dispute resolution — G/J/S

| Item | Content |
| --- | --- |
| Why | Contracts and civic agreements need evidence and remedies |
| Min safe launch | Qualified/advanced signature pathways where claimed; evidence retention; dispute workflow |
| Dependencies | Identity, legal recognition of e-signatures |
| Specialties | Legal tech, notarial/eIDAS-class expertise |
| Decision | **Integrate** QTSP/local + **build** case workflow |
| Legal | eIDAS-class / local evidence law |
| Assurance | Legal + security review |
| If omitted | Unenforceable agreements; user harm |
| Scope | S standards + J recognition + G workflows |

### 1.7 Public services and administrative case management — J/O

| Item | Content |
| --- | --- |
| Why | People encounter the state/institutions as cases, not feeds |
| Min safe launch | For any claimed service: intake, status, SLA, appeal path, non-digital channel |
| Dependencies | Identity, records, support |
| Specialties | Case management, service design |
| Decision | **Adapt** per institution; Civizen supplies patterns/APIs |
| Legal | Administrative procedure law |
| Assurance | Accessibility + process audit |
| If omitted | Platform irrelevant to real administration |
| Scope | J primary |

### 1.8 Payments, accounting, compensation, commerce, procurement — G/J/S

| Item | Content |
| --- | --- |
| Why | Institutions and markets need settlement and procurement integrity |
| Min safe launch | If money moves: licensed rails or clear non-custodial boundaries; accounting SoT; fraud controls |
| Dependencies | Regulation, identity, audit |
| Specialties | Payments, treasury, procurement law |
| Decision | **Integrate** regulated rails; **regulate** Civizen fee/cost-recovery policy |
| Legal | Payments, AML where applicable, procurement codes |
| Assurance | Financial controls audit |
| If omitted | Either no economic layer or illegal operation |
| Scope | G policy + J rails + S interfaces |

### 1.9 Taxation and jurisdictional financial rules — J

| Item | Content |
| --- | --- |
| Why | Real jurisdictions tax; ignoring this breaks institutional adoption |
| Min safe launch | Do not claim tax authority without law; provide hooks for J systems |
| Dependencies | Legal entity model, accounting |
| Specialties | Tax law, public finance |
| Decision | **Regulate/adapt** only under J authority |
| Legal | Tax codes |
| Assurance | Counsel sign-off per jurisdiction |
| If omitted | Institutional non-adoption or illegal claims |
| Scope | J |

### 1.10 Organizations, companies, agencies, authority registries — G/J/S

| Item | Content |
| --- | --- |
| Why | Entities act; authority must be discoverable and revocable |
| Min safe launch | Org registry model; role/authority attestation; revocation |
| Dependencies | Identity, legal entity recognition |
| Specialties | Corporate registries, IAM |
| Decision | **Integrate** official registries + **build** Civizen overlays |
| Legal | Company/agency law |
| Assurance | Integrity of authority claims |
| If omitted | Impersonation and false agency |
| Scope | J authoritative + G federation directory |

### 1.11 Audit, fraud detection, investigations, appeals, remediation — G/J/O

| Item | Content |
| --- | --- |
| Why | Production civic systems are attacked and err |
| Min safe launch | Logging; audit roles with separation of duties; appeal paths; remediation playbooks |
| Dependencies | Security ops, law, governance |
| Specialties | Fraud, investigations, ombuds |
| Decision | **Build** tooling + **staff** functions |
| Legal | Due process, surveillance limits |
| Assurance | Independent audit of auditability |
| If omitted | Silent failure and capture |
| Scope | G/O/J |

### 1.12 AI governance, evaluation, oversight, human review — G/S

| Item | Content |
| --- | --- |
| Why | Civizen already uses AI agents; production scale amplifies harm |
| Min safe launch | Model inventory; evaluation; human-in-the-loop for high-impact acts; incident reporting |
| Dependencies | Security, privacy, product |
| Specialties | AI assurance, ethics, MLOps |
| Decision | **Build** + **regulate** use policies |
| Legal | Emerging AI regulations |
| Assurance | Independent AI evaluation for high-risk uses |
| If omitted | Unaccountable automated civic harm |
| Scope | G/S |

### 1.13 Security, cryptography, resilience, incident response — G/O

| Item | Content |
| --- | --- |
| Why | Non-negotiable for production |
| Min safe launch | SDLC security; key management; IR retainers; tested recovery; recurring pentests |
| Dependencies | Operators, supply chain |
| Specialties | AppSec, crypto, SOC, DR |
| Decision | **Build** + continuous **assurance** |
| Legal | Breach notification regimes |
| Assurance | Independent security review before production; recurring tests |
| If omitted | Invalidates all other investment |
| Scope | G/O |

### 1.14 Accessibility, localization, inclusion, assisted access — G/J

| Item | Content |
| --- | --- |
| Why | Nearly eight billion people are not a single UX cohort |
| Min safe launch | WCAG-class targets for claimed channels; major locale coverage plan; assisted/non-digital access policy |
| Dependencies | Product, support, J partners |
| Specialties | A11y, i18n, social work/assisted access |
| Decision | **Build** + **adapt** locales |
| Legal | Accessibility statutes |
| Assurance | Independent a11y audit before production claims |
| If omitted | Structural exclusion — mission failure |
| Scope | G/J |

### 1.15 APIs, standards, interoperability, third-party applications — S/G

| Item | Content |
| --- | --- |
| Why | Federation and ecosystem require open interfaces |
| Min safe launch | Versioned public APIs; conformance tests; app certification policy |
| Dependencies | Security, governance of ecosystem |
| Specialties | Standards eng, developer relations |
| Decision | **Build** standards + **regulate** certification |
| Legal | Competition, data-portability rules |
| Assurance | Conformance labs |
| If omitted | Monopoly client or brittle silos |
| Scope | S primary |

### 1.16 Deployment, federation, hosting, certification, operations — O/G

| Item | Content |
| --- | --- |
| Why | Initial production needs multi-operator topology |
| Min safe launch | ≥100 qualified independent operators (assumption); certification; monitoring; removal process |
| Dependencies | Security, legal operator agreements |
| Specialties | SRE, federation protocol, compliance |
| Decision | **Build** operator program + **operate** network |
| Legal | Operator contracts, data residency |
| Assurance | Operator audits; resilience exercises |
| If omitted | Single-cloud / single-state failure mode |
| Scope | O/G |

### 1.17 Adoption, education, institutional transition, support — J/G

| Item | Content |
| --- | --- |
| Why | Software without transition is unused infrastructure |
| Min safe launch | Support model; education materials; institutional onboarding playbooks; non-digital assistance path |
| Dependencies | Localization, case management |
| Specialties | Change management, education, support ops |
| Decision | **Staff** heavily in J waves |
| Legal | Public-sector procurement/transition rules |
| Assurance | Service-level reporting |
| If omitted | Empty production |
| Scope | J heavy + G curricula |

### 1.18 Research, legal development, international coordination, treaties — G/S/J

| Item | Content |
| --- | --- |
| Why | Pathway to recognized planetary citizenship is institutional, not only technical (`recognized-planetary-citizenship-pathway.md`) |
| Min safe launch | Research program; counsel capacity; coordination forums — **not** fabricated treaties |
| Dependencies | Diplomacy-compatible governance |
| Specialties | International law, research, diplomacy liaison |
| Decision | **Research + regulate** over decades |
| Legal | Treaty/consent processes of real subjects of international law |
| Assurance | Peer academic/legal review |
| If omitted | Permanent “app pretending to be civilization” |
| Scope | G/S/J long horizon |

---

## 2. Production-launch conditions and maturity ladder

### 2.1 Maturity levels (do not conflate)

| Level | Definition | Authoritative civic power? |
| --- | --- | --- |
| Research demonstrator | Explores ideas; disposable | No |
| Reference implementation | Spec-complete enough to study; not operational truth | No |
| Non-authoritative sandbox | Multi-user experiment; synthetic or consented research data | No |
| Controlled institutional pilot | Bounded real institutions/users; independent reviews passed; exit plan | Limited, contractual |
| **Limited production deployment** | Continuity-safe ops; IR; support; legal basis for claimed functions; multi-operator | Yes, for claimed scope only |
| Federated multi-jurisdiction production | Multiple J authorities live | Yes, per federation rules |
| Worldwide mature ecosystem | Broad population + institutional coverage | Long-term aim — **not** initial launch |

**Initial production** in this framework = at least **limited production deployment** on a **≥100-operator** network for a defined capability set — **not** worldwide mature ecosystem.

### 2.2 Gates before real production use

| Gate | Condition |
| --- | --- |
| G1 Function/integration | Capability map minimums for claimed scope integrated and tested end-to-end |
| G2 Legal/institutional | Clear legal basis; participating entities identified; no overclaim of statehood |
| G3 Independent assurance | Security, privacy, accessibility, and governance reviews complete; critical findings remediated or accepted with recorded residual risk |
| G4 Incident & recovery | Staffed IR; tested backup/restore; DR objectives met in exercises |
| G5 Ops staffing | Follow-the-sun coverage for production-critical paths |
| G6 Financial continuity | Committed runway and reserves per §7 — not hope-based |
| G7 Support & disputes | User support + dispute/appeals paths live, including non-digital assistance policy |
| G8 Inclusion | Protection for people unable to use digital channels for claimed services |
| G9 Migration & exit | Data portability / exit / decommission plans tested |
| G10 Reliability | Published SLOs measured, not aspirational |
| G11 Honesty | Public materials prohibit presenting prototype/pilot as full Civizen |

Work **must not begin** major irreversible production migration until G2, G3, G6 are funded and scheduled — see §7.

---

## 3. Decentralized operating network (≥100 operators)

### 3.1 Initial production assumption

- **≥100 independent, properly operated hosting participants** (organizations with admin staff, not 100 VMs on one cloud).  
- Geographic, jurisdictional, provider, and institutional diversity required.  
- **Not sufficient** for eventual worldwide scale; later expansion mandatory.

### 3.2 Required properties

Geographic/jurisdictional diversity · provider diversity · independent administration · replication/consensus or federation strategy · regional app/data services · encrypted backups · DR · key management/rotation · monitoring/SOC · supply-chain security · independent verification/audit nodes · DNS/cert/IdP/update-authority diversity · partition/geopolitical survival · operator qualification/certification/training/removal · 24/7 support & incident coordination · recurring pentest & resilience exercises.

### 3.3 Per-operator cost model (explicit assumptions)

**Loaded FTE planning rates (global blended):** Low $120k · Base $180k · High $280k per year.

| Config | Staffing assumption | Setup (one-time) | Annual operating |
| --- | --- | ---: | ---: |
| **Low** | ~2–3 FTE; shared SOC; commodity infra; limited compliance | ~$250k | ~$400k |
| **Base** | ~6–8 FTE; regional HA; compliance officer share; trained IR | ~$800k | ~$1.2M |
| **High** | ~15–25 FTE; hardened facility/cloud; dedicated compliance/security | ~$2.5M | ~$3.5M |

### 3.4 100-operator network totals

| | Low | Base | High |
| --- | ---: | ---: | ---: |
| Network setup | **~$25M** | **~$80M** | **~$250M** |
| Network annual OpEx | **~$40M/yr** | **~$120M/yr** | **~$350M/yr** |
| 5-year OpEx (ex setup) | **~$200M** | **~$600M** | **~$1.75B** |
| Operator workforce | ~250 FTE | ~700 FTE | ~1,800 FTE |

Confidence: **Low–medium** until operator RFP/quotes and federation protocol are fixed. These are planning bands, not bids.

---

## 4. Workforce and institutional model (global core)

Essential production labor is **compensated**. Advisers and institutional partners are additional.

### 4.1 Functions

| Function | Separation-of-duty note | 24/7 implication |
| --- | --- | --- |
| Global core stewardship / trusteeship | Independent of day-to-day eng shipping | On-call governance rare but real |
| Technical product & platform | Split prod access vs deploy authority | Follow-the-sun eng/SRE |
| Security & privacy | Independent assurance budget | SOC coverage |
| Governance, law, human rights, public policy | Counsel independence from fundraising narrative | Crisis counsel |
| Financial systems, tax, accounting, regulation | Dual control on funds | Treasury on-call |
| AI assurance & data governance | Eval independent of feature velocity | Model-incident response |
| Accessibility & localization | Not optional “later” | Locale incident support |
| Infrastructure & operations | Distinct from feature teams | Always-on |
| Auditing & independent oversight | External / non-capturable | Audit surge capacity |
| Institutional partnerships & country implementation | Local legitimacy | Regional hours |
| Public engagement, support, education, disputes | Ombuds independence | Support shifts |
| Program, financial, procurement, org management | Controls vs delivery | Business continuity |

### 4.2 Headcount by program stage (global-core concurrent FTE, indicative)

| Stage | Low | Base | High | Notes |
| --- | ---: | ---: | ---: | --- |
| Discovery & constitutional design | 40–80 | 80–120 | 150–200 | Heavy law/policy |
| Research, standards, reference | 80–150 | 150–250 | 250–400 | Multi-year |
| Core platform build (peak) | ~250 | ~600 | ~1,200 | Multi-team |
| Initial production stewardship | ~120 | ~250 | ~500 | After launch |
| Plus 100-operator staff | +~250 | +~700 | +~1,800 | Not fungible with core |
| Eventual contributors/auditors network | hundreds | thousands | thousands+ | Paid bounties/audit retainers — not free |

### 4.3 Illustrative annual cost at peak build (global core only)

| | Low | Base | High |
| --- | ---: | ---: | ---: |
| Peak FTE | 250 | 600 | 1,200 |
| Staff cash/yr | ~$30M | ~$108M | ~$336M |
| With non-staff multiplier ~1.4× (tools, travel, vendors, facilities) | ~$42M/yr | ~$151M/yr | ~$470M/yr |

Recruitment timelines: **2–5 years** to reach base peak without reckless hiring. Independence requirements: security, audit, ombuds, and governance assurance must not report solely through growth/fundraising incentives.

---

## 5. Comparator programs (narrower than Civizen)

**Warning:** Cost-per-user extrapolations to eight billion people are **not responsible**. Comparators show that **even single-domain, single-polity systems** cost hundreds of millions to billions and still omit most of Civizen’s capability map.

| Program | Funding / cost (reported) | Dates | Served | Delivered | Not delivered vs Civizen | Status | Recurring | Relation | Limits of comparison | Sources (accessed 2026-08-10) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EUDI Wallet large-scale pilots | EC **€46M** into 4 pilots; consortia combined **>€90M** (50% EC co-finance); later call **€20M** | 2023– | EU + associates orgs | Identity wallet pilots / use cases | Not global civic OS; not worldwide federation; not full admin/tax/justice | Pilots | n/a in cite | Identity subset only | Pilot ≠ production Civizen | [EC digital-strategy news](https://digital-strategy.ec.europa.eu/en/news/eu-digital-identity-4-projects-launched-test-eudi-wallet); Digital Europe call fiche |
| Aadhaar (UIDAI) | Budgeted expend. on order **₹11,366 crore (~US$1.2B)** through Aug 2019 (secondary compilation); UIDAI ongoing annual budgets hundreds of crore INR | 2009– | ~1.3B+ residents | National digital ID / auth | Not multi-polity federation; not Civizen governance/voting/legislation stack | Production national | Ongoing UIDAI budgets | Identity + auth at population scale in **one** country | Single state; contested governance; different rights model | Wikipedia summary citing budget; [uidai.gov.in](https://uidai.gov.in/) finance pages |
| GOV.UK One Login | Whole-life cost on order **£305–342M** (programme reports); further years funded | ~2021–2028 target | UK central gov services | Sign-in / identity for gov services | Not planetary; not full civic stack | Rolling production | Included in WLC | National IdP-class | One country; login ≠ civilization OS | GOV.UK AO assessment; PublicTechnology/NISTA reporting |
| FedNow | Implementation **US$545M** (Aug 2019–Jul 2023); OpEx ~**US$246M/yr** (2024-class) | 2019– | US depository institutions | Instant payments infrastructure | Payments only; not identity/governance/civic | Live, growing | ~$245M+ /yr | Payments subset | Central-bank context; not civic federation | [federalreserve.gov FedNow FAQ](https://www.federalreserve.gov/paymentsystems/fednow_faq.htm); Federal Register Bank Services |
| Estonia e-governance / X-Road | Public commentary often cites **€50–60M/yr** for digital government ops (small population); national public IT spend much larger in aggregate | 2001– | ~1.3M population | Interoperable digital government | Not 8B-scale; decades of path dependence | Mature national | Tens of M€/yr class (ops narrative) | Interop pattern | Tiny polity; “cheap” ≠ transferable per-capita | e-estonia.com; secondary analyses |
| Linux Foundation / global OSS foundations | Member dues & project budgets typically **tens of M USD/yr** per large foundation (varies by year) | ongoing | Developers/orgs | Standards & shared code | Not civic authority; not population services | Ongoing | Membership-funded | Standards stewardship analogue | Not government-scale assurance | Foundation annual reports (use current year when quoting externally) |

**Normalized caution:** Aadhaar-class ~$1/person *historical program* figures **do not** imply Civizen costs $8B total. Civizen adds multi-jurisdiction law, federation operators, governance legitimacy, and decades of stewardship — categories national ID programs often externalize to the rest of government.

---

## 6. Lifecycle cost model (low / base / high)

Planning assumptions (must be challenged in professional studies):

- Loaded FTE as in §3–4.  
- Global-core non-staff multiplier **1.4×** on staff.  
- Discovery 2–3 years; build 6–12 years; then 5 years stewardship in “global-core lifecycle.”  
- Jurisdiction counts in ecosystem totals are **first-wave** counts, not all ~200 polities.  
- Figures are **ecosystem economics**, not one organization’s budget.

### 6.1 Global-core lifecycle (discovery + build + 5 years stewardship)

| | Low | Base | High |
| --- | ---: | ---: | ---: |
| Staff-driven | ~$0.22B | ~$0.84B | ~$3.5B |
| **With non-staff (×1.4)** | **~$0.3B** | **~$1.2B** | **~$5.0B** |

Includes: constitutional design, research/standards, reference + core platform, assurance programs, global ops leadership, adoption curricula, program management — **excludes** 100-operator OpEx and jurisdiction change programs.

### 6.2 100-operator initial production network

See §3.4 (setup ~$25–250M; annual ~$40–350M).

### 6.3 Typical jurisdiction implementation range (first wave)

| | Low | Base | High |
| --- | ---: | ---: | ---: |
| Per jurisdiction (adaptation, legal, migration, institutional change, local support standup) | **~$5M** | **~$40M** | **~$250M** |

High end reflects large legacy estates, multilingual populations, and deep administrative redesign. Participating-government **institutional** costs often rival or exceed IT — modeled below at **~1.5×** IT/adaptation band for ecosystem totals.

### 6.4 Lifecycle line items (qualitative → mapped to bands)

| Phase | Where cost lands | Notes |
| --- | --- | --- |
| Discovery & constitutional design | Global-core | Must precede irreversible build |
| Research & standards | Global-core + S | Multi-year |
| Reference implementation | Global-core | Not production |
| Independent prototypes & adversarial testing | Global-core + assurance vendors | Continuous |
| Institutional / J pilots | J + global support | Controlled; gated |
| Core platform development | Global-core | Peak workforce |
| 100-operator network | Operators | Setup + annual |
| National/regional adaptations | J | Repeating |
| Data migration & legacy integration | J + institutions | Often dominant locally |
| Legal & regulatory | G + J | Entity unresolved globally |
| Security/privacy/a11y/governance assurance | G + independent | Recurring |
| Launch & adoption | G + J | Education/support |
| Post-launch remediation | G + O + J | Mandatory reserve |
| 5 / 10 years operations | All layers | See §6.5 |

### 6.5 Ecosystem-wide indicative ranges

> **Superseded for planning:** Use `10-five-year-ecosystem-cost-reconciliation-v0.1.md`. Figures below are retained only as the **original preliminary sketch** (the ~$4B five-year base covered ~20 jurisdictions + thin institutional multiplier — see `10` §0).

**Cash** = funded expenditure. **In-kind** = documented institutional staff/time (must be recorded, not assumed infinite).

| Horizon | Low | Base | High |
| --- | ---: | ---: | ---: |
| **5-year ecosystem-wide** (preliminary sketch only) | **~$0.7B** | **~$4B** | **~$30B+** |
| **10-year ecosystem-wide** (preliminary sketch only) | **~$1B** | **~$7B** | **~$60B+** |

**Reconciled five-year bands (authoritative for now):** constrained ~$15–25B · realistic base ~$30–50B (mid ~$35B) · accelerated ~$75–150B+ — see `10`.

Composition (base, 10y, rounded): global-core ~$1.2B · operators ~$1.3B · ~40 jurisdictions × $40M ~$1.6B · institutional ~$2.4B · continuity reserves on core+ops ~$0.6B → **~$7B**.

**Recurring annual (multi-J production, not end-state worldwide):** on the order of **global stewardship ($50–200M+)** + **operator network ($40–350M)** + **sum of live jurisdictions** (highly variable) → easily **$0.2–1B+/year** long before “mature worldwide ecosystem.”

---

## 7. Continuity and failure risk

### 7.1 Failures that can invalidate prior investment

Loss of critical personnel · security breach · legal injunction · failed hosting operator · vendor/cloud concentration · cryptographic compromise · data corruption · incomplete migration · **funding interruption** · institutional withdrawal · geopolitical fragmentation · inability to maintain software or respond to incidents.

### 7.2 Reserves and runway (recommendations)

| Reserve / rule | Recommendation |
| --- | --- |
| Minimum committed runway before major implementation | **≥36 months** peak global-core burn **funded or contractually committed** |
| Contingency by risk class | 10–15% stable eng; **25–40%** legal/security/J integration; higher until entity/federation protocol fixed |
| Security & incident reserve | Low ~$20M · Base ~$75M · High ~$200M (initial capitalization set-aside) |
| Legal reserve | Low ~$15M · Base ~$50M · High ~$150M |
| Infrastructure migration reserve | ≥1 full operator-network re-seed cost band |
| Post-launch operating reserve | ≥18–24 months operator+core OpEx |
| Safe-pause / orderly decommission | Explicit budgeted wind-down (data export, notice, archive) |
| Do-not-start conditions | No G2 legal basis path; no G3 assurance funding; no G6 continuity capital; single-funder control; single-provider hosting plan |

### 7.3 Continuity-safe capitalization (before major irreversible implementation)

| | Low | Base | High |
| --- | ---: | ---: | ---: |
| ~36 months peak burn + security + legal reserves | **~$0.16B** | **~$0.58B** | **~$1.8B** |

This is a **floor to begin serious build**, not the full lifecycle cost. Milestone-based release of funds is compatible with this floor; **uncertainty that critical-path funding will exist at all** is not.

---

## 8. Program funding architecture (suitable responsibilities)

| Source class | Suitable for | Capture risk to mitigate |
| --- | --- | --- |
| Governments | J deployment, public services, legal recognition | Single-state capture of global core |
| Multilateral / international institutions | Standards, cross-border pilots, research | Bureaucracy delay; mandate mismatch |
| Philanthropy / grants | Research, inclusion, assurance, public-interest audits | Trend volatility; agenda steering |
| Private capital | Ecosystem apps, operators (with rules), non-core services | Mission distortion; extractive control |
| Participating legal entities | Cost-recovery fees, certified integrations | Pay-to-play governance |
| Research institutions | Evaluation, adversarial research | Publish-or-pilot mismatch |
| Operator contributions | Network OpEx, certification | Cartelization |
| System-generated cost recovery | Documented processing costs (existing Civizen fee principle for legal entities) | Hidden taxation without law |
| In-kind participation | Documented specialist/institutional time | Fake “free” labor masking underfunding |

**Protection rules:** No single funder, government, company, or infrastructure provider may hold unilateral control of constitutional amendment, root keys, operator admission/removal, or assurance appointment. Diversified capitalization is a **security control**, not only a finance preference.

**Do not invent named commitments.**

---

## 9. Schema implications (report only — do not implement)

Current `project_budgets` / line items assume a **single organizational budget**. Civilization-scale accounting needs at least:

| Cost center | Purpose |
| --- | --- |
| `global_core` | Stewardship, platform, global assurance |
| `operator_network` | Setup/OpEx per operator and aggregate |
| `jurisdiction` | Per-country/territory implementation |
| `institution` | Participating gov/NGO/company transition costs |
| `ecosystem` | Standards, certification, third-party grants |
| `reserves` | Security, legal, migration, decommission |

Likely schema needs: cost-center dimension; multi-entity ownership; in-kind ledger distinct from cash; multi-currency without silent FX; program-stage tags; prohibition flags for publishing prototype totals as program capitalization. **No migration in this pass.**

---

## 10. Evidence gaps requiring professional studies / quotations

1. Federation protocol and operator certification standard (architecture study).  
2. Cryptographic and key-management design review (named cryptographers).  
3. Independent security, privacy, a11y, governance assurance rate cards at program scale.  
4. Jurisdictional legal opinions for first-wave countries (entity + data + elections/admin).  
5. Actuarial/insurance for operator network and core.  
6. Detailed workforce compensation by region (replace blended FTE rates).  
7. Cloud/provider concentration alternatives and true multi-provider DR costs.  
8. Treaty/international-organization pathway legal research (pathway Stage 4+).  
9. Taxation/payments licensing per jurisdiction before any money movement.  
10. Empirical operator RFP responses to replace §3 planning bands.

---

## 11. Largest cost and failure risks

| Rank | Risk |
| --- | --- |
| 1 | **Funding interruption** after partial build (stranded architecture, user harm) |
| 2 | **Underestimating jurisdiction + institutional transition** (IT is the smaller invoice) |
| 3 | **Security/privacy catastrophe** destroying legitimacy |
| 4 | **Single-provider or single-polity capture** of “federation” |
| 5 | **Workforce underfunding** disguised as volunteerism |
| 6 | **Honesty failure** — selling prototypes as production Civizen |

---

## 12. Executive quantitative summary

| Metric | Low | Base | High |
| --- | ---: | ---: | ---: |
| Capability domains mapped | 18 top-level (§1) | same | same |
| Initial production gates | 11 (§2.2) | same | same |
| Global-core peak FTE | ~250 | ~600 | ~1,200 |
| 100-operator FTE | ~250 | ~700 | ~1,800 |
| 100-op setup | ~$25M | ~$80M | ~$250M |
| 100-op annual | ~$40M | ~$120M | ~$350M |
| Global-core lifecycle | ~$0.3B | ~$1.2B | ~$5B |
| Per-jurisdiction first wave | ~$5M | ~$40M | ~$250M |
| Ecosystem 5-year | ~$0.7B | ~$4B *(preliminary; see `10`)* | ~$30B+ |
| Ecosystem 10-year | ~$1B | ~$7B *(preliminary)* | ~$60B+ |
| Continuity-safe capital to start major build | ~$0.16B | ~$0.58B | ~$1.8B |

**Five-year reconciled ecosystem (see `10`):** constrained ~$19B mid · **base ~$35B mid ($30–50B band)** · accelerated ~$105B mid.

These are **framework planning bands** for deliberation and study design — **not** approved budgets, bids, or funder commitments.

---

## 13. Document control

| Field | Value |
| --- | --- |
| Version | 0.1 |
| Date | 2026-08-10 |
| Next | Commission professional studies (§10); choose research vs capitalization path; redesign finance schema (§9) before loading program figures into the app |
| DB write | **None** |
