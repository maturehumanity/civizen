import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OpportunityDetail from '@/pages/contribute/OpportunityDetail';

const getOpportunity = vi.fn();
const getMyParticipation = vi.fn();
const listOwnedLinkedProfileIds = vi.fn();
const listOpportunityParticipations = vi.fn();
const listParticipationEvidence = vi.fn();
const listParticipationEvaluations = vi.fn();
const applyToContributionOpportunity = vi.fn();
const listOpportunityApplicantIdentities = vi.fn();

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

vi.mock('@/lib/opportunities-api', () => ({
  getOpportunity: (...args: unknown[]) => getOpportunity(...args),
  getMyParticipation: (...args: unknown[]) => getMyParticipation(...args),
  listOwnedLinkedProfileIds: (...args: unknown[]) => listOwnedLinkedProfileIds(...args),
  listOpportunityParticipations: (...args: unknown[]) => listOpportunityParticipations(...args),
  listParticipationEvidence: (...args: unknown[]) => listParticipationEvidence(...args),
  listParticipationEvaluations: (...args: unknown[]) => listParticipationEvaluations(...args),
  applyToContributionOpportunity: (...args: unknown[]) => applyToContributionOpportunity(...args),
  listOpportunityApplicantIdentities: (...args: unknown[]) => listOpportunityApplicantIdentities(...args),
  withdrawOpportunityParticipation: vi.fn(),
  reviewOpportunityApplication: vi.fn(),
  startOpportunityWork: vi.fn(),
  addOpportunityEvidence: vi.fn(),
  submitOpportunityWork: vi.fn(),
  evaluateOpportunityWork: vi.fn(),
  setContributionOpportunityStatus: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const opportunity = {
  id: 'opp-1',
  publisherProfileId: 'org-1',
  title: 'Document a local clinic workflow',
  summary: 'Help a partner clinic record how intake currently works.',
  description: 'Interview staff and write one page.',
  status: 'open',
  opportunityKind: 'education_to_contribution',
  areaNodeId: null,
  requiredSkills: ['Documentation'],
  optionalSkills: [],
  locationText: null,
  isRemote: true,
  estimatedEffort: '6 hours',
  applicationDeadline: null,
  workStartsAt: null,
  workEndsAt: null,
  compensationStatus: 'learning',
  expectedOutcome: 'A one-page note',
  evidenceRequirements: 'Link to the note',
  evaluationCriteria: 'Usable by the clinic',
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-13T00:00:00.000Z',
};

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/contribute/professional/opp-1']}>
      <Routes>
        <Route path="/contribute/professional/:opportunityId" element={<OpportunityDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OpportunityDetail', () => {
  beforeEach(() => {
    getOpportunity.mockResolvedValue(opportunity);
    getMyParticipation.mockResolvedValue(null);
    listOwnedLinkedProfileIds.mockResolvedValue([]);
    listOpportunityParticipations.mockResolvedValue([]);
    listParticipationEvidence.mockResolvedValue([]);
    listParticipationEvaluations.mockResolvedValue([]);
    applyToContributionOpportunity.mockResolvedValue('part-1');
    listOpportunityApplicantIdentities.mockResolvedValue([]);
  });

  it('shows essential details and a minimal apply action', async () => {
    renderDetail();

    expect(await screen.findByText('Document a local clinic workflow')).toBeInTheDocument();
    expect(screen.getByText('Help a partner clinic record how intake currently works.')).toBeInTheDocument();
    expect(screen.getByText('contribute.opportunities.apply')).toBeInTheDocument();
    expect(screen.queryByText('A one-page note')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('contribute.opportunities.moreDetails'));
    expect(screen.getByText('A one-page note')).toBeInTheDocument();
  });

  it('submits a short application message', async () => {
    renderDetail();
    await screen.findByText('contribute.opportunities.apply');
    fireEvent.change(screen.getByLabelText('contribute.opportunities.applyMessage'), {
      target: { value: 'I can help this week.' },
    });
    fireEvent.click(screen.getByText('contribute.opportunities.apply'));
    await waitFor(() => {
      expect(applyToContributionOpportunity).toHaveBeenCalledWith('opp-1', 'I can help this week.');
    });
  });

  it('shows organizer applicant controls for the publishing profile', async () => {
    getOpportunity.mockResolvedValue({ ...opportunity, publisherProfileId: 'user-1' });
    listOpportunityParticipations.mockResolvedValue([
      {
        id: 'part-1',
        opportunityId: 'opp-1',
        participantProfileId: 'user-2',
        status: 'applied',
        verificationStatus: 'not_submitted',
        applicationMessage: 'I can help.',
        appliedAt: '2026-08-13T00:00:00.000Z',
        acceptedAt: null,
        acceptedBy: null,
        declinedAt: null,
        declinedBy: null,
        declineNote: null,
        activatedAt: null,
        submittedAt: null,
        completedAt: null,
        completedBy: null,
        withdrawnAt: null,
        cancelledAt: null,
        cancelledBy: null,
        createdAt: '2026-08-13T00:00:00.000Z',
        updatedAt: '2026-08-13T00:00:00.000Z',
      },
    ]);
    listOpportunityApplicantIdentities.mockResolvedValue([
      {
        participationId: 'part-1',
        profileId: 'user-2',
        displayName: 'Ada Example',
        username: 'ada',
        avatarUrl: null,
      },
    ]);

    renderDetail();

    expect(await screen.findByText('Ada Example')).toBeInTheDocument();
    expect(screen.getByText('@ada')).toBeInTheDocument();
    expect(screen.getByText('contribute.opportunities.applicantsTitle')).toBeInTheDocument();
    expect(screen.getByText('contribute.opportunities.accept')).toBeInTheDocument();
    expect(screen.queryByText('contribute.opportunities.apply')).not.toBeInTheDocument();
  });
});
