import { describe, expect, it, vi, beforeEach } from 'vitest';

import { submitMarketJobInterest } from '@/lib/submit-market-job-interest';

const insertMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: insertMock,
    }),
  },
}));

describe('submitMarketJobInterest', () => {
  beforeEach(() => {
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
  });

  it('rejects empty job types or name', async () => {
    await expect(
      submitMarketJobInterest({
        mode: 'seeker',
        jobTypes: [],
        city: '',
        regionCode: '',
        countryCode: '',
        payAmount: '',
        payPeriod: '',
        fullName: 'Ada',
        companyName: '',
        phoneCountryCode: '',
        phoneNumber: '',
        age: '',
        days: [],
        hoursFrom: '',
        hoursTo: '',
        terms: [],
        notes: '',
        userId: 'u1',
        profileId: 'p1',
      }),
    ).resolves.toEqual({ ok: false, message: 'Choose at least one job type.' });
  });

  it('inserts a seeker row', async () => {
    const result = await submitMarketJobInterest({
      mode: 'seeker',
      jobTypes: ['Baker'],
      city: 'Bakersfield',
      regionCode: 'CA',
      countryCode: 'US',
      payAmount: '275',
      payPeriod: 'Monthly pay',
      fullName: 'Ada Lovelace',
      companyName: 'Ignored',
      phoneCountryCode: 'US',
      phoneNumber: '5551234',
      age: '30',
      days: ['Monday'],
      hoursFrom: '09:00',
      hoursTo: '18:00',
      terms: ['Full-time'],
      notes: 'Hello',
      userId: 'u1',
      profileId: 'p1',
    });

    expect(result).toEqual({ ok: true });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'seeker',
        job_types: ['Baker'],
        full_name: 'Ada Lovelace',
        company_name: null,
        pay_amount: '275',
        user_id: 'u1',
        profile_id: 'p1',
      }),
    );
  });

  it('inserts a public employer row without an account', async () => {
    const result = await submitMarketJobInterest({
      mode: 'employer',
      jobTypes: ['Cook'],
      city: 'Yerevan',
      regionCode: '',
      countryCode: 'AM',
      payAmount: '200000',
      payPeriod: 'Monthly pay',
      fullName: 'Cafe Ararat',
      companyName: 'Cafe Ararat',
      phoneCountryCode: 'AM',
      phoneNumber: '55112233',
      age: '',
      days: [],
      hoursFrom: '',
      hoursTo: '',
      terms: ['Full-time'],
      notes: '',
    });

    expect(result).toEqual({ ok: true });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'employer',
        company_name: 'Cafe Ararat',
        user_id: null,
        profile_id: null,
      }),
    );
  });

  it('requires a phone number', async () => {
    await expect(
      submitMarketJobInterest({
        mode: 'seeker',
        jobTypes: ['Baker'],
        city: '',
        regionCode: '',
        countryCode: '',
        payAmount: '',
        payPeriod: '',
        fullName: 'Ada',
        companyName: '',
        phoneCountryCode: '',
        phoneNumber: '',
        age: '',
        days: [],
        hoursFrom: '',
        hoursTo: '',
        terms: [],
        notes: '',
      }),
    ).resolves.toEqual({ ok: false, message: 'Phone number is required.' });
  });
});
