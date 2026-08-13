-- Slice 4: Shared Knowledge / Learning Commons.
-- Distinct from Study, content_items, and Governance Solutions.
-- Work still uses contribution_opportunities and community_challenges.

-- ---------------------------------------------------------------------------
-- Program + opportunity kinds
-- ---------------------------------------------------------------------------

ALTER TABLE public.contribution_programs
  DROP CONSTRAINT IF EXISTS contribution_programs_program_kind_check;
ALTER TABLE public.contribution_programs
  ADD CONSTRAINT contribution_programs_program_kind_check
  CHECK (program_kind IN ('community_problem_solving', 'shared_knowledge'));

ALTER TABLE public.contribution_opportunities
  DROP CONSTRAINT IF EXISTS contribution_opportunities_opportunity_kind_check;
ALTER TABLE public.contribution_opportunities
  ADD CONSTRAINT contribution_opportunities_opportunity_kind_check
  CHECK (opportunity_kind IN ('education_to_contribution', 'community_implementation', 'knowledge_gap'));

-- ---------------------------------------------------------------------------
-- Knowledge spaces
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.knowledge_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.contribution_programs(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  description text,
  area_node_id text REFERENCES public.classification_nodes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'shared', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_spaces_title_len CHECK (char_length(trim(title)) BETWEEN 3 AND 160),
  CONSTRAINT knowledge_spaces_summary_len CHECK (char_length(trim(summary)) BETWEEN 3 AND 400)
);

CREATE INDEX IF NOT EXISTS knowledge_spaces_program_idx ON public.knowledge_spaces (program_id, status);
CREATE INDEX IF NOT EXISTS knowledge_spaces_publisher_idx ON public.knowledge_spaces (publisher_profile_id, status);

-- ---------------------------------------------------------------------------
-- Resources
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.knowledge_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.knowledge_spaces(id) ON DELETE CASCADE,
  publisher_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.contribution_programs(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  resource_type text NOT NULL DEFAULT 'other'
    CHECK (resource_type IN (
      'guide', 'research', 'course', 'case_study', 'framework',
      'dataset', 'tool', 'solution_record', 'other'
    )),
  body_text text,
  external_url text,
  related_skills text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'shared', 'reviewed')),
  reviewer_notes text,
  source_evidence text,
  uncertainty_notes text,
  challenge_id uuid REFERENCES public.community_challenges(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.contribution_opportunities(id) ON DELETE SET NULL,
  solution_record_id uuid REFERENCES public.solution_records(id) ON DELETE SET NULL,
  pathway_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_resources_title_len CHECK (char_length(trim(title)) BETWEEN 3 AND 160),
  CONSTRAINT knowledge_resources_summary_len CHECK (char_length(trim(summary)) BETWEEN 3 AND 400)
);

CREATE INDEX IF NOT EXISTS knowledge_resources_space_idx ON public.knowledge_resources (space_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_resources_space_pathway_idx
  ON public.knowledge_resources (space_id, pathway_order)
  WHERE pathway_order IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.knowledge_resource_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES public.knowledge_resources(id) ON DELETE CASCADE,
  attribution_kind text NOT NULL CHECK (attribution_kind IN ('person', 'organization')),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  organization_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_resource_attributions_subject CHECK (
    profile_id IS NOT NULL OR char_length(trim(coalesce(organization_name, ''))) >= 2
  )
);

CREATE INDEX IF NOT EXISTS knowledge_resource_attributions_resource_idx
  ON public.knowledge_resource_attributions (resource_id);

-- ---------------------------------------------------------------------------
-- Gaps
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.knowledge_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.knowledge_spaces(id) ON DELETE CASCADE,
  publisher_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.contribution_programs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  gap_kind text NOT NULL DEFAULT 'missing'
    CHECK (gap_kind IN (
      'missing', 'weak', 'outdated', 'unresolved', 'contradictory', 'needs_development'
    )),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'partially_resolved')),
  opportunity_id uuid REFERENCES public.contribution_opportunities(id) ON DELETE SET NULL,
  challenge_id uuid REFERENCES public.community_challenges(id) ON DELETE SET NULL,
  result_resource_id uuid REFERENCES public.knowledge_resources(id) ON DELETE SET NULL,
  result_solution_record_id uuid REFERENCES public.solution_records(id) ON DELETE SET NULL,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_gaps_title_len CHECK (char_length(trim(title)) BETWEEN 3 AND 160),
  CONSTRAINT knowledge_gaps_description_len CHECK (char_length(trim(description)) BETWEEN 3 AND 2000)
);

