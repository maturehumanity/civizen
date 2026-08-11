---
title: Civizen Budget Realism and Scope Audit v0.1
status: audit
version: 0.1
date: 2026-08-10
currency: USD
related:
  - 06-initial-working-budget-v0.1.md
  - 07-budget-estimate-scenarios-v0.1.md
canonical: true
---

# Budget realism and scope audit v0.1

**Purpose:** Critically test whether the estimate proposal in `07-budget-estimate-scenarios-v0.1.md` can honestly deliver the outcomes assigned to each phase.  
**Stance:** Do not defend those estimates. Challenge scope, labor, calendar, and annual operating claims.  
**Program-funding status:** **Superseded for civilization-scale / production capitalization** by `09-civilization-scale-program-requirements-and-cost-framework-v0.1.md`. Cases A/B/C remain useful only for **bootstrap / prototype** honesty — not for funding claims that Civizen as a civilization-scale program has been capitalized.  
**Application:** Database amounts remain **zero**. Budget stays `draft`, `is_demonstration=true`, unpublished. No funding records created.  
**Currency:** USD.  
**Owner provisional decisions applied:** 15% contingency retained for comparison; phase durations provisional; founder time kept as in-kind; independent security and privacy review **required before any real-user pilot**; pilot = limited/controlled only; insurance = `quote required`; entity type/jurisdiction unresolved.

Document `07` is preserved as the first estimate proposal. This audit does not replace it.

---

## Verdict (read this first)

| Claim in `07` base | Honest assessment |
| --- | --- |
| ~$226k cash + ~$174k in-kind delivers Phase 1–3 outcomes as labeled | **No.** Labels overclaim relative to funded labor and gates. |
| Phase 2 (~$91k cash incl. contingency) = meaningful hardening **and** independently reviewed real-user pilot | **No.** Especially once independent review is a **pre-pilot** gate (owner direction). Review was budgeted in Phase 3; remediation after findings is largely missing; pilot legal/insurance/support underfunded. |
| Phase 3 (~$78k) = “production readiness and institutional integration” | **No.** That phrase implies reliability, support, compliance, and integration capacity the budget does not buy. At best: **organizational / counsel-readiness sketch**. |
| Annual ops ~$13k = responsible run cost after delivery | **Only** for dormant or lightly maintained prototype. **Not** for controlled pilot or small production. |
| Base scenario is structurally sound with ~44% in-kind | **Structurally dependent** on founder/unpaid delivery. Delivery fails if in-kind capacity is unavailable. |

**Recommended outcome:** **Revise both deliverables and estimates.** Keep `07` figures for comparison. Adopt named planning cases in §8 (not the over-broad Phase 2/3 labels).

---

## 1. Maturity ladder (forced distinctions)

Use these terms consistently. Do **not** call something “production ready” or “institution-ready” unless the budget funds the matching row.

| Level | Meaning | Typical evidence |
| --- | --- | --- |
| **Working prototype** | Software runs for builders/demo; known gaps OK | Repo + deployed demo; founder operate |
| **Internal alpha** | Trusted testers only; no public real-user reliance | Invite list; synthetic or consented staff data |
| **Controlled pilot** | Bounded real users, written scope, exit criteria, support path, **independent security & privacy review passed**, remediation closed or accepted | Pilot charter; review report; DPA/consent; insurance posture; on-call |
| **Production-capable platform** | Defined SLOs, backup/restore tested, monitoring/alerting, vulnerability process, support hours, change control | Runbooks; incident process; env separation; capacity plan |
| **Institution-ready integration** | Receiving entity exists; counsel-approved intake controls; reporting; due-diligence pack; integration interfaces or APIs as claimed | Entity docs; policies staffed; audit trail; named counterparties possible |
| **Economy- / government-scale infrastructure** | Multi-jurisdiction, high availability, regulated identity/payments at scale | Explicitly **out of scope** for all v0.1 planning cases |

Civizen’s long-term pathway vision may aim higher. These budgets do **not** purchase that end state.

---

## 2. Concrete phase exit criteria (what `07` implies vs what cash buys)

Phase durations in `07` (6 / 6 / 6 months) remain **provisional**.

### Phase 1 — Foundation and working prototype (~$44k cash incl. cont. in `07` base)

