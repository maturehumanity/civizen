import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

vi.mock('@/lib/happiness/api', () => ({
  recordHappinessAction: vi.fn(),
  saveHappinessCause: vi.fn(),
  loadHappinessWorkspace: vi.fn(),
}));

vi.mock('@/lib/happiness/fulfillment/api', () => ({
  createFulfillmentPlan: vi.fn(),
  savePlanFactor: vi.fn(),
  saveRecommendationFeedback: vi.fn(),
  linkPlanIntervention: vi.fn(),
  listFulfillmentPlans: vi.fn(async () => []),
  listRecommendationFeedback: vi.fn(async () => []),
}));

vi.mock('@/lib/work-fulfillment/api', () => ({
  loadShareablePreferences: vi.fn(async () => ({ approved: false })),
}));

vi.mock('@/lib/happiness/use-happiness', () => ({
  useHappinessWorkspace: () => ({
    result: {
      view: { attentionDomains: ['time_life_balance'] },
      privacy: { recommendationsEnabled: true },
      checkIns: [],
      actions: [],
      outcomes: [],
    },
    reload: vi.fn(),
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'profile-1' }, loading: false }),
}));

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');
  return {
    useLanguage: () => ({
      language: 'en',
      t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
    }),
  };
});

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));

import HappinessImprove from '@/pages/happiness/HappinessImprove';

describe('HappinessImprove Phase 3', () => {
  it('delegates Work Fulfillment to the specialized workspace and Marketplace Jobs', () => {
    render(
      <MemoryRouter initialEntries={['/happiness/improve?domain=work_fulfillment']}>
        <HappinessImprove />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Work Fulfillment' })).toHaveAttribute('href', '/happiness/work');
    expect(screen.getByRole('link', { name: 'Look for a job' })).toHaveAttribute('href', '/market?section=jobs');
    expect(screen.getByText(/Contribution Fit is for trying/i)).toBeInTheDocument();
    expect(screen.queryByText('What would better look like?')).not.toBeInTheDocument();
  });

  it('starts a generic domain plan at 390px-friendly copy without a percent complete', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/happiness/improve?domain=time_life_balance']}>
        <HappinessImprove />
      </MemoryRouter>,
    );
    expect(screen.getByText('Improving Time & Life Balance')).toBeInTheDocument();
    expect(screen.getByText('What would better look like?')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Not relevant' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Not now' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Tried before' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Save for later' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/You selected this life area/i).length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/% complete|Job Fit score/i);
  });
});
