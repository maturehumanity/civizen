---
title: Civizen Budget Estimate Scenarios v0.1
status: proposal
version: 0.1
date: 2026-08-10
currency: USD
related: 06-initial-working-budget-v0.1.md
canonical: true
---

# Civizen Draft Budget v0.1 — Estimate Scenarios (Proposal)

**Status:** Internal estimate proposal for owner review — **not** an approved budget, **not** published, **not** written into application amounts.  
**Program-funding status:** **Superseded for civilization-scale / production capitalization** by `09-civilization-scale-program-requirements-and-cost-framework-v0.1.md`. Preserve as historical prototype-sized proposal only; do not use ~$53k–$789k bands to fund or describe delivery of Civizen’s intended outcome.  
**Currency:** USD (confirmed planning currency).  
**Application:** `Civizen Draft Budget v0.1` remains `draft`, `is_demonstration=true`, planned/committed/actual = **0**.  
**Scenarios:** Low · Base (recommended) · High.  
**Contingency:** 15% of eligible uncertain cash costs (all cash lines except contingency itself). Contingency is **not** applied to itself and is **not** applied to in-kind value.

This document does **not** imply that any estimate is committed, received, or funded.

---

## 1. Executive summary

Civizen’s Draft Budget v0.1 structure (9 groups, 22 lines) is retained with light recommendations. Repository evidence still contains **no invoices or payroll**. Estimates below combine:

- official public vendor list prices (Supabase, Cloudflare, GitHub, DigitalOcean as a VPS **reference**, OpenAI API);
- market benchmarks for contractor rates, security reviews, and legal/accounting packages;
- documented project facts (founder-led stage, stack vendors, Phase 1–3 outcomes, open receiving-entity questions);
- explicit planning assumptions (6-month phase durations, usage levels, founder hour capacity).

| Scenario | Cash required (incl. 15% contingency) | In-kind / deferred contribution (valued) | Total economic resource |
| --- | ---: | ---: | ---: |
| **Low** | **~$53,000** | **~$192,000** | **~$245,000** |
| **Base (recommended)** | **~$226,000** | **~$174,000** | **~$400,000** |
| **High** | **~$789,000** | **~$82,000** | **~$872,000** |

Figures rounded to nearest $1,000 for summary; detailed tables use planning dollars that reconcile. Horizon = Phase 1 + Phase 2 + Phase 3 (6 months each, planning assumption) **plus one year** of ongoing annual operations. Annual operating costs are counted **once** under Annual — not duplicated inside Phases 1–3.

**Recommended base scenario** assumes continued founder delivery (shown as in-kind), part-time contractor engineering, Pro-tier managed database + modest VPS-class hosting, a limited pilot, mid-market security review, and counsel-led entity/compliance preparation — without selecting a financing model or claiming funds exist.

---

## 2. Line-structure review (retain / change)

| # | Line | Recommendation |
| --- | --- | --- |
| 1–3 | Core platform engineering (P1–P3) | **Retain** — primary cost driver; keep phase split. |
| 4 | Automated test and release quality | **Retain** — keep visible; do not silently fold into engineering. |
| 5 | UX/UI and accessibility review | **Retain** on Phase 2; optional light Phase 1 polish stays in-kind under docs/eng. |
| 6–8 | Security hardening / independent review / monitoring | **Retain**; independent review stays Phase 3 (`quote required`). |
| 9–11 | Hosting+DB / DNS+CI / AI API (annual) | **Retain** as annual-only (avoids double-counting). |
| 12 | Environment bootstrap | **Retain** Phase 1 one-time. |
| 13–15 | Legal / accounting / compliance prep | **Retain** Phase 3; entity type still open. |
| 16–17 | Pilot / research partnership | **Retain** Phase 2; research may slip into Phase 3 if partner timing slips. |
| 18–19 | Ops coordination / admin tooling (annual) | **Retain**. |
| 20–21 | Docs messaging / institutional outreach | **Retain**; outreach is Phase 2–3 work booked in Phase 3 bucket. |
| 22 | Contingency | **Retain** as separate reserve; map scenario contingency total here when amounts are later approved. |

