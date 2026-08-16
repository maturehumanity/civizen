-- Happiness & Human Fulfillment Phase 1
-- Private-by-default wellbeing records. Never used for Score, reputation,
-- employment ranking, governance power, or public profiles.
-- Work Fulfillment & Occupational Fit is a distinct subunit with its own tables.

CREATE OR REPLACE FUNCTION public.happiness_owns_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_profile_id AND p.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.happiness_owns_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.happiness_owns_profile(uuid) TO authenticated;

-- Configurable cohort floor for future privacy-safe aggregates (unused in Phase 1 UI).
CREATE TABLE IF NOT EXISTS public.happiness_privacy_config (
  id text PRIMARY KEY DEFAULT 'default',
  min_cohort_size integer NOT NULL DEFAULT 25 CHECK (min_cohort_size >= 10),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.happiness_privacy_config (id, min_cohort_size, notes)
VALUES (
  'default',
  25,
  'Do not display group-level wellbeing statistics below this participation count. Privacy-reviewed before institutional deployment.'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.happiness_privacy_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.happiness_privacy_settings (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  checkins_enabled boolean NOT NULL DEFAULT true,
  recommendations_enabled boolean NOT NULL DEFAULT true,
  optional_sharing_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.happiness_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feeling text NOT NULL CHECK (feeling IN ('very_difficult', 'difficult', 'okay', 'good', 'very_good')),
  affecting_most text CHECK (
    affecting_most IS NULL OR affecting_most IN (
      'work', 'health', 'relationships', 'money_security', 'family', 'time', 'environment', 'purpose', 'something_else'
    )
  ),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS happiness_checkins_profile_created_idx
  ON public.happiness_checkins (profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.happiness_weekly_pulses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  domain_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, week_start)
);

CREATE TABLE IF NOT EXISTS public.happiness_monthly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  domain_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  wants_help boolean NOT NULL DEFAULT false,
  help_areas text[] NOT NULL DEFAULT '{}'::text[],
  instrument_slug text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, month_start)
);

CREATE TABLE IF NOT EXISTS public.happiness_state_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_version text NOT NULL DEFAULT 'happiness-level-v1',
  overall_level text CHECK (
    overall_level IS NULL OR overall_level IN ('struggling', 'unsettled', 'balanced', 'flourishing', 'thriving')
  ),
  overall_internal numeric,
  trend text NOT NULL DEFAULT 'unknown' CHECK (trend IN ('improving', 'stable', 'declining', 'unknown')),
  confidence text NOT NULL DEFAULT 'insufficient' CHECK (confidence IN ('insufficient', 'low', 'moderate', 'high')),
  domain_levels jsonb NOT NULL DEFAULT '{}'::jsonb,
  domain_internal jsonb NOT NULL DEFAULT '{}'::jsonb,
  high_priority_domains text[] NOT NULL DEFAULT '{}'::text[],
  strongest_domains text[] NOT NULL DEFAULT '{}'::text[],
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS happiness_state_snapshots_profile_computed_idx
  ON public.happiness_state_snapshots (profile_id, computed_at DESC);

COMMENT ON COLUMN public.happiness_state_snapshots.overall_internal IS
  'Internal 0-100 aggregation only. Never present as a public Happiness Score.';

