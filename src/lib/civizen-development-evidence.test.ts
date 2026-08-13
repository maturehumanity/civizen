import { describe, expect, it } from 'vitest';

import {
  classifiedDomainForDevelopmentStory,
  evaluateDevelopmentContributionEvidence,
  groupDevelopmentStoriesToContributions,
  isLegacyChatBackfill,
  type DevelopmentStoryEvidenceInput,
} from '@/lib/civizen-development-evidence';

const ARCHITECTURE = [
  'Define a new architecture that separates activity evaluation from accumulated reputation.',
  'Canonicalize evidence roots, introduce evidence-volume shrinkage, and distinguish confidence from score magnitude.',
  'This is a structural redesign of the Civizen Score evidence-maturity model.',
].join(' ');

function story(overrides: Partial<DevelopmentStoryEvidenceInput>): DevelopmentStoryEvidenceInput {
  return {
    id: overrides.id ?? 'story-1',
    title: overrides.title ?? 'Platform improvement',
    originalInstruction: overrides.originalInstruction,
    createdFeatures: overrides.createdFeatures,
    commitSha: overrides.commitSha,
    prNumber: overrides.prNumber,
    reviewedBy: overrides.reviewedBy,
    sourceStoryKey: overrides.sourceStoryKey,
    source: overrides.source,
    sourceType: overrides.sourceType,
    status: overrides.status,
    chatId: overrides.chatId,
    requestedAt: overrides.requestedAt ?? '2026-08-13T10:00:00.000Z',
    createdAt: overrides.createdAt,
    metadata: overrides.metadata,
    outcomeRootId: overrides.outcomeRootId,
    testsPassed: overrides.testsPassed,
    published: overrides.published,
    roles: overrides.roles,
    implementationAssisted: overrides.implementationAssisted,
    area: overrides.area,
    ...overrides,
  };
}

