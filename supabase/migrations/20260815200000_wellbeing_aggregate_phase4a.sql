-- Phase 4A Privacy-Safe Wellbeing Intelligence Foundation.
-- Aggregate insight must never become a back door to individual Happiness surveillance.
-- Phase 4B must call get_wellbeing_aggregate / the trusted TS engine — never private Happiness tables.
-- Applied only to the self-hosted application database. Do not treat this as cloud-Supabase schema.

CREATE TABLE IF NOT EXISTS public.wellbeing_aggregate_participation (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  enabled_at timestamptz,
  disabled_at timestamptz,
  policy_version text NOT NULL DEFAULT 'wellbeing-aggregate-privacy-v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.wellbeing_aggregate_participation IS
  'Optional aggregate wellbeing participation. Default off. Separate from optional sharing, Job Fit, employer access, and Civi. Withdrawal excludes future generation; historic privacy-safe snapshots are not rewritten.';

CREATE TABLE IF NOT EXISTS public.wellbeing_aggregate_policies (
  version text PRIMARY KEY,
  config jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.wellbeing_aggregate_policies (version, config)
VALUES (
  'wellbeing-aggregate-privacy-v1',
  jsonb_build_object(
    'minCohort', 25,
    'smallCellMin', 5,
    'maxNonTimeDimensions', 2,
    'allowExactCounts', false,
    'queryBudgetPerScope', 8,
    'timeBuckets', jsonb_build_array('month', 'quarter', 'rolling_6_weeks'),
    'geographyGrains', jsonb_build_array('city', 'region', 'community'),
    'withdrawal', 'exclude_from_future_generation',
    'historicSnapshots', 'retain_without_rewrite',
    'workingParameter', true
  )
)
ON CONFLICT (version) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.wellbeing_aggregate_dimensions (
  id text PRIMARY KEY,
  classification text NOT NULL CHECK (classification IN (
    'allowed', 'elevated', 'approval_required', 'research_only', 'prohibited'
  )),
  sensitivity text NOT NULL CHECK (sensitivity IN ('standard', 'elevated', 'sensitive')),
  min_cohort_override integer,
  compatible_with text[] NOT NULL DEFAULT '{}',
  notes text
);

INSERT INTO public.wellbeing_aggregate_dimensions (id, classification, sensitivity, min_cohort_override, notes)
VALUES
  ('organization', 'allowed', 'standard', NULL, 'Approved organization scope'),
  ('community', 'allowed', 'standard', NULL, 'Approved community scope'),
  ('program', 'allowed', 'standard', NULL, 'Approved program scope'),
  ('approved_large_team', 'allowed', 'elevated', 40, 'Only pre-approved large teams'),
  ('domain', 'allowed', 'standard', NULL, 'Happiness domain'),
  ('factor_category', 'allowed', 'standard', NULL, 'Structured factor tag'),
  ('work_context_type', 'allowed', 'standard', NULL, 'Broad work-context type'),
  ('intervention_type', 'allowed', 'standard', NULL, 'Broad intervention category'),
  ('time_bucket', 'allowed', 'standard', NULL, 'month / quarter / rolling_6_weeks'),
  ('geography', 'allowed', 'standard', NULL, 'city / region / community only'),
  ('team', 'approval_required', 'elevated', 40, 'Not arbitrary team filters'),
  ('role', 'elevated', 'elevated', NULL, 'Not a v1 query dimension'),
  ('job_family', 'elevated', 'elevated', NULL, 'Not a v1 query dimension'),
  ('age_group', 'research_only', 'sensitive', NULL, 'Future research framework only'),
  ('gender', 'research_only', 'sensitive', NULL, 'Future research framework only'),
  ('race', 'prohibited', 'sensitive', NULL, 'Prohibited by default'),
  ('ethnicity', 'prohibited', 'sensitive', NULL, 'Prohibited by default'),
  ('religion', 'prohibited', 'sensitive', NULL, 'Prohibited by default'),
  ('political_affiliation', 'prohibited', 'sensitive', NULL, 'Prohibited by default'),
  ('sexual_orientation', 'prohibited', 'sensitive', NULL, 'Prohibited by default'),
  ('medical_condition', 'prohibited', 'sensitive', NULL, 'Prohibited by default'),
  ('disability', 'prohibited', 'sensitive', NULL, 'Prohibited by default'),
  ('immigration_status', 'prohibited', 'sensitive', NULL, 'Prohibited by default'),
  ('street', 'prohibited', 'sensitive', NULL, 'Too precise'),
  ('building', 'prohibited', 'sensitive', NULL, 'Too precise'),
  ('gps', 'prohibited', 'sensitive', NULL, 'Too precise'),
  ('neighborhood', 'prohibited', 'sensitive', NULL, 'Too precise unless a later model qualifies'),
  ('day', 'prohibited', 'elevated', NULL, 'Time window too narrow'),
  ('week', 'prohibited', 'elevated', NULL, 'Time window too narrow for v1')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.wellbeing_aggregate_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN (
    'organization', 'community', 'program', 'city', 'region', 'approved_large_team'
  )),
  entity_ref text NOT NULL,
  label text,
  enabled boolean NOT NULL DEFAULT false,
  viewer_profile_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, entity_ref)
);

