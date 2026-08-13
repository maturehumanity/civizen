-- Slice 1: Education-to-Contribution opportunities.
-- Participations are the durable workflow record.
-- Verified completed work projects into profile_contribution_events (score sink only).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_profile_manages_publisher(p_publisher_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_profile_id() IS NOT NULL
    AND p_publisher_profile_id IS NOT NULL
    AND (
      public.current_profile_id() = p_publisher_profile_id
      OR EXISTS (
        SELECT 1
        FROM public.linked_accounts la
        WHERE la.owner_profile_id = public.current_profile_id()
          AND la.linked_profile_id = p_publisher_profile_id
      )
    );
$$;

REVOKE ALL ON FUNCTION public.current_profile_manages_publisher(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_manages_publisher(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contribution_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'closed', 'cancelled')),
  opportunity_kind text NOT NULL DEFAULT 'education_to_contribution'
    CHECK (opportunity_kind IN ('education_to_contribution')),
  area_node_id text REFERENCES public.classification_nodes(id) ON DELETE SET NULL,
  required_skills text[] NOT NULL DEFAULT '{}'::text[],
  optional_skills text[] NOT NULL DEFAULT '{}'::text[],
  location_text text,
  is_remote boolean NOT NULL DEFAULT true,
  estimated_effort text,
  application_deadline timestamptz,
  work_starts_at timestamptz,
  work_ends_at timestamptz,
  compensation_status text NOT NULL DEFAULT 'learning'
    CHECK (compensation_status IN (
      'volunteer',
      'paid',
      'stipend',
      'credit',
      'learning',
      'mixed'
    )),
  expected_outcome text,
  evidence_requirements text,
  evaluation_criteria text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contribution_opportunities_title_len
    CHECK (char_length(trim(title)) BETWEEN 3 AND 160),
  CONSTRAINT contribution_opportunities_summary_len
    CHECK (char_length(trim(summary)) BETWEEN 3 AND 400)
);

CREATE INDEX IF NOT EXISTS contribution_opportunities_status_created_idx
  ON public.contribution_opportunities (status, created_at DESC);
CREATE INDEX IF NOT EXISTS contribution_opportunities_publisher_idx
  ON public.contribution_opportunities (publisher_profile_id, created_at DESC);

COMMENT ON TABLE public.contribution_opportunities IS
  'Reusable contribution opportunities. Slice 1 kind: education_to_contribution.';

CREATE TABLE IF NOT EXISTS public.opportunity_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL
    REFERENCES public.contribution_opportunities(id) ON DELETE CASCADE,
  participant_profile_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'applied'
    CHECK (status IN (
      'applied',
      'accepted',
      'active',
      'submitted',
      'completed',
      'declined',
      'withdrawn',
      'cancelled'
    )),
  verification_status text NOT NULL DEFAULT 'not_submitted'
    CHECK (verification_status IN (
      'not_submitted',
      'pending',
      'verified',
      'rejected',
      'disputed'
    )),
  application_message text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  declined_at timestamptz,
  declined_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decline_note text,
  activated_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  withdrawn_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_participations_one_per_opportunity
    UNIQUE (opportunity_id, participant_profile_id),
  CONSTRAINT opportunity_participations_message_len
    CHECK (application_message IS NULL OR char_length(trim(application_message)) <= 2000)
);

CREATE INDEX IF NOT EXISTS opportunity_participations_participant_idx
  ON public.opportunity_participations (participant_profile_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_participations_opportunity_status_idx
  ON public.opportunity_participations (opportunity_id, status);

COMMENT ON TABLE public.opportunity_participations IS
  'Durable Education-to-Contribution participation record. Not a score event.';

CREATE TABLE IF NOT EXISTS public.opportunity_participation_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participation_id uuid NOT NULL
    REFERENCES public.opportunity_participations(id) ON DELETE CASCADE,
  description text NOT NULL,
  reference_url text,
  reference_label text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_evidence_description_len
    CHECK (char_length(trim(description)) BETWEEN 3 AND 2000),
  CONSTRAINT opportunity_evidence_url_len
    CHECK (reference_url IS NULL OR char_length(trim(reference_url)) BETWEEN 8 AND 2000)
);

