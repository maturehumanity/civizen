import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FundingInterestForm } from '@/components/funding/FundingInterestForm';

const authState = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'armen@example.com' } as { id: string; email: string } | null,
  profile: {
    full_name: 'Armen Yeremyan',
    country: 'United States',
  } as { full_name: string | null; country: string | null } | null,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    profile: authState.profile,
  }),
}));

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');

  return {
    useLanguage: () => ({
      language: 'en',
      setLanguage: async () => {},
      t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
      getNode: (key: string) => key,
      languageOptions: [{ code: 'en', label: 'English' }],
      isLoadingLanguage: false,
    }),
  };
});

vi.mock('@/lib/funding/submit-interest', () => ({
  submitFundingInterest: vi.fn(async () => ({ ok: true })),
}));

describe('FundingInterestForm', () => {
  it('prefills name, email, and country for a signed-in user', async () => {
    authState.user = { id: 'user-1', email: 'armen@example.com' };
    authState.profile = { full_name: 'Armen Yeremyan', country: 'United States' };

    render(<FundingInterestForm lane="donation" showAccredited={false} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveValue('Armen Yeremyan');
    });
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('armen@example.com');
    expect(screen.getByLabelText(/country/i)).toHaveValue('United States');
  });

  it('leaves identity fields empty when logged out', () => {
    authState.user = null;
    authState.profile = null;

    render(<FundingInterestForm lane="donation" showAccredited={false} />);

    expect(screen.getByLabelText(/full name/i)).toHaveValue('');
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('');
    expect(screen.getByLabelText(/country/i)).toHaveValue('');
  });
});
