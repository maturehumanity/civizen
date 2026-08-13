-- Slice 3: Community Problem-Solving Lab.
-- Distinct from Governance Solutions (solution_problems / solution_proposals).
-- Implementation work reuses contribution_opportunities / opportunity_participations.

-- ---------------------------------------------------------------------------
-- Programs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contribution_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  program_kind text NOT NULL DEFAULT 'community_problem_solving'
    CHECK (program_kind IN ('community_problem_solving')),
  area_node_id text REFERENCES public.classification_nodes(id) ON DELETE SET NULL,
  seed_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contribution_programs_title_len CHECK (char_length(trim(title)) BETWEEN 3 AND 160),
  CONSTRAINT contribution_programs_summary_len CHECK (char_length(trim(summary)) BETWEEN 3 AND 400)
);

CREATE INDEX IF NOT EXISTS contribution_programs_publisher_idx
  ON public.contribution_programs (publisher_profile_id, status);

-- ---------------------------------------------------------------------------
-- Challenges
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.contribution_programs(id) ON DELETE CASCADE,
  publisher_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  problem_statement text NOT NULL,
  why_it_matters text NOT NULL,
  affected text,
  area_node_id text REFERENCES public.classification_nodes(id) ON DELETE SET NULL,
  scope_text text,
  success_criteria text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'proposal_review', 'implementation', 'completed', 'cancelled')),
  evidence_links text,
  constraints text,
  resources text,
  context_detail text,
  selected_proposal_id uuid,
  outcome_summary text,
  outcome_evidence text,
  success_criteria_result text,
  lessons_learned text,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_challenges_title_len CHECK (char_length(trim(title)) BETWEEN 3 AND 160),
  CONSTRAINT community_challenges_problem_len CHECK (char_length(trim(problem_statement)) BETWEEN 3 AND 400),
  CONSTRAINT community_challenges_why_len CHECK (char_length(trim(why_it_matters)) BETWEEN 3 AND 2000),
  CONSTRAINT community_challenges_criteria_len CHECK (char_length(trim(success_criteria)) BETWEEN 3 AND 2000)
);

CREATE INDEX IF NOT EXISTS community_challenges_program_idx
  ON public.community_challenges (program_id, status);
CREATE INDEX IF NOT EXISTS community_challenges_publisher_idx
  ON public.community_challenges (publisher_profile_id, status);

-- ---------------------------------------------------------------------------
-- Proposals (not solution_proposals)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.challenge_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.community_challenges(id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  rationale text NOT NULL,
  expected_result text NOT NULL,
  implementation_approach text,
  resources_needed text,
  risks text,
  supporting_evidence text,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'selected', 'not_selected', 'withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT challenge_proposals_title_len CHECK (char_length(trim(title)) BETWEEN 3 AND 160),
  CONSTRAINT challenge_proposals_rationale_len CHECK (char_length(trim(rationale)) BETWEEN 3 AND 4000),
  CONSTRAINT challenge_proposals_result_len CHECK (char_length(trim(expected_result)) BETWEEN 3 AND 2000),
  CONSTRAINT challenge_proposals_one_per_author UNIQUE (challenge_id, author_profile_id)
);

CREATE INDEX IF NOT EXISTS challenge_proposals_challenge_idx
  ON public.challenge_proposals (challenge_id, status);

ALTER TABLE public.community_challenges
  DROP CONSTRAINT IF EXISTS community_challenges_selected_proposal_id_fkey;
