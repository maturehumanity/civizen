-- Phase 4A stabilization: restore Phase 3 get_matter fields, agent run authorization, plan adoption.

CREATE OR REPLACE FUNCTION public.authorize_matter_agent_run(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_run public.ai_agent_runs%ROWTYPE;
  v_assignment public.matter_agent_assignments%ROWTYPE;
  v_matter public.matters%ROWTYPE;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to trigger an agent run.';
  END IF;
  IF p_run_id IS NULL THEN
    RAISE EXCEPTION 'run_id is required.';
  END IF;

  SELECT * INTO v_run FROM public.ai_agent_runs WHERE id = p_run_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent run not found.';
  END IF;
  IF v_run.status NOT IN ('queued', 'running') THEN
    RAISE EXCEPTION 'This agent run is not actionable.';
  END IF;

  SELECT * INTO v_assignment
  FROM public.matter_agent_assignments
  WHERE id = v_run.assignment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent assignment not found.';
  END IF;
  IF v_assignment.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'This agent assignment is not active.';
  END IF;
  IF v_assignment.agent_id IS DISTINCT FROM (
    SELECT ma.agent_id FROM public.matter_agent_assignments ma WHERE ma.id = v_run.assignment_id
  ) THEN
    RAISE EXCEPTION 'Agent identity mismatch.';
  END IF;
  IF v_run.assignment_id IS DISTINCT FROM v_assignment.id THEN
    RAISE EXCEPTION 'Run does not belong to this assignment.';
  END IF;

  SELECT * INTO v_matter FROM public.matters WHERE id = v_assignment.matter_id;
  IF NOT FOUND OR NOT public.can_access_matter(v_assignment.matter_id) THEN
    RAISE EXCEPTION 'You cannot access this Matter.';
  END IF;
  IF v_matter.lifecycle_status = 'closed' THEN
    RAISE EXCEPTION 'This Matter is closed.';
  END IF;

  IF NOT (
    public.matter_can_manage_work(v_assignment.matter_id)
    OR (
      v_assignment.supervising_kind = 'person'
      AND v_assignment.supervising_profile_id = v_self
    )
    OR public.current_profile_represents_actor(v_assignment.supervising_kind, v_assignment.supervising_profile_id)
  ) THEN
    RAISE EXCEPTION 'You are not authorized to trigger this agent run.';
  END IF;

  RETURN jsonb_build_object(
    'authorized', true,
    'run_id', v_run.id,
    'assignment_id', v_assignment.id,
    'agent_id', v_assignment.agent_id,
    'matter_id', v_assignment.matter_id,
    'task_id', v_assignment.task_id,
    'role_type', (SELECT a.role_type FROM public.ai_agents a WHERE a.id = v_assignment.agent_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_matter_agent_run_service(
  p_run_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.ai_agent_runs%ROWTYPE;
  v_assignment public.matter_agent_assignments%ROWTYPE;
  v_agent public.ai_agents%ROWTYPE;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
BEGIN
  SELECT * INTO v_run FROM public.ai_agent_runs WHERE id = p_run_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent run not found.';
  END IF;
  IF v_run.status IN ('submitted', 'cancelled') THEN
    RAISE EXCEPTION 'Completed agent runs cannot be failed.';
  END IF;
  SELECT * INTO v_assignment FROM public.matter_agent_assignments WHERE id = v_run.assignment_id;
  SELECT * INTO v_agent FROM public.ai_agents WHERE id = v_assignment.agent_id;

  UPDATE public.ai_agent_runs
  SET status = 'failed',
      failure_reason = coalesce(v_reason, 'Agent execution failed.'),
      finished_at = coalesce(finished_at, now())
  WHERE id = p_run_id;

  UPDATE public.matter_agent_assignments
  SET status = 'failed', updated_at = now()
  WHERE id = v_assignment.id
    AND status NOT IN ('cancelled', 'completed');

  PERFORM public.matter_log_event(
    v_assignment.matter_id, 'ai_run_failed',
    coalesce(v_agent.display_name, 'AI Agent') || ' run failed: ' || coalesce(v_reason, 'execution error'),
    'ai_agent', NULL, true,
    jsonb_build_object('assignmentId', v_assignment.id, 'runId', p_run_id),
    v_assignment.agent_id
  );

  PERFORM public.matter_notify_actor(
    v_assignment.supervising_kind, v_assignment.supervising_profile_id,
    'ai_run_failed', 'AI agent run failed',
    coalesce(v_agent.display_name, 'An AI agent') || ' could not complete its assignment.',
    v_assignment.matter_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.adopt_matter_agent_plan_task(
  p_artifact_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_depends_on_titles text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_artifact public.matter_agent_artifacts%ROWTYPE;
  v_task_id uuid;
  v_dep_title text;
  v_dep_id uuid;
  v_dep_ids uuid[] := '{}'::uuid[];
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to adopt a proposed Task.';
  END IF;
  SELECT * INTO v_artifact FROM public.matter_agent_artifacts WHERE id = p_artifact_id;
  IF NOT FOUND OR NOT public.can_access_matter(v_artifact.matter_id) THEN
    RAISE EXCEPTION 'Artifact not found.';
  END IF;
  IF v_artifact.artifact_type <> 'proposed_plan' THEN
    RAISE EXCEPTION 'Only planning proposals can be adopted as Tasks.';
  END IF;
  IF NOT public.matter_can_manage_work(v_artifact.matter_id) THEN
    RAISE EXCEPTION 'Only a Responsible Lead or Collaborator can adopt AI plan Tasks.';
  END IF;
  IF char_length(trim(coalesce(p_title, ''))) < 3 THEN
    RAISE EXCEPTION 'Add a Task title.';
  END IF;
  IF (SELECT lifecycle_status FROM public.matters WHERE id = v_artifact.matter_id) = 'closed' THEN
    RAISE EXCEPTION 'This Matter is closed.';
  END IF;

  IF (SELECT collaborative_work_started_at FROM public.matters WHERE id = v_artifact.matter_id) IS NULL THEN
    PERFORM public.start_matter_collaborative_work(v_artifact.matter_id);
  END IF;

  IF p_depends_on_titles IS NOT NULL THEN
    FOREACH v_dep_title IN ARRAY p_depends_on_titles
    LOOP
      IF nullif(trim(v_dep_title), '') IS NULL THEN
        CONTINUE;
      END IF;
      SELECT t.id INTO v_dep_id
      FROM public.collaboration_tasks t
      WHERE t.matter_id = v_artifact.matter_id
        AND lower(trim(t.title)) = lower(trim(v_dep_title))
      ORDER BY t.created_at DESC
      LIMIT 1;
      IF v_dep_id IS NULL THEN
        RAISE EXCEPTION 'Dependency Task not found: %', v_dep_title;
      END IF;
      v_dep_ids := array_append(v_dep_ids, v_dep_id);
    END LOOP;
  END IF;

  v_task_id := public.create_collaboration_task(jsonb_build_object(
    'matter_id', v_artifact.matter_id,
    'title', trim(p_title),
    'description', coalesce(
      nullif(trim(coalesce(p_description, '')), ''),
      'Created from Planning Agent proposal (artifact ' || v_artifact.id::text || ').'
    ),
    'review_required', false,
    'depends_on', to_jsonb(v_dep_ids)
  ));

  PERFORM public.matter_log_event(
    v_artifact.matter_id, 'ai_plan_task_adopted',
    public.matter_profile_display_name(v_self)
      || ' created a Task from Planning Agent proposal: ' || trim(p_title) || '.',
    'person', v_self, false,
    jsonb_build_object(
      'artifactId', v_artifact.id,
      'runId', v_artifact.run_id,
      'assignmentId', v_artifact.assignment_id,
      'proposedTitle', trim(p_title),
      'taskId', v_task_id,
      'dependsOnTitles', coalesce(p_depends_on_titles, '{}'::text[])
    )
  );

  RETURN v_task_id;
END;
$$;

-- Restore Phase 3 detail fields dropped by Phase 4A get_matter.
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
        'author_display_name', CASE
          WHEN c.is_ai_agent THEN public.matter_actor_display_name('ai_agent', NULL, c.agent_id)
          ELSE public.matter_profile_display_name(c.author_profile_id)
        END
      ) ORDER BY c.created_at)
      FROM public.matter_comments c WHERE c.matter_id = p_matter_id
    ), '[]'::jsonb),
    'events', coalesce((
      SELECT jsonb_agg(to_jsonb(e) || jsonb_build_object(
        'actor_display_name', CASE
          WHEN e.is_system OR e.actor_kind = 'system' THEN 'Civizen'
          WHEN e.actor_kind = 'ai_agent' THEN public.matter_actor_display_name('ai_agent', NULL, e.actor_agent_id)
          ELSE public.matter_profile_display_name(e.actor_profile_id)
        END
      ) ORDER BY e.created_at)
      FROM public.matter_events e WHERE e.matter_id = p_matter_id
    ), '[]'::jsonb),
    'parties', coalesce((
      SELECT jsonb_agg(to_jsonb(p) || jsonb_build_object(
        'actor_display_name', public.matter_actor_display_name(
          p.actor_kind, p.actor_profile_id, p.actor_agent_id
        )
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
        'lead_display_name', public.matter_actor_display_name(
          t.lead_kind, t.lead_profile_id,
          (SELECT ta.actor_agent_id FROM public.task_assignments ta
           WHERE ta.task_id = t.id AND ta.role = 'lead' AND ta.actor_kind = 'ai_agent'
           ORDER BY ta.assigned_at DESC LIMIT 1)
        ),
        'created_by_display_name', public.matter_profile_display_name(t.created_by_profile_id),
        'is_blocked', public.matter_task_is_blocked(t.id),
        'assignments', coalesce((
          SELECT jsonb_agg(to_jsonb(asg) || jsonb_build_object(
            'actor_display_name', public.matter_actor_display_name(
              asg.actor_kind, asg.actor_profile_id, asg.actor_agent_id
            )
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
    ), '[]'::jsonb),
    'resolutions', coalesce((
      SELECT jsonb_agg(to_jsonb(r) || jsonb_build_object(
        'proposed_by_display_name', public.matter_profile_display_name(r.proposed_by_profile_id)
      ) ORDER BY r.attempt_number)
      FROM public.matter_resolutions r WHERE r.matter_id = p_matter_id
    ), '[]'::jsonb),
    'evaluations', coalesce((
      SELECT jsonb_agg(to_jsonb(ev) || jsonb_build_object(
        'evaluator_display_name', public.matter_profile_display_name(ev.evaluator_profile_id)
      ) ORDER BY ev.created_at)
      FROM public.matter_evaluations ev WHERE ev.matter_id = p_matter_id
    ), '[]'::jsonb),
    'outcome_followups', coalesce((
      SELECT jsonb_agg(to_jsonb(ofu) || jsonb_build_object(
        'reviewer_display_name', public.matter_profile_display_name(ofu.reviewer_profile_id)
      ) ORDER BY ofu.created_at)
      FROM public.matter_outcome_followups ofu WHERE ofu.matter_id = p_matter_id
    ), '[]'::jsonb),
    'relationships', coalesce((
      SELECT jsonb_agg(to_jsonb(rel) ORDER BY rel.created_at)
      FROM public.matter_relationships rel
      WHERE rel.from_matter_id = p_matter_id OR rel.to_matter_id = p_matter_id
    ), '[]'::jsonb),
    'pattern_counts', public.matter_pattern_counts(p_matter_id),
    'agent_assignments', coalesce((
      SELECT jsonb_agg(to_jsonb(ma) || jsonb_build_object(
        'agent_display_name', public.matter_actor_display_name('ai_agent', NULL, ma.agent_id),
        'agent_role_type', (SELECT a.role_type FROM public.ai_agents a WHERE a.id = ma.agent_id),
        'supervising_display_name', public.matter_profile_display_name(ma.supervising_profile_id),
        'assigned_by_display_name', public.matter_profile_display_name(ma.assigned_by_profile_id)
      ) ORDER BY ma.assigned_at)
      FROM public.matter_agent_assignments ma WHERE ma.matter_id = p_matter_id
    ), '[]'::jsonb),
    'agent_runs', coalesce((
      SELECT jsonb_agg(to_jsonb(r) || jsonb_build_object(
        'agent_display_name', public.matter_actor_display_name(
          'ai_agent', NULL,
          (SELECT ma.agent_id FROM public.matter_agent_assignments ma WHERE ma.id = r.assignment_id)
        )
      ) ORDER BY r.created_at)
      FROM public.ai_agent_runs r
      JOIN public.matter_agent_assignments ma ON ma.id = r.assignment_id
      WHERE ma.matter_id = p_matter_id
    ), '[]'::jsonb),
    'agent_artifacts', coalesce((
      SELECT jsonb_agg(to_jsonb(art) || jsonb_build_object(
        'agent_display_name', public.matter_actor_display_name('ai_agent', NULL, art.generated_by_agent_id),
        'run_revision_number', (SELECT rr.revision_number FROM public.ai_agent_runs rr WHERE rr.id = art.run_id)
      ) ORDER BY art.created_at)
      FROM public.matter_agent_artifacts art
      WHERE art.matter_id = p_matter_id
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.authorize_matter_agent_run(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fail_matter_agent_run_service(uuid, text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_matter_agent_run(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adopt_matter_agent_plan_task(uuid, text, text, text[]) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.fail_matter_agent_run_service(uuid, text) TO service_role;
  END IF;
END $$;

COMMENT ON FUNCTION public.authorize_matter_agent_run(uuid) IS
  'Phase 4A: verify the authenticated caller may trigger a specific queued/running agent run.';
COMMENT ON FUNCTION public.adopt_matter_agent_plan_task(uuid, text, text, text[]) IS
  'Phase 4A: human adopts one proposed Task from a Planning Agent artifact into a normal collaboration_task.';
COMMENT ON FUNCTION public.get_matter(uuid) IS
  'Matter detail bundle including Phase 2 work, Phase 3 resolution/outcome, and Phase 4A AI assignments.';