**Not added as new seeded lines (owner decision):** cyber/D&O insurance (~$500–$3,000/yr market range); mobile store fees; payment-rail costs (explicitly excluded).

**Deferred / out of scope here:** live KYC/AML provider fees, FX, tokens, investment distributions, tax automation, broad marketing campaigns.

---

## 3. Planning periods (definitions)

| Phase | Planning duration (assumption) | Expected outcome (not funded) |
| --- | --- | --- |
| **Phase 1 — Foundation and working prototype** | 6 months | Credible continuity of the working platform, finance/governance docs, inquiry-only funding surfaces |
| **Phase 2 — Security hardening and limited pilot** | 6 months | Hardening + one scoped pilot with measurable success criteria |
| **Phase 3 — Production readiness and institutional integration** | 6 months | Counsel-ready receiving posture, reporting readiness, selective institutional conversations |
| **Ongoing annual operations** | 12 months (steady-state) | Hosting, tooling, light coordination, monitoring, contingency continuity |

Phase lengths are **planning assumptions**, not a roadmap commitment in funding-readiness docs (those stages are readiness-ordered, not calendar-dated).

---

## 4. Staffing model (roles, not named people)

Economic rate basis for valuing in-kind senior engineering: **$125/hr** (base market). Cash contractor rates: **$90 / $125 / $175 per hour** (low/base/high). Design/a11y: **$75 / $110 / $150**. Security specialist engagements often priced as packages (`quote required`).

### Role A — Lead / platform engineer

| Field | Content |
| --- | --- |
| Purpose / deliverables | Core product, infra continuity, CI/`verify:ci`, production fixes, finance workspace continuity |
| Phase | P1–P3 (and light annual ops via Role E) |
| Engagement | Contractor and/or founder; not assumed employee |
| Quantity | See engineering lines (hrs/mo × 6 mo) |
| Market-rate basis | US remote senior full-stack contractor benchmarks (assumption) |
| Cash L/B/H | See eng P1–P3 lines |
| In-kind | Founder hours valued at $125/hr — **not** included in cash required |
| Unpaid note | Low scenario is mostly in-kind; still shown as economic cost |

### Role B — QA / release quality specialist

| Field | Content |
| --- | --- |
| Purpose | Strengthen Vitest/CI/release gates beyond day-to-day eng |
| Phase | Phase 1 (spike); maintenance thereafter in eng |
| Engagement | Specialist contractor hours |
| Quantity | ~10 / 30 / 80 cash hours (L/B/H) plus founder in-kind |
| Rate | Absorbed into line totals at ~$100–$150/hr equivalent |

### Role C — Design / accessibility specialist

| Field | Content |
| --- | --- |
| Purpose | UX polish + accessibility review of public/member surfaces |
| Phase | Phase 2 |
| Engagement | Specialist contractor |
| Quantity | ~40 / 80 / 160 hours |
| Cash L/B/H | $3,000 / $8,800 / $24,000 |

### Role D — Security specialist / review firm

| Field | Content |
| --- | --- |
| Purpose | Hardening sprint (P2); independent review (P3); optional monitoring (annual) |
| Phase | P2, P3, Annual |
| Engagement | Contractor / firm (`quote required` for independent review) |
| Cash | Hardening $4k–$30k; Review $5k–$30k; Monitoring $0–$12k/yr |

### Role E — Project coordination / administration

| Field | Content |
| --- | --- |
| Purpose | Scheduling, admin, vendor coordination, funding-readiness hygiene |
| Phase | Annual (and embedded in phases via founder time) |
| Engagement | Founder in-kind; cash part-time ops in base/high |
| Cash L/B/H (annual) | $0 / $6,000 / $36,000 |
| In-kind L/B/H | $24,000 / $36,000 / $18,000 |