CREATE INDEX IF NOT EXISTS opportunity_participation_evidence_participation_idx
  ON public.opportunity_participation_evidence (participation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.opportunity_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participation_id uuid NOT NULL
    REFERENCES public.opportunity_participations(id) ON DELETE CASCADE,
  evaluator_profile_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  decision text NOT NULL
    CHECK (decision IN ('verified', 'rejected', 'disputed')),
  feedback text,
  quality_score numeric(6, 2)
    CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100)),
  impact_score numeric(6, 2)
    CHECK (impact_score IS NULL OR (impact_score >= 0 AND impact_score <= 100)),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_evaluations_feedback_len
    CHECK (feedback IS NULL OR char_length(trim(feedback)) <= 4000)
);

CREATE INDEX IF NOT EXISTS opportunity_evaluations_participation_idx
  ON public.opportunity_evaluations (participation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.opportunity_skill_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participation_id uuid NOT NULL
    REFERENCES public.opportunity_participations(id) ON DELETE CASCADE,
  evaluation_id uuid REFERENCES public.opportunity_evaluations(id) ON DELETE SET NULL,
  skill_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_skill_evidence_name_len
    CHECK (char_length(trim(skill_name)) BETWEEN 1 AND 120),
  CONSTRAINT opportunity_skill_evidence_unique
    UNIQUE (participation_id, skill_name)
);

CREATE INDEX IF NOT EXISTS opportunity_skill_evidence_participation_idx
  ON public.opportunity_skill_evidence (participation_id);

