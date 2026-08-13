-- Demo seed for Shared Knowledge / Learning Commons. Idempotent.

DO $$
DECLARE
  v_owner uuid;
  v_other uuid;
  v_program uuid := '0c1ab1e0-5e1d-4000-8000-000000000101';
  v_space uuid := '0c1ab1e0-5e1d-4000-8000-000000000110';
  v_res_guide uuid := '0c1ab1e0-5e1d-4000-8000-000000000111';
  v_res_framework uuid := '0c1ab1e0-5e1d-4000-8000-000000000112';
  v_res_course uuid := '0c1ab1e0-5e1d-4000-8000-000000000113';
  v_res_solution uuid := '0c1ab1e0-5e1d-4000-8000-000000000114';
  v_gap_lights uuid := '0c1ab1e0-5e1d-4000-8000-000000000121';
  v_gap_water uuid := '0c1ab1e0-5e1d-4000-8000-000000000122';
  v_gap_after uuid := '0c1ab1e0-5e1d-4000-8000-000000000123';
  v_gap_waste uuid := '0c1ab1e0-5e1d-4000-8000-000000000124';
  v_opp uuid := '0c1ab1e0-5e1d-4000-8000-000000000131';
  v_ch uuid := '0c1ab1e0-5e1d-4000-8000-000000000132';
  v_food_solution uuid := '0c1ab1e0-5e1d-4000-8000-000000000043';
  v_area_edu text := 'foundational_areas.v1.education';
  v_area_health text := 'foundational_areas.v1.health';
