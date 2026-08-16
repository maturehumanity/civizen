-- Phase 4A live acceptance on soc-yeremyan-net-agent only.
-- Creates a uniquely scoped test aggregate, then deletes it. Does not modify other members' Happiness rows.

DO $$
DECLARE
  v_user_id uuid;
  v_viewer uuid;
  v_other uuid;
  v_scope uuid;
  v_fingerprint text;
  v_period date := DATE '2026-04-01';
  v_result jsonb;
  v_id1 uuid;
  v_id2 uuid;
  v_created_at timestamptz;
  v_created_at2 timestamptz;
  v_collect jsonb;
  v_own_checkins int;
  v_other_checkins int;
  v_other_plans int;
  v_other_joy int;
  v_other_assess int;
  v_other_notes int;
  v_other_part int;
  v_membership_ok boolean := false;
  v_collect_ok boolean := false;
  v_persist_ok boolean := false;
  v_insert_ok boolean := false;
  v_had_part boolean := false;
  v_part_enabled boolean := false;
BEGIN
  SELECT u.id, p.id
    INTO v_user_id, v_viewer
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE u.email = 'member@test.civizen.local'
  LIMIT 1;
  IF v_viewer IS NULL THEN
    RAISE EXCEPTION 'test member profile not found';
  END IF;

  SELECT p.id INTO v_other
  FROM public.profiles p
  WHERE p.id IS DISTINCT FROM v_viewer
  LIMIT 1;
  IF v_other IS NULL THEN
    RAISE EXCEPTION 'second profile not found for isolation check';
  END IF;

  SELECT enabled INTO v_part_enabled
  FROM public.wellbeing_aggregate_participation
  WHERE profile_id = v_other;
  v_had_part := FOUND;

  DELETE FROM public.happiness_checkins WHERE note = 'phase4a-acceptance-private';
  DELETE FROM public.work_joy_entries WHERE note = 'phase4a-acceptance-private';
  DELETE FROM public.fulfillment_plans WHERE desired_outcome = 'phase4a-acceptance-private';
  DELETE FROM public.happiness_assessment_responses WHERE answers ? 'phase4a-acceptance-private';
  DELETE FROM public.wellbeing_aggregate_scopes
  WHERE kind = 'organization' AND entity_ref = 'phase4a-acceptance-isolation';

  INSERT INTO public.happiness_checkins (profile_id, feeling, note)
  VALUES (v_other, 'okay', 'phase4a-acceptance-private');
  INSERT INTO public.work_joy_entries (profile_id, feeling, note)
  VALUES (v_other, 'neutral', 'phase4a-acceptance-private');
  INSERT INTO public.fulfillment_plans (profile_id, domain_key, title, desired_outcome)
  VALUES (v_other, 'time_life_balance', 'phase4a-acceptance-private', 'phase4a-acceptance-private');
  INSERT INTO public.happiness_assessment_responses (profile_id, instrument_id, answers)
  SELECT v_other, i.id, jsonb_build_object('phase4a-acceptance-private', true)
  FROM public.happiness_assessment_instruments i
  LIMIT 1;
  INSERT INTO public.wellbeing_aggregate_participation (profile_id, enabled, enabled_at, policy_version)
  VALUES (v_other, true, now(), 'wellbeing-aggregate-privacy-v1')
  ON CONFLICT (profile_id) DO UPDATE
    SET enabled = EXCLUDED.enabled, enabled_at = EXCLUDED.enabled_at, disabled_at = NULL, updated_at = now();

  IF (SELECT COUNT(*) FROM public.happiness_checkins WHERE note = 'phase4a-acceptance-private') <> 1
     OR (SELECT COUNT(*) FROM public.work_joy_entries WHERE note = 'phase4a-acceptance-private') <> 1
     OR (SELECT COUNT(*) FROM public.fulfillment_plans WHERE desired_outcome = 'phase4a-acceptance-private') <> 1
     OR (SELECT COUNT(*) FROM public.happiness_assessment_responses WHERE answers ? 'phase4a-acceptance-private') <> 1
     OR NOT EXISTS (SELECT 1 FROM public.wellbeing_aggregate_participation WHERE profile_id = v_other AND enabled) THEN
    RAISE EXCEPTION 'failed to seed other-member private rows for isolation proof';
  END IF;

  INSERT INTO public.wellbeing_aggregate_scopes (kind, entity_ref, label, enabled, viewer_profile_ids)
  VALUES (
    'organization',
    'phase4a-acceptance-isolation',
    'Phase 4A acceptance isolation',
    true,
    ARRAY[v_viewer]
  )
  RETURNING id INTO v_scope;

  v_fingerprint := concat_ws(
    '|',
    v_scope::text,
    'domain_state',
    'quarter',
    '2026-04-01',
    'time_life_balance',
    '',
    '',
    '',
    ''
  );

  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  v_collect := public.collect_wellbeing_structured_signals(v_scope, v_period, 'quarter');
  IF v_collect IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION 'empty test scope should collect no signals, got %', v_collect;
  END IF;

  v_id1 := public.persist_wellbeing_aggregate_snapshot(jsonb_build_object(
    'scopeId', v_scope,
    'fingerprint', v_fingerprint,
    'periodStart', '2026-04-01',
    'timeBucket', 'quarter',
    'topic', 'domain_state',
    'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1',
    'aggregationModelVersion', 'wellbeing-aggregate-v1',
    'result', jsonb_build_object(
      'kind', 'insight',
      'scopeId', v_scope,
      'topic', 'domain_state',
      'domain', 'time_life_balance',
      'timeBucket', 'quarter',
      'periodStart', '2026-04-01',
      'summary', 'Time & Life Balance appears to be a recurring concern among participating members in this qualifying group.',
      'sufficiency', 'sufficient',
      'confidence', 'moderate',
      'sourceTypes', jsonb_build_array('structured_domain_state'),
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1',
      'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'suppression', NULL,
      'participation', 'sufficient'
    )
  ));
  SELECT created_at INTO v_created_at FROM public.wellbeing_aggregate_snapshots WHERE id = v_id1;

  v_id2 := public.persist_wellbeing_aggregate_snapshot(jsonb_build_object(
    'scopeId', v_scope,
    'fingerprint', v_fingerprint,
    'periodStart', '2026-04-01',
    'timeBucket', 'quarter',
    'topic', 'domain_state',
    'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1',
    'aggregationModelVersion', 'wellbeing-aggregate-v1',
    'result', jsonb_build_object(
      'kind', 'suppressed',
      'reason', 'cohort_too_small',
      'privacyPolicyVersion', 'wellbeing-aggregate-privacy-v1',
      'aggregationModelVersion', 'wellbeing-aggregate-v1',
      'summary', 'withdrawn rewrite attempt'
    )
  ));
  SELECT created_at INTO v_created_at2 FROM public.wellbeing_aggregate_snapshots WHERE id = v_id2;
  IF v_id1 IS DISTINCT FROM v_id2 OR v_created_at IS DISTINCT FROM v_created_at2 THEN
    RAISE EXCEPTION 'historic snapshot was rewritten';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.wellbeing_aggregate_snapshots
    WHERE id = v_id1 AND result->>'summary' ILIKE '%withdrawn rewrite%'
  ) THEN
    RAISE EXCEPTION 'historic snapshot result was replaced';
  END IF;
  IF (SELECT result::text FROM public.wellbeing_aggregate_snapshots WHERE id = v_id1) ~* 'member-|profile_id|privateNote' THEN
    RAISE EXCEPTION 'snapshot leaked member identity';
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user_id, 'role', 'authenticated')::text,
    true
  );
  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    PERFORM public.collect_wellbeing_structured_signals(v_scope, v_period, 'quarter');
    v_collect_ok := true;
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    v_collect_ok := false;
  END;
  IF v_collect_ok THEN
    RAISE EXCEPTION 'authenticated viewer executed collect_wellbeing_structured_signals';
  END IF;

  BEGIN
    PERFORM public.persist_wellbeing_aggregate_snapshot('{"result":{"kind":"insight"}}'::jsonb);
    v_persist_ok := true;
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    v_persist_ok := false;
  END;
  IF v_persist_ok THEN
    RAISE EXCEPTION 'authenticated viewer executed persist_wellbeing_aggregate_snapshot';
  END IF;

  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    SELECT COUNT(*) INTO v_own_checkins FROM public.happiness_checkins WHERE profile_id = v_viewer;
    SELECT COUNT(*) INTO v_other_checkins FROM public.happiness_checkins WHERE note = 'phase4a-acceptance-private';
    SELECT COUNT(*) INTO v_other_plans FROM public.fulfillment_plans WHERE desired_outcome = 'phase4a-acceptance-private';
    SELECT COUNT(*) INTO v_other_joy FROM public.work_joy_entries WHERE note = 'phase4a-acceptance-private';
    SELECT COUNT(*) INTO v_other_assess FROM public.happiness_assessment_responses WHERE answers ? 'phase4a-acceptance-private';
    SELECT COUNT(*) INTO v_other_notes FROM public.happiness_checkins WHERE note = 'phase4a-acceptance-private';
    SELECT COUNT(*) INTO v_other_part FROM public.wellbeing_aggregate_participation WHERE profile_id = v_other;
    BEGIN
      PERFORM 1 FROM public.wellbeing_aggregate_scope_membership LIMIT 1;
      v_membership_ok := true;
    EXCEPTION WHEN insufficient_privilege THEN
      v_membership_ok := false;
    END;
    BEGIN
      INSERT INTO public.wellbeing_aggregate_snapshots (
        scope_id, fingerprint, period_start, time_bucket, topic, result,
        privacy_policy_version, aggregation_model_version
      ) VALUES (
        v_scope, 'probe', v_period, 'quarter', 'domain_state', '{}'::jsonb,
        'wellbeing-aggregate-privacy-v1', 'wellbeing-aggregate-v1'
      );
      v_insert_ok := true;
    EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
      v_insert_ok := false;
    END;

    v_result := public.get_wellbeing_aggregate(jsonb_build_object(
      'scopeId', v_scope,
      'topic', 'domain_state',
      'timeBucket', 'quarter',
      'periodStart', '2026-04-01',
      'domain', 'time_life_balance'
    ));
    IF v_result->>'kind' IS DISTINCT FROM 'insight' THEN
      RAISE EXCEPTION 'viewer did not receive stored snapshot: %', v_result;
    END IF;
    IF v_result::text ~* 'member-|profile_id|privateNote|Site B' THEN
      RAISE EXCEPTION 'viewer snapshot leaked private data';
    END IF;

    v_result := public.get_wellbeing_aggregate(jsonb_build_object(
      'scopeId', v_scope,
      'topic', 'domain_state',
      'timeBucket', 'quarter',
      'periodStart', '2026-04-01',
      'domain', 'time_life_balance',
      'raw', true
    ));
    IF v_result->>'reason' IS DISTINCT FROM 'bypass_not_permitted' THEN
      RAISE EXCEPTION 'raw flag was not rejected: %', v_result;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.wellbeing_aggregate_audit
      WHERE requester_profile_id = v_viewer
        AND scope_id = v_scope
        AND (
          COALESCE(fingerprint, '') ~* 'member-'
          OR COALESCE(topic, '') ILIKE '%note%'
        )
    ) THEN
      RAISE EXCEPTION 'audit contained private payload';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.wellbeing_aggregate_audit
      WHERE requester_profile_id = v_viewer
        AND scope_id = v_scope
        AND privacy_policy_version = 'wellbeing-aggregate-privacy-v1'
        AND aggregation_model_version = 'wellbeing-aggregate-v1'
        AND fingerprint = v_fingerprint
    ) THEN
      RAISE EXCEPTION 'audit row missing for allowed request';
    END IF;

    PERFORM set_config('role', 'postgres', true);
  END;

  IF v_other_checkins <> 0 OR v_other_plans <> 0 OR v_other_joy <> 0 OR v_other_assess <> 0 OR v_other_notes <> 0 OR v_other_part <> 0 THEN
    RAISE EXCEPTION 'viewer saw another member private rows (checkins=%, plans=%, joy=%, assess=%, notes=%, participation=%)',
      v_other_checkins, v_other_plans, v_other_joy, v_other_assess, v_other_notes, v_other_part;
  END IF;
  IF v_membership_ok THEN
    RAISE EXCEPTION 'viewer selected wellbeing_aggregate_scope_membership';
  END IF;
  IF v_insert_ok THEN
    RAISE EXCEPTION 'viewer inserted a snapshot';
  END IF;

  DELETE FROM public.happiness_checkins WHERE note = 'phase4a-acceptance-private';
  DELETE FROM public.work_joy_entries WHERE note = 'phase4a-acceptance-private';
  DELETE FROM public.fulfillment_plans WHERE desired_outcome = 'phase4a-acceptance-private';
  DELETE FROM public.happiness_assessment_responses WHERE answers ? 'phase4a-acceptance-private';
  IF v_had_part THEN
    UPDATE public.wellbeing_aggregate_participation
      SET enabled = v_part_enabled, updated_at = now()
      WHERE profile_id = v_other;
  ELSE
    DELETE FROM public.wellbeing_aggregate_participation WHERE profile_id = v_other;
  END IF;
  DELETE FROM public.wellbeing_aggregate_audit WHERE scope_id = v_scope;
  DELETE FROM public.wellbeing_aggregate_scopes WHERE id = v_scope;

  RAISE NOTICE 'Phase 4A live DB acceptance passed. viewer_own_checkins=%', v_own_checkins;
EXCEPTION WHEN OTHERS THEN
  EXECUTE 'RESET ROLE';
  DELETE FROM public.happiness_checkins WHERE note = 'phase4a-acceptance-private';
  DELETE FROM public.work_joy_entries WHERE note = 'phase4a-acceptance-private';
  DELETE FROM public.fulfillment_plans WHERE desired_outcome = 'phase4a-acceptance-private';
  DELETE FROM public.happiness_assessment_responses WHERE answers ? 'phase4a-acceptance-private';
  IF v_had_part THEN
    UPDATE public.wellbeing_aggregate_participation
      SET enabled = v_part_enabled, updated_at = now()
      WHERE profile_id = v_other;
  ELSIF v_other IS NOT NULL THEN
    DELETE FROM public.wellbeing_aggregate_participation WHERE profile_id = v_other;
  END IF;
  DELETE FROM public.wellbeing_aggregate_scopes WHERE kind = 'organization' AND entity_ref = 'phase4a-acceptance-isolation';
  RAISE;
END $$;