CREATE TABLE IF NOT EXISTS public.happiness_causes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_kind text NOT NULL CHECK (source_kind IN ('checkin', 'pulse', 'review', 'domain', 'improve')),
  source_id uuid,
  domain text,
  cause_group text NOT NULL CHECK (cause_group IN ('work', 'health', 'relationships', 'security', 'time', 'purpose')),
  category text NOT NULL,
  confirmed boolean NOT NULL DEFAULT true,
  is_ai_suggestion boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS happiness_causes_profile_idx
  ON public.happiness_causes (profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.happiness_improvement_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  domain text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.happiness_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selection_id uuid REFERENCES public.happiness_improvement_selections(id) ON DELETE SET NULL,
  domain text NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  why text NOT NULL,
  related_path text,
  dismissed boolean NOT NULL DEFAULT false,
  not_relevant boolean NOT NULL DEFAULT false,
  follow_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS happiness_actions_profile_idx
  ON public.happiness_actions (profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.happiness_action_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_id uuid NOT NULL REFERENCES public.happiness_actions(id) ON DELETE CASCADE,
  helped text NOT NULL CHECK (helped IN ('not_at_all', 'a_little', 'somewhat', 'a_lot')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.happiness_assessment_instruments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  version text NOT NULL,
  publisher text,
  source_url text,
  license text,
  language text NOT NULL DEFAULT 'en',
  allowed_use text NOT NULL DEFAULT 'civizen_native_non_clinical',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  scoring_logic jsonb NOT NULL DEFAULT '{}'::jsonb,
  interpretation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  instrument_references jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.happiness_assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instrument_id uuid NOT NULL REFERENCES public.happiness_assessment_instruments(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  internal_score jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.happiness_assessment_responses.internal_score IS
  'Instrument-internal values only. Never shown as a public Happiness Score.';

-- Distinct Work Fulfillment & Occupational Fit subunit (Phase 2-ready).
CREATE TABLE IF NOT EXISTS public.work_fulfillment_profiles (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_role_note text,
  enjoyment jsonb NOT NULL DEFAULT '{"enjoyedActivities":[],"enjoyedTasks":[],"dislikedActivities":[],"drainingTasks":[]}'::jsonb,
  values jsonb NOT NULL DEFAULT '[]'::jsonb,
  environment_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  autonomy jsonb NOT NULL DEFAULT '{}'::jsonb,
  lifestyle_fit jsonb NOT NULL DEFAULT '{}'::jsonb,
  purpose_fit jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_joy_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feeling text NOT NULL CHECK (feeling IN ('draining', 'mostly_unpleasant', 'neutral', 'enjoyable', 'energizing')),
  activity text,
  task_tag text,
  project text,
  context_note text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_joy_entries_profile_idx
  ON public.work_joy_entries (profile_id, created_at DESC);

COMMENT ON TABLE public.work_fulfillment_profiles IS
  'Work Fulfillment & Occupational Fit subunit. Distinct from Happiness check-ins. Phase 2 assessments attach here.';
COMMENT ON TABLE public.work_joy_entries IS
  'Work Joy Monitor (Phase 2). Lived work-day experience; not a career-change trigger.';
COMMENT ON TABLE public.happiness_checkins IS
  'Private Happiness quick check-ins. Owner-only. Not a public Happiness Score.';

INSERT INTO public.happiness_assessment_instruments (
  slug, name, version, publisher, license, language, allowed_use, questions, scoring_logic, interpretation_rules, instrument_references
) VALUES (
  'civizen-domain-review-v1',
  'Civizen Happiness Domain Review',
  '1.0',
  'Civizen',
  'civizen-internal',
  'en',
  'civizen_native_non_clinical',
  '[
    {"id":"domain-life_satisfaction","prompt":"Overall, how is your life going right now?","responseType":"five_level","domain":"life_satisfaction"},
    {"id":"domain-emotional_wellbeing","prompt":"How have you generally felt, day to day, recently?","responseType":"five_level","domain":"emotional_wellbeing"},
    {"id":"domain-meaning_purpose","prompt":"How meaningful does your life feel at the moment?","responseType":"five_level","domain":"meaning_purpose"},
    {"id":"domain-relationships_belonging","prompt":"How are your relationships and sense of belonging?","responseType":"five_level","domain":"relationships_belonging"},
    {"id":"domain-health_vitality","prompt":"How is your health, energy, and vitality?","responseType":"five_level","domain":"health_vitality"},
    {"id":"domain-autonomy_freedom","prompt":"How much control do you have over the way you live and work?","responseType":"five_level","domain":"autonomy_freedom"},
    {"id":"domain-security_stability","prompt":"How secure and stable do things feel (home, money, safety)?","responseType":"five_level","domain":"security_stability"},
    {"id":"domain-time_life_balance","prompt":"How is the balance of your time?","responseType":"five_level","domain":"time_life_balance"},
    {"id":"domain-environment_community","prompt":"How well does your environment and community support you?","responseType":"five_level","domain":"environment_community"},
    {"id":"domain-work_fulfillment","prompt":"How fulfilling is your work or occupation?","responseType":"five_level","domain":"work_fulfillment"}
  ]'::jsonb,
  '{"model_version":"happiness-level-v1","maps_to":"domain_levels","public_output":"five_level_states","internal_scale":"0_100_not_shown"}'::jsonb,
  '{"clinical_diagnosis":false,"identity_language":false,"public_numeric_score":false}'::jsonb,
  '[{"note":"Civizen-native domain review. Not a licensed clinical instrument."}]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- Owner-only RLS for personal wellbeing tables.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'happiness_privacy_settings',
    'happiness_checkins',
    'happiness_weekly_pulses',
    'happiness_monthly_reviews',
    'happiness_state_snapshots',
    'happiness_causes',
    'happiness_improvement_selections',
    'happiness_actions',
    'happiness_action_outcomes',
    'happiness_assessment_responses',
    'work_fulfillment_profiles',
    'work_joy_entries'
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

ALTER TABLE public.happiness_assessment_instruments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can read assessment instruments" ON public.happiness_assessment_instruments;
CREATE POLICY "Members can read assessment instruments"
  ON public.happiness_assessment_instruments FOR SELECT TO authenticated
  USING (true);
GRANT SELECT ON public.happiness_assessment_instruments TO authenticated;
REVOKE ALL ON public.happiness_assessment_instruments FROM anon;

REVOKE ALL ON public.happiness_privacy_config FROM anon;
REVOKE ALL ON public.happiness_privacy_config FROM authenticated;
