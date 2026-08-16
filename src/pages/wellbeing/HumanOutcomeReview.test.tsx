import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const review = {
  id: 'rev-1',
  scopeId: 'scope-1',
  candidateId: 'cand-1',
  challengeId: 'ch-1',
  projectId: 'proj-1',
  governanceSolutionId: null,
  solutionRecordId: 'sol-1',
  createdBy: 'profile-1',
  targetDomain: 'time_life_balance' as const,
  targetFactor: 'transportation',
  objective: 'Reduce the recurring transportation-related Time & Life Balance concern.',
  interventionTitle: 'Community Transit Access Pilot',
  operationalOutcome: 'Three new shuttle routes launched.',
  interpretation: null,
  uncertaintyNote: null,
  status: 'awaiting_evidence' as const,
  evidenceStrength: 'observation' as const,
  evidenceModelVersion: 'human-outcome-evidence-v1',
  comparisonModelVersion: 'human-outcome-compare-v1',
  interventionStartedAt: '2026-04-15T00:00:00.000Z',
  nextReviewWindow: 'quarter' as const,
  overlappingInterventions: false,
  compositionCaveat: false,
  evaluationPlanned: false,
  researchReference: null,
  publishedPublic: false,
  closedAt: null,
  closedReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const snapshots = [
  {
    id: 'base-1',
    periodStart: '2026-01-01',
    timeBucket: 'quarter',
    topic: 'domain_state',
    privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
    aggregationModelVersion: 'wellbeing-aggregate-v1',
    result: {
      kind: 'insight',
      scopeId: 'scope-1',
      topic: 'domain_state',
      domain: 'time_life_balance',
      timeBucket: 'quarter',
      periodStart: '2026-01-01',
      summary: 'Time & Life Balance appears to be a recurring concern among participating members in this qualifying group.',
      sufficiency: 'sufficient',
      confidence: 'moderate',
      sourceTypes: ['structured_domain_state'],
      privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
      aggregationModelVersion: 'wellbeing-aggregate-v1',
      suppression: null,
      participation: 'sufficient',
      groupedDistribution: { struggling: 'shown', flourishing: 'grouped' },
    },
  },
  {
    id: 'follow-1',
    periodStart: '2026-04-01',
    timeBucket: 'quarter',
    topic: 'domain_state',
    privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
    aggregationModelVersion: 'wellbeing-aggregate-v1',
    result: {
      kind: 'insight',
      scopeId: 'scope-1',
      topic: 'domain_state',
      domain: 'time_life_balance',
      timeBucket: 'quarter',
      periodStart: '2026-04-01',
      summary: 'Time & Life Balance concerns were less prominent among participating members in this qualifying group.',
      sufficiency: 'sufficient',
      confidence: 'moderate',
      sourceTypes: ['structured_domain_state'],
      privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
      aggregationModelVersion: 'wellbeing-aggregate-v1',
      suppression: null,
      participation: 'sufficient',
      groupedDistribution: { flourishing: 'shown', thriving: 'shown' },
    },
  },
];

const evidence = [{ id: 'e1', reviewId: 'rev-1', snapshotId: 'base-1', role: 'baseline' as const, periodOrder: 0 }];

vi.mock('@/lib/happiness/outcomes', async () => {
  const actual = await vi.importActual<typeof import('@/lib/happiness/outcomes')>('@/lib/happiness/outcomes');
  return {
    ...actual,
    getHumanOutcomeReview: async () => review,
    listHumanOutcomeReviews: async () => [review],
    listScopeSnapshotRecords: async () => snapshots,
    listReviewEvidence: async () => evidence,
    listReviewFactors: async () => [],
    listReviewEvents: async () => [{ id: 'ev1', reviewId: 'rev-1', eventType: 'launched', occurredAt: '2026-04-15T00:00:00.000Z', note: null }],
    listPublicOutcomeLessons: async () => [],
    addReviewEvidence: vi.fn(),
    addReviewFactor: vi.fn(),
    addReviewEvent: vi.fn(),
    updateHumanOutcomeReview: vi.fn(),
    publishPublicOutcomeLesson: vi.fn(),
  };
});

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/layout/AppPageHeader', () => ({
  AppPageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'profile-1', user_id: 'user-1' }, loading: false }),
}));

import HumanOutcomeReviewPage from '@/pages/wellbeing/HumanOutcomeReview';

describe('Human Outcome Review page', () => {
  beforeEach(() => {
    window.innerWidth = 390;
    window.innerHeight = 844;
  });

  it('renders operational vs human evidence without causal or score language', async () => {
    render(
      <MemoryRouter initialEntries={['/wellbeing-insights/outcome?review=rev-1']}>
        <HumanOutcomeReviewPage />
      </MemoryRouter>,
    );
    await screen.findByText('Human Outcome Review');
    expect(await screen.findByText('What was implemented')).toBeTruthy();
    expect(screen.getByText('Community Transit Access Pilot')).toBeTruthy();
    expect(screen.getAllByText(/Three new shuttle routes launched/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/does not establish causation/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\+12%|Happiness impact score/i)).toBeNull();
    fireEvent.change(screen.getByLabelText('Interpretation'), { target: { value: 'The transit pilot improved Happiness.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save interpretation' }));
    await waitFor(() => expect(screen.getByText(/Causal wording is not allowed/i)).toBeTruthy());
  });
});
