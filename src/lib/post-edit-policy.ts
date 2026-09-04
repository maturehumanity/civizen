import { permissionListHas, type AppPermission } from '@/lib/access-control';

/**
 * Existing actor model: the current profile must be the post's author_id.
 * Organization/Civizen posts are authored as that page's profile after account switch.
 * Ordinary social posts stay editable; this is not a formal civic-record lock.
 */
export function canEditPublishedPost(options: {
  postAuthorId: string | null | undefined;
  viewerProfileId: string | null | undefined;
  permissions?: AppPermission[] | null;
}): boolean {
  if (!options.postAuthorId || !options.viewerProfileId) return false;
  if (options.postAuthorId !== options.viewerProfileId) return false;
  if (
    options.permissions &&
    options.permissions.length > 0 &&
    !permissionListHas(options.permissions, 'post.edit_self')
  ) {
    return false;
  }
  return true;
}

export function canDeletePublishedPost(options: {
  postAuthorId: string | null | undefined;
  viewerProfileId: string | null | undefined;
  permissions?: AppPermission[] | null;
}): boolean {
  if (!options.postAuthorId || !options.viewerProfileId) return false;
  if (options.postAuthorId !== options.viewerProfileId) return false;
  if (
    options.permissions &&
    options.permissions.length > 0 &&
    !permissionListHas(options.permissions, 'post.delete_self')
  ) {
    return false;
  }
  return true;
}

/** Edited indicator is driven by a content-edit timestamp, not generic updated_at. */
export function postShowsEditedIndicator(post: {
  edited_at?: string | null;
  is_edited?: boolean | null;
}): boolean {
  return Boolean(post.edited_at) || post.is_edited === true;
}
