-- Transactional idempotency check for process_matter_action_timeouts.
-- Looks up deterministic test usernames; rolls back all fixture rows.
BEGIN;

DO $$
DECLARE
  v_a uuid;
  v_b uuid;
  v_matter uuid;
  v_action uuid;
  v_closes integer;
  v_overdue integer;
  v_reminders integer;
BEGIN
  SELECT p.id INTO v_a
  FROM public.profiles p
  WHERE lower(trim(p.username)) = 'member'
  LIMIT 1;
  SELECT p.id INTO v_b
  FROM public.profiles p
  WHERE lower(trim(p.username)) = 'citizen'
  LIMIT 1;
  IF v_a IS NULL OR v_b IS NULL THEN
    RAISE EXCEPTION 'Need member and citizen test profiles.';
  END IF;

  INSERT INTO public.matters (
    title, description, matter_type, lifecycle_status, visibility,
    initiator_kind, initiator_profile_id,
    addressee_kind, addressee_profile_id,
    responsible_kind, responsible_profile_id,
    created_by_profile_id, submitted_at
  ) VALUES (
    '[verify-timeout] initiator silent',
    'Timeout idempotency fixture.',
    'issue', 'active', 'participants',
    'person', v_a, 'person', v_b, 'person', v_b, v_a, now()
  )
  RETURNING id INTO v_matter;

  INSERT INTO public.matter_action_requirements (
    matter_id, action_type, assigned_kind, assigned_profile_id,
    due_at, reminder_at, timing_policy_id, timeout_action, status
  ) VALUES (
    v_matter, 'confirm_resolution', 'person', v_a,
    now() - interval '1 hour', now() - interval '2 hours',
    'resolution_confirmation', 'auto_close', 'pending'
  )
  RETURNING id INTO v_action;

  UPDATE public.matters SET current_action_id = v_action WHERE id = v_matter;

  PERFORM public.process_matter_action_timeouts();
  PERFORM public.process_matter_action_timeouts();

  SELECT count(*) INTO v_closes
  FROM public.matter_events
  WHERE matter_id = v_matter AND event_type = 'matter_auto_closed';
  SELECT count(*) INTO v_overdue
  FROM public.matter_events
  WHERE matter_id = v_matter AND event_type = 'action_overdue';
  SELECT count(*) INTO v_reminders
  FROM public.matter_reminders r
  JOIN public.matter_action_requirements a ON a.id = r.action_id
  WHERE a.matter_id = v_matter;

  IF v_closes <> 1 THEN
    RAISE EXCEPTION 'Expected one auto-close event, found %', v_closes;
  END IF;
  IF v_overdue <> 0 THEN
    RAISE EXCEPTION 'Auto-close should not also emit overdue spam, found %', v_overdue;
  END IF;
  IF v_reminders > 1 THEN
    RAISE EXCEPTION 'Reminder rows should stay unique, found %', v_reminders;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.matters WHERE id = v_matter AND close_reason ILIKE '%confirmed resolution%'
  ) THEN
    RAISE EXCEPTION 'Auto-close must not be recorded as initiator confirmation.';
  END IF;
END $$;

ROLLBACK;
