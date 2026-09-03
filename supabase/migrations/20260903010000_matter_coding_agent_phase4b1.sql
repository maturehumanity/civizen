-- Matter Collaboration Phase 4B1: Controlled Coding Agent Execution.
-- Coding Agent is a Phase 4A ai_agents role. File/command authority is enforced by the
-- development trusted runner, not by Edge Functions or model output.

-- ---------------------------------------------------------------------------
-- 1. Expand role + artifact checks; register Coding Agent
-- ---------------------------------------------------------------------------

ALTER TABLE public.ai_agents DROP CONSTRAINT IF EXISTS ai_agents_role_type_check;
ALTER TABLE public.ai_agents
  ADD CONSTRAINT ai_agents_role_type_check
  CHECK (role_type IN (
    'research', 'analysis', 'planning', 'facilitation', 'documentation', 'coding'
  ));

ALTER TABLE public.matter_agent_artifacts DROP CONSTRAINT IF EXISTS matter_agent_artifacts_artifact_type_check;
ALTER TABLE public.matter_agent_artifacts
  ADD CONSTRAINT matter_agent_artifacts_artifact_type_check
  CHECK (artifact_type IN (
    'research_summary', 'analysis', 'proposed_plan', 'facilitation_summary',
    'documentation', 'proposed_decision_draft', 'discussion_comment', 'general',
    'implementation_plan', 'code_change', 'scope_expansion_request', 'command_denial'
  ));

