-- Phase 4A trusted generation boundary.
-- Collect and persist are service_role only. Aggregate viewers use get_wellbeing_aggregate
-- (snapshots only) and must never read private Happiness rows.

CREATE TABLE IF NOT EXISTS public.wellbeing_aggregate_scope_membership (
  scope_id uuid NOT NULL REFERENCES public.wellbeing_aggregate_scopes(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope_id, profile_id)
);

COMMENT ON TABLE public.wellbeing_aggregate_scope_membership IS
  'Approved-cohort membership for privileged generation only. Aggregate viewers have no SELECT. Not a general organization directory.';

ALTER TABLE public.wellbeing_aggregate_scope_membership ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wellbeing_aggregate_scope_membership FROM anon;
REVOKE ALL ON public.wellbeing_aggregate_scope_membership FROM authenticated;

CREATE OR REPLACE FUNCTION public.collect_wellbeing_structured_signals(
  p_scope_id uuid,
  p_period_start date,
  p_time_bucket text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signals jsonb := '[]'::jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'wellbeing aggregate generation is not available to members or aggregate viewers';
  END IF;
  IF p_time_bucket NOT IN ('month', 'quarter', 'rolling_6_weeks') THEN
    RAISE EXCEPTION 'time bucket not permitted';
  END IF;

  -- Structured domain states only. Never select check-in notes, plan text, or Work Joy notes.
  SELECT COALESCE(jsonb_agg(signal ORDER BY signal->>'member_key'), '[]'::jsonb)
  INTO v_signals
  FROM (
    SELECT jsonb_build_object(
      'member_key', md5(m.scope_id::text || ':' || m.profile_id::text),
      'participating', p.enabled,
      'in_scope', true,
      'in_period', r.month_start >= p_period_start,
      'domain', d.key,
      'level', d.value
    ) AS signal
    FROM public.wellbeing_aggregate_scope_membership m
    JOIN public.wellbeing_aggregate_participation p ON p.profile_id = m.profile_id
    JOIN public.happiness_monthly_reviews r ON r.profile_id = m.profile_id
    CROSS JOIN LATERAL jsonb_each_text(r.domain_answers) AS d(key, value)
    WHERE m.scope_id = p_scope_id
      AND p.enabled
      AND d.value IN ('struggling', 'unsettled', 'balanced', 'flourishing', 'thriving')
  ) structured;

  RETURN v_signals;
END;
$$;

CREATE OR REPLACE FUNCTION public.persist_wellbeing_aggregate_snapshot(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_result jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'wellbeing aggregate generation is not available to members or aggregate viewers';
  END IF;

  v_result := p_payload->'result';
  IF v_result IS NULL THEN
    RAISE EXCEPTION 'snapshot result required';
  END IF;
  IF v_result::text ILIKE '%memberKey%' OR v_result::text ILIKE '%privateNote%' OR v_result::text ILIKE '%"profile_id"%' THEN
    RAISE EXCEPTION 'snapshot must not contain member identifiers or private notes';
  END IF;

  INSERT INTO public.wellbeing_aggregate_snapshots (
    scope_id, fingerprint, period_start, time_bucket, topic, result,
    privacy_policy_version, aggregation_model_version, suppression
  ) VALUES (
    (p_payload->>'scopeId')::uuid,
    p_payload->>'fingerprint',
    (p_payload->>'periodStart')::date,
    p_payload->>'timeBucket',
    p_payload->>'topic',
    v_result,
    COALESCE(p_payload->>'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1'),
    COALESCE(p_payload->>'aggregationModelVersion', 'wellbeing-aggregate-v1'),
    v_result->>'reason'
  )
  ON CONFLICT (scope_id, fingerprint, privacy_policy_version, aggregation_model_version)
  DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT s.id INTO v_id
    FROM public.wellbeing_aggregate_snapshots s
    WHERE s.scope_id = (p_payload->>'scopeId')::uuid
      AND s.fingerprint = p_payload->>'fingerprint'
      AND s.privacy_policy_version = COALESCE(p_payload->>'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1')
      AND s.aggregation_model_version = COALESCE(p_payload->>'aggregationModelVersion', 'wellbeing-aggregate-v1');
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.collect_wellbeing_structured_signals(uuid, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.collect_wellbeing_structured_signals(uuid, date, text) FROM anon;
REVOKE ALL ON FUNCTION public.collect_wellbeing_structured_signals(uuid, date, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.collect_wellbeing_structured_signals(uuid, date, text) TO service_role;

REVOKE ALL ON FUNCTION public.persist_wellbeing_aggregate_snapshot(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.persist_wellbeing_aggregate_snapshot(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.persist_wellbeing_aggregate_snapshot(jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.persist_wellbeing_aggregate_snapshot(jsonb) TO service_role;

COMMENT ON FUNCTION public.collect_wellbeing_structured_signals(uuid, date, text) IS
  'Privileged collector: structured domain states for participating in-scope members. service_role only. No notes.';
COMMENT ON FUNCTION public.persist_wellbeing_aggregate_snapshot(jsonb) IS
  'Privileged writer for privacy-safe snapshots. Does not rewrite historic rows. service_role only.';

NOTIFY pgrst, 'reload schema';
