import { describe, expect, it } from 'vitest';

import {
  canonicalContributionRecords,
  previewContributionRecords,
  queryContributionLedger,
} from '@/lib/civizen-contribution-ledger';
import { groupDevelopmentStoriesToContributions } from '@/lib/civizen-development-evidence';
import type { ContributionEvent } from '@/lib/civizen-contributions';

function event(overrides: Partial<ContributionEvent> & { sourceId: string }): ContributionEvent {
  return {
    profileId: 'p1',
    sourceTable: 'development_stories',
    sourceId: overrides.sourceId,
    eventType: overrides.eventType ?? 'development_story',
    title: overrides.title ?? `Outcome ${overrides.sourceId}`,
    summary: null,
    capacityEstimate: 78,
    impactEstimate: 78,
    collaborationEstimate: 35,
    beneficiaryEstimate: 75,
    verified: overrides.verified ?? true,
    occurredAt: overrides.occurredAt ?? '2026-08-04T12:00:00.000Z',
    rawMeta: overrides.rawMeta ?? { eligibility: 'system_verified' },
  };
}

describe('contribution ledger', () => {
  it('A: 86 contribution roots are all accessible through pagination', () => {
    const events = Array.from({ length: 86 }, (_, i) => event({ sourceId: `root-${i}` }));
    const first = queryContributionLedger(events, { page: 1, pageSize: 20 });
    const last = queryContributionLedger(events, { page: 5, pageSize: 20 });
    expect(first.total).toBe(86);
    expect(first.records).toHaveLength(20);
    expect(last.records).toHaveLength(6);
    expect(canonicalContributionRecords(events)).toHaveLength(86);
  });

  it('B: aggregate summary does not hide canonical roots', () => {
    const events = [
      ...Array.from({ length: 86 }, (_, i) => event({ sourceId: `dev-${i}` })),
      event({ sourceId: 'post-1', eventType: 'post', verified: false, title: 'Hello' }),
      event({ sourceId: 'post-2', eventType: 'post', verified: false, title: 'World' }),
    ];
    const preview = previewContributionRecords(events, 5);
    expect(preview).toHaveLength(5);
    expect(canonicalContributionRecords(events)).toHaveLength(88);
    expect(queryContributionLedger(events, { pageSize: 50, page: 2 }).records).toHaveLength(38);
  });

  it('I: filters, sorting, and search operate over canonical contributions', () => {
    const events = [
      event({ sourceId: 'score', title: 'Score V2 evidence architecture', occurredAt: '2026-08-13T10:00:00.000Z' }),
      event({ sourceId: 'nav', title: 'Shared nav carousel geometry', occurredAt: '2026-08-04T10:00:00.000Z' }),
      event({ sourceId: 'post', eventType: 'post', verified: false, title: 'Status update', rawMeta: {} }),
    ];
    expect(queryContributionLedger(events, { search: 'score' }).records).toHaveLength(1);
    expect(queryContributionLedger(events, { verified: 'verified' }).total).toBe(2);
    expect(queryContributionLedger(events, { sort: 'oldest' }).records[0]?.event.sourceId).toBe('nav');
    expect(queryContributionLedger(events, { contributionFunction: 'system_architecture' }).records[0]?.event.sourceId).toBe(
      'score',
    );
    expect(queryContributionLedger(events, { verificationKind: 'unverified' }).records[0]?.event.sourceId).toBe('post');
  });

  it('J: provenance-only journal is not exposed as a contribution record', () => {
    const journal = groupDevelopmentStoriesToContributions([
      {
        id: 'chat-1',
        sourceStoryKey: 'chat:abc:1',
        source: 'chat',
        originalInstruction: 'Define a new architecture that separates activity evaluation from accumulated reputation.',
        createdFeatures: ['Backfilled from chat transcript'],
      },
    ]);
    expect(journal).toEqual([]);
    expect(canonicalContributionRecords([])).toEqual([]);
  });
});
