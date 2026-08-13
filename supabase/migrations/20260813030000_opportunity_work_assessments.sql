-- Slice 2: optional contribution evaluation, distinct from verification.
-- Does not change participation lifecycle or evaluate_opportunity_work.
-- opportunity_participations remains the authoritative contribution record.

CREATE OR REPLACE FUNCTION public.sanitize_opportunity_evaluation_dimensions(p_dims text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(
    ARRAY(
      SELECT d
      FROM unnest(ARRAY[
        'completion',
        'quality',
        'reliability',
        'collaboration',
        'outcome',
        'impact'
      ]) AS d
      WHERE d = ANY (coalesce(p_dims, '{}'::text[]))
    ),
    '{}'::text[]
  );
$$;

CREATE OR REPLACE FUNCTION public.opportunity_evaluation_dimensions_are_valid(p_dims text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_dims IS NOT NULL
    AND cardinality(p_dims) = (
      SELECT count(DISTINCT d) FROM unnest(p_dims) AS d
    )
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(p_dims) AS d
      WHERE d NOT IN (
        'completion',
        'quality',
        'reliability',
        'collaboration',
        'outcome',
        'impact'
      )
    );
$$;

ALTER TABLE public.contribution_opportunities
  ADD COLUMN IF NOT EXISTS evaluation_dimensions text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.contribution_opportunities
  DROP CONSTRAINT IF EXISTS contribution_opportunities_evaluation_dimensions_valid;

ALTER TABLE public.contribution_opportunities
  ADD CONSTRAINT contribution_opportunities_evaluation_dimensions_valid
  CHECK (public.opportunity_evaluation_dimensions_are_valid(evaluation_dimensions));

CREATE TABLE IF NOT EXISTS public.opportunity_work_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participation_id uuid NOT NULL UNIQUE
    REFERENCES public.opportunity_participations(id) ON DELETE CASCADE,
  evaluator_profile_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes text,
  completion_score numeric(6, 2)
    CHECK (completion_score IS NULL OR (completion_score >= 0 AND completion_score <= 100)),
  quality_score numeric(6, 2)
    CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)),
  reliability_score numeric(6, 2)
    CHECK (reliability_score IS NULL OR (reliability_score >= 0 AND reliability_score <= 100)),
  collaboration_score numeric(6, 2)
    CHECK (collaboration_score IS NULL OR (collaboration_score >= 0 AND collaboration_score <= 100)),
  outcome_score numeric(6, 2)
    CHECK (outcome_score IS NULL OR (outcome_score >= 0 AND outcome_score <= 100)),
  impact_score numeric(6, 2)
    CHECK (impact_score IS NULL OR (impact_score >= 0 AND impact_score <= 100)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_work_assessments_notes_len
    CHECK (notes IS NULL OR char_length(trim(notes)) <= 4000)
);

CREATE INDEX IF NOT EXISTS opportunity_work_assessments_evaluator_idx
  ON public.opportunity_work_assessments (evaluator_profile_id, created_at DESC);

COMMENT ON TABLE public.opportunity_work_assessments IS
  'Optional post-verification quality evaluation. Independent of verification_status.';

CREATE OR REPLACE FUNCTION public.opportunity_dimensions_from_payload(payload jsonb)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_raw text[];
  v_dims text[];
BEGIN
  IF payload IS NULL OR NOT (payload ? 'evaluation_dimensions') THEN
    RETURN '{}'::text[];
  END IF;

  v_raw := coalesce(
    ARRAY(SELECT jsonb_array_elements_text(coalesce(payload->'evaluation_dimensions', '[]'::jsonb))),
    '{}'::text[]
  );

  IF EXISTS (
    SELECT 1
    FROM unnest(v_raw) AS d
    WHERE d NOT IN (
      'completion',
      'quality',
      'reliability',
      'collaboration',
      'outcome',
      'impact'
    )
  ) THEN
    RAISE EXCEPTION 'invalid_evaluation_dimension';
  END IF;

  v_dims := public.sanitize_opportunity_evaluation_dimensions(v_raw);
  RETURN v_dims;
END;
$$;