| | |
| --- | --- |
| **Can exist at completion (if founder capacity holds)** | Maintained working prototype; continued feature/docs work; inquiry-only funding surfaces; basic staging hygiene |
| **Will not exist** | Controlled pilot; independent security/privacy attestation; institution-ready receiving posture; production SLOs |
| **Honest maturity label** | Working prototype → possible internal alpha |
| **Gap vs label** | Label is roughly fair **if** in-kind engineering continues. Cash alone (~0.25 FTE contractor) cannot carry the platform. |

### Phase 2 — Security hardening and limited pilot (~$91k cash incl. cont.)

| | |
| --- | --- |
| **`07` implied** | Hardening + limited pilot with measurable success |
| **Owner gate** | Independent security **and** privacy review **before** any real-user pilot |
| **Budgeted in `07`** | Hardening $12k; design/a11y $8.8k; pilot facilitation $8k; research $5k; eng $45k; **independent review $12k sits in Phase 3** |
| **Missing or thin** | Pre-pilot independent review **in this phase**; post-review remediation (often comparable to review cost); pilot legal (consent/DPA/ToS); insurance; pilot support/on-call; privacy program work beyond a one-line compliance prep in P3; accessibility depth for real users |
| **Honest maturity if cash limit kept** | Hardening **toward** pilot readiness; internal alpha; **not** a completed independently reviewed real-user pilot |
| **Rename recommendation** | “Hardening and pilot preparation” — **not** “limited pilot complete” |

### Phase 3 — Production readiness and institutional integration (~$78k cash incl. cont.)

| | |
| --- | --- |
| **`07` label** | Production readiness + institutional integration |
| **Budgeted** | Eng $37.5k; security review $12k; legal $8k; accounting $2.5k; compliance prep $5k; outreach $3k |
| **Cannot honestly mean** | Production-capable platform (SLOs, SRE, 24×7 or defined support, restore drills); institution-ready integration (entity resolved, staffed compliance, due diligence pack, integration contracts) |
| **Might mean with luck** | Counsel engagement started; books sketched; policies outlined; selective conversations; some remediations if review was deferred here (but that conflicts with pre-pilot gate) |
| **Rename recommendation** | “Organizational and compliance preparation” or “Counsel-ready sketch” |

### Ongoing annual (~$13k cash incl. cont.)

| | |
| --- | --- |
| **Honest meaning** | Hosting + light tooling + thin monitoring + **founder-operated** maintenance |
| **Not** | Controlled-pilot operations; small production; recurring independent assessment; insured institutional posture |

---

## 3. Scope, labor, and calendar reconciliation

Assumptions carried from `07` for critique: senior eng $125/hr base; 160 hrs = 1.0 FTE-month.

### 3.1 Phase 1 (`07` base)

| Role | Cash effort (approx.) | In-kind / unpaid | Notes |
| --- | ---: | --- | --- |
| Platform engineering | 240 hrs (~0.25 FTE avg over 6 mo) | 360 hrs (~0.38 FTE) | Split delivery |
| QA / release | ~30 hrs cash + in-kind | Yes | Thin vs full regression/release ownership |
| Docs / messaging | $3k cash | ~$6k in-kind | Mostly founder |
| Env/staging | $1.5k | In-kind setup | |
| Design/a11y | — | Informal only | No dedicated Phase 1 cash |
| Security/privacy | — | Ad hoc | Not a funded program |
| Legal/governance | — | — | Deferred |
| PM | — | Embedded in founder eng/ops | No dedicated PM cash |
| **Total eng-like FTE** | **~0.25 cash + ~0.4 in-kind** | | One person-ish, overloaded |

**If cash limit retained, remove/defer:** new major product lanes; formal a11y audit; anything resembling pilot prep beyond docs.

**Schedule risks:** single-threaded founder; CI/prod incidents consume the tiny cash contractor buffer.

### 3.2 Phase 2 (`07` base) — critical failure point

| Role | Cash in `07` | Realistic need for controlled pilot w/ pre-pilot review | Gap |
| --- | ---: | --- | --- |
| Engineering (pilot readiness + fixes) | ~360 hrs | ~500–900 hrs | Large |
| Hardening | $12k | $20–40k | Material |
| Independent sec **and** privacy review | $0 in P2 ($12k in P3) | $20–40k **quote required** | **Gate misplaced** |
| Remediation after review | ~0 explicit | $20–40k eng | **Missing** |
| Accessibility | $8.8k | $12–25k for real-user pilot surfaces | Thin |
| Pilot facilitation | $8k | $15–30k | Thin |
| Pilot legal / privacy docs | ~0 (P3 compliance $5k later) | $10–25k **quote required** | Missing |
| Insurance | 0 | **Quote required** | Missing |
| Pilot support / on-call | 0 | $10–20k over pilot window | Missing |
| PM | 0 | 0.2–0.4 FTE | Missing |

