-- Phase 2 Work Fulfillment & Occupational Fit.
-- Distinct subunit tables. Owner-only RLS. No employer/publisher access.

ALTER TABLE public.work_joy_entries
  ADD COLUMN IF NOT EXISTS work_context_id uuid,
  ADD COLUMN IF NOT EXISTS activity_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS model_version text NOT NULL DEFAULT 'work-joy-v1';

CREATE TABLE IF NOT EXISTS public.work_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_title text NOT NULL,
  organization_or_context text,
  work_type text NOT NULL CHECK (work_type IN (
    'employed',
    'self_employed',
    'founder',
    'contractor',
    'student_trainee',
    'volunteer',
    'caregiver',
    'between_roles',
    'other'
  )),
  start_date date,
  hours_pattern text,
  location_mode text CHECK (location_mode IS NULL OR location_mode IN (
    'remote', 'hybrid', 'onsite', 'mixed', 'not_specified'
  )),
  is_primary boolean NOT NULL DEFAULT false,
  description text,
  status text NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'paused', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_contexts_profile_idx
  ON public.work_contexts (profile_id, is_primary DESC, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'work_joy_entries_work_context_fk'
  ) THEN
    ALTER TABLE public.work_joy_entries
      ADD CONSTRAINT work_joy_entries_work_context_fk
      FOREIGN KEY (work_context_id) REFERENCES public.work_contexts(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.work_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_context_id uuid REFERENCES public.work_contexts(id) ON DELETE SET NULL,
  model_version text NOT NULL DEFAULT 'work-assessment-v1',
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_assessments_profile_idx
  ON public.work_assessments (profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.work_shareable_preferences (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  approved boolean NOT NULL DEFAULT false,
  activities_sought jsonb NOT NULL DEFAULT '[]'::jsonb,
  role_types_sought jsonb NOT NULL DEFAULT '[]'::jsonb,
  environment jsonb NOT NULL DEFAULT '{}'::jsonb,
  location_mode text,
  schedule_note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recommendation_id text NOT NULL,
  feedback text NOT NULL CHECK (feedback IN ('dismissed', 'not_relevant', 'saved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, recommendation_id)
);

CREATE TABLE IF NOT EXISTS public.work_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_id uuid REFERENCES public.happiness_actions(id) ON DELETE SET NULL,
  ladder_step text NOT NULL,
  area text,
  desired_change text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_interventions_profile_idx
  ON public.work_interventions (profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.work_explorations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  template_id text,
  why_may_fit jsonb NOT NULL DEFAULT '[]'::jsonb,
  things_to_explore jsonb NOT NULL DEFAULT '[]'::jsonb,
  alignment text NOT NULL CHECK (alignment IN (
    'strong_alignment', 'some_alignment', 'worth_exploring', 'limited_alignment'
  )),
  occupation_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_trial_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exploration_id uuid REFERENCES public.work_explorations(id) ON DELETE SET NULL,
  contribute_path text NOT NULL,
  opportunity_id uuid,
  joy_entry_id uuid REFERENCES public.work_joy_entries(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_transition_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target text NOT NULL,
  why text,
  already_have text,
  need text,
  test_path text,
  study_path text,
  opportunity_path text,
  next_step text,
  status text NOT NULL DEFAULT 'exploring' CHECK (status IN ('exploring', 'active', 'paused', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_transition_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transition_path_id uuid REFERENCES public.work_transition_paths(id) ON DELETE SET NULL,
  action_id uuid REFERENCES public.happiness_actions(id) ON DELETE SET NULL,
  change_kind text NOT NULL,
  helped text CHECK (helped IS NULL OR helped IN ('not_at_all', 'a_little', 'somewhat', 'a_lot')),
  work_joy_feeling text CHECK (work_joy_feeling IS NULL OR work_joy_feeling IN (
    'draining', 'mostly_unpleasant', 'neutral', 'enjoyable', 'energizing'
  )),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.work_contexts IS
  'Private current-work contexts. Organization identity is optional. Owner-only.';
COMMENT ON TABLE public.work_assessments IS
  'Civizen-native current-work assessment. Five-level dimensions only; no public Work Fulfillment score.';
COMMENT ON TABLE public.work_shareable_preferences IS
  'Member-approved opportunity preferences. Private Work Joy and diagnosis never copy here automatically.';
COMMENT ON TABLE public.work_recommendation_feedback IS
  'Persisted Not relevant / dismiss so unsuitable work suggestions do not repeat.';
COMMENT ON TABLE public.work_explorations IS
  'Member-controlled adjacent-role exploration. Not an assigned career.';
COMMENT ON TABLE public.work_transition_paths IS
  'Lightweight transition notes. No automated resignation or employer messaging.';

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'work_contexts',
    'work_assessments',
    'work_shareable_preferences',
    'work_recommendation_feedback',
    'work_interventions',
    'work_explorations',
    'work_trial_links',
    'work_transition_paths',
    'work_transition_followups'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Members can read own ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.happiness_owns_profile(profile_id))',
      'Members can read own ' || tbl, tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Members can insert own ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.happiness_owns_profile(profile_id))',
      'Members can insert own ' || tbl, tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Members can update own ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.happiness_owns_profile(profile_id)) WITH CHECK (public.happiness_owns_profile(profile_id))',
      'Members can update own ' || tbl, tbl
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Members can delete own ' || tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.happiness_owns_profile(profile_id))',
      'Members can delete own ' || tbl, tbl
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl);
  END LOOP;
END
$$;
