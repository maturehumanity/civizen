import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OpportunityForm from '@/pages/contribute/OpportunityForm';

const createContributionOpportunity = vi.fn();
const getOpportunity = vi.fn();
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
  createContributionOpportunity: (...args: unknown[]) => createContributionOpportunity(...args),
  updateContributionOpportunity: vi.fn(),
  getOpportunity: (...args: unknown[]) => getOpportunity(...args),
  listOwnedLinkedProfileIds: (...args: unknown[]) => listOwnedLinkedProfileIds(...args),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('OpportunityForm', () => {
  beforeEach(() => {
    createContributionOpportunity.mockResolvedValue('opp-1');
    getOpportunity.mockResolvedValue(null);
    listOwnedLinkedProfileIds.mockResolvedValue([]);
  });

  it('asks for title and purpose first, keeping requirements behind more details', async () => {
    render(
      <MemoryRouter initialEntries={['/contribute/professional/new']}>
        <Routes>
          <Route path="/contribute/professional/new" element={<OpportunityForm />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('contribute.opportunities.titleLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('contribute.opportunities.summaryLabel')).toBeInTheDocument();
    expect(screen.queryByLabelText('contribute.opportunities.requirements')).not.toBeInTheDocument();
    expect(screen.queryByText('contribute.opportunities.assessmentDimensionsLabel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('contribute.opportunities.moreDetails'));
    expect(screen.getByLabelText('contribute.opportunities.requirements')).toBeInTheDocument();
    expect(screen.getByText('contribute.opportunities.assessmentDimensionsLabel')).toBeInTheDocument();
    expect(screen.getByLabelText('contribute.opportunities.dimension.quality')).toBeInTheDocument();
  });

  it('creates an opportunity through the RPC wrapper', async () => {
    render(
      <MemoryRouter initialEntries={['/contribute/professional/new']}>
        <Routes>
          <Route path="/contribute/professional/new" element={<OpportunityForm />} />
          <Route path="/contribute/professional/:opportunityId" element={<div>detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('contribute.opportunities.titleLabel'), {
      target: { value: 'Clinic workflow' },
    });
    fireEvent.change(screen.getByLabelText('contribute.opportunities.summaryLabel'), {
      target: { value: 'Document intake.' },
    });
    fireEvent.click(screen.getByText('contribute.opportunities.saveDraft'));

    await waitFor(() => {
      expect(createContributionOpportunity).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Clinic workflow',
          summary: 'Document intake.',
          status: 'draft',
        }),
      );
    });
  });
});
