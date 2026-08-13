-- Demo seed for the Community Problem-Solving Lab. Idempotent. Uses the founder
-- profile as coordinator. Extra proposals use other profiles when they exist.

DO $$
DECLARE
  v_owner uuid;
  v_other uuid;
  v_other2 uuid;
  v_program uuid := '0c1ab1e0-5e1d-4000-8000-000000000001';
  v_walk uuid := '0c1ab1e0-5e1d-4000-8000-000000000010';
  v_after uuid := '0c1ab1e0-5e1d-4000-8000-000000000020';
  v_garden uuid := '0c1ab1e0-5e1d-4000-8000-000000000030';
  v_food uuid := '0c1ab1e0-5e1d-4000-8000-000000000040';
  v_prop_drip uuid := '0c1ab1e0-5e1d-4000-8000-000000000031';
  v_prop_main uuid := '0c1ab1e0-5e1d-4000-8000-000000000032';
  v_prop_well uuid := '0c1ab1e0-5e1d-4000-8000-000000000033';
  v_prop_food uuid := '0c1ab1e0-5e1d-4000-8000-000000000041';
  v_proj_garden uuid := '0c1ab1e0-5e1d-4000-8000-000000000034';
  v_proj_food uuid := '0c1ab1e0-5e1d-4000-8000-000000000042';
  v_area_env text := 'foundational_areas.v1.environment';
  v_area_edu text := 'foundational_areas.v1.education';
  v_area_health text := 'foundational_areas.v1.health';
