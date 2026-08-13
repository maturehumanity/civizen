import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProfessionalOpportunities from '@/pages/contribute/ProfessionalOpportunities';

const listOpenOpportunities = vi.fn();
const listManagedOpportunities = vi.fn();
const listMyParticipations = vi.fn();
const listOpportunitiesByIds = vi.fn();
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

vi.mock('@/lib/opportunities-api', () => ({
  listOpenOpportunities: (...args: unknown[]) => listOpenOpportunities(...args),
  listManagedOpportunities: (...args: unknown[]) => listManagedOpportunities(...args),
  listMyParticipations: (...args: unknown[]) => listMyParticipations(...args),
  listOpportunitiesByIds: (...args: unknown[]) => listOpportunitiesByIds(...args),
  listOwnedLinkedProfileIds: (...args: unknown[]) => listOwnedLinkedProfileIds(...args),
}));

const openOpportunity = {
  id: 'opp-1',
  publisherProfileId: 'org-1',
  title: 'Document a local clinic workflow',
  summary: 'Help a partner clinic record how intake currently works.',
  description: null,
  status: 'open',
  opportunityKind: 'education_to_contribution',
  areaNodeId: null,
  requiredSkills: ['Documentation', 'Interviewing'],
  optionalSkills: [],
  locationText: null,
  isRemote: true,
  estimatedEffort: '6 hours',
  applicationDeadline: null,
  workStartsAt: null,
  workEndsAt: null,
  compensationStatus: 'learning',
  expectedOutcome: null,
  evidenceRequirements: null,
  evaluationCriteria: null,
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-13T00:00:00.000Z',
};

describe('ProfessionalOpportunities', () => {
  beforeEach(() => {
    listOpenOpportunities.mockResolvedValue([openOpportunity]);
    listManagedOpportunities.mockResolvedValue([]);
    listMyParticipations.mockResolvedValue([]);
    listOpportunitiesByIds.mockResolvedValue([openOpportunity]);
    listOwnedLinkedProfileIds.mockResolvedValue([]);
  });

  it('shows a compact open-opportunity list and create action', async () => {
    render(
      <MemoryRouter>
        <ProfessionalOpportunities />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Document a local clinic workflow')).toBeInTheDocument();
    expect(screen.getByText('Help a partner clinic record how intake currently works.')).toBeInTheDocument();
    expect(screen.getByText('Documentation · Interviewing')).toBeInTheDocument();
    expect(screen.getByText('contribute.opportunities.create')).toBeInTheDocument();
    expect(screen.queryByText('contribute.placeholder.comingSoonTitle')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Document a local clinic workflow/ })).toHaveAttribute(
      'href',
      '/contribute/professional/opp-1',
    );
  });

  it('lists current applications under My contributions with the next action', async () => {
    listMyParticipations.mockResolvedValue([
      {
        id: 'part-1',
        opportunityId: 'opp-1',
        participantProfileId: 'user-1',
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

    render(
      <MemoryRouter>
        <ProfessionalOpportunities />
      </MemoryRouter>,
    );

    expect(await screen.findByText('contribute.opportunities.myWorkTitle')).toBeInTheDocument();
    expect(screen.getByText('contribute.opportunities.nextAction.withdraw')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('contribute.opportunities.nextAction.apply')).not.toBeInTheDocument();
    });
  });
});
