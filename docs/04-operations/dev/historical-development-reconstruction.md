# Historical development contribution reconstruction

**Status:** Working reconstruction pass (v1)  
**Code:** `src/lib/civizen-historical-reconstruction.ts`, `src/lib/civizen-historical-reconstruction-signals.ts`  
**Runner:** `npm run stories:reconstruct-historical` (`--dry-run` default; `--persist` writes outcomes)

## Purpose

Journal rows (Cursor/chat turns and raw git commits) stay stored as provenance. They are **not** independent contributions.

This pass reconstructs a smaller set of coherent historical work outcomes from evidence Civizen already has: git history, affected paths, surviving implementation, tests, documentation, migrations, timestamps, and `development_stories`. Those outcomes are then verified and evaluated through the existing evidence → collector → Score V2 path.

Do **not** restore previous score targets (62.1, Contributor, Contributions 71.2, 513 roots). Do **not** tune Score V2 formulas.

## Contribution unit

One coherent meaningful implemented outcome — not a message, prompt, commit, file, test, or conversation.

Related design/review messages + successive commits + tests + surviving behavior may reconstruct as **one** outcome. Two distinct completed capabilities may reconstruct as two. Unrelated work is not forced together to reduce count.

## Three reconstruction results

| Result | Meaning | Score V2 |
| --- | --- | --- |
| `reconstructed` | Explainable grouping and surviving implementation | Eligible for system verification when the evidence chain holds |
| `reconstructed_with_uncertainty` | Outcome reconstructed; some linkage, tests, or attribution remain unknown | Still evaluated on verified dimensions; unknown dimensions stay unknown |
| `unreconstructed` | No coherent implemented outcome can be formed from the artifact | Journal / provenance only |

There is no generic “waiting for reconciliation” bucket. Uncertainty is stored on the relevant dimension (`reconstructionConfidence`, `attributionConfidence`, `contributionEvidenceConfidence`, `testsPassed`).

## Reconstruction confidence is not contribution confidence

- **Reconstruction confidence:** do these artifacts belong to the same work outcome?
- **Contribution evidence confidence:** did the work occur and leave a surviving result?

High reconstruction + system verification + no independent review is a legitimate verified contribution. Independent review is not required.

## Evidence graph (bounded rules)

Stronger signals (can establish identity):

- explicit commit SHA on a journal row or in an instruction
- successive commits with overlapping primary paths
- successive named change (two or more distinctive terms) plus supporting docs/tests/scripts in a short window
- shared release version linking Publish/Note/Bump satellites to a product change
- enumerated mega-commit split only when named clauses map to disjoint file sets

Weaker signals (assist, never sufficient alone):

- same calendar day
- similar wording / semantic similarity
- shared chat id

`outcomeRootId` is **not** required on historical journal rows. It is inferred.

Historical system verification may use surviving implementation + real features + commit SHA when a recorded test run was never stored. Live capture still requires `testsPassed` going forward.

## Persist

Current HEAD history may start at a snapshot while older git journal SHAs are no longer in the clone. Those orphaned journal commits are still reconstructed from message + time clustering, then verified against **surviving HEAD paths** that match distinctive terminology. The snapshot commit itself is not scored as one giant contribution.

`--persist` writes one `historical_reconstruction` implementation story per qualifying outcome (`source_story_key = outcome:historical:…:implementation`), stamps linked journal metadata with `outcomeRootId`, upserts `profile_contribution_events` for those roots, and prunes stale development-story ledger rows. Score V2 recomputes on read. Journal chat/git rows themselves are not scored.

Stored `capacity_estimate` / `impact_estimate` / `collaboration_estimate` columns may still hold unused placeholders (historically 78 / 78 / 35). They are **not** contribution evaluations. `contribution-evaluation-v2` evaluates each canonical root on read from verified evidence. Unknown realized impact stays unknown. Recall recovery may attach an additional reconstructed-with-uncertainty outcome when a substantive instruction still maps to disjoint surviving implementation; prompt count is never a score factor.

**Recall audit (2026-08-13, operational pass):** Against the live historical corpus (513 journal rows, 145 commits), classification was: 186 already attached to an outcome, 1 provenance-only, 53 overlapping surviving-implementation rows (not disjoint from existing roots), 273 process/non-contributory. One candidate recall recovery was identified (`reconstructed_with_uncertainty`, no tests, process-style agent-rule instruction). It was **not persisted** because the evidence was not strong/reproducible. Full `--persist` was not re-run, because it would rewrite the existing qualifying set rather than add only strong recoveries.

## Live later evidence

Impact evidence, beneficiary/affected-person feedback, and independent validation attach to an existing canonical root (`contribution_evidence_records`). They do not mint another contribution. Score V2, evaluator reputation (`evaluator-reputation-v1`), and contribution history recompute on read from those immutable records. Claimed/potential reach is distinct from realized reach. Declared context is stored on `profile_declared_context` and is not a score input.

## Inspectable ledger

Every score-affecting canonical root must remain inspectable. The compact Profile Contributions preview may show a handful of recent titles; **View contribution details** opens `/profile/contributions` (or `/user/:id/contributions`) with search, filters, sort, and pagination over all roots. Do not collapse roots into a single “Platform improvement · N” card. Event type (`development_story` vs `post`) is a coarse source class; contribution function (system architecture, implementation, communication, …) is the useful classification. Private journal identifiers and chat transcripts are provenance-only and must not appear on the ledger.
