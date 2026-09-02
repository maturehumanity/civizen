-- Phase 4A stabilization: party/task assignment upserts after ai_agent actor columns.

CREATE OR REPLACE FUNCTION public.matter_add_party(
  p_matter_id uuid,
  p_role text,
  p_kind text,
  p_profile_id uuid,
  p_unit_label text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.matter_parties mp
    WHERE mp.matter_id = p_matter_id
      AND mp.role = p_role
      AND mp.actor_kind = p_kind
      AND mp.actor_profile_id IS NOT DISTINCT FROM p_profile_id
      AND mp.actor_agent_id IS NULL
  ) THEN
    INSERT INTO public.matter_parties (
      matter_id, role, actor_kind, actor_profile_id, actor_unit_label
    ) VALUES (
      p_matter_id, p_role, p_kind, p_profile_id, nullif(trim(coalesce(p_unit_label, '')), '')
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_upsert_task_assignment(
  p_task_id uuid,
  p_role text,
  p_kind text,
  p_profile_id uuid,
  p_agent_id uuid,
  p_assigned_by_kind text,
  p_assigned_by_profile_id uuid,
  p_reset_pending boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.task_assignments ta
    WHERE ta.task_id = p_task_id
      AND ta.role = p_role
      AND ta.actor_kind = p_kind
      AND ta.actor_profile_id IS NOT DISTINCT FROM p_profile_id
      AND ta.actor_agent_id IS NOT DISTINCT FROM p_agent_id
  ) THEN
    IF p_reset_pending THEN
      UPDATE public.task_assignments
      SET acceptance_status = 'pending',
          declined_at = NULL,
          accepted_at = NULL,
          assigned_by_kind = p_assigned_by_kind,
          assigned_by_profile_id = p_assigned_by_profile_id
      WHERE task_id = p_task_id
        AND role = p_role
        AND actor_kind = p_kind
        AND actor_profile_id IS NOT DISTINCT FROM p_profile_id
        AND actor_agent_id IS NOT DISTINCT FROM p_agent_id;
    END IF;
  ELSE
    INSERT INTO public.task_assignments (
      task_id, role, actor_kind, actor_profile_id, actor_agent_id,
      assigned_by_kind, assigned_by_profile_id, acceptance_status
    ) VALUES (
      p_task_id, p_role, p_kind, p_profile_id, p_agent_id,
      p_assigned_by_kind, p_assigned_by_profile_id,
      CASE WHEN p_reset_pending THEN 'pending' ELSE 'accepted' END
    );
  END IF;
END;
$$;

-- Reassign path referenced the dropped matter_parties / task_assignments unique constraints.
CREATE OR REPLACE FUNCTION public.perform_collaboration_action(
  p_action_id uuid,
  p_action text,
  p_message text DEFAULT NULL,
  p_target_kind text DEFAULT NULL,
  p_target_profile_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_action public.matter_action_requirements%ROWTYPE;
  v_task public.collaboration_tasks%ROWTYPE;
  v_decision public.matter_decisions%ROWTYPE;
  v_reviewer public.task_assignments%ROWTYPE;
  v_lead public.matter_responsibilities%ROWTYPE;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to act on this work.';
  END IF;
  SELECT * INTO v_action FROM public.matter_action_requirements WHERE id = p_action_id;
  IF NOT FOUND OR v_action.status NOT IN ('pending', 'overdue') THEN
    RAISE EXCEPTION 'No pending action.';
  END IF;
  IF NOT public.can_access_matter(v_action.matter_id) THEN
    RAISE EXCEPTION 'You cannot act on this Matter.';
  END IF;
  IF NOT public.current_profile_represents_actor(v_action.assigned_kind, v_action.assigned_profile_id) THEN
    RAISE EXCEPTION 'That action is not assigned to you.';
  END IF;
  IF (SELECT lifecycle_status FROM public.matters WHERE id = v_action.matter_id) = 'closed' THEN
    RAISE EXCEPTION 'This Matter is closed.';
  END IF;

  IF v_action.context_kind = 'task' THEN
    SELECT * INTO v_task FROM public.collaboration_tasks WHERE id = v_action.context_id;
  END IF;
  IF v_action.context_kind = 'decision' THEN
    SELECT * INTO v_decision FROM public.matter_decisions WHERE id = v_action.context_id;
  END IF;

  IF v_action.action_type = 'shared_responsibility_response'
     OR (v_action.context_kind = 'responsibility' AND v_action.action_type = 'clarify') THEN
    PERFORM public.matter_respond_shared_responsibility(
      p_action_id, p_action, p_message, p_target_kind, p_target_profile_id
    );
    RETURN;
  END IF;

  IF v_action.action_type = 'accept_task' THEN
    IF p_action = 'accept' THEN
      UPDATE public.task_assignments
      SET acceptance_status = 'accepted', accepted_at = now()
      WHERE task_id = v_task.id AND actor_profile_id = v_action.assigned_profile_id AND role = 'lead';
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'accept');
      UPDATE public.collaboration_tasks
      SET status = 'in_progress', start_at = coalesce(start_at, now()), waiting_condition = NULL, updated_at = now()
      WHERE id = v_task.id;
      PERFORM public.matter_log_event(
        v_action.matter_id, 'task_accepted',
        'Task "' || v_task.title || '" was accepted.',
        v_action.assigned_kind, v_self, false, jsonb_build_object('taskId', v_task.id)
      );
      PERFORM public.matter_assign_action(
        v_action.matter_id, 'complete_task', v_action.assigned_kind, v_action.assigned_profile_id,
        v_action.assigned_unit_label, 'task_execution', 'remind', 'task', v_task.id
      );
    ELSIF p_action = 'decline' THEN
      UPDATE public.task_assignments
      SET acceptance_status = 'declined', declined_at = now(), decline_reason = nullif(trim(coalesce(p_message, '')), '')
      WHERE task_id = v_task.id AND actor_profile_id = v_action.assigned_profile_id AND role = 'lead';
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'decline');
      UPDATE public.collaboration_tasks
      SET status = 'declined', waiting_condition = coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Assignment declined.'), updated_at = now()
      WHERE id = v_task.id;
      PERFORM public.matter_log_event(
        v_action.matter_id, 'task_declined',
        'Task "' || v_task.title || '" was declined'
          || CASE WHEN nullif(trim(coalesce(p_message, '')), '') IS NULL THEN '.' ELSE ': ' || trim(p_message) || '.' END,
        v_action.assigned_kind, v_self, false,
        jsonb_build_object(
          'taskId', v_task.id,
          'assignmentRole', 'lead',
          'reason', nullif(trim(coalesce(p_message, '')), '')
        )
      );
      SELECT * INTO v_lead FROM public.matter_responsibilities
      WHERE matter_id = v_action.matter_id AND kind = 'lead' AND status = 'accepted'
      ORDER BY assigned_at LIMIT 1;
      IF FOUND THEN
        PERFORM public.matter_assign_action(
          v_action.matter_id, 'reconsider_task', v_lead.actor_kind, v_lead.actor_profile_id,
          v_lead.actor_unit_label, 'task_acceptance', 'remind', 'task', v_task.id
        );
      END IF;
    ELSIF p_action = 'request_clarification' THEN
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'request_clarification');
      UPDATE public.collaboration_tasks
      SET status = 'waiting', waiting_condition = 'Clarification requested before acceptance.', updated_at = now()
      WHERE id = v_task.id;
      PERFORM public.matter_log_event(
        v_action.matter_id, 'task_clarification_requested',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Clarification requested before accepting the Task.'),
        v_action.assigned_kind, v_self, false, jsonb_build_object('taskId', v_task.id)
      );
      SELECT * INTO v_lead FROM public.matter_responsibilities
      WHERE matter_id = v_action.matter_id AND kind = 'lead' AND status = 'accepted'
      ORDER BY assigned_at LIMIT 1;
      IF FOUND THEN
        PERFORM public.matter_assign_action(
          v_action.matter_id, 'reconsider_task', v_lead.actor_kind, v_lead.actor_profile_id,
          v_lead.actor_unit_label, 'clarification_response', 'remind', 'task', v_task.id
        );
      END IF;
    ELSIF p_action = 'suggest_reassignment' THEN
      UPDATE public.task_assignments
      SET acceptance_status = 'suggested_reassignment',
          suggestion_reason = nullif(trim(coalesce(p_message, '')), '')
      WHERE task_id = v_task.id AND actor_profile_id = v_action.assigned_profile_id AND role = 'lead';
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'suggest_reassignment');
      PERFORM public.matter_log_event(
        v_action.matter_id, 'task_reassignment_suggested',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Reassignment suggested.'),
        v_action.assigned_kind, v_self, false,
        jsonb_build_object(
          'taskId', v_task.id,
          'assignmentRole', 'lead',
          'reason', nullif(trim(coalesce(p_message, '')), '')
        )
      );
      SELECT * INTO v_lead FROM public.matter_responsibilities
      WHERE matter_id = v_action.matter_id AND kind = 'lead' AND status = 'accepted'
      ORDER BY assigned_at LIMIT 1;
      IF FOUND THEN
        PERFORM public.matter_assign_action(
          v_action.matter_id, 'reconsider_task', v_lead.actor_kind, v_lead.actor_profile_id,
          v_lead.actor_unit_label, 'task_acceptance', 'remind', 'task', v_task.id
        );
      END IF;
    ELSE
      RAISE EXCEPTION 'That action is not available.';
    END IF;
    RETURN;
  END IF;

  IF v_action.action_type = 'complete_task' THEN
    IF p_action IN ('submit', 'complete') THEN
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, p_action);
      IF v_task.review_required THEN
        UPDATE public.collaboration_tasks
        SET status = 'under_review', submitted_at = now(), waiting_condition = NULL, updated_at = now()
        WHERE id = v_task.id;
        PERFORM public.matter_log_event(
          v_action.matter_id, 'task_submitted',
          'Work submitted for review: ' || v_task.title || '.',
          v_action.assigned_kind, v_self, false, jsonb_build_object('taskId', v_task.id)
        );
        SELECT * INTO v_reviewer
        FROM public.task_assignments
        WHERE task_id = v_task.id AND role = 'reviewer'
        ORDER BY assigned_at LIMIT 1;
        IF NOT FOUND THEN
          SELECT * INTO v_lead FROM public.matter_responsibilities
          WHERE matter_id = v_action.matter_id AND kind = 'lead' AND status = 'accepted'
          ORDER BY assigned_at LIMIT 1;
          PERFORM public.matter_assign_action(
            v_action.matter_id, 'review_task', v_lead.actor_kind, v_lead.actor_profile_id,
            v_lead.actor_unit_label, 'task_review', 'remind', 'task', v_task.id
          );
        ELSE
          PERFORM public.matter_assign_action(
            v_action.matter_id, 'review_task', v_reviewer.actor_kind, v_reviewer.actor_profile_id,
            v_reviewer.actor_unit_label, 'task_review', 'remind', 'task', v_task.id
          );
        END IF;
      ELSE
        UPDATE public.collaboration_tasks
        SET status = 'completed', submitted_at = now(), completed_at = now(), waiting_condition = NULL, updated_at = now()
        WHERE id = v_task.id;
        PERFORM public.matter_log_event(
          v_action.matter_id, 'task_completed',
          'Task completed: ' || v_task.title || '. This does not resolve the Matter.',
          v_action.assigned_kind, v_self, false, jsonb_build_object('taskId', v_task.id)
        );
        PERFORM public.matter_release_dependents(v_task.id);
      END IF;
    ELSIF p_action = 'request_clarification' THEN
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'request_clarification');
      UPDATE public.collaboration_tasks
      SET status = 'waiting', waiting_condition = 'Clarification requested during execution.', updated_at = now()
      WHERE id = v_task.id;
      SELECT * INTO v_lead FROM public.matter_responsibilities
      WHERE matter_id = v_action.matter_id AND kind = 'lead' AND status = 'accepted'
      ORDER BY assigned_at LIMIT 1;
      IF FOUND THEN
        PERFORM public.matter_assign_action(
          v_action.matter_id, 'reconsider_task', v_lead.actor_kind, v_lead.actor_profile_id,
          v_lead.actor_unit_label, 'clarification_response', 'remind', 'task', v_task.id
        );
      END IF;
    ELSE
      RAISE EXCEPTION 'That action is not available.';
    END IF;
    RETURN;
  END IF;

  IF v_action.action_type = 'review_task' THEN
    IF p_action = 'accept_completion' THEN
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'accept_completion');
      UPDATE public.collaboration_tasks
      SET status = 'completed', completed_at = now(), waiting_condition = NULL, updated_at = now()
      WHERE id = v_task.id;
      PERFORM public.matter_log_event(
        v_action.matter_id, 'task_completed',
        'Reviewed and completed: ' || v_task.title || '. This does not resolve the Matter.',
        v_action.assigned_kind, v_self, false, jsonb_build_object('taskId', v_task.id)
      );
      PERFORM public.matter_release_dependents(v_task.id);
    ELSIF p_action = 'request_changes' THEN
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'request_changes');
      UPDATE public.collaboration_tasks
      SET status = 'in_progress', waiting_condition = NULL, updated_at = now()
      WHERE id = v_task.id;
      PERFORM public.matter_log_event(
        v_action.matter_id, 'changes_requested',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Changes requested on submitted work.'),
        v_action.assigned_kind, v_self, false, jsonb_build_object('taskId', v_task.id)
      );
      PERFORM public.matter_notify_actor(
        v_task.lead_kind, v_task.lead_profile_id,
        'task_changes_requested', 'Changes requested',
        'A reviewer asked for changes on a Task.', v_action.matter_id
      );
      PERFORM public.matter_assign_action(
        v_action.matter_id, 'complete_task', v_task.lead_kind, v_task.lead_profile_id,
        v_task.lead_unit_label, 'task_execution', 'remind', 'task', v_task.id
      );
    ELSIF p_action = 'request_clarification' THEN
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'request_clarification');
      UPDATE public.collaboration_tasks
      SET status = 'waiting', waiting_condition = 'Reviewer requested clarification.', updated_at = now()
      WHERE id = v_task.id;
      PERFORM public.matter_assign_action(
        v_action.matter_id, 'complete_task', v_task.lead_kind, v_task.lead_profile_id,
        v_task.lead_unit_label, 'clarification_response', 'remind', 'task', v_task.id
      );
    ELSE
      RAISE EXCEPTION 'That action is not available.';
    END IF;
    RETURN;
  END IF;

  IF v_action.action_type = 'reconsider_task' THEN
    IF p_action = 'reassign' THEN
      IF p_target_profile_id IS NULL THEN
        RAISE EXCEPTION 'Choose who should receive this Task.';
      END IF;
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'reassign');
      UPDATE public.task_assignments
      SET acceptance_status = 'declined', declined_at = coalesce(declined_at, now())
      WHERE task_id = v_task.id
        AND role = 'lead'
        AND actor_profile_id IS DISTINCT FROM p_target_profile_id
        AND acceptance_status IN ('pending', 'suggested_reassignment');
      PERFORM public.matter_upsert_task_assignment(
        v_task.id, 'lead', coalesce(p_target_kind, 'person'), p_target_profile_id, NULL,
        'person', v_self, true
      );
      UPDATE public.collaboration_tasks
      SET lead_kind = coalesce(p_target_kind, 'person'),
          lead_profile_id = p_target_profile_id,
          status = 'assigned',
          waiting_condition = NULL,
          updated_at = now()
      WHERE id = v_task.id;
      PERFORM public.matter_add_party(v_action.matter_id, 'contributor', coalesce(p_target_kind, 'person'), p_target_profile_id, NULL);
      PERFORM public.matter_log_event(
        v_action.matter_id, 'task_assigned',
        'Task reassigned to ' || public.matter_profile_display_name(p_target_profile_id) || '.',
        'person', v_self, false, jsonb_build_object('taskId', v_task.id)
      );
      PERFORM public.matter_activate_task(v_task.id);
    ELSIF p_action IN ('respond', 'clarify_provided') THEN
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'respond');
      PERFORM public.matter_activate_task(v_task.id);
    ELSIF p_action IN ('cancel_task', 'waive') THEN
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, p_action);
      UPDATE public.collaboration_tasks
      SET status = 'cancelled', cancelled_at = now(),
          waiting_condition = CASE WHEN p_action = 'waive' THEN coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Waived by the Responsible Lead.') ELSE waiting_condition END,
          updated_at = now()
      WHERE id = v_task.id;
      PERFORM public.matter_log_event(
        v_action.matter_id, CASE WHEN p_action = 'waive' THEN 'task_waived' ELSE 'task_cancelled' END,
        CASE WHEN p_action = 'waive' THEN 'Task waived: ' ELSE 'Task cancelled: ' END || v_task.title || '.',
        'person', v_self, false,
        jsonb_build_object('taskId', v_task.id, 'reason', nullif(trim(coalesce(p_message, '')), ''), 'waived', p_action = 'waive')
      );
    ELSE
      RAISE EXCEPTION 'That action is not available.';
    END IF;
    RETURN;
  END IF;

  IF v_action.action_type = 'confirm_decision' THEN
    IF p_action = 'accept' THEN
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'accept');
      UPDATE public.matter_decisions
      SET status = 'accepted', decided_by_kind = v_action.assigned_kind, decided_by_profile_id = v_self, decided_at = now()
      WHERE id = v_decision.id;
      PERFORM public.matter_log_event(
        v_action.matter_id, 'decision_accepted',
        'Decision accepted: ' || v_decision.title || '.',
        v_action.assigned_kind, v_self, false, jsonb_build_object('decisionId', v_decision.id)
      );
    ELSIF p_action = 'reject' THEN
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'reject');
      UPDATE public.matter_decisions
      SET status = 'rejected', decided_by_kind = v_action.assigned_kind, decided_by_profile_id = v_self, decided_at = now()
      WHERE id = v_decision.id;
      PERFORM public.matter_log_event(
        v_action.matter_id, 'decision_rejected',
        'Decision rejected: ' || v_decision.title || '.',
        v_action.assigned_kind, v_self, false, jsonb_build_object('decisionId', v_decision.id)
      );
    ELSE
      RAISE EXCEPTION 'That action is not available.';
    END IF;
    RETURN;
  END IF;

  RAISE EXCEPTION 'That action is not available.';