### Role F — Legal counsel

| Field | Content |
| --- | --- |
| Purpose | Receiving-entity advice, formation, funding-class controls |
| Phase | Phase 3 |
| Engagement | Counsel package (`quote required`; entity type open) |
| Cash L/B/H | $1,500 / $8,000 / $25,000 |

### Role G — Accounting / bookkeeping setup

| Field | Content |
| --- | --- |
| Purpose | Books readiness distinct from software ledger |
| Phase | Phase 3 |
| Engagement | Accountant / bookkeeper setup |
| Cash L/B/H | $500 / $2,500 / $8,000 |

### Role H — Communications / documentation

| Field | Content |
| --- | --- |
| Purpose | Public docs, messaging clarity, selective outreach materials |
| Phase | P1 docs; P3 outreach |
| Engagement | Mostly founder in-kind; contractor in base/high |
| Cash | Docs $0–$12k; Outreach $500–$15k |

**Employee assumption:** none. All cash personnel modeled as contractors/specialists unless owner later chooses employment (would raise burden rates — sensitivity).

---

## 5. Vendor and infrastructure assumptions

Access date for public list prices: **2026-08-10**. Civizen’s actual billed tiers are **unknown** in-repo; DigitalOcean is a **reference** for VPS-class pricing, not a claim that Civizen uses DigitalOcean.

| Cost | Low | Base | High | Unit / calc | Source |
| --- | ---: | ---: | ---: | --- | --- |
| Managed DB/auth (Supabase) | $0 (Free) | $25/mo Pro (1 Micro project) | $35/mo (2 Micro) to $599/mo Team | Org subscription + compute credit model | https://supabase.com/pricing |
| App host (VPS-class reference) | $12/mo (2 GiB) | $24/mo (4 GiB) + ~$5 backups | $48–$96/mo | Droplet list prices | https://www.digitalocean.com/pricing/droplets |
| Combined hosting+DB annual line | $480 | $900 | $3,600 | Rounded planning | Derived |
| Cloudflare | Free $0 | Free $0 | Pro ~$20/mo annual billing | Per domain | https://www.cloudflare.com/plans/ |
| GitHub | Free | Team ~$4/user/mo × 2 seats | Team × 5 + Actions buffer | Seat + Actions minutes | https://github.com/pricing |
| Domain | ~$15–20/yr | ~$20/yr | ~$20–40/yr | Typical gTLD | Registrar market |
| DNS/edge/CI annual line | $50 | $250 | $1,400 | Bundle | Derived |
| OpenAI API (reference model) | gpt-4o-mini ~$0.15 / $0.60 per 1M in/out | Usage buffer | Higher models / volume | Token pricing | https://developers.openai.com/api/docs/pricing |
| AI annual line | $240 ($20/mo) | $1,200 ($100/mo) | $6,000 ($500/mo) | Usage assumption | Derived + official rates |
| Web app pentest / review | $5,000 | $12,000 | $30,000 | Market range | Industry 2026 guides (see register) — **quote required** |
| Entity + counsel | $1,500 | $8,000 | $25,000 | Package range | Market — **quote required**; jurisdiction open |

---

## 6. Contingency calculation

**Policy (initial):** Contingency = **15% × (sum of all cash line estimates except contingency)**.

- Not applied to in-kind / deferred contribution value.  
- Not applied to itself.  
- Allocated across phases in proportion to each phase’s cash subtotal for reporting; when later written to the app, total contingency maps to the single Contingency line unless owner prefers phase split.

| Scenario | Eligible cash | Contingency (15%) | Cash required |
| --- | ---: | ---: | ---: |
| Low | $45,670 | $6,850 | $52,520 |
| Base | $196,650 | $29,498 | $226,148 |
| High | $686,400 | $102,960 | $789,360 |

---

## 7. Phase totals (reconciled)

### 7.1 Cash by phase (before contingency)

