-- Phase 2 stabilization: work-completion gates, shared-responsibility acceptance,
-- structured Task decline/reassignment reasons. Completing a Task still never resolves the Matter.

ALTER TABLE public.matter_action_requirements
  DROP CONSTRAINT IF EXISTS matter_action_requirements_action_type_check;
ALTER TABLE public.matter_action_requirements
  ADD CONSTRAINT matter_action_requirements_action_type_check
  CHECK (action_type IN (
    'respond', 'responsibility_response', 'clarify', 'address',
    'confirm_resolution', 'choose_next_party',
    'accept_task', 'complete_task', 'review_task', 'reconsider_task', 'confirm_decision',
    'shared_responsibility_response'
  ));

ALTER TABLE public.matter_action_requirements
  DROP CONSTRAINT IF EXISTS matter_action_requirements_context_kind_check;
ALTER TABLE public.matter_action_requirements
  ADD CONSTRAINT matter_action_requirements_context_kind_check
  CHECK (context_kind IN ('matter', 'task', 'decision', 'responsibility'));

ALTER TABLE public.matters
  ADD COLUMN IF NOT EXISTS collaborative_work_completion_kind text
    CHECK (collaborative_work_completion_kind IS NULL OR collaborative_work_completion_kind IN ('normal', 'with_outstanding_work')),
  ADD COLUMN IF NOT EXISTS collaborative_work_completion_reason text;

ALTER TABLE public.matter_responsibilities
  ADD COLUMN IF NOT EXISTS declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_action text,
  ADD COLUMN IF NOT EXISTS response_reason text,
  ADD COLUMN IF NOT EXISTS suggested_actor_kind text
    CHECK (suggested_actor_kind IS NULL OR suggested_actor_kind IN ('person', 'organization', 'group')),
  ADD COLUMN IF NOT EXISTS suggested_actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.task_assignments
  ADD COLUMN IF NOT EXISTS suggestion_reason text;

