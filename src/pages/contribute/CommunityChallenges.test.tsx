import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CommunityChallenges from '@/pages/contribute/CommunityChallenges';

const listBrowsableChallenges = vi.fn();
const listManagedChallenges = vi.fn();
const listOwnedLinkedProfileIds = vi.fn();

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1' },
  }),
}));

vi.mock('@/lib/challenges-api', () => ({
  listBrowsableChallenges: (...args: unknown[]) => listBrowsableChallenges(...args),
  listManagedChallenges: (...args: unknown[]) => listManagedChallenges(...args),
}));

vi.mock('@/lib/opportunities-api', () => ({
  listOwnedLinkedProfileIds: (...args: unknown[]) => listOwnedLinkedProfileIds(...args),
}));

const openChallenge = {
  id: 'ch-1',
  programId: 'prog-1',
  publisherProfileId: 'coord-1',
  title: 'Make evening walking routes safer after dark',
  problemStatement: 'Several streets used by people walking home from the market have no working lights.',
  whyItMatters: 'People avoid walking after dusk.',
  affected: 'Residents walking home',
  areaNodeId: null,
  scope: 'Two or three streets',
  successCriteria: 'Those streets have working lights within eight weeks.',
  status: 'active',
  evidenceLinks: null,
  constraints: null,
  resources: null,
  contextDetail: null,
  selectedProposalId: null,
  outcomeSummary: null,
  outcomeEvidence: null,
  successCriteriaResult: null,
  lessonsLearned: null,
  completedAt: null,
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-13T00:00:00.000Z',
};

describe('CommunityChallenges', () => {
  beforeEach(() => {
    listBrowsableChallenges.mockResolvedValue([openChallenge]);
    listManagedChallenges.mockResolvedValue([]);
    listOwnedLinkedProfileIds.mockResolvedValue([]);
  });

  it('shows a concise challenge card without success criteria or administration', async () => {
    render(
      <MemoryRouter>
        <CommunityChallenges />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Make evening walking routes safer after dark')).toBeInTheDocument();
    expect(
      screen.getByText('Several streets used by people walking home from the market have no working lights.'),
    ).toBeInTheDocument();
    expect(screen.getByText('contribute.challenges.stage.active')).toBeInTheDocument();
    expect(screen.getByText('contribute.challenges.cardAction.propose')).toBeInTheDocument();
    expect(screen.getByText('contribute.challenges.create')).toBeInTheDocument();
    expect(screen.queryByText(openChallenge.successCriteria)).not.toBeInTheDocument();
    expect(screen.queryByText('contribute.placeholder.comingSoonTitle')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Make evening walking routes safer after dark/ })).toHaveAttribute(
      'href',
      '/contribute/challenges/ch-1',
    );
  });
});