BEGIN
  SELECT id INTO v_owner
  FROM public.profiles
  WHERE role = 'founder' AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;
  IF v_owner IS NULL THEN
    RAISE NOTICE 'Skipping Learning Commons seed: no founder profile';
    RETURN;
  END IF;

  SELECT id INTO v_other
  FROM public.profiles
  WHERE id IS DISTINCT FROM v_owner AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;
  v_other := coalesce(v_other, v_owner);

  INSERT INTO public.contribution_programs (
    id, publisher_profile_id, title, summary, description, status, program_kind, area_node_id, seed_key
  ) VALUES (
    v_program,
    v_owner,
    'Shared Knowledge Challenge',
    'Collect practical neighborhood knowledge, name what is missing, and turn gaps into work that can be verified.',
    'A Learning Commons program. It does not replace Study, Governance Solutions, or Community Challenges. Those remain separate. This program holds shared resources and the gaps that still need work.',
    'active',
    'shared_knowledge',
    v_area_edu,
    'shared-knowledge-challenge'
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    program_kind = 'shared_knowledge',
    status = 'active',
    updated_at = now();

  INSERT INTO public.knowledge_spaces (
    id, publisher_profile_id, program_id, title, summary, description, area_node_id, status
  ) VALUES (
    v_space,
    v_owner,
    v_program,
    'Neighborhood practical knowledge',
    'Short, reusable notes on health, learning, food, and shared spaces that neighbors can actually use.',
    'A collection, not a social group. Resources stay concise. Gaps name what is still weak or missing. Work happens through contribution opportunities and community challenges.',
    v_area_health,
    'shared'
  )
  ON CONFLICT (id) DO UPDATE SET status = 'shared', updated_at = now();

  INSERT INTO public.knowledge_resources (
    id, space_id, publisher_profile_id, program_id, title, summary, resource_type,
    body_text, related_skills, status, source_evidence, uncertainty_notes, pathway_order
  ) VALUES (
    v_res_guide,
    v_space,
    v_owner,
    v_program,
    'How to run a closing-hour surplus table',
    'A one-page guide for collecting unsold safe food at a weekly market before it is thrown away.',
    'guide',
    'Place a marked table by the market exit at close. One named volunteer stays until vendors pack up. Keep a paper tally of what was offered. Do not take food that a vendor still wants to sell the next day.',
    ARRAY['Community organizing', 'Food handling'],
    'reviewed',
    'Four consecutive market days in the Community Problem-Solving Lab.',
    'This method was tried at one weekly market. Other markets may need a different handoff with vendors.',
    1
  )
  ON CONFLICT (id) DO UPDATE SET status = 'reviewed', updated_at = now();

  INSERT INTO public.knowledge_resources (
    id, space_id, publisher_profile_id, program_id, title, summary, resource_type,
    body_text, related_skills, status, pathway_order
  ) VALUES (
    v_res_framework,
    v_space,
    v_owner,
    v_program,
    'A simple way to record what a neighborhood already knows',
    'A short framework: name the practice, who can teach it, what evidence would show it happened, and what is still missing.',
    'framework',
    'Write the practice in one sentence. Name at least one person or group who has done it. Note one way a neighbor could confirm it. Leave a gap if any of those are unknown.',
    ARRAY['Documentation'],
    'shared',
    2
  )
  ON CONFLICT (id) DO UPDATE SET status = 'shared', updated_at = now();

  INSERT INTO public.knowledge_resources (
    id, space_id, publisher_profile_id, program_id, title, summary, resource_type,
    body_text, related_skills, status, pathway_order
  ) VALUES (
    v_res_course,
    v_space,
    v_owner,
    v_program,
    'Walking a parent through a verified after-school session',
    'Learning material for neighbors who host short after-school sessions and want a parent to be able to confirm the session happened.',
    'course',
    'Before the session: write the time, place, and what the children will do. After: one parent or host signs a one-line note that the session took place. Keep the note with the contribution evidence.',
    ARRAY['Teaching'],
    'shared',
    3
  )
  ON CONFLICT (id) DO UPDATE SET status = 'shared', updated_at = now();

  INSERT INTO public.knowledge_resource_attributions (id, resource_id, attribution_kind, profile_id, organization_name)
  VALUES
    ('0c1ab1e0-5e1d-4000-8000-000000000141', v_res_guide, 'person', v_other, NULL),
    ('0c1ab1e0-5e1d-4000-8000-000000000142', v_res_framework, 'organization', NULL, 'Neighborhood Health Circle'),
    ('0c1ab1e0-5e1d-4000-8000-000000000143', v_res_course, 'person', v_owner, NULL)
  ON CONFLICT (id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.solution_records WHERE id = v_food_solution) THEN
    INSERT INTO public.knowledge_resources (
      id, space_id, publisher_profile_id, program_id, title, summary, resource_type,
      body_text, status, solution_record_id, challenge_id
    )
    SELECT
      v_res_solution,
      v_space,
      v_owner,
      v_program,
      left(sr.implemented_solution, 160),
      left(sr.outcome, 400),
      'solution_record',
      sr.implementation_summary,
      'shared',
      sr.id,
      sr.challenge_id
    FROM public.solution_records sr
    WHERE sr.id = v_food_solution
    ON CONFLICT (id) DO UPDATE SET status = 'shared', updated_at = now();

    UPDATE public.solution_records
    SET knowledge_resource_id = v_res_solution,
        knowledge_space_id = v_space,
        updated_at = now()
    WHERE id = v_food_solution;

    INSERT INTO public.knowledge_resource_attributions (id, resource_id, attribution_kind, profile_id)
    VALUES ('0c1ab1e0-5e1d-4000-8000-000000000144', v_res_solution, 'person', v_owner)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  INSERT INTO public.knowledge_gaps (
    id, space_id, publisher_profile_id, program_id, title, description, gap_kind, status
  ) VALUES
  (
    v_gap_lights, v_space, v_owner, v_program,
    'No shared note on which streets stay dark after dusk',
    'Neighbors know some walking routes are unlit, but there is no short public record of which stretches are worst and what a safer alternative would be.',
    'missing',
    'in_progress'
  ),
  (
    v_gap_water, v_space, v_owner, v_program,
    'Garden watering methods are not written down for the next season',
    'The drip-line approach is being tried, but a neighbor joining next year would not find a reusable note of what was fitted and how to flush the lines.',
    'needs_development',
    'in_progress'
  ),
  (
    v_gap_after, v_space, v_owner, v_program,
    'Parents still cannot tell which after-school sessions actually ran',
    'The learning material exists, but there is no verified list of sessions a parent can check this month.',
    'weak',
    'open'
  ),
  (
    v_gap_waste, v_space, v_owner, v_program,
    'Surplus-table method was known only to one market',
    'The closing-hour table worked, but it was not yet written as reusable knowledge for other weekly markets.',
    'outdated',
    'resolved'
  )
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now();

  INSERT INTO public.contribution_opportunities (
    id, publisher_profile_id, title, summary, status, opportunity_kind,
    program_id, knowledge_gap_id, knowledge_space_id, estimated_effort, compensation_status, is_remote
  ) VALUES (
    v_opp,
    v_owner,
    'Walk the dark stretches and write a one-page safer-route note',
    'Walk the streets used after the weekly market with two neighbors and record where lights fail and where people already divert.',
    'open',
    'knowledge_gap',
    v_program,
    v_gap_lights,
    v_space,
    '3 hours',
    'learning',
    false
  )
  ON CONFLICT (id) DO UPDATE SET status = 'open', knowledge_gap_id = EXCLUDED.knowledge_gap_id, updated_at = now();

  UPDATE public.knowledge_gaps SET opportunity_id = v_opp WHERE id = v_gap_lights;

  INSERT INTO public.community_challenges (
    id, program_id, publisher_profile_id, title, problem_statement, why_it_matters,
    success_criteria, status, area_node_id, scope_text
  ) VALUES (
    v_ch,
    v_program,
    v_owner,
    'Write down how the community garden is watered',
    'The garden is being restored, but the watering method lives only in the people currently fitting the tank and drip lines.',
    'Without a short reusable note, the next season starts from memory instead of a method neighbors can repeat.',
    'A one-page care note exists, two members can show how to flush the lines, and the note is linked from this knowledge space.',
    'active',
    'foundational_areas.v1.environment',
    'The existing garden plot and the current watering method only.'
  )
  ON CONFLICT (id) DO UPDATE SET status = 'active', updated_at = now();

  UPDATE public.knowledge_gaps SET challenge_id = v_ch WHERE id = v_gap_water;

  UPDATE public.knowledge_gaps SET
    result_resource_id = v_res_guide,
    result_solution_record_id = CASE WHEN EXISTS (SELECT 1 FROM public.solution_records WHERE id = v_food_solution) THEN v_food_solution ELSE NULL END,
    resolution_notes = 'The surplus-table method is now a reviewed guide. Other markets can adapt it; keep a named volunteer at close.',
    status = 'resolved',
    updated_at = now()
  WHERE id = v_gap_waste;
END $$;