CREATE OR REPLACE FUNCTION public.matter_task_is_terminal_for_work(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_status IN ('completed', 'cancelled');
$$;

CREATE OR REPLACE FUNCTION public.matter_outstanding_work_tasks(p_matter_id uuid)
RETURNS TABLE (id uuid, title text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.title, t.status
  FROM public.collaboration_tasks t
  WHERE t.matter_id = p_matter_id
    AND NOT public.matter_task_is_terminal_for_work(t.status)
  ORDER BY t.created_at;
$$;

CREATE OR REPLACE FUNCTION public.matter_request_shared_responsibility(
  p_matter_id uuid,
  p_kind text,
  p_profile_id uuid,
  p_unit_label text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_resp_id uuid;
BEGIN
  PERFORM public.matter_add_party(p_matter_id, 'participant', coalesce(p_kind, 'person'), p_profile_id, p_unit_label);
  PERFORM public.matter_add_party(p_matter_id, 'invitee', coalesce(p_kind, 'person'), p_profile_id, p_unit_label);
  INSERT INTO public.matter_responsibilities (
    matter_id, kind, actor_kind, actor_profile_id, actor_unit_label, status,
    assigned_by_kind, assigned_by_profile_id, accepted_at
  ) VALUES (
    p_matter_id, 'collaborator', coalesce(p_kind, 'person'), p_profile_id,
    nullif(trim(coalesce(p_unit_label, '')), ''), 'proposed', 'person', v_self, NULL
  )
  ON CONFLICT (matter_id, kind, actor_kind, actor_profile_id) DO UPDATE
    SET status = 'proposed',
        ended_at = NULL,
        declined_at = NULL,
        accepted_at = NULL,
        assigned_by_kind = 'person',
        assigned_by_profile_id = v_self,
        assigned_at = now(),
        response_action = NULL,
        response_reason = NULL
  RETURNING id INTO v_resp_id;
  PERFORM public.matter_log_event(
    p_matter_id, 'shared_responsibility_requested',
    'Shared responsibility requested from ' || public.matter_profile_display_name(p_profile_id) || '.',
    'person', v_self, false,
    jsonb_build_object('responsibilityId', v_resp_id, 'profileId', p_profile_id)
  );
  PERFORM public.matter_assign_action(
    p_matter_id, 'shared_responsibility_response', coalesce(p_kind, 'person'), p_profile_id,
    p_unit_label, 'responsibility_response', 'remind', 'responsibility', v_resp_id
  );
  PERFORM public.matter_notify_actor(
    coalesce(p_kind, 'person'), p_profile_id,
    'matter_responsibility_requested',
    'Shared responsibility requested',
    'You were asked to share responsibility for a Matter. Accepting is a formal action.',
    p_matter_id
  );
  RETURN v_resp_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_matter_participant(
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
DECLARE
  v_self uuid := public.current_profile_id();
  v_role text := coalesce(p_role, 'contributor');
BEGIN
  IF v_self IS NULL OR NOT public.can_access_matter(p_matter_id) THEN
    RAISE EXCEPTION 'You cannot invite people to this Matter.';
  END IF;
  IF NOT public.matter_can_manage_work(p_matter_id) THEN
    RAISE EXCEPTION 'Only a Responsible Lead or Collaborator can invite participants.';
  END IF;
  IF v_role NOT IN (
    'responsible_collaborator', 'contributor', 'specialist', 'contractor', 'observer', 'evaluator', 'invitee'
  ) THEN
    RAISE EXCEPTION 'That participation role is not available.';
  END IF;
  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'Choose who to invite.';
  END IF;

  IF v_role = 'responsible_collaborator' THEN
    PERFORM public.matter_request_shared_responsibility(p_matter_id, p_kind, p_profile_id, p_unit_label);
  ELSE
    PERFORM public.matter_add_party(p_matter_id, 'participant', coalesce(p_kind, 'person'), p_profile_id, p_unit_label);
    PERFORM public.matter_add_party(p_matter_id, v_role, coalesce(p_kind, 'person'), p_profile_id, p_unit_label);
    PERFORM public.matter_log_event(
      p_matter_id, 'collaborator_added',
      'Invited ' || public.matter_profile_display_name(p_profile_id) || ' as ' || replace(v_role, '_', ' ') || '.',
      'person', v_self, false, jsonb_build_object('role', v_role, 'profileId', p_profile_id)
    );
    PERFORM public.matter_notify_actor(
      coalesce(p_kind, 'person'), p_profile_id,
      'matter_collaborate_invite',
      'You were invited to collaborate',
      'You were invited to participate in collaborative work on a Matter.',
      p_matter_id
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_respond_shared_responsibility(
  p_action_id uuid,
  p_action text,
  p_message text,
  p_target_kind text,
  p_target_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_action public.matter_action_requirements%ROWTYPE;
  v_resp public.matter_responsibilities%ROWTYPE;
  v_reason text := nullif(trim(coalesce(p_message, '')), '');
BEGIN
  SELECT * INTO v_action FROM public.matter_action_requirements WHERE id = p_action_id;
  IF v_action.context_kind = 'responsibility' AND v_action.action_type = 'clarify' THEN
    IF p_action NOT IN ('respond', 'clarify_provided') THEN
      RAISE EXCEPTION 'That action is not available.';
    END IF;
    PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'respond');
    SELECT * INTO v_resp FROM public.matter_responsibilities WHERE id = v_action.context_id;
    IF FOUND AND v_resp.status = 'proposed' THEN
      PERFORM public.matter_assign_action(
        v_action.matter_id, 'shared_responsibility_response',
        v_resp.actor_kind, v_resp.actor_profile_id, v_resp.actor_unit_label,
        'responsibility_response', 'remind', 'responsibility', v_resp.id
      );
      PERFORM public.matter_log_event(
        v_action.matter_id, 'shared_responsibility_clarified',
        coalesce(v_reason, 'Clarification provided on the shared-responsibility request.'),
        v_action.assigned_kind, v_self, false,
        jsonb_build_object('responsibilityId', v_resp.id, 'reason', v_reason)
      );
    END IF;
    RETURN;
  END IF;

  SELECT * INTO v_resp FROM public.matter_responsibilities WHERE id = v_action.context_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shared responsibility request not found.';
  END IF;

  IF p_action IN ('accept', 'accept_responsibility', 'accept_partially', 'partially_accept') THEN
    UPDATE public.matter_responsibilities
    SET status = 'accepted',
        accepted_at = now(),
        declined_at = NULL,
        response_action = CASE WHEN p_action IN ('accept_partially', 'partially_accept') THEN 'accept_partially' ELSE 'accept' END,
        response_reason = v_reason
    WHERE id = v_resp.id;
    PERFORM public.matter_add_party(v_action.matter_id, 'responsible_collaborator', v_resp.actor_kind, v_resp.actor_profile_id, v_resp.actor_unit_label);
    PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, p_action);
    PERFORM public.matter_log_event(
      v_action.matter_id, 'shared_responsibility_accepted',
      public.matter_profile_display_name(v_resp.actor_profile_id) || ' accepted shared responsibility.',
      v_action.assigned_kind, v_self, false,
      jsonb_build_object('responsibilityId', v_resp.id, 'response', p_action, 'reason', v_reason)
    );
  ELSIF p_action IN ('decline', 'dispute', 'dispute_responsibility') THEN
    UPDATE public.matter_responsibilities
    SET status = 'declined',
        declined_at = now(),
        response_action = 'decline',
        response_reason = v_reason
    WHERE id = v_resp.id;
    PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, p_action);
    PERFORM public.matter_log_event(
      v_action.matter_id, 'shared_responsibility_declined',
      public.matter_profile_display_name(v_resp.actor_profile_id) || ' declined shared responsibility'
        || CASE WHEN v_reason IS NULL THEN '.' ELSE ': ' || v_reason || '.' END,
      v_action.assigned_kind, v_self, false,
      jsonb_build_object('responsibilityId', v_resp.id, 'response', 'decline', 'reason', v_reason)
    );
  ELSIF p_action = 'request_clarification' THEN
    PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'request_clarification');
    PERFORM public.matter_log_event(
      v_action.matter_id, 'shared_responsibility_clarification_requested',
      coalesce(v_reason, 'Clarification requested before accepting shared responsibility.'),
      v_action.assigned_kind, v_self, false,
      jsonb_build_object('responsibilityId', v_resp.id, 'reason', v_reason)
    );
    IF v_resp.assigned_by_profile_id IS NOT NULL THEN
      PERFORM public.matter_assign_action(
        v_action.matter_id, 'clarify',
        coalesce(v_resp.assigned_by_kind, 'person'), v_resp.assigned_by_profile_id, NULL,
        'clarification_response', 'remind', 'responsibility', v_resp.id
      );
    END IF;
  ELSIF p_action IN ('suggest_actor', 'suggest_another') THEN
    IF p_target_profile_id IS NULL THEN
      RAISE EXCEPTION 'Choose who should share responsibility instead.';
    END IF;
    UPDATE public.matter_responsibilities
    SET status = 'declined',
        declined_at = now(),
        response_action = 'suggest_actor',
        response_reason = v_reason,
        suggested_actor_kind = coalesce(p_target_kind, 'person'),
        suggested_actor_profile_id = p_target_profile_id
    WHERE id = v_resp.id;
    PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'suggest_actor');
    PERFORM public.matter_log_event(
      v_action.matter_id, 'shared_responsibility_declined',
      public.matter_profile_display_name(v_resp.actor_profile_id)
        || ' suggested ' || public.matter_profile_display_name(p_target_profile_id) || ' instead'
        || CASE WHEN v_reason IS NULL THEN '.' ELSE ': ' || v_reason || '.' END,
      v_action.assigned_kind, v_self, false,
      jsonb_build_object(
        'responsibilityId', v_resp.id,
        'response', 'suggest_actor',
        'reason', v_reason,
        'suggestedProfileId', p_target_profile_id
      )
    );
    PERFORM public.matter_request_shared_responsibility(
      v_action.matter_id, coalesce(p_target_kind, 'person'), p_target_profile_id, NULL
    );
  ELSE
    RAISE EXCEPTION 'That action is not available.';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.complete_matter_collaborative_work(uuid);

CREATE FUNCTION public.complete_matter_collaborative_work(
  p_matter_id uuid,
  p_allow_outstanding boolean DEFAULT false,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_matter public.matters%ROWTYPE;
  v_kind text := 'person';
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_outstanding jsonb;
  v_count integer;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to finish collaborative work.';
  END IF;
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  IF NOT FOUND OR v_matter.lifecycle_status = 'closed' THEN
    RAISE EXCEPTION 'This Matter cannot receive a final work response.';
  END IF;
  IF NOT public.matter_is_responsible_lead(p_matter_id) THEN
    RAISE EXCEPTION 'Only the Responsible Lead can provide the final Matter response.';
  END IF;
  SELECT count(*), coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'status', status) ORDER BY title), '[]'::jsonb)
    INTO v_count, v_outstanding
  FROM public.matter_outstanding_work_tasks(p_matter_id);

  IF v_count > 0 AND NOT coalesce(p_allow_outstanding, false) THEN
    RAISE EXCEPTION 'Collaborative work still has outstanding Tasks. Cancel, reassign, replace, or waive them, or complete with outstanding work.';
  END IF;
  IF v_count > 0 AND char_length(coalesce(v_reason, '')) < 3 THEN
    RAISE EXCEPTION 'Explain why collaborative work is ending with outstanding Tasks.';
  END IF;

  IF public.current_profile_represents_actor(v_matter.responsible_kind, v_matter.responsible_profile_id)
     AND v_matter.responsible_kind = 'organization' THEN
    v_kind := 'organization';
  END IF;

  UPDATE public.matters
  SET collaborative_work_completed_at = now(),
      collaborative_work_completion_kind = CASE WHEN v_count > 0 THEN 'with_outstanding_work' ELSE 'normal' END,
      collaborative_work_completion_reason = CASE WHEN v_count > 0 THEN v_reason ELSE NULL END,
      waiting_condition = CASE
        WHEN v_count > 0 THEN 'Work complete with outstanding Tasks. The final response should explain what remained.'
        ELSE 'Work complete — awaiting final response'
      END,
      updated_at = now()
  WHERE id = p_matter_id;

  IF v_count > 0 THEN
    PERFORM public.matter_log_event(
      p_matter_id, 'collaborative_work_completed_with_outstanding',
      'Collaborative work completed with outstanding Tasks. Those Tasks were not marked completed. '
        || v_reason,
      v_kind, v_self, false,
      jsonb_build_object('reason', v_reason, 'outstandingTasks', v_outstanding, 'outstandingCount', v_count)
    );
  ELSE
    PERFORM public.matter_log_event(
      p_matter_id, 'collaborative_work_completed',
      'Collaborative work completed. A final Matter response is still required.',
      v_kind, v_self, false
    );
  END IF;

  PERFORM public.matter_assign_action(
    p_matter_id, 'address',
    CASE WHEN v_kind = 'organization' THEN v_matter.responsible_kind ELSE 'person' END,
    CASE WHEN v_kind = 'organization' THEN v_matter.responsible_profile_id ELSE v_self END,
    v_matter.responsible_unit_label,
    'final_work_response', 'remind', 'matter', NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_row_json(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
  v_action public.matter_action_requirements%ROWTYPE;
  v_task_title text;
BEGIN
  SELECT * INTO v_matter FROM public.matters WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  SELECT a.* INTO v_action
  FROM public.matter_action_requirements a
  WHERE a.matter_id = p_id
    AND a.status IN ('pending', 'overdue')
    AND public.current_profile_represents_actor(a.assigned_kind, a.assigned_profile_id)
  ORDER BY a.due_at
  LIMIT 1;
  IF NOT FOUND AND v_matter.current_action_id IS NOT NULL THEN
    SELECT * INTO v_action FROM public.matter_action_requirements WHERE id = v_matter.current_action_id;
  END IF;
  IF v_action.context_kind = 'task' AND v_action.context_id IS NOT NULL THEN
    SELECT title INTO v_task_title FROM public.collaboration_tasks WHERE id = v_action.context_id;
  END IF;
  RETURN jsonb_build_object(
    'matter', to_jsonb(v_matter) || jsonb_build_object(
      'initiator_display_name', public.matter_profile_display_name(v_matter.initiator_profile_id),
      'addressee_display_name', public.matter_profile_display_name(v_matter.addressee_profile_id),
      'responsible_display_name', public.matter_profile_display_name(v_matter.responsible_profile_id)
    ),
    'current_action', CASE
      WHEN v_action.id IS NULL THEN NULL
      ELSE to_jsonb(v_action) || jsonb_build_object(
        'assigned_display_name', public.matter_profile_display_name(v_action.assigned_profile_id),
        'task_title', v_task_title
      )
    END,
    'pending_actions', coalesce((
      SELECT jsonb_agg(to_jsonb(a) || jsonb_build_object(
        'assigned_display_name', public.matter_profile_display_name(a.assigned_profile_id),
        'task_title', t.title
      ) ORDER BY a.due_at)
      FROM public.matter_action_requirements a
      LEFT JOIN public.collaboration_tasks t ON t.id = a.context_id AND a.context_kind = 'task'
      WHERE a.matter_id = p_id AND a.status IN ('pending', 'overdue')
    ), '[]'::jsonb),
    'work_summary', jsonb_build_object(
      'started', v_matter.collaborative_work_started_at IS NOT NULL,
      'completed', v_matter.collaborative_work_completed_at IS NOT NULL,
      'completion_kind', v_matter.collaborative_work_completion_kind,
      'total', (SELECT count(*) FROM public.collaboration_tasks t WHERE t.matter_id = p_id),
      'completed_tasks', (SELECT count(*) FROM public.collaboration_tasks t WHERE t.matter_id = p_id AND t.status = 'completed'),
      'blocked', (SELECT count(*) FROM public.collaboration_tasks t WHERE t.matter_id = p_id AND t.status = 'blocked'),
      'open', (SELECT count(*) FROM public.matter_outstanding_work_tasks(p_id)),
      'outstanding', (SELECT count(*) FROM public.matter_outstanding_work_tasks(p_id)),
      'outstanding_tasks', coalesce((
        SELECT jsonb_agg(jsonb_build_object('id', id, 'title', title, 'status', status) ORDER BY title)
        FROM public.matter_outstanding_work_tasks(p_id)
      ), '[]'::jsonb)
    )
  );
END;
$$;

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
      INSERT INTO public.task_assignments (
        task_id, role, actor_kind, actor_profile_id, assigned_by_kind, assigned_by_profile_id
      ) VALUES (
        v_task.id, 'lead', coalesce(p_target_kind, 'person'), p_target_profile_id, 'person', v_self
      )
      ON CONFLICT (task_id, role, actor_kind, actor_profile_id) DO UPDATE
        SET acceptance_status = 'pending', declined_at = NULL, accepted_at = NULL;
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


REVOKE ALL ON FUNCTION public.matter_task_is_terminal_for_work(text) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_request_shared_responsibility(uuid, text, uuid, text) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_respond_shared_responsibility(uuid, text, text, text, uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_outstanding_work_tasks(uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_row_json(uuid) FROM PUBLIC, authenticated;

GRANT EXECUTE ON FUNCTION public.invite_matter_participant(uuid, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_matter_collaborative_work(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_collaboration_action(uuid, text, text, text, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
