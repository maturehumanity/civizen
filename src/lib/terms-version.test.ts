import { describe, expect, it } from 'vitest';

import {
  TERMS_ACCEPTANCE_VERSION,
  buildTermsAcceptanceProfilePatch,
  hasAcceptedCurrentTerms,
  isTermsReconsentAllowedPath,
  needsTermsReconsent,
  resolveTermsReconsentGate,
} from '@/lib/terms-version';

describe('terms-version', () => {
  it('uses the institutional v2 acceptance version', () => {
    expect(TERMS_ACCEPTANCE_VERSION).toBe('2026-08-01-purpose-alignment-v1');
  });

  it('treats missing or older versions as needing re-consent', () => {
    expect(needsTermsReconsent(undefined)).toBe(true);
    expect(needsTermsReconsent(null)).toBe(true);
    expect(needsTermsReconsent('')).toBe(true);
    expect(needsTermsReconsent('2026-06-22')).toBe(true);
    expect(hasAcceptedCurrentTerms('2026-06-22')).toBe(false);
  });

  it('treats the current version as accepted', () => {
    expect(needsTermsReconsent(TERMS_ACCEPTANCE_VERSION)).toBe(false);
    expect(hasAcceptedCurrentTerms(TERMS_ACCEPTANCE_VERSION)).toBe(true);
  });

  it('allows legal, privacy, recovery, and support paths during re-consent', () => {
    expect(isTermsReconsentAllowedPath('/terms')).toBe(true);
    expect(isTermsReconsentAllowedPath('/settings/legal')).toBe(true);
    expect(isTermsReconsentAllowedPath('/about/legal-status')).toBe(true);
    expect(isTermsReconsentAllowedPath('/settings/privacy')).toBe(true);
    expect(isTermsReconsentAllowedPath('/settings/help')).toBe(true);
    expect(isTermsReconsentAllowedPath('/fund/support')).toBe(true);
    expect(isTermsReconsentAllowedPath('/forgot-password')).toBe(true);
    expect(isTermsReconsentAllowedPath('/reset-password')).toBe(true);
    expect(isTermsReconsentAllowedPath('/')).toBe(false);
    expect(isTermsReconsentAllowedPath('/market')).toBe(false);
    expect(isTermsReconsentAllowedPath('/messaging')).toBe(false);
  });

  it('builds an acceptance patch only for affirmative methods', () => {
    const patch = buildTermsAcceptanceProfilePatch('reconsent', '2026-07-30T12:00:00.000Z');
    expect(patch).toEqual({
      terms_version: TERMS_ACCEPTANCE_VERSION,
      terms_accepted_at: '2026-07-30T12:00:00.000Z',
      terms_acceptance_method: 'reconsent',
    });
    expect(buildTermsAcceptanceProfilePatch('signup', '2026-07-30T12:00:00.000Z').terms_acceptance_method).toBe(
      'signup',
    );
  });

  it('gates old-version profiles on protected paths', () => {
    expect(
      resolveTermsReconsentGate({
        loading: false,
        hasUser: true,
        profileLoaded: true,
        termsVersion: '2026-06-22',
        pathname: '/',
      }),
    ).toBe('show-reconsent');

    expect(
      resolveTermsReconsentGate({
        loading: false,
        hasUser: true,
        profileLoaded: true,
        termsVersion: null,
        pathname: '/market',
      }),
    ).toBe('show-reconsent');
  });

  it('surfaces profile-unavailable when the profile row never loads', () => {
    expect(
      resolveTermsReconsentGate({
        loading: false,
        hasUser: true,
        profileLoaded: false,
        profileLoadFailed: true,
        termsVersion: undefined,
        pathname: '/',
      }),
    ).toBe('profile-unavailable');

    expect(
      resolveTermsReconsentGate({
        loading: false,
        hasUser: true,
        profileLoaded: false,
        profileLoadTimedOut: true,
        termsVersion: undefined,
        pathname: '/',
      }),
    ).toBe('profile-unavailable');
  });

  it('waits for profile only while a load is still in progress', () => {
    expect(
      resolveTermsReconsentGate({
        loading: false,
        hasUser: true,
        profileLoaded: false,
        profileLoadFailed: false,
        profileLoadTimedOut: false,
        termsVersion: undefined,
        pathname: '/',
      }),
    ).toBe('wait-for-profile');
  });

  it('passes through when the current version is accepted', () => {
    expect(
      resolveTermsReconsentGate({
        loading: false,
        hasUser: true,
        profileLoaded: true,
        termsVersion: TERMS_ACCEPTANCE_VERSION,
        pathname: '/',
      }),
    ).toBe('pass-through');
  });

  it('passes through allowed legal paths without implying acceptance', () => {
    expect(
      resolveTermsReconsentGate({
        loading: false,
        hasUser: true,
        profileLoaded: true,
        termsVersion: '2026-06-22',
        pathname: '/terms',
      }),
    ).toBe('pass-through');

    expect(
      resolveTermsReconsentGate({
        loading: false,
        hasUser: true,
        profileLoaded: true,
        termsVersion: '2026-06-22',
        pathname: '/about/legal-status',
      }),
    ).toBe('pass-through');
  });

  it('does not invent an acceptance decision on decline (no patch helper for decline)', () => {
    // Decline/sign-out must never call buildTermsAcceptanceProfilePatch.
    // Gate callers only invoke the patch builder on Accept.
    const decision = resolveTermsReconsentGate({
      loading: false,
      hasUser: true,
      profileLoaded: true,
      termsVersion: '2026-06-22',
      pathname: '/',
    });
    expect(decision).toBe('show-reconsent');
  });
});
