---
title: Civizen Assistant Knowledge
status: current
canonical: true
last_reviewed: 2026-08-13
---

# Civizen Assistant Knowledge

Nela answers from **this Civizen build**, not from general model memory.

## Layout

| Path | Role |
| --- | --- |
| [`civizen-assistant-cheatsheet.md`](./civizen-assistant-cheatsheet.md) | Compact canonical facts for frequent questions |
| `src/lib/assistant/catalog.ts` | Machine-readable capabilities, FAQ, and terminology aliases |
| `src/lib/assistant/generated/knowledge-pack.ts` | Generated searchable index (do not edit by hand) |
| `supabase/functions/messaging-agent-reply/nela-bundle.js` | Bundled retrieval runtime for the Nela edge function |

## Refresh

After changing product behavior, registries, or assistant-authoritative docs:

```bash
npm run assistant:knowledge
```

When Nela gives directions, it should match the question: **Can I** starts with Yes or No, then the path; **How** starts with `Open Market > Agreements`. Chat turns those page names into links. Type names in the main answer (General, Partnership / Collaboration, and the rest) also link to New agreement for that type.

CI and `verify:agent-context` fail if the generated pack is stale relative to its sources.

## Internal-first routing

Nela uses the closest authoritative resource first:

1. Conversation context
2. FAQ / this cheat sheet
3. Capability registry
4. Project knowledge index
5. Authorized runtime / member data
6. AI reasoning over collected evidence
7. Broader API-agent resources only when the request needs the outside world

Civizen product facts stay internal even after escalation. Missing internal evidence does not authorize a generic web/model guess about Civizen.

## Status vocabulary

Capabilities use: `implemented` · `experimental` · `in_development` · `proposed` · `deprecated` · `historical`.

“Civizen supports X” means X is **implemented** in this build.
