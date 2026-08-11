# Civizen documentation

Documentation is organized by **purpose and subject**, not by moderation lane or development stage.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `draft` | Work in progress; not adopted |
| `under-review` | Submitted for review |
| `accepted` | Formally accepted; may not yet be operational |
| `current` | Active / controlling for its domain |
| `superseded` | Replaced by a newer document; kept for history |
| `historical` | Completed implementation or phase record |
| `unknown` | Status not established from repository evidence |

Substantive documents may include YAML front matter (`title`, `status`, `version`, `owners`, `last_reviewed`, `canonical`). Fields are omitted or set to `unknown` when evidence is missing. Do not invent owners or approval dates.

**Canonical** (`canonical: true`) means this is the single editable source for that topic. Prefer linking to canonical paths; do not maintain a second editable copy.

## Reading paths

| If you want to… | Start here |
| --- | --- |
| Understand why Civizen exists | [`00-foundation/why-civizen-exists-page-brief.md`](./00-foundation/why-civizen-exists-page-brief.md) · [`00-foundation/the-civizen-charter.md`](./00-foundation/the-civizen-charter.md) |
| Read the Philosophy of Mature Humanity | [`00-foundation/philosophy-of-mature-humanity.md`](./00-foundation/philosophy-of-mature-humanity.md) |
| Understand Civizen governance | [`01-governance/README.md`](./01-governance/README.md) |
| Review current policies | [`02-policies/README.md`](./02-policies/README.md) · especially [`02-policies/institutional/`](./02-policies/institutional/) |
| Understand the platform architecture | [`03-platform/README.md`](./03-platform/README.md) · product IA: [`03-platform/product-design/information-architecture-and-content-standards.md`](./03-platform/product-design/information-architecture-and-content-standards.md) |
| Browse funding & budget planning index | [`04-operations/funding-and-budget/README.md`](./04-operations/funding-and-budget/README.md) |
| Review research and background | [`05-research/README.md`](./05-research/README.md) |
| Propose or review a change | [`proposals/README.md`](./proposals/README.md) |
| Browse historical implementation records | [`archive/README.md`](./archive/README.md) |
| Develop or release the app | [`04-operations/dev/AGENTS.md`](./04-operations/dev/AGENTS.md) |

## Top-level map

```text
docs/
├── 00-foundation/     Living philosophy, charter, pathway, purpose briefs
├── 01-governance/     Institutional models, roles, participation, funding models
├── 02-policies/       Adopted / operational public and platform policies
├── 03-platform/       Software architecture, decentralization, scoring
├── 04-operations/     Development, release, contributor processes
├── 05-research/       Academic, professional, and study materials
├── proposals/         Draft and in-flight proposals
└── archive/           Superseded docs and implementation history
```

## Proposing documentation changes

1. Open a draft under [`proposals/drafts/`](./proposals/drafts/) (or edit an existing draft).
2. When ready for review, move or label it `under-review`.
3. After acceptance, place the canonical copy in the appropriate numbered section and leave a link from related indexes—do not maintain two editable copies.
4. Superseded material moves to [`archive/superseded/`](./archive/superseded/) with a short header pointing to the replacement.

Migration inventory: [`archive/implementation-history/docs-ia-migration-inventory-2026-08-10.md`](./archive/implementation-history/docs-ia-migration-inventory-2026-08-10.md).

Legacy moderation-lane paths and top-level redirect stubs were removed after confirming no published URL or application import depended on them. History remains in git and in the migration inventory.