COMMENT ON TABLE public.wellbeing_aggregate_scopes IS
  'Approved cohort entities for wellbeing intelligence. Insights exist only when the scope is enabled — not merely because members share an organization. Viewers receive aggregates only, never private Happiness rows.';

CREATE TABLE IF NOT EXISTS public.wellbeing_aggregate_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id uuid NOT NULL REFERENCES public.wellbeing_aggregate_scopes(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  period_start date NOT NULL,
  time_bucket text NOT NULL,
  topic text NOT NULL,
  result jsonb NOT NULL,
  privacy_policy_version text NOT NULL,
  aggregation_model_version text NOT NULL,
  suppression text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope_id, fingerprint, privacy_policy_version, aggregation_model_version)
);

COMMENT ON TABLE public.wellbeing_aggregate_snapshots IS
  'Privacy-safe aggregate results only. Must not contain member IDs, private notes, or contributing member lists.';

CREATE TABLE IF NOT EXISTS public.wellbeing_aggregate_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope_id uuid REFERENCES public.wellbeing_aggregate_scopes(id) ON DELETE SET NULL,
  fingerprint text NOT NULL,
  time_bucket text,
  topic text,
  suppression text,
  privacy_policy_version text NOT NULL,
  aggregation_model_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.wellbeing_aggregate_audit IS
  'Aggregate access audit. Records requester, scope, broad query, suppression, and versions. Must not log raw private wellbeing data.';

CREATE TABLE IF NOT EXISTS public.systemic_issue_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id uuid NOT NULL REFERENCES public.wellbeing_aggregate_scopes(id) ON DELETE CASCADE,
  domain text NOT NULL,
  factor_category text,
  status text NOT NULL DEFAULT 'observing' CHECK (status IN (
    'observing', 'emerging', 'established_pattern', 'needs_review', 'archived'
  )),
  evidence_periods integer NOT NULL DEFAULT 0,
  summary text NOT NULL,
  privacy_policy_version text NOT NULL,
  pattern_model_version text NOT NULL DEFAULT 'systemic-pattern-v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.systemic_issue_candidates IS
  'Recurring privacy-safe patterns that may warrant review. Must not auto-create Community Challenges, Governance Solutions, or public posts.';

CREATE TABLE IF NOT EXISTS public.systemic_issue_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.systemic_issue_candidates(id) ON DELETE CASCADE,
  snapshot_id uuid NOT NULL REFERENCES public.wellbeing_aggregate_snapshots(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, snapshot_id)
);

COMMENT ON TABLE public.systemic_issue_evidence IS
  'Evidence points at aggregate snapshots, never private member rows.';

CREATE OR REPLACE FUNCTION public.wellbeing_aggregate_viewer_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.wellbeing_aggregate_can_view_scope(p_scope_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wellbeing_aggregate_scopes s
    WHERE s.id = p_scope_id
      AND public.wellbeing_aggregate_viewer_profile_id() = ANY (s.viewer_profile_ids)
  );
$$;

