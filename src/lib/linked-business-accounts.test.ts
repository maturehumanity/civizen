import { describe, expect, it } from 'vitest';

import {
  buildAccountSwitcherOptions,
  businessConnectDisplayName,
  canSwitchBetweenLinkedAccounts,
  collectSwitchableProfileIds,
  orderAccountsAroundCurrent,
  emailLooksLikeBusinessName,
  isOwnerSingleBusinessConstraintError,
  normalizeBusinessName,
  parseBusinessConnectMatches,
  shouldUseConnectAction,
  slugifyUsername,
  toBusinessUsernameCandidate,
  type LinkedAccountSwitchRow,
} from '@/lib/linked-business-accounts';

function profile(id: string, fullName: string, username: string | null = id) {
  return { id, full_name: fullName, username, avatar_url: null, deleted_at: null };
}

function businessLink(
  owner: ReturnType<typeof profile>,
  linked: ReturnType<typeof profile>,
): LinkedAccountSwitchRow {
  return {
    owner_profile_id: owner.id,
    linked_profile_id: linked.id,
    relationship_type: 'business',
    owner,
    linked,
  };
}

describe('linked-business-accounts', () => {
  it('normalizes business names for uniqueness', () => {
    expect(normalizeBusinessName('  Healthy Vending Mart LLC  ')).toBe('healthy vending mart llc');
  });

  it('keeps short organization usernames under the biz_ prefix', () => {
    expect(toBusinessUsernameCandidate('Civizen')).toBe('biz_civizen');
    expect(toBusinessUsernameCandidate('Acme LLC')).toBe('biz_acme_llc');
  });

  it('does not truncate long organization names behind a biz_ prefix', () => {
    expect(slugifyUsername('Healthy Vending Mart LLC')).toBe('healthy_vending_mart_llc');
    expect(toBusinessUsernameCandidate('Healthy Vending Mart LLC')).toBe('healthy_vending_mart_llc');
    expect(toBusinessUsernameCandidate('Healthy Vending Mart LLC').length).toBeLessThanOrEqual(24);
  });

  it('detects the retired one-organization-per-owner unique index', () => {
    expect(
      isOwnerSingleBusinessConstraintError({
        message: 'duplicate key value violates unique constraint "idx_linked_accounts_owner_business_unique"',
      }),
    ).toBe(true);
    expect(
      isOwnerSingleBusinessConstraintError({
        message: 'duplicate key value violates unique constraint "idx_linked_accounts_business_name_unique"',
      }),
    ).toBe(false);
  });

  it('matches a company email domain to the typed organization name', () => {
    expect(emailLooksLikeBusinessName('info@healthyvendingmart.com', 'Healthy Vending Mart LLC')).toBe(true);
    expect(emailLooksLikeBusinessName('hello@gmail.com', 'Healthy Vending Mart LLC')).toBe(false);
  });

  it('lists sibling businesses when the current profile is one of the organizations', () => {
    const armen = profile('armen', 'Armen Yeremyan', 'armen');
    const civizen = profile('civizen', 'Civizen', 'civizen');
    const hvm = profile('hvm', 'Healthy Vending Mart LLC', null);
    const options = buildAccountSwitcherOptions({
      currentProfile: hvm,
      linkedAccounts: [businessLink(armen, hvm), businessLink(armen, civizen)],
    });

    expect(options.map((item) => item.profileId)).toEqual(['hvm', 'armen', 'civizen']);
    expect(options.find((item) => item.profileId === 'hvm')?.accountType).toBe('business');
    expect(options.find((item) => item.profileId === 'armen')?.accountType).toBe('personal');
    expect(options.find((item) => item.profileId === 'civizen')?.accountType).toBe('business');
  });

  it('places the current account in the middle with neighbors on both sides', () => {
    const ordered = orderAccountsAroundCurrent(
      [{ profileId: 'hvm' }, { profileId: 'armen' }, { profileId: 'civizen' }],
      'hvm',
    );
    expect(ordered.map((item) => item.profileId)).toEqual(['armen', 'hvm', 'civizen']);
  });

  it('treats sibling organizations as switchable', () => {
    const rows = [
      { owner_profile_id: 'armen', linked_profile_id: 'hvm' },
      { owner_profile_id: 'armen', linked_profile_id: 'civizen' },
    ];
    expect(canSwitchBetweenLinkedAccounts(rows, 'hvm', 'civizen')).toBe(true);
    expect(canSwitchBetweenLinkedAccounts(rows, 'hvm', 'armen')).toBe(true);
    expect(canSwitchBetweenLinkedAccounts(rows, 'hvm', 'stranger')).toBe(false);
    expect(collectSwitchableProfileIds('hvm', [
      businessLink(profile('armen', 'Armen'), profile('hvm', 'HVM')),
      businessLink(profile('armen', 'Armen'), profile('civizen', 'Civizen')),
    ]).has('civizen')).toBe(true);
  });

  it('uses Connect when an existing company match is present', () => {
    const matches = parseBusinessConnectMatches([
      {
        profile_id: 'hvm',
        full_name: 'Armen Yeremyan',
        match_reason: 'email_domain',
        already_linked_to_requester: false,
      },
    ]);
    expect(shouldUseConnectAction(matches[0] ?? null)).toBe(true);
    expect(businessConnectDisplayName(matches[0]!, 'Healthy Vending Mart LLC')).toBe('Healthy Vending Mart LLC');
  });
});
