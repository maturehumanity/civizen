import { describe, expect, it } from 'vitest';

import { getLanguageFlagCountryCode } from './i18n.runtime';

describe('getLanguageFlagCountryCode', () => {
  it('uses explicit region tags', () => {
    expect(getLanguageFlagCountryCode('en-US')).toBe('US');
    expect(getLanguageFlagCountryCode('en-GB')).toBe('GB');
    expect(getLanguageFlagCountryCode('nl-BE')).toBe('BE');
    expect(getLanguageFlagCountryCode('pt-BR')).toBe('BR');
  });

  it('maximizes bare language codes to a likely country', () => {
    expect(getLanguageFlagCountryCode('da')).toBe('DK');
    expect(getLanguageFlagCountryCode('nl')).toBe('NL');
    expect(getLanguageFlagCountryCode('ja')).toBe('JP');
  });

  it('applies special-case overrides', () => {
    expect(getLanguageFlagCountryCode('es-419')).toBe('MX');
    expect(getLanguageFlagCountryCode('eo')).toBe('');
  });
});
