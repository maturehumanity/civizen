-- Phase 5 connected-walk seed on soc-yeremyan-net-agent only.

DO $$
DECLARE
  v_viewer uuid;
  v_community uuid;
  v_gov uuid;
  v_null uuid;
  v_small uuid;
  v_program uuid;
  v_challenge uuid;
  v_proposal uuid;
  v_project uuid;
  v_solution uuid;
  v_problem uuid;
  v_cand uuid;
  v_gov_cand uuid;
  v_null_cand uuid;
  v_base uuid;
  v_f1 uuid;
  v_f2 uuid;
  v_help uuid;
  v_null_base uuid;
  v_null_follow uuid;
  v_ins_base uuid;
  v_ins_follow uuid;
  v_gov_base uuid;
  v_gov_follow uuid;
  v_rev uuid;
  v_rev_null uuid;
  v_rev_ins uuid;
  v_rev_gov uuid;
BEGIN
  SELECT p.id INTO v_viewer
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE u.email = 'member@test.civizen.local'
  LIMIT 1;
  IF v_viewer IS NULL THEN
    RAISE EXCEPTION 'test member profile not found';
  END IF;

  DELETE FROM public.human_outcome_reviews
   WHERE scope_id IN (SELECT id FROM public.wellbeing_aggregate_scopes WHERE entity_ref LIKE 'phase5-outcome-%');
  DELETE FROM public.contribution_programs WHERE seed_key = 'phase5-outcome-loop';
  DELETE FROM public.solution_problems
    WHERE author_id = v_viewer
      AND (title LIKE 'Phase 5 %' OR title LIKE 'Verify Evening %');
  DELETE FROM public.wellbeing_aggregate_scopes WHERE entity_ref LIKE 'phase5-outcome-%';

  INSERT INTO public.wellbeing_aggregate_scopes (kind, entity_ref, label, enabled, viewer_profile_ids)
  VALUES ('community', 'phase5-outcome-community', 'Verify community outcomes', true, ARRAY[v_viewer])
  RETURNING id INTO v_community;
  INSERT INTO public.wellbeing_aggregate_scopes (kind, entity_ref, label, enabled, viewer_profile_ids)
  VALUES ('organization', 'phase5-outcome-governance', 'Verify governance outcomes', true, ARRAY[v_viewer])
  RETURNING id INTO v_gov;
  INSERT INTO public.wellbeing_aggregate_scopes (kind, entity_ref, label, enabled, viewer_profile_ids)
  VALUES ('community', 'phase5-outcome-null', 'Verify null outcomes', true, ARRAY[v_viewer])
  RETURNING id INTO v_null;
  INSERT INTO public.wellbeing_aggregate_scopes (kind, entity_ref, label, enabled, viewer_profile_ids)
  VALUES ('organization', 'phase5-outcome-insufficient', 'Verify insufficient outcomes', true, ARRAY[v_viewer])
  RETURNING id INTO v_small;

  INSERT INTO public.wellbeing_aggregate_snapshots (scope_id, fingerprint, period_start, time_bucket, topic, result, privacy_policy_version, aggregation_model_version)
  VALUES (
    v_community, concat_ws('|', v_community::text, 'domain_state', 'quarter', '2026-01-01', 'time_life_balance', '', '', '', ''),
    '2026-01-01', 'quarter', 'domain_state',
    jsonb_build_object('kind','insight','scopeId',v_community,'topic','domain_state','domain','time_life_balance','timeBucket','quarter','periodStart','2026-01-01','summary','Time & Life Balance appears to be a recurring concern among participating members in this qualifying group.','sufficiency','sufficient','confidence','moderate','sourceTypes',jsonb_build_array('structured_domain_state'),'privacyPolicyVersion','wellbeing-aggregate-privacy-v1','aggregationModelVersion','wellbeing-aggregate-v1','suppression',NULL,'participation','sufficient','groupedDistribution',jsonb_build_object('struggling','shown','flourishing','grouped')),
    'wellbeing-aggregate-privacy-v1','wellbeing-aggregate-v1'
  ) RETURNING id INTO v_base;
  INSERT INTO public.wellbeing_aggregate_snapshots (scope_id, fingerprint, period_start, time_bucket, topic, result, privacy_policy_version, aggregation_model_version)
  VALUES (
    v_community, concat_ws('|', v_community::text, 'domain_state', 'quarter', '2026-04-01', 'time_life_balance', '', '', '', ''),
    '2026-04-01', 'quarter', 'domain_state',
    jsonb_build_object('kind','insight','scopeId',v_community,'topic','domain_state','domain','time_life_balance','timeBucket','quarter','periodStart','2026-04-01','summary','Time & Life Balance concerns were less prominent among participating members in this qualifying group.','sufficiency','sufficient','confidence','moderate','sourceTypes',jsonb_build_array('structured_domain_state'),'privacyPolicyVersion','wellbeing-aggregate-privacy-v1','aggregationModelVersion','wellbeing-aggregate-v1','suppression',NULL,'participation','sufficient','groupedDistribution',jsonb_build_object('flourishing','shown','thriving','shown')),
    'wellbeing-aggregate-privacy-v1','wellbeing-aggregate-v1'
  ) RETURNING id INTO v_f1;
  INSERT INTO public.wellbeing_aggregate_snapshots (scope_id, fingerprint, period_start, time_bucket, topic, result, privacy_policy_version, aggregation_model_version)
  VALUES (
    v_community, concat_ws('|', v_community::text, 'domain_state', 'quarter', '2026-07-01', 'time_life_balance', '', '', '', ''),
    '2026-07-01', 'quarter', 'domain_state',
    jsonb_build_object('kind','insight','scopeId',v_community,'topic','domain_state','domain','time_life_balance','timeBucket','quarter','periodStart','2026-07-01','summary','Time & Life Balance concerns remained less prominent across a later qualifying period.','sufficiency','sufficient','confidence','moderate','sourceTypes',jsonb_build_array('structured_domain_state'),'privacyPolicyVersion','wellbeing-aggregate-privacy-v1','aggregationModelVersion','wellbeing-aggregate-v1','suppression',NULL,'participation','sufficient','groupedDistribution',jsonb_build_object('flourishing','shown')),
    'wellbeing-aggregate-privacy-v1','wellbeing-aggregate-v1'
  ) RETURNING id INTO v_f2;
  INSERT INTO public.wellbeing_aggregate_snapshots (scope_id, fingerprint, period_start, time_bucket, topic, result, privacy_policy_version, aggregation_model_version)
  VALUES (
    v_community, concat_ws('|', v_community::text, 'intervention_helpfulness', 'quarter', '2026-04-01', 'time_life_balance', '', 'transportation', '', ''),
    '2026-04-01', 'quarter', 'intervention_helpfulness',
    jsonb_build_object('kind','insight','scopeId',v_community,'topic','intervention_helpfulness','domain','time_life_balance','timeBucket','quarter','periodStart','2026-04-01','summary','Transportation-access interventions were commonly reported as helpful among qualifying participants.','sufficiency','sufficient','confidence','low','sourceTypes',jsonb_build_array('structured_helpfulness'),'privacyPolicyVersion','wellbeing-aggregate-privacy-v1','aggregationModelVersion','wellbeing-aggregate-v1','suppression',NULL,'participation','sufficient'),
    'wellbeing-aggregate-privacy-v1','wellbeing-aggregate-v1'
  ) RETURNING id INTO v_help;

  INSERT INTO public.systemic_issue_candidates (scope_id, domain, factor_category, status, evidence_periods, summary, privacy_policy_version, pattern_model_version)
  VALUES (v_community, 'time_life_balance', 'transportation', 'established_pattern', 3, 'Time & Life Balance appears as a recurring pattern across several qualifying periods. This is a candidate for review, not a published Challenge or Governance item.', 'wellbeing-aggregate-privacy-v1', 'systemic-pattern-v1')
  RETURNING id INTO v_cand;

  INSERT INTO public.contribution_programs (publisher_profile_id, title, summary, status, seed_key)
  VALUES (v_viewer, 'Verify transit seed', 'Seed program for human outcome loop.', 'active', 'phase5-outcome-loop')
  RETURNING id INTO v_program;

  INSERT INTO public.community_challenges (program_id, publisher_profile_id, title, problem_statement, why_it_matters, success_criteria, status, outcome_summary)
  VALUES (v_program, v_viewer, 'Community Transit Access Pilot', 'Participating members in a qualifying group have repeatedly associated transportation with time constraints.', 'This is a privacy-protected group pattern, not a claim about every resident.', 'Investigate transit access using public evidence, not private Happiness records.', 'implementation', 'Three new shuttle routes launched.')
  RETURNING id INTO v_challenge;

  INSERT INTO public.challenge_proposals (challenge_id, author_profile_id, title, rationale, expected_result, status)
  VALUES (v_challenge, v_viewer, 'Evening shuttle service', 'A limited evening shuttle can reduce commute pressure without claiming it will raise Happiness.', 'Launch three evening shuttle routes and record whether later qualifying wellbeing evidence changes.', 'selected')
  RETURNING id INTO v_proposal;
  UPDATE public.community_challenges SET selected_proposal_id = v_proposal, status = 'completed', completed_at = now(), completed_by = v_viewer WHERE id = v_challenge;

  INSERT INTO public.implementation_projects (challenge_id, proposal_id, publisher_profile_id, title, summary, status, outcome_evidence)
  VALUES (v_challenge, v_proposal, v_viewer, 'Community Transit Access Pilot', 'Pilot evening shuttle service.', 'completed', 'Three new shuttle routes launched.')
  RETURNING id INTO v_project;

  INSERT INTO public.solution_records (challenge_id, project_id, program_id, publisher_profile_id, problem_context, implemented_solution, implementation_summary, outcome, lessons_learned, reuse_notes)
  VALUES (v_challenge, v_project, v_program, v_viewer, 'Transportation-related Time & Life Balance concern in a qualifying community group.', 'Evening shuttle pilot with three routes.', 'Routes launched after the selected proposal.', 'Three new shuttle routes launched.', 'Human outcome evidence is reviewed separately and does not establish causation.', 'Replication requires local transit partners. Do not treat one community result as universal.')
  RETURNING id INTO v_solution;

  INSERT INTO public.human_outcome_reviews (scope_id, systemic_issue_candidate_id, challenge_id, project_id, solution_record_id, created_by, target_domain, target_factor, objective, intervention_title, operational_outcome, intervention_started_at, next_review_window, status)
  VALUES (v_community, v_cand, v_challenge, v_project, v_solution, v_viewer, 'time_life_balance', 'transportation', 'Reduce the recurring transportation-related Time & Life Balance concern.', 'Community Transit Access Pilot', 'Three new shuttle routes launched.', '2026-04-15T00:00:00Z', 'quarter', 'awaiting_evidence')
  RETURNING id INTO v_rev;
  INSERT INTO public.human_outcome_review_evidence (review_id, aggregate_snapshot_id, evidence_role, period_order) VALUES (v_rev, v_base, 'baseline', 0), (v_rev, v_help, 'helpfulness', 0);
  INSERT INTO public.human_outcome_review_events (review_id, event_type, occurred_at, created_by, note) VALUES (v_rev, 'launched', '2026-04-15T00:00:00Z', v_viewer, 'Pilot evening shuttle service began.');
  INSERT INTO public.wellbeing_insight_links (candidate_id, entity_type, entity_id, created_by) VALUES (v_cand, 'challenge', v_challenge::text, v_viewer);

  INSERT INTO public.wellbeing_aggregate_snapshots (scope_id, fingerprint, period_start, time_bucket, topic, result, privacy_policy_version, aggregation_model_version)
  VALUES (
    v_null, concat_ws('|', v_null::text, 'domain_state', 'quarter', '2026-01-01', 'time_life_balance', '', '', '', ''),
    '2026-01-01', 'quarter', 'domain_state',
    jsonb_build_object('kind','insight','scopeId',v_null,'topic','domain_state','domain','time_life_balance','timeBucket','quarter','periodStart','2026-01-01','summary','Time & Life Balance appears to be a recurring concern among participating members in this qualifying group.','sufficiency','sufficient','confidence','moderate','sourceTypes',jsonb_build_array('structured_domain_state'),'privacyPolicyVersion','wellbeing-aggregate-privacy-v1','aggregationModelVersion','wellbeing-aggregate-v1','suppression',NULL,'participation','sufficient','groupedDistribution',jsonb_build_object('struggling','shown')),
    'wellbeing-aggregate-privacy-v1','wellbeing-aggregate-v1'
  ) RETURNING id INTO v_null_base;
  INSERT INTO public.wellbeing_aggregate_snapshots (scope_id, fingerprint, period_start, time_bucket, topic, result, privacy_policy_version, aggregation_model_version)
  VALUES (
    v_null, concat_ws('|', v_null::text, 'domain_state', 'quarter', '2026-04-01', 'time_life_balance', '', '', '', ''),
    '2026-04-01', 'quarter', 'domain_state',
    jsonb_build_object('kind','insight','scopeId',v_null,'topic','domain_state','domain','time_life_balance','timeBucket','quarter','periodStart','2026-04-01','summary','Time & Life Balance still appears as a recurring concern among participating members in this qualifying group.','sufficiency','sufficient','confidence','moderate','sourceTypes',jsonb_build_array('structured_domain_state'),'privacyPolicyVersion','wellbeing-aggregate-privacy-v1','aggregationModelVersion','wellbeing-aggregate-v1','suppression',NULL,'participation','sufficient','groupedDistribution',jsonb_build_object('struggling','shown')),
    'wellbeing-aggregate-privacy-v1','wellbeing-aggregate-v1'
  ) RETURNING id INTO v_null_follow;
  INSERT INTO public.systemic_issue_candidates (scope_id, domain, factor_category, status, evidence_periods, summary, privacy_policy_version, pattern_model_version)
  VALUES (v_null, 'time_life_balance', 'transportation', 'established_pattern', 3, 'Time & Life Balance remains a recurring qualifying pattern after a transit trial.', 'wellbeing-aggregate-privacy-v1', 'systemic-pattern-v1')
  RETURNING id INTO v_null_cand;
  INSERT INTO public.human_outcome_reviews (scope_id, systemic_issue_candidate_id, created_by, target_domain, target_factor, objective, intervention_title, operational_outcome, status, evidence_strength, intervention_started_at)
  VALUES (v_null, v_null_cand, v_viewer, 'time_life_balance', 'transportation', 'Reduce commute-related Time Balance concern.', 'Weekend Shuttle Trial', 'Weekend shuttle routes launched.', 'no_clear_change', 'early_association', '2026-04-01T00:00:00Z')
  RETURNING id INTO v_rev_null;
  INSERT INTO public.human_outcome_review_evidence (review_id, aggregate_snapshot_id, evidence_role, period_order) VALUES (v_rev_null, v_null_base, 'baseline', 0), (v_rev_null, v_null_follow, 'followup', 1);
  INSERT INTO public.human_outcome_public_lessons (review_id, domain, factor_category, intervention_category, title, problem, intervention, operational_outcome, human_outcome, evidence_strength, status, limitations, published_by)
  VALUES (v_rev_null, 'time_life_balance', 'transportation', 'shuttle', 'Weekend Shuttle Trial', 'Commute-related Time Balance', 'Weekend shuttle', 'Weekend shuttle routes launched.', 'No clear change. Operational implementation succeeded, but no qualifying human-outcome improvement was observed.', 'early_association', 'no_clear_change', 'A later change is not proof that this action caused it. Civizen does not establish causation from before-and-after observation.', v_viewer);
  UPDATE public.human_outcome_reviews SET published_public = true WHERE id = v_rev_null;

  INSERT INTO public.wellbeing_aggregate_snapshots (scope_id, fingerprint, period_start, time_bucket, topic, result, privacy_policy_version, aggregation_model_version, suppression)
  VALUES (
    v_small, concat_ws('|', v_small::text, 'domain_state', 'quarter', '2026-01-01', 'time_life_balance', '', '', '', ''),
    '2026-01-01', 'quarter', 'domain_state',
    jsonb_build_object('kind','insight','scopeId',v_small,'topic','domain_state','domain','time_life_balance','timeBucket','quarter','periodStart','2026-01-01','summary','Time & Life Balance appears to be a recurring concern among participating members in this qualifying group.','sufficiency','sufficient','confidence','moderate','sourceTypes',jsonb_build_array('structured_domain_state'),'privacyPolicyVersion','wellbeing-aggregate-privacy-v1','aggregationModelVersion','wellbeing-aggregate-v1','suppression',NULL,'participation','sufficient','groupedDistribution',jsonb_build_object('struggling','shown')),
    'wellbeing-aggregate-privacy-v1','wellbeing-aggregate-v1', NULL
  ) RETURNING id INTO v_ins_base;
  INSERT INTO public.wellbeing_aggregate_snapshots (scope_id, fingerprint, period_start, time_bucket, topic, result, privacy_policy_version, aggregation_model_version, suppression)
  VALUES (
    v_small, concat_ws('|', v_small::text, 'domain_state', 'quarter', '2026-04-01', 'time_life_balance', '', '', '', ''),
    '2026-04-01', 'quarter', 'domain_state',
    jsonb_build_object('kind','suppressed','reason','cohort_too_small','privacyPolicyVersion','wellbeing-aggregate-privacy-v1','aggregationModelVersion','wellbeing-aggregate-v1','summary','This insight is unavailable because the privacy requirements for this group are not currently met.'),
    'wellbeing-aggregate-privacy-v1','wellbeing-aggregate-v1', 'cohort_too_small'
  ) RETURNING id INTO v_ins_follow;
  INSERT INTO public.systemic_issue_candidates (scope_id, domain, factor_category, status, evidence_periods, summary, privacy_policy_version, pattern_model_version)
  VALUES (v_small, 'time_life_balance', 'transportation', 'established_pattern', 3, 'Time & Life Balance is still being monitored. Later qualifying evidence is not currently available.', 'wellbeing-aggregate-privacy-v1', 'systemic-pattern-v1')
  RETURNING id INTO v_null_cand;
  INSERT INTO public.human_outcome_reviews (scope_id, systemic_issue_candidate_id, created_by, target_domain, target_factor, objective, intervention_title, operational_outcome, status, intervention_started_at)
  VALUES (v_small, v_null_cand, v_viewer, 'time_life_balance', 'transportation', 'Reduce commute-related Time Balance concern.', 'Limited Transit Notice', 'A schedule notice was posted.', 'insufficient_evidence', '2026-04-01T00:00:00Z')
  RETURNING id INTO v_rev_ins;
  INSERT INTO public.human_outcome_review_evidence (review_id, aggregate_snapshot_id, evidence_role, period_order) VALUES (v_rev_ins, v_ins_base, 'baseline', 0), (v_rev_ins, v_ins_follow, 'followup', 1);

  INSERT INTO public.wellbeing_aggregate_snapshots (scope_id, fingerprint, period_start, time_bucket, topic, result, privacy_policy_version, aggregation_model_version)
  VALUES (
    v_gov, concat_ws('|', v_gov::text, 'domain_state', 'quarter', '2026-01-01', 'environment_community', '', '', '', ''),
    '2026-01-01', 'quarter', 'domain_state',
    jsonb_build_object('kind','insight','scopeId',v_gov,'topic','domain_state','domain','environment_community','timeBucket','quarter','periodStart','2026-01-01','summary','Environment & Community appears to be a recurring concern among participating members in this qualifying group.','sufficiency','sufficient','confidence','moderate','sourceTypes',jsonb_build_array('structured_domain_state'),'privacyPolicyVersion','wellbeing-aggregate-privacy-v1','aggregationModelVersion','wellbeing-aggregate-v1','suppression',NULL,'participation','sufficient','groupedDistribution',jsonb_build_object('unsettled','shown')),
    'wellbeing-aggregate-privacy-v1','wellbeing-aggregate-v1'
  ) RETURNING id INTO v_gov_base;
  INSERT INTO public.wellbeing_aggregate_snapshots (scope_id, fingerprint, period_start, time_bucket, topic, result, privacy_policy_version, aggregation_model_version)
  VALUES (
    v_gov, concat_ws('|', v_gov::text, 'domain_state', 'quarter', '2026-04-01', 'environment_community', '', '', '', ''),
    '2026-04-01', 'quarter', 'domain_state',
    jsonb_build_object('kind','insight','scopeId',v_gov,'topic','domain_state','domain','environment_community','timeBucket','quarter','periodStart','2026-04-01','summary','Environment & Community concerns were less prominent among participating members in this qualifying group.','sufficiency','sufficient','confidence','moderate','sourceTypes',jsonb_build_array('structured_domain_state'),'privacyPolicyVersion','wellbeing-aggregate-privacy-v1','aggregationModelVersion','wellbeing-aggregate-v1','suppression',NULL,'participation','sufficient','groupedDistribution',jsonb_build_object('flourishing','shown')),
    'wellbeing-aggregate-privacy-v1','wellbeing-aggregate-v1'
  ) RETURNING id INTO v_gov_follow;
  INSERT INTO public.systemic_issue_candidates (scope_id, domain, factor_category, status, evidence_periods, summary, privacy_policy_version, pattern_model_version)
  VALUES (v_gov, 'environment_community', 'transportation', 'established_pattern', 3, 'Environment & Community appears as a recurring pattern associated with transportation.', 'wellbeing-aggregate-privacy-v1', 'systemic-pattern-v1')
  RETURNING id INTO v_gov_cand;
  INSERT INTO public.solution_problems (author_id, title, body, status, mode)
  VALUES (v_viewer, 'Verify Evening Transit Schedule Policy', 'Adopt an evening transit schedule policy for qualifying community routes. Voting approval is not itself a human outcome.', 'resolved', 'solve')
  RETURNING id INTO v_problem;
  INSERT INTO public.human_outcome_reviews (scope_id, systemic_issue_candidate_id, governance_solution_id, created_by, target_domain, target_factor, objective, intervention_title, operational_outcome, status, evidence_strength, intervention_started_at)
  VALUES (v_gov, v_gov_cand, v_problem, v_viewer, 'environment_community', 'transportation', 'Improve Environment & Community experience associated with transit access.', 'Evening Transit Schedule Policy', 'The evening transit schedule policy took effect.', 'early_signal', 'early_association', '2026-04-01T00:00:00Z')
  RETURNING id INTO v_rev_gov;
  INSERT INTO public.human_outcome_review_evidence (review_id, aggregate_snapshot_id, evidence_role, period_order) VALUES (v_rev_gov, v_gov_base, 'baseline', 0), (v_rev_gov, v_gov_follow, 'followup', 1);
  INSERT INTO public.wellbeing_insight_links (candidate_id, entity_type, entity_id, created_by) VALUES (v_gov_cand, 'governance_solution', v_problem::text, v_viewer);
END $$;
