-- Profile Experience category details (v1: JSON experience list per profile from Profile dial).

CREATE TABLE IF NOT EXISTS public.profile_experience_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  experiences jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profile_experience_entries_one_per_profile
  ON public.profile_experience_entries (profile_id);

CREATE INDEX IF NOT EXISTS profile_experience_entries_profile_id_idx
  ON public.profile_experience_entries (profile_id);

COMMENT ON TABLE public.profile_experience_entries IS
  'Experience category details entered from the Profile identity dial.';

ALTER TABLE public.profile_experience_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read own experience entries"
  ON public.profile_experience_entries;
CREATE POLICY "Members can read own experience entries"
  ON public.profile_experience_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert own experience entries"
  ON public.profile_experience_entries;
CREATE POLICY "Members can insert own experience entries"
  ON public.profile_experience_entries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update own experience entries"
  ON public.profile_experience_entries;
CREATE POLICY "Members can update own experience entries"
  ON public.profile_experience_entries FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "Members can delete own experience entries"
  ON public.profile_experience_entries;
CREATE POLICY "Members can delete own experience entries"
  ON public.profile_experience_entries FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_experience_entries TO authenticated;
