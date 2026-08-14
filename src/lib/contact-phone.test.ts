import { describe, expect, it } from 'vitest';

import {
  dialDigitsFromProfileCountry,
  digitsOnly,
  phoneLookupCandidates,
  phonesLikelyMatch,
} from '@/lib/contact-phone';

describe('contact phone matching', () => {
  it('strips formatting', () => {
    expect(digitsOnly('+1 (201) 555-0123')).toBe('12015550123');
  });

  it('reads dial digits from ISO country or stored +code', () => {
    expect(dialDigitsFromProfileCountry('US')).toBe('1');
    expect(dialDigitsFromProfileCountry('+1')).toBe('1');
  });

  it('adds the member country prefix for national numbers', () => {
    expect(phoneLookupCandidates('2015550123', '+1')).toEqual(
      expect.arrayContaining(['2015550123', '12015550123']),
    );
  });

  it('matches a national number to an E.164 profile', () => {
    expect(phonesLikelyMatch('(201) 555-0123', '12015550123', '1')).toBe(true);
    expect(phonesLikelyMatch('5550000', '12015550123', '1')).toBe(false);
  });
});
