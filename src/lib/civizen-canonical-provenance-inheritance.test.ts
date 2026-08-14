import { describe, expect, it } from 'vitest';

import {
  inheritCanonicalProvenance,
  type ExistingRootSnapshot,
} from '@/lib/civizen-contribution-integrity';
import {
  evaluationProvenanceInstructions,
  involvementFromStories,
} from '@/lib/civizen-contribution-provenance';
import { evaluateContributionLifecycle } from '@/lib/civizen-contribution-lifecycle';
import { scoreContributionsFromEvents } from '@/lib/civizen-contribution-score';
import type { DevelopmentStoryEvidenceInput } from '@/lib/civizen-development-evidence';
import type { ContributionEvent } from '@/lib/civizen-contributions';

const BEARING = 'This should behave like a document, not a form.';
const AMBIGUOUS = 'Do a second-pass.';

function cluster(partial: {
  outcomeRootId: string;
  title: string;
  affectedPaths: string[];
  storyIds: string[];
  commitShas?: string[];
  contributionEvidenceConfidence?: string;
  survivingImplementation?: boolean;
}) {
  return {
    result: 'reconstructed',
    contributionEvidenceConfidence: partial.contributionEvidenceConfidence ?? 'moderate',
    survivingImplementation: partial.survivingImplementation ?? true,
    testsPassed: true as boolean | null,
    linkReasons: [] as string[],
    commitShas: partial.commitShas ?? [`${partial.outcomeRootId.replace('historical:', '')}`],
    ...partial,
  };
}

function existingFrom(item: ReturnType<typeof cluster>): ExistingRootSnapshot {
  return {
    sourceId: `outcome:${item.outcomeRootId}`,
    title: item.title,
    affectedPaths: item.affectedPaths,
    commitShas: item.commitShas,
  };
}

function chat(id: string, text: string): DevelopmentStoryEvidenceInput {
  return {
    id,
    sourceStoryKey: id,
    source: 'chat',
    title: text,
    originalInstruction: text,
    requestedAt: '2026-08-01T12:00:00.000Z',
  };
}

function lifecycleEvent(storyIds: string[], instructions: string[]): ContributionEvent {
  return {
    profileId: 'p1',
    sourceTable: 'development_stories',
    sourceId: 'outcome:historical:aa11aa11aa11',
    eventType: 'development_story',
    title: 'Refine Agreements document-first editing',
    summary: null,
    capacityEstimate: 78,
    impactEstimate: 78,
    collaborationEstimate: 35,
    beneficiaryEstimate: 75,
    verified: true,
    occurredAt: '2026-08-13T12:00:00.000Z',
    rawMeta: {
      eligibility: 'system_verified',
      testsPassed: true,
      reconstruction: true,
      implementationAssisted: true,
      contributionRoles: ['ux_design', 'requirements', 'review'],
      provenanceStoryIds: storyIds,
      linkedInstructions: evaluationProvenanceInstructions(instructions),
      affectedPaths: ['src/pages/agreements/AgreementCreate.tsx'],
    },
  };
}

const AGREEMENT_PATHS = [
  'src/pages/agreements/AgreementCreate.tsx',
  'src/pages/agreements/AgreementView.tsx',
  'src/lib/agreements.ts',
];

