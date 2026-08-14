import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ContributionsDetailsPanel } from '@/components/profile/ContributionsDetailsPanel';
import type { ContributionEvent } from '@/lib/civizen-contributions';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
  }),
}));

function makeEvent(index: number): ContributionEvent {
  return {
    profileId: 'p1',
    sourceTable: 'development_stories',
    sourceId: `root-${index}`,
    eventType: 'development_story',
    title: `Outcome ${index}`,
    summary: null,
    capacityEstimate: 78,
    impactEstimate: 78,
    collaborationEstimate: 35,
    beneficiaryEstimate: 75,
    verified: true,
    occurredAt: '2026-08-04T12:00:00.000Z',
    rawMeta: { eligibility: 'system_verified' },
  };
}

describe('ContributionsDetailsPanel', () => {
  it('C/H: preview does not imply additive points and links to the ledger', () => {
    const events = Array.from({ length: 12 }, (_, i) => makeEvent(i));
    render(
      <MemoryRouter>
        <ContributionsDetailsPanel
          open
          onOpenChange={() => {}}
          events={events}
          categoryInput={{
            score: 69.9,
            sourceCount: 12,
            verifiedSourceCount: 12,
            confidence: 'low',
            status: 'established',
            metrics: [],
          }}
          ledgerHref="/profile/contributions"
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('profile.contributionsDetails.reputationIntro')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'profile.contributionsDetails.viewLedger' })).toHaveAttribute(
      'href',
      '/profile/contributions',
    );
    expect(screen.queryByText(/78/)).toBeNull();
  });
});
