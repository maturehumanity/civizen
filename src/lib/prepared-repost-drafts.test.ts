import { describe, expect, it } from 'vitest';

import {
  ARMEN_PROFILE_ID,
  ARMEN_WAR_PEACE_REPOST_DRAFT,
  CIVIZEN_WAR_PEACE_POST_ID,
  getPreparedRepostDraft,
} from '@/lib/prepared-repost-drafts';

describe('prepared-repost-drafts', () => {
  it('returns Armen war/peace draft only for the matching profile and original', () => {
    expect(
      getPreparedRepostDraft({
        activeProfileId: ARMEN_PROFILE_ID,
        originalPostId: CIVIZEN_WAR_PEACE_POST_ID,
      }),
    ).toBe(ARMEN_WAR_PEACE_REPOST_DRAFT);
  });

  it('does not return a draft for other accounts or posts', () => {
    expect(
      getPreparedRepostDraft({
        activeProfileId: 'someone-else',
        originalPostId: CIVIZEN_WAR_PEACE_POST_ID,
      }),
    ).toBe('');
    expect(
      getPreparedRepostDraft({
        activeProfileId: ARMEN_PROFILE_ID,
        originalPostId: 'other-post',
      }),
    ).toBe('');
  });
});
