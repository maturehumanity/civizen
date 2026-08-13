import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ChallengeDetail from '@/pages/contribute/ChallengeDetail';

const getCommunityChallenge = vi.fn();
const getContributionProgram = vi.fn();
const listChallengeProposals = vi.fn();
const getMyChallengeProposal = vi.fn();
const getImplementationProjectForChallenge = vi.fn();
const getSolutionRecordForChallenge = vi.fn();
const listProjectOpportunities = vi.fn();
const listUnlinkedCoordinatorOpportunities = vi.fn();
const listChallengeProposalIdentities = vi.fn();
const listOwnedLinkedProfileIds = vi.fn();
const submitChallengeProposal = vi.fn();
const selectChallengeProposal = vi.fn();
const completeCommunityChallenge = vi.fn();

let profileId = 'user-1';

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
    profile: { id: profileId },
  }),
}));

vi.mock('@/lib/challenges-api', () => ({
  getCommunityChallenge: (...args: unknown[]) => getCommunityChallenge(...args),
  getContributionProgram: (...args: unknown[]) => getContributionProgram(...args),
  listChallengeProposals: (...args: unknown[]) => listChallengeProposals(...args),
  getMyChallengeProposal: (...args: unknown[]) => getMyChallengeProposal(...args),
  getImplementationProjectForChallenge: (...args: unknown[]) => getImplementationProjectForChallenge(...args),
  getSolutionRecordForChallenge: (...args: unknown[]) => getSolutionRecordForChallenge(...args),
  listProjectOpportunities: (...args: unknown[]) => listProjectOpportunities(...args),
  listUnlinkedCoordinatorOpportunities: (...args: unknown[]) => listUnlinkedCoordinatorOpportunities(...args),
  listChallengeProposalIdentities: (...args: unknown[]) => listChallengeProposalIdentities(...args),
  submitChallengeProposal: (...args: unknown[]) => submitChallengeProposal(...args),
  selectChallengeProposal: (...args: unknown[]) => selectChallengeProposal(...args),
  completeCommunityChallenge: (...args: unknown[]) => completeCommunityChallenge(...args),
  setCommunityChallengeStatus: vi.fn(),
  recordChallengeOutcome: vi.fn(),
  createImplementationOpportunity: vi.fn(),
  linkImplementationOpportunity: vi.fn(),
}));

vi.mock('@/lib/opportunities-api', () => ({
  listOwnedLinkedProfileIds: (...args: unknown[]) => listOwnedLinkedProfileIds(...args),
}));