BEGIN
  SELECT id INTO v_owner
  FROM public.profiles
  WHERE role = 'founder' AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;
  IF v_owner IS NULL THEN
    RAISE NOTICE 'Skipping Community Problem-Solving Lab seed: no founder profile';
    RETURN;
  END IF;

  SELECT id INTO v_other
  FROM public.profiles
  WHERE id IS DISTINCT FROM v_owner AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;
  v_other := coalesce(v_other, v_owner);

  SELECT id INTO v_other2
  FROM public.profiles
  WHERE id NOT IN (v_owner, v_other) AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;
  v_other2 := coalesce(v_other2, v_other);

  INSERT INTO public.contribution_programs (
    id, publisher_profile_id, title, summary, description, status, program_kind, area_node_id, seed_key
  ) VALUES (
    v_program,
    v_owner,
    'Community Problem-Solving Lab',
    'Neighbors name a real local problem, choose one practical solution, and carry it through to a recorded outcome.',
    'A working program for community implementation. It is not the Governance Solutions discussion space. Work happens through contribution opportunities, verification, and optional evaluation.',
    'active',
    'community_problem_solving',
    v_area_env,
    'community-problem-solving-lab'
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    status = 'active',
    updated_at = now();

  INSERT INTO public.community_challenges (
    id, program_id, publisher_profile_id, title, problem_statement, why_it_matters, affected,
    area_node_id, scope_text, success_criteria, status, evidence_links
  ) VALUES (
    v_walk,
    v_program,
    v_owner,
    'Make evening walking routes safer after dark',
    'Several streets used by people walking home from the market have no working lights and poor sight lines.',
    'People avoid walking after dusk, which isolates older neighbors and makes the evening market quieter than it should be.',
    'Residents walking home, especially older people and those finishing evening shifts.',
    v_area_health,
    'Two or three streets around the weekly market, not the whole town.',
    'Within eight weeks, those streets have working lights or a clearly marked safer alternative route that neighbors actually use.',
    'active',
    'Neighbors have reported dark stretches near the market exit after 7pm.'
  )
  ON CONFLICT (id) DO UPDATE SET status = 'active', updated_at = now();

  INSERT INTO public.community_challenges (
    id, program_id, publisher_profile_id, title, problem_statement, why_it_matters, affected,
    area_node_id, scope_text, success_criteria, status
  ) VALUES (
    v_after,
    v_program,
    v_owner,
    'Help families find trusted after-school learning nearby',
    'Parents cannot tell which after-school groups are reliable, nearby, and actually teaching.',
    'Children lose hours each week to unverified programs, and skilled neighbors who already teach have no simple way to be found.',
    'Families with school-age children, and neighbors who can host short learning sessions.',
    v_area_edu,
    'One neighborhood, starting with existing volunteer tutors.',
    'A short public list of at least five verified after-school sessions, with a way for a parent to confirm the session happened.',
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET status = 'active', updated_at = now();

  INSERT INTO public.community_challenges (
    id, program_id, publisher_profile_id, title, problem_statement, why_it_matters, affected,
    area_node_id, scope_text, success_criteria, status, constraints
  ) VALUES (
    v_garden,
    v_program,
    v_owner,
    'Restore water to the shared community garden',
    'The neighborhood garden lost its water connection last season and most beds are dry.',
    'The garden is one of the few shared growing spaces. Without water it becomes unused land instead of food and meeting place.',
    'Garden members and nearby households who relied on surplus vegetables.',
    v_area_env,
    'The existing garden plot only. No new land.',
    'Water reaches the beds through a method the group can maintain, and at least half the beds are planted again.',
    'implementation',
    'No heavy machinery. Work must be done with volunteers and donated materials.'
  )
  ON CONFLICT (id) DO UPDATE SET status = 'implementation', updated_at = now();

  INSERT INTO public.community_challenges (
    id, program_id, publisher_profile_id, title, problem_statement, why_it_matters, affected,
    area_node_id, scope_text, success_criteria, status,
    outcome_summary, success_criteria_result, lessons_learned, completed_at, completed_by
  ) VALUES (
    v_food,
    v_program,
    v_owner,
    'Reduce food left behind at the weekly market',
    'Vendors throw away unsold fruit and bread at close, while nearby households still need food the same evening.',
    'Waste and unmet need happen on the same street within an hour of each other.',
    'Market vendors and households within a short walk of the market.',
    v_area_health,
    'One weekly market, closing hour only.',
    'Unsold safe food is offered to a named pickup point before it is discarded, for four consecutive market days.',
    'completed',
    'A simple closing-hour table collected unsold bread and fruit for four market days. Households nearby knew where to come, and vendors kept a short tally.',
    'Pickup ran for four consecutive market days. Vendors reported less dumping at close.',
    'A visible table and one named volunteer at close worked better than a chat group. Keep the tally on paper at the stall.',
    now() - interval '12 days',
    v_owner
  )
  ON CONFLICT (id) DO UPDATE SET
    status = 'completed',
    outcome_summary = EXCLUDED.outcome_summary,
    updated_at = now();

  INSERT INTO public.challenge_proposals (
    id, challenge_id, author_profile_id, title, rationale, expected_result,
    implementation_approach, status
  ) VALUES (
    v_prop_drip, v_garden, v_other,
    'Collect rainwater and water the beds with drip lines',
    'A tank on the shed roof and inexpensive drip tape can water the beds without reconnecting to the municipal line.',
    'Beds receive water from stored rain and a short weekly top-up, maintained by garden members.',
    'Install one tank, guttering, and drip lines on the planted half of the garden first.',
    'selected'
  )
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now();

  IF v_other2 IS DISTINCT FROM v_other THEN
    INSERT INTO public.challenge_proposals (
      id, challenge_id, author_profile_id, title, rationale, expected_result,
      implementation_approach, status
    ) VALUES (
      v_prop_main, v_garden, v_other2,
      'Ask the water utility to restore the original standpipe',
      'The original connection is the simplest long-term source if the utility will reopen it.',
      'A working standpipe at the garden edge, billed to the garden association.',
      'File a restoration request and meet the utility on site.',
      'not_selected'
    )
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now();
  END IF;

  IF v_owner IS DISTINCT FROM v_other AND v_owner IS DISTINCT FROM v_other2 THEN
    INSERT INTO public.challenge_proposals (
      id, challenge_id, author_profile_id, title, rationale, expected_result,
      implementation_approach, status
    ) VALUES (
      v_prop_well, v_garden, v_owner,
      'Share a shallow well with the adjoining plot',
      'A neighbor has offered well access, but the arrangement needs a written understanding and a pump the group can repair.',
      'Garden members can draw water two mornings a week without a new municipal account.',
      'Write a one-page sharing note and fit a simple hand pump.',
      'not_selected'
    )
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now();
  END IF;

  INSERT INTO public.challenge_proposals (
    id, challenge_id, author_profile_id, title, rationale, expected_result,
    implementation_approach, status
  ) VALUES (
    v_prop_food, v_food, v_other,
    'A closing-hour surplus table beside the market exit',
    'Vendors already stay to pack up. A marked table and one volunteer can move leftover safe food before it is thrown away.',
    'Households know where to come at close, and vendors have a place to put what they will not take home.',
    'One folding table, a painted sign, and a rotating volunteer for four market days.',
    'selected'
  )
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now();

  UPDATE public.community_challenges SET selected_proposal_id = v_prop_drip WHERE id = v_garden;
  UPDATE public.community_challenges SET selected_proposal_id = v_prop_food WHERE id = v_food;

  INSERT INTO public.implementation_projects (
    id, challenge_id, proposal_id, publisher_profile_id, title, summary, status, key_steps
  ) VALUES
  (
    v_proj_garden, v_garden, v_prop_drip, v_owner,
    'Rainwater and drip lines for the community garden',
    'Fit a tank, guttering, and drip tape so the planted beds can be watered by garden members.',
    'active',
    'Map beds and downpipes. Fit the tank. Lay drip tape on half the beds. Show two members how to flush the lines.'
  ),
  (
    v_proj_food, v_food, v_prop_food, v_owner,
    'Weekly surplus table at market close',
    'A marked table and rotating volunteer collected unsold safe food for four market days.',
    'completed',
    'Place the table. Agree vendor handoff. Keep a paper tally. Write what to repeat.'
  )
  ON CONFLICT (challenge_id) DO UPDATE SET
    title = EXCLUDED.title,
    status = EXCLUDED.status,
    updated_at = now();

  INSERT INTO public.contribution_opportunities (
    id, publisher_profile_id, title, summary, status, opportunity_kind, program_id,
    implementation_project_id, estimated_effort, compensation_status, is_remote, required_skills
  ) VALUES
  (
    '0c1ab1e0-5e1d-4000-8000-000000000035',
    v_owner,
    'Map garden beds and the current water points',
    'Walk the plot with two garden members and record which beds are planted and where water used to enter.',
    'open',
    'community_implementation',
    v_program,
    v_proj_garden,
    '3 hours',
    'volunteer',
    false,
    ARRAY['Documentation']
  ),
  (
    '0c1ab1e0-5e1d-4000-8000-000000000036',
    v_owner,
    'Fit the rain tank and first drip lines',
    'Install the donated tank on the shed and run drip tape to the planted half of the garden.',
    'open',
    'community_implementation',
    v_program,
    v_proj_garden,
    '1 weekend',
    'volunteer',
    false,
    ARRAY['Practical repair']
  ),
  (
    '0c1ab1e0-5e1d-4000-8000-000000000037',
    v_owner,
    'Show members how to flush and winter the lines',
    'Write a one-page care note and walk two members through flushing the drip tape.',
    'open',
    'community_implementation',
    v_program,
    v_proj_garden,
    '2 hours',
    'learning',
    false,
    ARRAY['Teaching']
  )
  ON CONFLICT (id) DO UPDATE SET
    status = 'open',
    implementation_project_id = EXCLUDED.implementation_project_id,
    updated_at = now();

  IF v_other IS DISTINCT FROM v_owner THEN
    INSERT INTO public.opportunity_participations (
      id, opportunity_id, participant_profile_id, status, verification_status,
      application_message, accepted_at, accepted_by
    ) VALUES (
      '0c1ab1e0-5e1d-4000-8000-000000000038',
      '0c1ab1e0-5e1d-4000-8000-000000000035',
      v_other,
      'accepted',
      'not_submitted',
      'I walk that plot every week and can mark the dry beds.',
      now() - interval '2 days',
      v_owner
    )
    ON CONFLICT (opportunity_id, participant_profile_id) DO UPDATE SET
      status = 'accepted',
      updated_at = now();
  END IF;

  INSERT INTO public.solution_records (
    id, challenge_id, project_id, program_id, publisher_profile_id,
    problem_context, implemented_solution, contributors, implementation_summary, outcome,
    evidence, lessons_learned, reuse_notes
  ) VALUES (
    '0c1ab1e0-5e1d-4000-8000-000000000043',
    v_food,
    v_proj_food,
    v_program,
    v_owner,
    'Unsold fruit and bread from the weekly market were thrown away at close while nearby households still needed food.',
    'A closing-hour surplus table beside the market exit, staffed by one rotating volunteer.',
    'Market vendors, one volunteer coordinator, and households within a short walk of the market.',
    'A marked table, a painted sign, and a paper tally were used for four consecutive market days.',
    'Pickup ran for four market days. Vendors reported less dumping at close, and households knew where to come.',
    'Paper tally from four market days kept by the volunteer coordinator.',
    'A visible table and one named person at close worked better than a chat group.',
    'Use the same table method at other weekly markets. Keep verification of the volunteer shift as a contribution opportunity.'
  )
  ON CONFLICT (challenge_id) DO UPDATE SET
    outcome = EXCLUDED.outcome,
    updated_at = now();
END $$;
