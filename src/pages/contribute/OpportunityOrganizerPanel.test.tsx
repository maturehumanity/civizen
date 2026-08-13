import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OpportunityOrganizerPanel } from '@/pages/contribute/OpportunityOrganizerPanel';

const listOpportunityApplicantIdentities = vi.fn();
const evaluateOpportunityWork = vi.fn();
const listWorkAssessmentsForParticipations = vi.fn();
const recordOpportunityWorkAssessment = vi.fn();
const toastError = vi.fn();

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/lib/opportunities-api', () => ({
  listOpportunityApplicantIdentities: (...args: unknown[]) => listOpportunityApplicantIdentities(...args),
  evaluateOpportunityWork: (...args: unknown[]) => evaluateOpportunityWork(...args),
  listWorkAssessmentsForParticipations: (...args: unknown[]) => listWorkAssessmentsForParticipations(...args),
  recordOpportunityWorkAssessment: (...args: unknown[]) => recordOpportunityWorkAssessment(...args),
  reviewOpportunityApplication: vi.fn(),
  setContributionOpportunityStatus: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: (...args: unknown[]) => toastError(...args) },
}));

const opportunity = {
  id: 'opp-1',
  publisherProfileId: 'org-1',
  title: 'Clinic workflow',
  summary: 'Document intake.',
  description: null,
  status: 'open' as const,
  opportunityKind: 'education_to_contribution' as const,
  areaNodeId: null,
  requiredSkills: ['Documentation'],
  optionalSkills: [],
  locationText: null,
  isRemote: true,
  estimatedEffort: '6 hours',
  applicationDeadline: null,
  workStartsAt: null,
  workEndsAt: null,
  compensationStatus: 'learning' as const,
  expectedOutcome: null,
  evidenceRequirements: null,
  evaluationCriteria: null,
  evaluationDimensions: [] as Array<'quality' | 'impact' | 'completion'>,
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-13T00:00:00.000Z',
};

const applicant = {
  id: 'part-1',
  opportunityId: 'opp-1',
  participantProfileId: 'user-2',
  status: 'submitted' as const,
  verificationStatus: 'pending' as const,
  applicationMessage: 'Done.',
  appliedAt: '2026-08-13T00:00:00.000Z',
  acceptedAt: null,
  acceptedBy: null,
  declinedAt: null,
  declinedBy: null,
  declineNote: null,
  activatedAt: null,
  submittedAt: '2026-08-14T00:00:00.000Z',
  completedAt: null,
  completedBy: null,
  withdrawnAt: null,
  cancelledAt: null,
  cancelledBy: null,
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
};

const verifiedApplicant = {
  ...applicant,
  status: 'completed' as const,
  verificationStatus: 'verified' as const,
  completedAt: '2026-08-15T00:00:00.000Z',
};

