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
