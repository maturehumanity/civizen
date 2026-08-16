---
title: Civizen Assistant Knowledge
status: current
canonical: true
last_reviewed: 2026-08-16
---

# Civizen Assistant Knowledge

Civi answers from **this Civizen build**, not from general model memory. Visitors can ask Civi about the project without creating an account. Members also find Civi in Messaging.

## Layout

| Path | Role |
| --- | --- |
| [`civizen-identity.md`](./civizen-identity.md) | Canonical identity, purpose, and one-sentence definition |
| [`civizen-assistant-cheatsheet.md`](./civizen-assistant-cheatsheet.md) | Compact canonical facts for frequent questions |
| `src/lib/assistant/catalog.ts` | Machine-readable capabilities, FAQ, and terminology aliases |
| `src/lib/assistant/learned-memory.ts` | Checked Gemini-answer memory (does not override identity or capabilities) |
| `src/pages/settings/AiAgentSettings.tsx` | Founder development review of Civi questions and replies |
| `src/lib/assistant/generated/knowledge-pack.ts` | Generated searchable index (do not edit by hand) |
| `supabase/functions/messaging-agent-reply/nela-bundle.js` | Bundled retrieval runtime for the Civi edge function |

## Refresh

After changing product behavior, registries, or assistant-authoritative docs:

```bash
npm run assistant:knowledge
```

When Civi gives directions, it should match the question: **Can I** starts with Yes or No, then the path; **How** starts with `Open Market > Agreements`. Chat turns those page names into links. Type names in the main answer (General, Partnership / Collaboration, and the rest) also link to New agreement for that type.

CI and `verify:agent-context` fail if the generated pack is stale relative to its sources.

## Internal-first routing

Civi uses the closest authoritative resource first:

1. Conversation context
2. Canonical identity (`civizen-identity.md`) for what Civizen is, its purpose, mission, scope, or one-sentence description
3. FAQ / this cheat sheet
4. Capability registry for what is implemented **now**
5. Project knowledge index
6. Authorized runtime / member data
7. Civi memory of **checked** previous model answers (similar questions only; never overrides 2–5)
8. AI reasoning over collected evidence
9. Broader API-agent resources only when the request needs the outside world

Identity questions must not be answered by reconstructing Civizen from feature docs. Capability questions must not be answered with the identity sentence alone.

Someone asking for housing, food, or a safe place tonight is not a Contribute question. Civi acknowledges the situation, says Civizen is not emergency housing, points to local emergency services / 211, and may mention Jobs — not Volunteer lanes.

Peace, war, and “how do we unite humanity” questions get practical individual and collective steps (Sign up, Study, Contribute, Governance), not manifesto recap. Civi does not claim Civizen currently stops wars.

Civizen product facts stay internal even after escalation. Missing internal evidence does not authorize a generic web/model guess about Civizen. Gemini (or another model) may fill a gap for a general or mixed question; Civi then **checks** that reply before storing it. Invented Civizen capabilities, personal records, and one-off drafts are not remembered.

## Status vocabulary

Capabilities use: `implemented` · `experimental` · `in_development` · `proposed` · `deprecated` · `historical`.

“Civizen supports X” means X is **implemented** in this build.
