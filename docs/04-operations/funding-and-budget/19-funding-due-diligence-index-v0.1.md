---
title: Funding Due Diligence Index v0.1
status: index
version: 0.1
date: 2026-08-10
audience: owner-and-serious-inquirers
currency: USD
related:
  - 16-external-funding-brief-v0.1.md
  - 17-funding-readiness-memorandum-v0.1.md
  - 14-pre-major-build-validation-program-v0.1.md
  - program-plan-summary-v0.1.json
canonical: false
---

# Funding due diligence index v0.1

**Purpose:** Map what a serious funder or institutional partner should expect to review, where materials live, and what is **missing**.  
**Honesty rule:** Gaps are listed explicitly. Do not pretend completeness.

**Planning hierarchy:** detailed **Months 1–24** validation plan → **Years 1–5** first-wave plan → Years 6–10 strategic outlook → Years 11–20+ directional scenarios. Rolling cadence lives only in `17` §6.

---

## 1. Document map (Civizen-controlled)

| Topic | Primary artifact | Status |
| --- | --- | --- |
| External brief | `16-external-funding-brief-v0.1.md` | Controlled sharing after clarity review |
| Internal readiness / decisions / rolling policy | `17-funding-readiness-memorandum-v0.1.md` | Provisional D1–D11; D6 unresolved |
| Inquiry language | `18-funder-inquiry-faq-and-response-kit-v0.1.md` | Ready for steward use |
| Validation program & envelope | `14-pre-major-build-validation-program-v0.1.md` + CSV | Working estimate |
| Independent panels / studies | `15-independent-review-and-domain-study-briefs-v0.1.md` | Design; chairs not seated |
| 5y first-wave model | `11-program-financial-model-and-funding-responsibility-v0.1.md` + CSV | Preliminary ecosystem hypothesis |
| System inventory | `12-comprehensive-system-inventory-v0.1.md` + CSV | Hypothesis (~467) |
| Long-range scenarios (Y6–20) | `13-ten-and-twenty-year-program-cost-framework-v0.1.md` + CSV | Low-confidence lifecycle scenarios — **not budgets** |
| App Program plan summary | `program-plan-summary-v0.1.json` (+ generated TS) | Read-only UI artifact |
| Capability gates | `09` / `10` | Planning |
| Scope / decisions | `01-decisions-and-scope.md` | Active |
| Pathway (mission / legal posture) | `docs/00-foundation/recognized-planetary-citizenship-pathway.md` | Canonical foundation |
| Strategy roadmap | `docs/01-governance/funding-and-monetary/funding-readiness-roadmap.md` | Strategy |
| App Draft Budget | Funding admin / DB | **Retired** from ordinary selector (was zeros, draft, unapproved, unpublished); validation subprogram is default |

---

## 2. Diligence checklist — present vs gap

| # | Diligence item | Present? | Notes |
| --- | --- | --- | --- |
| 1 | Clear problem / mission statement | Partial | Pathway + briefs |
| 2 | Immediate use of funds | Yes | `14` workstreams; `16` §3 |
| 3 | Budget scenarios (L/B/H) | Yes (estimate) | Validation working estimate |
| 4 | Five-year ecosystem totals | Hypothesis only | `11` — must be labeled |
| 5 | Long-range scenario figures | Diligence-only | `13` — advanced disclosure; not intro brief |
| 6 | Core vs ecosystem split | Yes (model) | `14` / `11` |
| 7 | Tranche / gate logic | Yes (proposed) | `16`/`17`; not executed instruments |
| 8 | Legal receiving entity | **Gap** | Counsel + owner D6 |
| 9 | Tax / grant eligibility determination | **Gap** | Jurisdiction-dependent |
| 10 | Audited financial statements (program scale) | **Gap** | N/A at this stage |
| 11 | Bank / escrow / ring-fence for independent review | **Gap** | Required by D7 |
| 12 | Conflict-of-interest / anti-capture policy | Partial | Mandatory D11; formal instruments pending |
| 13 | Independent panel chairs seated | **Gap** | `15` briefs only |
| 14 | Vendor quotations hardening unit costs | **Gap** | Method in `14` |
| 15 | Insurance for demos / cyber / liability | **Gap** | Before live demos |
| 16 | Data protection / privacy DPIA for demos | Partial | Principles; formal DPIAs pending |
| 17 | IP / open licensing stance for validation outputs | Partial | Needs owner policy memo |
| 18 | Governance / board / stewardship chart | Partial | Institutional formation is part of ask |
| 19 | Key-person / succession | **Gap** | |
| 20 | Political / recognition risk disclosure | Partial | Pathway honest; counsel review for packs |
| 21 | Prospect pipeline / CRM with real leads | Research OK | Ledger ≠ interest/commitment (D5) |
| 22 | In-app approved published budget | No (correct) | Demo zeros; Phase Timing TBD |
| 23 | Continuity package term sheets (~$2–4B) | **Gap** | Premature until V-G gates |
| 24 | Jurisdiction MoUs / letters of intent | **Gap** | Consultation workstream |
| 25 | Monitoring, evaluation, learning (MEL) plan | Partial | Gate reports V-G*; formal MEL TBD |
| 26 | Wind-down / safe-pause playbook | Partial | Reserve concept in `14`; legal playbook gap |

---

## 3. Priority gap closure order (recommended)

1. **D6** receiving entity + acceptance controls (blocks real capital).  
2. Independent-review escrow / administration (**D7**) and CoI controls (**D11**).  
3. Seat interim panel chairs before marketing independence claims.  
4. Procure cost-validation quotations for top validation line items.  
5. Expand prospect research under approved categories without implying commitment.  
6. Before operationalizing the app Budget: **replace or formally remap** the demonstration Phase 1–3 skeleton (Timing TBD) — it is not Months 1–24 / Years 1–5.

---

## 4. What funders should **not** be given as “facts”

- That five-year or long-range scenario dollar totals are audited, committed, or single-org budgets  
- That the Draft Budget in-app equals the validation ask  
- That demonstration Phase 1–3 labels are scheduled periods or map to Program plan horizons  
- That planetary citizenship or statehood is recognized  
- That production continuity capital is already gated-complete  
- Named funder commitments or prospect scores invented by agents  

---

## 5. Versioning

When any of `11`–`15` bands change methodologically, regenerate `program-plan-summary-v0.1.json` via `scripts/generate-program-plan-summary.py`, bump this index’s date, and note the delta in `README.md`. Keep epistemic labels synchronized with `16` and `17`.
