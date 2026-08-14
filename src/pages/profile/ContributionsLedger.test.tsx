import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import ContributionsLedger from '@/pages/profile/ContributionsLedger';
import type { ContributionEvent } from '@/lib/civizen-contributions';

const events: ContributionEvent[] = Array.from({ length: 86 }, (_, i) => ({
  profileId: 'p1',
  sourceTable: 'development_stories',
  sourceId: `root-${i}`,
  eventType: 'development_story',
  title: i === 0 ? 'Score V2 evidence architecture' : `Outcome ${i}`,
  summary: null,
  capacityEstimate: 78,
  impactEstimate: 78,
  collaborationEstimate: 35,
  beneficiaryEstimate: 75,
  verified: true,
  occurredAt: '2026-08-04T12:00:00.000Z',
  rawMeta: { eligibility: 'system_verified', testsPassed: i === 0, provenanceStoryIds: ['chat-secret-id'] },
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'p1', user_id: 'u1' } }),
}));

vi.mock('@/lib/civizen-contributions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/civizen-contributions')>('@/lib/civizen-contributions');
  return {
    ...actual,
    loadContributionEventsThenSync: async () => events,
  };
});

describe('ContributionsLedger page', () => {
  it('A/C/D: lists canonical roots and shows unknown impact in detail', async () => {
    render(
      <MemoryRouter initialEntries={['/profile/contributions?record=development_stories%7Croot-0']}>
        <Routes>
          <Route path="/profile/contributions" element={<ContributionsLedger />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId('contribution-record')).toBeTruthy();
    expect(screen.getAllByText('Score V2 evidence architecture').length).toBeGreaterThan(0);
    expect(screen.getAllByText('profile.contributionsDetails.unknown').length).toBeGreaterThan(0);
    expect(screen.getByText('profile.contributionsLedger.notAdditive')).toBeTruthy();
    expect(screen.queryByText('chat-secret-id')).toBeNull();
  });
});
