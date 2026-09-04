import { supabase } from '@/integrations/supabase/client';
import { serializePostContent } from '@/lib/posts-html';

export type EditedPostRow = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  is_edited: boolean | null;
  edited_at: string | null;
};

export async function editPublishedPost(options: {
  postId: string;
  html: string;
}): Promise<EditedPostRow> {
  const content = serializePostContent(options.html);
  if (!content) {
    throw new Error('Post content cannot be empty.');
  }

  const { data, error } = await supabase.rpc('edit_published_post', {
    p_post_id: options.postId,
    p_content: content,
  });

  if (error) {
    throw new Error(error.message || 'Could not save the post.');
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) {
    throw new Error('Could not save the post.');
  }
  return row as EditedPostRow;
}
