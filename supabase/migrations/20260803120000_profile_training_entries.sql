-- Profile Learning trainings (continuing education / courses attended).

CREATE TABLE IF NOT EXISTS public.profile_training_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  training_names text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profile_training_entries_one_per_profile
  ON public.profile_training_entries (profile_id);

CREATE INDEX IF NOT EXISTS profile_training_entries_profile_id_idx
  ON public.profile_training_entries (profile_id);

COMMENT ON TABLE public.profile_training_entries IS
  'Trainings attended, entered from the Profile Learning dial panel.';

ALTER TABLE public.profile_training_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read own training entries"
  ON public.profile_training_entries;
CREATE POLICY "Members can read own training entries"
  ON public.profile_training_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert own training entries"
  ON public.profile_training_entries;
CREATE POLICY "Members can insert own training entries"
  ON public.profile_training_entries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update own training entries"
  ON public.profile_training_entries;
CREATE POLICY "Members can update own training entries"
  ON public.profile_training_entries FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete own training entries"
  ON public.profile_training_entries;
CREATE POLICY "Members can delete own training entries"
  ON public.profile_training_entries FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_training_entries TO authenticated;
