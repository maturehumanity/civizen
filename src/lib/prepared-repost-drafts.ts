/**
 * Prepared (unpublished) Repost-with-thoughts drafts.
 * Never auto-publish — only prefill the composer when the matching member
 * opens Repost → Repost with thoughts on the matching original.
 */

export const CIVIZEN_WAR_PEACE_POST_ID = '53523ed2-100e-4732-b010-3e64e614ba24';
export const ARMEN_PROFILE_ID = '674ec23d-378d-4e08-9414-a7333bdfc110';

/** Founder reflection for the Civizen war/peace post — not yet published. */
export const ARMEN_WAR_PEACE_REPOST_DRAFT = `One of the questions behind Civizen is simple:

If almost everyone wants peace, why do we keep finding ourselves in wars?

I don't think the answer is that people naturally want conflict. I think we still rely on systems that allow fear, competition, and division to grow until violence becomes possible.

That is one of the reasons I'm building Civizen.

Peace needs more than goodwill. It needs systems designed for cooperation, understanding, and peaceful coexistence on the one planet we all share.`;

type PreparedRepostDraftLookup = {
  activeProfileId: string | null | undefined;
  originalPostId: string | null | undefined;
};

export function getPreparedRepostDraft(params: PreparedRepostDraftLookup): string {
  const profileId = params.activeProfileId?.trim();
  const originalId = params.originalPostId?.trim();
  if (!profileId || !originalId) return '';

  if (profileId === ARMEN_PROFILE_ID && originalId === CIVIZEN_WAR_PEACE_POST_ID) {
    return ARMEN_WAR_PEACE_REPOST_DRAFT;
  }

  return '';
}