INSERT INTO public.ai_agents (
  id, slug, display_name, description, role_type, status, provider_ref, model_ref, capability_profile
) VALUES (
  'b0000000-0000-4000-8000-000000000006',
  'coding',
  'Coding Agent',
  'Implements authorized software Tasks in an isolated worktree. Cannot commit, push, deploy, or apply remote migrations.',
  'coding',
  'active',
  'civi',
  NULL,
  jsonb_build_object(
    'default_capabilities', jsonb_build_array(
      'matter.read', 'discussion.read', 'discussion.comment',
      'task.read', 'task.submit', 'evidence.read', 'evidence.add',
      'repository.read', 'repository.write', 'command.run', 'test.run', 'diff.read', 'artifact.add'
    ),
    'default_context', jsonb_build_array(
      'matter_overview', 'discussion', 'tasks', 'evidence', 'activity'
    )
  )
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  role_type = EXCLUDED.role_type,
  status = EXCLUDED.status,
  capability_profile = EXCLUDED.capability_profile,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.matter_ai_default_capabilities(p_role_type text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_role_type
    WHEN 'research' THEN ARRAY[
      'matter.read', 'discussion.read', 'discussion.comment',
      'task.read', 'task.submit', 'evidence.read', 'evidence.add'
    ]
    WHEN 'analysis' THEN ARRAY[
      'matter.read', 'discussion.read', 'discussion.comment',
      'task.read', 'task.submit', 'evidence.read', 'evidence.add', 'decision.propose'
    ]
    WHEN 'planning' THEN ARRAY[
      'matter.read', 'discussion.read', 'task.read', 'task.propose',
      'evidence.read', 'decision.propose'
    ]
    WHEN 'facilitation' THEN ARRAY[
      'matter.read', 'discussion.read', 'discussion.comment',
      'task.read', 'evidence.read'
    ]
    WHEN 'documentation' THEN ARRAY[
      'matter.read', 'discussion.read', 'discussion.comment',
      'task.read', 'task.submit', 'evidence.read', 'evidence.add'
    ]
    WHEN 'coding' THEN ARRAY[
      'matter.read', 'discussion.read', 'discussion.comment',
      'task.read', 'task.submit', 'evidence.read', 'evidence.add',
      'repository.read', 'repository.write', 'command.run', 'test.run', 'diff.read', 'artifact.add'
    ]
    ELSE ARRAY['matter.read']
  END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Allowlisted repositories and coding execution records
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.coding_repositories (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.coding_repositories (id, slug, display_name, status, notes) VALUES (
  'c0000000-0000-4000-8000-000000000001',
  'maturehumanity/civizen',
  'Civizen application repository',
  'active',
  'Phase 4B1 allowlisted development repository. Runner maps slug to a local checkout; clients cannot supply host paths.'
) ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  display_name = EXCLUDED.display_name,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes;

ALTER TABLE public.matter_agent_assignments
  ADD COLUMN IF NOT EXISTS coding_policy jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.matter_coding_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.matter_agent_assignments(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.ai_agent_runs(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES public.coding_repositories(id) ON DELETE RESTRICT,
  base_commit_sha text NOT NULL,
  workspace_ref text NOT NULL,
  primary_dirty_summary text,
  status text NOT NULL DEFAULT 'preparing'
    CHECK (status IN ('preparing', 'ready', 'active', 'submitted', 'failed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS matter_coding_workspaces_run_idx
  ON public.matter_coding_workspaces (run_id);

CREATE TABLE IF NOT EXISTS public.matter_coding_command_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.matter_coding_workspaces(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.ai_agent_runs(id) ON DELETE CASCADE,
  command_text text NOT NULL,
  allowed boolean NOT NULL,
  category text,
  reason text,
  exit_code integer,
  output_excerpt text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS matter_coding_command_log_run_idx
  ON public.matter_coding_command_log (run_id, created_at);

ALTER TABLE public.coding_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_coding_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_coding_command_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coding_repositories_select ON public.coding_repositories;
CREATE POLICY coding_repositories_select ON public.coding_repositories
  FOR SELECT TO authenticated USING (status = 'active');

DROP POLICY IF EXISTS matter_coding_workspaces_select ON public.matter_coding_workspaces;
CREATE POLICY matter_coding_workspaces_select ON public.matter_coding_workspaces
  FOR SELECT TO authenticated
  USING (public.can_access_matter(matter_id));

DROP POLICY IF EXISTS matter_coding_command_log_select ON public.matter_coding_command_log;
CREATE POLICY matter_coding_command_log_select ON public.matter_coding_command_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matter_coding_workspaces w
      WHERE w.id = workspace_id AND public.can_access_matter(w.matter_id)
    )
  );

GRANT SELECT ON public.coding_repositories TO authenticated;
GRANT SELECT ON public.matter_coding_workspaces TO authenticated;
GRANT SELECT ON public.matter_coding_command_log TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Assignment + plan/scope RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.assign_matter_coding_agent(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_id uuid;
  v_repo public.coding_repositories%ROWTYPE;
  v_slug text := lower(trim(coalesce(payload->>'repository_slug', 'maturehumanity/civizen')));
  v_paths jsonb := coalesce(payload->'allowed_paths', '[]'::jsonb);
  v_policy jsonb;
BEGIN
  IF jsonb_typeof(v_paths) <> 'array' OR jsonb_array_length(v_paths) < 1 THEN
    RAISE EXCEPTION 'Choose at least one allowed path for the Coding Agent.';
  END IF;
  SELECT * INTO v_repo FROM public.coding_repositories WHERE slug = v_slug AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repository is not allowlisted for Coding Agent execution.';
  END IF;
  IF payload ? 'workspace_path' OR payload ? 'host_path' OR payload ? 'repo_root' THEN
    RAISE EXCEPTION 'Host filesystem paths cannot be supplied by clients.';
  END IF;

  v_policy := jsonb_build_object(
    'repository_id', v_repo.id,
    'repository_slug', v_repo.slug,
    'allowed_paths', v_paths,
    'denied_paths', coalesce(payload->'denied_paths', '[]'::jsonb),
    'command_policy', 'phase4b1_dev',
    'network_policy', 'none',
    'max_execution_time_ms', coalesce((payload->>'max_execution_time_ms')::int, 180000),
    'max_commands', coalesce((payload->>'max_commands')::int, 40),
    'max_revision_runs', coalesce((payload->>'max_revision_runs')::int, 3),
    'require_plan_approval', coalesce((payload->>'require_plan_approval')::boolean, true),
    'required_gates', coalesce(payload->'required_gates', '[]'::jsonb),
    'base_commit_sha', nullif(trim(coalesce(payload->>'base_commit_sha', '')), '')
  );

  v_assignment_id := public.assign_matter_ai_agent(jsonb_build_object(
    'matter_id', payload->>'matter_id',
    'agent_role_type', 'coding',
    'instructions', payload->>'instructions',
    'supervising_profile_id', payload->>'supervising_profile_id',
    'task_title', coalesce(payload->>'task_title', 'Implement authorized code change')
  ));

  UPDATE public.matter_agent_assignments
  SET coding_policy = v_policy, updated_at = now()
  WHERE id = v_assignment_id;

  PERFORM public.matter_log_event(
    (payload->>'matter_id')::uuid, 'ai_coding_authorized',
    'Coding Agent authorized for ' || v_repo.slug || ' (development runner; no commit/push/deploy).',
    'person', public.current_profile_id(), false,
    jsonb_build_object(
      'assignmentId', v_assignment_id,
      'repositorySlug', v_repo.slug,
      'allowedPaths', v_paths
    )
  );
  RETURN v_assignment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_matter_coding_plan(
  p_artifact_id uuid,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_artifact public.matter_agent_artifacts%ROWTYPE;
  v_assignment public.matter_agent_assignments%ROWTYPE;
  v_run public.ai_agent_runs%ROWTYPE;
  v_new_run uuid;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to approve a coding plan.';
  END IF;
  SELECT * INTO v_artifact FROM public.matter_agent_artifacts WHERE id = p_artifact_id;
  IF NOT FOUND OR v_artifact.artifact_type <> 'implementation_plan' THEN
    RAISE EXCEPTION 'Implementation plan not found.';
  END IF;
  IF NOT public.matter_can_manage_work(v_artifact.matter_id)
     AND NOT public.can_access_matter(v_artifact.matter_id) THEN
    RAISE EXCEPTION 'You cannot approve this plan.';
  END IF;
  IF NOT public.matter_can_manage_work(v_artifact.matter_id) THEN
    RAISE EXCEPTION 'Only a Responsible Lead or Collaborator can approve a coding plan.';
  END IF;
  SELECT * INTO v_assignment FROM public.matter_agent_assignments WHERE id = v_artifact.assignment_id;
  SELECT * INTO v_run FROM public.ai_agent_runs WHERE id = v_artifact.run_id;
  IF v_run.status NOT IN ('waiting_for_human', 'queued', 'running') THEN
    RAISE EXCEPTION 'This plan is no longer awaiting approval.';
  END IF;

  UPDATE public.matter_agent_artifacts
  SET review_status = 'accepted'
  WHERE id = p_artifact_id;

  UPDATE public.ai_agent_runs
  SET status = 'queued',
      usage_metadata = coalesce(usage_metadata, '{}'::jsonb) || jsonb_build_object(
        'plan_approved_by', v_self,
        'plan_approved_at', now(),
        'plan_note', nullif(trim(coalesce(p_note, '')), '')
      )
  WHERE id = v_run.id;

  UPDATE public.matter_agent_assignments
  SET status = 'queued', updated_at = now()
  WHERE id = v_assignment.id
    AND status NOT IN ('cancelled', 'completed');

  PERFORM public.matter_log_event(
    v_artifact.matter_id, 'ai_coding_plan_approved',
    'Coding implementation plan approved. Execution remains on the development runner.',
    'person', v_self, false,
    jsonb_build_object(
      'assignmentId', v_assignment.id,
      'runId', v_run.id,
      'artifactId', v_artifact.id
    )
  );
  v_new_run := v_run.id;
  RETURN v_new_run;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_matter_coding_scope_expansion(
  p_artifact_id uuid,
  p_path text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_artifact public.matter_agent_artifacts%ROWTYPE;
  v_path text := trim(coalesce(p_path, ''));
  v_policy jsonb;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to expand coding scope.';
  END IF;
  SELECT * INTO v_artifact FROM public.matter_agent_artifacts WHERE id = p_artifact_id;
  IF NOT FOUND OR v_artifact.artifact_type <> 'scope_expansion_request' THEN
    RAISE EXCEPTION 'Scope expansion request not found.';
  END IF;
  IF NOT public.matter_can_manage_work(v_artifact.matter_id) THEN
    RAISE EXCEPTION 'Only a Responsible Lead or Collaborator can expand coding scope.';
  END IF;
  IF char_length(v_path) < 3 THEN
    RAISE EXCEPTION 'Specify the path to authorize.';
  END IF;
  IF v_path LIKE '/%' OR v_path LIKE '%..%' OR lower(v_path) LIKE '%.env%' THEN
    RAISE EXCEPTION 'That path cannot be authorized.';
  END IF;

  SELECT coding_policy INTO v_policy
  FROM public.matter_agent_assignments
  WHERE id = v_artifact.assignment_id;

  v_policy := jsonb_set(
    v_policy,
    '{allowed_paths}',
    coalesce(v_policy->'allowed_paths', '[]'::jsonb) || to_jsonb(v_path),
    true
  );

  UPDATE public.matter_agent_assignments
  SET coding_policy = v_policy, updated_at = now()
  WHERE id = v_artifact.assignment_id;

  UPDATE public.matter_agent_artifacts
  SET review_status = 'accepted'
  WHERE id = p_artifact_id;

  PERFORM public.matter_log_event(
    v_artifact.matter_id, 'ai_coding_scope_expanded',
    'Coding Agent path scope expanded after human approval: ' || v_path,
    'person', v_self, false,
    jsonb_build_object(
      'assignmentId', v_artifact.assignment_id,
      'artifactId', v_artifact.id,
      'path', v_path
    )
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Service-role runner records (never granted to authenticated)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_matter_coding_workspace(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.matter_coding_workspaces (
    assignment_id, run_id, matter_id, repository_id, base_commit_sha,
    workspace_ref, primary_dirty_summary, status, started_at
  ) VALUES (
    (payload->>'assignment_id')::uuid,
    (payload->>'run_id')::uuid,
    (payload->>'matter_id')::uuid,
    (payload->>'repository_id')::uuid,
    payload->>'base_commit_sha',
    payload->>'workspace_ref',
    nullif(payload->>'primary_dirty_summary', ''),
    coalesce(nullif(payload->>'status', ''), 'ready'),
    now()
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.append_matter_coding_command_log(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.matter_coding_command_log (
    workspace_id, run_id, command_text, allowed, category, reason, exit_code, output_excerpt
  ) VALUES (
    (payload->>'workspace_id')::uuid,
    (payload->>'run_id')::uuid,
    left(payload->>'command_text', 500),
    coalesce((payload->>'allowed')::boolean, false),
    payload->>'category',
    left(coalesce(payload->>'reason', ''), 500),
    (payload->>'exit_code')::int,
    left(coalesce(payload->>'output_excerpt', ''), 4000)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_matter_coding_workspace(jsonb) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.append_matter_coding_command_log(jsonb) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_matter_coding_agent(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_matter_coding_plan(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_matter_coding_scope_expansion(uuid, text) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.record_matter_coding_workspace(jsonb) TO service_role;
    GRANT EXECUTE ON FUNCTION public.append_matter_coding_command_log(jsonb) TO service_role;
    GRANT EXECUTE ON FUNCTION public.matter_complete_agent_run_service(jsonb) TO service_role;
  END IF;
END $$;

COMMENT ON TABLE public.coding_repositories IS
  'Phase 4B1 allowlisted repositories. Clients authorize by slug; host paths are mapped only by the development runner.';
COMMENT ON COLUMN public.matter_agent_assignments.coding_policy IS
  'Phase 4B1 structured coding policy: repository slug, allowed/denied paths, command policy id, limits. Not a raw shell permission.';
COMMENT ON FUNCTION public.assign_matter_coding_agent(jsonb) IS
  'Authorize Coding Agent on a Matter with explicit repository slug and path scope. Does not start host execution.';
COMMENT ON FUNCTION public.approve_matter_coding_plan(uuid, text) IS
  'Human approval of a Coding Agent implementation plan. Re-queues the same run for the development worktree runner.';
COMMENT ON FUNCTION public.approve_matter_coding_scope_expansion(uuid, text) IS
  'Human-authorized path expansion. The Coding Agent cannot expand its own scope.';
COMMENT ON TABLE public.matter_coding_workspaces IS
  'Isolated development worktree records. workspace_ref is written only by the trusted runner, never by clients.';
COMMENT ON TABLE public.matter_coding_command_log IS
  'Coding Agent command audit. Denied commands are recorded without secret values.';