| Phase | Low | Base | High |
| --- | ---: | ---: | ---: |
| Phase 1 | $6,600 | $38,500 | $155,000 |
| Phase 2 | $18,800 | $78,800 | $246,000 |
| Phase 3 | $19,300 | $68,000 | $224,000 |
| Annual ops | $970 | $11,350 | $61,400 |
| **Subtotal cash** | **$45,670** | **$196,650** | **$686,400** |
| Contingency 15% | $6,850 | $29,498 | $102,960 |
| **Cash required** | **$52,520** | **$226,148** | **$789,360** |

### 7.2 Phase detail (base scenario)

| Phase | Phase cash (ex-cont.) | In-kind | Contingency (15% of phase cash) | Cash required | Economic (cash+kind+cont) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Phase 1 | $38,500 | $60,000 | $5,775 | $44,275 | $104,275 |
| Phase 2 | $78,800 | $48,000 | $11,820 | $90,620 | $138,620 |
| Phase 3 | $68,000 | $27,500 | $10,200 | $78,200 | $105,700 |
| Annual | $11,350 | $38,400 | $1,703 | $13,053 | $51,453 |
| **Sum** | **$196,650** | **$173,900** | **$29,498** | **$226,148** | **$400,048** |

Composition notes (base, ex-contingency): Phase 1 ≈ eng $30k + QA $4k + docs $3k + env $1.5k; Phase 2 ≈ eng $45k + design $8.8k + hardening $12k + pilot $8k + research $5k; Phase 3 ≈ eng $37.5k + security review $12k + legal $8k + accounting $2.5k + compliance $5k + outreach $3k; Annual ≈ ops $6.6k + security monitor $2.4k + hosting/DNS/AI $2.35k. Line-level table (§8) is authoritative.

**Checks:** Phase cash columns sum to scenario subtotals; `low ≤ base ≤ high` for cash required; annual infra not added again into P1–P3; contingency excluded from eligible base when computing the 15%.

### 7.3 In-kind / deferred contribution value

| Phase | Low | Base | High |
| --- | ---: | ---: | ---: |
| Phase 1 | $71,000 | $60,000 | $21,000 |
| Phase 2 | $61,000 | $48,000 | $24,000 |
| Phase 3 | $34,000 | $27,500 | $18,000 |
| Annual | $26,400 | $38,400 | $19,200 |
| **Total in-kind** | **$192,400** | **$173,900** | **$82,200** |

In-kind is **excluded** from cash required. It is an economic resource estimate for transparency when founders/contributors work without cash compensation.

### 7.4 Ongoing annual operating range (cash)

| | Low | Base | High |
| --- | ---: | ---: | ---: |
| Annual lines only | $970 | $11,350 | $61,400 |
| + 15% contingency on annual | ~$1,120 | ~$13,100 | ~$70,600 |

---

## 8. Line-item estimate table

Cash USD. Committed/actual remain **$0** in the application. Confidence: L / M / H. Behavior: one-time · recurring · usage-based · personnel · quote required.

