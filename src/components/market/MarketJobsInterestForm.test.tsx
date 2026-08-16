import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { MarketJobsInterestForm } from '@/components/market/MarketJobsInterestForm';

const submitMock = vi.fn();

const authState = {
  user: { id: 'user-1' } as { id: string } | null,
  loading: false,
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
  } as Record<string, string | null>,
};

vi.mock('@/lib/submit-market-job-interest', () => ({
  submitMarketJobInterest: (...args: unknown[]) => submitMock(...args),
}));

vi.mock('@/components/market/MarketJobsBoard', () => ({
  MarketJobsBoard: () => <div data-testid="market-jobs-board" />,
}));

vi.mock('@/lib/geo-locations', () => ({
  listGeoRegions: async () => [{ code: 'CA', name: 'California' }],
  listGeoCities: async () => ['Bakersfield'],
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
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

const completeProfile = {
  id: 'profile-1',
  username: 'armen',
  full_name: 'Armen Yeremyan',
  phone_country_code: 'US',
  phone_number: '5550100',
  date_of_birth: '1990-01-01',
  city: 'Bakersfield',
  region_code: 'CA',
  country_code: 'US',
};

describe('MarketJobsInterestForm', () => {
  beforeEach(() => {
    submitMock.mockReset();
    submitMock.mockResolvedValue({ ok: true });
    authState.user = { id: 'user-1' };
    authState.loading = false;
    authState.profile = { ...completeProfile };
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('hides Worker/Employer tabs for logged-in users and cycles job type labels', () => {
    render(<MemoryRouter><MarketJobsInterestForm /></MemoryRouter>);

    expect(screen.queryByTestId('market-jobs-mode-tabs')).not.toBeInTheDocument();
    expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent(/Baker|Cashier|Cook|Driver/);
    expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent('Bakersfield, CA');
    expect(screen.getByAltText('United States')).toBeInTheDocument();
  });

  it('does not re-ask known identity fields after a job type is chosen', async () => {
    render(<MemoryRouter><MarketJobsInterestForm /></MemoryRouter>);

    expect(screen.queryByTestId('market-jobs-contact')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Job type'));
    fireEvent.click(await screen.findByRole('option', { name: 'Baker' }));

    expect(await screen.findByTestId('market-jobs-contact')).toBeInTheDocument();
    expect(screen.queryByTestId('market-jobs-identity-fields')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Armen Yeremyan')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('5550100')).not.toBeInTheDocument();
    const employment = screen.getByTestId('market-jobs-employment-agreement');
    expect(employment).toHaveAttribute('href', expect.stringContaining('type=employment'));
    expect(employment).toHaveAttribute('href', expect.stringContaining('position=Baker'));
    expect(employment).toHaveAttribute('href', expect.stringContaining('from=job'));
  });

  it('shows outlined identity fields only when profile values are missing', async () => {
    authState.profile = {
      ...completeProfile,
      full_name: '',
      phone_number: '',
      date_of_birth: '',
    };

    render(<MemoryRouter><MarketJobsInterestForm /></MemoryRouter>);

    fireEvent.click(screen.getByLabelText('Job type'));
    fireEvent.click(await screen.findByRole('option', { name: 'Baker' }));

    const identity = await screen.findByTestId('market-jobs-identity-fields');
    expect(identity.querySelector('legend')).toHaveTextContent('Full name');
    expect(screen.getByLabelText('Full name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Phone number *')).toBeInTheDocument();
    expect(screen.getByLabelText('Age')).toBeInTheDocument();
  });

  it('allows multi-select job types and formats them with or', async () => {
    render(<MemoryRouter><MarketJobsInterestForm /></MemoryRouter>);

    fireEvent.click(screen.getByLabelText('Job type'));
    fireEvent.click(await screen.findByRole('option', { name: 'Baker' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Barista' }));

    expect(await screen.findByTestId('market-jobs-sentence')).toHaveTextContent('Baker or Barista');
  });

  it('toggles more details and submits known profile values without showing them', async () => {
    render(<MemoryRouter><MarketJobsInterestForm /></MemoryRouter>);

    fireEvent.click(screen.getByLabelText('Job type'));
    fireEvent.click(await screen.findByRole('option', { name: 'Cashier' }));
    fireEvent.click(await screen.findByTestId('market-jobs-more-toggle'));
    expect(await screen.findByTestId('market-jobs-details')).toBeInTheDocument();
    expect(screen.getByLabelText('Hours from')).toBeInTheDocument();
    expect(screen.getByLabelText('Hours to')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('market-jobs-submit'));
    await waitFor(() => expect(submitMock).toHaveBeenCalled());
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'seeker',
        jobTypes: ['Cashier'],
        fullName: 'Armen Yeremyan',
        phoneNumber: '5550100',
        userId: 'user-1',
        profileId: 'profile-1',
      }),
    );
  });

  it('lets guests post without signing in and shows Worker/Employer tabs', async () => {
    authState.user = null;
    authState.profile = null;

    render(<MemoryRouter><MarketJobsInterestForm /></MemoryRouter>);

    expect(screen.getByTestId('market-jobs-mode-tabs')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Employer' }));
    fireEvent.click(screen.getByLabelText('Job type'));
    fireEvent.click(await screen.findByRole('option', { name: 'Baker' }));

    fireEvent.change(screen.getByLabelText('Full name *'), { target: { value: 'Ada Cafe' } });
    fireEvent.change(screen.getByLabelText('Company name *'), { target: { value: 'Ada Cafe' } });
    fireEvent.change(screen.getByLabelText('Phone number *'), { target: { value: '5559999' } });
    fireEvent.click(screen.getByTestId('market-jobs-submit'));

    await waitFor(() => expect(submitMock).toHaveBeenCalled());
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'employer',
        jobTypes: ['Baker'],
        fullName: 'Ada Cafe',
        companyName: 'Ada Cafe',
        phoneNumber: '5559999',
        userId: null,
        profileId: null,
      }),
    );
  });
});
