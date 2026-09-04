-- Posts: restrained rich-text, revision retention, identity freeze.
-- Ordinary social posts remain editable by the author. Time limits are not applied here.

CREATE TABLE IF NOT EXISTS public.post_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  content text NOT NULL,
  editor_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, revision_number)
);

COMMENT ON TABLE public.post_revisions IS
  'Internal previous published wording for a post. Written when published content changes. Not a public history UI.';

CREATE INDEX IF NOT EXISTS post_revisions_post_id_idx
  ON public.post_revisions (post_id, revision_number DESC);

ALTER TABLE public.post_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authors can read own post revisions" ON public.post_revisions;
CREATE POLICY "Authors can read own post revisions"
  ON public.post_revisions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.posts p
      JOIN public.profiles author ON author.id = p.author_id
      WHERE p.id = post_revisions.post_id
        AND author.user_id = auth.uid()
    )
  );

GRANT SELECT ON public.post_revisions TO authenticated;

-- ---------------------------------------------------------------------------
-- Freeze identity fields; retain previous content; set edited_at only on content change.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.posts_before_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_editor uuid;
  v_next_revision integer;
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Post identity cannot change.';
  END IF;
  IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
    RAISE EXCEPTION 'Post author cannot change.';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Post publication time cannot change.';
  END IF;

  IF NEW.content IS NOT DISTINCT FROM OLD.content THEN
    NEW.is_edited := OLD.is_edited;
    NEW.edited_at := OLD.edited_at;
    RETURN NEW;
  END IF;

  SELECT p.id
    INTO v_editor
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
    AND p.id = OLD.author_id
  LIMIT 1;

  IF v_editor IS NULL THEN
    SELECT p.id
      INTO v_editor
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1;
  END IF;

  IF v_editor IS NULL THEN
    v_editor := OLD.author_id;
  END IF;

  SELECT coalesce(max(r.revision_number), 0) + 1
    INTO v_next_revision
  FROM public.post_revisions r
  WHERE r.post_id = OLD.id;

  INSERT INTO public.post_revisions (
    post_id,
    revision_number,
    content,
    editor_profile_id
  ) VALUES (
    OLD.id,
    v_next_revision,
    OLD.content,
    v_editor
  );

  NEW.is_edited := true;
  NEW.edited_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_posts_before_update_guard ON public.posts;
CREATE TRIGGER trg_posts_before_update_guard
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.posts_before_update_guard();

-- ---------------------------------------------------------------------------
-- Ownership follows the existing actor model (current profile owns author_id).
-- Ordinary posts have no edit time limit. Formal civic records are a later, separate rule.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- RPC: same window, clear expired message, returns the updated row.
-- ---------------------------------------------------------------------------

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
