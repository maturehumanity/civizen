-- Phase 3 stabilization: escalation policy binding, partial-resolution semantics, legacy path fixes.

CREATE TABLE IF NOT EXISTS public.matter_escalation_policy_defaults (
  matter_type text NOT NULL,
  action_type text NOT NULL,
  policy_id text NOT NULL REFERENCES public.matter_escalation_policies(id) ON DELETE CASCADE,
  PRIMARY KEY (matter_type, action_type)
);

INSERT INTO public.matter_escalation_policy_defaults (matter_type, action_type, policy_id)
VALUES
  ('question', 'respond', 'response_escalation'),
  ('suggestion', 'respond', 'response_escalation'),
  ('discussion', 'respond', 'response_escalation'),
  ('other', 'respond', 'response_escalation'),
  ('issue', 'responsibility_response', 'responsibility_escalation'),
  ('request', 'responsibility_response', 'responsibility_escalation'),
  ('other', 'responsibility_response', 'responsibility_escalation')
ON CONFLICT (matter_type, action_type) DO NOTHING;

INSERT INTO public.matter_escalation_policies (id, display_name, timeout_behavior, notes, trigger_action_type, max_depth)
VALUES (
  'responsibility_escalation_urgent', 'Urgent responsibility escalation', 'escalate',
  'Alternate policy for explicit binding tests.', 'responsibility_response', 2
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.matter_escalation_steps (policy_id, step_order, after_hours, step_behavior, target_role)
VALUES
  ('responsibility_escalation_urgent', 1, 12, 'mark_unresponsive', 'assigned_actor'),
  ('responsibility_escalation_urgent', 2, 24, 'notify_lead', 'responsible_lead')
ON CONFLICT (policy_id, step_order) DO NOTHING;

CREATE OR REPLACE FUNCTION public.matter_resolve_escalation_policy(
  p_matter_id uuid,
  p_action_type text,
  p_explicit_policy_id text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter_type text;
  v_policy text;
BEGIN
  IF nullif(trim(coalesce(p_explicit_policy_id, '')), '') IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.matter_escalation_policies WHERE id = p_explicit_policy_id) THEN
      RAISE EXCEPTION 'Unknown escalation policy.';
    END IF;
    RETURN p_explicit_policy_id;
  END IF;
  SELECT matter_type INTO v_matter_type FROM public.matters WHERE id = p_matter_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT d.policy_id INTO v_policy
  FROM public.matter_escalation_policy_defaults d
  WHERE d.matter_type = v_matter_type
    AND d.action_type = p_action_type;
  RETURN v_policy;
END;
$$;

DROP FUNCTION IF EXISTS public.matter_assign_action(uuid, text, text, uuid, text, text, text, text, uuid);

CREATE FUNCTION public.matter_assign_action(
  p_matter_id uuid,
  p_action_type text,
  p_assigned_kind text,
  p_assigned_profile_id uuid,
  p_assigned_unit_label text,
  p_timing_policy_id text,
  p_timeout_action text,
  p_context_kind text DEFAULT 'matter',
  p_context_id uuid DEFAULT NULL,
  p_escalation_policy_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy public.matter_timing_policies%ROWTYPE;
  v_due timestamptz;
  v_reminder timestamptz;
  v_id uuid;
  v_name text;
  v_kind text := coalesce(nullif(p_context_kind, ''), 'matter');
  v_escalation text;
BEGIN
  SELECT * INTO v_policy FROM public.matter_timing_policies WHERE id = p_timing_policy_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown timing policy.';
  END IF;
  v_escalation := public.matter_resolve_escalation_policy(p_matter_id, p_action_type, p_escalation_policy_id);

  UPDATE public.matter_action_requirements
  SET status = 'superseded'
  WHERE matter_id = p_matter_id
    AND status IN ('pending', 'overdue')
    AND context_kind = v_kind
    AND coalesce(context_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(p_context_id, '00000000-0000-0000-0000-000000000000'::uuid);

  v_due := now() + (public.matter_duration_ms(v_policy.duration_value, v_policy.duration_unit) || ' milliseconds')::interval;
  v_reminder := v_due - (public.matter_duration_ms(v_policy.reminder_value, v_policy.reminder_unit) || ' milliseconds')::interval;
  IF v_reminder < now() THEN
    v_reminder := now();
  END IF;

  INSERT INTO public.matter_action_requirements (
    matter_id, action_type, assigned_kind, assigned_profile_id, assigned_unit_label,
    due_at, reminder_at, timing_policy_id, timeout_action, context_kind, context_id, escalation_policy_id
  ) VALUES (
    p_matter_id, p_action_type, p_assigned_kind, p_assigned_profile_id,
    nullif(trim(coalesce(p_assigned_unit_label, '')), ''),
    v_due, v_reminder, v_policy.id, p_timeout_action, v_kind, p_context_id, v_escalation
  )
  RETURNING id INTO v_id;

  IF v_kind = 'task' AND p_context_id IS NOT NULL THEN
    UPDATE public.collaboration_tasks
    SET current_action_id = v_id, due_at = coalesce(due_at, v_due), updated_at = now()
    WHERE id = p_context_id;
  END IF;

  PERFORM public.matter_sync_headline(p_matter_id);

  v_name := public.matter_profile_display_name(p_assigned_profile_id);
  PERFORM public.matter_log_event(
    p_matter_id, 'action_assigned',
    'Action assigned to ' || v_name || '.',
    'system', NULL, true,
    jsonb_build_object(
      'actionType', p_action_type, 'timingPolicyId', v_policy.id, 'dueAt', v_due,
      'contextKind', v_kind, 'contextId', p_context_id, 'escalationPolicyId', v_escalation
    )
  );
  PERFORM public.matter_log_event(
    p_matter_id, 'timer_started',
    'Timer started using ' || v_policy.display_name || '.',
    'system', NULL, true,
    jsonb_build_object('timingPolicyId', v_policy.id, 'dueAt', v_due, 'actionId', v_id)
  );
  INSERT INTO public.matter_reminders (action_id, reminder_kind)
  VALUES (v_id, 'assigned')
  ON CONFLICT (action_id, reminder_kind) DO NOTHING;
  PERFORM public.matter_notify_actor(
    p_assigned_kind, p_assigned_profile_id,
    CASE
      WHEN p_action_type = 'accept_task' THEN 'task_acceptance_required'
      WHEN p_action_type = 'complete_task' THEN 'task_assigned'
      WHEN p_action_type = 'review_task' THEN 'task_submitted_for_review'
      WHEN p_action_type = 'confirm_decision' THEN 'decision_confirmation_required'
      WHEN p_action_type = 'review_resolution' THEN 'resolution_review_required'
      WHEN p_action_type = 'outcome_followup' THEN 'outcome_followup_required'
      ELSE 'matter_action_assigned'
    END,
    'Action required',
    CASE
      WHEN p_action_type = 'accept_task' THEN 'Accept or decline an assigned Task.'
      WHEN p_action_type = 'complete_task' THEN 'A Task needs work from you.'
      WHEN p_action_type = 'review_task' THEN 'Submitted work is ready for review.'
      WHEN p_action_type = 'confirm_decision' THEN 'A Decision needs confirmation.'
      WHEN p_action_type = 'review_resolution' THEN 'Review a proposed Resolution.'
      WHEN p_action_type = 'outcome_followup' THEN 'Record outcome follow-up.'
      ELSE 'A Matter needs a response from you.'
    END,
    p_matter_id
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_matter_action_timeouts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.matter_action_requirements%ROWTYPE;
  v_step public.matter_escalation_steps%ROWTYPE;
  v_locked public.matter_action_requirements%ROWTYPE;
  v_count integer := 0;
  v_marked uuid;
  v_closed uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('process_matter_action_timeouts', 0));

  FOR v_row IN
    SELECT a.*
    FROM public.matter_action_requirements a
    JOIN public.matters m ON m.id = a.matter_id
    WHERE a.status IN ('pending', 'overdue')
      AND m.lifecycle_status IN ('submitted', 'active')
      AND (a.reminder_at <= now() OR a.due_at <= now())
    FOR UPDATE OF a SKIP LOCKED
  LOOP
    SELECT * INTO v_locked FROM public.matter_action_requirements WHERE id = v_row.id;
    IF NOT FOUND OR v_locked.status NOT IN ('pending', 'overdue') THEN CONTINUE; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.matters m WHERE m.id = v_locked.matter_id AND m.lifecycle_status IN ('submitted', 'active')
    ) THEN CONTINUE; END IF;

    IF now() >= v_locked.reminder_at AND now() < v_locked.due_at THEN
      INSERT INTO public.matter_reminders (action_id, reminder_kind) VALUES (v_locked.id, 'approaching')
      ON CONFLICT (action_id, reminder_kind) DO NOTHING;
      IF FOUND THEN
        PERFORM public.matter_log_event(v_locked.matter_id, 'reminder_sent', 'Approaching-deadline reminder sent.',
          'system', NULL, true, jsonb_build_object('reminderKind', 'approaching', 'actionId', v_locked.id));
        PERFORM public.matter_notify_actor(v_locked.assigned_kind, v_locked.assigned_profile_id,
          CASE WHEN v_locked.context_kind = 'task' THEN 'task_approaching_due' ELSE 'matter_action_reminder' END,
          CASE WHEN v_locked.context_kind = 'task' THEN 'Task deadline approaching' ELSE 'Matter deadline approaching' END,
          CASE WHEN v_locked.context_kind = 'task' THEN 'A Task still needs your action.' ELSE 'A Matter still needs your action.' END,
          v_locked.matter_id);
        v_count := v_count + 1;
      END IF;
    END IF;

    IF now() >= v_locked.due_at AND v_locked.timeout_action = 'auto_close'
       AND (
         (v_locked.context_kind = 'matter' AND v_locked.action_type = 'confirm_resolution')
         OR (v_locked.context_kind = 'resolution' AND v_locked.action_type = 'review_resolution')
       ) THEN
      SELECT id INTO v_closed FROM public.matters
      WHERE id = v_locked.matter_id AND lifecycle_status IN ('submitted', 'active') AND current_action_id = v_locked.id
      FOR UPDATE;
      IF v_closed IS NOT NULL THEN
        PERFORM public.matter_close(v_locked.matter_id, 'auto_no_initiator_response',
          'Closed automatically after no response from the initiator within the resolution-review period.',
          'system', NULL, true);
        v_count := v_count + 1;
      END IF;
      CONTINUE;
    END IF;

    IF now() >= v_locked.due_at THEN
      UPDATE public.matter_action_requirements SET status = 'overdue'
      WHERE id = v_locked.id AND status = 'pending' RETURNING id INTO v_marked;
      IF v_marked IS NOT NULL THEN
        PERFORM public.matter_log_event(v_locked.matter_id, 'action_overdue', 'The required action is overdue.',
          'system', NULL, true, jsonb_build_object('actionId', v_locked.id, 'contextKind', v_locked.context_kind));
        v_count := v_count + 1;
      END IF;
      INSERT INTO public.matter_reminders (action_id, reminder_kind) VALUES (v_locked.id, 'overdue')
      ON CONFLICT (action_id, reminder_kind) DO NOTHING;
      IF FOUND THEN
        PERFORM public.matter_log_event(v_locked.matter_id, 'reminder_sent', 'Overdue notification sent.',
          'system', NULL, true, jsonb_build_object('reminderKind', 'overdue', 'actionId', v_locked.id));
        PERFORM public.matter_notify_actor(v_locked.assigned_kind, v_locked.assigned_profile_id,
          CASE WHEN v_locked.context_kind = 'task' THEN 'task_overdue' ELSE 'matter_action_overdue' END,
          CASE WHEN v_locked.context_kind = 'task' THEN 'Task overdue' ELSE 'Matter action overdue' END,
          CASE WHEN v_locked.context_kind = 'task' THEN 'A required Task action is overdue.' ELSE 'A required Matter action is overdue.' END,
          v_locked.matter_id);
      END IF;
    END IF;

    IF now() >= v_locked.due_at AND v_locked.escalation_policy_id IS NOT NULL THEN
      FOR v_step IN
        SELECT s.* FROM public.matter_escalation_steps s
        WHERE s.policy_id = v_locked.escalation_policy_id
          AND v_locked.due_at + (s.after_hours || ' hours')::interval <= now()
        ORDER BY s.step_order
      LOOP
        PERFORM public.matter_execute_escalation_step(v_locked, v_step);
      END LOOP;
    END IF;
  END LOOP;

  PERFORM public.matter_activate_due_outcome_followups();
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.matter_find_stalled() IS
  'Operational diagnostic: active Matters with no pending action and no waiting_condition. Does not auto-repair; use for manual review or monitoring.';

REVOKE ALL ON FUNCTION public.matter_resolve_escalation_policy(uuid, text, text) FROM PUBLIC, authenticated;
GRANT SELECT ON public.matter_escalation_policy_defaults TO authenticated;

-- perform_matter_formal_action partial-resolution fix
CREATE OR REPLACE FUNCTION public.perform_matter_formal_action(
  p_matter_id uuid,
  p_action text,
  p_message text DEFAULT NULL,
  p_target_kind text DEFAULT NULL,
  p_target_profile_id uuid DEFAULT NULL,
  p_target_unit_label text DEFAULT NULL,
  p_reopen_reason text DEFAULT NULL,
  p_actor_kind text DEFAULT 'person'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_matter public.matters%ROWTYPE;
  v_action public.matter_action_requirements%ROWTYPE;
  v_actor_kind text := coalesce(nullif(p_actor_kind, ''), 'person');
  v_defaults public.matter_type_defaults%ROWTYPE;
  v_next_type text;
  v_policy text;
  v_reason text;
  v_is_assigned boolean := false;
  v_is_initiator boolean := false;
  v_is_party boolean := false;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to act on a Matter.';
  END IF;
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Matter not found.';
  END IF;
  IF NOT public.can_access_matter(p_matter_id) THEN
    RAISE EXCEPTION 'You cannot act on this Matter.';
  END IF;

  v_is_initiator := public.current_profile_represents_actor(v_matter.initiator_kind, v_matter.initiator_profile_id);
  v_is_party := public.current_profile_is_matter_party(p_matter_id);

  IF v_actor_kind = 'organization' THEN
    IF NOT (
      public.current_profile_represents_actor(v_matter.responsible_kind, v_matter.responsible_profile_id)
      OR public.current_profile_represents_actor(v_matter.addressee_kind, v_matter.addressee_profile_id)
    ) THEN
      v_actor_kind := 'person';
    END IF;
  ELSE
    v_actor_kind := 'person';
  END IF;

  IF p_action = 'reopen' THEN
    IF v_matter.lifecycle_status <> 'closed' THEN
      RAISE EXCEPTION 'Only a closed Matter can be reopened.';
    END IF;
    IF NOT (
      v_is_initiator
      OR public.current_profile_represents_actor(v_matter.responsible_kind, v_matter.responsible_profile_id)
      OR public.has_permission('settings.manage')
    ) THEN
      RAISE EXCEPTION 'You cannot reopen this Matter.';
    END IF;
    v_reason := coalesce(nullif(trim(coalesce(p_message, '')), ''), replace(coalesce(p_reopen_reason, 'other'), '_', ' '));
    UPDATE public.matters
    SET lifecycle_status = 'active',
        last_reopened_at = now(),
        reopen_count = reopen_count + 1,
        updated_at = now()
    WHERE id = p_matter_id
      AND lifecycle_status = 'closed';
    PERFORM public.matter_log_event(
      p_matter_id, 'matter_reopened',
      'Matter reopened. Previous closure remains on the record. Reason: ' || v_reason || '.',
      v_actor_kind, v_self, false,
      jsonb_build_object(
        'reopenReason', coalesce(p_reopen_reason, 'other'),
        'previousCloseKind', v_matter.close_kind,
        'previousCloseReason', v_matter.close_reason
      )
    );
    SELECT * INTO v_defaults FROM public.matter_type_defaults WHERE matter_type = v_matter.matter_type;
    PERFORM public.matter_assign_action(
      p_matter_id, v_defaults.initial_action_type,
      v_matter.responsible_kind, v_matter.responsible_profile_id, v_matter.responsible_unit_label,
      v_defaults.timing_policy_id, v_defaults.timeout_behavior
    );
    RETURN;
  END IF;

  IF v_matter.lifecycle_status = 'closed' THEN
    RAISE EXCEPTION 'This Matter is closed.';
  END IF;

  SELECT * INTO v_action
  FROM public.matter_action_requirements
  WHERE id = v_matter.current_action_id;
  v_is_assigned := FOUND AND public.current_profile_represents_actor(v_action.assigned_kind, v_action.assigned_profile_id);

  IF NOT public.matter_formal_action_is_allowed(
    p_action,
    coalesce(v_action.action_type, ''),
    v_matter.matter_type,
    v_is_assigned,
    v_is_initiator,
    v_is_party,
    v_matter.lifecycle_status
  ) THEN
    RAISE EXCEPTION 'That action is not available.';
  END IF;

  IF p_action = 'close' THEN
    PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'close');
    PERFORM public.matter_close(
      p_matter_id, 'manual', coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Closed by the initiator.'),
      v_actor_kind, v_self, false
    );
    RETURN;
  END IF;

  IF p_action = 'revealed_issue' THEN
    PERFORM public.matter_log_event(
      p_matter_id, 'question_revealed_issue',
      coalesce(nullif(trim(coalesce(p_message, '')), ''), 'The initiator recorded that this Question revealed an Issue. The Matter stays a Question; type conversion is not applied.'),
      v_actor_kind, v_self, false
    );
    IF v_action.id IS NOT NULL AND v_action.action_type = 'confirm_resolution' AND v_action.status IN ('pending', 'overdue') THEN
      PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'revealed_issue');
      PERFORM public.matter_assign_action(
        p_matter_id, 'respond', v_matter.responsible_kind, v_matter.responsible_profile_id,
        v_matter.responsible_unit_label, 'question_response', 'remind'
      );
    END IF;
    RETURN;
  END IF;

  IF p_action = 'confirm_resolved' AND v_is_initiator AND (NOT FOUND OR v_action.status NOT IN ('pending', 'overdue') OR NOT v_is_assigned) THEN
    PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'confirm_resolved');
    PERFORM public.matter_close(p_matter_id, 'confirmed_resolution', 'Initiator confirmed resolution.', v_actor_kind, v_self, false);
    RETURN;
  END IF;

  IF NOT FOUND OR v_action.status NOT IN ('pending', 'overdue') THEN
    RAISE EXCEPTION 'No pending action on this Matter.';
  END IF;


  IF v_action.action_type = 'review_resolution'
     AND p_action IN (
       'confirm_resolved', 'confirm_partially_resolved', 'confirm_not_resolved',
       'need_clarification', 'cannot_verify'
     ) THEN
    PERFORM public.perform_resolution_review(v_action.id, p_action, p_message, NULL, NULL, NULL);
    RETURN;
  END IF;

  IF p_action = 'invite_party' THEN
    IF p_target_profile_id IS NULL THEN
      RAISE EXCEPTION 'Choose who to invite.';
    END IF;
    PERFORM public.matter_add_party(p_matter_id, 'invitee', coalesce(p_target_kind, 'person'), p_target_profile_id, p_target_unit_label);
    PERFORM public.matter_add_party(p_matter_id, 'participant', coalesce(p_target_kind, 'person'), p_target_profile_id, p_target_unit_label);
    PERFORM public.matter_log_event(
      p_matter_id, 'party_invited',
      'Invited ' || public.matter_profile_display_name(p_target_profile_id) || '.',
      v_actor_kind, v_self, false
    );
    PERFORM public.matter_notify_actor(coalesce(p_target_kind, 'person'), p_target_profile_id, 'matter_invited', 'You were invited', 'You were invited to a Matter.', p_matter_id);
    RETURN;
  END IF;

  CASE p_action
    WHEN 'respond' THEN
      PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'respond');
      PERFORM public.matter_log_event(
        p_matter_id, 'final_answer_provided',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'A final answer was provided.'),
        v_actor_kind, v_self, false
      );
      IF v_action.action_type = 'clarify' THEN
        PERFORM public.matter_assign_action(
          p_matter_id, 'respond', v_matter.responsible_kind, v_matter.responsible_profile_id,
          v_matter.responsible_unit_label, 'question_response', 'remind'
        );
      ELSE
        PERFORM public.matter_internal_propose_resolution(
          p_matter_id,
          CASE WHEN v_matter.matter_type = 'question' THEN 'answered' ELSE 'addressed' END,
          coalesce(nullif(trim(coalesce(p_message, '')), ''), 'A final answer was provided.'),
          coalesce(nullif(trim(coalesce(p_message, '')), ''), 'A final answer was provided.'),
          NULL,
          'Answered',
          v_actor_kind, v_self
        );
      END IF;
    WHEN 'request_clarification' THEN
      PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'request_clarification');
      PERFORM public.matter_log_event(
        p_matter_id, 'clarification_requested',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Clarification requested.'),
        v_actor_kind, v_self, false
      );
      PERFORM public.matter_assign_action(
        p_matter_id, 'clarify', v_matter.initiator_kind, v_matter.initiator_profile_id,
        v_matter.initiator_unit_label, 'clarification_response', 'remind'
      );
    WHEN 'forward' THEN
      IF p_target_profile_id IS NULL THEN
        RAISE EXCEPTION 'Choose who should receive this Matter.';
      END IF;
      PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'forward');
      PERFORM public.matter_add_party(p_matter_id, 'invitee', coalesce(p_target_kind, 'person'), p_target_profile_id, p_target_unit_label);
      PERFORM public.matter_log_event(
        p_matter_id, 'forwarded',
        'Forwarded to ' || public.matter_profile_display_name(p_target_profile_id) || '. The Matter remains active.',
        v_actor_kind, v_self, false,
        jsonb_build_object('targetProfileId', p_target_profile_id)
      );
      v_next_type := CASE
        WHEN v_action.action_type = 'responsibility_response' THEN 'responsibility_response'
        WHEN v_action.action_type = 'address' THEN 'address'
        ELSE 'respond'
      END;
      v_policy := CASE
        WHEN v_next_type = 'responsibility_response' THEN 'responsibility_response'
        WHEN v_next_type = 'address' THEN 'address_work'
        ELSE 'question_response'
      END;
      PERFORM public.matter_assign_action(
        p_matter_id, v_next_type, coalesce(p_target_kind, 'person'), p_target_profile_id,
        p_target_unit_label, v_policy, 'remind'
      );
    WHEN 'redirect' THEN
      IF p_target_profile_id IS NULL THEN
        RAISE EXCEPTION 'Choose who should receive this Matter.';
      END IF;
      PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'redirect');
      PERFORM public.matter_add_party(p_matter_id, 'responsible', coalesce(p_target_kind, 'person'), p_target_profile_id, p_target_unit_label);
      UPDATE public.matters
      SET responsible_kind = coalesce(p_target_kind, 'person'),
          responsible_profile_id = p_target_profile_id,
          responsible_unit_label = nullif(trim(coalesce(p_target_unit_label, '')), ''),
          updated_at = now()
      WHERE id = p_matter_id;
      PERFORM public.matter_log_event(
        p_matter_id, 'redirected',
        'Responsibility redirected to ' || public.matter_profile_display_name(p_target_profile_id) || '. The Matter remains active.',
        v_actor_kind, v_self, false,
        jsonb_build_object('targetProfileId', p_target_profile_id)
      );
      v_next_type := CASE
        WHEN v_action.action_type = 'responsibility_response' THEN 'responsibility_response'
        WHEN v_action.action_type = 'address' THEN 'address'
        ELSE 'respond'
      END;
      v_policy := CASE
        WHEN v_next_type = 'responsibility_response' THEN 'responsibility_response'
        WHEN v_next_type = 'address' THEN 'address_work'
        ELSE 'question_response'
      END;
      PERFORM public.matter_assign_action(
        p_matter_id, v_next_type, coalesce(p_target_kind, 'person'), p_target_profile_id,
        p_target_unit_label, v_policy, 'remind'
      );
    WHEN 'accept_responsibility', 'accept_jointly', 'partially_accept' THEN
      PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, p_action);
      UPDATE public.matters
      SET responsible_kind = v_actor_kind,
          responsible_profile_id = CASE WHEN v_actor_kind = 'organization' THEN v_matter.responsible_profile_id ELSE v_self END,
          updated_at = now()
      WHERE id = p_matter_id;
      PERFORM public.matter_add_party(
        p_matter_id, 'responsible', v_actor_kind,
        CASE WHEN v_actor_kind = 'organization' THEN v_matter.responsible_profile_id ELSE v_self END,
        NULL
      );
      PERFORM public.matter_log_event(
        p_matter_id, 'responsibility_accepted',
        CASE p_action
          WHEN 'partially_accept' THEN coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Responsibility partially accepted.')
          WHEN 'accept_jointly' THEN 'Responsibility accepted jointly.'
          ELSE 'Responsibility accepted.'
        END,
        v_actor_kind, v_self, false, jsonb_build_object('action', p_action)
      );
      PERFORM public.matter_assign_action(
        p_matter_id, 'address',
        v_actor_kind,
        CASE WHEN v_actor_kind = 'organization' THEN v_matter.responsible_profile_id ELSE v_self END,
        NULL, 'address_work', 'remind'
      );
    WHEN 'dispute_responsibility' THEN
      PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'dispute_responsibility');
      PERFORM public.matter_log_event(
        p_matter_id, 'responsibility_disputed',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Responsibility disputed. The Matter stays active.'),
        v_actor_kind, v_self, false
      );
      PERFORM public.matter_assign_action(
        p_matter_id, 'choose_next_party', v_matter.initiator_kind, v_matter.initiator_profile_id,
        v_matter.initiator_unit_label, 'responsibility_response', 'remind'
      );
    WHEN 'mark_no_action_required' THEN
      PERFORM public.matter_log_event(
        p_matter_id, 'no_action_required_marked',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Marked as no action required.'),
        v_actor_kind, v_self, false
      );
      PERFORM public.matter_internal_propose_resolution(
        p_matter_id, 'no_action_required',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Marked as no action required.'),
        NULL, NULL, 'No action required',
        v_actor_kind, v_self
      );
    WHEN 'mark_addressed' THEN
      PERFORM public.matter_log_event(
        p_matter_id, 'marked_addressed',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Marked as addressed with a final response.'),
        v_actor_kind, v_self, false
      );
      PERFORM public.matter_internal_propose_resolution(
        p_matter_id,
        CASE WHEN v_matter.matter_type = 'question' THEN 'answered' ELSE 'resolved' END,
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Marked as addressed with a final response.'),
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Marked as addressed with a final response.'),
        NULL, 'Resolved',
        v_actor_kind, v_self
      );
    WHEN 'confirm_resolved' THEN
      PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'confirm_resolved');
      PERFORM public.matter_close(p_matter_id, 'confirmed_resolution', 'Initiator confirmed resolution.', v_actor_kind, v_self, false);
    WHEN 'confirm_partially_resolved' THEN
      PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'confirm_partially_resolved');
      PERFORM public.matter_log_event(
        p_matter_id, 'resolution_partially_accepted',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Initiator marked this as partially resolved.'),
        v_actor_kind, v_self, false,
        jsonb_build_object('legacyConfirmResolution', true)
      );
      PERFORM public.matter_assign_action(
        p_matter_id, 'address', v_matter.responsible_kind, v_matter.responsible_profile_id,
        v_matter.responsible_unit_label, 'resolution_followup', 'remind', 'resolution', v_matter.latest_resolution_id
      );
    WHEN 'confirm_not_resolved' THEN
      PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'confirm_not_resolved');
      PERFORM public.matter_log_event(
        p_matter_id, 'resolution_rejected',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Initiator reported that this is not resolved.'),
        v_actor_kind, v_self, false
      );
      PERFORM public.matter_assign_action(
        p_matter_id, 'address', v_matter.responsible_kind, v_matter.responsible_profile_id,
        v_matter.responsible_unit_label, 'resolution_followup', 'remind', 'resolution', v_matter.latest_resolution_id
      );
    WHEN 'need_clarification' THEN
      PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'need_clarification');
      PERFORM public.matter_log_event(
        p_matter_id, 'clarification_requested',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Need more information — discussion continues.'),
        v_actor_kind, v_self, false
      );
      PERFORM public.matter_assign_action(
        p_matter_id, 'respond', v_matter.responsible_kind, v_matter.responsible_profile_id,
        v_matter.responsible_unit_label, 'clarification_response', 'remind'
      );
    WHEN 'cannot_verify' THEN
      PERFORM public.perform_resolution_review(v_action.id, 'cannot_verify', p_message, NULL, NULL, NULL);
    ELSE
      RAISE EXCEPTION 'That action is not available.';
  END CASE;
