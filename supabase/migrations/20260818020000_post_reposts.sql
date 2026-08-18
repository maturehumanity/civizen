-- Civizen post reposts: relationship to canonical original (no content duplication).
-- Plain repost: commentary_post_id IS NULL.
-- Repost with thoughts: commentary_post_id points at the user's commentary post.

CREATE TABLE IF NOT EXISTS public.post_reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  reposter_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commentary_post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_reposts_has_original_or_commentary CHECK (
    original_post_id IS NOT NULL OR commentary_post_id IS NOT NULL
  )
);

COMMENT ON TABLE public.post_reposts IS
  'Amplification relationship: plain repost or repost-with-thoughts. Never stores a copy of original content.';

CREATE UNIQUE INDEX IF NOT EXISTS post_reposts_one_per_original
  ON public.post_reposts (reposter_profile_id, original_post_id)
  WHERE original_post_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS post_reposts_commentary_unique
  ON public.post_reposts (commentary_post_id)
  WHERE commentary_post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS post_reposts_original_created_idx
  ON public.post_reposts (original_post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS post_reposts_reposter_created_idx
  ON public.post_reposts (reposter_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS post_reposts_feed_created_idx
  ON public.post_reposts (created_at DESC);

ALTER TABLE public.post_reposts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post reposts are viewable by everyone" ON public.post_reposts;
CREATE POLICY "Post reposts are viewable by everyone" ON public.post_reposts
  FOR SELECT USING (true);

-- Qualify post_reposts.reposter_profile_id — never bare user_id next to FROM profiles
-- (see 20260818010000_fix_post_likes_rls_user_id_binding.sql).
DROP POLICY IF EXISTS "Authenticated users can create post reposts" ON public.post_reposts;
CREATE POLICY "Authenticated users can create post reposts" ON public.post_reposts
  FOR INSERT WITH CHECK (
    public.has_permission('post.create'::public.app_permission)
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = post_reposts.reposter_profile_id
        AND profiles.user_id = auth.uid()
    )
    AND (
      post_reposts.original_post_id IS NULL
      OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_reposts.original_post_id)
    )
    AND (
      post_reposts.commentary_post_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.posts p
        WHERE p.id = post_reposts.commentary_post_id
          AND p.author_id = post_reposts.reposter_profile_id
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete their own post reposts" ON public.post_reposts;
CREATE POLICY "Users can delete their own post reposts" ON public.post_reposts
  FOR DELETE USING (
    (
      public.has_permission('post.delete_self'::public.app_permission)
      AND EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = post_reposts.reposter_profile_id
          AND profiles.user_id = auth.uid()
      )
    )
    OR public.has_permission('post.moderate'::public.app_permission)
  );

-- When original is deleted, drop plain reposts (nothing left to amplify).
-- Quote-repost rows keep commentary_post_id with original_post_id NULL.
CREATE OR REPLACE FUNCTION public.cleanup_plain_reposts_after_original_null()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.original_post_id IS NULL AND NEW.commentary_post_id IS NULL THEN
    DELETE FROM public.post_reposts WHERE id = NEW.id;
  ELSIF NEW.original_post_id IS NULL AND OLD.original_post_id IS NOT NULL AND NEW.commentary_post_id IS NULL THEN
    DELETE FROM public.post_reposts WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_plain_reposts_after_original_null ON public.post_reposts;
CREATE TRIGGER trg_cleanup_plain_reposts_after_original_null
  AFTER UPDATE OF original_post_id ON public.post_reposts
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_plain_reposts_after_original_null();

-- Restrained notify: original author when someone else reposts (plain or with thoughts).
CREATE OR REPLACE FUNCTION public.notify_post_repost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_author_id uuid;
  v_reposter_name text;
  v_with_thoughts boolean;
BEGIN
  IF NEW.original_post_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT author_id INTO v_author_id FROM public.posts WHERE id = NEW.original_post_id;
  IF v_author_id IS NULL OR v_author_id = NEW.reposter_profile_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(trim(full_name), ''), NULLIF(trim(username), ''), 'Someone')
    INTO v_reposter_name
  FROM public.profiles
  WHERE id = NEW.reposter_profile_id;

  v_with_thoughts := NEW.commentary_post_id IS NOT NULL;

  INSERT INTO public.user_notifications (
    recipient_profile_id,
    notification_type,
    title,
    body,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_author_id,
    CASE WHEN v_with_thoughts THEN 'post_repost_with_thoughts' ELSE 'post_repost' END,
    CASE
      WHEN v_with_thoughts THEN v_reposter_name || ' reposted your post with thoughts'
      ELSE v_reposter_name || ' reposted your post'
    END,
    NULL,
    'post',
    NEW.original_post_id,
    jsonb_build_object(
      'repost_id', NEW.id,
      'reposter_profile_id', NEW.reposter_profile_id,
      'with_thoughts', v_with_thoughts,
      'commentary_post_id', NEW.commentary_post_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_repost ON public.post_reposts;
CREATE TRIGGER trg_notify_post_repost
  AFTER INSERT ON public.post_reposts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_repost();

GRANT SELECT, INSERT, DELETE ON public.post_reposts TO authenticated;
GRANT SELECT ON public.post_reposts TO anon;
