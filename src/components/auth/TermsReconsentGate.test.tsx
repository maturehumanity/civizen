import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TermsReconsentGate } from '@/components/auth/TermsReconsentGate';

const refreshProfile = vi.fn(async () => undefined);
const signOut = vi.fn(async () => undefined);

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: null,
    loading: false,
    profileLoadFailed: true,
    refreshProfile,
    signOut,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

describe('TermsReconsentGate profile recovery', () => {
  beforeEach(() => {
    refreshProfile.mockClear();
    signOut.mockClear();
  });

  it('offers Retry and Sign out instead of infinite Loading when profile load failed', async () => {
    render(
      <MemoryRouter>
        <TermsReconsentGate>
          <div>protected-content</div>
        </TermsReconsentGate>
      </MemoryRouter>,
    );

    expect(screen.queryByText('protected-content')).toBeNull();
    expect(screen.getByText('terms.profileLoadTitle')).toBeTruthy();
    expect(screen.queryByText('common.loading')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'terms.profileLoadRetry' }));
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'terms.profileLoadSignOut' }));
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
  });
});
