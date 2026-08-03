import { describe, expect, it } from 'vitest';

import { fundingInterestRowsToCsv } from './interest-csv';

describe('fundingInterestRowsToCsv', () => {
  it('escapes commas and quotes in messages', () => {
    const csv = fundingInterestRowsToCsv([
      {
        id: '1',
        lane: 'donation',
        full_name: 'Ada Lovelace',
        email: 'ada@example.com',
        organization: null,
        country: 'UK',
        indicated_amount_usd: 1000,
        currency: 'USD',
        message: 'Hello, "world"',
        accredited_investor_interest: null,
        accept_risk_disclosure: true,
        status: 'new',
        created_at: '2026-07-18T00:00:00.000Z',
      },
    ]);

    expect(csv).toContain('"Hello, ""world"""');
    expect(csv.split('\n')[0]).toContain('full_name');
  });
});
