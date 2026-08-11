# Funding and budget — navigation index

Index only. Substantive content lives in the linked documents.  
**Epistemic rule:** Multi-year dollar totals and the system inventory are **hypotheses** until validation says otherwise. Ordinary Budget selection centers `Civizen Pre-Major-Build Validation Program v0.1`; obsolete Draft Budget v0.1 demonstration fixture is retired from the remote app DB.

Standards: [`../../03-platform/product-design/information-architecture-and-content-standards.md`](../../03-platform/product-design/information-architecture-and-content-standards.md) · Funding map: [`../../03-platform/product-design/funding-workspace-information-architecture.md`](../../03-platform/product-design/funding-workspace-information-architecture.md).

## 1. Start here

| Document | Purpose | Status | Reader | Role |
| --- | --- | --- | --- | --- |
| [`01-decisions-and-scope.md`](./01-decisions-and-scope.md) | Product decisions for the finance workspace (budget, sources, fees) | current | builders, owners | current |
| [`16-external-funding-brief-v0.1.md`](./16-external-funding-brief-v0.1.md) | **Inquiry-ready** external funding brief (validation-first ask) | inquiry pack | external, partners | **primary external brief** |
| [`14-external-concept-summary-v0.1.md`](./14-external-concept-summary-v0.1.md) | Short external concept of pre-major-build validation | concept | external, partners | supporting (lighter than `16`) |
| [`05-implementation-note-v1.md`](./05-implementation-note-v1.md) | What shipped in the app finance workspace | current | builders | current |

## 1b. Funding inquiry-readiness package (before further app UI)

| Document | Purpose | Status | Reader | Role |
| --- | --- | --- | --- | --- |
| [`16-external-funding-brief-v0.1.md`](./16-external-funding-brief-v0.1.md) | Concise external brief: ask, levels, core vs ecosystem, tranches | inquiry pack | funders, partners | external |
| [`17-funding-readiness-memorandum-v0.1.md`](./17-funding-readiness-memorandum-v0.1.md) | Owner memo: hierarchy, rolling policy, provisional D1–D11 | inquiry pack | owner, stewards | internal |
| [`18-funder-inquiry-faq-and-response-kit-v0.1.md`](./18-funder-inquiry-faq-and-response-kit-v0.1.md) | Safe FAQ + phrases for inquiry replies | inquiry pack | stewards | response kit |
| [`19-funding-due-diligence-index-v0.1.md`](./19-funding-due-diligence-index-v0.1.md) | Diligence map + explicit gaps | inquiry pack | owner, serious inquirers | index |

**Immediate ask (canonical `14`):** ~$202M / **~$446M** / ~$898M (Months 1–24 validation). Five-year (`11`) is primary program hypothesis. Years 6–20 (`13`) are long-range scenarios only. In-app: Settings → Funding → **Program plan** (read-only generated summary).

## 2. Current planning baseline

| Document | Purpose | Status | Reader | Role |
| --- | --- | --- | --- | --- |
| [`09-civilization-scale-program-requirements-and-cost-framework-v0.1.md`](./09-civilization-scale-program-requirements-and-cost-framework-v0.1.md) | Capability map and production launch gates | current (gates); dollars → see `11`/`14` | planners | current |
| [`10-five-year-ecosystem-cost-reconciliation-v0.1.md`](./10-five-year-ecosystem-cost-reconciliation-v0.1.md) | Why thin ~$4B sketches undercount; reconciliation narrative | supporting | planners | supporting → details in `11` |

## 3. Current financial models

| Document | Purpose | Status | Reader | Role |
| --- | --- | --- | --- | --- |
| [`11-program-financial-model-and-funding-responsibility-v0.1.md`](./11-program-financial-model-and-funding-responsibility-v0.1.md) | **Canonical** five-year first-wave model (~$37.5B base hypothesis) | hypothesis | planners, finance | **canonical** for 5y first wave |
| [`13-ten-and-twenty-year-program-cost-framework-v0.1.md`](./13-ten-and-twenty-year-program-cost-framework-v0.1.md) | Long-range **lifecycle scenarios** (Y6–20) — not budgets | low-confidence scenario | planners | **canonical** for long-range scenarios |
| [`12-comprehensive-system-inventory-v0.1.md`](./12-comprehensive-system-inventory-v0.1.md) | **Canonical** system inventory (467 entries) | hypothesis | architects, domain leads | **canonical** for inventory |
| [`program-plan-summary-v0.1.json`](./program-plan-summary-v0.1.json) | Generated app-readable Program plan summary | working artifact | builders, UI | generated from `11`/`13`/`14` metas |