CREATE OR REPLACE FUNCTION public.opportunity_assessment_score_value(
  p_scores jsonb,
  p_key text,
  p_enabled text[]
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_raw jsonb;
  v_num numeric;
BEGIN
  IF p_scores IS NULL OR p_scores = 'null'::jsonb THEN
    RETURN NULL;
  END IF;
  IF jsonb_typeof(p_scores) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'invalid_evaluation_scores';
  END IF;

  v_raw := p_scores -> p_key;
  IF v_raw IS NULL OR v_raw = 'null'::jsonb THEN
    RETURN NULL;
  END IF;

  IF NOT (p_key = ANY (coalesce(p_enabled, '{}'::text[]))) THEN
    RAISE EXCEPTION 'invalid_evaluation_dimension';
  END IF;

  BEGIN
    IF jsonb_typeof(v_raw) = 'number' THEN
      v_num := (v_raw #>> '{}')::numeric;
    ELSIF jsonb_typeof(v_raw) = 'string' AND nullif(trim(v_raw #>> '{}'), '') IS NOT NULL THEN
      v_num := trim(v_raw #>> '{}')::numeric;
    ELSE
      RAISE EXCEPTION 'invalid_evaluation_score';
    END IF;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid_evaluation_score';
  END;

  IF v_num < 0 OR v_num > 100 THEN
    RAISE EXCEPTION 'invalid_evaluation_score';
  END IF;

  RETURN v_num;
END;
$$;

-- ---------------------------------------------------------------------------
-- create / update: persist evaluation_dimensions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_contribution_opportunity(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_id uuid;
  v_status text;
BEGIN
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  v_status := coalesce(nullif(trim(payload->>'status'), ''), 'draft');
  IF v_status NOT IN ('draft', 'open') THEN
    RAISE EXCEPTION 'invalid_opportunity_status';
  END IF;

  INSERT INTO public.contribution_opportunities (
    publisher_profile_id,
    title,
    summary,
    description,
    status,
    opportunity_kind,
    area_node_id,
    required_skills,
    optional_skills,
    location_text,
    is_remote,
    estimated_effort,
    application_deadline,
    work_starts_at,
    work_ends_at,
    compensation_status,
    expected_outcome,
    evidence_requirements,
    evaluation_criteria,
    evaluation_dimensions
  )
  VALUES (
    v_profile,
    trim(payload->>'title'),
    trim(payload->>'summary'),
    nullif(trim(payload->>'description'), ''),
    v_status,
    coalesce(nullif(trim(payload->>'opportunity_kind'), ''), 'education_to_contribution'),
    nullif(trim(payload->>'area_node_id'), ''),
    coalesce(
      ARRAY(SELECT jsonb_array_elements_text(coalesce(payload->'required_skills', '[]'::jsonb))),
      '{}'::text[]
    ),
    coalesce(
      ARRAY(SELECT jsonb_array_elements_text(coalesce(payload->'optional_skills', '[]'::jsonb))),
      '{}'::text[]
    ),
    nullif(trim(payload->>'location_text'), ''),
    coalesce((payload->>'is_remote')::boolean, true),
    nullif(trim(payload->>'estimated_effort'), ''),
    nullif(payload->>'application_deadline', '')::timestamptz,
    nullif(payload->>'work_starts_at', '')::timestamptz,
    nullif(payload->>'work_ends_at', '')::timestamptz,
    coalesce(nullif(trim(payload->>'compensation_status'), ''), 'learning'),
    nullif(trim(payload->>'expected_outcome'), ''),
    nullif(trim(payload->>'evidence_requirements'), ''),
    nullif(trim(payload->>'evaluation_criteria'), ''),
    public.opportunity_dimensions_from_payload(payload)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_contribution_opportunity(
  p_opportunity_id uuid,
  payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opp public.contribution_opportunities%ROWTYPE;
BEGIN
  IF public.current_profile_id() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_opp
  FROM public.contribution_opportunities
  WHERE id = p_opportunity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'opportunity_not_found';
  END IF;

  IF NOT public.current_profile_manages_publisher(v_opp.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_opp.status = 'cancelled' THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  UPDATE public.contribution_opportunities
  SET
    title = coalesce(nullif(trim(payload->>'title'), ''), title),
    summary = coalesce(nullif(trim(payload->>'summary'), ''), summary),
    description = CASE
      WHEN payload ? 'description' THEN nullif(trim(payload->>'description'), '')
      ELSE description
    END,
    area_node_id = CASE
      WHEN payload ? 'area_node_id' THEN nullif(trim(payload->>'area_node_id'), '')
      ELSE area_node_id
    END,
    required_skills = CASE
      WHEN payload ? 'required_skills' THEN
        ARRAY(SELECT jsonb_array_elements_text(coalesce(payload->'required_skills', '[]'::jsonb)))
      ELSE required_skills
    END,
    optional_skills = CASE
      WHEN payload ? 'optional_skills' THEN
        ARRAY(SELECT jsonb_array_elements_text(coalesce(payload->'optional_skills', '[]'::jsonb)))
      ELSE optional_skills
    END,
    location_text = CASE
      WHEN payload ? 'location_text' THEN nullif(trim(payload->>'location_text'), '')
      ELSE location_text
    END,
    is_remote = coalesce((payload->>'is_remote')::boolean, is_remote),
    estimated_effort = CASE
      WHEN payload ? 'estimated_effort' THEN nullif(trim(payload->>'estimated_effort'), '')
      ELSE estimated_effort
    END,
    application_deadline = CASE
      WHEN payload ? 'application_deadline' THEN nullif(payload->>'application_deadline', '')::timestamptz
      ELSE application_deadline
    END,
    work_starts_at = CASE
      WHEN payload ? 'work_starts_at' THEN nullif(payload->>'work_starts_at', '')::timestamptz
      ELSE work_starts_at
    END,
    work_ends_at = CASE
      WHEN payload ? 'work_ends_at' THEN nullif(payload->>'work_ends_at', '')::timestamptz
      ELSE work_ends_at
    END,
    compensation_status = coalesce(
      nullif(trim(payload->>'compensation_status'), ''),
      compensation_status
    ),
    expected_outcome = CASE
      WHEN payload ? 'expected_outcome' THEN nullif(trim(payload->>'expected_outcome'), '')
      ELSE expected_outcome
    END,
    evidence_requirements = CASE
      WHEN payload ? 'evidence_requirements' THEN nullif(trim(payload->>'evidence_requirements'), '')
      ELSE evidence_requirements
    END,
    evaluation_criteria = CASE
      WHEN payload ? 'evaluation_criteria' THEN nullif(trim(payload->>'evaluation_criteria'), '')
      ELSE evaluation_criteria
    END,
    evaluation_dimensions = CASE
      WHEN payload ? 'evaluation_dimensions' THEN public.opportunity_dimensions_from_payload(payload)
      ELSE evaluation_dimensions
    END,
    updated_at = now()
  WHERE id = p_opportunity_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Score projection: assessment (if present) then verification scores, else defaults.
-- Only quality, impact, and collaboration from assessment affect estimates.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.project_opportunity_contribution_event(p_participation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_part public.opportunity_participations%ROWTYPE;
  v_opp public.contribution_opportunities%ROWTYPE;
  v_eval public.opportunity_evaluations%ROWTYPE;
  v_assess public.opportunity_work_assessments%ROWTYPE;
  v_capacity numeric(6, 2);
  v_impact numeric(6, 2);
  v_collab numeric(6, 2);
BEGIN
  SELECT * INTO v_part
  FROM public.opportunity_participations
  WHERE id = p_participation_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_part.status IS DISTINCT FROM 'completed'
     OR v_part.verification_status IS DISTINCT FROM 'verified' THEN
    RETURN;
  END IF;

  SELECT * INTO v_opp
  FROM public.contribution_opportunities
  WHERE id = v_part.opportunity_id;

  SELECT * INTO v_assess
  FROM public.opportunity_work_assessments
  WHERE participation_id = p_participation_id;

  SELECT * INTO v_eval
  FROM public.opportunity_evaluations
  WHERE participation_id = p_participation_id
    AND decision = 'verified'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_assess.id IS NOT NULL THEN
    v_capacity := least(100, greatest(0, coalesce(v_assess.quality_score, 75)));
    v_impact := least(100, greatest(0, coalesce(v_assess.impact_score, 70) * 1.25));
    v_collab := least(100, greatest(0, coalesce(v_assess.collaboration_score, 40)));
  ELSE
    v_capacity := least(100, greatest(0, coalesce(v_eval.quality_score, 75)));
    v_impact := least(100, greatest(0, coalesce(v_eval.impact_score, 70) * 1.25));
    v_collab := 40;
  END IF;

  INSERT INTO public.profile_contribution_events (
    profile_id,
    source_table,
    source_id,
    event_type,
    title,
    summary,
    capacity_estimate,
    impact_estimate,
    collaboration_estimate,
    beneficiary_estimate,
    verified,
    occurred_at,
    raw_meta
  )
  VALUES (
    v_part.participant_profile_id,
    'opportunity_participations',
    v_part.id::text,
    'opportunity_participation',
    left(coalesce(nullif(trim(v_opp.title), ''), 'Verified contribution'), 120),
    left(coalesce(v_opp.opportunity_kind, 'education_to_contribution'), 80),
    v_capacity,
    v_impact,
    v_collab,
    65,
    true,
    coalesce(v_part.completed_at, now()),
    jsonb_build_object('kind', v_opp.opportunity_kind)
  )
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    capacity_estimate = EXCLUDED.capacity_estimate,
    impact_estimate = EXCLUDED.impact_estimate,
    collaboration_estimate = EXCLUDED.collaboration_estimate,
    beneficiary_estimate = EXCLUDED.beneficiary_estimate,
    verified = true,
    occurred_at = EXCLUDED.occurred_at,
    raw_meta = EXCLUDED.raw_meta,
    updated_at = now();
END;
$$;

-- ---------------------------------------------------------------------------
-- Record optional evaluation after verification. Does not change lifecycle.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_opportunity_work_assessment(
  p_participation_id uuid,
  p_scores jsonb DEFAULT '{}'::jsonb,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_part public.opportunity_participations%ROWTYPE;
  v_opp public.contribution_opportunities%ROWTYPE;
  v_id uuid;
  v_notes text;
  v_completion numeric(6, 2);
  v_quality numeric(6, 2);
  v_reliability numeric(6, 2);
  v_collaboration numeric(6, 2);
  v_outcome numeric(6, 2);
  v_impact numeric(6, 2);
BEGIN
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_part
  FROM public.opportunity_participations
  WHERE id = p_participation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'participation_not_found';
  END IF;

  SELECT * INTO v_opp
  FROM public.contribution_opportunities
  WHERE id = v_part.opportunity_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'opportunity_not_found';
  END IF;

  IF NOT public.current_profile_manages_publisher(v_opp.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_part.participant_profile_id = v_profile THEN
    RAISE EXCEPTION 'self_evaluation_forbidden';
  END IF;

  IF v_part.status IS DISTINCT FROM 'completed'
     OR v_part.verification_status IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'work_not_verified';
  END IF;

  IF coalesce(cardinality(v_opp.evaluation_dimensions), 0) = 0 THEN
    RAISE EXCEPTION 'evaluation_not_configured';
  END IF;

  IF p_scores IS NULL OR p_scores = 'null'::jsonb THEN
    p_scores := '{}'::jsonb;
  END IF;
  IF jsonb_typeof(p_scores) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'invalid_evaluation_scores';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_scores) AS k
    WHERE k NOT IN (
      'completion',
      'quality',
      'reliability',
      'collaboration',
      'outcome',
      'impact'
    )
  ) THEN
    RAISE EXCEPTION 'invalid_evaluation_dimension';
  END IF;

  v_completion := public.opportunity_assessment_score_value(p_scores, 'completion', v_opp.evaluation_dimensions);
  v_quality := public.opportunity_assessment_score_value(p_scores, 'quality', v_opp.evaluation_dimensions);
  v_reliability := public.opportunity_assessment_score_value(p_scores, 'reliability', v_opp.evaluation_dimensions);
  v_collaboration := public.opportunity_assessment_score_value(p_scores, 'collaboration', v_opp.evaluation_dimensions);
  v_outcome := public.opportunity_assessment_score_value(p_scores, 'outcome', v_opp.evaluation_dimensions);
  v_impact := public.opportunity_assessment_score_value(p_scores, 'impact', v_opp.evaluation_dimensions);
  v_notes := nullif(trim(coalesce(p_notes, '')), '');

  IF v_notes IS NULL
     AND v_completion IS NULL
     AND v_quality IS NULL
     AND v_reliability IS NULL
     AND v_collaboration IS NULL
     AND v_outcome IS NULL
     AND v_impact IS NULL THEN
    RAISE EXCEPTION 'evaluation_empty';
  END IF;

  INSERT INTO public.opportunity_work_assessments (
    participation_id,
    evaluator_profile_id,
    notes,
    completion_score,
    quality_score,
    reliability_score,
    collaboration_score,
    outcome_score,
    impact_score
  )
  VALUES (
    p_participation_id,
    v_profile,
    v_notes,
    v_completion,
    v_quality,
    v_reliability,
    v_collaboration,
    v_outcome,
    v_impact
  )
  ON CONFLICT (participation_id) DO UPDATE SET
    evaluator_profile_id = EXCLUDED.evaluator_profile_id,
    notes = EXCLUDED.notes,
    completion_score = EXCLUDED.completion_score,
    quality_score = EXCLUDED.quality_score,
    reliability_score = EXCLUDED.reliability_score,
    collaboration_score = EXCLUDED.collaboration_score,
    outcome_score = EXCLUDED.outcome_score,
    impact_score = EXCLUDED.impact_score,
    updated_at = now()
  RETURNING id INTO v_id;

  PERFORM public.project_opportunity_contribution_event(p_participation_id);

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sanitize_opportunity_evaluation_dimensions(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.opportunity_evaluation_dimensions_are_valid(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.opportunity_dimensions_from_payload(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.opportunity_assessment_score_value(jsonb, text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_opportunity_work_assessment(uuid, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_contribution_opportunity(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_contribution_opportunity(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.project_opportunity_contribution_event(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_contribution_opportunity(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_contribution_opportunity(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.project_opportunity_contribution_event(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_opportunity_work_assessment(uuid, jsonb, text) TO authenticated;

ALTER TABLE public.opportunity_work_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants and organizers can read work assessments"
  ON public.opportunity_work_assessments;
CREATE POLICY "Participants and organizers can read work assessments"
  ON public.opportunity_work_assessments
  FOR SELECT
  TO authenticated
  USING (public.current_profile_can_read_participation(participation_id));

GRANT SELECT ON public.opportunity_work_assessments TO authenticated;