| Line | Phase | Cash L | Cash B | Cash H | In-kind B | Conf. | Basis | Behavior | Key quantity / risk |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| Core platform engineering (P1) | P1 | 5,400 | 30,000 | 126,000 | 45,000 | M | market | personnel | 10/40/120 cash hrs/mo × 6; founder capacity risk |
| Automated test & release quality | P1 | 1,000 | 4,000 | 12,000 | 6,000 | M | market | one-time | Specialist hours; CI flakiness |
| Public documentation & messaging | P1 | 0 | 3,000 | 12,000 | 6,000 | M | assumption | personnel | Founder bandwidth |
| Environment bootstrap & staging | P1 | 200 | 1,500 | 5,000 | 3,000 | M | assumption | one-time | 2nd env / Supabase project |
| Core platform engineering (P2) | P2 | 10,800 | 45,000 | 147,000 | 30,000 | M | market | personnel | 20/60/140 hrs/mo × 6 |
| UX/UI & accessibility review | P2 | 3,000 | 8,800 | 24,000 | 2,000 | M | market | personnel | 40/80/160 hrs |
| Security hardening sprint | P2 | 4,000 | 12,000 | 30,000 | 4,000 | M | market | quote req. | Scope creep before pilot |
| Limited pilot facilitation | P2 | 1,000 | 8,000 | 25,000 | 4,000 | L | assumption | one-time | Partner unknown |
| Evaluation & research support | P2 | 0 | 5,000 | 20,000 | 8,000 | L | assumption | personnel | MoU unknown |
| Core platform engineering (P3) | P3 | 10,800 | 37,500 | 126,000 | 22,500 | M | market | personnel | 20/50/120 hrs/mo × 6 |
| Independent security/privacy review | P3 | 5,000 | 12,000 | 30,000 | 0 | L | market | quote req. | App+API depth |
| Legal entity & counsel | P3 | 1,500 | 8,000 | 25,000 | 0 | L | market | quote req. | Entity type open |
| Accounting setup | P3 | 500 | 2,500 | 8,000 | 0 | M | market | quote req. | Complexity |
| Compliance preparation | P3 | 1,000 | 5,000 | 20,000 | 2,000 | L | assumption | quote req. | Live providers excluded |
| Targeted institutional outreach | P3 | 500 | 3,000 | 15,000 | 3,000 | L | assumption | one-time | Travel/events |
| Hosting & database (annual) | Ann | 480 | 900 | 3,600 | 0 | M | official+derived | recurring | Actual VPS/Supabase tier unknown |
| DNS, edge, CI (annual) | Ann | 50 | 250 | 1,400 | 0 | M | official+derived | recurring | Seat count / CF tier |
| AI API usage (annual) | Ann | 240 | 1,200 | 6,000 | 0 | L | official+usage | usage-based | Agent traffic unknown |
| Security monitoring (annual) | Ann | 0 | 2,400 | 12,000 | 2,400 | L | assumption | recurring | Retainer vs DIY |
| Project coordination (annual) | Ann | 0 | 6,000 | 36,000 | 36,000 | M | market | personnel | Founder load |
| Admin tooling (annual) | Ann | 200 | 600 | 2,400 | 0 | M | assumption | recurring | SaaS stack |
| Contingency (15%) | Reserve | 6,850 | 29,498 | 102,960 | 0 | M | policy | reserve | Underestimation risk |

**Line cash subtotals (ex-contingency):** Low $45,670 · Base $196,650 · High $686,400.  
**With contingency:** Low $52,520 · Base $226,148 · High $789,360.

---

## 9. Cash versus in-kind (base)

| Category | Cash (base) | In-kind (base) |
| --- | ---: | ---: |
| Product & engineering (P1–P3 + QA) | $116,500 | $103,500 |
| Design & accessibility | $8,800 | $2,000 |
| Security (all) | $26,400 | $6,400 |
| Infrastructure & tools | $3,850 | $3,000 |
| Legal / governance / compliance | $15,500 | $2,000 |
| Research & pilots | $13,000 | $12,000 |
| Operations | $6,600 | $36,000 |
| Partnerships & communications | $6,000 | $9,000 |
| Contingency | $29,498 | $0 |
| **Total** | **$226,148** | **$173,900** |

---

## 10. Sensitivity and major cost drivers

### Five largest base cash drivers (ex-contingency)

1. Core platform engineering Phase 2 — **$45,000**  
2. Core platform engineering Phase 3 — **$37,500**  
3. Core platform engineering Phase 1 — **$30,000**  
4. Contingency (policy) — **~$29,500**  
5. Security hardening + independent review (combined) — **$24,000**

### What moves the total most