describe('OpportunityOrganizerPanel verification and evaluation', () => {
  beforeEach(() => {
    listOpportunityApplicantIdentities.mockResolvedValue([
      {
        participationId: 'part-1',
        profileId: 'user-2',
        displayName: 'Ada Example',
        username: 'ada',
        avatarUrl: null,
      },
    ]);
    listWorkAssessmentsForParticipations.mockResolvedValue([]);
    evaluateOpportunityWork.mockReset();
    evaluateOpportunityWork.mockResolvedValue('eval-1');
    recordOpportunityWorkAssessment.mockReset();
    recordOpportunityWorkAssessment.mockResolvedValue('assess-1');
    toastError.mockReset();
  });

  it('verifies submitted work without requiring evaluation scores', async () => {
    const onAction = vi.fn(async (action: () => Promise<unknown>) => {
      await action();
    });
    render(
      <MemoryRouter>
        <OpportunityOrganizerPanel
          opportunity={opportunity}
          applicants={[applicant]}
          busy={false}
          reviewingId="part-1"
          reviewEvidence={[]}
          evalFeedback="Clear write-up."
          evalSkills="Documentation"
          onReviewingId={vi.fn()}
          onEvalFeedback={vi.fn()}
          onEvalSkills={vi.fn()}
          onAction={onAction}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Ada Example')).toBeInTheDocument();
    expect(screen.queryByLabelText('contribute.opportunities.dimension.quality')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('contribute.opportunities.verify'));

    await waitFor(() => {
      expect(evaluateOpportunityWork).toHaveBeenCalledWith({
        participationId: 'part-1',
        decision: 'verified',
        feedback: 'Clear write-up.',
        skillNames: ['Documentation'],
      });
    });
    expect(recordOpportunityWorkAssessment).not.toHaveBeenCalled();
  });

  it('does not offer evaluation when the opportunity has no dimensions', async () => {
    render(
      <MemoryRouter>
        <OpportunityOrganizerPanel
          opportunity={opportunity}
          applicants={[verifiedApplicant]}
          busy={false}
          reviewingId={null}
          reviewEvidence={[]}
          evalFeedback=""
          evalSkills=""
          onReviewingId={vi.fn()}
          onEvalFeedback={vi.fn()}
          onEvalSkills={vi.fn()}
          onAction={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Ada Example')).toBeInTheDocument();
    expect(screen.queryByText('contribute.opportunities.assessmentEnter')).not.toBeInTheDocument();
    expect(screen.queryByText('contribute.opportunities.verify')).not.toBeInTheDocument();
  });

  it('records selected evaluation dimensions after verification', async () => {
    const onAction = vi.fn(async (action: () => Promise<unknown>) => {
      await action();
    });
    render(
      <MemoryRouter>
        <OpportunityOrganizerPanel
          opportunity={{ ...opportunity, evaluationDimensions: ['quality', 'impact'] }}
          applicants={[verifiedApplicant]}
          busy={false}
          reviewingId="part-1"
          reviewEvidence={[]}
          evalFeedback=""
          evalSkills=""
          onReviewingId={vi.fn()}
          onEvalFeedback={vi.fn()}
          onEvalSkills={vi.fn()}
          onAction={onAction}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('contribute.opportunities.dimension.quality')).toBeInTheDocument();
    expect(screen.queryByLabelText('contribute.opportunities.dimension.completion')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('contribute.opportunities.dimension.quality'), {
      target: { value: '82' },
    });
    fireEvent.change(screen.getByLabelText('contribute.opportunities.dimension.impact'), {
      target: { value: '70' },
    });
    fireEvent.click(screen.getByText('contribute.opportunities.assessmentSave'));

    await waitFor(() => {
      expect(recordOpportunityWorkAssessment).toHaveBeenCalledWith({
        participationId: 'part-1',
        scores: { quality: 82, impact: 70 },
        dimensions: ['quality', 'impact'],
        notes: '',
      });
    });
    expect(evaluateOpportunityWork).not.toHaveBeenCalled();
  });

  it('blocks evaluation scores outside 0–100', async () => {
    render(
      <MemoryRouter>
        <OpportunityOrganizerPanel
          opportunity={{ ...opportunity, evaluationDimensions: ['quality'] }}
          applicants={[verifiedApplicant]}
          busy={false}
          reviewingId="part-1"
          reviewEvidence={[]}
          evalFeedback=""
          evalSkills=""
          onReviewingId={vi.fn()}
          onEvalFeedback={vi.fn()}
          onEvalSkills={vi.fn()}
          onAction={vi.fn()}
        />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText('contribute.opportunities.dimension.quality'), {
      target: { value: '140' },
    });
    fireEvent.click(screen.getByText('contribute.opportunities.assessmentSave'));
    expect(toastError).toHaveBeenCalledWith('contribute.opportunities.assessmentScoresInvalid');
    expect(recordOpportunityWorkAssessment).not.toHaveBeenCalled();
  });
});