**Overlapping / impossible assumptions:** The same ~0.4 FTE cash engineer cannot simultaneously ship pilot features, execute hardening, remediate review findings, and support a live pilot. Founder in-kind (~0.25 FTE) does not close that gap.

**If ~$91k cash retained, deliverables to cut:** real-user pilot; independent review completion; research partnership cash; deep a11y. Keep: hardening sprint, internal alpha, pilot *charter* only.

**Dependencies that extend calendar:** review vendor lead time; remediation cycles; partner IRB/ethics if research; entity/insurance before real users (even limited).

### 3.3 Phase 3 (`07` base)

| Role | Cash | Reality check |
| --- | ---: | --- |
| Engineering | ~300 hrs | Enough for incremental product work — **not** production SRE program |
| Independent review | $12k | Conflicts with “review before pilot” if pilot was claimed in P2; amount is also low for sec **and** privacy |
| Legal entity + counsel | $8k | Unresolved entity/jurisdiction → **quote required**; nonprofit / multi-country can exceed high band |
| Accounting | $2.5k | Setup only |
| Compliance prep | $5k | Outline, not staffed program |
| Institutional outreach | $3k | Materials/travel, not “integration” |
| Support, audit, insurance, HA | Absent | Required for production/institution claims |

**If cash retained, rename outcomes** (see §2). Do not claim production-capable or institution-ready integration.

### 3.4 Cross-cutting under-representation

| Area | In `07` base | Audit finding |
| --- | --- | --- |
| Testing / QA | Small Phase 1 spike | Not sustained; eng estimates do not explicitly reserve regression, release, and incident time |
| Maintenance / tech management | Implicit in eng hours | No explicit allocation; optimism bias |
| Documentation | Thin Phase 1 | Runbooks/support docs for pilot underfunded |
| Deployment / env separation | $1.5k bootstrap | Insufficient for production-capable claim |
| Incident response | ~$0 cash annual | Founder-only |
| Privacy program | Buried in P3 $5k | Inadequate for real-user pilot gate |
| Accessibility | One Phase 2 line | May be OK for alpha; thin for pilot |
| Governance / support | Ops $6k/yr | Admin, not user support desk |
| Audit (recurring) | One-time review only | No annual reassessment in ops |
| Insurance | Excluded | Now **must** be quote-required line |

---

## 4. Annual operating model (four deployment levels)

Do **not** present prototype maintenance as mature platform OpEx.

| Cost category | 1. Dormant demo/prototype | 2. Maintained public prototype | 3. Controlled pilot | 4. Small production deployment |
| --- | ---: | ---: | ---: | ---: |
| Maintenance engineering | $0–3k (founder) | $8–20k | $40–80k | $100–180k |
| Security updates / vuln response | Ad hoc | $2–6k | $10–25k | $25–50k |
| Infra, storage, monitoring, backups, recovery | $0.5–1.5k | $1–3k | $3–8k | $8–25k |
| AI / third-party | $0–0.5k | $0.5–2k | $2–8k | $5–20k |
| User / pilot support | $0 | $1–3k | $10–25k | $30–60k |
| A11y / privacy maintenance | $0 | $1–3k | $5–12k | $10–25k |
| Accounting, legal, insurance, admin | $0.5–1k | $2–5k | $8–20k | $20–50k |
| Independent audits / assessments | $0 | $0–5k (optional) | $10–25k (cadence) | $20–50k |
| Incident response reserve | $0 | $1–3k | $5–15k | $15–40k |
| Comms / institutional engagement | $0–1k | $1–3k | $3–10k | $10–30k |
| **Indicative annual cash (ex large contingency)** | **~$3–8k** | **~$15–40k** | **~$90–200k** | **~$250–500k** |
| Confidence | Medium | Medium | Low–medium | Low (scope-dependent) |

