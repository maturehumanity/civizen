import { render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
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

function renderForm(ui: ReactElement, initialEntry = '/fund/institutional') {
  return render(<MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>);
}

describe('FundingInterestForm', () => {
  it('prefills name, email, and country for a signed-in user', async () => {
    authState.user = { id: 'user-1', email: 'armen@example.com' };
    authState.profile = { full_name: 'Armen Yeremyan', country: 'United States' };

    renderForm(<FundingInterestForm lane="donation" showAccredited={false} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveValue('Armen Yeremyan');
    });
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('armen@example.com');
    expect(screen.getByLabelText(/country/i)).toHaveValue('United States');
  });

  it('leaves identity fields empty when logged out', () => {
    authState.user = null;
    authState.profile = null;

    renderForm(<FundingInterestForm lane="donation" showAccredited={false} />);

    expect(screen.getByLabelText(/full name/i)).toHaveValue('');
    expect(screen.getByLabelText(/^email$/i)).toHaveValue('');
    expect(screen.getByLabelText(/country/i)).toHaveValue('');
  });

  it('prefills the institutional message from Area query params', async () => {
    authState.user = null;
    authState.profile = null;

    renderForm(
      <FundingInterestForm lane="institutional" />,
      '/fund/institutional?area=education',
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/message/i)).toHaveValue(
        'I am inquiring about partnership related to Education.',
      );
    });
  });
});
