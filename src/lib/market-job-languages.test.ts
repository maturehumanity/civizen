import { describe, expect, it } from 'vitest';

import {
  defaultMarketJobLanguages,
  filterMarketJobLanguageOptions,
  marketJobLanguageFlagCountry,
  marketJobLanguageLabel,
  normalizeMarketJobLanguageCode,
} from '@/lib/market-job-languages';

describe('market job languages', () => {
  it('normalizes regional tags to a base language', () => {
    expect(normalizeMarketJobLanguageCode('en-US')).toBe('en');
    expect(normalizeMarketJobLanguageCode('hy')).toBe('hy');
  });

  it('defaults to the UI language and the country’s primary language', () => {
    expect(defaultMarketJobLanguages('en-US', 'AM')).toEqual(['en', 'hy']);
    expect(defaultMarketJobLanguages('hy', 'AM')).toEqual(['hy']);
    expect(defaultMarketJobLanguages('en', 'US')).toEqual(['en']);
  });

  it('labels languages and maps them to a flag country', () => {
    expect(marketJobLanguageLabel('hy', 'en').toLowerCase()).toContain('armenian');
    expect(marketJobLanguageFlagCountry('hy')).toBe('AM');
    expect(marketJobLanguageFlagCountry('en')).toBe('US');
  });

  it('keeps selected languages first in the default list', () => {
    expect(filterMarketJobLanguageOptions('', ['ru'], 'en')[0]?.code).toBe('ru');
  });

  it('finds languages by English name', () => {
    expect(filterMarketJobLanguageOptions('georg', [], 'en').some((item) => item.code === 'ka')).toBe(true);
  });
});
