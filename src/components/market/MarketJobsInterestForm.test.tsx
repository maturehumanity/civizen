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

const detectVisitorLocationMock = vi.fn();

vi.mock('@/lib/device-location', () => ({
  detectVisitorLocation: (...args: unknown[]) => detectVisitorLocationMock(...args),
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
    detectVisitorLocationMock.mockReset();
    detectVisitorLocationMock.mockResolvedValue({
      city: 'Yerevan',
      regionCode: null,
      countryCode: 'AM',
      countryName: 'Armenia',
    });
  });

  it('hides Worker/Employer tabs for logged-in users and cycles job type labels', () => {
    render(<MemoryRouter><MarketJobsInterestForm /></MemoryRouter>);

    expect(screen.queryByTestId('market-jobs-mode-tabs')).not.toBeInTheDocument();
    expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent(/Full-time/);
    expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent(/Mid-level/);
    expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent(/immediately/);
    expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent(/Baker|Cashier|Cook|Driver/);
    expect(screen.getByLabelText('Engagement')).toHaveAttribute('data-token-emphasis', 'secondary');
    expect(screen.getByLabelText('Level')).toHaveAttribute('data-token-emphasis', 'secondary');
    expect(screen.getByLabelText('Arrangement')).toHaveAttribute('data-token-emphasis', 'secondary');
    expect(screen.getByLabelText('Start')).toHaveAttribute('data-token-emphasis', 'secondary');
    expect(screen.getByLabelText('Pay period')).toHaveAttribute('data-token-emphasis', 'secondary');
    expect(screen.getByLabelText('Job type')).toHaveAttribute('data-token-emphasis', 'primary');
    expect(screen.getByLabelText('Location')).toHaveAttribute('data-token-emphasis', 'primary');
    expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent('Bakersfield, CA');
    expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent(/\$\d/);
    expect(screen.getByAltText('United States')).toBeInTheDocument();
    expect(detectVisitorLocationMock).not.toHaveBeenCalled();
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
    expect(screen.getByText('Languages')).toBeInTheDocument();
    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monday', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English', pressed: true })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('market-jobs-add-language'));
    fireEvent.click(await screen.findByRole('option', { name: /Russian/i }));
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Weekdays only' } });

    fireEvent.click(screen.getByTestId('market-jobs-submit'));
    await waitFor(() => expect(submitMock).toHaveBeenCalled());
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'seeker',
        jobTypes: ['Cashier'],
        fullName: 'Armen Yeremyan',
        phoneNumber: '5550100',
        terms: ['Full-time', 'Mid-level', 'job', 'Immediately'],
        languages: ['en', 'ru'],
        notes: 'Weekdays only',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        hoursFrom: '09:00',
        hoursTo: '18:00',
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
    await waitFor(() => expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent('Yerevan'));
    fireEvent.click(screen.getByRole('button', { name: 'Employer' }));
    fireEvent.click(screen.getByLabelText('Job type'));
    fireEvent.click(await screen.findByRole('option', { name: 'Baker' }));

    fireEvent.change(screen.getByLabelText('Full name *'), { target: { value: 'Ada Cafe' } });
    fireEvent.change(screen.getByLabelText('Company name *'), { target: { value: 'Ada Cafe' } });
    fireEvent.change(screen.getByLabelText('Phone number *'), { target: { value: '5559999' } });
    fireEvent.click(screen.getByTestId('market-jobs-submit'));

    await waitFor(() => expect(submitMock).toHaveBeenCalled());
    expect(screen.queryByTestId('market-jobs-more-toggle')).not.toBeInTheDocument();
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'employer',
        jobTypes: ['Baker'],
        fullName: 'Ada Cafe',
        companyName: 'Ada Cafe',
        phoneNumber: '5559999',
        city: 'Yerevan',
        countryCode: 'AM',
        languages: [],
        userId: null,
        profileId: null,
      }),
    );
  });

  it('updates guide pay when the selected job type changes', async () => {
    render(<MemoryRouter><MarketJobsInterestForm /></MemoryRouter>);

    fireEvent.click(screen.getByLabelText('Job type'));
    fireEvent.click(await screen.findByRole('option', { name: 'Baker' }));
    expect(await screen.findByTestId('market-jobs-sentence')).toHaveTextContent('$3,200');

    fireEvent.click(await screen.findByRole('option', { name: 'Electrician' }));
    expect(await screen.findByTestId('market-jobs-sentence')).toHaveTextContent('$4,800');
  });

  it('opens engagement, level, arrangement, and start choices in the sentence', async () => {
    render(<MemoryRouter><MarketJobsInterestForm /></MemoryRouter>);

    fireEvent.click(screen.getByLabelText('Engagement'));
    fireEvent.click(screen.getByRole('button', { name: 'Part-time' }));
    fireEvent.click(screen.getByLabelText('Level'));
    fireEvent.click(screen.getByRole('button', { name: 'Senior' }));
    fireEvent.click(screen.getByLabelText('Arrangement'));
    fireEvent.click(screen.getByRole('button', { name: 'internship' }));
    fireEvent.click(screen.getByLabelText('Start'));
    fireEvent.click(screen.getByRole('button', { name: 'Within 2 weeks' }));

    expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent('Part-time');
    expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent('Senior');
    expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent('internship');
    expect(screen.getByTestId('market-jobs-sentence')).toHaveTextContent('Within 2 weeks');
  });
});