**Mapping `07` ~$13k annual:** Aligns with **level 1–low level 2** only, and only with heavy founder in-kind. It is **not** the operating cost of controlled pilot or small production.

Insurance: include as **`quote required`** in levels 2–4; do not invent premiums.

---

## 5. In-kind dependency

### 5.1 Scenario metrics (from `07`)

| Scenario | Cash req. | In-kind | Economic | In-kind % of economic | Structurally dependent? |
| --- | ---: | ---: | ---: | ---: | --- |
| Low | ~$53k | ~$192k | ~$245k | **~78%** | **Yes — severe** |
| Base | ~$226k | ~$174k | ~$400k | **~44%** | **Yes** |
| High | ~$789k | ~$82k | ~$872k | **~9%** | Reduced; still founder-shaped |

### 5.2 Founder / unpaid load (base, eng lines alone)

| Phase | In-kind eng hrs | Avg hrs/week over 6 mo | Cash-equivalent at $125/hr |
| --- | ---: | ---: | ---: |
| Phase 1 | 360 | ~15 | $45,000 |
| Phase 2 | 240 | ~10 | $30,000 |
| Phase 3 | 180 | ~7.5 | $22,500 |
| Annual ops coordination (valued) | ~288 hrs/yr | ~5.5 | $36,000 |

Plus docs, env, security monitoring DIY, pilot help — real founder load is **higher** than eng-only.

### 5.3 Roles with no funded backup (base)

Lead engineering, production incident response, release ownership, security monitoring, pilot support, institutional storytelling, much of PM — **founder-only**.

### 5.4 If in-kind unavailable

- Low scenario: delivery largely stops.  
- Base: Phase 1 slips; Phase 2 pilot becomes impossible; Phase 3 becomes document-only.  
- High: still damaged but cash contractors can substitute more roles.

**Flag:** `07` low and base are **structurally dependent on in-kind labor**.

---

## 6. Contingency review

Uniform **15%** is a useful comparison constant. It is **not** sufficient as a risk model for quote-heavy work.

| Category | Suggested contingency | Rationale |
| --- | ---: | --- |
| High-confidence list-price infra (hosting DNS floors) | 10% | Published prices; tier still uncertain |
| Personnel (known rate × hours) | 15–20% | Scope creep, incidents |
| Usage-based AI | 25% | Traffic unknown |
| Security review, remediation, privacy | 25–35% | Quote + findings-driven |
| Legal / entity / compliance | 30%+ | Entity unresolved |
| Pilot facilitation / research partners | 25–30% | Partner unknown |
| Insurance | n/a until quote | Quote required |

### Comparison on `07` base eligible cash ($196,650)

| Method | Contingency | Cash required (same scope) |
| --- | ---: | ---: |
| Uniform 15% (current) | $29,498 | **$226,148** |
| Risk-adjusted (illustrative mix §register) | ~$38,200 | **~$234,850** |

**Interpretation:** Raising contingency a few points does **not** fix the realism problem. The dominant issue is **under-scoped deliverables and missing cost classes** (remediation, pre-pilot review placement, insurance, support, production OpEx)—not a 15% vs 20% debate.

For external use of any revised case, prefer **risk-adjusted contingency** and show uniform 15% alongside for comparison.

---

## 7. What ~$226k cash can realistically buy

Honest package for approximately **$200–250k cash** (plus substantial founder in-kind):

**Included (credible):**
- 12–18 months founder-led prototype continuity with part-time contractor help  
- Documentation and inquiry-only funding surfaces  
- One hardening sprint and improved test/release hygiene  
- Accessibility pass at “serious prototype” depth (not institutional certification)  
- Legal/accounting *exploration* budget  
- Dormant or maintained-public-prototype annual ops for a year  

**Not included (not credible at this cash without stripping something else):**
- Independently reviewed **real-user** controlled pilot with remediation closed  
- Production-capable platform  
- Institution-ready integration / staffed compliance  
- Insured institutional receiving posture  
- Recurring audit program  
- Annual ops of controlled pilot or small production  

**Choice forced by ~$226k:** either **narrow outcomes** to founder-led prototype (+ prep), or **increase cash** toward the funded controlled-pilot case.

---

## 8. Revised planning cases (replace overclaiming phase narrative)

Retain `07` low/base/high for comparison. Prefer these **named planning cases** for decision-making. They are **not** promises that Civizen’s complete global vision fits inside them.

