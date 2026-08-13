-- Fill Solution Record contributors from coordinator, selected author, and
-- participants on linked implementation opportunities.

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
  v_contributors text;
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

  SELECT string_agg(DISTINCT coalesce(nullif(trim(pr.full_name), ''), nullif(trim(pr.username), ''), 'Participant'), ', ')
  INTO v_contributors
  FROM (
    SELECT v_ch.publisher_profile_id AS pid
    UNION
    SELECT v_prop.author_profile_id
    UNION
    SELECT p.participant_profile_id
    FROM public.contribution_opportunities o
    INNER JOIN public.opportunity_participations p ON p.opportunity_id = o.id
    WHERE o.implementation_project_id = v_proj.id
      AND p.status IN ('accepted', 'active', 'submitted', 'completed')
  ) ids
  INNER JOIN public.profiles pr ON pr.id = ids.pid;

  UPDATE public.community_challenges
  SET status = 'completed', completed_at = now(), completed_by = v_profile, updated_at = now()
  WHERE id = v_ch.id;

  UPDATE public.implementation_projects
  SET status = 'completed', updated_at = now()
  WHERE id = v_proj.id;

  INSERT INTO public.solution_records (
    challenge_id, project_id, program_id, publisher_profile_id,
    problem_context, implemented_solution, contributors, implementation_summary, outcome,
    evidence, lessons_learned, reuse_notes
  ) VALUES (
    v_ch.id,
    v_proj.id,
    v_ch.program_id,
    v_ch.publisher_profile_id,
    trim(v_ch.title || E'\n' || v_ch.problem_statement),
    coalesce(v_prop.title, v_proj.title),
    v_contributors,
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
    contributors = coalesce(EXCLUDED.contributors, public.solution_records.contributors),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
