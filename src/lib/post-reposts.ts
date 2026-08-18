import { supabase } from '@/integrations/supabase/client';

export type PostAuthorPreview = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

export type PostPreview = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  is_edited?: boolean | null;
  edited_at?: string | null;
  author?: PostAuthorPreview | null;
};

export type PostRepostRow = {
  id: string;
  original_post_id: string | null;
  reposter_profile_id: string;
  commentary_post_id: string | null;
  created_at: string;
  original?: PostPreview | null;
  commentary?: PostPreview | null;
  reposter?: PostAuthorPreview | null;
};

const POST_SELECT = `
  id,
  content,
  created_at,
  author_id,
  is_edited,
  edited_at,
  author:profiles!posts_author_id_fkey(id, username, full_name, avatar_url)
`;

export const PREVIEW_CONTENT_CHARS = 220;

export function previewPostContent(content: string, max = PREVIEW_CONTENT_CHARS): {
  text: string;
  truncated: boolean;
} {
  const normalized = (content || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return { text: normalized, truncated: false };
  return { text: `${normalized.slice(0, max).trimEnd()}…`, truncated: true };
}

export function isCommentaryPostId(
  postId: string,
  reposts: Array<Pick<PostRepostRow, 'commentary_post_id'>>,
): boolean {
  return reposts.some((row) => row.commentary_post_id === postId);
}

export async function fetchRecentPostReposts(limit = 40): Promise<PostRepostRow[]> {
  const { data, error } = await supabase
    .from('post_reposts')
    .select(
      `
      id,
      original_post_id,
      reposter_profile_id,
      commentary_post_id,
      created_at,
      original:posts!post_reposts_original_post_id_fkey(${POST_SELECT}),
      commentary:posts!post_reposts_commentary_post_id_fkey(${POST_SELECT}),
      reposter:profiles!post_reposts_reposter_profile_id_fkey(id, username, full_name, avatar_url)
    `,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    original_post_id: row.original_post_id,
    reposter_profile_id: row.reposter_profile_id,
    commentary_post_id: row.commentary_post_id,
    created_at: row.created_at,
    original: (row.original as PostPreview | null) ?? null,
    commentary: (row.commentary as PostPreview | null) ?? null,
    reposter: (row.reposter as PostAuthorPreview | null) ?? null,
  }));
}

export async function fetchRepostCounts(postIds: string[]): Promise<Record<string, number>> {
  if (postIds.length === 0) return {};
  const { data, error } = await supabase
    .from('post_reposts')
    .select('original_post_id')
    .in('original_post_id', postIds);

  if (error) throw error;
  const counts: Record<string, number> = {};
  (data || []).forEach((row) => {
    if (!row.original_post_id) return;
    counts[row.original_post_id] = (counts[row.original_post_id] || 0) + 1;
  });
  return counts;
}

export async function fetchViewerRepostMap(
  viewerProfileId: string,
  postIds: string[],
): Promise<Record<string, string>> {
  if (!viewerProfileId || postIds.length === 0) return {};
  const { data, error } = await supabase
    .from('post_reposts')
    .select('id, original_post_id')
    .eq('reposter_profile_id', viewerProfileId)
    .in('original_post_id', postIds);

  if (error) throw error;
  const map: Record<string, string> = {};
  (data || []).forEach((row) => {
    if (row.original_post_id) map[row.original_post_id] = row.id;
  });
  return map;
}

export async function createPlainRepost(params: {
  originalPostId: string;
  reposterProfileId: string;
}): Promise<PostRepostRow> {
  const { data, error } = await supabase
    .from('post_reposts')
    .insert({
      original_post_id: params.originalPostId,
      reposter_profile_id: params.reposterProfileId,
      commentary_post_id: null,
    })
    .select(
      `
      id,
      original_post_id,
      reposter_profile_id,
      commentary_post_id,
      created_at
    `,
    )
    .single();

  if (error) throw error;
  return data as PostRepostRow;
}

