-- Phase 4A acceptance: aggregate viewers may read privacy-safe snapshots, not write them,
-- and cannot request a raw/unsuppressed mode through get_wellbeing_aggregate.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.wellbeing_aggregate_snapshots FROM authenticated;
GRANT SELECT ON public.wellbeing_aggregate_snapshots TO authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.wellbeing_aggregate_audit FROM authenticated;
GRANT SELECT ON public.wellbeing_aggregate_audit TO authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.wellbeing_aggregate_scopes FROM authenticated;
GRANT SELECT ON public.wellbeing_aggregate_scopes TO authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.systemic_issue_candidates FROM authenticated;
GRANT SELECT ON public.systemic_issue_candidates TO authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.systemic_issue_evidence FROM authenticated;
GRANT SELECT ON public.systemic_issue_evidence TO authenticated;

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
  v_bypass boolean;
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

  SELECT EXISTS (
    SELECT 1
    FROM jsonb_each(COALESCE(p_query, '{}'::jsonb)) AS e(k, v)
    WHERE e.k IN ('raw', 'unsuppressed', 'bypassPrivacy', 'includeMemberIds', 'debugCohort', 'exactCounts')
      AND e.v NOT IN ('false'::jsonb, 'null'::jsonb, '0'::jsonb, '""'::jsonb)
  ) INTO v_bypass;

  IF v_scope_id IS NULL OR NOT public.wellbeing_aggregate_can_view_scope(v_scope_id) THEN
    v_result := jsonb_build_object(
      'kind', 'suppressed',
      'reason', 'unauthorized',
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1',
      'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'summary', 'This wellbeing insight is not available.'
    );
    v_suppression := 'unauthorized';
  ELSIF v_bypass THEN
    v_result := jsonb_build_object(
      'kind', 'suppressed',
      'reason', 'bypass_not_permitted',
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1',
      'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'summary', 'That combination of wellbeing insight is not available.'
    );
    v_suppression := 'bypass_not_permitted';
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
REVOKE ALL ON FUNCTION public.get_wellbeing_aggregate(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_wellbeing_aggregate(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