### Case A — Founder-led prototype

| Field | Value |
| --- | --- |
| Phase duration | 9–12 months (provisional) |
| Cash requirement | **$50,000 – $90,000** (incl. ~15% cont.) |
| In-kind / deferred | **$150,000 – $220,000** |
| Total economic | **~$200,000 – $300,000** |
| Staff effort | ~0.5–0.8 combined FTE (mostly founder) + light contractor spikes |
| Contingency | 15% comparison; 10–20% risk-adjusted by line |
| Annual OpEx after | **Level 1–2:** ~$5,000 – $30,000 |
| Included outcomes | Working / public prototype; docs; inquiry funding surfaces; optional internal alpha |
| Explicit exclusions | Real-user pilot; independent review gate; production-capable claims; institution-ready integration; economy-scale |
| Confidence | Medium for prototype continuity; high that it does **not** buy a pilot |
| Relation to `07` | Closest to **narrowed** low/base without pilot completion |

### Case B — Funded controlled pilot

| Field | Value |
| --- | --- |
| Phase duration | 9–15 months after prototype baseline (provisional) |
| Cash requirement | **$300,000 – $450,000** for the pilot program proper; **$400,000 – $600,000** if overlapping foundation continuity is included |
| In-kind / deferred | **$40,000 – $120,000** (reduced structural dependence) |
| Total economic | **~$400,000 – $700,000** |
| Staff effort | ~1.0–1.5 FTE eng-equivalent + specialist packages (sec, a11y, legal, PM) |
| Contingency | Uniform 15% for comparison; **25–30%** on security/legal/pilot quotes; show both |
| Annual OpEx after | **Level 3:** ~$90,000 – $200,000 |
| Included outcomes | Hardening; **independent security and privacy review before real users**; remediation budget; limited controlled pilot; insurance **quote**; pilot support; a11y of pilot surfaces; pilot legal docs |
| Explicit exclusions | Government-scale; multi-jurisdiction production; full institutional integration; payment rails; economy-scale identity |
| Confidence | Low–medium until quotes land |
| Relation to `07` | **Increases estimates** and **narrows/clarifies** Phase 2 meaning |

### Case C — Institution-ready foundation

| Field | Value |
| --- | --- |
| Phase duration | 12–24 months (provisional); entity choice is on critical path |
| Cash requirement | **$700,000 – $1,200,000** (planning range; not a bid) |
| In-kind / deferred | **$50,000 – $150,000** |
| Total economic | **~$800,000 – $1,350,000** |
| Staff effort | ~2–3 FTE-equivalent over the period + counsel/compliance specialists |
| Contingency | 15% comparison; **30%+** on legal/compliance/integration until entity resolved |
| Annual OpEx after | **Level 4 small production:** ~$250,000 – $500,000 (not “Civizen complete”) |
| Included outcomes | Production-**capable** small deployment; receiving-entity path with counsel; reporting basics; due-diligence pack; selective institutional engagement; recurring assessment cadence |
| Explicit exclusions | Economy-/government-scale infrastructure; global identity authority; guaranteed institutional adoption |
| Confidence | Low until entity/jurisdiction and quotes fixed |
| Relation to `07` | Replaces “Phase 3 production readiness and institutional integration” rhetoric |

---

## 9. Phase rename / rescale guidance

| Old label (`06`/`07`) | Recommended planning meaning | Credible cash band (indicative) |
| --- | --- | --- |
| Phase 1 foundation / working prototype | Keep; align to **Case A** core | $40–90k (+ in-kind) |
| Phase 2 security hardening and limited pilot | Split: (i) hardening & prep; (ii) **Case B** controlled pilot only when funded | Prep $80–150k; full pilot program $300–450k+ |
| Phase 3 production readiness and institutional integration | Rename to **organizational/compliance preparation**; full **Case C** only when funded | Sketch $60–120k; foundation $700k–1.2M |
| Annual ~$13k | Rename to **prototype maintenance** | Levels in §4 |

---

## 10. Quotes required before external use

Do not present the following as firm figures to funders without vendor/professional quotes:

1. Independent **security** review (scope: web, API, auth, cloud config)  
2. Independent **privacy** review / DPIA-style assessment  
3. Cyber / liability **insurance**  
4. Legal entity formation and counsel (entity type + jurisdiction open)  
5. Pilot-specific legal (consent, DPA, cross-border)  
6. Any live compliance vendor (explicitly deferred, but if mentioned)  
7. Recurring audit / attestation products if claimed in Case C  

