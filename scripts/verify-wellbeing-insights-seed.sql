-- Phase 4B connected-walk seed on soc-yeremyan-net-agent only.
-- Unique entity_ref values; cleanup deletes these scopes and the transit seed program.

DO $$
DECLARE
  v_viewer uuid;
  v_org uuid;
  v_community uuid;
  v_small uuid;
  v_program uuid;
BEGIN
  SELECT p.id INTO v_viewer
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE u.email = 'member@test.civizen.local'
  LIMIT 1;
  IF v_viewer IS NULL THEN
    RAISE EXCEPTION 'test member profile not found';
  END IF;

  DELETE FROM public.contribution_programs WHERE seed_key = 'phase4b-insights-transit';
  DELETE FROM public.wellbeing_aggregate_scopes WHERE entity_ref LIKE 'phase4b-insights-%';

  INSERT INTO public.wellbeing_aggregate_scopes (kind, entity_ref, label, enabled, viewer_profile_ids)
  VALUES ('organization', 'phase4b-insights-org', 'Verify org insights', true, ARRAY[v_viewer])
  RETURNING id INTO v_org;

  INSERT INTO public.wellbeing_aggregate_scopes (kind, entity_ref, label, enabled, viewer_profile_ids)
  VALUES ('community', 'phase4b-insights-community', 'Verify community insights', true, ARRAY[v_viewer])
  RETURNING id INTO v_community;

  INSERT INTO public.wellbeing_aggregate_scopes (kind, entity_ref, label, enabled, viewer_profile_ids)
  VALUES ('organization', 'phase4b-insights-suppressed', 'Verify suppressed insights', true, ARRAY[v_viewer])
  RETURNING id INTO v_small;

  INSERT INTO public.wellbeing_aggregate_snapshots (
    scope_id, fingerprint, period_start, time_bucket, topic, result, privacy_policy_version, aggregation_model_version
  ) VALUES
  (
    v_org, concat_ws('|', v_org::text, 'domain_state', 'quarter', '2026-04-01', 'relationships_belonging', '', '', '', ''),
    '2026-04-01', 'quarter', 'domain_state',
    jsonb_build_object(
      'kind', 'insight', 'scopeId', v_org, 'topic', 'domain_state', 'domain', 'relationships_belonging',
      'timeBucket', 'quarter', 'periodStart', '2026-04-01',
      'summary', 'Relationships & Belonging appears generally strong among participating members in this qualifying group.',
      'sufficiency', 'sufficient', 'confidence', 'moderate', 'sourceTypes', jsonb_build_array('structured_domain_state'),
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1', 'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'suppression', NULL, 'participation', 'sufficient',
      'groupedDistribution', jsonb_build_object('flourishing', 'shown', 'thriving', 'shown')
    ),
    'wellbeing-aggregate-privacy-v1', 'wellbeing-aggregate-v1'
  ),
  (
    v_org, concat_ws('|', v_org::text, 'domain_state', 'quarter', '2026-04-01', 'time_life_balance', '', '', '', ''),
    '2026-04-01', 'quarter', 'domain_state',
    jsonb_build_object(
      'kind', 'insight', 'scopeId', v_org, 'topic', 'domain_state', 'domain', 'time_life_balance',
      'timeBucket', 'quarter', 'periodStart', '2026-04-01',
      'summary', 'Time & Life Balance appears to be a recurring concern among participating members in this qualifying group.',
      'sufficiency', 'sufficient', 'confidence', 'moderate', 'sourceTypes', jsonb_build_array('structured_domain_state'),
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1', 'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'suppression', NULL, 'participation', 'sufficient',
      'groupedDistribution', jsonb_build_object('struggling', 'shown', 'flourishing', 'grouped')
    ),
    'wellbeing-aggregate-privacy-v1', 'wellbeing-aggregate-v1'
  ),
  (
    v_org, concat_ws('|', v_org::text, 'factor_category', 'quarter', '2026-04-01', 'time_life_balance', 'transportation', '', '', ''),
    '2026-04-01', 'quarter', 'factor_category',
    jsonb_build_object(
      'kind', 'insight', 'scopeId', v_org, 'topic', 'factor_category', 'domain', 'time_life_balance',
      'timeBucket', 'quarter', 'periodStart', '2026-04-01',
      'summary', 'Transportation is frequently selected as a factor associated with Time & Life Balance concerns among participating members in this qualifying group.',
      'sufficiency', 'sufficient', 'confidence', 'moderate', 'sourceTypes', jsonb_build_array('structured_factor'),
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1', 'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'suppression', NULL, 'participation', 'sufficient'
    ),
    'wellbeing-aggregate-privacy-v1', 'wellbeing-aggregate-v1'
  ),
  (
    v_org, concat_ws('|', v_org::text, 'intervention_helpfulness', 'quarter', '2026-04-01', 'time_life_balance', '', 'schedule', '', ''),
    '2026-04-01', 'quarter', 'intervention_helpfulness',
    jsonb_build_object(
      'kind', 'insight', 'scopeId', v_org, 'topic', 'intervention_helpfulness', 'domain', 'time_life_balance',
      'timeBucket', 'quarter', 'periodStart', '2026-04-01',
      'summary', 'Flexible scheduling actions were commonly reported as helpful among qualifying participants who tried this type of change.',
      'sufficiency', 'sufficient', 'confidence', 'low', 'sourceTypes', jsonb_build_array('structured_helpfulness'),
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1', 'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'suppression', NULL, 'participation', 'sufficient'
    ),
    'wellbeing-aggregate-privacy-v1', 'wellbeing-aggregate-v1'
  ),
  (
    v_org, concat_ws('|', v_org::text, 'domain_state', 'quarter', '2026-01-01', 'work_fulfillment', '', '', '', ''),
    '2026-01-01', 'quarter', 'domain_state',
    jsonb_build_object(
      'kind', 'insight', 'scopeId', v_org, 'topic', 'domain_state', 'domain', 'work_fulfillment',
      'timeBucket', 'quarter', 'periodStart', '2026-01-01',
      'summary', 'Work Fulfillment appeared generally strong among participating members in this qualifying group.',
      'sufficiency', 'sufficient', 'confidence', 'moderate', 'sourceTypes', jsonb_build_array('structured_domain_state'),
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1', 'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'suppression', NULL, 'participation', 'sufficient',
      'groupedDistribution', jsonb_build_object('flourishing', 'shown')
    ),
    'wellbeing-aggregate-privacy-v1', 'wellbeing-aggregate-v1'
  ),
  (
    v_org, concat_ws('|', v_org::text, 'domain_state', 'quarter', '2026-04-01', 'work_fulfillment', '', '', '', ''),
    '2026-04-01', 'quarter', 'domain_state',
    jsonb_build_object(
      'kind', 'insight', 'scopeId', v_org, 'topic', 'domain_state', 'domain', 'work_fulfillment',
      'timeBucket', 'quarter', 'periodStart', '2026-04-01',
      'summary', 'Work Fulfillment appears to be a recurring concern among participating members in this qualifying group.',
      'sufficiency', 'sufficient', 'confidence', 'moderate', 'sourceTypes', jsonb_build_array('structured_domain_state'),
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1', 'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'suppression', NULL, 'participation', 'sufficient',
      'groupedDistribution', jsonb_build_object('struggling', 'shown', 'flourishing', 'grouped')
    ),
    'wellbeing-aggregate-privacy-v1', 'wellbeing-aggregate-v1'
  );

  INSERT INTO public.systemic_issue_candidates (
    scope_id, domain, factor_category, status, evidence_periods, summary, privacy_policy_version, pattern_model_version
  ) VALUES (
    v_org, 'time_life_balance', 'transportation', 'established_pattern', 3,
    'Time & Life Balance appears as a recurring pattern across several qualifying periods. This is a candidate for review, not a published Challenge or Governance item.',
    'wellbeing-aggregate-privacy-v1', 'systemic-pattern-v1'
  );

  INSERT INTO public.wellbeing_aggregate_snapshots (
    scope_id, fingerprint, period_start, time_bucket, topic, result, privacy_policy_version, aggregation_model_version
  ) VALUES
  (
    v_community, concat_ws('|', v_community::text, 'domain_state', 'quarter', '2026-04-01', 'environment_community', '', '', '', ''),
    '2026-04-01', 'quarter', 'domain_state',
    jsonb_build_object(
      'kind', 'insight', 'scopeId', v_community, 'topic', 'domain_state', 'domain', 'environment_community',
      'timeBucket', 'quarter', 'periodStart', '2026-04-01',
      'summary', 'Environment & Community appears to be a recurring concern among participating members in this qualifying group.',
      'sufficiency', 'sufficient', 'confidence', 'moderate', 'sourceTypes', jsonb_build_array('structured_domain_state'),
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1', 'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'suppression', NULL, 'participation', 'sufficient',
      'groupedDistribution', jsonb_build_object('unsettled', 'shown', 'flourishing', 'grouped')
    ),
    'wellbeing-aggregate-privacy-v1', 'wellbeing-aggregate-v1'
  ),
  (
    v_community, concat_ws('|', v_community::text, 'factor_category', 'quarter', '2026-04-01', 'environment_community', 'transportation', '', '', ''),
    '2026-04-01', 'quarter', 'factor_category',
    jsonb_build_object(
      'kind', 'insight', 'scopeId', v_community, 'topic', 'factor_category', 'domain', 'environment_community',
      'timeBucket', 'quarter', 'periodStart', '2026-04-01',
      'summary', 'Transportation is frequently selected as a factor associated with Environment & Community concerns among participating members in this qualifying group.',
      'sufficiency', 'sufficient', 'confidence', 'moderate', 'sourceTypes', jsonb_build_array('structured_factor'),
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1', 'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'suppression', NULL, 'participation', 'sufficient'
    ),
    'wellbeing-aggregate-privacy-v1', 'wellbeing-aggregate-v1'
  );

  INSERT INTO public.systemic_issue_candidates (
    scope_id, domain, factor_category, status, evidence_periods, summary, privacy_policy_version, pattern_model_version
  ) VALUES (
    v_community, 'environment_community', 'transportation', 'emerging', 2,
    'Environment & Community is being observed. Recurring qualifying evidence is still needed.',
    'wellbeing-aggregate-privacy-v1', 'systemic-pattern-v1'
  );

  INSERT INTO public.wellbeing_aggregate_snapshots (
    scope_id, fingerprint, period_start, time_bucket, topic, result, privacy_policy_version, aggregation_model_version, suppression
  ) VALUES (
    v_small, concat_ws('|', v_small::text, 'domain_state', 'quarter', '2026-04-01', 'time_life_balance', '', '', '', ''),
    '2026-04-01', 'quarter', 'domain_state',
    jsonb_build_object(
      'kind', 'suppressed', 'reason', 'cohort_too_small',
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1', 'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'summary', 'This insight is unavailable because the privacy requirements for this group are not currently met.'
    ),
    'wellbeing-aggregate-privacy-v1', 'wellbeing-aggregate-v1', 'cohort_too_small'
  );

  INSERT INTO public.contribution_programs (publisher_profile_id, title, summary, status, seed_key)
  VALUES (v_viewer, 'Verify transit seed', 'Seed program for wellbeing insight matching.', 'active', 'phase4b-insights-transit')
  RETURNING id INTO v_program;

  INSERT INTO public.community_challenges (
    program_id, publisher_profile_id, title, problem_statement, why_it_matters, success_criteria, status
  ) VALUES (
    v_program, v_viewer, 'Local Transit Access Challenge',
    'Participating members in a qualifying group have repeatedly associated transportation with time constraints.',
    'This is a privacy-protected group pattern, not a claim about every resident.',
    'Investigate transit access using public evidence, not private Happiness records.',
    'active'
  );
END $$;
