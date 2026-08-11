---
title: Funding workspace information architecture
status: current
version: 0.1
date: 2026-08-10
related:
  - information-architecture-and-content-standards.md
  - ../../04-operations/funding-and-budget/README.md
canonical: true
---

# Funding workspace information architecture

Applies the universal IA standards to **Settings → Funding** and related public preview. Preservation-first: no shell redesign, no permission/schema changes, no new finance capabilities.

## 1. Inventory (pre-change)

| Surface | Route / entry | Role |
| --- | --- | --- |
| Funding shell | `/settings/admin/funding` | Section host |
| Budget | `?section` absent or `budget` (default) | Project budgets, groups, lines, lifecycle |
| Sources | `?section=sources` | Sources + outreach + commitments + receipts + allocations + fees |
| Interest | `?section=interest` | Funding interest inquiries |
| Legacy ledger/audit/compliance/contributors | `?legacy=1&section=…` | Quarantined experimental tools |
| Deep-link redirects | `/settings/admin/funding-*` | Navigate into sections |
| Public preview | `/fund/project-finance` | Published summary only |

Permissions: `finance.view|edit|approve|publish|admin` (unchanged). Ordinary Budget selection defaults to the validation subprogram; obsolete Draft Budget v0.1 demonstration fixture is retired from the remote app DB and ordinary selector.

## 2. Usability problems → change map

| Problem (evidence) | Change category | Implementation |
| --- | --- | --- |
| No workspace overview — users land in Budget without a map of sections | Local navigation + overview | Add **Overview** section; **Budget remains default** |
| Horizontal tab row risks overflow as sections grow | Responsive correction | Mobile **section picker**; desktop compact tabs for primary sections only |
| Sources stacks outreach/commitments/receipts/allocations/fees in one continuous scroll | Progressive disclosure | Source **work-panel** switcher — one task family visible |
| Category/status show raw codes (`philanthropy`, `due_diligence`) | Label clarification | Human-readable labels; codes remain values |
| Planning docs README is chronological, not task-oriented | Doc index only | Reindex `funding-and-budget/README.md` |
| Long planning figures restated without authority | Canonical sources (docs) | Source-of-truth map below |

### Explicitly **not** implemented (needs owner approval)

| Idea | Why deferred |
| --- | --- |
| Split Sources into separate top-level routes for each workflow | Broader routing/workflow change |
| Global Settings sidebar redesign | Shared navigation |
| Rebuild directory-attestation admin page | Out of Funding pass; audit only (+ tiny local copy fix) |
| Load civilization-scale figures into app budget | Schema/product decision; DB must stay demo-zero |

## 3. Page map (target)

| Section | URL | Purpose | Level |
| --- | --- | --- | --- |
| **Budget (default)** | `/settings/admin/funding` | Manage draft/approved budgets (nested expense groups) | 2–5 |
| Program plan | `?section=program-plan` | Read-only validation + five-year summaries (generated artifact) | 1–2 |
| Economics | `?section=economics` | Read-only commercial economics scenarios (projected revenue, pools, illustrative returns) — **not** an offer; **not** public | 1–2 |
| Overview | `?section=overview` | Orient + route to primary sections | 1 |
| Sources | `?section=sources` | Funding sources and related money events | 2–5 |
| Interest | `?section=interest` | Outreach interest inbox | 2–3 |
| Legacy | `?legacy=1&…` | Historical scaffolding — finance admin overflow only | quarantine |
| Public preview | `/fund/project-finance` | Published budget summary only — **no Program plan / Economics** | public |

Overview does **not** duplicate Budget/Sources tables. It summarizes and routes.  
**Budget ≠ Program plan:** Program plan is the five-year first-wave pathway (~$30–50B range, ~$37.5B working base). Budget holds detailed operational/subprogram ledgers (validation ~$446M base is the currently detailed first subprogram). Do not present validation as Civizen’s complete implementation budget. Do not insert $37.5B as one ordinary ledger row until multi-entity / multi-year schema exists (see § schema note below).

### Budget admin presentation

