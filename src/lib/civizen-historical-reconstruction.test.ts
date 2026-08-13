import { describe, expect, it } from 'vitest';

import { groupDevelopmentStoriesToContributions } from '@/lib/civizen-development-evidence';
import {
  historicalStoriesForEvaluation,
  qualifyingHistoricalOutcomes,
  reconstructHistoricalDevelopmentOutcomes,
  shouldMergeProductCommits,
  type HistoricalCommit,
} from '@/lib/civizen-historical-reconstruction';

function commit(overrides: Partial<HistoricalCommit> & Pick<HistoricalCommit, 'sha' | 'subject'>): HistoricalCommit {
  return {
    authoredAt: overrides.authoredAt ?? '2026-08-04T12:00:00.000Z',
    files: overrides.files ?? ['src/pages/Example.tsx'],
    body: overrides.body,
    sha: overrides.sha,
    subject: overrides.subject,
  };
}

describe('historical development reconstruction', () => {
  it('does not merge same-day unrelated subsystems', () => {
    const decision = shouldMergeProductCommits(
      commit({
        sha: 'aaa1111',
        subject: 'Fix Home post composer ignoring taps on the empty field',
        files: ['src/pages/Home.tsx', 'src/components/ui/chat-bar.tsx'],
      }),
      commit({
        sha: 'bbb2222',
        subject: 'Score Experience from cumulative duration instead of job count',
        authoredAt: '2026-08-04T18:00:00.000Z',
        files: ['src/lib/civizen-score.ts', 'src/lib/profile-experience.ts'],
      }),
    );
    expect(decision.merge).toBe(false);
  });

  it('does not merge on similar text alone', () => {
    expect(
      shouldMergeProductCommits(
        commit({
          sha: 'aaa1111',
          subject: 'Polish Market header labels',
          files: ['src/pages/Market.tsx'],
        }),
        commit({
          sha: 'bbb2222',
          subject: 'Polish Market header labels again later',
          authoredAt: '2026-08-11T12:00:00.000Z',
          files: ['src/pages/Market.tsx'],
        }),
      ).merge,
    ).toBe(false);
  });

  it('merges successive overlapping named changes and keeps distinct capabilities separate', () => {
    const { outcomes } = reconstructHistoricalDevelopmentOutcomes({
      survivingPaths: [
        'src/pages/Home.tsx',
        'src/lib/civizen-score.ts',
        'src/lib/profile-experience.ts',
        'src/pages/study/StudyCivicLearning.tsx',
      ],
      commits: [
        commit({
          sha: 'aa11aa11aa11',
          subject: 'Fix Home post composer ignoring taps on the empty field',
          files: ['src/pages/Home.tsx'],
          authoredAt: '2026-08-11T08:30:00.000Z',
        }),
        commit({
          sha: 'bb22bb22bb22',
          subject: 'Add Home composer interaction gate and input-swap process rules',
          files: ['docs/04-operations/dev/AGENTS.md', 'scripts/verify-home-post-composer.mjs'],
          authoredAt: '2026-08-11T08:44:00.000Z',
        }),
        commit({
          sha: 'cc33cc33cc33',
          subject: 'Score Experience from cumulative duration instead of job count',
          files: ['src/lib/civizen-score.ts', 'src/lib/profile-experience.ts'],
          authoredAt: '2026-08-11T09:10:00.000Z',
        }),
        commit({
          sha: 'dd44dd44dd44',
          subject: 'Score Learning from highest education level, not entry count',
          files: ['src/lib/civizen-score.ts', 'src/pages/study/StudyCivicLearning.tsx'],
          authoredAt: '2026-08-11T09:15:00.000Z',
        }),
      ],
    });
    expect(outcomes).toHaveLength(3);
    expect(outcomes.filter((item) => item.commitShas.length === 2)).toHaveLength(1);
  });

  it('attaches publish/note satellites by version without minting extra outcomes', () => {
    const { outcomes, unreconstructed } = reconstructHistoricalDevelopmentOutcomes({
      survivingPaths: ['src/pages/Market.tsx'],
      commits: [
        commit({
          sha: 'ee55ee55ee55',
          subject: 'Polish Market header: hover labels',
          files: ['src/pages/Market.tsx'],
          authoredAt: '2026-08-04T14:21:00.000Z',
        }),
        commit({
          sha: 'ff66ff66ff66',
          subject: 'Publish Testing v0.1.170 with Market header UX polish',
          files: ['public/updates/android.json', 'src/lib/app-release.ts'],
          authoredAt: '2026-08-04T14:22:00.000Z',
        }),
        commit({
          sha: '990099009900',
          subject: 'Note Testing v0.1.170 for Market header UX polish',
          files: ['memory-bank/activeContext.md'],
          authoredAt: '2026-08-04T14:22:30.000Z',
        }),
      ],
    });
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]?.linkReasons).toContain('satellite_version_link');
    expect(unreconstructed.filter((item) => item.kind === 'commit')).toEqual([]);
  });

  it('links chat by SHA or filename+time, not by same-day wording', () => {
    const { outcomes } = reconstructHistoricalDevelopmentOutcomes({
      survivingPaths: ['src/lib/civizen-score.ts'],
      commits: [
        commit({
          sha: 'abc1234def56',
          subject: 'Redesign Score evidence maturity',
          files: ['src/lib/civizen-score.ts'],
          authoredAt: '2026-08-13T10:00:00.000Z',
        }),
      ],
      stories: [
        {
          id: 'chat-sha',
          originalInstruction: 'Please land abc1234def after the score redesign.',
          requestedAt: '2026-08-13T10:05:00.000Z',
        },
        {
          id: 'chat-weak',
          originalInstruction: 'ok continue with the same kind of polish today',
          requestedAt: '2026-08-13T11:00:00.000Z',
        },
      ],
    });
    expect(outcomes[0]?.storyIds).toContain('chat-sha');
    expect(outcomes[0]?.storyIds).not.toContain('chat-weak');
    expect(outcomes[0]?.attributionConfidence).toBe('high');
  });

  it('splits enumerated mega-commits when file sets are disjoint', () => {
    const filesA = Array.from({ length: 20 }, (_, i) => `src/pages/education-to-contribution/file-${i}.tsx`);
    const filesB = Array.from({ length: 20 }, (_, i) => `docs/institutional/file-${i}.md`);
    const { outcomes } = reconstructHistoricalDevelopmentOutcomes({
      survivingPaths: [...filesA, ...filesB],
      commits: [
        commit({
          sha: 'aabbccddeeff',
          subject: 'Ship Education-to-Contribution, and institutional foundations',
          files: [
            ...Array.from({ length: 20 }, (_, i) => `src/pages/education-to-contribution/file-${i}.tsx`),
            ...Array.from({ length: 20 }, (_, i) => `docs/institutional/file-${i}.md`),
          ],
        }),
      ],
    });
    expect(outcomes.length).toBeGreaterThanOrEqual(2);
    expect(outcomes.every((item) => item.linkReasons.includes('enumerated_capability_split'))).toBe(true);
  });

  it('does not score journal rows; reconstructed surviving work becomes fewer roots', () => {
    const journal = Array.from({ length: 20 }, (_, i) => ({
      id: `git:${i}`,
      sourceStoryKey: `git:${i}`,
      createdFeatures: [`Commit ${i} recorded from git history`],
      commitSha: `deadbeef${i.toString().padStart(4, '0')}`,
      originalInstruction: 'feat: record commit from history',
    }));
    const reconstructed = reconstructHistoricalDevelopmentOutcomes({
      survivingPaths: ['src/pages/Home.tsx', 'src/pages/Home.test.tsx'],
      commits: [
        commit({
          sha: 'feedface0001',
          subject: 'Fix Home post composer ignoring taps on the empty field',
          files: ['src/pages/Home.tsx', 'src/pages/Home.test.tsx'],
        }),
      ],
      stories: journal,
    });
    const stories = historicalStoriesForEvaluation(reconstructed.outcomes, journal);
    const grouped = groupDevelopmentStoriesToContributions(stories);
    expect(reconstructed.outcomes.length).toBeLessThan(journal.length);
    expect(grouped).toHaveLength(1);
    expect(qualifyingHistoricalOutcomes(reconstructed.outcomes)).toHaveLength(1);
    expect(grouped[0]?.eligibility).toBe('system_verified');
    expect(reconstructed.outcomes[0]?.reconstructionConfidence).toBe('high');
    expect(reconstructed.outcomes[0]?.contributionEvidenceConfidence).toBe('high');
  });

  it('keeps reconstruction confidence distinct from missing independent review', () => {
    const { outcomes } = reconstructHistoricalDevelopmentOutcomes({
      survivingPaths: ['src/lib/civizen-score.ts'],
      commits: [
        commit({
          sha: 'cafebabef00d',
          subject: 'Define Score V2 evidence-maturity architecture',
          files: ['src/lib/civizen-score.ts'],
        }),
      ],
    });
    expect(outcomes[0]?.reconstructionConfidence).toBe('high');
    expect(outcomes[0]?.implementationStory.reviewedBy ?? null).toBeNull();
    expect(groupDevelopmentStoriesToContributions([outcomes[0]!.implementationStory])[0]?.independentValidation).toBe(
      false,
    );
  });

  it('is deterministic', () => {
    const input = {
      survivingPaths: ['src/pages/Home.tsx'],
      commits: [
        commit({ sha: '111111111111', subject: 'Fix Home composer', files: ['src/pages/Home.tsx'] }),
        commit({ sha: '222222222222', subject: 'Hide Market chrome', files: ['src/pages/Market.tsx'], authoredAt: '2026-08-04T13:01:00.000Z' }),
      ],
    };
    expect(reconstructHistoricalDevelopmentOutcomes(input)).toEqual(reconstructHistoricalDevelopmentOutcomes(input));
  });

  it('reconstructs orphaned git journal against surviving HEAD without scoring the snapshot', () => {
    const snapshot = commit({
      sha: 'aaaaaaaaaaaa',
      subject: 'Civizen application snapshot under sole author attribution',
      files: Array.from({ length: 500 }, (_, i) => `src/legacy-${i}.ts`),
    });
    const journal = [
      {
        id: 'git-gov-1',
        sourceStoryKey: 'git:deadbeef0001dead',
        source: 'git',
        commitSha: 'deadbeef0001dead',
        title: 'feat(governance): hub and admin backends',
        originalInstruction: 'feat(governance): hub and admin backends',
        createdFeatures: ['Commit deadbeef recorded from git history'],
        requestedAt: '2026-04-23T10:00:00.000Z',
      },
      {
        id: 'git-gov-2',
        sourceStoryKey: 'git:deadbeef0002dead',
        source: 'git',
        commitSha: 'deadbeef0002dead',
        title: 'feat(governance): scheduler health details',
        originalInstruction: 'feat(governance): scheduler health details',
        createdFeatures: ['Commit deadbeef recorded from git history'],
        requestedAt: '2026-04-23T10:20:00.000Z',
      },
    ];
    const { outcomes } = reconstructHistoricalDevelopmentOutcomes({
      commits: [snapshot],
      stories: journal,
      survivingPaths: ['src/pages/Governance.tsx', 'src/lib/governance-public-audit-automation.ts'],
    });
    expect(outcomes.some((item) => /snapshot under sole author/i.test(item.title))).toBe(false);
    expect(outcomes.length).toBeGreaterThanOrEqual(1);
    expect(outcomes.length).toBeLessThan(journal.length);
    expect(qualifyingHistoricalOutcomes(outcomes).length).toBeGreaterThan(0);
    expect(outcomes.some((item) => item.storyIds.includes('git-gov-1'))).toBe(true);
  });
});
