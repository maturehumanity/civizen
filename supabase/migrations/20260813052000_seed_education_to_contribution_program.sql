-- Phase 1 QA: Education-to-Contribution demo Program + open opportunities.
-- Also closes leftover smoke-test listings so partner demos are not confusing.
-- Idempotent.

ALTER TABLE public.contribution_programs
  DROP CONSTRAINT IF EXISTS contribution_programs_program_kind_check;
ALTER TABLE public.contribution_programs
  ADD CONSTRAINT contribution_programs_program_kind_check
  CHECK (program_kind IN ('community_problem_solving', 'shared_knowledge', 'education_to_contribution'));

CREATE OR REPLACE FUNCTION public.create_contribution_program(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_kind text;
BEGIN
  IF public.current_profile_id() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF char_length(trim(coalesce(payload->>'title', ''))) < 3 THEN RAISE EXCEPTION 'title_required'; END IF;
  IF char_length(trim(coalesce(payload->>'summary', ''))) < 3 THEN RAISE EXCEPTION 'summary_required'; END IF;
  v_kind := coalesce(nullif(trim(payload->>'program_kind'), ''), 'community_problem_solving');
  IF v_kind NOT IN ('community_problem_solving', 'shared_knowledge', 'education_to_contribution') THEN
    RAISE EXCEPTION 'invalid_program_kind';
  END IF;
  INSERT INTO public.contribution_programs (
    publisher_profile_id, title, summary, description, status, program_kind, area_node_id
  ) VALUES (
    public.current_profile_id(),
    trim(payload->>'title'),
    trim(payload->>'summary'),
    nullif(trim(payload->>'description'), ''),
    coalesce(nullif(trim(payload->>'status'), ''), 'draft'),
    v_kind,
    nullif(trim(payload->>'area_node_id'), '')
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_contribution_program(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_contribution_program(jsonb) TO authenticated;

ALTER TABLE public.knowledge_gaps
  DROP CONSTRAINT IF EXISTS knowledge_gaps_resolved_has_result;
ALTER TABLE public.knowledge_gaps
  ADD CONSTRAINT knowledge_gaps_resolved_has_result
  CHECK (
    status <> 'resolved'
    OR result_resource_id IS NOT NULL
    OR result_solution_record_id IS NOT NULL
  );

DO $$
DECLARE
  v_owner uuid;
  v_program uuid := '0c1ab1e0-5e1d-4000-8000-000000000201';
  v_opp_clinic uuid := '0c1ab1e0-5e1d-4000-8000-000000000211';
  v_opp_session uuid := '0c1ab1e0-5e1d-4000-8000-000000000212';
  v_area_edu text := 'foundational_areas.v1.education';
  v_area_health text := 'foundational_areas.v1.health';
BEGIN
  SELECT id INTO v_owner
  FROM public.profiles
  WHERE role = 'founder' AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;
  IF v_owner IS NULL THEN
    RAISE NOTICE 'Skipping Education-to-Contribution seed: no founder profile';
    RETURN;
  END IF;

  INSERT INTO public.contribution_programs (
    id, publisher_profile_id, title, summary, description, status, program_kind, area_node_id, seed_key
  ) VALUES (
    v_program,
    v_owner,
    'Education-to-Contribution',
    'Turn a useful skill into a short piece of work that can be verified and remembered.',
    'A Program for short, practical contributions. It does not replace Study. Completed work can later inform a Knowledge Space or a Community Challenge.',
    'active',
    'education_to_contribution',
    v_area_edu,
    'education-to-contribution'
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    program_kind = 'education_to_contribution',
    status = 'active',
    updated_at = now();

  INSERT INTO public.contribution_opportunities (
    id, publisher_profile_id, title, summary, description, status, opportunity_kind,
    program_id, area_node_id, required_skills, estimated_effort, compensation_status, is_remote,
    expected_outcome, evidence_requirements
  ) VALUES (
    v_opp_clinic,
    v_owner,
    'Document how a neighborhood clinic takes people in',
    'Sit with two clinic staff and write a one-page note of the current intake steps.',
    'The note should be usable by a new volunteer. Do not copy patient names. Capture the sequence from arrival to the first clinical conversation.',
    'open',
    'education_to_contribution',
    v_program,
    v_area_health,
    ARRAY['Documentation', 'Interviewing'],
    '6 hours',
    'learning',
    true,
    'A one-page intake sequence a clinic volunteer can follow.',
    'A short written note or a link to the note. Staff names may be first names only.'
  )
  ON CONFLICT (id) DO UPDATE SET status = 'open', program_id = EXCLUDED.program_id, updated_at = now();

  INSERT INTO public.contribution_opportunities (
    id, publisher_profile_id, title, summary, description, status, opportunity_kind,
    program_id, area_node_id, required_skills, estimated_effort, compensation_status, is_remote,
    expected_outcome, evidence_requirements
  ) VALUES (
    v_opp_session,
    v_owner,
    'Write a parent-readable note for one after-school session',
    'Turn what happened in one hosted session into a short note a parent can understand.',
    'Use the Learning Commons after-school material if it helps. The note should say when, where, what the children did, and how a parent can confirm the session took place.',
    'open',
    'education_to_contribution',
    v_program,
    v_area_edu,
    ARRAY['Teaching', 'Writing'],
    '3 hours',
    'learning',
    true,
    'A one-page session note a parent can read without extra explanation.',
    'The note itself, or a link to it, plus who hosted the session.'
  )
  ON CONFLICT (id) DO UPDATE SET status = 'open', program_id = EXCLUDED.program_id, updated_at = now();

  UPDATE public.contribution_opportunities
  SET status = 'closed', updated_at = now()
  WHERE title ILIKE 'Smoke test:%' AND status = 'open';
END $$;