Compact selected-budget header: dropdown selector (ordinary non-demonstration budgets only; default = validation subprogram), status badges, totals strip, one primary lifecycle action, overflow menu for CSV / New budget / secondary actions. Validation selection shows: `Subprogram budget · Pre-major-build validation · 18–24 months`, pathway line, and **View five-year program plan**. Creation forms stay closed until requested. Expense hierarchy follows immediately under the header. Consequential workflow actions use a confirm dialog with reason. Legacy capital-ledger tools stay behind `?legacy=1` and the advanced menu for `finance.admin`.

### Budget nested presentation

Wide panels (≥720px usable width): hierarchical table with aligned Period / Planned / Committed / Actual / Public columns; expandable group parent rows and indented child rows. Group Period shows the combined child month range (or Multiple periods / TBD).  
Narrow panels: stacked expandable group cards without horizontal overflow.  
Validation budget (`Civizen Pre-Major-Build Validation Program v0.1`) shows classification + duration badge (`18–24 months`) in the metadata row. No Period selector until canonical periodized amounts exist (timing-only month windows would misrepresent finances). Period column still shows workstream month ranges; group rows aggregate child ranges. Obsolete Draft Budget v0.1 demonstration skeleton is retired from ordinary use (structure retained in test/local-dev fixtures only).  
Optional “All line items” flat view remains for admin.

### Program plan periods

Primary heading: **Five-year first-wave implementation plan**. Default summary: planning range, working base, ecosystem-wide status, Years 1–5 cash flow, funding responsibility, major components, not-worldwide / multi-party statement, and validation subprogram (~$446M) linked to Budget. Planning period selector: Five-year total (default) or Year 1–5 from canonical `annualBaseCashflowUsdB`. Long-range 10y/20y stay behind advanced disclosure.

### Future five-year master ledger (not implemented)

An approvable five-year master program budget in the finance schema would eventually need, at minimum:

- multi-entity responsibility (core vs independent vs operators vs governments/institutions vs consortia);
- Year 1–5 (and optional tranche) dimensions without double-counting;
- cost centers / program components and jurisdiction or institution tags;
- scenario layers (low/base/high) separate from committed/actual;
- reserves and ecosystem-vs-core-controlled partitions;
- consolidation rules that prevent summing overlapping scopes into a false single-org total;
- explicit link from master plan lines to detailed subprogram budgets (e.g. validation).

Until that exists, keep the master model read-only in Program plan and detailed amounts in Budget subprograms.

## 4. Canonical sources (planning vs app)

| Fact | Canonical source | Status class |
| --- | --- | --- |
| Five-year first-wave ecosystem estimate | `11-program-financial-model-and-funding-responsibility-v0.1.md` (+ CSV) | preliminary ecosystem hypothesis |
| Long-range Y6–20 scenarios | `13-ten-and-twenty-year-program-cost-framework-v0.1.md` (+ CSV) | low-confidence lifecycle scenarios — **not budgets** |
| Pre-major-build validation estimate | `14-pre-major-build-validation-program-v0.1.md` (+ workstreams CSV) | working estimate |
| In-app Program plan summaries | `program-plan-summary-v0.1.json` (generated) | read-only UI artifact |
| System inventory | `12-comprehensive-system-inventory-v0.1.md` (+ CSV) | hypothesis pending validation |
| Funding responsibilities (model) | `11` | hypothesis |
| Transaction-fee **product** policy | `01-decisions-and-scope.md` | decision |
| Application finance implementation status | App + `05-implementation-note-v1.md` | operational |
| Live budget/source **amounts** | Application finance records | actuals / drafts in DB — currently demonstration zeros |
| Rolling-planning cadence | `17` §6 | owner policy |

Other docs must **reference** these rather than inventing divergent figures. Regenerate Program plan with `scripts/generate-program-plan-summary.py`.

## 5. Large-model UI patterns (future Funding views)

When inventory/cost models appear in-product: domain summary → filters → paginated list → system detail. Never dump 467 rows or full 20-year cashflow on the Overview.

## 6. Terminology

| Internal | User-facing |
| --- | --- |
| `philanthropy` etc. | Philanthropy / Government / … |
| `due_diligence` | Due diligence |
| `J` / `II` (planning docs) | Jurisdiction / Institution |
| `P-INDEP-ASSURE` | Independent assurance (code in metadata) |
| `is_demonstration` | Demonstration data |