ALTER TABLE public.community_challenges
  ADD CONSTRAINT community_challenges_selected_proposal_id_fkey
  FOREIGN KEY (selected_proposal_id) REFERENCES public.challenge_proposals(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Implementation projects
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.implementation_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL UNIQUE REFERENCES public.community_challenges(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES public.challenge_proposals(id) ON DELETE RESTRICT,
  publisher_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  key_steps text,
  outcome_evidence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT implementation_projects_title_len CHECK (char_length(trim(title)) BETWEEN 3 AND 160)
);

-- ---------------------------------------------------------------------------
-- Solution records (Learning Commons link reserved)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.solution_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL UNIQUE REFERENCES public.community_challenges(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.implementation_projects(id) ON DELETE SET NULL,
  program_id uuid NOT NULL REFERENCES public.contribution_programs(id) ON DELETE CASCADE,
  publisher_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_context text NOT NULL,
  implemented_solution text NOT NULL,
  contributors text,
  implementation_summary text NOT NULL,
  outcome text NOT NULL,
  evidence text,
  lessons_learned text,
  reuse_notes text,
  knowledge_resource_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Opportunity attribution (Slice 1 table; do not rewrite Slice 1 RPCs)
-- ---------------------------------------------------------------------------

ALTER TABLE public.contribution_opportunities
  DROP CONSTRAINT IF EXISTS contribution_opportunities_opportunity_kind_check;

ALTER TABLE public.contribution_opportunities
  ADD CONSTRAINT contribution_opportunities_opportunity_kind_check
  CHECK (opportunity_kind IN ('education_to_contribution', 'community_implementation'));

ALTER TABLE public.contribution_opportunities
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.contribution_programs(id) ON DELETE SET NULL;

ALTER TABLE public.contribution_opportunities
  ADD COLUMN IF NOT EXISTS implementation_project_id uuid
    REFERENCES public.implementation_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contribution_opportunities_project_idx
  ON public.contribution_opportunities (implementation_project_id);

CREATE INDEX IF NOT EXISTS contribution_opportunities_program_idx
  ON public.contribution_opportunities (program_id);

-- ---------------------------------------------------------------------------
-- Read helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_profile_can_read_challenge(p_challenge_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_challenges c
    WHERE c.id = p_challenge_id
      AND (
        c.status IN ('active', 'proposal_review', 'implementation', 'completed')
        OR public.current_profile_manages_publisher(c.publisher_profile_id)
        OR EXISTS (
          SELECT 1 FROM public.challenge_proposals p
          WHERE p.challenge_id = c.id
            AND p.author_profile_id = public.current_profile_id()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile_can_read_program(p_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contribution_programs p
    WHERE p.id = p_program_id
      AND (
        p.status IN ('active', 'completed')
        OR public.current_profile_manages_publisher(p.publisher_profile_id)
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_contribution_program(payload jsonb)
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
  IF v_profile IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  v_status := coalesce(nullif(trim(payload->>'status'), ''), 'draft');
  IF v_status NOT IN ('draft', 'active') THEN RAISE EXCEPTION 'invalid_program_status'; END IF;
  IF char_length(trim(payload->>'title')) < 3 THEN RAISE EXCEPTION 'title_required'; END IF;
  IF char_length(trim(payload->>'summary')) < 3 THEN RAISE EXCEPTION 'summary_required'; END IF;

  INSERT INTO public.contribution_programs (
    publisher_profile_id, title, summary, description, status, area_node_id
  ) VALUES (
    v_profile,
    trim(payload->>'title'),
    trim(payload->>'summary'),
    nullif(trim(payload->>'description'), ''),
    v_status,
    nullif(trim(payload->>'area_node_id'), '')
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_community_challenge(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_program public.contribution_programs%ROWTYPE;
  v_id uuid;
  v_status text;
BEGIN
  IF v_profile IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_program FROM public.contribution_programs WHERE id = (payload->>'program_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'program_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_program.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_program.status = 'cancelled' THEN RAISE EXCEPTION 'invalid_transition'; END IF;

  v_status := coalesce(nullif(trim(payload->>'status'), ''), 'draft');
  IF v_status NOT IN ('draft', 'active') THEN RAISE EXCEPTION 'invalid_challenge_status'; END IF;
  IF char_length(trim(payload->>'title')) < 3 THEN RAISE EXCEPTION 'title_required'; END IF;
  IF char_length(trim(payload->>'problem_statement')) < 3 THEN RAISE EXCEPTION 'problem_required'; END IF;
  IF char_length(trim(payload->>'why_it_matters')) < 3 THEN RAISE EXCEPTION 'why_required'; END IF;
  IF char_length(trim(payload->>'success_criteria')) < 3 THEN RAISE EXCEPTION 'criteria_required'; END IF;

  INSERT INTO public.community_challenges (
    program_id, publisher_profile_id, title, problem_statement, why_it_matters, affected,
    area_node_id, scope_text, success_criteria, status, evidence_links, constraints,
    resources, context_detail
  ) VALUES (
    v_program.id,
    v_program.publisher_profile_id,
    trim(payload->>'title'),
    trim(payload->>'problem_statement'),
    trim(payload->>'why_it_matters'),
    nullif(trim(payload->>'affected'), ''),
    nullif(trim(payload->>'area_node_id'), ''),
    nullif(trim(payload->>'scope_text'), ''),
    trim(payload->>'success_criteria'),
    v_status,
    nullif(trim(payload->>'evidence_links'), ''),
    nullif(trim(payload->>'constraints'), ''),
    nullif(trim(payload->>'resources'), ''),
    nullif(trim(payload->>'context_detail'), '')
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_community_challenge(p_challenge_id uuid, payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch public.community_challenges%ROWTYPE;
BEGIN
  IF public.current_profile_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_ch FROM public.community_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_ch.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_ch.status IN ('completed', 'cancelled') THEN RAISE EXCEPTION 'invalid_transition'; END IF;

  UPDATE public.community_challenges SET
    title = coalesce(nullif(trim(payload->>'title'), ''), title),
    problem_statement = coalesce(nullif(trim(payload->>'problem_statement'), ''), problem_statement),
    why_it_matters = coalesce(nullif(trim(payload->>'why_it_matters'), ''), why_it_matters),
    success_criteria = coalesce(nullif(trim(payload->>'success_criteria'), ''), success_criteria),
    affected = CASE WHEN payload ? 'affected' THEN nullif(trim(payload->>'affected'), '') ELSE affected END,
    area_node_id = CASE WHEN payload ? 'area_node_id' THEN nullif(trim(payload->>'area_node_id'), '') ELSE area_node_id END,
    scope_text = CASE WHEN payload ? 'scope_text' THEN nullif(trim(payload->>'scope_text'), '') ELSE scope_text END,
    evidence_links = CASE WHEN payload ? 'evidence_links' THEN nullif(trim(payload->>'evidence_links'), '') ELSE evidence_links END,
    constraints = CASE WHEN payload ? 'constraints' THEN nullif(trim(payload->>'constraints'), '') ELSE constraints END,
    resources = CASE WHEN payload ? 'resources' THEN nullif(trim(payload->>'resources'), '') ELSE resources END,
    context_detail = CASE WHEN payload ? 'context_detail' THEN nullif(trim(payload->>'context_detail'), '') ELSE context_detail END,
    updated_at = now()
  WHERE id = p_challenge_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_community_challenge_status(p_challenge_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch public.community_challenges%ROWTYPE;
BEGIN
  IF public.current_profile_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_status NOT IN ('draft', 'active', 'proposal_review', 'cancelled') THEN
    RAISE EXCEPTION 'invalid_challenge_status';
  END IF;
  SELECT * INTO v_ch FROM public.community_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_ch.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_ch.status = p_status THEN RETURN; END IF;
  IF v_ch.status = 'cancelled' OR v_ch.status = 'completed' THEN RAISE EXCEPTION 'invalid_transition'; END IF;
  IF v_ch.status = 'draft' AND p_status NOT IN ('active', 'cancelled') THEN RAISE EXCEPTION 'invalid_transition'; END IF;
  IF v_ch.status = 'active' AND p_status NOT IN ('proposal_review', 'draft', 'cancelled') THEN RAISE EXCEPTION 'invalid_transition'; END IF;
  IF v_ch.status = 'proposal_review' AND p_status NOT IN ('active', 'cancelled') THEN RAISE EXCEPTION 'invalid_transition'; END IF;
  IF v_ch.status = 'implementation' THEN RAISE EXCEPTION 'invalid_transition'; END IF;

  UPDATE public.community_challenges SET status = p_status, updated_at = now() WHERE id = p_challenge_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_challenge_proposal(p_challenge_id uuid, payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_ch public.community_challenges%ROWTYPE;
  v_id uuid;
BEGIN
  IF v_profile IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_ch FROM public.community_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge_not_found'; END IF;
  IF v_ch.status IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'challenge_not_open_for_proposals'; END IF;
  IF public.current_profile_manages_publisher(v_ch.publisher_profile_id) THEN
    RAISE EXCEPTION 'cannot_propose_to_own_challenge';
  END IF;
  IF char_length(trim(payload->>'title')) < 3 THEN RAISE EXCEPTION 'title_required'; END IF;
  IF char_length(trim(payload->>'rationale')) < 3 THEN RAISE EXCEPTION 'rationale_required'; END IF;
  IF char_length(trim(payload->>'expected_result')) < 3 THEN RAISE EXCEPTION 'result_required'; END IF;

  INSERT INTO public.challenge_proposals (
    challenge_id, author_profile_id, title, rationale, expected_result,
    implementation_approach, resources_needed, risks, supporting_evidence
  ) VALUES (
    p_challenge_id,
    v_profile,
    trim(payload->>'title'),
    trim(payload->>'rationale'),
    trim(payload->>'expected_result'),
    nullif(trim(payload->>'implementation_approach'), ''),
    nullif(trim(payload->>'resources_needed'), ''),
    nullif(trim(payload->>'risks'), ''),
    nullif(trim(payload->>'supporting_evidence'), '')
  )
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'already_proposed';
END;
$$;

CREATE OR REPLACE FUNCTION public.select_challenge_proposal(p_proposal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_prop public.challenge_proposals%ROWTYPE;
  v_ch public.community_challenges%ROWTYPE;
  v_project uuid;
BEGIN
  IF v_profile IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_prop FROM public.challenge_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'proposal_not_found'; END IF;
  SELECT * INTO v_ch FROM public.community_challenges WHERE id = v_prop.challenge_id FOR UPDATE;
  IF NOT public.current_profile_manages_publisher(v_ch.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_ch.status NOT IN ('active', 'proposal_review') THEN RAISE EXCEPTION 'challenge_not_in_selection'; END IF;
  IF v_prop.status IS DISTINCT FROM 'submitted' THEN RAISE EXCEPTION 'proposal_not_selectable'; END IF;

  UPDATE public.challenge_proposals
  SET status = CASE WHEN id = p_proposal_id THEN 'selected' ELSE 'not_selected' END,
      updated_at = now()
  WHERE challenge_id = v_ch.id AND status = 'submitted';

  INSERT INTO public.implementation_projects (
    challenge_id, proposal_id, publisher_profile_id, title, summary, status
  ) VALUES (
    v_ch.id,
    p_proposal_id,
    v_ch.publisher_profile_id,
    left(v_prop.title, 160),
    left(v_prop.expected_result, 400),
    'active'
  )
  ON CONFLICT (challenge_id) DO UPDATE SET
    proposal_id = EXCLUDED.proposal_id,
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    updated_at = now()
  RETURNING id INTO v_project;

  UPDATE public.community_challenges
  SET selected_proposal_id = p_proposal_id,
      status = 'implementation',
      updated_at = now()
  WHERE id = v_ch.id;

  RETURN v_project;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_challenge_outcome(p_challenge_id uuid, payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch public.community_challenges%ROWTYPE;
BEGIN
  IF public.current_profile_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_ch FROM public.community_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_ch.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_ch.status IS DISTINCT FROM 'implementation' THEN RAISE EXCEPTION 'challenge_not_in_implementation'; END IF;
  IF char_length(trim(payload->>'outcome_summary')) < 3 THEN RAISE EXCEPTION 'outcome_required'; END IF;

  UPDATE public.community_challenges SET
    outcome_summary = trim(payload->>'outcome_summary'),
    outcome_evidence = nullif(trim(payload->>'outcome_evidence'), ''),
    success_criteria_result = nullif(trim(payload->>'success_criteria_result'), ''),
    lessons_learned = nullif(trim(payload->>'lessons_learned'), ''),
    updated_at = now()
  WHERE id = p_challenge_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_community_challenge(p_challenge_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_ch public.community_challenges%ROWTYPE;
  v_proj public.implementation_projects%ROWTYPE;
  v_prop public.challenge_proposals%ROWTYPE;
  v_id uuid;
BEGIN
  IF v_profile IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_ch FROM public.community_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_ch.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_ch.status IS DISTINCT FROM 'implementation' THEN RAISE EXCEPTION 'challenge_not_in_implementation'; END IF;
  IF v_ch.selected_proposal_id IS NULL THEN RAISE EXCEPTION 'proposal_not_selected'; END IF;
  IF char_length(trim(coalesce(v_ch.outcome_summary, ''))) < 3 THEN RAISE EXCEPTION 'outcome_required'; END IF;

  SELECT * INTO v_proj FROM public.implementation_projects WHERE challenge_id = v_ch.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'project_required'; END IF;
  SELECT * INTO v_prop FROM public.challenge_proposals WHERE id = v_ch.selected_proposal_id;

  UPDATE public.community_challenges
  SET status = 'completed', completed_at = now(), completed_by = v_profile, updated_at = now()
  WHERE id = v_ch.id;

  UPDATE public.implementation_projects
  SET status = 'completed', updated_at = now()
  WHERE id = v_proj.id;

  INSERT INTO public.solution_records (
    challenge_id, project_id, program_id, publisher_profile_id,
    problem_context, implemented_solution, implementation_summary, outcome,
    evidence, lessons_learned, reuse_notes
  ) VALUES (
    v_ch.id,
    v_proj.id,
    v_ch.program_id,
    v_ch.publisher_profile_id,
    trim(v_ch.title || E'\n' || v_ch.problem_statement),
    coalesce(v_prop.title, v_proj.title),
    v_proj.summary,
    v_ch.outcome_summary,
    v_ch.outcome_evidence,
    v_ch.lessons_learned,
    'Adapt the approach to a similar local setting; keep verification of completed work.'
  )
  ON CONFLICT (challenge_id) DO UPDATE SET
    outcome = EXCLUDED.outcome,
    evidence = EXCLUDED.evidence,
    lessons_learned = EXCLUDED.lessons_learned,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_implementation_opportunity(p_project_id uuid, payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_proj public.implementation_projects%ROWTYPE;
  v_ch public.community_challenges%ROWTYPE;
  v_id uuid;
BEGIN
  IF v_profile IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_proj FROM public.implementation_projects WHERE id = p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'project_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_proj.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO v_ch FROM public.community_challenges WHERE id = v_proj.challenge_id;
  IF char_length(trim(payload->>'title')) < 3 THEN RAISE EXCEPTION 'title_required'; END IF;
  IF char_length(trim(payload->>'summary')) < 3 THEN RAISE EXCEPTION 'summary_required'; END IF;

  INSERT INTO public.contribution_opportunities (
    publisher_profile_id, title, summary, status, opportunity_kind,
    program_id, implementation_project_id, estimated_effort, compensation_status, is_remote
  ) VALUES (
    v_proj.publisher_profile_id,
    trim(payload->>'title'),
    trim(payload->>'summary'),
    'open',
    'community_implementation',
    v_ch.program_id,
    v_proj.id,
    nullif(trim(payload->>'estimated_effort'), ''),
    'volunteer',
    true
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_implementation_opportunity(p_project_id uuid, p_opportunity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proj public.implementation_projects%ROWTYPE;
  v_opp public.contribution_opportunities%ROWTYPE;
  v_ch public.community_challenges%ROWTYPE;
BEGIN
  IF public.current_profile_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_proj FROM public.implementation_projects WHERE id = p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'project_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_proj.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO v_opp FROM public.contribution_opportunities WHERE id = p_opportunity_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'opportunity_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_opp.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT * INTO v_ch FROM public.community_challenges WHERE id = v_proj.challenge_id;

  UPDATE public.contribution_opportunities
  SET implementation_project_id = v_proj.id,
      program_id = v_ch.program_id,
      updated_at = now()
  WHERE id = p_opportunity_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_challenge_proposal_identities(p_challenge_id uuid)
RETURNS TABLE (
  proposal_id uuid,
  profile_id uuid,
  display_name text,
  username text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    pr.id,
    coalesce(nullif(trim(pr.full_name), ''), nullif(trim(pr.username), ''), 'Participant'),
    nullif(trim(pr.username), ''),
    nullif(trim(pr.avatar_url), '')
  FROM public.challenge_proposals p
  INNER JOIN public.profiles pr ON pr.id = p.author_profile_id
  INNER JOIN public.community_challenges c ON c.id = p.challenge_id
  WHERE p.challenge_id = p_challenge_id
    AND public.current_profile_manages_publisher(c.publisher_profile_id)
    AND pr.deleted_at IS NULL
  ORDER BY p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.current_profile_can_read_challenge(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_profile_can_read_program(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_contribution_program(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_community_challenge(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_community_challenge(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_community_challenge_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_challenge_proposal(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.select_challenge_proposal(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_challenge_outcome(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_community_challenge(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_implementation_opportunity(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_implementation_opportunity(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_challenge_proposal_identities(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_profile_can_read_challenge(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_can_read_program(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_contribution_program(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_community_challenge(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_community_challenge(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_community_challenge_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_challenge_proposal(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.select_challenge_proposal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_challenge_outcome(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_community_challenge(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_implementation_opportunity(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_implementation_opportunity(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_challenge_proposal_identities(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.contribution_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.implementation_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read open or managed programs" ON public.contribution_programs;
CREATE POLICY "Authenticated can read open or managed programs"
  ON public.contribution_programs FOR SELECT TO authenticated
  USING (public.current_profile_can_read_program(id));

DROP POLICY IF EXISTS "Authenticated can read visible challenges" ON public.community_challenges;
CREATE POLICY "Authenticated can read visible challenges"
  ON public.community_challenges FOR SELECT TO authenticated
  USING (public.current_profile_can_read_challenge(id));

DROP POLICY IF EXISTS "Authors and coordinators can read proposals" ON public.challenge_proposals;
CREATE POLICY "Authors and coordinators can read proposals"
  ON public.challenge_proposals FOR SELECT TO authenticated
  USING (
    author_profile_id = public.current_profile_id()
    OR public.current_profile_manages_publisher(
      (SELECT c.publisher_profile_id FROM public.community_challenges c WHERE c.id = challenge_id)
    )
    OR (
      status = 'selected'
      AND public.current_profile_can_read_challenge(challenge_id)
    )
  );

DROP POLICY IF EXISTS "Authenticated can read projects for visible challenges"
  ON public.implementation_projects;
CREATE POLICY "Authenticated can read projects for visible challenges"
  ON public.implementation_projects FOR SELECT TO authenticated
  USING (public.current_profile_can_read_challenge(challenge_id));

DROP POLICY IF EXISTS "Authenticated can read solution records for visible challenges"
  ON public.solution_records;
CREATE POLICY "Authenticated can read solution records for visible challenges"
  ON public.solution_records FOR SELECT TO authenticated
  USING (public.current_profile_can_read_challenge(challenge_id));

GRANT SELECT ON public.contribution_programs TO authenticated;
GRANT SELECT ON public.community_challenges TO authenticated;
GRANT SELECT ON public.challenge_proposals TO authenticated;
GRANT SELECT ON public.implementation_projects TO authenticated;
GRANT SELECT ON public.solution_records TO authenticated;
