-- Matter Collaboration Phase 2: collaborative work.
-- Reuses matter_action_requirements. Completing a Task never resolves the Matter.
-- Actor kind AI_AGENT is reserved and not activated.

INSERT INTO public.matter_timing_policies (id, display_name, duration_value, duration_unit, reminder_value, reminder_unit, notes)
VALUES
  ('task_acceptance', 'Task acceptance', 1, 'calendar_days', 8, 'hours', 'Accept or decline an assigned Task.'),
  ('task_execution', 'Task execution', 5, 'calendar_days', 1, 'calendar_days', 'Complete or submit assigned work.'),
  ('task_review', 'Task review', 2, 'calendar_days', 12, 'hours', 'Review submitted Task work.'),
  ('decision_confirmation', 'Decision confirmation', 2, 'calendar_days', 12, 'hours', 'Confirm a proposed Decision.'),
  ('final_work_response', 'Final work response', 3, 'calendar_days', 1, 'calendar_days', 'Review completed work and provide the Matter response.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.matters
  ADD COLUMN IF NOT EXISTS collaborative_work_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS collaborative_work_completed_at timestamptz;

ALTER TABLE public.matter_action_requirements
  ADD COLUMN IF NOT EXISTS context_kind text NOT NULL DEFAULT 'matter',
  ADD COLUMN IF NOT EXISTS context_id uuid;

ALTER TABLE public.matter_action_requirements
  DROP CONSTRAINT IF EXISTS matter_action_requirements_context_kind_check;
ALTER TABLE public.matter_action_requirements
  ADD CONSTRAINT matter_action_requirements_context_kind_check
  CHECK (context_kind IN ('matter', 'task', 'decision'));

ALTER TABLE public.matter_action_requirements
  DROP CONSTRAINT IF EXISTS matter_action_requirements_action_type_check;
ALTER TABLE public.matter_action_requirements
  ADD CONSTRAINT matter_action_requirements_action_type_check
  CHECK (action_type IN (
    'respond', 'responsibility_response', 'clarify', 'address',
    'confirm_resolution', 'choose_next_party',
    'accept_task', 'complete_task', 'review_task', 'reconsider_task', 'confirm_decision'
  ));

ALTER TABLE public.matter_parties
  DROP CONSTRAINT IF EXISTS matter_parties_role_check;
ALTER TABLE public.matter_parties
  ADD CONSTRAINT matter_parties_role_check
  CHECK (role IN (
    'initiator', 'addressee', 'responsible',
    'responsible_lead', 'responsible_collaborator',
    'contributor', 'specialist', 'contractor', 'observer', 'evaluator',
    'invitee', 'follower', 'participant'
  ));

ALTER TABLE public.matter_comments
  ADD COLUMN IF NOT EXISTS task_id uuid;

ALTER TABLE public.matter_attachments
  ADD COLUMN IF NOT EXISTS task_id uuid,
  ADD COLUMN IF NOT EXISTS decision_id uuid,
  ADD COLUMN IF NOT EXISTS body_text text;

ALTER TABLE public.matter_attachments
  DROP CONSTRAINT IF EXISTS matter_attachments_kind_check;
ALTER TABLE public.matter_attachments
  ADD CONSTRAINT matter_attachments_kind_check
  CHECK (kind IN ('file', 'url', 'text', 'image', 'system_record'));

CREATE TABLE IF NOT EXISTS public.matter_responsibilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('lead', 'collaborator')),
  actor_kind text NOT NULL CHECK (actor_kind IN ('person', 'organization', 'group')),
  actor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_unit_label text,
  status text NOT NULL DEFAULT 'accepted'
    CHECK (status IN ('proposed', 'accepted', 'declined', 'ended')),
  assigned_by_kind text CHECK (assigned_by_kind IS NULL OR assigned_by_kind IN ('person', 'organization', 'group', 'system')),
  assigned_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  UNIQUE (matter_id, kind, actor_kind, actor_profile_id)
);

CREATE INDEX IF NOT EXISTS matter_responsibilities_matter_idx
  ON public.matter_responsibilities (matter_id, kind);

CREATE TABLE IF NOT EXISTS public.collaboration_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_kind text NOT NULL DEFAULT 'matter'
    CHECK (parent_kind IN ('matter')),
  parent_id uuid NOT NULL,
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  parent_task_id uuid REFERENCES public.collaboration_tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN (
      'proposed', 'assigned', 'awaiting_acceptance', 'accepted', 'in_progress',
      'blocked', 'waiting', 'submitted', 'under_review', 'completed', 'declined', 'cancelled'
    )),
  created_by_kind text NOT NULL CHECK (created_by_kind IN ('person', 'organization', 'group')),
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  lead_kind text CHECK (lead_kind IS NULL OR lead_kind IN ('person', 'organization', 'group')),
  lead_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  lead_unit_label text,
  start_at timestamptz,
  due_at timestamptz,
  expected_outcome text,
  completion_criteria text,
  review_required boolean NOT NULL DEFAULT false,
  current_action_id uuid,
  waiting_condition text,
  submitted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collaboration_tasks_title_len CHECK (char_length(trim(title)) BETWEEN 3 AND 160)
);

CREATE INDEX IF NOT EXISTS collaboration_tasks_matter_idx
  ON public.collaboration_tasks (matter_id, created_at);
CREATE INDEX IF NOT EXISTS collaboration_tasks_parent_idx
  ON public.collaboration_tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS collaboration_tasks_status_idx
  ON public.collaboration_tasks (matter_id, status);

CREATE TABLE IF NOT EXISTS public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.collaboration_tasks(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('lead', 'contributor', 'reviewer')),
  actor_kind text NOT NULL CHECK (actor_kind IN ('person', 'organization', 'group')),
  actor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_unit_label text,
  assigned_by_kind text NOT NULL CHECK (assigned_by_kind IN ('person', 'organization', 'group')),
  assigned_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  acceptance_status text NOT NULL DEFAULT 'pending'
    CHECK (acceptance_status IN ('pending', 'accepted', 'declined', 'suggested_reassignment')),
  accepted_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  UNIQUE (task_id, role, actor_kind, actor_profile_id)
);

CREATE INDEX IF NOT EXISTS task_assignments_actor_idx
  ON public.task_assignments (actor_profile_id, acceptance_status);

CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.collaboration_tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES public.collaboration_tasks(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'blocked_by' CHECK (kind = 'blocked_by'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);

CREATE TABLE IF NOT EXISTS public.matter_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  title text NOT NULL,
  statement text NOT NULL,
  rationale text,
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'accepted', 'rejected', 'superseded')),
  proposed_by_kind text NOT NULL CHECK (proposed_by_kind IN ('person', 'organization', 'group')),
  proposed_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  decided_by_kind text CHECK (decided_by_kind IS NULL OR decided_by_kind IN ('person', 'organization', 'group')),
  decided_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CONSTRAINT matter_decisions_title_len CHECK (char_length(trim(title)) BETWEEN 3 AND 160),
  CONSTRAINT matter_decisions_statement_len CHECK (char_length(trim(statement)) BETWEEN 3 AND 8000)
);

