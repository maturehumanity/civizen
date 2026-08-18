import { describe, expect, it } from 'vitest';

import {
  isCommentaryPostId,
  previewPostContent,
  buildHomeFeedItems,
} from '@/lib/post-reposts';

describe('post-reposts helpers', () => {
  it('previews long content with truncation marker', () => {
    const long = 'a'.repeat(300);
    const preview = previewPostContent(long, 220);
    expect(preview.truncated).toBe(true);
    expect(preview.text.endsWith('…')).toBe(true);
    expect(preview.text.length).toBeLessThanOrEqual(221);
  });

  it('keeps short content intact', () => {
    const preview = previewPostContent('Peace requires shared responsibility.');
    expect(preview).toEqual({
      text: 'Peace requires shared responsibility.',
      truncated: false,
    });
  });

  it('detects commentary posts from repost rows', () => {
    expect(
      isCommentaryPostId('c1', [
        { commentary_post_id: 'c1' },
        { commentary_post_id: null },
      ]),
    ).toBe(true);
    expect(isCommentaryPostId('other', [{ commentary_post_id: 'c1' }])).toBe(false);
  });

  it('builds feed items without duplicating quote commentary posts', () => {
    const posts = [
      {
        id: 'orig',
        content: 'Peace?',
        created_at: '2026-08-03T10:00:00Z',
        author_id: 'civizen',
        author: { id: 'civizen', username: 'civizen', full_name: 'Civizen', avatar_url: null },
      },
      {
        id: 'quote',
        content: 'My thoughts',
        created_at: '2026-08-17T12:00:00Z',
        author_id: 'armen',
        author: { id: 'armen', username: 'armen', full_name: 'Armen', avatar_url: null },
      },
    ];
    const reposts = [
      {
        id: 'r1',
        original_post_id: 'orig',
        reposter_profile_id: 'armen',
        commentary_post_id: 'quote',
        created_at: '2026-08-17T12:00:01Z',
        original: posts[0],
        commentary: posts[1],
        reposter: posts[1].author,
      },
    ];
    const items = buildHomeFeedItems(posts, reposts);
    expect(items.map((item) => item.kind)).toEqual(['quote_repost', 'original']);
    expect(items[0]?.post.id).toBe('quote');
    expect(items[0]?.embeddedOriginal?.id).toBe('orig');
  });
});