| Driver | Effect |
| --- | --- |
| Founder delivers vs contractor replaces | Swaps cash ↔ in-kind; low vs high eng lines dominate |
| Phase length 4 vs 9 months | Near-linear scale on personnel |
| Entity = simple LLC vs multi-jurisdiction nonprofit | Legal/compliance can jump into high band |
| Independent review depth (web-only vs web+API+mobile+cloud) | $5k → $30k+ |
| AI agent traffic | Annual AI line $240 → $6,000+ |
| Pilot ambition | $1k logistics vs $25k facilitated study |

### Weakest assumptions

1. **6-month phase durations** — not fixed in roadmap docs.  
2. **Founder available hours** — in-kind collapses if capacity is lower.  
3. **Receiving-entity form and jurisdiction** — open legal question.  
4. **Actual current vendor bills** — tiers unknown in public repo.  
5. **AI usage** — no published spend history.  
6. **Pilot partner and scope** — none locked.  
7. **US remote contractor rate band** — geography may differ.

---

## 11. Evidence and source register

| ID | Source | Used for | Accessed |
| --- | --- | --- | --- |
| S1 | `docs/04-operations/funding-and-budget/06-initial-working-budget-v0.1.md` | Structure, phases, exclusions | 2026-08-10 |
| S2 | `docs/01-governance/funding-and-monetary/funding-readiness-roadmap.md` | Readiness stages, pilot language | 2026-08-10 |
| S3 | `docs/01-governance/funding-and-monetary/open-legal-questions.md` | Entity / counsel uncertainty | 2026-08-10 |
| S4 | `docs/04-operations/dev/ENVIRONMENT_LIFECYCLE.md` | Dev/Test/Live; Supabase SoT | 2026-08-10 |
| S5 | `docs/04-operations/dev/solutions-council.md` | AI providers | 2026-08-10 |
| S6 | https://supabase.com/pricing | Supabase Free/Pro/Team | 2026-08-10 |
| S7 | https://www.digitalocean.com/pricing/droplets | VPS-class reference | 2026-08-10 |
| S8 | https://www.cloudflare.com/plans/ | CF Free/Pro | 2026-08-10 |
| S9 | https://github.com/pricing | GitHub Free/Team | 2026-08-10 |
| S10 | https://developers.openai.com/api/docs/pricing | Token rates | 2026-08-10 |
| S11 | Industry pentest cost guides 2026 (e.g. startupdefense / secureleap summaries) | Security review range | 2026-08-10 |
| S12 | Delaware/LLC formation market summaries | Legal package floor | 2026-08-10 |

**Documented project fact:** working production app + finance workspace exist; founder-led; no financing model selected.  
**Placeholder / assumption:** phase months, hours, usage.  
**Quote required:** independent security review; counsel package once entity strategy chosen; any live compliance vendor.

---

## 12. Exclusions

- Payment rails, custody, refunds, chargebacks  
- Live KYC/AML provider subscription fees  
- Taxation / government reporting automation  
- FX automation  
- Tokens, investment distributions, contributor-return logic  
- Broad paid marketing / country-activation programs beyond a limited pilot  
- Mobile store developer fees (unless owner adds)  
- Insurance premiums (recommended future line; not in 22-line seed)  
- Any representation that estimates are funded or approved  

---

## 13. Decisions still required from the project owner

1. Accept **base** as working planning scenario, or choose low/high / custom mix.  
2. Confirm **6-month** phase durations (or supply calendar).  
3. Confirm **founder hours** available (validates in-kind).  
4. Confirm **actual** current monthly spend (VPS, Supabase, Cloudflare, AI, domain).  
5. Choose **entity direction** enough to size legal (or keep quote-required band).  
6. Confirm whether **independent security review** is required before any pilot go-live.  
7. Confirm **pilot** ambition and whether research support is cash or in-kind university.  
8. Confirm **contingency 15%** policy (or 10%/20%/fixed).  
9. Confirm whether to add **insurance** line before app update.  
10. After approval of numbers: authorize writing **base planned** amounts into the draft (still `is_demonstration=true`, still unpublished) — **not done in this pass**.