END;
$$;



CREATE OR REPLACE FUNCTION public.submit_matter_evaluation(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_matter_id uuid := (payload->>'matter_id')::uuid;
  v_resolution_id uuid := nullif(payload->>'resolution_id', '')::uuid;
  v_role text := trim(coalesce(payload->>'evaluator_role', ''));
  v_dimension text := trim(coalesce(payload->>'dimension', ''));
  v_rating text := lower(trim(coalesce(payload->>'rating', '')));
  v_visibility text := coalesce(nullif(trim(payload->>'visibility'), ''), 'participants');
  v_id uuid;
  v_matter public.matters%ROWTYPE;
BEGIN
  IF v_self IS NULL THEN RAISE EXCEPTION 'Sign in to submit an evaluation.'; END IF;
  SELECT * INTO v_matter FROM public.matters WHERE id = v_matter_id;
  IF NOT FOUND OR NOT public.can_access_matter(v_matter_id) THEN
    RAISE EXCEPTION 'You cannot evaluate this Matter.';
  END IF;
  IF v_role NOT IN ('initiator', 'responsible_lead', 'responsible_collaborator', 'assigned_evaluator', 'affected_participant') THEN
    RAISE EXCEPTION 'Invalid evaluator role.';
  END IF;
  IF v_role = 'initiator' AND NOT public.current_profile_represents_actor(v_matter.initiator_kind, v_matter.initiator_profile_id) THEN
    RAISE EXCEPTION 'Only the initiator can evaluate in this role.';
  END IF;
  IF v_role = 'responsible_lead' AND NOT public.matter_is_responsible_lead(v_matter_id) THEN
    RAISE EXCEPTION 'Only the Responsible Lead can evaluate in this role.';
  END IF;
  IF v_role IN ('responsible_collaborator', 'assigned_evaluator', 'affected_participant') THEN
    RAISE EXCEPTION 'This evaluator role is not yet assignable in Phase 3.';
  END IF;
  INSERT INTO public.matter_evaluations (
    matter_id, resolution_id, evaluator_kind, evaluator_profile_id, evaluator_role,
    dimension, rating, comment, visibility
  ) VALUES (
    v_matter_id, v_resolution_id, 'person', v_self, v_role,
    v_dimension, v_rating, nullif(trim(coalesce(payload->>'comment', '')), ''), v_visibility
  )
  ON CONFLICT (matter_id, resolution_id, evaluator_profile_id, evaluator_role, dimension)
  DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, visibility = EXCLUDED.visibility
  RETURNING id INTO v_id;
  PERFORM public.matter_log_event(
    v_matter_id, 'evaluation_submitted',
    'Evaluation recorded for ' || replace(v_dimension, '_', ' ') || ' (' || v_role || ').',
    'person', v_self, false,
    jsonb_build_object('evaluationId', v_id, 'dimension', v_dimension, 'rating', v_rating, 'evaluatorRole', v_role)
  );
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.matter_assign_action(uuid, text, text, uuid, text, text, text, text, uuid, text) FROM PUBLIC, authenticated;

-- Correct partial-resolution closure_kind on continue vs follow-up paths.
CREATE OR REPLACE FUNCTION public.perform_resolution_review(
  p_action_id uuid,
  p_action text,
  p_message text DEFAULT NULL,
  p_follow_up_choice text DEFAULT NULL,
  p_follow_up_title text DEFAULT NULL,
  p_follow_up_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_action public.matter_action_requirements%ROWTYPE;
  v_matter public.matters%ROWTYPE;
  v_resolution public.matter_resolutions%ROWTYPE;
  v_actor_kind text := 'person';
  v_new_matter_id uuid;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to review this Resolution.';
  END IF;
  SELECT * INTO v_action FROM public.matter_action_requirements WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND OR v_action.action_type NOT IN ('review_resolution', 'confirm_resolution')
     OR v_action.status NOT IN ('pending', 'overdue') THEN
    RAISE EXCEPTION 'No Resolution review is pending for you.';
  END IF;
  IF NOT public.current_profile_represents_actor(v_action.assigned_kind, v_action.assigned_profile_id) THEN
    RAISE EXCEPTION 'You are not assigned to review this Resolution.';
  END IF;
  SELECT * INTO v_matter FROM public.matters WHERE id = v_action.matter_id FOR UPDATE;
  IF v_matter.initiator_profile_id = v_self AND v_matter.initiator_kind = 'person' THEN
    v_actor_kind := 'person';
  ELSIF public.current_profile_represents_actor(v_matter.initiator_kind, v_matter.initiator_profile_id) THEN
    v_actor_kind := v_matter.initiator_kind;
  ELSE
    RAISE EXCEPTION 'Only the initiator can review this Resolution.';
  END IF;
  SELECT * INTO v_resolution FROM public.matter_resolutions
  WHERE id = coalesce(v_action.context_id, v_matter.latest_resolution_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resolution record not found.';
  END IF;
  PERFORM public.matter_complete_action(p_action_id, v_actor_kind, v_self, p_action);

  CASE p_action
    WHEN 'confirm_resolved' THEN
      UPDATE public.matter_resolutions
      SET resolution_status = 'confirmed',
          initiator_position = coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Resolved / satisfied'),
          closed_at = now(),
          closure_kind = 'confirmed_resolution',
          updated_at = now()
      WHERE id = v_resolution.id;
      PERFORM public.matter_log_event(
        v_matter.id, 'resolution_confirmed',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Initiator confirmed the proposed Resolution.'),
        v_actor_kind, v_self, false,
        jsonb_build_object('resolutionId', v_resolution.id, 'attemptNumber', v_resolution.attempt_number)
      );
      PERFORM public.matter_close(
        v_matter.id, 'confirmed_resolution', 'Initiator confirmed resolution.',
        v_actor_kind, v_self, false
      );
    WHEN 'confirm_partially_resolved' THEN
      UPDATE public.matter_resolutions
      SET resolution_status = 'partially_accepted',
          initiator_position = coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Partially resolved'),
          closure_kind = CASE
            WHEN coalesce(p_follow_up_choice, 'continue') = 'follow_up' THEN 'partial_resolution_accepted'
            ELSE NULL
          END,
          updated_at = now()
      WHERE id = v_resolution.id;
      PERFORM public.matter_log_event(
        v_matter.id, 'resolution_partially_accepted',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Initiator marked this as partially resolved.'),
        v_actor_kind, v_self, false,
        jsonb_build_object('resolutionId', v_resolution.id, 'followUpChoice', coalesce(p_follow_up_choice, 'continue'))
      );
      IF coalesce(p_follow_up_choice, 'continue') = 'follow_up' THEN
        IF nullif(trim(coalesce(p_follow_up_title, '')), '') IS NULL
           OR nullif(trim(coalesce(p_follow_up_description, '')), '') IS NULL THEN
          RAISE EXCEPTION 'Provide a title and description for the follow-up Matter.';
        END IF;
        v_new_matter_id := public.create_matter_follow_up(
          v_matter.id, v_resolution.id, p_follow_up_title, p_follow_up_description
        );
        PERFORM public.matter_close(
          v_matter.id, 'partially_resolved',
          coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Partially resolved — follow-up Matter created.'),
          v_actor_kind, v_self, false
        );
      ELSE
        PERFORM public.matter_assign_action(
          v_matter.id, 'address', v_matter.responsible_kind, v_matter.responsible_profile_id,
          v_matter.responsible_unit_label, 'resolution_followup', 'remind', 'resolution', v_resolution.id
        );
      END IF;
    WHEN 'confirm_not_resolved' THEN
      UPDATE public.matter_resolutions
      SET resolution_status = 'rejected',
          initiator_position = coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Not resolved'),
          updated_at = now()
      WHERE id = v_resolution.id;
      PERFORM public.matter_log_event(
        v_matter.id, 'resolution_rejected',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Initiator reported that this is not resolved.'),
        v_actor_kind, v_self, false,
        jsonb_build_object('resolutionId', v_resolution.id, 'attemptNumber', v_resolution.attempt_number)
      );
      PERFORM public.matter_assign_action(
        v_matter.id, 'address', v_matter.responsible_kind, v_matter.responsible_profile_id,
        v_matter.responsible_unit_label, 'resolution_followup', 'remind', 'resolution', v_resolution.id
      );
    WHEN 'need_clarification' THEN
      UPDATE public.matter_resolutions
      SET initiator_position = coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Need clarification'),
          updated_at = now()
      WHERE id = v_resolution.id;
      PERFORM public.matter_log_event(
        v_matter.id, 'resolution_clarification_requested',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Initiator needs clarification on the proposed Resolution.'),
        v_actor_kind, v_self, false, jsonb_build_object('resolutionId', v_resolution.id)
      );
      PERFORM public.matter_assign_action(
        v_matter.id, 'clarify', v_matter.responsible_kind, v_matter.responsible_profile_id,
        v_matter.responsible_unit_label, 'clarification_response', 'remind', 'resolution', v_resolution.id
      );
    WHEN 'cannot_verify' THEN
      UPDATE public.matter_resolutions
      SET initiator_position = coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Cannot verify'),
          updated_at = now()
      WHERE id = v_resolution.id;
      PERFORM public.matter_log_event(
        v_matter.id, 'resolution_cannot_verify',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Initiator cannot verify the proposed Resolution.'),
        v_actor_kind, v_self, false, jsonb_build_object('resolutionId', v_resolution.id)
      );
      PERFORM public.matter_assign_action(
        v_matter.id, 'address', v_matter.responsible_kind, v_matter.responsible_profile_id,
        v_matter.responsible_unit_label, 'resolution_followup', 'remind', 'resolution', v_resolution.id
      );
    ELSE
      RAISE EXCEPTION 'That review action is not available.';
  END CASE;
END;
$$;