CREATE TABLE IF NOT EXISTS public.matter_decision_tasks (
  decision_id uuid NOT NULL REFERENCES public.matter_decisions(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.collaboration_tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (decision_id, task_id)
);

ALTER TABLE public.matter_comments
  DROP CONSTRAINT IF EXISTS matter_comments_task_id_fkey;
ALTER TABLE public.matter_comments
  ADD CONSTRAINT matter_comments_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.collaboration_tasks(id) ON DELETE CASCADE;

ALTER TABLE public.matter_attachments
  DROP CONSTRAINT IF EXISTS matter_attachments_task_id_fkey;
ALTER TABLE public.matter_attachments
  ADD CONSTRAINT matter_attachments_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.collaboration_tasks(id) ON DELETE SET NULL;
ALTER TABLE public.matter_attachments
  DROP CONSTRAINT IF EXISTS matter_attachments_decision_id_fkey;
ALTER TABLE public.matter_attachments
  ADD CONSTRAINT matter_attachments_decision_id_fkey
  FOREIGN KEY (decision_id) REFERENCES public.matter_decisions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS matter_actions_context_idx
  ON public.matter_action_requirements (context_kind, context_id)
  WHERE context_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS matter_comments_task_idx
  ON public.matter_comments (task_id, created_at)
  WHERE task_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.matter_is_responsible_lead(p_matter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matter_responsibilities r
    WHERE r.matter_id = p_matter_id
      AND r.kind = 'lead'
      AND r.status = 'accepted'
      AND public.current_profile_represents_actor(r.actor_kind, r.actor_profile_id)
  )
  OR (
    NOT EXISTS (
      SELECT 1 FROM public.matter_responsibilities r
      WHERE r.matter_id = p_matter_id AND r.kind = 'lead' AND r.status = 'accepted'
    )
    AND EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = p_matter_id
        AND public.current_profile_represents_actor(m.responsible_kind, m.responsible_profile_id)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.matter_can_manage_work(p_matter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.matter_is_responsible_lead(p_matter_id)
  OR EXISTS (
    SELECT 1
    FROM public.matter_responsibilities r
    WHERE r.matter_id = p_matter_id
      AND r.kind = 'collaborator'
      AND r.status = 'accepted'
      AND public.current_profile_represents_actor(r.actor_kind, r.actor_profile_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.matter_ensure_lead_responsibility(
  p_matter_id uuid,
  p_actor_kind text,
  p_actor_profile_id uuid,
  p_unit_label text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.matter_responsibilities (
    matter_id, kind, actor_kind, actor_profile_id, actor_unit_label, status,
    assigned_by_kind, assigned_by_profile_id, accepted_at
  ) VALUES (
    p_matter_id, 'lead', p_actor_kind, p_actor_profile_id,
    nullif(trim(coalesce(p_unit_label, '')), ''),
    'accepted', 'system', NULL, now()
  )
  ON CONFLICT (matter_id, kind, actor_kind, actor_profile_id) DO UPDATE
    SET status = 'accepted', ended_at = NULL, accepted_at = coalesce(public.matter_responsibilities.accepted_at, now());
  PERFORM public.matter_add_party(p_matter_id, 'responsible_lead', p_actor_kind, p_actor_profile_id, p_unit_label);
  PERFORM public.matter_add_party(p_matter_id, 'responsible', p_actor_kind, p_actor_profile_id, p_unit_label);
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_sync_headline(p_matter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_work boolean;
  v_open_tasks integer;
  v_blocked integer;
BEGIN
  SELECT collaborative_work_started_at IS NOT NULL
         AND collaborative_work_completed_at IS NULL
    INTO v_work
  FROM public.matters WHERE id = p_matter_id;

  SELECT count(*) FILTER (WHERE status NOT IN ('completed', 'cancelled', 'declined')),
         count(*) FILTER (WHERE status = 'blocked')
    INTO v_open_tasks, v_blocked
  FROM public.collaboration_tasks
  WHERE matter_id = p_matter_id;

  SELECT a.id INTO v_id
  FROM public.matter_action_requirements a
  WHERE a.matter_id = p_matter_id
    AND a.status IN ('pending', 'overdue')
  ORDER BY
    CASE WHEN a.context_kind = 'matter' THEN 0 ELSE 1 END,
    a.due_at
  LIMIT 1;

  UPDATE public.matters
  SET current_action_id = v_id,
      waiting_condition = CASE
        WHEN v_id IS NOT NULL THEN NULL
        WHEN v_work AND v_blocked > 0 THEN 'Work in progress — waiting on blocked Tasks.'
        WHEN v_work AND v_open_tasks > 0 THEN 'Work in progress'
        WHEN v_work AND v_open_tasks = 0 THEN 'Work complete — awaiting final response'
        ELSE waiting_condition
      END,
      updated_at = now()
  WHERE id = p_matter_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_task_is_blocked(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.task_dependencies d
    JOIN public.collaboration_tasks dep ON dep.id = d.depends_on_task_id
    WHERE d.task_id = p_task_id
      AND d.kind = 'blocked_by'
      AND dep.status IS DISTINCT FROM 'completed'
  );
$$;

DROP FUNCTION IF EXISTS public.matter_assign_action(uuid, text, text, uuid, text, text, text);

CREATE FUNCTION public.matter_assign_action(
  p_matter_id uuid,
  p_action_type text,
  p_assigned_kind text,
  p_assigned_profile_id uuid,
  p_assigned_unit_label text,
  p_timing_policy_id text,
  p_timeout_action text,
  p_context_kind text DEFAULT 'matter',
  p_context_id uuid DEFAULT NULL
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
BEGIN
  SELECT * INTO v_policy FROM public.matter_timing_policies WHERE id = p_timing_policy_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown timing policy.';
  END IF;

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
    due_at, reminder_at, timing_policy_id, timeout_action, context_kind, context_id
  ) VALUES (
    p_matter_id, p_action_type, p_assigned_kind, p_assigned_profile_id,
    nullif(trim(coalesce(p_assigned_unit_label, '')), ''),
    v_due, v_reminder, v_policy.id, p_timeout_action, v_kind, p_context_id
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
      'contextKind', v_kind, 'contextId', p_context_id
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
      ELSE 'matter_action_assigned'
    END,
    'Action required',
    CASE
      WHEN p_action_type = 'accept_task' THEN 'Accept or decline an assigned Task.'
      WHEN p_action_type = 'complete_task' THEN 'A Task needs work from you.'
      WHEN p_action_type = 'review_task' THEN 'Submitted work is ready for review.'
      WHEN p_action_type = 'confirm_decision' THEN 'A Decision needs confirmation.'
      ELSE 'A Matter needs a response from you.'
    END,
    p_matter_id
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_complete_action(
  p_action_id uuid,
  p_actor_kind text,
  p_actor_profile_id uuid,
  p_completion_action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.matter_action_requirements%ROWTYPE;
BEGIN
  UPDATE public.matter_action_requirements
  SET status = 'completed',
      completed_at = now(),
      completed_by_kind = p_actor_kind,
      completed_by_profile_id = p_actor_profile_id,
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
    p_actor_kind, p_actor_profile_id, p_actor_kind = 'system',
    jsonb_build_object('completionAction', p_completion_action, 'actionId', p_action_id)
  );
  PERFORM public.matter_sync_headline(v_row.matter_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_complete_current_action(
  p_matter_id uuid,
  p_actor_kind text,
  p_actor_profile_id uuid,
  p_completion_action text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_id uuid;
BEGIN
  SELECT current_action_id INTO v_action_id FROM public.matters WHERE id = p_matter_id;
  IF v_action_id IS NULL THEN
    RETURN;
  END IF;
  PERFORM public.matter_complete_action(v_action_id, p_actor_kind, p_actor_profile_id, p_completion_action);
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_activate_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.collaboration_tasks%ROWTYPE;
  v_assign public.task_assignments%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM public.collaboration_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  IF v_task.status IN ('completed', 'cancelled', 'declined') THEN
    RETURN;
  END IF;
  IF public.matter_task_is_blocked(p_task_id) THEN
    UPDATE public.collaboration_tasks
    SET status = 'blocked',
        waiting_condition = 'Waiting on a blocking Task.',
        updated_at = now()
    WHERE id = p_task_id;
    PERFORM public.matter_log_event(
      v_task.matter_id, 'task_blocked',
      'Task "' || v_task.title || '" is waiting on a dependency.',
      'system', NULL, true, jsonb_build_object('taskId', p_task_id)
    );
    PERFORM public.matter_sync_headline(v_task.matter_id);
    RETURN;
  END IF;

  SELECT * INTO v_assign
  FROM public.task_assignments
  WHERE task_id = p_task_id
    AND role = 'lead'
    AND acceptance_status IN ('pending', 'accepted')
  ORDER BY assigned_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    UPDATE public.collaboration_tasks
    SET status = 'proposed', waiting_condition = NULL, updated_at = now()
    WHERE id = p_task_id;
    PERFORM public.matter_sync_headline(v_task.matter_id);
    RETURN;
  END IF;

  IF v_assign.acceptance_status = 'accepted' THEN
    UPDATE public.collaboration_tasks
    SET status = 'in_progress',
        waiting_condition = NULL,
        start_at = coalesce(start_at, now()),
        updated_at = now()
    WHERE id = p_task_id;
    PERFORM public.matter_assign_action(
      v_task.matter_id, 'complete_task', v_assign.actor_kind, v_assign.actor_profile_id,
      v_assign.actor_unit_label, 'task_execution', 'remind', 'task', p_task_id
    );
    PERFORM public.matter_log_event(
      v_task.matter_id, 'task_started',
      'Task "' || v_task.title || '" is ready to complete.',
      'system', NULL, true, jsonb_build_object('taskId', p_task_id)
    );
    PERFORM public.matter_notify_actor(
      v_assign.actor_kind, v_assign.actor_profile_id,
      'task_became_actionable', 'Task is ready',
      'A blocked Task is now actionable.', v_task.matter_id
    );
  ELSE
    UPDATE public.collaboration_tasks
    SET status = 'awaiting_acceptance', waiting_condition = NULL, updated_at = now()
    WHERE id = p_task_id;
    PERFORM public.matter_assign_action(
      v_task.matter_id, 'accept_task', v_assign.actor_kind, v_assign.actor_profile_id,
      v_assign.actor_unit_label, 'task_acceptance', 'remind', 'task', p_task_id
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_release_dependents(p_completed_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dep uuid;
  v_matter uuid;
  v_title text;
BEGIN
  SELECT matter_id, title INTO v_matter, v_title
  FROM public.collaboration_tasks WHERE id = p_completed_task_id;
  FOR v_dep IN
    SELECT d.task_id
    FROM public.task_dependencies d
    WHERE d.depends_on_task_id = p_completed_task_id
  LOOP
    IF NOT public.matter_task_is_blocked(v_dep) THEN
      PERFORM public.matter_log_event(
        v_matter, 'dependency_cleared',
        'A blocking Task completed. Downstream work can continue.',
        'system', NULL, true,
        jsonb_build_object('completedTaskId', p_completed_task_id, 'taskId', v_dep)
      );
      PERFORM public.matter_activate_task(v_dep);
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_matter_collaborative_work(p_matter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_matter public.matters%ROWTYPE;
  v_action public.matter_action_requirements%ROWTYPE;
  v_kind text := 'person';
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to start collaborative work.';
  END IF;
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Matter not found.';
  END IF;
  IF v_matter.lifecycle_status = 'closed' THEN
    RAISE EXCEPTION 'This Matter is closed.';
  END IF;
  IF NOT public.can_access_matter(p_matter_id) THEN
    RAISE EXCEPTION 'You cannot start work on this Matter.';
  END IF;
  IF NOT (
    public.current_profile_represents_actor(v_matter.responsible_kind, v_matter.responsible_profile_id)
    OR public.current_profile_represents_actor(v_matter.addressee_kind, v_matter.addressee_profile_id)
    OR public.matter_is_responsible_lead(p_matter_id)
  ) THEN
    RAISE EXCEPTION 'Only the responsible party can start collaborative work.';
  END IF;
  IF v_matter.collaborative_work_started_at IS NOT NULL THEN
    RETURN;
  END IF;
  IF public.current_profile_represents_actor(v_matter.responsible_kind, v_matter.responsible_profile_id)
     AND v_matter.responsible_kind = 'organization' THEN
    v_kind := 'organization';
  END IF;

  PERFORM public.matter_ensure_lead_responsibility(
    p_matter_id,
    CASE WHEN v_kind = 'organization' THEN v_matter.responsible_kind ELSE 'person' END,
    CASE WHEN v_kind = 'organization' THEN v_matter.responsible_profile_id ELSE v_self END,
    v_matter.responsible_unit_label
  );

  UPDATE public.matters
  SET collaborative_work_started_at = now(),
      collaborative_work_completed_at = NULL,
      waiting_condition = 'Work in progress',
      lifecycle_status = CASE WHEN lifecycle_status = 'draft' THEN 'submitted' ELSE 'active' END,
      updated_at = now()
  WHERE id = p_matter_id;

  SELECT * INTO v_action
  FROM public.matter_action_requirements
  WHERE id = v_matter.current_action_id;
  IF FOUND AND v_action.status IN ('pending', 'overdue')
     AND v_action.context_kind = 'matter'
     AND public.current_profile_represents_actor(v_action.assigned_kind, v_action.assigned_profile_id)
     AND v_action.action_type IN ('respond', 'address', 'responsibility_response') THEN
    PERFORM public.matter_complete_action(v_action.id, v_kind, v_self, 'start_collaborative_work');
  END IF;

  PERFORM public.matter_log_event(
    p_matter_id, 'collaborative_work_started',
    'Collaborative work started. Tasks can be assigned without resolving the Matter.',
    v_kind, v_self, false
  );
  PERFORM public.matter_sync_headline(p_matter_id);
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
  PERFORM public.matter_add_party(p_matter_id, v_role, coalesce(p_kind, 'person'), p_profile_id, p_unit_label);
  PERFORM public.matter_add_party(p_matter_id, 'participant', coalesce(p_kind, 'person'), p_profile_id, p_unit_label);
  IF v_role = 'responsible_collaborator' THEN
    INSERT INTO public.matter_responsibilities (
      matter_id, kind, actor_kind, actor_profile_id, actor_unit_label, status,
      assigned_by_kind, assigned_by_profile_id, accepted_at
    ) VALUES (
      p_matter_id, 'collaborator', coalesce(p_kind, 'person'), p_profile_id,
      nullif(trim(coalesce(p_unit_label, '')), ''), 'accepted', 'person', v_self, now()
    )
    ON CONFLICT (matter_id, kind, actor_kind, actor_profile_id) DO UPDATE
      SET status = 'accepted', ended_at = NULL;
    PERFORM public.matter_log_event(
      p_matter_id, 'responsibility_added',
      public.matter_profile_display_name(p_profile_id) || ' now shares responsibility.',
      'person', v_self, false, jsonb_build_object('profileId', p_profile_id)
    );
  ELSE
    PERFORM public.matter_log_event(
      p_matter_id, 'collaborator_added',
      'Invited ' || public.matter_profile_display_name(p_profile_id) || ' as ' || replace(v_role, '_', ' ') || '.',
      'person', v_self, false, jsonb_build_object('role', v_role, 'profileId', p_profile_id)
    );
  END IF;
  PERFORM public.matter_notify_actor(
    coalesce(p_kind, 'person'), p_profile_id,
    CASE WHEN v_role = 'responsible_collaborator' THEN 'matter_responsibility_assigned' ELSE 'matter_collaborate_invite' END,
    CASE WHEN v_role = 'responsible_collaborator' THEN 'You share Matter responsibility' ELSE 'You were invited to collaborate' END,
    'You were added to collaborative work on a Matter.',
    p_matter_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_collaboration_task(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_matter_id uuid := (payload->>'matter_id')::uuid;
  v_id uuid;
  v_parent uuid := (payload->>'parent_task_id')::uuid;
  v_dep uuid;
  v_blocked boolean := false;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to create a Task.';
  END IF;
  IF v_matter_id IS NULL OR NOT public.can_access_matter(v_matter_id) THEN
    RAISE EXCEPTION 'You cannot create a Task on this Matter.';
  END IF;
  IF NOT public.matter_can_manage_work(v_matter_id) THEN
    RAISE EXCEPTION 'Only a Responsible Lead or Collaborator can create Tasks.';
  END IF;
  IF (SELECT lifecycle_status FROM public.matters WHERE id = v_matter_id) = 'closed' THEN
    RAISE EXCEPTION 'This Matter is closed.';
  END IF;
  IF (SELECT collaborative_work_started_at FROM public.matters WHERE id = v_matter_id) IS NULL THEN
    PERFORM public.start_matter_collaborative_work(v_matter_id);
  END IF;
  IF char_length(trim(coalesce(payload->>'title', ''))) < 3 THEN
    RAISE EXCEPTION 'Add a short Task title.';
  END IF;
  IF v_parent IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.collaboration_tasks t WHERE t.id = v_parent AND t.matter_id = v_matter_id
  ) THEN
    RAISE EXCEPTION 'Parent Task was not found.';
  END IF;

  INSERT INTO public.collaboration_tasks (
    parent_kind, parent_id, matter_id, parent_task_id, title, description, priority,
    created_by_kind, created_by_profile_id, expected_outcome, completion_criteria, review_required
  ) VALUES (
    'matter', v_matter_id, v_matter_id, v_parent,
    trim(payload->>'title'),
    nullif(trim(coalesce(payload->>'description', '')), ''),
    coalesce(nullif(payload->>'priority', ''), 'normal'),
    'person', v_self,
    nullif(trim(coalesce(payload->>'expected_outcome', '')), ''),
    nullif(trim(coalesce(payload->>'completion_criteria', '')), ''),
    coalesce((payload->>'review_required')::boolean, false)
  )
  RETURNING id INTO v_id;

  PERFORM public.matter_log_event(
    v_matter_id, 'task_created',
    'Task created: ' || trim(payload->>'title') || '.',
    'person', v_self, false, jsonb_build_object('taskId', v_id)
  );

  IF payload->'depends_on' IS NOT NULL THEN
    FOR v_dep IN SELECT jsonb_array_elements_text(payload->'depends_on')::uuid
    LOOP
      IF v_dep = v_id THEN
        CONTINUE;
      END IF;
      INSERT INTO public.task_dependencies (task_id, depends_on_task_id)
      VALUES (v_id, v_dep)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  IF payload->>'assignee_profile_id' IS NOT NULL THEN
    INSERT INTO public.task_assignments (
      task_id, role, actor_kind, actor_profile_id, actor_unit_label,
      assigned_by_kind, assigned_by_profile_id
    ) VALUES (
      v_id, 'lead',
      coalesce(payload->>'assignee_kind', 'person'),
      (payload->>'assignee_profile_id')::uuid,
      nullif(trim(coalesce(payload->>'assignee_unit_label', '')), ''),
      'person', v_self
    );
    UPDATE public.collaboration_tasks
    SET lead_kind = coalesce(payload->>'assignee_kind', 'person'),
        lead_profile_id = (payload->>'assignee_profile_id')::uuid,
        lead_unit_label = nullif(trim(coalesce(payload->>'assignee_unit_label', '')), ''),
        status = 'assigned',
        updated_at = now()
    WHERE id = v_id;
    PERFORM public.matter_add_party(
      v_matter_id, 'contributor',
      coalesce(payload->>'assignee_kind', 'person'),
      (payload->>'assignee_profile_id')::uuid,
      payload->>'assignee_unit_label'
    );
    PERFORM public.matter_log_event(
      v_matter_id, 'task_assigned',
      'Task assigned to ' || public.matter_profile_display_name((payload->>'assignee_profile_id')::uuid) || '.',
      'person', v_self, false,
      jsonb_build_object('taskId', v_id, 'profileId', payload->>'assignee_profile_id')
    );
    PERFORM public.matter_notify_actor(
      coalesce(payload->>'assignee_kind', 'person'),
      (payload->>'assignee_profile_id')::uuid,
      'task_assigned', 'Task assigned',
      'A Task was assigned to you.', v_matter_id
    );
  END IF;

  IF payload->>'reviewer_profile_id' IS NOT NULL THEN
    INSERT INTO public.task_assignments (
      task_id, role, actor_kind, actor_profile_id, actor_unit_label,
      assigned_by_kind, assigned_by_profile_id, acceptance_status, accepted_at
    ) VALUES (
      v_id, 'reviewer',
      coalesce(payload->>'reviewer_kind', 'person'),
      (payload->>'reviewer_profile_id')::uuid,
      nullif(trim(coalesce(payload->>'reviewer_unit_label', '')), ''),
      'person', v_self, 'accepted', now()
    )
    ON CONFLICT DO NOTHING;
    UPDATE public.collaboration_tasks SET review_required = true, updated_at = now() WHERE id = v_id;
  END IF;

  v_blocked := public.matter_task_is_blocked(v_id);
  IF v_blocked THEN
    UPDATE public.collaboration_tasks
    SET status = 'blocked', waiting_condition = 'Waiting on a blocking Task.', updated_at = now()
    WHERE id = v_id;
    PERFORM public.matter_log_event(
      v_matter_id, 'task_blocked',
      'Task "' || trim(payload->>'title') || '" is waiting on a dependency.',
      'system', NULL, true, jsonb_build_object('taskId', v_id)
    );
  ELSE
    PERFORM public.matter_activate_task(v_id);
  END IF;
  PERFORM public.matter_sync_headline(v_matter_id);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_task_dependency(p_task_id uuid, p_depends_on_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task public.collaboration_tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM public.collaboration_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found.';
  END IF;
  IF NOT public.matter_can_manage_work(v_task.matter_id) THEN
    RAISE EXCEPTION 'Only a Responsible Lead or Collaborator can set dependencies.';
  END IF;
  IF p_task_id = p_depends_on_task_id THEN
    RAISE EXCEPTION 'A Task cannot depend on itself.';
  END IF;
  INSERT INTO public.task_dependencies (task_id, depends_on_task_id)
  VALUES (p_task_id, p_depends_on_task_id)
  ON CONFLICT DO NOTHING;
  IF public.matter_task_is_blocked(p_task_id) AND v_task.status NOT IN ('completed', 'cancelled', 'declined') THEN
    UPDATE public.matter_action_requirements
    SET status = 'cancelled', completed_at = now()
    WHERE context_kind = 'task' AND context_id = p_task_id AND status IN ('pending', 'overdue');
    UPDATE public.collaboration_tasks
    SET status = 'blocked', waiting_condition = 'Waiting on a blocking Task.', current_action_id = NULL, updated_at = now()
    WHERE id = p_task_id;
    PERFORM public.matter_log_event(
      v_task.matter_id, 'task_blocked',
      'Task "' || v_task.title || '" is waiting on a dependency.',
      'system', NULL, true, jsonb_build_object('taskId', p_task_id)
    );
  END IF;
  PERFORM public.matter_sync_headline(v_task.matter_id);
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
        v_action.assigned_kind, v_self, false, jsonb_build_object('taskId', v_task.id)
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
      SET acceptance_status = 'suggested_reassignment', decline_reason = nullif(trim(coalesce(p_message, '')), '')
      WHERE task_id = v_task.id AND actor_profile_id = v_action.assigned_profile_id AND role = 'lead';
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'suggest_reassignment');
      PERFORM public.matter_log_event(
        v_action.matter_id, 'task_reassignment_suggested',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Reassignment suggested.'),
        v_action.assigned_kind, v_self, false, jsonb_build_object('taskId', v_task.id)
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
    ELSIF p_action = 'cancel_task' THEN
      PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'cancel_task');
      UPDATE public.collaboration_tasks
      SET status = 'cancelled', cancelled_at = now(), updated_at = now()
      WHERE id = v_task.id;
      PERFORM public.matter_log_event(
        v_action.matter_id, 'task_cancelled',
        'Task cancelled: ' || v_task.title || '.',
        'person', v_self, false, jsonb_build_object('taskId', v_task.id)
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

CREATE OR REPLACE FUNCTION public.propose_matter_decision(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_matter_id uuid := (payload->>'matter_id')::uuid;
  v_id uuid;
  v_task uuid;
  v_lead public.matter_responsibilities%ROWTYPE;
BEGIN
  IF v_self IS NULL OR v_matter_id IS NULL OR NOT public.can_access_matter(v_matter_id) THEN
    RAISE EXCEPTION 'You cannot propose a Decision on this Matter.';
  END IF;
  IF (SELECT lifecycle_status FROM public.matters WHERE id = v_matter_id) = 'closed' THEN
    RAISE EXCEPTION 'This Matter is closed.';
  END IF;
  IF char_length(trim(coalesce(payload->>'title', ''))) < 3 OR char_length(trim(coalesce(payload->>'statement', ''))) < 3 THEN
    RAISE EXCEPTION 'Add a Decision title and statement.';
  END IF;
  INSERT INTO public.matter_decisions (
    matter_id, title, statement, rationale, proposed_by_kind, proposed_by_profile_id
  ) VALUES (
    v_matter_id, trim(payload->>'title'), trim(payload->>'statement'),
    nullif(trim(coalesce(payload->>'rationale', '')), ''),
    'person', v_self
  )
  RETURNING id INTO v_id;
  IF payload->'task_ids' IS NOT NULL THEN
    FOR v_task IN SELECT jsonb_array_elements_text(payload->'task_ids')::uuid
    LOOP
      INSERT INTO public.matter_decision_tasks (decision_id, task_id)
      VALUES (v_id, v_task)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
  PERFORM public.matter_log_event(
    v_matter_id, 'decision_proposed',
    'Decision proposed: ' || trim(payload->>'title') || '.',
    'person', v_self, false, jsonb_build_object('decisionId', v_id)
  );
  SELECT * INTO v_lead FROM public.matter_responsibilities
  WHERE matter_id = v_matter_id AND kind = 'lead' AND status = 'accepted'
  ORDER BY assigned_at LIMIT 1;
  IF public.matter_is_responsible_lead(v_matter_id) THEN
    UPDATE public.matter_decisions
    SET status = 'accepted', decided_by_kind = 'person', decided_by_profile_id = v_self, decided_at = now()
    WHERE id = v_id;
    PERFORM public.matter_log_event(
      v_matter_id, 'decision_accepted',
      'Decision accepted: ' || trim(payload->>'title') || '.',
      'person', v_self, false, jsonb_build_object('decisionId', v_id)
    );
  ELSIF FOUND THEN
    PERFORM public.matter_assign_action(
      v_matter_id, 'confirm_decision', v_lead.actor_kind, v_lead.actor_profile_id,
      v_lead.actor_unit_label, 'decision_confirmation', 'remind', 'decision', v_id
    );
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_matter_collaborative_work(p_matter_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_matter public.matters%ROWTYPE;
  v_kind text := 'person';
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
  IF public.current_profile_represents_actor(v_matter.responsible_kind, v_matter.responsible_profile_id)
     AND v_matter.responsible_kind = 'organization' THEN
    v_kind := 'organization';
  END IF;
  UPDATE public.matters
  SET collaborative_work_completed_at = now(),
      updated_at = now()
  WHERE id = p_matter_id;
  PERFORM public.matter_log_event(
    p_matter_id, 'collaborative_work_completed',
    'Collaborative work completed. A final Matter response is still required.',
    v_kind, v_self, false
  );
  PERFORM public.matter_assign_action(
    p_matter_id, 'address',
    CASE WHEN v_kind = 'organization' THEN v_matter.responsible_kind ELSE 'person' END,
    CASE WHEN v_kind = 'organization' THEN v_matter.responsible_profile_id ELSE v_self END,
    v_matter.responsible_unit_label,
    'final_work_response', 'remind', 'matter', NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_close(
  p_matter_id uuid,
  p_close_kind text,
  p_reason text,
  p_actor_kind text,
  p_actor_profile_id uuid,
  p_is_system boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closed uuid;
BEGIN
  UPDATE public.matters
  SET lifecycle_status = 'closed',
      close_kind = p_close_kind,
      close_reason = p_reason,
      closed_at = now(),
      waiting_condition = NULL,
      updated_at = now()
  WHERE id = p_matter_id
    AND lifecycle_status <> 'closed'
  RETURNING id INTO v_closed;
  IF v_closed IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.matter_action_requirements
  SET status = CASE WHEN p_is_system THEN 'expired' ELSE 'cancelled' END,
      completed_at = now(),
      completed_by_kind = p_actor_kind,
      completed_by_profile_id = p_actor_profile_id
  WHERE matter_id = p_matter_id
    AND status IN ('pending', 'overdue');
  PERFORM public.matter_log_event(
    p_matter_id,
    CASE WHEN p_is_system THEN 'matter_auto_closed' ELSE 'matter_manually_closed' END,
    p_reason,
    p_actor_kind, p_actor_profile_id, p_is_system,
    jsonb_build_object('closeKind', p_close_kind)
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
      'total', (SELECT count(*) FROM public.collaboration_tasks t WHERE t.matter_id = p_id),
      'completed_tasks', (SELECT count(*) FROM public.collaboration_tasks t WHERE t.matter_id = p_id AND t.status = 'completed'),
      'blocked', (SELECT count(*) FROM public.collaboration_tasks t WHERE t.matter_id = p_id AND t.status = 'blocked'),
      'open', (SELECT count(*) FROM public.collaboration_tasks t WHERE t.matter_id = p_id AND t.status NOT IN ('completed', 'cancelled', 'declined'))
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_matter(p_matter_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base jsonb;
BEGIN
  IF NOT public.can_access_matter(p_matter_id) THEN
    RETURN NULL;
  END IF;
  v_base := public.matter_row_json(p_matter_id);
  IF v_base IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN v_base || jsonb_build_object(
    'comments', coalesce((
      SELECT jsonb_agg(to_jsonb(c) || jsonb_build_object(
        'author_display_name', public.matter_profile_display_name(c.author_profile_id)
      ) ORDER BY c.created_at)
      FROM public.matter_comments c WHERE c.matter_id = p_matter_id
    ), '[]'::jsonb),
    'events', coalesce((
      SELECT jsonb_agg(to_jsonb(e) || jsonb_build_object(
        'actor_display_name', CASE
          WHEN e.is_system OR e.actor_kind = 'system' THEN 'Civizen'
          ELSE public.matter_profile_display_name(e.actor_profile_id)
        END
      ) ORDER BY e.created_at)
      FROM public.matter_events e WHERE e.matter_id = p_matter_id
    ), '[]'::jsonb),
    'parties', coalesce((
      SELECT jsonb_agg(to_jsonb(p) || jsonb_build_object(
        'actor_display_name', public.matter_profile_display_name(p.actor_profile_id)
      ) ORDER BY p.added_at)
      FROM public.matter_parties p WHERE p.matter_id = p_matter_id
    ), '[]'::jsonb),
    'attachments', coalesce((
      SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at)
      FROM public.matter_attachments a WHERE a.matter_id = p_matter_id
    ), '[]'::jsonb),
    'responsibilities', coalesce((
      SELECT jsonb_agg(to_jsonb(r) || jsonb_build_object(
        'actor_display_name', public.matter_profile_display_name(r.actor_profile_id)
      ) ORDER BY r.assigned_at)
      FROM public.matter_responsibilities r WHERE r.matter_id = p_matter_id
    ), '[]'::jsonb),
    'tasks', coalesce((
      SELECT jsonb_agg(to_jsonb(t) || jsonb_build_object(
        'lead_display_name', public.matter_profile_display_name(t.lead_profile_id),
        'created_by_display_name', public.matter_profile_display_name(t.created_by_profile_id),
        'is_blocked', public.matter_task_is_blocked(t.id),
        'assignments', coalesce((
          SELECT jsonb_agg(to_jsonb(asg) || jsonb_build_object(
            'actor_display_name', public.matter_profile_display_name(asg.actor_profile_id)
          ) ORDER BY asg.assigned_at)
          FROM public.task_assignments asg WHERE asg.task_id = t.id
        ), '[]'::jsonb),
        'dependencies', coalesce((
          SELECT jsonb_agg(jsonb_build_object(
            'id', d.id, 'depends_on_task_id', d.depends_on_task_id, 'kind', d.kind,
            'depends_on_title', dep.title, 'depends_on_status', dep.status
          ))
          FROM public.task_dependencies d
          JOIN public.collaboration_tasks dep ON dep.id = d.depends_on_task_id
          WHERE d.task_id = t.id
        ), '[]'::jsonb)
      ) ORDER BY t.created_at)
      FROM public.collaboration_tasks t WHERE t.matter_id = p_matter_id
    ), '[]'::jsonb),
    'decisions', coalesce((
      SELECT jsonb_agg(to_jsonb(d) || jsonb_build_object(
        'proposed_by_display_name', public.matter_profile_display_name(d.proposed_by_profile_id),
        'decided_by_display_name', public.matter_profile_display_name(d.decided_by_profile_id),
        'task_ids', coalesce((
          SELECT jsonb_agg(dt.task_id) FROM public.matter_decision_tasks dt WHERE dt.decision_id = d.id
        ), '[]'::jsonb)
      ) ORDER BY d.created_at)
      FROM public.matter_decisions d WHERE d.matter_id = p_matter_id
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_matters(p_queue text DEFAULT 'mine')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_result jsonb;
BEGIN
  IF v_self IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(public.matter_row_json(x.id) ORDER BY x.updated_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT DISTINCT m.id, m.updated_at
    FROM public.matters m
    WHERE public.can_access_matter(m.id)
      AND (
        (p_queue = 'needs_action'
          AND m.lifecycle_status IN ('submitted', 'active')
          AND EXISTS (
            SELECT 1 FROM public.matter_action_requirements a
            WHERE a.matter_id = m.id
              AND a.status IN ('pending', 'overdue')
              AND public.current_profile_represents_actor(a.assigned_kind, a.assigned_profile_id)
          ))
        OR (p_queue = 'mine'
          AND (
            public.current_profile_represents_actor(m.initiator_kind, m.initiator_profile_id)
            OR public.current_profile_represents_actor(m.responsible_kind, m.responsible_profile_id)
            OR public.current_profile_represents_actor(m.addressee_kind, m.addressee_profile_id)
          ))
        OR (p_queue = 'participating'
          AND public.current_profile_is_matter_party(m.id)
          AND NOT public.current_profile_represents_actor(m.initiator_kind, m.initiator_profile_id)
          AND NOT EXISTS (
            SELECT 1 FROM public.matter_action_requirements a
            WHERE a.matter_id = m.id
              AND a.status IN ('pending', 'overdue')
              AND public.current_profile_represents_actor(a.assigned_kind, a.assigned_profile_id)
          ))
        OR (p_queue = 'organization'
          AND EXISTS (
            SELECT 1 FROM public.linked_accounts la
            WHERE la.owner_profile_id = v_self
              AND la.relationship_type = 'business'
              AND (
                m.addressee_profile_id = la.linked_profile_id
                OR m.responsible_profile_id = la.linked_profile_id
                OR EXISTS (
                  SELECT 1 FROM public.matter_action_requirements a
                  WHERE a.matter_id = m.id
                    AND a.assigned_profile_id = la.linked_profile_id
                    AND a.status IN ('pending', 'overdue')
                )
              )
          ))
      )
    ORDER BY m.updated_at DESC
    LIMIT 100
  ) x;
  RETURN v_result;
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
    SELECT * INTO v_locked
    FROM public.matter_action_requirements
    WHERE id = v_row.id;
    IF NOT FOUND OR v_locked.status NOT IN ('pending', 'overdue') THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.matters m
      WHERE m.id = v_locked.matter_id
        AND m.lifecycle_status IN ('submitted', 'active')
    ) THEN
      CONTINUE;
    END IF;

    IF now() >= v_locked.reminder_at AND now() < v_locked.due_at THEN
      INSERT INTO public.matter_reminders (action_id, reminder_kind)
      VALUES (v_locked.id, 'approaching')
      ON CONFLICT (action_id, reminder_kind) DO NOTHING;
      IF FOUND THEN
        PERFORM public.matter_log_event(
          v_locked.matter_id, 'reminder_sent', 'Approaching-deadline reminder sent.',
          'system', NULL, true, jsonb_build_object('reminderKind', 'approaching', 'actionId', v_locked.id)
        );
        PERFORM public.matter_notify_actor(
          v_locked.assigned_kind, v_locked.assigned_profile_id,
          CASE WHEN v_locked.context_kind = 'task' THEN 'task_approaching_due' ELSE 'matter_action_reminder' END,
          CASE WHEN v_locked.context_kind = 'task' THEN 'Task deadline approaching' ELSE 'Matter deadline approaching' END,
          CASE WHEN v_locked.context_kind = 'task' THEN 'A Task still needs your action.' ELSE 'A Matter still needs your action.' END,
          v_locked.matter_id
        );
        v_count := v_count + 1;
      END IF;
    END IF;

    IF now() >= v_locked.due_at AND v_locked.timeout_action = 'auto_close'
       AND v_locked.context_kind = 'matter'
       AND v_locked.action_type = 'confirm_resolution' THEN
      SELECT id INTO v_closed
      FROM public.matters
      WHERE id = v_locked.matter_id
        AND lifecycle_status IN ('submitted', 'active')
        AND current_action_id = v_locked.id
      FOR UPDATE;
      IF v_closed IS NOT NULL THEN
        PERFORM public.matter_close(
          v_locked.matter_id,
          'auto_no_initiator_response',
          'Closed automatically after no response from the initiator within the resolution-review period.',
          'system', NULL, true
        );
        v_count := v_count + 1;
      END IF;
      CONTINUE;
    END IF;

    IF now() >= v_locked.due_at THEN
      UPDATE public.matter_action_requirements
      SET status = 'overdue'
      WHERE id = v_locked.id
        AND status = 'pending'
      RETURNING id INTO v_marked;
      IF v_marked IS NOT NULL THEN
        PERFORM public.matter_log_event(
          v_locked.matter_id, 'action_overdue', 'The required action is overdue.',
          'system', NULL, true, jsonb_build_object('actionId', v_locked.id, 'contextKind', v_locked.context_kind)
        );
        v_count := v_count + 1;
      END IF;
      INSERT INTO public.matter_reminders (action_id, reminder_kind)
      VALUES (v_locked.id, 'overdue')
      ON CONFLICT (action_id, reminder_kind) DO NOTHING;
      IF FOUND THEN
        PERFORM public.matter_log_event(
          v_locked.matter_id, 'reminder_sent', 'Overdue notification sent.',
          'system', NULL, true, jsonb_build_object('reminderKind', 'overdue', 'actionId', v_locked.id)
        );
        PERFORM public.matter_notify_actor(
          v_locked.assigned_kind, v_locked.assigned_profile_id,
          CASE WHEN v_locked.context_kind = 'task' THEN 'task_overdue' ELSE 'matter_action_overdue' END,
          CASE WHEN v_locked.context_kind = 'task' THEN 'Task overdue' ELSE 'Matter action overdue' END,
          CASE WHEN v_locked.context_kind = 'task' THEN 'A required Task action is overdue.' ELSE 'A required Matter action is overdue.' END,
          v_locked.matter_id
        );
      END IF;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

DROP FUNCTION IF EXISTS public.add_matter_comment(uuid, text, uuid, text, uuid[]);

CREATE FUNCTION public.add_matter_comment(
  p_matter_id uuid,
  p_body text,
  p_parent_id uuid DEFAULT NULL,
  p_author_kind text DEFAULT 'person',
  p_mentioned_profile_ids uuid[] DEFAULT '{}'::uuid[],
  p_task_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_id uuid;
  v_kind text := 'person';
  v_author uuid := v_self;
  v_mention uuid;
  v_lifecycle text;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to comment.';
  END IF;
  IF NOT public.can_access_matter(p_matter_id) THEN
    RAISE EXCEPTION 'You cannot comment on this Matter.';
  END IF;
  SELECT lifecycle_status INTO v_lifecycle FROM public.matters WHERE id = p_matter_id;
  IF v_lifecycle = 'closed' THEN
    RAISE EXCEPTION 'This Matter is closed.';
  END IF;
  IF p_task_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.collaboration_tasks t WHERE t.id = p_task_id AND t.matter_id = p_matter_id
  ) THEN
    RAISE EXCEPTION 'Task not found.';
  END IF;
  IF char_length(trim(coalesce(p_body, ''))) < 1 THEN
    RAISE EXCEPTION 'Write a comment.';
  END IF;
  IF coalesce(nullif(p_author_kind, ''), 'person') = 'organization' THEN
    SELECT mp.actor_profile_id INTO v_author
    FROM public.matter_parties mp
    WHERE mp.matter_id = p_matter_id
      AND mp.actor_kind = 'organization'
      AND public.current_profile_represents_actor('organization', mp.actor_profile_id)
    LIMIT 1;
    IF v_author IS NOT NULL THEN
      v_kind := 'organization';
    ELSE
      v_author := v_self;
      v_kind := 'person';
    END IF;
  END IF;
  INSERT INTO public.matter_comments (
    matter_id, parent_id, author_kind, author_profile_id, body, mentioned_profile_ids, task_id
  ) VALUES (
    p_matter_id, p_parent_id, v_kind, v_author, trim(p_body), coalesce(p_mentioned_profile_ids, '{}'::uuid[]), p_task_id
  )
  RETURNING id INTO v_id;
  PERFORM public.matter_log_event(
    p_matter_id, 'comment_added',
    CASE WHEN p_task_id IS NULL THEN 'Comment posted. This did not complete the required action.'
         ELSE 'Task comment posted. This did not complete the required action.' END,
    v_kind, v_author, false,
    jsonb_build_object('taskId', p_task_id)
  );
  PERFORM public.matter_add_party(p_matter_id, 'participant', v_kind, v_author, NULL);
  FOREACH v_mention IN ARRAY coalesce(p_mentioned_profile_ids, '{}'::uuid[])
  LOOP
    PERFORM public.matter_notify_actor('person', v_mention, 'matter_mention', 'You were mentioned', 'Someone mentioned you on a Matter.', p_matter_id);
  END LOOP;
  RETURN v_id;
END;
$$;

DROP FUNCTION IF EXISTS public.add_matter_attachment(uuid, text, text, text, text, bigint, text, text, uuid);

CREATE FUNCTION public.add_matter_attachment(
  p_matter_id uuid,
  p_kind text,
  p_file_path text DEFAULT NULL,
  p_file_name text DEFAULT NULL,
  p_content_type text DEFAULT NULL,
  p_byte_size bigint DEFAULT NULL,
  p_url text DEFAULT NULL,
  p_label text DEFAULT NULL,
  p_comment_id uuid DEFAULT NULL,
  p_task_id uuid DEFAULT NULL,
  p_decision_id uuid DEFAULT NULL,
  p_body_text text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_id uuid;
  v_lifecycle text;
BEGIN
  IF v_self IS NULL OR NOT public.can_access_matter(p_matter_id) THEN
    RAISE EXCEPTION 'You cannot add evidence to this Matter.';
  END IF;
  SELECT lifecycle_status INTO v_lifecycle FROM public.matters WHERE id = p_matter_id;
  IF v_lifecycle = 'closed' THEN
    RAISE EXCEPTION 'This Matter is closed.';
  END IF;
  INSERT INTO public.matter_attachments (
    matter_id, comment_id, kind, file_path, file_name, content_type, byte_size, url, label,
    uploaded_by_profile_id, task_id, decision_id, body_text
  ) VALUES (
    p_matter_id, p_comment_id, coalesce(p_kind, 'file'), p_file_path, p_file_name, p_content_type, p_byte_size,
    p_url, p_label, v_self, p_task_id, p_decision_id, nullif(trim(coalesce(p_body_text, '')), '')
  )
  RETURNING id INTO v_id;
  IF p_task_id IS NOT NULL THEN
    PERFORM public.matter_log_event(
      p_matter_id, 'completion_evidence_added',
      coalesce(nullif(trim(coalesce(p_label, '')), ''), 'Evidence added to a Task.'),
      'person', v_self, false, jsonb_build_object('taskId', p_task_id, 'attachmentId', v_id)
    );
  END IF;
  RETURN v_id;
END;
$$;

ALTER TABLE public.matter_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_decision_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS matter_responsibilities_select ON public.matter_responsibilities;
CREATE POLICY matter_responsibilities_select ON public.matter_responsibilities FOR SELECT TO authenticated
  USING (public.can_access_matter(matter_id));
DROP POLICY IF EXISTS collaboration_tasks_select ON public.collaboration_tasks;
CREATE POLICY collaboration_tasks_select ON public.collaboration_tasks FOR SELECT TO authenticated
  USING (public.can_access_matter(matter_id));
DROP POLICY IF EXISTS task_assignments_select ON public.task_assignments;
CREATE POLICY task_assignments_select ON public.task_assignments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.collaboration_tasks t
    WHERE t.id = task_assignments.task_id AND public.can_access_matter(t.matter_id)
  ));
DROP POLICY IF EXISTS task_dependencies_select ON public.task_dependencies;
CREATE POLICY task_dependencies_select ON public.task_dependencies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.collaboration_tasks t
    WHERE t.id = task_dependencies.task_id AND public.can_access_matter(t.matter_id)
  ));
DROP POLICY IF EXISTS matter_decisions_select ON public.matter_decisions;
CREATE POLICY matter_decisions_select ON public.matter_decisions FOR SELECT TO authenticated
  USING (public.can_access_matter(matter_id));
DROP POLICY IF EXISTS matter_decision_tasks_select ON public.matter_decision_tasks;
CREATE POLICY matter_decision_tasks_select ON public.matter_decision_tasks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matter_decisions d
    WHERE d.id = matter_decision_tasks.decision_id AND public.can_access_matter(d.matter_id)
  ));

GRANT SELECT ON public.matter_responsibilities TO authenticated;
GRANT SELECT ON public.collaboration_tasks TO authenticated;
GRANT SELECT ON public.task_assignments TO authenticated;
GRANT SELECT ON public.task_dependencies TO authenticated;
GRANT SELECT ON public.matter_decisions TO authenticated;
GRANT SELECT ON public.matter_decision_tasks TO authenticated;

REVOKE ALL ON FUNCTION public.matter_ensure_lead_responsibility(uuid, text, uuid, text) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_sync_headline(uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_activate_task(uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_release_dependents(uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_complete_action(uuid, text, uuid, text) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_assign_action(uuid, text, text, uuid, text, text, text, text, uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_close(uuid, text, text, text, uuid, boolean) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.process_matter_action_timeouts() FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_row_json(uuid) FROM PUBLIC, authenticated;

GRANT EXECUTE ON FUNCTION public.process_matter_action_timeouts() TO postgres;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.process_matter_action_timeouts() TO service_role;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.start_matter_collaborative_work(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_matter_participant(uuid, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_collaboration_task(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_task_dependency(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_collaboration_action(uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.propose_matter_decision(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_matter_collaborative_work(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_matter_comment(uuid, text, uuid, text, uuid[], uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_matter_attachment(uuid, text, text, text, text, bigint, text, text, uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_matters(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_matter(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.matter_is_responsible_lead(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.matter_can_manage_work(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.matter_task_is_blocked(uuid) TO authenticated;

COMMENT ON TABLE public.collaboration_tasks IS
  'Generic Task records. Phase 2 parent is Matter only. Completing a Task never resolves the Matter. AI_AGENT actors are reserved and not activated.';
COMMENT ON FUNCTION public.list_matters(text) IS
  'Read-only Matter queues. Includes Task acceptance, execution, review, and Decision confirmation in needs_action.';





