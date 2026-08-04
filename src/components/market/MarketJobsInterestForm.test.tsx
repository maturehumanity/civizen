import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { MarketJobsInterestForm } from '@/components/market/MarketJobsInterestForm';

const submitMock = vi.fn();

vi.mock('@/lib/submit-market-job-interest', () => ({
  submitMarketJobInterest: (...args: unknown[]) => submitMock(...args),
}));

vi.mock('@/lib/geo-locations', () => ({
  listGeoRegions: async () => [{ code: 'CA', name: 'California' }],
  listGeoCities: async () => ['Bakersfield'],
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: {
      id: 'profile-1',
      username: 'armen',
      full_name: 'Armen Yeremyan',
      phone_country_code: 'US',
      phone_number: '5550100',
      date_of_birth: '1990-01-01',
      city: 'Bakersfield',
      region_code: 'CA',
      country_code: 'US',
    },
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

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('MarketJobsInterestForm', () => {
  beforeEach(() => {
    submitMock.mockReset();
    submitMock.mockResolvedValue({ ok: true });
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('hides Worker/Employer tabs for logged-in users and cycles job type labels', () => {
    render(<MarketJobsInterestForm />);

    expect(screen.queryByTestId('market-jobs-mode-tabs')).not.toBeInTheDocument();
    expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent(/Baker|Cashier|Cook|Driver/);
    expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent('Bakersfield, CA');
    expect(screen.getByAltText('United States')).toBeInTheDocument();
  });

  it('reveals contact fields after a job type is chosen and autofills known profile fields', async () => {
    render(<MarketJobsInterestForm />);

    expect(screen.queryByTestId('market-jobs-contact')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Job type'));
    fireEvent.click(await screen.findByRole('option', { name: 'Baker' }));

    expect(await screen.findByTestId('market-jobs-contact')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Armen Yeremyan')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5550100')).toBeInTheDocument();
  });

  it('allows multi-select job types and formats them with or', async () => {
    render(<MarketJobsInterestForm />);

    fireEvent.click(screen.getByLabelText('Job type'));
    fireEvent.click(await screen.findByRole('option', { name: 'Baker' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Barista' }));

    expect(await screen.findByTestId('market-jobs-sentence')).toHaveTextContent('Baker or Barista');
  });

  it('toggles more details and submits', async () => {
    render(<MarketJobsInterestForm />);

    fireEvent.click(screen.getByLabelText('Job type'));
    fireEvent.click(await screen.findByRole('option', { name: 'Cashier' }));
    fireEvent.click(await screen.findByTestId('market-jobs-more-toggle'));
    expect(await screen.findByTestId('market-jobs-details')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('market-jobs-submit'));
    await waitFor(() => expect(submitMock).toHaveBeenCalled());
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'seeker',
        jobTypes: ['Cashier'],
        fullName: 'Armen Yeremyan',
        userId: 'user-1',
        profileId: 'profile-1',
      }),
    );
  });
});
