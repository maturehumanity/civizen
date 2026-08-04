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
        pay_amount: null,
        user_id: 'u1',
        profile_id: 'p1',
      }),
    );
  });
});