List-price infra (Supabase, Cloudflare, GitHub, reference VPS, OpenAI rates) may be cited as **public list prices** with access dates — still confirm Civizen’s actual billed tiers.

---

## 11. Five owner decisions that most move the budget

1. **Which planning case is the near-term target?** (A vs B vs C) — dominates cash by 5–10×.  
2. **Real-user pilot timing vs independent review gate** — forces review+remediation into the pilot critical path.  
3. **Founder hour commitment (hrs/week × months)** — determines whether Case A is feasible or collapses.  
4. **Entity type and jurisdiction** — swings legal/compliance from low four figures to mid/high five or six.  
5. **Post-delivery deployment level** (prototype vs pilot vs small production) — sets honest annual OpEx for funders.

---

## 12. Required conclusions (answers)

### 1. What can realistically be delivered for approximately $226,000 cash?

A **founder-dependent prototype continuity program** with hardening and preparation toward a future pilot — **or** a severely cut pilot attempt that fails the independent-review-before-real-users gate. It cannot honestly purchase independently reviewed controlled pilot **plus** production readiness **plus** institutional integration **plus** responsible pilot/production OpEx.

### 2. What should Phase 2 and Phase 3 be renamed or rescaled to mean?

- **Phase 2:** “Hardening and pilot preparation,” unless funded as **Case B — Funded controlled pilot**.  
- **Phase 3:** “Organizational and compliance preparation,” unless funded as **Case C — Institution-ready foundation**.  
Drop unqualified “production ready” and “institutional integration” until Case C-level funding and entity resolution exist.

### 3. What funding range is more credible for a controlled pilot?

**About $300,000–$450,000 cash** for the pilot program (review, remediation, limited pilot, insurance quote, support, legal docs), or **$400,000–$600,000** including overlapping foundation continuity. Plus annual **Level 3** OpEx afterward.

### 4. What funding range is more credible for an institution-ready foundation?

**About $700,000–$1,200,000 cash** (planning range), contingent on entity/jurisdiction quotes — explicitly **not** economy- or government-scale. Plus annual **Level 4** OpEx.

### 5. What annual operating range should funders expect at each deployment level?

| Level | Annual cash (indicative) |
| --- | ---: |
| Dormant demonstration/prototype | ~$3,000 – $8,000 |
| Maintained public prototype | ~$15,000 – $40,000 |
| Controlled pilot | ~$90,000 – $200,000 |
| Small production deployment | ~$250,000 – $500,000 |

`07`’s ~$13k matches only the low end of prototype maintenance.

### 6. Which five owner decisions most materially affect the budget?

See §11 (planning case; pilot vs review gate; founder hours; entity/jurisdiction; deployment level / OpEx).

### 7. Which estimates require vendor or professional quotes before external use?

See §10 (security, privacy, insurance, entity counsel, pilot legal, optional compliance/audit products).

---

## 13. Recommendation summary

| Question | Recommendation |
| --- | --- |
| Keep `07` estimates, narrow deliverables? | Acceptable **only** if marketing and phase labels are rewritten to Case A. |
| Keep deliverables, raise estimates? | Required for Case B / Case C outcomes. |
| **Preferred** | **Revise both:** adopt Cases A/B/C; preserve `07` as historical first proposal; do not write amounts into the app until the owner picks a case. |
| Contingency | Keep 15% for comparison; use risk-adjusted rates for decision-grade totals; contingency alone will not rescue under-scoped phases. |
| App / DB | **No changes** this pass. |

---

## 14. Validation / non-goals

- Did not update `project_budgets` planned/committed/actual amounts.  
- Did not approve or publish.  
- Did not create prospects, commitments, receipts, or allocations.  
- Did not replace `07-budget-estimate-scenarios-v0.1.md`.  
- Did not claim Civizen’s full planetary pathway is fundable inside Cases A–C.

---

## 15. Document control

| Field | Value |
| --- | --- |
| Audit version | 0.1 |
| Date | 2026-08-10 |
| Inputs | `06`, `07`, owner provisional decisions in the audit prompt |
| Next step | Owner selects Case A, B, or C (or hybrid) before any application amount write |
