import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ChallengeForm from '@/pages/contribute/ChallengeForm';

const createCommunityChallenge = vi.fn();
const getCommunityChallenge = vi.fn();
const listManagedPrograms = vi.fn();
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
    profile: { id: 'coord-1' },
  }),
}));

vi.mock('@/lib/challenges-api', () => ({
  createCommunityChallenge: (...args: unknown[]) => createCommunityChallenge(...args),
  updateCommunityChallenge: vi.fn(),
  setCommunityChallengeStatus: vi.fn(),
  getCommunityChallenge: (...args: unknown[]) => getCommunityChallenge(...args),
  listManagedPrograms: (...args: unknown[]) => listManagedPrograms(...args),
  createContributionProgram: vi.fn(),
}));

vi.mock('@/lib/opportunities-api', () => ({
  listOwnedLinkedProfileIds: (...args: unknown[]) => listOwnedLinkedProfileIds(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('ChallengeForm', () => {
  beforeEach(() => {
    createCommunityChallenge.mockResolvedValue('ch-1');
    getCommunityChallenge.mockResolvedValue(null);
    listOwnedLinkedProfileIds.mockResolvedValue([]);
    listManagedPrograms.mockResolvedValue([
      {
        id: 'prog-1',
        publisherProfileId: 'coord-1',
        title: 'Community Problem-Solving Lab',
        summary: 'Neighbors name a real local problem and carry one solution through.',
        description: null,
        status: 'active',
        programKind: 'community_problem_solving',
        areaNodeId: null,
        seedKey: null,
        createdAt: '2026-08-13T00:00:00.000Z',
        updatedAt: '2026-08-13T00:00:00.000Z',
      },
    ]);
  });

  it('asks for the problem first and keeps evidence behind more details', async () => {
    render(
      <MemoryRouter initialEntries={['/contribute/challenges/new']}>
        <Routes>
          <Route path="/contribute/challenges/new" element={<ChallengeForm />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('contribute.challenges.titleLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('contribute.challenges.problemLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('contribute.challenges.whyLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('contribute.challenges.criteriaLabel')).toBeInTheDocument();
    expect(screen.queryByLabelText('contribute.challenges.evidenceLabel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('contribute.challenges.moreDetails'));
    expect(screen.getByLabelText('contribute.challenges.evidenceLabel')).toBeInTheDocument();
  });

  it('creates a challenge through the RPC wrapper', async () => {
    render(
      <MemoryRouter initialEntries={['/contribute/challenges/new']}>
        <Routes>
          <Route path="/contribute/challenges/new" element={<ChallengeForm />} />
          <Route path="/contribute/challenges/:challengeId" element={<div>detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByLabelText('contribute.challenges.titleLabel');
    fireEvent.change(screen.getByLabelText('contribute.challenges.titleLabel'), {
      target: { value: 'Restore water to the shared community garden' },
    });
    fireEvent.change(screen.getByLabelText('contribute.challenges.problemLabel'), {
      target: { value: 'The neighborhood garden lost its water connection last season.' },
    });
    fireEvent.change(screen.getByLabelText('contribute.challenges.whyLabel'), {
      target: { value: 'The garden is one of the few shared growing spaces.' },
    });
    fireEvent.change(screen.getByLabelText('contribute.challenges.criteriaLabel'), {
      target: { value: 'Water reaches the beds and half are planted again.' },
    });
    fireEvent.click(screen.getByText('contribute.challenges.saveDraft'));

    await waitFor(() => {
      expect(createCommunityChallenge).toHaveBeenCalledWith(
        expect.objectContaining({
          programId: 'prog-1',
          title: 'Restore water to the shared community garden',
          status: 'draft',
        }),
      );
    });
  });
});