## 4. Validation and review program

| Document | Purpose | Status | Reader | Role |
| --- | --- | --- | --- | --- |
| [`14-pre-major-build-validation-program-v0.1.md`](./14-pre-major-build-validation-program-v0.1.md) | **Canonical** 18–24 mo validation program & budget | working estimate | owners, funders | **canonical** for pre-major-build cash |
| [`15-independent-review-and-domain-study-briefs-v0.1.md`](./15-independent-review-and-domain-study-briefs-v0.1.md) | Panel ToRs and domain study briefs | briefs | commissioners | current |

## 5. Implementation specifications

| Document | Purpose | Status | Reader | Role |
| --- | --- | --- | --- | --- |
| [`02-agent-implementation-prompt.md`](./02-agent-implementation-prompt.md) | Agent prompt for workspace build | historical/supporting | agents | supporting |
| [`03-budget-module-spec.md`](./03-budget-module-spec.md) | Budget module requirements | current | builders | current |
| [`04-funding-source-ledger-spec.md`](./04-funding-source-ledger-spec.md) | Source ledger requirements | current | builders | current |

## 6. Data files

| File | Purpose | Status | Role |
| --- | --- | --- | --- |
| `11-program-financial-model-v0.1.csv` (+ `.meta.json`) | Machine-readable 5y lines | hypothesis | data for `11` |
| `12-comprehensive-system-inventory-v0.1.csv` (+ `.meta.json`) | Machine-readable inventory | hypothesis | data for `12` |
| `13-ten-and-twenty-year-program-cost-v0.1.csv` · `13-annual-cashflow-base-v0.1.csv` (+ meta) | Long-horizon companions | hypothesis | data for `13` |
| `14-validation-workstreams-and-budget-v0.1.csv` (+ `.meta.json`) | Validation workstream budget | working estimate | data for `14` |

## 7. Historical and superseded analyses

| Document | Purpose | Status | Replaced by |
| --- | --- | --- | --- |
| [`06-initial-working-budget-v0.1.md`](./06-initial-working-budget-v0.1.md) | App Draft Budget skeleton notes | historical | App seed + `01`/`03` |
| [`07-budget-estimate-scenarios-v0.1.md`](./07-budget-estimate-scenarios-v0.1.md) | Prototype low/base/high cash sketch | superseded for capitalization | `08` then `09`+ |
| [`08-budget-realism-and-scope-audit-v0.1.md`](./08-budget-realism-and-scope-audit-v0.1.md) | Honesty audit of prototype labels | superseded for civilization-scale | `09` |
| `11` §7.3 ~$0.25–0.50B pre-major-build total | Prior order-of-magnitude | superseded as working total | **`14`** (~$202M / ~$446M / ~$898M) |

## Software workspace reminder

Settings → Funding: **Budget** (default) · **Program plan** · Overview · Sources · Interest; legacy tools behind `?legacy=1`.  
Public: `/fund/project-finance` (approved+published budgets only — no Program plan).  
Draft Budget in app: demonstration skeleton amounts **zero**, `draft`, `is_demonstration=true`, unapproved, unpublished; Phase 1–3 = **Timing TBD**.  
Validation working draft: **Civizen Pre-Major-Build Validation Program v0.1** — base planned **exact $446,000,000.00**, 12 groups / 25 lines (WS-01…WS-25), committed/actual 0, draft/unapproved/unpublished; preferred selection in Settings → Funding → Budget. Seed: `scripts/db/seed-validation-budget-v01.sql` (idempotent).  
Regenerate Program plan: `python3 scripts/generate-program-plan-summary.py`.
