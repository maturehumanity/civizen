-- Peer ratings for Civizen Score Performance (layered on contribution events).

CREATE TABLE IF NOT EXISTS public.profile_performance_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_event_id uuid NOT NULL
    REFERENCES public.profile_contribution_events(id) ON DELETE CASCADE,
  subject_profile_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  rater_profile_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  score numeric(6, 2) NOT NULL
    CHECK (score >= 0 AND score <= 100),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_performance_ratings_event_rater_unique
    UNIQUE (contribution_event_id, rater_profile_id),
  CONSTRAINT profile_performance_ratings_no_self_rate
    CHECK (rater_profile_id <> subject_profile_id)
);

CREATE INDEX IF NOT EXISTS profile_performance_ratings_subject_idx
  ON public.profile_performance_ratings (subject_profile_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS profile_performance_ratings_event_idx
  ON public.profile_performance_ratings (contribution_event_id);

COMMENT ON TABLE public.profile_performance_ratings IS
  'Peer ratings of contribution activities feeding Civizen Score Performance.';

DO $$
BEGIN
  CREATE TRIGGER update_profile_performance_ratings_updated_at
    BEFORE UPDATE ON public.profile_performance_ratings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_function THEN NULL;
END $$;

ALTER TABLE public.profile_performance_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read performance ratings"
  ON public.profile_performance_ratings;
CREATE POLICY "Members can read performance ratings"
  ON public.profile_performance_ratings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can insert own performance ratings"
  ON public.profile_performance_ratings;
CREATE POLICY "Members can insert own performance ratings"
  ON public.profile_performance_ratings FOR INSERT TO authenticated
  WITH CHECK (
    rater_profile_id <> subject_profile_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = rater_profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update own performance ratings"
  ON public.profile_performance_ratings;
CREATE POLICY "Members can update own performance ratings"
  ON public.profile_performance_ratings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = rater_profile_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    rater_profile_id <> subject_profile_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = rater_profile_id AND p.user_id = auth.uid()
    )
  );

-- Subject cannot delete ratings about themselves; only the rater may delete their own.
DROP POLICY IF EXISTS "Members can delete own performance ratings"
  ON public.profile_performance_ratings;
CREATE POLICY "Members can delete own performance ratings"
  ON public.profile_performance_ratings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = rater_profile_id AND p.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_performance_ratings TO authenticated;
