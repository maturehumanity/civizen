-- Ordinary social posts: remove the 15-minute edit cutoff.
-- Identity freeze, edited_at-on-content-change, and post_revisions stay in place.

DROP POLICY IF EXISTS "Users can edit their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update permitted posts" ON public.posts;
CREATE POLICY "Users can update permitted posts" ON public.posts
  FOR UPDATE
  USING (
    public.has_permission('post.edit_self'::public.app_permission)
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = posts.author_id
        AND profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_permission('post.edit_self'::public.app_permission)
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = posts.author_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.edit_published_post(
  p_post_id uuid,
  p_content text
)
RETURNS public.posts
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_post public.posts;
  v_content text := coalesce(p_content, '');
BEGIN
  IF btrim(v_content) = '' THEN
    RAISE EXCEPTION 'Post content cannot be empty.';
  END IF;

  SELECT *
    INTO v_post
  FROM public.posts
  WHERE id = p_post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = v_post.author_id
      AND profiles.user_id = auth.uid()
  ) OR NOT public.has_permission('post.edit_self'::public.app_permission) THEN
    RAISE EXCEPTION 'You cannot edit this post.';
  END IF;

  UPDATE public.posts
     SET content = v_content
   WHERE id = p_post_id
   RETURNING * INTO v_post;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You cannot edit this post.';
  END IF;

  RETURN v_post;
END;
$$;

COMMENT ON FUNCTION public.edit_published_post(uuid, text) IS
  'Update published ordinary post content. Author-only. Previous wording is retained in post_revisions. created_at does not change.';

GRANT EXECUTE ON FUNCTION public.edit_published_post(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
