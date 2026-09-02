-- Fix agent run service self-blocking on completion.

CREATE OR REPLACE FUNCTION public.matter_complete_agent_run_service(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_id uuid := (payload->>'assignment_id')::uuid;
  v_run_id uuid := (payload->>'run_id')::uuid;
  v_assignment public.matter_agent_assignments%ROWTYPE;
  v_run public.ai_agent_runs%ROWTYPE;
  v_task public.collaboration_tasks%ROWTYPE;
  v_action public.matter_action_requirements%ROWTYPE;
  v_agent public.ai_agents%ROWTYPE;
  v_artifact_id uuid;
  v_artifact_type text := coalesce(nullif(trim(payload->>'artifact_type'), ''), 'general');
  v_title text := coalesce(nullif(trim(payload->>'title'), ''), 'AI submission');
  v_body text := coalesce(nullif(trim(payload->>'body'), ''), nullif(trim(payload->>'output_summary'), ''));
  v_comment text := nullif(trim(coalesce(payload->>'comment_body', '')), '');
BEGIN
  PERFORM set_config('civizen.matter_agent_run', coalesce(v_run_id::text, v_assignment_id::text), true);

  IF v_assignment_id IS NULL OR v_run_id IS NULL THEN
    RAISE EXCEPTION 'assignment_id and run_id are required.';
  END IF;

  SELECT * INTO v_assignment
  FROM public.matter_agent_assignments
  WHERE id = v_assignment_id
  FOR UPDATE;
  IF NOT FOUND OR v_assignment.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'Agent assignment is not active.';
  END IF;
  SELECT * INTO v_run
  FROM public.ai_agent_runs
  WHERE id = v_run_id AND assignment_id = v_assignment_id
  FOR UPDATE;
  IF NOT FOUND OR v_run.status NOT IN ('queued', 'running') THEN
    RAISE EXCEPTION 'Agent run is not actionable.';
  END IF;
  SELECT * INTO v_agent FROM public.ai_agents WHERE id = v_assignment.agent_id;
  IF NOT FOUND OR v_agent.status <> 'active' THEN
    RAISE EXCEPTION 'Agent is not active.';
  END IF;
  IF (SELECT lifecycle_status FROM public.matters WHERE id = v_assignment.matter_id) = 'closed' THEN
    RAISE EXCEPTION 'This Matter is closed.';
  END IF;
  IF v_body IS NULL OR char_length(v_body) < 1 THEN
    RAISE EXCEPTION 'Provide agent output body or output_summary.';
  END IF;

  UPDATE public.ai_agent_runs
  SET status = 'submitted',
      started_at = coalesce(started_at, now()),
      finished_at = now(),
      output_summary = coalesce(nullif(trim(payload->>'output_summary'), ''), left(v_body, 4000)),
      usage_metadata = coalesce(payload->'usage_metadata', '{}'::jsonb)
  WHERE id = v_run_id;

  INSERT INTO public.matter_agent_artifacts (
    run_id, assignment_id, matter_id, artifact_type, title, body,
    source_references, generated_by_agent_id
  ) VALUES (
    v_run_id, v_assignment.id, v_assignment.matter_id, v_artifact_type, v_title, v_body,
    coalesce(payload->'source_references', '[]'::jsonb), v_assignment.agent_id
  )
  RETURNING id INTO v_artifact_id;

  IF v_comment IS NOT NULL AND public.matter_ai_agent_has_capability(v_assignment.id, 'discussion.comment') THEN
    PERFORM public.add_matter_ai_comment(v_assignment.id, v_comment, v_run_id);
  END IF;

  IF v_assignment.task_id IS NOT NULL THEN
    SELECT * INTO v_task FROM public.collaboration_tasks WHERE id = v_assignment.task_id FOR UPDATE;
    SELECT * INTO v_action
    FROM public.matter_action_requirements
    WHERE matter_id = v_assignment.matter_id
      AND context_kind = 'task'
      AND context_id = v_assignment.task_id
      AND action_type = 'complete_task'
      AND assigned_kind = 'ai_agent'
      AND assigned_agent_id = v_assignment.agent_id
      AND status IN ('pending', 'overdue')
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      PERFORM public.matter_complete_action(v_action.id, 'ai_agent', NULL, 'submit', v_assignment.agent_id);
      UPDATE public.collaboration_tasks
      SET status = 'under_review',
          submitted_at = now(),
          waiting_condition = NULL,
          updated_at = now()
      WHERE id = v_task.id;
      PERFORM public.matter_log_event(
        v_assignment.matter_id, 'ai_work_submitted',
        v_agent.display_name || ' submitted work for review: ' || v_task.title || '.',
        'ai_agent', NULL, false,
        jsonb_build_object(
          'assignmentId', v_assignment.id,
          'runId', v_run_id,
          'artifactId', v_artifact_id,
          'taskId', v_task.id
        ),
        v_assignment.agent_id
      );
      PERFORM public.matter_assign_action(
        v_assignment.matter_id, 'review_task',
        v_assignment.supervising_kind, v_assignment.supervising_profile_id, NULL,
        'task_review', 'remind', 'task', v_task.id, NULL, NULL
      );
      PERFORM public.matter_notify_actor(
        v_assignment.supervising_kind, v_assignment.supervising_profile_id,
        'ai_work_submitted_for_review',
        'AI work ready for review',
        v_agent.display_name || ' submitted work that needs your review.',
        v_assignment.matter_id
      );
      UPDATE public.matter_agent_assignments
      SET status = 'awaiting_review', updated_at = now()
      WHERE id = v_assignment.id;
    END IF;
  ELSE
    UPDATE public.matter_agent_assignments
    SET status = 'submitted', completed_at = now(), updated_at = now()
    WHERE id = v_assignment.id;
    PERFORM public.matter_log_event(
      v_assignment.matter_id, 'ai_work_submitted',
      v_agent.display_name || ' completed an AI assignment.',
      'ai_agent', NULL, false,
      jsonb_build_object('assignmentId', v_assignment.id, 'runId', v_run_id, 'artifactId', v_artifact_id),
      v_assignment.agent_id
    );
  END IF;

  PERFORM set_config('civizen.matter_agent_run', '', true);
  RETURN v_artifact_id;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('civizen.matter_agent_run', '', true);
    RAISE;
END;
$$;