vi.mock('@/lib/knowledge-api', () => ({
  listManagedKnowledgeSpaces: vi.fn().mockResolvedValue([]),
  publishSolutionRecordAsResource: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const activeChallenge = {
  id: 'ch-1',
  programId: 'prog-1',
  publisherProfileId: 'coord-1',
  title: 'Restore water to the shared community garden',
  problemStatement: 'The neighborhood garden lost its water connection last season.',
  whyItMatters: 'The garden is one of the few shared growing spaces.',
  affected: null,
  areaNodeId: null,
  scope: null,
  successCriteria: 'Water reaches the beds and half are planted again.',
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

const submittedProposal = {
  id: 'prop-1',
  challengeId: 'ch-1',
  authorProfileId: 'user-2',
  title: 'Collect rainwater and water the beds with drip lines',
  rationale: 'A tank and drip tape can water the beds.',
  expectedResult: 'Beds receive water maintained by garden members.',
  implementationApproach: null,
  resourcesNeeded: null,
  risks: null,
  supportingEvidence: null,
  status: 'submitted',
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-13T00:00:00.000Z',
};

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/contribute/challenges/ch-1']}>
      <Routes>
        <Route path="/contribute/challenges/:challengeId" element={<ChallengeDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ChallengeDetail', () => {
  beforeEach(() => {
    profileId = 'user-1';
    getCommunityChallenge.mockResolvedValue(activeChallenge);
    getContributionProgram.mockResolvedValue({
      id: 'prog-1',
      title: 'Community Problem-Solving Lab',
      summary: 'Neighbors name a real local problem.',
      publisherProfileId: 'coord-1',
      description: null,
      status: 'active',
      programKind: 'community_problem_solving',
      areaNodeId: null,
      seedKey: null,
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T00:00:00.000Z',
    });
    listChallengeProposals.mockResolvedValue([]);
    getMyChallengeProposal.mockResolvedValue(null);
    getImplementationProjectForChallenge.mockResolvedValue(null);
    getSolutionRecordForChallenge.mockResolvedValue(null);
    listProjectOpportunities.mockResolvedValue([]);
    listUnlinkedCoordinatorOpportunities.mockResolvedValue([]);
    listChallengeProposalIdentities.mockResolvedValue([]);
    listOwnedLinkedProfileIds.mockResolvedValue([]);
    submitChallengeProposal.mockResolvedValue('prop-1');
    selectChallengeProposal.mockResolvedValue('proj-1');
    completeCommunityChallenge.mockResolvedValue('sol-1');
  });

  it('lets an ordinary participant submit a proposal and hides coordinator controls', async () => {
    renderDetail();

    expect(await screen.findByText('Restore water to the shared community garden')).toBeInTheDocument();
    expect(screen.getByText('contribute.challenges.submitProposal')).toBeInTheDocument();
    expect(screen.queryByText('contribute.challenges.selectProposal')).not.toBeInTheDocument();
    expect(screen.queryByText('contribute.challenges.complete')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('contribute.challenges.proposeTitle'), {
      target: { value: 'Collect rainwater and water the beds with drip lines' },
    });
    fireEvent.change(screen.getByLabelText('contribute.challenges.rationaleLabel'), {
      target: { value: 'A tank and drip tape can water the beds without a municipal reconnection.' },
    });
    fireEvent.change(screen.getByLabelText('contribute.challenges.resultLabel'), {
      target: { value: 'Beds receive water maintained by garden members.' },
    });
    fireEvent.click(screen.getByText('contribute.challenges.submitProposal'));

    await waitFor(() => {
      expect(submitChallengeProposal).toHaveBeenCalledWith(
        'ch-1',
        expect.objectContaining({
          title: 'Collect rainwater and water the beds with drip lines',
        }),
      );
    });
  });

  it('lets a coordinator select a proposal and blocks completion until an outcome exists', async () => {
    profileId = 'coord-1';
    listChallengeProposals.mockResolvedValue([submittedProposal]);
    getCommunityChallenge.mockResolvedValue({
      ...activeChallenge,
      status: 'proposal_review',
    });
    renderDetail();

    expect(await screen.findByText('contribute.challenges.selectProposal')).toBeInTheDocument();
    expect(screen.queryByText('contribute.challenges.submitProposal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('contribute.challenges.selectProposal'));
    await waitFor(() => {
      expect(selectChallengeProposal).toHaveBeenCalledWith('prop-1');
    });
  });

  it('does not offer completion before an implementation outcome is recorded', async () => {
    profileId = 'coord-1';
    getCommunityChallenge.mockResolvedValue({
      ...activeChallenge,
      status: 'implementation',
      selectedProposalId: 'prop-1',
    });
    getImplementationProjectForChallenge.mockResolvedValue({
      id: 'proj-1',
      challengeId: 'ch-1',
      proposalId: 'prop-1',
      publisherProfileId: 'coord-1',
      title: 'Rainwater and drip lines',
      summary: 'Fit a tank and drip tape.',
      status: 'active',
      keySteps: null,
      outcomeEvidence: null,
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T00:00:00.000Z',
    });
    renderDetail();

    const complete = await screen.findByText('contribute.challenges.complete');
    expect(complete.closest('button')).toBeDisabled();
    expect(screen.getByText('contribute.challenges.cannotComplete')).toBeInTheDocument();
    expect(completeCommunityChallenge).not.toHaveBeenCalled();
  });
});
