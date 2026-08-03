# Solutions (Governance)

Member surface: `/governance/solutions`.

## Modes

| Mode | Default | Behavior |
|------|---------|----------|
| **Discuss** | Yes | Categorize the issue, open a public thread, and invite AI agents (ChatGPT, Gemini, Claude) to participate alongside citizens. |
| **Solve** | No | Categorize, route to a civic **authority** type from the catalog, then match a certified Civizen professional when available; otherwise status `seeking_professional`. |

AI agents participate in the process; they are not the only actors.

## Authority catalog

Jurisdiction-agnostic taxonomy in `src/lib/solution-authorities.ts` (seeded to `solution_authorities`). Typical public-sector departments (Health, Justice, Municipal, Elections, …) with responsibilities and keywords for auto-routing.

Civizen is **not currently** a government — routing informs citizens and coordinates voluntary network action; it does not replace official channels.

## Edge function

`solutions-agent-council` still runs the multi-model debate for **Discuss** issues.

## Secrets

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | ChatGPT turns |
| `GEMINI_API_KEY` | Gemini turns |
| `ANTHROPIC_API_KEY` | Claude turns |

## Migrations

- `20260802120000_solutions_council.sql`
- `20260802140000_solutions_discuss_solve_routing.sql`