END;
$$;

GRANT EXECUTE ON FUNCTION public.matter_upsert_task_assignment(uuid, text, text, uuid, uuid, text, uuid, boolean) TO authenticated;

-- Phase 4A added an extended matter_log_event; drop legacy overloads so 6-arg calls are unambiguous.
DROP FUNCTION IF EXISTS public.matter_log_event(uuid, text, text, text, uuid, boolean);
DROP FUNCTION IF EXISTS public.matter_log_event(uuid, text, text, text, uuid, boolean, jsonb);

CREATE OR REPLACE FUNCTION public.matter_log_event(
  p_matter_id uuid,
  p_event_type text,
  p_summary text,
  p_actor_kind text,
  p_actor_profile_id uuid,
  p_is_system boolean,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_actor_agent_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.matter_events (
    matter_id, event_type, actor_kind, actor_profile_id, actor_agent_id,
    is_system, summary, payload
  ) VALUES (
    p_matter_id,
    p_event_type,
    CASE WHEN p_actor_agent_id IS NOT NULL THEN 'ai_agent' ELSE p_actor_kind END,
    p_actor_profile_id,
    p_actor_agent_id,
    coalesce(p_is_system, false),
    p_summary,
    coalesce(p_payload, '{}'::jsonb)
  );
END;
$$;

DROP FUNCTION IF EXISTS public.matter_complete_action(uuid, text, uuid, text);

CREATE OR REPLACE FUNCTION public.matter_complete_action(
  p_action_id uuid,
  p_actor_kind text,
  p_actor_profile_id uuid,
  p_completion_action text,
  p_actor_agent_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.matter_action_requirements%ROWTYPE;
  v_kind text := coalesce(nullif(p_actor_kind, ''), 'person');
BEGIN
  UPDATE public.matter_action_requirements
  SET status = 'completed',
      completed_at = now(),
      completed_by_kind = v_kind,
      completed_by_profile_id = CASE WHEN v_kind = 'ai_agent' THEN NULL ELSE p_actor_profile_id END,
      completed_by_agent_id = CASE WHEN v_kind = 'ai_agent' THEN p_actor_agent_id ELSE NULL END,
      completion_action = p_completion_action
  WHERE id = p_action_id
    AND status IN ('pending', 'overdue')
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  PERFORM public.matter_log_event(
    v_row.matter_id, 'action_completed',
    'Formal action completed: ' || replace(p_completion_action, '_', ' ') || '.',
    v_kind,
    CASE WHEN v_kind = 'ai_agent' THEN NULL ELSE p_actor_profile_id END,
    v_kind = 'system',
    jsonb_build_object(
      'completionAction', p_completion_action,
      'actionId', p_action_id,
      'agentId', p_actor_agent_id
    ),
    p_actor_agent_id
  );
  PERFORM public.matter_sync_headline(v_row.matter_id);
END;
$$;