REVOKE ALL ON FUNCTION public.wellbeing_aggregate_viewer_profile_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wellbeing_aggregate_can_view_scope(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wellbeing_aggregate_viewer_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wellbeing_aggregate_can_view_scope(uuid) TO authenticated;

-- Owner-only participation. Aggregate viewers must not read this table.
ALTER TABLE public.wellbeing_aggregate_participation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can read own wellbeing_aggregate_participation" ON public.wellbeing_aggregate_participation;
CREATE POLICY "Members can read own wellbeing_aggregate_participation"
  ON public.wellbeing_aggregate_participation FOR SELECT TO authenticated
  USING (public.happiness_owns_profile(profile_id));
DROP POLICY IF EXISTS "Members can insert own wellbeing_aggregate_participation" ON public.wellbeing_aggregate_participation;
CREATE POLICY "Members can insert own wellbeing_aggregate_participation"
  ON public.wellbeing_aggregate_participation FOR INSERT TO authenticated
  WITH CHECK (public.happiness_owns_profile(profile_id));
DROP POLICY IF EXISTS "Members can update own wellbeing_aggregate_participation" ON public.wellbeing_aggregate_participation;
CREATE POLICY "Members can update own wellbeing_aggregate_participation"
  ON public.wellbeing_aggregate_participation FOR UPDATE TO authenticated
  USING (public.happiness_owns_profile(profile_id))
  WITH CHECK (public.happiness_owns_profile(profile_id));
DROP POLICY IF EXISTS "Members can delete own wellbeing_aggregate_participation" ON public.wellbeing_aggregate_participation;
CREATE POLICY "Members can delete own wellbeing_aggregate_participation"
  ON public.wellbeing_aggregate_participation FOR DELETE TO authenticated
  USING (public.happiness_owns_profile(profile_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wellbeing_aggregate_participation TO authenticated;
REVOKE ALL ON public.wellbeing_aggregate_participation FROM anon;

ALTER TABLE public.wellbeing_aggregate_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can read wellbeing_aggregate_policies" ON public.wellbeing_aggregate_policies;
CREATE POLICY "Members can read wellbeing_aggregate_policies"
  ON public.wellbeing_aggregate_policies FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.wellbeing_aggregate_policies TO authenticated;
REVOKE ALL ON public.wellbeing_aggregate_policies FROM anon;

ALTER TABLE public.wellbeing_aggregate_dimensions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can read wellbeing_aggregate_dimensions" ON public.wellbeing_aggregate_dimensions;
CREATE POLICY "Members can read wellbeing_aggregate_dimensions"
  ON public.wellbeing_aggregate_dimensions FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.wellbeing_aggregate_dimensions TO authenticated;
REVOKE ALL ON public.wellbeing_aggregate_dimensions FROM anon;

ALTER TABLE public.wellbeing_aggregate_scopes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Viewers can read enabled wellbeing_aggregate_scopes" ON public.wellbeing_aggregate_scopes;
CREATE POLICY "Viewers can read enabled wellbeing_aggregate_scopes"
  ON public.wellbeing_aggregate_scopes FOR SELECT TO authenticated
  USING (public.wellbeing_aggregate_can_view_scope(id));
GRANT SELECT ON public.wellbeing_aggregate_scopes TO authenticated;
REVOKE ALL ON public.wellbeing_aggregate_scopes FROM anon;

ALTER TABLE public.wellbeing_aggregate_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Viewers can read wellbeing_aggregate_snapshots" ON public.wellbeing_aggregate_snapshots;
CREATE POLICY "Viewers can read wellbeing_aggregate_snapshots"
  ON public.wellbeing_aggregate_snapshots FOR SELECT TO authenticated
  USING (public.wellbeing_aggregate_can_view_scope(scope_id));
GRANT SELECT ON public.wellbeing_aggregate_snapshots TO authenticated;
REVOKE ALL ON public.wellbeing_aggregate_snapshots FROM anon;

ALTER TABLE public.wellbeing_aggregate_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Requesters can read own wellbeing_aggregate_audit" ON public.wellbeing_aggregate_audit;
CREATE POLICY "Requesters can read own wellbeing_aggregate_audit"
  ON public.wellbeing_aggregate_audit FOR SELECT TO authenticated
  USING (public.happiness_owns_profile(requester_profile_id));
GRANT SELECT ON public.wellbeing_aggregate_audit TO authenticated;
REVOKE ALL ON public.wellbeing_aggregate_audit FROM anon;

ALTER TABLE public.systemic_issue_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Viewers can read systemic_issue_candidates" ON public.systemic_issue_candidates;
CREATE POLICY "Viewers can read systemic_issue_candidates"
  ON public.systemic_issue_candidates FOR SELECT TO authenticated
  USING (public.wellbeing_aggregate_can_view_scope(scope_id));
GRANT SELECT ON public.systemic_issue_candidates TO authenticated;
REVOKE ALL ON public.systemic_issue_candidates FROM anon;

ALTER TABLE public.systemic_issue_evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Viewers can read systemic_issue_evidence" ON public.systemic_issue_evidence;
CREATE POLICY "Viewers can read systemic_issue_evidence"
  ON public.systemic_issue_evidence FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.systemic_issue_candidates c
      WHERE c.id = candidate_id AND public.wellbeing_aggregate_can_view_scope(c.scope_id)
    )
  );
GRANT SELECT ON public.systemic_issue_evidence TO authenticated;
REVOKE ALL ON public.systemic_issue_evidence FROM anon;

CREATE OR REPLACE FUNCTION public.get_wellbeing_aggregate(p_query jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_scope_id uuid;
  v_fingerprint text;
  v_topic text;
  v_time_bucket text;
  v_period_start text;
  v_snapshot jsonb;
  v_result jsonb;
  v_suppression text;
BEGIN
  -- Trusted boundary: this function must never SELECT happiness_checkins, fulfillment_plans,
  -- work_joy_entries, or other private Happiness tables. Phase 4B consumes snapshots only.
  v_profile_id := public.wellbeing_aggregate_viewer_profile_id();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_scope_id := NULLIF(p_query->>'scopeId', '')::uuid;
  v_topic := COALESCE(p_query->>'topic', 'domain_state');
  v_time_bucket := COALESCE(p_query->>'timeBucket', 'quarter');
  v_period_start := COALESCE(p_query->>'periodStart', '');
  v_fingerprint := concat_ws(
    '|',
    COALESCE(p_query->>'scopeId', ''),
    v_topic,
    v_time_bucket,
    v_period_start,
    COALESCE(p_query->>'domain', ''),
    COALESCE(p_query->>'factorCategory', ''),
    COALESCE(p_query->>'interventionType', ''),
    COALESCE(p_query->>'workContextType', ''),
    COALESCE(p_query->>'geography', '')
  );

  IF v_scope_id IS NULL OR NOT public.wellbeing_aggregate_can_view_scope(v_scope_id) THEN
    v_result := jsonb_build_object(
      'kind', 'suppressed',
      'reason', 'unauthorized',
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1',
      'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'summary', 'This wellbeing insight is not available.'
    );
    v_suppression := 'unauthorized';
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.wellbeing_aggregate_scopes s WHERE s.id = v_scope_id AND s.enabled
  ) THEN
    v_result := jsonb_build_object(
      'kind', 'suppressed',
      'reason', 'scope_not_enabled',
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1',
      'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'summary', 'Wellbeing intelligence is not enabled for this group.'
    );
    v_suppression := 'scope_not_enabled';
  ELSE
    SELECT s.result INTO v_snapshot
    FROM public.wellbeing_aggregate_snapshots s
    WHERE s.scope_id = v_scope_id
      AND s.fingerprint = v_fingerprint
      AND s.privacy_policy_version = 'wellbeing-aggregate-privacy-v1'
      AND s.aggregation_model_version = 'wellbeing-aggregate-v1'
    ORDER BY s.created_at DESC
    LIMIT 1;

    IF v_snapshot IS NULL THEN
      v_result := jsonb_build_object(
        'kind', 'suppressed',
        'reason', 'not_enough_observations',
        'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1',
        'aggregationModelVersion', 'wellbeing-aggregate-v1',
        'summary', 'There is not enough privacy-protected participation to share a group insight.'
      );
      v_suppression := 'not_enough_observations';
    ELSE
      v_result := v_snapshot;
      v_suppression := v_snapshot->>'reason';
    END IF;
  END IF;

  INSERT INTO public.wellbeing_aggregate_audit (
    requester_profile_id, scope_id, fingerprint, time_bucket, topic, suppression,
    privacy_policy_version, aggregation_model_version
  ) VALUES (
    v_profile_id, v_scope_id, v_fingerprint, v_time_bucket, v_topic, v_suppression,
    'wellbeing-aggregate-privacy-v1', 'wellbeing-aggregate-v1'
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_wellbeing_aggregate(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wellbeing_aggregate(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
