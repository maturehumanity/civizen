import { describe, expect, it } from 'vitest';

import {
  canDeletePublishedPost,
  canEditPublishedPost,
  postShowsEditedIndicator,
} from '@/lib/post-edit-policy';

describe('post edit authorization', () => {
  const author = 'profile-author';
  const other = 'profile-other';

  it('lets the author edit a newly published post', () => {
    expect(
      canEditPublishedPost({
        postAuthorId: author,
        viewerProfileId: author,
      }),
    ).toBe(true);
  });

  it('lets the author edit an old post', () => {
    expect(
      canEditPublishedPost({
        postAuthorId: author,
        viewerProfileId: author,
      }),
    ).toBe(true);
  });

  it('lets only the current author profile edit, including organization/page actors', () => {
    expect(
      canEditPublishedPost({
        postAuthorId: 'org-civizen',
        viewerProfileId: 'org-civizen',
      }),
    ).toBe(true);
    expect(
      canEditPublishedPost({
        postAuthorId: author,
        viewerProfileId: other,
      }),
    ).toBe(false);
    expect(
      canDeletePublishedPost({
        postAuthorId: author,
        viewerProfileId: other,
      }),
    ).toBe(false);
  });

  it('shows Edited from edited_at, not from an unrelated field', () => {
    expect(postShowsEditedIndicator({ edited_at: null, is_edited: false })).toBe(false);
    expect(postShowsEditedIndicator({ edited_at: '2026-09-02T10:07:00.000Z', is_edited: true })).toBe(true);
  });
});
