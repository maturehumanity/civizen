import { describe, expect, it } from 'vitest';

import {
  formatMarketJobPayAmount,
  guideMonthlyPayUsd,
  localizeGuideMonthlyPay,
} from '@/lib/market-job-guide-pay';

describe('market-job-guide-pay', () => {
  it('looks up a monthly USD guide for known job types', () => {
    expect(guideMonthlyPayUsd('Painter')).toBe(3750);
    expect(guideMonthlyPayUsd('painter')).toBe(3750);
    expect(guideMonthlyPayUsd('Unknown role')).toBe(3000);
  });

  it('localizes the guide into the visitor country currency', () => {
    expect(localizeGuideMonthlyPay(3750, 'US')).toEqual({ currency: 'USD', value: 3750 });
    expect(localizeGuideMonthlyPay(3750, 'AM').currency).toBe('AMD');
    expect(localizeGuideMonthlyPay(3750, 'AM').value).toBeGreaterThan(1_000_000);
  });

  it('formats pay without cents', () => {
    expect(formatMarketJobPayAmount(3750, 'US')).toBe('$3,750');
  });
});
