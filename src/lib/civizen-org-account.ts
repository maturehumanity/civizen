import { supabase } from '@/integrations/supabase/client';

/** Official Civizen org business slug on `linked_accounts`. */
export const CIVIZEN_BUSINESS_NAME_NORMALIZED = 'civizen';

/** Live username for the official Civizen organization profile. */
export const CIVIZEN_ORG_USERNAME = 'civizen';

/** LinkedIn company page organization id. */
export const CIVIZEN_LINKEDIN_ORG_ID = '143053953';

export type SocialProvider = 'linkedin' | 'facebook' | 'x';

export const SOCIAL_PROVIDERS: readonly SocialProvider[] = ['linkedin', 'facebook', 'x'] as const;

export function isSocialProvider(value: unknown): value is SocialProvider {
  return value === 'linkedin' || value === 'facebook' || value === 'x';
}

/** Sync username heuristic (not sufficient alone for authz). */
export function profileLooksLikeOfficialCivizenOrg(profile: {
  username?: string | null;
} | null | undefined): boolean {
  const username = profile?.username?.trim().toLowerCase() ?? '';
  return username === CIVIZEN_ORG_USERNAME;
}

/**
 * True when `profileId` is the business-linked side of the official Civizen org
 * (`business_name_normalized = civizen`), or username fallback matches `@civizen`.
 */
export async function isOfficialCivizenOrgProfile(
  profileId: string | null | undefined,
  options?: { username?: string | null },
): Promise<boolean> {
  if (!profileId) return false;

  if (options?.username && profileLooksLikeOfficialCivizenOrg({ username: options.username })) {
    return true;
  }

  const { data, error } = await supabase
    .from('linked_accounts')
    .select('id')
    .eq('relationship_type', 'business')
    .eq('business_name_normalized', CIVIZEN_BUSINESS_NAME_NORMALIZED)
    .eq('linked_profile_id', profileId)
    .maybeSingle();

  if (!error && data?.id) return true;

  if (options?.username !== undefined) {
    return profileLooksLikeOfficialCivizenOrg({ username: options.username });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', profileId)
    .maybeSingle();

  return profileLooksLikeOfficialCivizenOrg(profile);
}

export function canShowPublishToSocial(params: {
  isOfficialOrg: boolean;
  viewerProfileId: string | null | undefined;
  postAuthorId: string | null | undefined;
}): boolean {
  return Boolean(
    params.isOfficialOrg
      && params.viewerProfileId
      && params.postAuthorId
      && params.viewerProfileId === params.postAuthorId,
  );
}
