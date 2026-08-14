import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ContributionRecordDetail } from '@/components/profile/ContributionRecordDetail';
import { evaluateContributionLifecycle } from '@/lib/civizen-contribution-lifecycle';
import type { ContributionEvent } from '@/lib/civizen-contributions';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/civizen-contribution-evidence-store', () => ({
  recordContributionEvidence: vi.fn(),
}));

const event: ContributionEvent = {
  profileId: 'p1',
  sourceTable: 'development_stories',
  sourceId: 'root-0',
  eventType: 'development_story',
  title: 'Score V2 evidence architecture',
  summary: null,
  capacityEstimate: 78,
  impactEstimate: 78,
  collaborationEstimate: 35,
  beneficiaryEstimate: 75,
  verified: true,
  occurredAt: '2026-08-04T12:00:00.000Z',
  rawMeta: { eligibility: 'system_verified', testsPassed: true, provenanceStoryIds: ['chat-secret-id'] },
};

describe('ContributionRecordDetail', () => {
  it('shows summary by default and keeps unknown realized impact', () => {
    render(
      <ContributionRecordDetail
        selected={{ event, observation: evaluateContributionLifecycle(event) }}
        unknown="Unknown"
        onClose={() => undefined}
        onEventsUpdated={() => undefined}
      />,
    );
    expect(screen.getByTestId('contribution-record')).toBeTruthy();
    expect(screen.getByText('Score V2 evidence architecture')).toBeTruthy();
    expect(screen.getByText('profile.contributionsLedger.summary')).toBeTruthy();
    expect(screen.getByText('profile.contributionsLedger.details')).toBeTruthy();
    expect(screen.queryByText('chat-secret-id')).toBeNull();
  });
});