describe('development contribution evidence', () => {
  it('A: ordinary question is not a contribution', () => {
    const result = evaluateDevelopmentContributionEvidence(
      story({ originalInstruction: 'What does this button do?' }),
    );
    expect(result.eligibility).toBe('journal_only');
    expect(result.qualifiesAsContribution).toBe(false);
    expect(groupDevelopmentStoriesToContributions([story({ originalInstruction: 'What does this button do?' })])).toEqual(
      [],
    );
  });

  it('B: process instruction is not a contribution', () => {
    for (const text of ['move on', 'yes', 'continue', 'commit it']) {
      const result = evaluateDevelopmentContributionEvidence(story({ originalInstruction: text }));
      expect(result.eligibility).toBe('journal_only');
      expect(result.qualifiesAsContribution).toBe(false);
    }
  });

  it('C: substantive architecture instruction without artifact is provenance only', () => {
    const result = evaluateDevelopmentContributionEvidence(story({ originalInstruction: ARCHITECTURE }));
    expect(result.eligibility).toBe('provenance_only');
    expect(result.qualifiesAsContribution).toBe(false);
    expect(result.verified).toBe(false);
    expect(groupDevelopmentStoriesToContributions([story({ originalInstruction: ARCHITECTURE })])).toEqual([]);
  });

  it('D: substantive instruction plus implemented/tested outcome is system-verified', () => {
    const result = evaluateDevelopmentContributionEvidence(
      story({
        originalInstruction: ARCHITECTURE,
        createdFeatures: ['Score V2 evidence-maturity engine'],
        commitSha: 'abc1234def',
        testsPassed: true,
      }),
    );
    expect(result.eligibility).toBe('system_verified');
    expect(result.qualifiesAsContribution).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.independentValidation).toBe(false);
  });

  it('E: created_features placeholder only is not verified', () => {
    const chat = evaluateDevelopmentContributionEvidence(
      story({
        originalInstruction: ARCHITECTURE,
        createdFeatures: ['Backfilled from chat transcript'],
        sourceStoryKey: 'chat:abc:turn:1',
        source: 'chat',
      }),
    );
    const git = evaluateDevelopmentContributionEvidence(
      story({
        originalInstruction: 'feat: record commit from history',
        createdFeatures: ['Commit abc1234 recorded from git history'],
        commitSha: 'abc1234def567',
        sourceStoryKey: 'git:abc1234def567',
      }),
    );
    expect(chat.verified).toBe(false);
    expect(chat.qualifiesAsContribution).toBe(false);
    expect(git.verified).toBe(false);
    expect(git.qualifiesAsContribution).toBe(false);
  });

  it('F: prompt + implementation + tests + commit for one outcome is one root', () => {
    const rows = [
      story({
        id: 'prompt-1',
        originalInstruction: ARCHITECTURE,
        outcomeRootId: 'score-v2',
      }),
      story({
        id: 'impl-1',
        originalInstruction: ARCHITECTURE,
        createdFeatures: ['Score V2 evidence-maturity engine'],
        commitSha: 'abc1234def',
        testsPassed: true,
        outcomeRootId: 'score-v2',
      }),
    ];
    const grouped = groupDevelopmentStoriesToContributions(rows);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.sourceId).toBe('outcome:score-v2');
    expect(grouped[0]?.verified).toBe(true);
    expect(grouped[0]?.provenanceStoryIds).toHaveLength(2);
  });

  it('G: many prompts for the same improvement stay one root with rich provenance', () => {
    const prompts = Array.from({ length: 12 }, (_, i) =>
      story({
        id: `prompt-${i}`,
        originalInstruction: i % 3 === 0 ? 'continue' : ARCHITECTURE,
        outcomeRootId: 'score-v2',
        requestedAt: `2026-08-13T10:${String(i).padStart(2, '0')}:00.000Z`,
      }),
    );
    const implemented = story({
      id: 'impl-1',
      originalInstruction: ARCHITECTURE,
      createdFeatures: ['Canonical evidence roots'],
      commitSha: 'abc1234def',
      testsPassed: true,
      outcomeRootId: 'score-v2',
    });
    const grouped = groupDevelopmentStoriesToContributions([...prompts, implemented]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.provenanceStoryIds.length).toBeGreaterThan(8);
  });

  it('H: many commits for one known outcome are one root', () => {
    const commits = ['aaa1111', 'bbb2222', 'ccc3333'].map((sha, i) =>
      story({
        id: `commit-${i}`,
        originalInstruction: ARCHITECTURE,
        createdFeatures: ['Score V2 engine'],
        commitSha: sha,
        testsPassed: true,
        outcomeRootId: 'score-v2',
      }),
    );
    const grouped = groupDevelopmentStoriesToContributions(commits);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.commitShas).toHaveLength(3);
  });

  it('I: two distinct improvements in the same session are two roots', () => {
    const grouped = groupDevelopmentStoriesToContributions([
      story({
        id: 'a',
        chatId: 'session-1',
        originalInstruction: ARCHITECTURE,
        createdFeatures: ['Score V2 engine'],
        commitSha: 'aaa1111',
        testsPassed: true,
        outcomeRootId: 'score-v2',
      }),
      story({
        id: 'b',
        chatId: 'session-1',
        originalInstruction:
          'Specify a structural redesign of the secondary nav carousel so Home, Study, and Market share one geometry invariant.',
        createdFeatures: ['Shared nav carousel geometry'],
        commitSha: 'bbb2222',
        testsPassed: true,
        outcomeRootId: 'nav-carousel',
      }),
    ]);
    expect(grouped).toHaveLength(2);
    expect(grouped.map((item) => item.sourceId).sort()).toEqual(['outcome:nav-carousel', 'outcome:score-v2']);
  });

  it('J: independent reviewer later keeps the same root and strengthens validation', () => {
    const base = story({
      id: 'impl-1',
      originalInstruction: ARCHITECTURE,
      createdFeatures: ['Score V2 engine'],
      commitSha: 'abc1234def',
      testsPassed: true,
      outcomeRootId: 'score-v2',
    });
    const before = groupDevelopmentStoriesToContributions([base]);
    const after = groupDevelopmentStoriesToContributions([
      { ...base, reviewedBy: 'reviewer-profile-1' },
    ]);
    expect(before).toHaveLength(1);
    expect(after).toHaveLength(1);
    expect(before[0]?.sourceId).toBe(after[0]?.sourceId);
    expect(before[0]?.independentValidation).toBe(false);
    expect(after[0]?.independentValidation).toBe(true);
    expect(after[0]?.eligibility).toBe('independently_validated');
  });

  it('K: AI-assisted implementation preserves user architecture/direction/review without claiming all implementation', () => {
    const result = evaluateDevelopmentContributionEvidence(
      story({
        originalInstruction: ARCHITECTURE,
        createdFeatures: ['Score V2 engine'],
        commitSha: 'abc1234def',
        testsPassed: true,
        implementationAssisted: true,
        roles: ['founder', 'system_architect', 'requirements', 'review'],
      }),
    );
    expect(result.qualifiesAsContribution).toBe(true);
    expect(result.implementationAssisted).toBe(true);
    expect(result.roles).toEqual(expect.arrayContaining(['founder', 'system_architect', 'requirements', 'review']));
    expect(result.roles).not.toContain('implementation');

    const inferred = evaluateDevelopmentContributionEvidence(
      story({
        originalInstruction: ARCHITECTURE,
        createdFeatures: ['Score V2 engine'],
        commitSha: 'abc1234def',
        testsPassed: true,
        implementationAssisted: true,
      }),
    );
    expect(inferred.implementationAssisted).toBe(true);
    expect(inferred.roles).toEqual(expect.arrayContaining(['system_architect', 'requirements']));
    expect(inferred.roles).not.toContain('implementation');
  });

  it('L: legacy Cursor/chat backfill stays journal unless linked to a qualifying outcome', () => {
    const backfill = story({
      id: 'chat-1',
      originalInstruction: ARCHITECTURE,
      createdFeatures: ['Backfilled from chat transcript'],
      sourceStoryKey: 'chat:abc:turn:9',
      source: 'chat',
      sourceType: 'chat',
    });
    expect(isLegacyChatBackfill(backfill)).toBe(true);
    expect(evaluateDevelopmentContributionEvidence(backfill).qualifiesAsContribution).toBe(false);
    expect(groupDevelopmentStoriesToContributions([backfill])).toEqual([]);

    const linked = groupDevelopmentStoriesToContributions([
      backfill,
      story({
        id: 'impl-1',
        originalInstruction: ARCHITECTURE,
        createdFeatures: ['Score V2 engine'],
        commitSha: 'abc1234def',
        testsPassed: true,
        outcomeRootId: 'score-v2',
        metadata: { outcomeRootId: 'score-v2' },
      }),
      { ...backfill, id: 'chat-2', outcomeRootId: 'score-v2' },
    ]);
    expect(linked).toHaveLength(1);
    expect(linked[0]?.provenanceStoryIds).toContain('chat-2');
    expect(linked[0]?.provenanceStoryIds).not.toContain('chat-1');
  });

  it('M: unclassified platform development does not fabricate a domain', () => {
    const platform = story({
      originalInstruction: ARCHITECTURE,
      createdFeatures: ['Score V2 engine'],
      commitSha: 'abc1234def',
      testsPassed: true,
      area: 'score',
    });
    expect(classifiedDomainForDevelopmentStory(platform)).toBeNull();
    expect(
      groupDevelopmentStoriesToContributions([platform])[0]?.classifiedDomain,
    ).toBeNull();
    const classified = classifiedDomainForDevelopmentStory({
      ...platform,
      area: 'education_skills',
    });
    expect(classified).toBe('education_skills');
  });

  it('N: identical canonical evidence recomputes identically', () => {
    const rows = [
      story({
        id: 'prompt-1',
        originalInstruction: ARCHITECTURE,
        outcomeRootId: 'score-v2',
      }),
      story({
        id: 'impl-1',
        originalInstruction: ARCHITECTURE,
        createdFeatures: ['Score V2 engine'],
        commitSha: 'abc1234def',
        testsPassed: true,
        outcomeRootId: 'score-v2',
      }),
    ];
    expect(groupDevelopmentStoriesToContributions(rows)).toEqual(groupDevelopmentStoriesToContributions([...rows].reverse()));
    expect(evaluateDevelopmentContributionEvidence(rows[1]!)).toEqual(
      evaluateDevelopmentContributionEvidence({ ...rows[1]! }),
    );
  });

  it('O: historical surviving implementation can verify without a recorded test run', () => {
    const result = evaluateDevelopmentContributionEvidence(
      story({
        createdFeatures: ['Score V2 engine'],
        commitSha: 'abc1234def',
        metadata: { historicalReconstruction: true, survivingImplementation: true },
      }),
    );
    expect(result.qualifiesAsContribution).toBe(true);
    expect(result.eligibility).toBe('system_verified');
    expect(result.independentValidation).toBe(false);
    expect(result.reasons).toContain('historical_surviving_implementation');
  });
});