CREATE INDEX IF NOT EXISTS knowledge_gaps_space_idx ON public.knowledge_gaps (space_id, status);

ALTER TABLE public.contribution_opportunities
  ADD COLUMN IF NOT EXISTS knowledge_gap_id uuid REFERENCES public.knowledge_gaps(id) ON DELETE SET NULL;
ALTER TABLE public.contribution_opportunities
  ADD COLUMN IF NOT EXISTS knowledge_space_id uuid REFERENCES public.knowledge_spaces(id) ON DELETE SET NULL;

ALTER TABLE public.solution_records
  ADD COLUMN IF NOT EXISTS knowledge_space_id uuid REFERENCES public.knowledge_spaces(id) ON DELETE SET NULL;

ALTER TABLE public.solution_records
  DROP CONSTRAINT IF EXISTS solution_records_knowledge_resource_id_fkey;
ALTER TABLE public.solution_records
  ADD CONSTRAINT solution_records_knowledge_resource_id_fkey
  FOREIGN KEY (knowledge_resource_id) REFERENCES public.knowledge_resources(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Read helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_profile_can_read_knowledge_space(p_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.knowledge_spaces s
    WHERE s.id = p_space_id
      AND (
        s.status = 'shared'
        OR public.current_profile_manages_publisher(s.publisher_profile_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile_can_read_knowledge_resource(p_resource_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.knowledge_resources r
    WHERE r.id = p_resource_id
      AND public.current_profile_can_read_knowledge_space(r.space_id)
      AND (
        r.status IN ('shared', 'reviewed')
        OR public.current_profile_manages_publisher(r.publisher_profile_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.replace_knowledge_resource_attributions(p_resource_id uuid, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
BEGIN
  DELETE FROM public.knowledge_resource_attributions WHERE resource_id = p_resource_id;
  IF p_items IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) = 0 THEN
    RETURN;
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.knowledge_resource_attributions (
      resource_id, attribution_kind, profile_id, organization_name
    ) VALUES (
      p_resource_id,
      CASE WHEN v_item->>'attribution_kind' = 'organization' THEN 'organization' ELSE 'person' END,
      nullif(trim(v_item->>'profile_id'), '')::uuid,
      nullif(trim(v_item->>'organization_name'), '')
    );
  END LOOP;
END;
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
  v_kind text;
BEGIN
  IF v_profile IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  v_status := coalesce(nullif(trim(payload->>'status'), ''), 'draft');
  IF v_status NOT IN ('draft', 'active') THEN RAISE EXCEPTION 'invalid_program_status'; END IF;
  v_kind := coalesce(nullif(trim(payload->>'program_kind'), ''), 'community_problem_solving');
  IF v_kind NOT IN ('community_problem_solving', 'shared_knowledge') THEN RAISE EXCEPTION 'invalid_program_kind'; END IF;
  IF char_length(trim(payload->>'title')) < 3 THEN RAISE EXCEPTION 'title_required'; END IF;
  IF char_length(trim(payload->>'summary')) < 3 THEN RAISE EXCEPTION 'summary_required'; END IF;

  INSERT INTO public.contribution_programs (
    publisher_profile_id, title, summary, description, status, program_kind, area_node_id
  ) VALUES (
    v_profile,
    trim(payload->>'title'),
    trim(payload->>'summary'),
    nullif(trim(payload->>'description'), ''),
    v_status,
    v_kind,
    nullif(trim(payload->>'area_node_id'), '')
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_knowledge_space(payload jsonb)
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
  v_status := coalesce(nullif(trim(payload->>'status'), ''), 'draft');
  IF v_status NOT IN ('draft', 'shared') THEN RAISE EXCEPTION 'invalid_space_status'; END IF;
  IF char_length(trim(payload->>'title')) < 3 THEN RAISE EXCEPTION 'title_required'; END IF;
  IF char_length(trim(payload->>'summary')) < 3 THEN RAISE EXCEPTION 'summary_required'; END IF;

  INSERT INTO public.knowledge_spaces (
    publisher_profile_id, program_id, title, summary, description, area_node_id, status
  ) VALUES (
    v_program.publisher_profile_id,
    v_program.id,
    trim(payload->>'title'),
    trim(payload->>'summary'),
    nullif(trim(payload->>'description'), ''),
    nullif(trim(payload->>'area_node_id'), ''),
    v_status
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_knowledge_space(p_space_id uuid, payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space public.knowledge_spaces%ROWTYPE;
BEGIN
  IF public.current_profile_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_space FROM public.knowledge_spaces WHERE id = p_space_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'space_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_space.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE public.knowledge_spaces SET
    title = coalesce(nullif(trim(payload->>'title'), ''), title),
    summary = coalesce(nullif(trim(payload->>'summary'), ''), summary),
    description = CASE WHEN payload ? 'description' THEN nullif(trim(payload->>'description'), '') ELSE description END,
    area_node_id = CASE WHEN payload ? 'area_node_id' THEN nullif(trim(payload->>'area_node_id'), '') ELSE area_node_id END,
    updated_at = now()
  WHERE id = p_space_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_knowledge_space_status(p_space_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space public.knowledge_spaces%ROWTYPE;
BEGIN
  IF public.current_profile_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_status NOT IN ('draft', 'shared', 'archived') THEN RAISE EXCEPTION 'invalid_space_status'; END IF;
  SELECT * INTO v_space FROM public.knowledge_spaces WHERE id = p_space_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'space_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_space.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE public.knowledge_spaces SET status = p_status, updated_at = now() WHERE id = p_space_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_knowledge_resource(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_space public.knowledge_spaces%ROWTYPE;
  v_id uuid;
  v_status text;
  v_type text;
BEGIN
  IF v_profile IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_space FROM public.knowledge_spaces WHERE id = (payload->>'space_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'space_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_space.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF char_length(trim(payload->>'title')) < 3 THEN RAISE EXCEPTION 'title_required'; END IF;
  IF char_length(trim(payload->>'summary')) < 3 THEN RAISE EXCEPTION 'summary_required'; END IF;
  v_type := coalesce(nullif(trim(payload->>'resource_type'), ''), 'other');
  IF v_type NOT IN ('guide','research','course','case_study','framework','dataset','tool','solution_record','other') THEN
    RAISE EXCEPTION 'invalid_resource_type';
  END IF;
  v_status := coalesce(nullif(trim(payload->>'status'), ''), 'draft');
  IF v_status NOT IN ('draft', 'shared', 'reviewed') THEN RAISE EXCEPTION 'invalid_resource_status'; END IF;

  INSERT INTO public.knowledge_resources (
    space_id, publisher_profile_id, program_id, title, summary, resource_type,
    body_text, external_url, related_skills, status, reviewer_notes, source_evidence,
    uncertainty_notes, challenge_id, opportunity_id, solution_record_id, pathway_order
  ) VALUES (
    v_space.id,
    v_space.publisher_profile_id,
    v_space.program_id,
    trim(payload->>'title'),
    trim(payload->>'summary'),
    v_type,
    nullif(trim(payload->>'body_text'), ''),
    nullif(trim(payload->>'external_url'), ''),
    coalesce(
      CASE WHEN jsonb_typeof(payload->'related_skills') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(payload->'related_skills'))
        ELSE '{}'::text[] END,
      '{}'::text[]
    ),
    v_status,
    nullif(trim(payload->>'reviewer_notes'), ''),
    nullif(trim(payload->>'source_evidence'), ''),
    nullif(trim(payload->>'uncertainty_notes'), ''),
    nullif(trim(payload->>'challenge_id'), '')::uuid,
    nullif(trim(payload->>'opportunity_id'), '')::uuid,
    nullif(trim(payload->>'solution_record_id'), '')::uuid,
    CASE WHEN payload ? 'pathway_order' AND trim(coalesce(payload->>'pathway_order', '')) <> ''
      THEN (payload->>'pathway_order')::integer ELSE NULL END
  )
  RETURNING id INTO v_id;

  IF payload ? 'attributions' AND jsonb_typeof(payload->'attributions') = 'array'
     AND jsonb_array_length(payload->'attributions') > 0 THEN
    PERFORM public.replace_knowledge_resource_attributions(v_id, payload->'attributions');
  ELSE
    INSERT INTO public.knowledge_resource_attributions (resource_id, attribution_kind, profile_id)
    VALUES (v_id, 'person', v_profile);
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_knowledge_resource(p_resource_id uuid, payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res public.knowledge_resources%ROWTYPE;
BEGIN
  IF public.current_profile_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_res FROM public.knowledge_resources WHERE id = p_resource_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'resource_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_res.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE public.knowledge_resources SET
    title = coalesce(nullif(trim(payload->>'title'), ''), title),
    summary = coalesce(nullif(trim(payload->>'summary'), ''), summary),
    resource_type = coalesce(nullif(trim(payload->>'resource_type'), ''), resource_type),
    body_text = CASE WHEN payload ? 'body_text' THEN nullif(trim(payload->>'body_text'), '') ELSE body_text END,
    external_url = CASE WHEN payload ? 'external_url' THEN nullif(trim(payload->>'external_url'), '') ELSE external_url END,
    related_skills = CASE WHEN payload ? 'related_skills' AND jsonb_typeof(payload->'related_skills') = 'array'
      THEN coalesce(ARRAY(SELECT jsonb_array_elements_text(payload->'related_skills')), '{}'::text[])
      ELSE related_skills END,
    reviewer_notes = CASE WHEN payload ? 'reviewer_notes' THEN nullif(trim(payload->>'reviewer_notes'), '') ELSE reviewer_notes END,
    source_evidence = CASE WHEN payload ? 'source_evidence' THEN nullif(trim(payload->>'source_evidence'), '') ELSE source_evidence END,
    uncertainty_notes = CASE WHEN payload ? 'uncertainty_notes' THEN nullif(trim(payload->>'uncertainty_notes'), '') ELSE uncertainty_notes END,
    pathway_order = CASE WHEN payload ? 'pathway_order' THEN
      CASE WHEN trim(coalesce(payload->>'pathway_order', '')) = '' THEN NULL ELSE (payload->>'pathway_order')::integer END
      ELSE pathway_order END,
    updated_at = now()
  WHERE id = p_resource_id;
  IF payload ? 'attributions' THEN
    PERFORM public.replace_knowledge_resource_attributions(p_resource_id, payload->'attributions');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_knowledge_resource_status(p_resource_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res public.knowledge_resources%ROWTYPE;
BEGIN
  IF public.current_profile_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF p_status NOT IN ('draft', 'shared', 'reviewed') THEN RAISE EXCEPTION 'invalid_resource_status'; END IF;
  SELECT * INTO v_res FROM public.knowledge_resources WHERE id = p_resource_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'resource_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_res.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE public.knowledge_resources SET status = p_status, updated_at = now() WHERE id = p_resource_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_knowledge_gap(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_space public.knowledge_spaces%ROWTYPE;
  v_id uuid;
  v_kind text;
BEGIN
  IF v_profile IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_space FROM public.knowledge_spaces WHERE id = (payload->>'space_id')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'space_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_space.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF char_length(trim(payload->>'title')) < 3 THEN RAISE EXCEPTION 'title_required'; END IF;
  IF char_length(trim(payload->>'description')) < 3 THEN RAISE EXCEPTION 'description_required'; END IF;
  v_kind := coalesce(nullif(trim(payload->>'gap_kind'), ''), 'missing');
  IF v_kind NOT IN ('missing','weak','outdated','unresolved','contradictory','needs_development') THEN
    RAISE EXCEPTION 'invalid_gap_kind';
  END IF;

  INSERT INTO public.knowledge_gaps (
    space_id, publisher_profile_id, program_id, title, description, gap_kind, status
  ) VALUES (
    v_space.id,
    v_space.publisher_profile_id,
    v_space.program_id,
    trim(payload->>'title'),
    trim(payload->>'description'),
    v_kind,
    'open'
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_knowledge_gap_to_opportunity(p_gap_id uuid, payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gap public.knowledge_gaps%ROWTYPE;
  v_id uuid;
BEGIN
  IF public.current_profile_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_gap FROM public.knowledge_gaps WHERE id = p_gap_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'gap_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_gap.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_gap.opportunity_id IS NOT NULL THEN RAISE EXCEPTION 'gap_already_has_opportunity'; END IF;
  IF v_gap.status = 'resolved' THEN RAISE EXCEPTION 'gap_already_resolved'; END IF;
  IF char_length(trim(payload->>'title')) < 3 THEN RAISE EXCEPTION 'title_required'; END IF;
  IF char_length(trim(payload->>'summary')) < 3 THEN RAISE EXCEPTION 'summary_required'; END IF;

  INSERT INTO public.contribution_opportunities (
    publisher_profile_id, title, summary, status, opportunity_kind,
    program_id, knowledge_gap_id, knowledge_space_id, estimated_effort, compensation_status, is_remote
  ) VALUES (
    v_gap.publisher_profile_id,
    trim(payload->>'title'),
    trim(payload->>'summary'),
    'open',
    'knowledge_gap',
    v_gap.program_id,
    v_gap.id,
    v_gap.space_id,
    nullif(trim(payload->>'estimated_effort'), ''),
    'learning',
    true
  )
  RETURNING id INTO v_id;

  UPDATE public.knowledge_gaps
  SET opportunity_id = v_id, status = 'in_progress', updated_at = now()
  WHERE id = v_gap.id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_knowledge_gap_to_challenge(p_gap_id uuid, payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gap public.knowledge_gaps%ROWTYPE;
  v_id uuid;
BEGIN
  IF public.current_profile_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_gap FROM public.knowledge_gaps WHERE id = p_gap_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'gap_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_gap.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_gap.challenge_id IS NOT NULL THEN RAISE EXCEPTION 'gap_already_has_challenge'; END IF;
  IF v_gap.status = 'resolved' THEN RAISE EXCEPTION 'gap_already_resolved'; END IF;
  IF char_length(trim(payload->>'title')) < 3 THEN RAISE EXCEPTION 'title_required'; END IF;
  IF char_length(trim(payload->>'problem_statement')) < 3 THEN RAISE EXCEPTION 'problem_required'; END IF;
  IF char_length(trim(payload->>'why_it_matters')) < 3 THEN RAISE EXCEPTION 'why_required'; END IF;
  IF char_length(trim(payload->>'success_criteria')) < 3 THEN RAISE EXCEPTION 'criteria_required'; END IF;

  INSERT INTO public.community_challenges (
    program_id, publisher_profile_id, title, problem_statement, why_it_matters, success_criteria, status
  ) VALUES (
    v_gap.program_id,
    v_gap.publisher_profile_id,
    trim(payload->>'title'),
    trim(payload->>'problem_statement'),
    trim(payload->>'why_it_matters'),
    trim(payload->>'success_criteria'),
    'active'
  )
  RETURNING id INTO v_id;

  UPDATE public.knowledge_gaps
  SET challenge_id = v_id, status = 'in_progress', updated_at = now()
  WHERE id = v_gap.id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_knowledge_gap(p_gap_id uuid, payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gap public.knowledge_gaps%ROWTYPE;
  v_status text;
  v_resource uuid;
  v_solution uuid;
BEGIN
  IF public.current_profile_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_gap FROM public.knowledge_gaps WHERE id = p_gap_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'gap_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_gap.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_gap.status = 'resolved' THEN RAISE EXCEPTION 'gap_already_resolved'; END IF;
  v_status := trim(payload->>'status');
  IF v_status NOT IN ('resolved', 'partially_resolved') THEN RAISE EXCEPTION 'invalid_gap_status'; END IF;
  v_resource := nullif(trim(payload->>'result_resource_id'), '')::uuid;
  v_solution := nullif(trim(payload->>'result_solution_record_id'), '')::uuid;
  IF v_status = 'resolved' AND v_resource IS NULL AND v_solution IS NULL THEN
    RAISE EXCEPTION 'result_required';
  END IF;

  UPDATE public.knowledge_gaps SET
    status = v_status,
    result_resource_id = v_resource,
    result_solution_record_id = v_solution,
    resolution_notes = nullif(trim(payload->>'resolution_notes'), ''),
    updated_at = now()
  WHERE id = p_gap_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_solution_record_as_resource(p_solution_id uuid, p_space_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sol public.solution_records%ROWTYPE;
  v_space public.knowledge_spaces%ROWTYPE;
  v_id uuid;
BEGIN
  IF public.current_profile_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_sol FROM public.solution_records WHERE id = p_solution_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'solution_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_sol.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF v_sol.knowledge_resource_id IS NOT NULL THEN RAISE EXCEPTION 'solution_already_published'; END IF;
  SELECT * INTO v_space FROM public.knowledge_spaces WHERE id = p_space_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'space_not_found'; END IF;
  IF NOT public.current_profile_manages_publisher(v_space.publisher_profile_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  INSERT INTO public.knowledge_resources (
    space_id, publisher_profile_id, program_id, title, summary, resource_type,
    body_text, status, solution_record_id, challenge_id
  ) VALUES (
    v_space.id,
    v_space.publisher_profile_id,
    v_space.program_id,
    left(v_sol.implemented_solution, 160),
    left(v_sol.outcome, 400),
    'solution_record',
    v_sol.implementation_summary || E'\n\n' || coalesce(v_sol.lessons_learned, ''),
    'shared',
    v_sol.id,
    v_sol.challenge_id
  )
  RETURNING id INTO v_id;

  INSERT INTO public.knowledge_resource_attributions (resource_id, attribution_kind, profile_id)
  VALUES (v_id, 'person', v_sol.publisher_profile_id);

  UPDATE public.solution_records
  SET knowledge_resource_id = v_id, knowledge_space_id = v_space.id, updated_at = now()
  WHERE id = v_sol.id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_knowledge_resource_attribution_identities(p_resource_id uuid)
RETURNS TABLE (
  id uuid,
  resource_id uuid,
  attribution_kind text,
  profile_id uuid,
  organization_name text,
  display_name text,
  username text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.resource_id,
    a.attribution_kind,
    a.profile_id,
    a.organization_name,
    coalesce(
      a.organization_name,
      nullif(trim(pr.full_name), ''),
      nullif(trim(pr.username), ''),
      CASE WHEN a.attribution_kind = 'organization' THEN 'Organization' ELSE 'Contributor' END
    ),
    nullif(trim(pr.username), '')
  FROM public.knowledge_resource_attributions a
  LEFT JOIN public.profiles pr ON pr.id = a.profile_id AND pr.deleted_at IS NULL
  WHERE a.resource_id = p_resource_id
    AND public.current_profile_can_read_knowledge_resource(p_resource_id)
  ORDER BY a.created_at;
$$;

REVOKE ALL ON FUNCTION public.current_profile_can_read_knowledge_space(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_profile_can_read_knowledge_resource(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_knowledge_resource_attributions(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_knowledge_space(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_knowledge_space(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_knowledge_space_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_knowledge_resource(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_knowledge_resource(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_knowledge_resource_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_knowledge_gap(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.convert_knowledge_gap_to_opportunity(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.convert_knowledge_gap_to_challenge(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_knowledge_gap(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_solution_record_as_resource(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_knowledge_resource_attribution_identities(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_profile_can_read_knowledge_space(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_can_read_knowledge_resource(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_knowledge_space(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_knowledge_space(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_knowledge_space_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_knowledge_resource(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_knowledge_resource(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_knowledge_resource_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_knowledge_gap(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_knowledge_gap_to_opportunity(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_knowledge_gap_to_challenge(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_knowledge_gap(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_solution_record_as_resource(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_knowledge_resource_attribution_identities(uuid) TO authenticated;

ALTER TABLE public.knowledge_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_resource_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_gaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read visible knowledge spaces" ON public.knowledge_spaces;
CREATE POLICY "Authenticated can read visible knowledge spaces"
  ON public.knowledge_spaces FOR SELECT TO authenticated
  USING (public.current_profile_can_read_knowledge_space(id));

DROP POLICY IF EXISTS "Authenticated can read visible knowledge resources" ON public.knowledge_resources;
CREATE POLICY "Authenticated can read visible knowledge resources"
  ON public.knowledge_resources FOR SELECT TO authenticated
  USING (public.current_profile_can_read_knowledge_resource(id));

DROP POLICY IF EXISTS "Authenticated can read resource attributions" ON public.knowledge_resource_attributions;
CREATE POLICY "Authenticated can read resource attributions"
  ON public.knowledge_resource_attributions FOR SELECT TO authenticated
  USING (public.current_profile_can_read_knowledge_resource(resource_id));

DROP POLICY IF EXISTS "Authenticated can read gaps for visible spaces" ON public.knowledge_gaps;
CREATE POLICY "Authenticated can read gaps for visible spaces"
  ON public.knowledge_gaps FOR SELECT TO authenticated
  USING (public.current_profile_can_read_knowledge_space(space_id));

GRANT SELECT ON public.knowledge_spaces TO authenticated;
GRANT SELECT ON public.knowledge_resources TO authenticated;
GRANT SELECT ON public.knowledge_resource_attributions TO authenticated;
GRANT SELECT ON public.knowledge_gaps TO authenticated;
