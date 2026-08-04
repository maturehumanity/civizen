import { describe, expect, it } from 'vitest';

import { ageFromDateOfBirth, filterMarketJobTypeOptions } from '@/lib/market-job-types';

describe('market-job-types', () => {
  it('filters job types by query and excludes selected', () => {
    expect(filterMarketJobTypeOptions('bak', [])).toEqual(expect.arrayContaining(['Baker']));
    expect(filterMarketJobTypeOptions('', ['Baker'])).not.toEqual(expect.arrayContaining(['Baker']));
  });

  it('derives age from date of birth', () => {
    expect(ageFromDateOfBirth('2000-01-15', new Date('2026-08-04'))).toBe('26');
    expect(ageFromDateOfBirth(null)).toBe('');
  });
});
