-- Profile Skills category details (v1: one skills list per profile from Profile dial).

CREATE TABLE IF NOT EXISTS public.profile_skills_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_names text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profile_skills_entries_one_per_profile
  ON public.profile_skills_entries (profile_id);

CREATE INDEX IF NOT EXISTS profile_skills_entries_profile_id_idx
  ON public.profile_skills_entries (profile_id);

COMMENT ON TABLE public.profile_skills_entries IS
  'Skills category details entered from the Profile identity dial.';

ALTER TABLE public.profile_skills_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read own skills entries"
  ON public.profile_skills_entries;
CREATE POLICY "Members can read own skills entries"
  ON public.profile_skills_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert own skills entries"
  ON public.profile_skills_entries;
CREATE POLICY "Members can insert own skills entries"
  ON public.profile_skills_entries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update own skills entries"
  ON public.profile_skills_entries;
CREATE POLICY "Members can update own skills entries"
  ON public.profile_skills_entries FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "Members can delete own skills entries"
  ON public.profile_skills_entries;
CREATE POLICY "Members can delete own skills entries"
  ON public.profile_skills_entries FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_skills_entries TO authenticated;
