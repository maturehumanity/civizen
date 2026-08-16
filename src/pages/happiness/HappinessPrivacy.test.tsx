import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const saveAggregateParticipation = vi.fn(async (_id: string, enabled: boolean) => ({
  profileId: 'profile-1',
  enabled,
  enabledAt: enabled ? new Date().toISOString() : null,
  disabledAt: enabled ? null : new Date().toISOString(),
  policyVersion: 'wellbeing-aggregate-privacy-v1',
  updatedAt: new Date().toISOString(),
}));

vi.mock('@/lib/happiness/aggregate/api', () => ({
  loadAggregateParticipation: async () => ({
    profileId: 'profile-1',
    enabled: false,
    enabledAt: null,
    disabledAt: null,
    policyVersion: 'wellbeing-aggregate-privacy-v1',
    updatedAt: new Date().toISOString(),
  }),
  saveAggregateParticipation: (...args: unknown[]) => saveAggregateParticipation(...(args as [string, boolean])),
}));

vi.mock('@/lib/happiness/api', () => ({
  saveHappinessPrivacy: vi.fn(),
  deleteAllHappinessData: vi.fn(),
  deleteHappinessCheckIn: vi.fn(),
  loadHappinessWorkspace: async () => ({
    view: {
      modelVersion: 'happiness-level-v1',
      overallLevel: 'balanced',
      trend: { direction: 'unknown' },
      confidence: 'low',
      strongestDomains: [],
      attentionDomains: [],
      domainLevels: {},
      latestCheckIn: {
        id: 'c1',
        profileId: 'profile-1',
        feeling: 'good',
        affectingMost: null,
        areas: [],
        note: 'keep-private-note',
        createdAt: '2026-08-15T12:00:00Z',
      },
      pendingFollowUp: null,
      observationCount: 1,
      computedAt: new Date().toISOString(),
    },
    privacy: {
      profileId: 'profile-1',
      checkinsEnabled: true,
      recommendationsEnabled: true,
      optionalSharingEnabled: false,
      updatedAt: new Date().toISOString(),
    },
    checkIns: [
      {
        id: 'c1',
        profileId: 'profile-1',
        feeling: 'good',
        affectingMost: null,
        areas: [],
        note: 'keep-private-note',
        createdAt: '2026-08-15T12:00:00Z',
      },
    ],
    pulses: [],
    reviews: [],
    causes: [],
    actions: [],
    outcomes: [],
    selections: [],
    backendMissing: false,
  }),
}));

vi.mock('@/lib/happiness/use-happiness', () => ({
  useHappinessWorkspace: () => ({
    result: {
      view: { overallLevel: 'balanced' },
      privacy: {
        profileId: 'profile-1',
        checkinsEnabled: true,
        recommendationsEnabled: true,
        optionalSharingEnabled: false,
        updatedAt: new Date().toISOString(),
      },
      checkIns: [
        {
          id: 'c1',
          profileId: 'profile-1',
          feeling: 'good',
          affectingMost: null,
          areas: [],
          note: 'keep-private-note',
          createdAt: '2026-08-15T12:00:00Z',
        },
      ],
      pulses: [],
      reviews: [],
      causes: [],
      actions: [],
      outcomes: [],
      selections: [],
      backendMissing: false,
    },
    reload: async () => undefined,
  }),
}));

vi.mock('@/lib/happiness/fulfillment/api', () => ({
  listFulfillmentPlans: async () => [],
  deleteFulfillmentPlan: vi.fn(),
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'profile-1', user_id: 'user-1' }, loading: false }),
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

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));

import HappinessPrivacy from '@/pages/happiness/HappinessPrivacy';

describe('Happiness Privacy aggregate participation', () => {
  beforeEach(() => {
    saveAggregateParticipation.mockClear();
  });

  it('shows a separate opt-in, keeps copy accurate, and can enable then disable', async () => {
    render(
      <MemoryRouter>
        <HappinessPrivacy />
      </MemoryRouter>,
    );
    await screen.findByText('Privacy-protected group insights');
    expect(screen.getByText(/individual Happiness & Fulfillment information remains private/i)).toBeTruthy();
    expect(screen.getByText(/not automatically rewritten/i)).toBeTruthy();
    expect(screen.getByText('Optional sharing')).toBeTruthy();
    expect(screen.queryByText(/completely anonymous/i)).toBeNull();
    const toggle = screen.getByRole('switch', { name: 'Privacy-protected group insights' });
    fireEvent.click(toggle);
    await waitFor(() => expect(saveAggregateParticipation).toHaveBeenCalledWith('profile-1', true));
    fireEvent.click(screen.getByRole('switch', { name: 'Privacy-protected group insights' }));
    await waitFor(() => expect(saveAggregateParticipation).toHaveBeenCalledWith('profile-1', false));
    expect(screen.getByText(/good/i)).toBeTruthy();
    expect(screen.getByText('Optional sharing')).toBeTruthy();
  });
});
