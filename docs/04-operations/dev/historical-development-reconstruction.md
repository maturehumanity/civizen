# Historical development contribution reconstruction

**Status:** Working reconstruction pass (v1.2)  
**Code:** `src/lib/civizen-historical-reconstruction.ts`, `src/lib/civizen-contribution-provenance.ts`, `src/lib/civizen-contribution-integrity.ts`  
**Runner:** `npm run stories:reconstruct-historical` (`--dry-run` default; `--persist-provenance` enriches existing roots; `--persist` rewrites outcomes)

## Purpose

Journal rows (Cursor/chat turns and raw git commits) stay stored as provenance. They are **not** independent contributions.

This pass reconstructs a smaller set of coherent historical work outcomes from evidence Civizen already has: git history, affected paths, surviving implementation, tests, documentation, migrations, timestamps, and `development_stories`. Those outcomes are then verified and evaluated through the existing evidence → collector → Score V2 path.

Do **not** restore previous score targets (62.1, Contributor, Contributions 71.2, 513 roots). Do **not** tune Score V2 formulas.

## Contribution unit

One coherent meaningful implemented outcome — not a message, prompt, commit, file, test, or conversation.

Related design/review messages + successive commits + tests + surviving behavior may reconstruct as **one** outcome. Two distinct completed capabilities may reconstruct as two. Unrelated work is not forced together to reduce count.

Human contribution is the evidenced judgment, specification, direction, review, and validation that produced the ship. Reconstruction therefore preserves “what meaningful human work directed this outcome,” not only “what code landed.” AI-assisted implementation is an execution method. It does not mint extra roots, and it does not classify the human as Implementation merely because React files changed.

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

`--persist` writes one `historical_reconstruction` implementation story per qualifying outcome (`source_story_key = outcome:historical:…:implementation`), stamps linked journal metadata with `outcomeRootId`, upserts `profile_contribution_events` for those roots, and prunes stale development-story ledger rows. `--persist-provenance` enriches existing canonical roots with stable `provenanceStoryIds` and bounded `humanInvolvement` (substantive design/review interactions, revision cycles, span). It does not prune the 87 persisted roots and does not mint a new root unless a disjoint surviving recall outcome meets the evidence bar. Score V2 recomputes on read. Journal chat/git rows themselves are not scored.

Stored `capacity_estimate` / `impact_estimate` / `collaboration_estimate` columns may still hold unused placeholders (historically 78 / 78 / 35). They are **not** contribution evaluations. `contribution-evaluation-v3` evaluates each canonical root on read from verified evidence, including bounded **human contribution substance** (`human-contribution-substance-v1`) and contextual provenance (`contribution-provenance-v1`). Linked chat/instruction provenance can enrich the human roles that produced a ship (product design, UX, specification, review, validation) without minting extra roots. Reconstruction version `historical-reconstruction-v1.2` attaches human messages by material influence (time, paths, domain, outcome overlap), not by prompt length or keyword form. AI-assisted execution is recorded separately from human function. Unknown realized impact stays unknown. Prompt count is never a score factor. Sustained involvement is evidence of iterative control, not a multiplier. Recall recovery may attach an additional reconstructed-with-uncertainty outcome when a contribution-bearing instruction still maps to disjoint surviving implementation.

**Provenance recall (2026-08-13):** The earlier regex `isSubstantiveInstruction` pass counted 54 / 325 human messages and attached 0 of them to the 87 persisted roots because events did not store `provenanceStoryIds` and attach required SHA / title-term / filename matches. Contextual provenance classifies function (defect, UX, requirement, review, …) and asks whether the interaction materially influenced a verified outcome. Short defect/UX/workflow messages can be contribution-bearing; generic how-to questions, `ok/continue/commit`, and agent-process rules stay journal-only. Many messages may enrich one coherent outcome (Score ring, Agreements). Do not restore prompt-count scoring.

**Provenance persist (2026-08-13):** `--persist-provenance` kept **87** canonical roots (86 historical reconstruction + 1 live operational lifecycle root). Fresh reconstruction can form **133** qualifying historical clusters; the extra **47** were not minted. Classification: 27 overlapping existing roots, 13 implementation-insufficient, 4 duplicate representations, 2 attribution-insufficient, 1 bootstrap template snapshot (`other`, not a product outcome). Isolated classifier: 70 process/casual, 17 information-only, 57 contribution-bearing, 181 ambiguous. **18** persisted roots have contribution-bearing human chat; **11** have ambiguous-only chat retained for traceability. Ambiguous chat does not strengthen substance or observation (0 roots depend on ambiguity alone). Founder/status is identity, not a substance signal. Prompt count is not a score factor.

**Canonical provenance inheritance (2026-08-13):** Non-persisted reconstructed clusters are not minted. When reconstruction deterministically identifies a cluster as a **duplicate** or **same-outcome overlap** of a persisted canonical root, qualifying human provenance on that cluster is inherited onto the canonical root. Identity requires strong reproducible evidence (shared product/work identity, highly overlapping primary implementation paths, commit/work-unit relationship, explicit title/feature linkage, or an already-recognized satellite/parent). Same day, broad domain, vague wording, generic shared files, or repository proximity are not enough. Overlap that is merely related work does not merge. Implementation-insufficient, attribution-insufficient, and bootstrap/template clusters do not transfer provenance to make them scoreable. Inheritance dedupes by stable story ID (and normalized text for involvement), does not increase independent evidence count, and is idempotent. Ambiguous chat may move for traceability but still cannot strengthen substance or observation.

This pass inspected the 18 contribution-bearing messages attached only to non-persisted clusters. **0** met strong same-outcome identity with a persisted root, so none were inherited. Disposition: 12 overlapping but merely related (governance/ops/docs clusters overlapping `docs: reorganize documentation by purpose` or other nearby docs roots), 2 implementation-insufficient, 4 attribution-insufficient. The 4 duplicate-representation clusters had no contribution-bearing human provenance to move. The 6 contribution-bearing messages with no explainable outcome remain journal-only. Persisted roots with contribution-bearing human chat stayed **18**. Root count stayed **87**. Human-substance and contribution-observation did not change.

**Live capture (forward path):** New work should capture a stable `outcomeRootId` from the start: human design/review provenance → `outcomeRootId` → implementation / tests → canonical contribution root → Score V2. Historical reconstruction is fallback only. This canonicalization gap should not occur when live capture records the outcome root before reconstruction.

## Live later evidence

Impact evidence, beneficiary/affected-person feedback, and independent validation attach to an existing canonical root (`contribution_evidence_records`). They do not mint another contribution. Score V2, evaluator reputation (`evaluator-reputation-v1`), and contribution history recompute on read from those immutable records. Claimed/potential reach is distinct from realized reach. Declared context is stored on `profile_declared_context` and is not a score input.

## Inspectable ledger

Every score-affecting canonical root must remain inspectable. The compact Profile Contributions preview may show a handful of recent titles; **View contribution details** opens `/profile/contributions` (or `/user/:id/contributions`) with search, filters, sort, and pagination over all roots. Do not collapse roots into a single “Platform improvement · N” card. Event type (`development_story` vs `post`) is a coarse source class; contribution function (system architecture, implementation, communication, …) is the useful classification. Private journal identifiers and chat transcripts are provenance-only and must not appear on the ledger.