-- ---------------------------------------------------------------------------
-- Helpers that depend on opportunity tables
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_profile_has_opportunity_participation(p_opportunity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.opportunity_participations p
    WHERE p.opportunity_id = p_opportunity_id
      AND p.participant_profile_id = public.current_profile_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.opportunity_publisher_id(p_opportunity_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT publisher_profile_id
  FROM public.contribution_opportunities
  WHERE id = p_opportunity_id;
$$;

CREATE OR REPLACE FUNCTION public.current_profile_can_read_participation(p_participation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.opportunity_participations p
    WHERE p.id = p_participation_id
      AND (
        p.participant_profile_id = public.current_profile_id()
        OR public.current_profile_manages_publisher(
          public.opportunity_publisher_id(p.opportunity_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.participation_is_verified_completed(p_participation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.opportunity_participations p
    WHERE p.id = p_participation_id
      AND p.status = 'completed'
      AND p.verification_status = 'verified'
  );
$$;

REVOKE ALL ON FUNCTION public.current_profile_has_opportunity_participation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_has_opportunity_participation(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.opportunity_publisher_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.opportunity_publisher_id(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.current_profile_can_read_participation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_profile_can_read_participation(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.participation_is_verified_completed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.participation_is_verified_completed(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  CREATE TRIGGER update_contribution_opportunities_updated_at
    BEFORE UPDATE ON public.contribution_opportunities
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_opportunity_participations_updated_at
    BEFORE UPDATE ON public.opportunity_participations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_function THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.forbid_opportunity_self_evaluation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_participant uuid;
BEGIN
  SELECT participant_profile_id INTO v_participant
  FROM public.opportunity_participations
  WHERE id = NEW.participation_id;

  IF v_participant IS NOT NULL AND v_participant = NEW.evaluator_profile_id THEN
    RAISE EXCEPTION 'self_evaluation_forbidden';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS opportunity_evaluations_no_self ON public.opportunity_evaluations;
CREATE TRIGGER opportunity_evaluations_no_self
  BEFORE INSERT OR UPDATE ON public.opportunity_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.forbid_opportunity_self_evaluation();

-- ---------------------------------------------------------------------------
-- Score projection (derived; idempotent)
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
  v_capacity numeric(6, 2);
  v_impact numeric(6, 2);
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

  SELECT * INTO v_eval
  FROM public.opportunity_evaluations
  WHERE participation_id = p_participation_id
    AND decision = 'verified'
  ORDER BY created_at DESC
  LIMIT 1;

  v_capacity := least(100, greatest(0, coalesce(v_eval.quality_score, 75)));
  v_impact := least(100, greatest(0, coalesce(v_eval.impact_score, 70) * 1.25));

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
    40,
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

REVOKE ALL ON FUNCTION public.project_opportunity_contribution_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.project_opportunity_contribution_event(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: create / update / status
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
    evaluation_criteria
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
    nullif(trim(payload->>'evaluation_criteria'), '')
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
    updated_at = now()
  WHERE id = p_opportunity_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_contribution_opportunity_status(
  p_opportunity_id uuid,
  p_status text
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

  IF p_status NOT IN ('draft', 'open', 'closed', 'cancelled') THEN
    RAISE EXCEPTION 'invalid_opportunity_status';
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

  IF v_opp.status = p_status THEN
    RETURN;
  END IF;

  IF v_opp.status = 'cancelled' THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  IF v_opp.status = 'draft' AND p_status NOT IN ('open', 'cancelled') THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  IF v_opp.status = 'open' AND p_status NOT IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  IF v_opp.status = 'closed' AND p_status NOT IN ('open', 'cancelled') THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  UPDATE public.contribution_opportunities
  SET status = p_status, updated_at = now()
  WHERE id = p_opportunity_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: apply / withdraw / review / start / evidence / submit / evaluate
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.apply_to_contribution_opportunity(
  p_opportunity_id uuid,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_opp public.contribution_opportunities%ROWTYPE;
  v_id uuid;
BEGIN
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_opp
  FROM public.contribution_opportunities
  WHERE id = p_opportunity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'opportunity_not_found';
  END IF;

  IF v_opp.status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'opportunity_not_open';
  END IF;

  IF v_opp.application_deadline IS NOT NULL AND v_opp.application_deadline < now() THEN
    RAISE EXCEPTION 'opportunity_deadline_passed';
  END IF;

  IF public.current_profile_manages_publisher(v_opp.publisher_profile_id) THEN
    RAISE EXCEPTION 'cannot_apply_to_own_opportunity';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.opportunity_participations
    WHERE opportunity_id = p_opportunity_id
      AND participant_profile_id = v_profile
  ) THEN
    RAISE EXCEPTION 'already_applied';
  END IF;

  INSERT INTO public.opportunity_participations (
    opportunity_id,
    participant_profile_id,
    status,
    verification_status,
    application_message,
    applied_at
  )
  VALUES (
    p_opportunity_id,
    v_profile,
    'applied',
    'not_submitted',
    nullif(trim(p_message), ''),
    now()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_opportunity_participation(p_participation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_part public.opportunity_participations%ROWTYPE;
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

  IF v_part.participant_profile_id IS DISTINCT FROM v_profile THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_part.status NOT IN ('applied', 'accepted') THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  UPDATE public.opportunity_participations
  SET
    status = 'withdrawn',
    withdrawn_at = now(),
    updated_at = now()
  WHERE id = p_participation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_opportunity_application(
  p_participation_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_part public.opportunity_participations%ROWTYPE;
  v_publisher uuid;
BEGIN
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_decision NOT IN ('accept', 'decline') THEN
    RAISE EXCEPTION 'invalid_decision';
  END IF;

  SELECT * INTO v_part
  FROM public.opportunity_participations
  WHERE id = p_participation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'participation_not_found';
  END IF;

  SELECT publisher_profile_id INTO v_publisher
  FROM public.contribution_opportunities
  WHERE id = v_part.opportunity_id;

  IF NOT public.current_profile_manages_publisher(v_publisher) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_part.status IS DISTINCT FROM 'applied' THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  IF p_decision = 'accept' THEN
    UPDATE public.opportunity_participations
    SET
      status = 'accepted',
      accepted_at = now(),
      accepted_by = v_profile,
      updated_at = now()
    WHERE id = p_participation_id;
  ELSE
    UPDATE public.opportunity_participations
    SET
      status = 'declined',
      declined_at = now(),
      declined_by = v_profile,
      decline_note = nullif(trim(p_note), ''),
      updated_at = now()
    WHERE id = p_participation_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_opportunity_work(p_participation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_part public.opportunity_participations%ROWTYPE;
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

  IF v_part.participant_profile_id IS DISTINCT FROM v_profile THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_part.status IS DISTINCT FROM 'accepted' THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  UPDATE public.opportunity_participations
  SET
    status = 'active',
    activated_at = now(),
    updated_at = now()
  WHERE id = p_participation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_opportunity_evidence(
  p_participation_id uuid,
  p_description text,
  p_reference_url text DEFAULT NULL,
  p_reference_label text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_part public.opportunity_participations%ROWTYPE;
  v_id uuid;
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

  IF v_part.participant_profile_id IS DISTINCT FROM v_profile THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_part.status NOT IN ('active', 'submitted') THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  IF v_part.status = 'submitted' AND v_part.verification_status NOT IN ('pending', 'rejected') THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  INSERT INTO public.opportunity_participation_evidence (
    participation_id,
    description,
    reference_url,
    reference_label,
    created_by
  )
  VALUES (
    p_participation_id,
    trim(p_description),
    nullif(trim(p_reference_url), ''),
    nullif(trim(p_reference_label), ''),
    v_profile
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_opportunity_work(p_participation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_part public.opportunity_participations%ROWTYPE;
  v_evidence_count integer;
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

  IF v_part.participant_profile_id IS DISTINCT FROM v_profile THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_part.status NOT IN ('active', 'submitted') THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  -- Resubmit after rejection stays on submitted/pending.
  IF v_part.status = 'submitted' AND v_part.verification_status NOT IN ('rejected', 'pending') THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  SELECT count(*) INTO v_evidence_count
  FROM public.opportunity_participation_evidence
  WHERE participation_id = p_participation_id;

  IF v_evidence_count < 1 THEN
    RAISE EXCEPTION 'evidence_required';
  END IF;

  UPDATE public.opportunity_participations
  SET
    status = 'submitted',
    verification_status = 'pending',
    submitted_at = now(),
    updated_at = now()
  WHERE id = p_participation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.evaluate_opportunity_work(
  p_participation_id uuid,
  p_decision text,
  p_feedback text DEFAULT NULL,
  p_quality_score numeric DEFAULT NULL,
  p_impact_score numeric DEFAULT NULL,
  p_skill_names text[] DEFAULT '{}'::text[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_part public.opportunity_participations%ROWTYPE;
  v_publisher uuid;
  v_eval_id uuid;
  v_skill text;
BEGIN
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_decision NOT IN ('verified', 'rejected', 'disputed') THEN
    RAISE EXCEPTION 'invalid_decision';
  END IF;

  SELECT * INTO v_part
  FROM public.opportunity_participations
  WHERE id = p_participation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'participation_not_found';
  END IF;

  SELECT publisher_profile_id INTO v_publisher
  FROM public.contribution_opportunities
  WHERE id = v_part.opportunity_id;

  IF NOT public.current_profile_manages_publisher(v_publisher) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_part.participant_profile_id = v_profile THEN
    RAISE EXCEPTION 'self_evaluation_forbidden';
  END IF;

  IF v_part.status IS DISTINCT FROM 'submitted'
     OR v_part.verification_status NOT IN ('pending', 'rejected', 'disputed') THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  INSERT INTO public.opportunity_evaluations (
    participation_id,
    evaluator_profile_id,
    decision,
    feedback,
    quality_score,
    impact_score
  )
  VALUES (
    p_participation_id,
    v_profile,
    p_decision,
    nullif(trim(p_feedback), ''),
    p_quality_score,
    p_impact_score
  )
  RETURNING id INTO v_eval_id;

  IF p_decision = 'verified' THEN
    DELETE FROM public.opportunity_skill_evidence
    WHERE participation_id = p_participation_id;

    FOREACH v_skill IN ARRAY coalesce(p_skill_names, '{}'::text[])
    LOOP
      IF char_length(trim(v_skill)) > 0 THEN
        INSERT INTO public.opportunity_skill_evidence (
          participation_id,
          evaluation_id,
          skill_name
        )
        VALUES (p_participation_id, v_eval_id, trim(v_skill))
        ON CONFLICT (participation_id, skill_name) DO NOTHING;
      END IF;
    END LOOP;

    UPDATE public.opportunity_participations
    SET
      status = 'completed',
      verification_status = 'verified',
      completed_at = now(),
      completed_by = v_profile,
      updated_at = now()
    WHERE id = p_participation_id;

    PERFORM public.project_opportunity_contribution_event(p_participation_id);
  ELSIF p_decision = 'rejected' THEN
    UPDATE public.opportunity_participations
    SET
      status = 'active',
      verification_status = 'rejected',
      updated_at = now()
    WHERE id = p_participation_id;
  ELSE
    UPDATE public.opportunity_participations
    SET
      verification_status = 'disputed',
      updated_at = now()
    WHERE id = p_participation_id;
  END IF;

  RETURN v_eval_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_opportunity_participation(p_participation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_part public.opportunity_participations%ROWTYPE;
  v_publisher uuid;
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

  SELECT publisher_profile_id INTO v_publisher
  FROM public.contribution_opportunities
  WHERE id = v_part.opportunity_id;

  IF NOT public.current_profile_manages_publisher(v_publisher) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_part.status IN ('completed', 'cancelled', 'withdrawn') THEN
    RAISE EXCEPTION 'invalid_transition';
  END IF;

  UPDATE public.opportunity_participations
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = v_profile,
    updated_at = now()
  WHERE id = p_participation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_contribution_opportunity(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_contribution_opportunity(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_contribution_opportunity_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_to_contribution_opportunity(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_opportunity_participation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_opportunity_application(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.start_opportunity_work(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_opportunity_evidence(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_opportunity_work(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.evaluate_opportunity_work(uuid, text, text, numeric, numeric, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_opportunity_participation(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_contribution_opportunity(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_contribution_opportunity(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_contribution_opportunity_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_to_contribution_opportunity(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_opportunity_participation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_opportunity_application(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_opportunity_work(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_opportunity_evidence(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_opportunity_work(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_opportunity_work(uuid, text, text, numeric, numeric, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_opportunity_participation(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: SELECT only. Mutations go through RPCs.
-- ---------------------------------------------------------------------------

ALTER TABLE public.contribution_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_participation_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_skill_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read open or managed opportunities"
  ON public.contribution_opportunities;
CREATE POLICY "Authenticated can read open or managed opportunities"
  ON public.contribution_opportunities
  FOR SELECT
  TO authenticated
  USING (
    status = 'open'
    OR public.current_profile_manages_publisher(publisher_profile_id)
    OR public.current_profile_has_opportunity_participation(id)
  );

DROP POLICY IF EXISTS "Participants and organizers can read participations"
  ON public.opportunity_participations;
CREATE POLICY "Participants and organizers can read participations"
  ON public.opportunity_participations
  FOR SELECT
  TO authenticated
  USING (
    participant_profile_id = public.current_profile_id()
    OR public.current_profile_manages_publisher(
      public.opportunity_publisher_id(opportunity_id)
    )
  );

DROP POLICY IF EXISTS "Participants and organizers can read evidence"
  ON public.opportunity_participation_evidence;
CREATE POLICY "Participants and organizers can read evidence"
  ON public.opportunity_participation_evidence
  FOR SELECT
  TO authenticated
  USING (public.current_profile_can_read_participation(participation_id));

DROP POLICY IF EXISTS "Participants and organizers can read evaluations"
  ON public.opportunity_evaluations;
CREATE POLICY "Participants and organizers can read evaluations"
  ON public.opportunity_evaluations
  FOR SELECT
  TO authenticated
  USING (public.current_profile_can_read_participation(participation_id));

DROP POLICY IF EXISTS "Members can read verified skill evidence"
  ON public.opportunity_skill_evidence;
CREATE POLICY "Members can read verified skill evidence"
  ON public.opportunity_skill_evidence
  FOR SELECT
  TO authenticated
  USING (public.participation_is_verified_completed(participation_id));

GRANT SELECT ON public.contribution_opportunities TO authenticated;
GRANT SELECT ON public.opportunity_participations TO authenticated;
GRANT SELECT ON public.opportunity_participation_evidence TO authenticated;
GRANT SELECT ON public.opportunity_evaluations TO authenticated;
GRANT SELECT ON public.opportunity_skill_evidence TO authenticated;