export async function createRepostWithThoughts(params: {
  originalPostId: string;
  reposterProfileId: string;
  commentary: string;
}): Promise<{ repost: PostRepostRow; commentaryPost: PostPreview }> {
  const content = params.commentary.trim();
  if (!content) throw new Error('Commentary is required');

  const { data: commentaryPost, error: postError } = await supabase
    .from('posts')
    .insert({
      author_id: params.reposterProfileId,
      content,
    })
    .select(POST_SELECT)
    .single();

  if (postError || !commentaryPost) throw postError || new Error('Could not create commentary post');

  const { data: repost, error: repostError } = await supabase
    .from('post_reposts')
    .insert({
      original_post_id: params.originalPostId,
      reposter_profile_id: params.reposterProfileId,
      commentary_post_id: commentaryPost.id,
    })
    .select(
      `
      id,
      original_post_id,
      reposter_profile_id,
      commentary_post_id,
      created_at
    `,
    )
    .single();

  if (repostError || !repost) {
    // Best-effort cleanup so a failed link does not leave an orphan amplification post.
    await supabase.from('posts').delete().eq('id', commentaryPost.id);
    throw repostError || new Error('Could not create repost');
  }

  return {
    repost: repost as PostRepostRow,
    commentaryPost: commentaryPost as PostPreview,
  };
}

export async function deleteRepost(repostId: string): Promise<void> {
  const { data: existing, error: loadError } = await supabase
    .from('post_reposts')
    .select('id, commentary_post_id')
    .eq('id', repostId)
    .maybeSingle();

  if (loadError) throw loadError;
  if (!existing) return;

  const { error } = await supabase.from('post_reposts').delete().eq('id', repostId);
  if (error) throw error;

  // Deleting the repost relationship must never delete the original.
  // Commentary posts are owned by the reposter; remove them with the quote-repost.
  if (existing.commentary_post_id) {
    await supabase.from('posts').delete().eq('id', existing.commentary_post_id);
  }
}

export type HomeFeedItem =
  | {
      kind: 'original';
      key: string;
      sortAt: string;
      interactionPostId: string;
      repostTargetPostId: string;
      post: PostPreview;
      embeddedOriginal: null;
      repost: null;
    }
  | {
      kind: 'plain_repost';
      key: string;
      sortAt: string;
      interactionPostId: string;
      repostTargetPostId: string;
      post: PostPreview;
      embeddedOriginal: PostPreview;
      repost: PostRepostRow;
    }
  | {
      kind: 'quote_repost';
      key: string;
      sortAt: string;
      interactionPostId: string;
      repostTargetPostId: string;
      post: PostPreview;
      embeddedOriginal: PostPreview | null;
      repost: PostRepostRow;
    };

/** Merge canonical posts with amplification rows into one chronological feed. */
export function buildHomeFeedItems(
  posts: PostPreview[],
  reposts: PostRepostRow[],
): HomeFeedItem[] {
  const commentaryIds = new Set(
    reposts.map((row) => row.commentary_post_id).filter((id): id is string => Boolean(id)),
  );

  const items: HomeFeedItem[] = [];

  posts.forEach((post) => {
    if (commentaryIds.has(post.id)) return;
    items.push({
      kind: 'original',
      key: `post:${post.id}`,
      sortAt: post.created_at,
      interactionPostId: post.id,
      repostTargetPostId: post.id,
      post,
      embeddedOriginal: null,
      repost: null,
    });
  });

  reposts.forEach((repost) => {
    if (repost.commentary_post_id) {
      const commentary =
        repost.commentary ||
        posts.find((post) => post.id === repost.commentary_post_id) ||
        null;
      if (!commentary) return;
      items.push({
        kind: 'quote_repost',
        key: `repost:${repost.id}`,
        sortAt: repost.created_at,
        interactionPostId: commentary.id,
        repostTargetPostId: repost.original_post_id || commentary.id,
        post: commentary,
        embeddedOriginal: repost.original ?? null,
        repost,
      });
      return;
    }

    const original = repost.original;
    if (!original || !repost.original_post_id) return;
    items.push({
      kind: 'plain_repost',
      key: `repost:${repost.id}`,
      sortAt: repost.created_at,
      interactionPostId: original.id,
      repostTargetPostId: original.id,
      post: original,
      embeddedOriginal: original,
      repost,
    });
  });

  return items.sort(
    (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime(),
  );
}
