---
title: Information architecture and content standards
status: current
version: 0.1
date: 2026-08-10
canonical: true
---

# Information architecture and content standards

**Audience:** product, design, engineering, documentation authors.  
**Scope:** Universal Civizen standards. Workspace-specific maps live beside this file (e.g. Funding).

## 1. Purpose

Make Civizen understandable to someone who does not already know its database structure, internal codes, document history, or implementation architecture.

Do **not** solve confusion by adding long explanatory text to already long pages. Prefer hierarchy, navigation, progressive disclosure, labeling, and task flow.

## 2. Principles (required)

| Principle | Requirement |
| --- | --- |
| **Simple by default. Advanced by need. Always.** | Expose the smallest clear interface for the user's immediate goal across **all** surfaces (member, organization/admin, forms, dashboards, navigation, workflows, settings, and documentation/implementation decisions). Show essentials first; hide secondary controls until relevant; prefer inference and prefill over extra fields; use plain language. Goal: **simple surface, advanced depth** — not fewer capabilities. Empty states stay minimal; populated workspaces may use compact icon actions with accessible labels (never hover-only). If create is a compact `+` beside the title, do not duplicate a large Create button in the empty body. This does **not** authorize stripping important capabilities, accessibility, safety information, or necessary detail from internal/reference documentation. Agent-enforced policy: [`../../04-operations/dev/AGENTS.md`](../../04-operations/dev/AGENTS.md). Public-participation spec: [`../areas-and-initiatives/public-areas-initiatives-v1.md`](../areas-and-initiatives/public-areas-initiatives-v1.md). |
| Answer-first | Lead with status, totals that matter, and next actions |
| One purpose per view | Overview ≠ detail ≠ audit ≠ create/edit |
| Progressive disclosure | Show decision-relevant fields first; advanced/metadata on demand |
| Plain language | Human-readable labels; codes secondary |
| Visible status | Draft / review / approved / published / demonstration / hypothesis — never ambiguous |
| Epistemic honesty | Distinguish hypothesis, estimate, decision, commitment, receipt, actual, superseded |
| One authoritative source | Do not copy figures without a canonical reference |
| Task-oriented IA | Organize by user jobs, not tables |
| Safe defaults | Least-privilege, unpublished, non-production labels where applicable |
| Visible prerequisites | Disabled actions explain what is missing |
| Mobile-first | One clear primary action; no content under persistent nav |
| Accessibility | Keyboard, labels, focus, contrast, non-color status |
| Consistent terminology | Same words in docs and UI |
| Separated audiences | Public · internal · technical · historical |

## 3. Prohibitions

- Extremely long undivided pages of unrelated workflows  
- Repeating full explanations across several pages  
- Using implementation codes as primary user-facing labels  
- Rendering hundreds of records without search, filters, grouping, or summaries  
- Making every field permanently visible  
- Using accordions only to hide unstructured dumps  
- Duplicating figures across documents without a canonical-source reference  
- Disabled controls with no prerequisite explanation  
- Important mobile content beneath persistent navigation  
- Relabeling prototypes as production  

## 4. Page hierarchy (Levels 1–5)

| Level | Role | Typical contents |
| --- | --- | --- |
| 1 Overview | Orient and route | Purpose, status, key indicators, attention items, primary actions, links |
| 2 Focused section | One task family | e.g. Budget, Sources |
| 3 Record list | Find and select | Search, filters, sort, compact rows, create |
| 4 Record detail | Understand and act | Summary, status, amounts, related links, actions; technical metadata advanced |
| 5 Create/edit | Change safely | Steps, relevant fields, near-field validation, review before consequential submit |

Do **not** place all five levels on one page.

## 5. Content-density guidelines

| Guideline | Initial limit |
| --- | --- |
| Overview primary sections | 5–7 |
| Primary actions visible at once | 3–5 |
| Form fields before grouping/steps | ~8–12 meaningful fields |
| List columns (default) | Decision-relevant only |
| Advanced metadata | Hidden by default |
| Long tables on mobile | Horizontal handling, column selection, or cards |
| Explanatory copy | Concise; deeper guidance linked |
| Mobile primary action | Normally one |
| Persistent navigation | Must not obscure content |

Guidelines — do not fragment simple tasks into excessive screens.

## 6. Document organization (complex planning areas)

Canonical hierarchy:

1. `README.md` — navigation index only  
2. Current executive overview  
3. Current decision record  
4. Current operational plan  
5. Detailed model or specification  
6. Evidence / source register  
7. Machine-readable data  
8. Historical / superseded work  

README entries must show: title · one-sentence purpose · status · intended reader · current/supporting/superseded · replacement if any. Do not paste substantive content into the README.

## 7. Canonical-source rules

When a summary repeats a figure, include: source document · version · scenario · date · confidence · status (`hypothesis` | `working estimate` | `approved budget` | `committed` | `actual` | `superseded`).

See workspace maps for concrete source-of-truth tables (Funding starts in `funding-workspace-information-architecture.md`).

## 8. Large-model interface patterns

For inventories and long-range financial models, default views use:

**summary → filter → list → detail**

Never render all systems or an entire multi-decade model on one page. Provide domain/cost-center summaries, scenario comparison, maturity distributions, and drill-down.

## 9. Preservation constraint

Incremental usability improvements must preserve shell, global nav, design system, routes, permissions, and unrelated workflows unless owner-approved. Prefer the smallest effective change category: label · grouping · local nav · progressive disclosure · responsive · a11y.
