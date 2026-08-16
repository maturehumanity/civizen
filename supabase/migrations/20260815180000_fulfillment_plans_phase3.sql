-- Phase 3 Active Human Fulfillment Support.
-- Fulfillment Plans organize existing Happiness actions. Owner-only RLS.
-- Work Fulfillment stays the specialized subunit; employment seeking uses Marketplace Jobs.

ALTER TABLE public.happiness_actions
  ADD COLUMN IF NOT EXISTS plan_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planned',
  ADD COLUMN IF NOT EXISTS intervention_key text,
  ADD COLUMN IF NOT EXISTS library_version text,
  ADD COLUMN IF NOT EXISTS recommendation_model text,
  ADD COLUMN IF NOT EXISTS member_note text,
  ADD COLUMN IF NOT EXISTS target_date date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'happiness_actions_status_check'
  ) THEN
    ALTER TABLE public.happiness_actions
      ADD CONSTRAINT happiness_actions_status_check
      CHECK (status IN ('planned', 'in_progress', 'completed', 'dismissed'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.fulfillment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  domain_key text NOT NULL CHECK (domain_key IN (
    'life_satisfaction',
    'emotional_wellbeing',
    'meaning_purpose',
    'relationships_belonging',
    'health_vitality',
    'autonomy_freedom',
    'security_stability',
    'time_life_balance',
    'environment_community',
    'work_fulfillment'
  )),
  title text NOT NULL,
  concern text,
  desired_outcome text,
  status text NOT NULL DEFAULT 'exploring' CHECK (status IN (
    'exploring', 'active', 'paused', 'completed', 'stopped'
  )),
  reminder_pref text NOT NULL DEFAULT 'none' CHECK (reminder_pref IN (
    'none', 'weekly', 'chosen_date'
  )),
  follow_up_at timestamptz,
  work_intervention_id uuid REFERENCES public.work_interventions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS fulfillment_plans_profile_idx
  ON public.fulfillment_plans (profile_id, status, updated_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'happiness_actions_plan_fk'
  ) THEN
    ALTER TABLE public.happiness_actions
      ADD CONSTRAINT happiness_actions_plan_fk
      FOREIGN KEY (plan_id) REFERENCES public.fulfillment_plans(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.fulfillment_plan_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.fulfillment_plans(id) ON DELETE CASCADE,
  factor_key text NOT NULL,
  certainty_type text NOT NULL CHECK (certainty_type IN (
    'member_confirmed', 'observed_pattern', 'hypothesis'
  )),
  source_type text NOT NULL CHECK (source_type IN (
    'member', 'checkin_pattern', 'recommendation', 'civi'
  )),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fulfillment_plan_factors_plan_idx
  ON public.fulfillment_plan_factors (plan_id, created_at);

CREATE TABLE IF NOT EXISTS public.fulfillment_plan_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.fulfillment_plans(id) ON DELETE CASCADE,
  intervention_key text NOT NULL,
  library_version text NOT NULL,
  recommendation_model text NOT NULL,
  action_id uuid REFERENCES public.happiness_actions(id) ON DELETE SET NULL,
  why_shown text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fulfillment_plan_support (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.fulfillment_plans(id) ON DELETE CASCADE,
  support_key text NOT NULL,
  support_type text NOT NULL,
  path text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fulfillment_recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.fulfillment_plans(id) ON DELETE SET NULL,
  intervention_key text NOT NULL,
  feedback text NOT NULL CHECK (feedback IN (
    'shown', 'accepted', 'dismissed', 'not_relevant', 'tried_before', 'saved_later', 'not_now'
  )),
  recommendation_model text NOT NULL DEFAULT 'fulfillment-recommendation-v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, intervention_key, feedback)
);

CREATE TABLE IF NOT EXISTS public.fulfillment_plan_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.fulfillment_plans(id) ON DELETE CASCADE,
  qualitative_state text NOT NULL,
  summary_note text,
  helped text CHECK (helped IS NULL OR helped IN ('not_at_all', 'a_little', 'somewhat', 'a_lot')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fulfillment_plans IS
  'Private member Fulfillment Plans. Owner-only. Not Score, hiring, or public ranking.';
COMMENT ON TABLE public.fulfillment_plan_factors IS
  'Plan factors keep member-confirmed, observed, and hypothesis certainty distinct.';
COMMENT ON TABLE public.fulfillment_recommendation_feedback IS
  'Persisted Not relevant / not now / saved later so suggestions do not repeat immediately.';
COMMENT ON TABLE public.fulfillment_plan_outcomes IS
  'Member-reported plan outcomes. Not a claim that a plan caused a Happiness Level change.';

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'fulfillment_plans',
    'fulfillment_plan_factors',
    'fulfillment_plan_interventions',
    'fulfillment_plan_support',
    'fulfillment_recommendation_feedback',
    'fulfillment_plan_outcomes'
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
