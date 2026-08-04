-- Per-viewer post view tracking for Home feed (unique visitors + total views).

CREATE TABLE IF NOT EXISTS public.post_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  view_count INTEGER NOT NULL DEFAULT 1 CHECK (view_count > 0),
  first_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (post_id, viewer_id)
);

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post views are viewable by everyone" ON public.post_views;
CREATE POLICY "Post views are viewable by everyone" ON public.post_views
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create own post views" ON public.post_views;
CREATE POLICY "Authenticated users can create own post views" ON public.post_views
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = viewer_id
        AND profiles.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own post views" ON public.post_views;
CREATE POLICY "Users can update their own post views" ON public.post_views
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = viewer_id
        AND profiles.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON public.post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_viewer_id ON public.post_views(viewer_id);

COMMENT ON TABLE public.post_views IS
  'Home feed post views: one row per viewer. unique = row count; total = sum(view_count).';

CREATE OR REPLACE FUNCTION public.record_post_view(p_post_id uuid)
RETURNS TABLE(unique_visitors bigint, total_views bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_id uuid;
  v_author_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_post_id IS NULL THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint;
    RETURN;
  END IF;

  SELECT id INTO v_viewer_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_viewer_id IS NULL THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint;
    RETURN;
  END IF;

  SELECT author_id INTO v_author_id
  FROM public.posts
  WHERE id = p_post_id;

  IF v_author_id IS NULL THEN
    RETURN QUERY SELECT 0::bigint, 0::bigint;
    RETURN;
  END IF;

  -- Authors browsing their own posts do not inflate view counts.
  IF v_author_id <> v_viewer_id THEN
    INSERT INTO public.post_views (post_id, viewer_id, view_count)
    VALUES (p_post_id, v_viewer_id, 1)
    ON CONFLICT (post_id, viewer_id) DO UPDATE
      SET
        view_count = CASE
          WHEN public.post_views.last_viewed_at < now() - interval '15 minutes'
            THEN public.post_views.view_count + 1
          ELSE public.post_views.view_count
        END,
        last_viewed_at = CASE
          WHEN public.post_views.last_viewed_at < now() - interval '15 minutes'
            THEN now()
          ELSE public.post_views.last_viewed_at
        END;
  END IF;

  RETURN QUERY
    SELECT
      COUNT(*)::bigint AS unique_visitors,
      COALESCE(SUM(pv.view_count), 0)::bigint AS total_views
    FROM public.post_views pv
    WHERE pv.post_id = p_post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_post_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_post_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_post_view(uuid) TO service_role;