describe('canonical provenance inheritance', () => {
  it('A: duplicate reconstructed cluster bearing provenance is inherited; root count unchanged', () => {
    const canonical = cluster({
      outcomeRootId: 'historical:aa11aa11aa11',
      title: 'Refine Agreements document-first editing',
      affectedPaths: AGREEMENT_PATHS,
      storyIds: ['git-aa'],
    });
    const duplicate = cluster({
      outcomeRootId: 'historical:bb22bb22bb22',
      title: 'Refine Agreements document-first editing',
      affectedPaths: AGREEMENT_PATHS,
      storyIds: ['chat-bearing'],
    });
    const existing = [existingFrom(canonical)];
    const moves = inheritCanonicalProvenance(
      [canonical, duplicate],
      existing,
      new Set(['chat-bearing']),
    );
    expect(moves).toEqual([expect.objectContaining({
      storyId: 'chat-bearing',
      action: 'merge_into_canonical',
      toSourceId: 'outcome:historical:aa11aa11aa11',
      clusterReason: 'duplicate_representation',
      identityEstablished: true,
    })]);
    expect(canonical.storyIds).toContain('chat-bearing');
    expect(duplicate.storyIds).not.toContain('chat-bearing');
    expect(existing).toHaveLength(1);
    expect([canonical, duplicate]).toHaveLength(2);
  });

  it('B: overlapping but genuinely separate work does not merge provenance', () => {
    const canonical = cluster({
      outcomeRootId: 'historical:aa11aa11aa11',
      title: 'Refine Agreements document-first editing',
      affectedPaths: [
        ...AGREEMENT_PATHS,
        'docs/04-operations/dev/agreements.md',
        'docs/04-operations/dev/contribute-page.md',
      ],
      storyIds: ['git-aa'],
    });
    const related = cluster({
      outcomeRootId: 'historical:cc33cc33cc33',
      title: 'docs: reorganize documentation by purpose',
      affectedPaths: [
        'docs/04-operations/dev/agreements.md',
        'docs/04-operations/dev/contribute-page.md',
        'docs/institutional/contributor-framework.md',
      ],
      storyIds: ['chat-docs'],
    });
    const moves = inheritCanonicalProvenance(
      [canonical, related],
      [existingFrom(canonical)],
      new Set(['chat-docs']),
    );
    expect(moves[0]?.action).toBe('remain_on_cluster');
    expect(moves[0]?.clusterReason).toBe('overlapping_cluster');
    expect(moves[0]?.identityEstablished).toBe(false);
    expect(canonical.storyIds).not.toContain('chat-docs');
    expect(related.storyIds).toContain('chat-docs');
  });

  it('overlapping same-outcome product subset inherits provenance into the canonical root', () => {
    const canonical = cluster({
      outcomeRootId: 'historical:aa11aa11aa11',
      title: 'Refine Agreements document-first editing',
      affectedPaths: [
        ...AGREEMENT_PATHS,
        'src/pages/agreements/AgreementSign.tsx',
        'src/pages/agreements/AgreementList.tsx',
        'src/lib/agreements-templates.ts',
      ],
      storyIds: ['git-aa'],
    });
    const subset = cluster({
      outcomeRootId: 'historical:ee55ee55ee55',
      title: 'Refine Agreements document-first editing follow-up',
      affectedPaths: AGREEMENT_PATHS,
      storyIds: ['chat-subset'],
    });
    const moves = inheritCanonicalProvenance(
      [canonical, subset],
      [existingFrom(canonical)],
      new Set(['chat-subset']),
    );
    expect(moves[0]?.clusterReason).toBe('overlapping_cluster');
    expect(moves[0]?.action).toBe('merge_into_canonical');
    expect(canonical.storyIds).toContain('chat-subset');
    expect(subset.storyIds).not.toContain('chat-subset');
  });

  it('C: ambiguous provenance on a duplicate cluster stays non-substantive after inheritance', () => {
    const canonical = cluster({
      outcomeRootId: 'historical:aa11aa11aa11',
      title: 'Refine Agreements document-first editing',
      affectedPaths: AGREEMENT_PATHS,
      storyIds: ['chat-bearing'],
    });
    const duplicate = cluster({
      outcomeRootId: 'historical:bb22bb22bb22',
      title: 'Refine Agreements document-first editing',
      affectedPaths: AGREEMENT_PATHS,
      storyIds: ['chat-ambiguous'],
    });
    inheritCanonicalProvenance(
      [canonical, duplicate],
      [existingFrom(canonical)],
      new Set(['chat-bearing', 'chat-ambiguous']),
    );
    expect(canonical.storyIds).toEqual(expect.arrayContaining(['chat-bearing', 'chat-ambiguous']));
    const inherited = [chat('chat-bearing', BEARING), chat('chat-ambiguous', AMBIGUOUS)]
      .filter((story) => canonical.storyIds.includes(story.id || ''));
    expect(evaluationProvenanceInstructions(inherited.map((story) => story.originalInstruction || ''))).toEqual([BEARING]);
    const before = evaluateContributionLifecycle(lifecycleEvent(['chat-bearing'], [BEARING]));
    const after = evaluateContributionLifecycle(lifecycleEvent(
      canonical.storyIds,
      inherited.map((story) => story.originalInstruction || ''),
    ));
    expect(after.humanSubstance?.level).toBe(before.humanSubstance?.level);
    expect(after.observation).toBe(before.observation);
    expect(involvementFromStories(inherited).substantiveInteractions).toBe(
      involvementFromStories([chat('chat-bearing', BEARING)]).substantiveInteractions,
    );
  });

  it('D: same provenance ID already on the canonical root does not duplicate involvement', () => {
    const canonical = cluster({
      outcomeRootId: 'historical:aa11aa11aa11',
      title: 'Refine Agreements document-first editing',
      affectedPaths: AGREEMENT_PATHS,
      storyIds: ['chat-bearing'],
    });
    const duplicate = cluster({
      outcomeRootId: 'historical:bb22bb22bb22',
      title: 'Refine Agreements document-first editing',
      affectedPaths: AGREEMENT_PATHS,
      storyIds: ['chat-bearing'],
    });
    const before = involvementFromStories([chat('chat-bearing', BEARING)]);
    inheritCanonicalProvenance(
      [canonical, duplicate],
      [existingFrom(canonical)],
      new Set(['chat-bearing']),
    );
    expect(canonical.storyIds.filter((id) => id === 'chat-bearing')).toHaveLength(1);
    expect(duplicate.storyIds).not.toContain('chat-bearing');
    const after = involvementFromStories(
      [chat('chat-bearing', BEARING)].filter((story) => canonical.storyIds.includes(story.id || '')),
    );
    expect(after.substantiveInteractions).toBe(before.substantiveInteractions);
  });

  it('E: implementation-insufficient cluster cannot piggyback onto a nearby canonical root', () => {
    const canonical = cluster({
      outcomeRootId: 'historical:aa11aa11aa11',
      title: 'Refine Agreements document-first editing',
      affectedPaths: AGREEMENT_PATHS,
      storyIds: ['git-aa'],
    });
    const weak = cluster({
      outcomeRootId: 'historical:dd44dd44dd44',
      title: 'Refine Agreements document-first editing',
      affectedPaths: AGREEMENT_PATHS,
      storyIds: ['chat-weak'],
      contributionEvidenceConfidence: 'low',
    });
    const moves = inheritCanonicalProvenance(
      [canonical, weak],
      [existingFrom(canonical)],
      new Set(['chat-weak']),
    );
    expect(moves[0]?.clusterReason).toBe('implementation_insufficient');
    expect(moves[0]?.action).toBe('remain_on_cluster');
    expect(canonical.storyIds).not.toContain('chat-weak');
    expect(weak.storyIds).toContain('chat-weak');
  });

  it('F: repeated inherit/persist is idempotent for provenance and score', () => {
    const canonical = cluster({
      outcomeRootId: 'historical:aa11aa11aa11',
      title: 'Refine Agreements document-first editing',
      affectedPaths: AGREEMENT_PATHS,
      storyIds: ['git-aa'],
    });
    const duplicate = cluster({
      outcomeRootId: 'historical:bb22bb22bb22',
      title: 'Refine Agreements document-first editing',
      affectedPaths: AGREEMENT_PATHS,
      storyIds: ['chat-bearing'],
    });
    const existing = [existingFrom(canonical)];
    const human = new Set(['chat-bearing']);
    const first = inheritCanonicalProvenance([canonical, duplicate], existing, human);
    const snapshot = {
      canonicalIds: [...canonical.storyIds],
      duplicateIds: [...duplicate.storyIds],
      reasons: [...canonical.linkReasons],
    };
    const second = inheritCanonicalProvenance([canonical, duplicate], existing, human);
    expect(canonical.storyIds).toEqual(snapshot.canonicalIds);
    expect(duplicate.storyIds).toEqual(snapshot.duplicateIds);
    expect(canonical.linkReasons.filter((reason) => reason === 'canonical_provenance_inheritance'))
      .toHaveLength(snapshot.reasons.filter((reason) => reason === 'canonical_provenance_inheritance').length);
    expect(second.filter((item) => item.action === 'merge_into_canonical')).toHaveLength(0);
    expect(first.filter((item) => item.action === 'merge_into_canonical')).toHaveLength(1);
    const event = lifecycleEvent(canonical.storyIds, [BEARING]);
    const once = scoreContributionsFromEvents([event]);
    const twice = scoreContributionsFromEvents([event, event]);
    expect(twice?.score).toBe(once?.score);
    expect(twice?.sourceCount).toBe(once?.sourceCount);
  });
});
