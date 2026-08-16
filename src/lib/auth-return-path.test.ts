import { describe, expect, it } from 'vitest';

import { resolveAuthReturnPath } from '@/lib/auth-return-path';

describe('resolveAuthReturnPath', () => {
  it('returns the in-app path that sent the visitor to login', () => {
    expect(
      resolveAuthReturnPath({ from: { pathname: '/market', search: '?section=jobs' } }),
    ).toBe('/market?section=jobs');
  });

  it('falls back for missing, external, or auth-only paths', () => {
    expect(resolveAuthReturnPath(undefined)).toBe('/');
    expect(resolveAuthReturnPath({ from: { pathname: 'https://evil.example' } })).toBe('/');
    expect(resolveAuthReturnPath({ from: { pathname: '//evil.example' } })).toBe('/');
    expect(resolveAuthReturnPath({ from: { pathname: '/login' } })).toBe('/');
    expect(resolveAuthReturnPath({ from: { pathname: '/signup' } })).toBe('/');
  });
});