---

## 14. Proposed public-facing group-level summary (draft only — not published)

> Civizen is planning a multi-phase project budget in US dollars. Under the current base planning scenario, cash needs are on the order of the mid-six figures across foundation work, a limited pilot and hardening period, production-readiness preparation, and one year of operations, plus a separate contingency reserve. A substantial share of early delivery is expected to continue as founder and contributor effort, recorded separately from cash requirements. Figures are planning estimates only — not commitments, receipts, or an approved public financial statement. Detailed line items and vendor assumptions remain internal until an approved budget is explicitly published.

(Do not publish internal rates, contacts, or security findings.)

---

## 15. Mapping: approved base → existing 22 app lines (DO NOT EXECUTE)

If the owner later approves the **base** scenario for draft planned amounts only:

| App line title | Proposed `planned_minor` (USD × 100) | Notes |
| --- | ---: | --- |
| Core platform engineering (Phase 1) | 3,000,000 | $30,000 |
| Automated test and release quality capacity | 400,000 | $4,000 |
| Public documentation and messaging capacity | 300,000 | $3,000 |
| Environment bootstrap and staging capacity | 150,000 | $1,500 |
| Core platform engineering (Phase 2) | 4,500,000 | $45,000 |
| UX/UI and accessibility review (Phase 1–2) | 880,000 | $8,800 |
| Security hardening sprint | 1,200,000 | $12,000 |
| Limited pilot facilitation (Phase 2) | 800,000 | $8,000 |
| Evaluation and research partnership support | 500,000 | $5,000 |
| Core platform engineering (Phase 3) | 3,750,000 | $37,500 |
| Independent security / privacy review | 1,200,000 | $12,000 |
| Legal entity and counsel engagement | 800,000 | $8,000 |
| Accounting setup and bookkeeping readiness | 250,000 | $2,500 |
| Compliance preparation (KYC/AML outline readiness) | 500,000 | $5,000 |
| Targeted institutional outreach (Phase 2–3) | 300,000 | $3,000 |
| Application hosting and database (annual) | 90,000 | $900 |
| DNS, edge, and CI tooling (annual) | 25,000 | $250 |
| AI model/API usage for in-app agents | 120,000 | $1,200 |
| Ongoing security monitoring and incident readiness | 240,000 | $2,400 |
| Project coordination and administration (annual) | 600,000 | $6,000 |
| Administrative tooling and productivity software (annual) | 60,000 | $600 |
| Planning contingency reserve | 2,949,800 | $29,498 (15%) |

**Sum planned:** $226,148 → **22,614,800** minor units.  
**Committed / actual:** remain **0**.  
**Lifecycle:** stay `draft`. **`is_demonstration`:** stay `true` until owner clears.  
**Do not approve or publish** as part of applying this mapping.  
**In-kind** does not write into planned cash fields (track in notes or a future non-cash field if added).

---

## 16. Validation checklist

| Check | Result |
| --- | --- |
| Phase and group subtotals reconcile to line sum | Yes (§7–§8) |
| Contingency not applied to itself | Yes |
| Recurring annual not duplicated into P1–P3 | Yes (annual-only infra lines) |
| Low ≤ base ≤ high for cash required | Yes |
| Single currency USD, no silent FX | Yes |
| In-kind excluded from cash required | Yes |
| Committed/actual remain zero in DB | Confirmed 2026-08-10 (amount_sum = 0) |
| Draft unpublished | Confirmed (`published_at` null) |
| Material estimates sourced or marked assumption/quote | Yes (§8, §11) |
| No prospects/commitments/receipts/allocations created | Yes |

---

## 17. Document control

| Field | Value |
| --- | --- |
| Proposal version | 0.1 |
| Date | 2026-08-10 |
| Next step | Owner review → optional approve base mapping → then a separate change to set planned amounts only |
| DB write in this pass | **None** |
