import { describe, expect, it } from 'vitest';

import {
  getAppBackFallback,
  shouldShowAppBack,
} from '@/lib/app-back-navigation';

describe('app-back-navigation', () => {
  it('hides back on bottom-nav hubs and shows it elsewhere', () => {
    expect(shouldShowAppBack('/')).toBe(false);
    expect(shouldShowAppBack('/study')).toBe(false);
    expect(shouldShowAppBack('/contribute')).toBe(false);
    expect(shouldShowAppBack('/market')).toBe(false);
    expect(shouldShowAppBack('/messaging')).toBe(false);

    expect(shouldShowAppBack('/settings')).toBe(true);
    expect(shouldShowAppBack('/settings/profile')).toBe(true);
    expect(shouldShowAppBack('/search')).toBe(true);
    expect(shouldShowAppBack('/profile')).toBe(true);
    expect(shouldShowAppBack('/earnings')).toBe(true);
    expect(shouldShowAppBack('/study/courses')).toBe(true);
    expect(shouldShowAppBack('/messaging/thread-1')).toBe(true);
  });

  it('falls back to section parents when history cannot pop', () => {
    expect(getAppBackFallback('/settings/profile')).toBe('/settings');
    expect(getAppBackFallback('/settings')).toBe('/');
    expect(getAppBackFallback('/messaging/abc')).toBe('/messaging');
    expect(getAppBackFallback('/study/foo')).toBe('/study');
    expect(getAppBackFallback('/market/sell')).toBe('/market');
    expect(getAppBackFallback('/u/armen')).toBe('/search');
    expect(getAppBackFallback('/earnings')).toBe('/');
  });
});
