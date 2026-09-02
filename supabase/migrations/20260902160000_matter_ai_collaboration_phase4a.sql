-- Matter Collaboration Phase 4A: First-Class Human–AI Collaboration Foundation.
-- AI agents are explicit Matter participants using the existing Task / Action Requirement /
-- Submission / Review architecture. AI is never Responsible Lead and cannot close Matters,
-- confirm Resolution, or accept institutional responsibility.
-- Provider/model backends remain replaceable; agent identity is stable across runs.

-- ---------------------------------------------------------------------------
-- 1. AI agent registry
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_agents (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  role_type text NOT NULL CHECK (role_type IN (
    'research', 'analysis', 'planning', 'facilitation', 'documentation'
  )),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'deprecated')),
  provider_ref text,
  model_ref text,
  capability_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ai_agents (
  id, slug, display_name, description, role_type, status, provider_ref, model_ref, capability_profile
) VALUES
  (
    'b0000000-0000-4000-8000-000000000001',
    'research',
    'Research Agent',
    'Gathers relevant information, standards, precedent, and sourced research summaries for a Matter.',
    'research',
    'active',
    'civi',
    NULL,
    jsonb_build_object(
      'default_capabilities', jsonb_build_array(
        'matter.read', 'discussion.read', 'discussion.comment',
        'task.read', 'task.submit', 'evidence.read', 'evidence.add'
      ),
      'default_context', jsonb_build_array(
        'matter_overview', 'discussion', 'tasks', 'decisions', 'evidence', 'activity'
      )
    )
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'analysis',
    'Analysis Agent',
    'Analyzes documents, evidence, and options; identifies patterns, gaps, and inconsistencies.',
    'analysis',
    'active',
    'civi',
    NULL,
    jsonb_build_object(
      'default_capabilities', jsonb_build_array(
        'matter.read', 'discussion.read', 'discussion.comment',
        'task.read', 'task.submit', 'evidence.read', 'evidence.add', 'decision.propose'
      ),
      'default_context', jsonb_build_array(
        'matter_overview', 'discussion', 'tasks', 'decisions', 'evidence', 'activity'
      )
    )
  ),
  (
    'b0000000-0000-4000-8000-000000000003',
    'planning',
    'Planning Agent',
    'Proposes resolution plans, Task structures, dependencies, risks, and missing information.',
    'planning',
    'active',
    'civi',
    NULL,
    jsonb_build_object(
      'default_capabilities', jsonb_build_array(
        'matter.read', 'discussion.read', 'task.read', 'task.propose',
        'evidence.read', 'decision.propose'
      ),
      'default_context', jsonb_build_array(
        'matter_overview', 'discussion', 'tasks', 'decisions', 'evidence', 'activity'
      )
    )
  ),
  (
    'b0000000-0000-4000-8000-000000000004',
    'facilitation',
    'Facilitation Agent',
    'Summarizes discussion, open questions, agreement/disagreement, and suggested next actions.',
    'facilitation',
    'active',
    'civi',
    NULL,
    jsonb_build_object(
      'default_capabilities', jsonb_build_array(
        'matter.read', 'discussion.read', 'discussion.comment',
        'task.read', 'evidence.read'
      ),
      'default_context', jsonb_build_array(
        'matter_overview', 'discussion', 'tasks', 'decisions', 'activity'
      )
    )
  ),
  (
    'b0000000-0000-4000-8000-000000000005',
    'documentation',
    'Documentation Agent',
    'Prepares reports, specifications, summaries, and structured records from Matter context.',
    'documentation',
    'active',
    'civi',
    NULL,
    jsonb_build_object(
      'default_capabilities', jsonb_build_array(
        'matter.read', 'discussion.read', 'discussion.comment',
        'task.read', 'task.submit', 'evidence.read', 'evidence.add'
      ),
      'default_context', jsonb_build_array(
        'matter_overview', 'discussion', 'tasks', 'decisions', 'evidence', 'activity'
      )
    )
  )
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  role_type = EXCLUDED.role_type,
  status = EXCLUDED.status,
  provider_ref = EXCLUDED.provider_ref,
  model_ref = EXCLUDED.model_ref,
  capability_profile = EXCLUDED.capability_profile,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. Agent assignments, runs, artifacts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.matter_agent_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.collaboration_tasks(id) ON DELETE SET NULL,
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE RESTRICT,
  assigned_by_kind text NOT NULL
    CHECK (assigned_by_kind IN ('person', 'organization', 'group', 'system')),
  assigned_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  supervising_kind text NOT NULL
    CHECK (supervising_kind IN ('person', 'organization', 'group')),
  supervising_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  role_purpose text,
  instructions text NOT NULL,
  allowed_context text[] NOT NULL DEFAULT '{}'::text[],
  allowed_capabilities text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN (
      'active', 'queued', 'running', 'submitted', 'awaiting_review',
      'changes_requested', 'completed', 'failed', 'cancelled'
    )),
  max_run_attempts integer NOT NULL DEFAULT 3 CHECK (max_run_attempts > 0),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matter_agent_assignments_instructions_len
    CHECK (char_length(trim(instructions)) BETWEEN 3 AND 8000)
);

CREATE INDEX IF NOT EXISTS matter_agent_assignments_matter_idx
  ON public.matter_agent_assignments (matter_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS matter_agent_assignments_agent_idx
  ON public.matter_agent_assignments (agent_id, status);
CREATE INDEX IF NOT EXISTS matter_agent_assignments_task_idx
  ON public.matter_agent_assignments (task_id)
  WHERE task_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ai_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.matter_agent_assignments(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.collaboration_tasks(id) ON DELETE SET NULL,
  triggered_by text NOT NULL DEFAULT 'system'
    CHECK (triggered_by IN ('system', 'human', 'retry', 'revision')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN (
      'queued', 'running', 'waiting_for_human', 'submitted', 'failed', 'cancelled'
    )),
  started_at timestamptz,
  finished_at timestamptz,
  input_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_summary text,
  failure_reason text,
  revision_number integer NOT NULL DEFAULT 1 CHECK (revision_number > 0),
  usage_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_agent_runs_assignment_idx
  ON public.ai_agent_runs (assignment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_agent_runs_status_idx
  ON public.ai_agent_runs (status, created_at)
  WHERE status IN ('queued', 'running');

CREATE TABLE IF NOT EXISTS public.matter_agent_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.ai_agent_runs(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.matter_agent_assignments(id) ON DELETE CASCADE,
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  artifact_type text NOT NULL CHECK (artifact_type IN (
    'research_summary', 'analysis', 'proposed_plan', 'facilitation_summary',
    'documentation', 'proposed_decision_draft', 'discussion_comment', 'general'
  )),
  title text NOT NULL,
  body text NOT NULL,
  source_references jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'accepted', 'changes_requested', 'rejected')),
  generated_by_agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE RESTRICT,
  verification_state text NOT NULL DEFAULT 'unverified'
    CHECK (verification_state IN ('unverified', 'human_reviewed', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matter_agent_artifacts_title_len CHECK (char_length(trim(title)) BETWEEN 3 AND 160),
  CONSTRAINT matter_agent_artifacts_body_len CHECK (char_length(trim(body)) BETWEEN 1 AND 80000)
);

CREATE INDEX IF NOT EXISTS matter_agent_artifacts_matter_idx
  ON public.matter_agent_artifacts (matter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS matter_agent_artifacts_assignment_idx
  ON public.matter_agent_artifacts (assignment_id, created_at DESC);


-- ---------------------------------------------------------------------------
-- 3. Extend actor model (no fake profiles for AI)
-- ---------------------------------------------------------------------------

ALTER TABLE public.matter_action_requirements
  ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES public.ai_agents(id) ON DELETE RESTRICT;

ALTER TABLE public.matter_action_requirements
  ALTER COLUMN assigned_profile_id DROP NOT NULL;

ALTER TABLE public.matter_action_requirements
  DROP CONSTRAINT IF EXISTS matter_action_requirements_assigned_kind_check;
ALTER TABLE public.matter_action_requirements
  ADD CONSTRAINT matter_action_requirements_assigned_kind_check
  CHECK (assigned_kind IN ('person', 'organization', 'group', 'ai_agent'));

ALTER TABLE public.matter_action_requirements
  DROP CONSTRAINT IF EXISTS matter_action_requirements_actor_target_check;
ALTER TABLE public.matter_action_requirements
  ADD CONSTRAINT matter_action_requirements_actor_target_check
  CHECK (
    (
      assigned_kind = 'ai_agent'
      AND assigned_agent_id IS NOT NULL
      AND assigned_profile_id IS NULL
    )
    OR (
      assigned_kind <> 'ai_agent'
      AND assigned_profile_id IS NOT NULL
      AND assigned_agent_id IS NULL
    )
  );

ALTER TABLE public.matter_action_requirements
  ADD COLUMN IF NOT EXISTS completed_by_agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL;

ALTER TABLE public.task_assignments
  ADD COLUMN IF NOT EXISTS actor_agent_id uuid REFERENCES public.ai_agents(id) ON DELETE RESTRICT;

ALTER TABLE public.task_assignments
  ALTER COLUMN actor_profile_id DROP NOT NULL;

ALTER TABLE public.task_assignments
  DROP CONSTRAINT IF EXISTS task_assignments_actor_kind_check;
ALTER TABLE public.task_assignments
  ADD CONSTRAINT task_assignments_actor_kind_check
  CHECK (actor_kind IN ('person', 'organization', 'group', 'ai_agent'));

ALTER TABLE public.task_assignments
  DROP CONSTRAINT IF EXISTS task_assignments_actor_target_check;
ALTER TABLE public.task_assignments
  ADD CONSTRAINT task_assignments_actor_target_check
  CHECK (
    (
      actor_kind = 'ai_agent'
      AND actor_agent_id IS NOT NULL
      AND actor_profile_id IS NULL
    )
    OR (
      actor_kind <> 'ai_agent'
      AND actor_profile_id IS NOT NULL
      AND actor_agent_id IS NULL
    )
  );

ALTER TABLE public.matter_parties
  ADD COLUMN IF NOT EXISTS actor_agent_id uuid REFERENCES public.ai_agents(id) ON DELETE CASCADE;

ALTER TABLE public.matter_parties
  ALTER COLUMN actor_profile_id DROP NOT NULL;

ALTER TABLE public.matter_parties
  DROP CONSTRAINT IF EXISTS matter_parties_actor_kind_check;
ALTER TABLE public.matter_parties
  ADD CONSTRAINT matter_parties_actor_kind_check
  CHECK (actor_kind IN ('person', 'organization', 'group', 'ai_agent'));

ALTER TABLE public.matter_parties
  DROP CONSTRAINT IF EXISTS matter_parties_actor_target_check;
ALTER TABLE public.matter_parties
  ADD CONSTRAINT matter_parties_actor_target_check
  CHECK (
    (
      actor_kind = 'ai_agent'
      AND actor_agent_id IS NOT NULL
      AND actor_profile_id IS NULL
    )
    OR (
      actor_kind <> 'ai_agent'
      AND actor_profile_id IS NOT NULL
      AND actor_agent_id IS NULL
    )
  );

ALTER TABLE public.matter_parties
  DROP CONSTRAINT IF EXISTS matter_parties_role_check;
ALTER TABLE public.matter_parties
  ADD CONSTRAINT matter_parties_role_check
  CHECK (role IN (
    'initiator', 'addressee', 'responsible',
    'responsible_lead', 'responsible_collaborator',
    'contributor', 'specialist', 'contractor', 'observer', 'evaluator',
    'invitee', 'follower', 'participant', 'ai_agent'
  ));

ALTER TABLE public.matter_events
  ADD COLUMN IF NOT EXISTS actor_agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL;

ALTER TABLE public.matter_events
  DROP CONSTRAINT IF EXISTS matter_events_actor_kind_check;
ALTER TABLE public.matter_events
  ADD CONSTRAINT matter_events_actor_kind_check
  CHECK (actor_kind IN ('person', 'organization', 'group', 'system', 'ai_agent'));

ALTER TABLE public.matter_comments
  ALTER COLUMN author_profile_id DROP NOT NULL;

ALTER TABLE public.matter_comments
  ADD COLUMN IF NOT EXISTS is_ai_agent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS run_id uuid REFERENCES public.ai_agent_runs(id) ON DELETE SET NULL;

ALTER TABLE public.matter_comments
  DROP CONSTRAINT IF EXISTS matter_comments_author_target_check;
ALTER TABLE public.matter_comments
  ADD CONSTRAINT matter_comments_author_target_check
  CHECK (
    (
      is_ai_agent
      AND agent_id IS NOT NULL
      AND author_kind = 'ai_agent'
      AND author_profile_id IS NULL
    )
    OR (
      NOT is_ai_agent
      AND author_profile_id IS NOT NULL
      AND agent_id IS NULL
    )
  );

ALTER TABLE public.matter_comments
  DROP CONSTRAINT IF EXISTS matter_comments_author_kind_check;
ALTER TABLE public.matter_comments
  ADD CONSTRAINT matter_comments_author_kind_check
  CHECK (author_kind IN ('person', 'organization', 'group', 'ai_agent'));

ALTER TABLE public.matter_parties
  DROP CONSTRAINT IF EXISTS matter_parties_matter_id_role_actor_kind_actor_profile_id_key;
DROP INDEX IF EXISTS public.matter_parties_actor_unique_idx;
CREATE UNIQUE INDEX matter_parties_actor_unique_idx ON public.matter_parties (
  matter_id,
  role,
  actor_kind,
  coalesce(actor_profile_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(actor_agent_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

ALTER TABLE public.task_assignments
  DROP CONSTRAINT IF EXISTS task_assignments_task_id_role_actor_kind_actor_profile_id_key;
DROP INDEX IF EXISTS public.task_assignments_actor_unique_idx;
CREATE UNIQUE INDEX task_assignments_actor_unique_idx ON public.task_assignments (
  task_id,
  role,
  actor_kind,
  coalesce(actor_profile_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(actor_agent_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

ALTER TABLE public.matter_action_requirements
  DROP CONSTRAINT IF EXISTS matter_action_requirements_completed_by_kind_check;
ALTER TABLE public.matter_action_requirements
  ADD CONSTRAINT matter_action_requirements_completed_by_kind_check
  CHECK (completed_by_kind IS NULL OR completed_by_kind IN (
    'person', 'organization', 'group', 'system', 'ai_agent'
  ));

CREATE INDEX IF NOT EXISTS matter_action_requirements_agent_idx
  ON public.matter_action_requirements (assigned_agent_id, status)
  WHERE assigned_agent_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 4. Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.matter_actor_display_name(
  p_kind text,
  p_profile_id uuid DEFAULT NULL,
  p_agent_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN coalesce(p_kind, '') = 'ai_agent' OR p_agent_id IS NOT NULL THEN
      coalesce(
        (SELECT a.display_name FROM public.ai_agents a WHERE a.id = p_agent_id),
        'AI Agent'
      )
    WHEN p_profile_id IS NOT NULL THEN
      public.matter_profile_display_name(p_profile_id)
    ELSE 'System'
  END;
$$;

CREATE OR REPLACE FUNCTION public.matter_ai_agent_has_capability(
  p_assignment_id uuid,
  p_capability text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matter_agent_assignments ma
    WHERE ma.id = p_assignment_id
      AND ma.status NOT IN ('cancelled', 'completed')
      AND p_capability = ANY (ma.allowed_capabilities)
  );
$$;

CREATE OR REPLACE FUNCTION public.matter_ai_assignment_can_read(
  p_assignment_id uuid,
  p_context_scope text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matter_agent_assignments ma
    WHERE ma.id = p_assignment_id
      AND ma.status NOT IN ('cancelled')
      AND p_context_scope = ANY (ma.allowed_context)
  );
$$;

CREATE OR REPLACE FUNCTION public.matter_is_ai_agent_forbidden_responsibility(
  p_matter_id uuid,
  p_agent_id uuid DEFAULT NULL,
  p_intent text DEFAULT 'assignment'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_agent_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.matter_responsibilities r
    WHERE r.matter_id = p_matter_id
      AND r.kind IN ('lead', 'collaborator')
      AND r.status = 'accepted'
      AND r.actor_kind = 'ai_agent'
      AND r.actor_profile_id IS NULL
  ) THEN
    RETURN true;
  END IF;
  IF p_intent IN ('lead', 'responsible', 'responsible_lead', 'responsible_collaborator', 'accept_responsibility') THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_agent_run_blocked_mutations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF nullif(current_setting('civizen.matter_agent_run', true), '') IS NOT NULL THEN
    RAISE EXCEPTION 'AI agent runs cannot close Matters, confirm Resolution, or accept responsibility.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_agent_run_context_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nullif(current_setting('civizen.matter_agent_run', true), '') IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.matter_add_agent_party(
  p_matter_id uuid,
  p_role text,
  p_agent_id uuid,
  p_role_purpose text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := coalesce(nullif(p_role, ''), 'ai_agent');
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.matter_parties mp
    WHERE mp.matter_id = p_matter_id
      AND mp.role = v_role
      AND mp.actor_kind = 'ai_agent'
      AND mp.actor_agent_id = p_agent_id
  ) THEN
    INSERT INTO public.matter_parties (
      matter_id, role, actor_kind, actor_profile_id, actor_agent_id, actor_unit_label
    ) VALUES (
      p_matter_id, v_role, 'ai_agent', NULL, p_agent_id,
      nullif(trim(coalesce(p_role_purpose, '')), '')
    );
  END IF;
END;
$$;

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
    ELSE ARRAY['matter.read']
  END;
$$;

CREATE OR REPLACE FUNCTION public.matter_ai_default_context()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY[
    'matter_overview', 'discussion', 'tasks', 'decisions', 'evidence', 'activity'
  ]::text[];
$$;


-- ---------------------------------------------------------------------------
-- 5. Action clock integration (extend matter_assign_action for ai_agent)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.matter_assign_action(uuid, text, text, uuid, text, text, text, text, uuid, text);

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
  p_escalation_policy_id text DEFAULT NULL,
  p_assigned_agent_id uuid DEFAULT NULL
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
  v_assigned_kind text := coalesce(nullif(p_assigned_kind, ''), 'person');
BEGIN
  IF v_assigned_kind = 'ai_agent' AND p_assigned_agent_id IS NULL THEN
    RAISE EXCEPTION 'AI actions require an agent id.';
  END IF;
  IF v_assigned_kind <> 'ai_agent' AND p_assigned_profile_id IS NULL THEN
    RAISE EXCEPTION 'Human or organization actions require a profile id.';
  END IF;

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
    matter_id, action_type, assigned_kind, assigned_profile_id, assigned_agent_id,
    assigned_unit_label, due_at, reminder_at, timing_policy_id, timeout_action,
    context_kind, context_id, escalation_policy_id
  ) VALUES (
    p_matter_id, p_action_type, v_assigned_kind,
    CASE WHEN v_assigned_kind = 'ai_agent' THEN NULL ELSE p_assigned_profile_id END,
    CASE WHEN v_assigned_kind = 'ai_agent' THEN p_assigned_agent_id ELSE NULL END,
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

  v_name := public.matter_actor_display_name(
    v_assigned_kind,
    CASE WHEN v_assigned_kind = 'ai_agent' THEN NULL ELSE p_assigned_profile_id END,
    p_assigned_agent_id
  );
  PERFORM public.matter_log_event(
    p_matter_id, 'action_assigned',
    'Action assigned to ' || v_name || '.',
    CASE WHEN v_assigned_kind = 'ai_agent' THEN 'ai_agent' ELSE v_assigned_kind END,
    CASE WHEN v_assigned_kind = 'ai_agent' THEN NULL ELSE p_assigned_profile_id END,
    true,
    jsonb_build_object(
      'actionType', p_action_type, 'timingPolicyId', v_policy.id, 'dueAt', v_due,
      'contextKind', v_kind, 'contextId', p_context_id, 'escalationPolicyId', v_escalation,
      'assignedAgentId', p_assigned_agent_id
    ),
    p_assigned_agent_id
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

  IF v_assigned_kind <> 'ai_agent' THEN
    PERFORM public.matter_notify_actor(
      v_assigned_kind, p_assigned_profile_id,
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
  END IF;
  RETURN v_id;
END;
$$;

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


-- ---------------------------------------------------------------------------
-- 6. Agent RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_ai_agents()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.role_type), '[]'::jsonb)
  FROM public.ai_agents a
  WHERE a.status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.queue_matter_agent_run(p_assignment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.matter_agent_assignments%ROWTYPE;
  v_run_id uuid;
  v_revision integer;
BEGIN
  SELECT * INTO v_assignment
  FROM public.matter_agent_assignments
  WHERE id = p_assignment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent assignment not found.';
  END IF;
  IF v_assignment.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'This agent assignment is not active.';
  END IF;
  IF (
    SELECT count(*)
    FROM public.ai_agent_runs r
    WHERE r.assignment_id = p_assignment_id
      AND r.status NOT IN ('failed', 'cancelled', 'submitted')
  ) > 0 THEN
    RAISE EXCEPTION 'An agent run is already queued or running for this assignment.';
  END IF;
  IF (
    SELECT count(*)
    FROM public.ai_agent_runs r
    WHERE r.assignment_id = p_assignment_id
  ) >= v_assignment.max_run_attempts THEN
    RAISE EXCEPTION 'Maximum agent run attempts reached for this assignment.';
  END IF;

  SELECT coalesce(max(r.revision_number), 0) + 1
    INTO v_revision
  FROM public.ai_agent_runs r
  WHERE r.assignment_id = p_assignment_id;

  INSERT INTO public.ai_agent_runs (
    assignment_id, task_id, triggered_by, status, revision_number, input_context
  ) VALUES (
    v_assignment.id,
    v_assignment.task_id,
    CASE WHEN v_revision > 1 THEN 'revision' ELSE 'system' END,
    'queued',
    v_revision,
    jsonb_build_object(
      'matterId', v_assignment.matter_id,
      'taskId', v_assignment.task_id,
      'instructions', v_assignment.instructions,
      'allowedContext', v_assignment.allowed_context,
      'allowedCapabilities', v_assignment.allowed_capabilities
    )
  )
  RETURNING id INTO v_run_id;

  UPDATE public.matter_agent_assignments
  SET status = 'queued', started_at = coalesce(started_at, now()), updated_at = now()
  WHERE id = p_assignment_id;

  PERFORM public.matter_log_event(
    v_assignment.matter_id, 'ai_run_queued',
    public.matter_actor_display_name('ai_agent', NULL, v_assignment.agent_id)
      || ' run queued (revision ' || v_revision || ').',
    'ai_agent', NULL, true,
    jsonb_build_object(
      'assignmentId', v_assignment.id,
      'runId', v_run_id,
      'taskId', v_assignment.task_id,
      'revisionNumber', v_revision
    ),
    v_assignment.agent_id
  );
  RETURN v_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_matter_ai_agent(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_matter_id uuid := (payload->>'matter_id')::uuid;
  v_role_type text := lower(trim(coalesce(payload->>'agent_role_type', '')));
  v_instructions text := trim(coalesce(payload->>'instructions', ''));
  v_supervisor uuid := (payload->>'supervising_profile_id')::uuid;
  v_task_title text := nullif(trim(coalesce(payload->>'task_title', '')), '');
  v_allowed_context text[];
  v_allowed_capabilities text[];
  v_agent public.ai_agents%ROWTYPE;
  v_matter public.matters%ROWTYPE;
  v_assignment_id uuid;
  v_task_id uuid;
  v_supervisor_kind text := 'person';
  v_role_purpose text;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to assign an AI agent.';
  END IF;
  IF v_matter_id IS NULL OR NOT public.can_access_matter(v_matter_id) THEN
    RAISE EXCEPTION 'You cannot assign an AI agent on this Matter.';
  END IF;
  IF NOT public.matter_can_manage_work(v_matter_id) THEN
    RAISE EXCEPTION 'Only a Responsible Lead or Collaborator can assign AI assistance.';
  END IF;
  SELECT * INTO v_matter FROM public.matters WHERE id = v_matter_id;
  IF v_matter.lifecycle_status = 'closed' THEN
    RAISE EXCEPTION 'This Matter is closed.';
  END IF;
  IF char_length(v_instructions) < 3 THEN
    RAISE EXCEPTION 'Describe what the agent should do.';
  END IF;
  IF v_supervisor IS NULL THEN
    RAISE EXCEPTION 'Choose a supervising human reviewer.';
  END IF;
  IF NOT public.current_profile_represents_actor('person', v_supervisor)
     AND NOT public.current_profile_represents_actor('organization', v_supervisor) THEN
    RAISE EXCEPTION 'Supervisor must be an accessible Matter participant.';
  END IF;

  SELECT * INTO v_agent
  FROM public.ai_agents
  WHERE role_type = v_role_type AND status = 'active'
  ORDER BY created_at
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown or inactive AI agent role.';
  END IF;
  IF public.matter_is_ai_agent_forbidden_responsibility(v_matter_id, v_agent.id, 'assignment') THEN
    RAISE EXCEPTION 'AI agents cannot hold Matter responsibility.';
  END IF;

  IF v_matter.collaborative_work_started_at IS NULL THEN
    PERFORM public.start_matter_collaborative_work(v_matter_id);
    SELECT * INTO v_matter FROM public.matters WHERE id = v_matter_id;
  END IF;

  IF payload ? 'allowed_context' AND jsonb_typeof(payload->'allowed_context') = 'array' THEN
    SELECT coalesce(array_agg(value), '{}'::text[])
      INTO v_allowed_context
    FROM jsonb_array_elements_text(payload->'allowed_context') AS t(value);
  ELSE
    v_allowed_context := public.matter_ai_default_context();
  END IF;
  IF cardinality(v_allowed_context) = 0 THEN
    v_allowed_context := public.matter_ai_default_context();
  END IF;

  v_allowed_capabilities := public.matter_ai_default_capabilities(v_agent.role_type);
  IF payload ? 'allowed_capabilities' AND jsonb_typeof(payload->'allowed_capabilities') = 'array' THEN
    SELECT coalesce(array_agg(value), v_allowed_capabilities)
      INTO v_allowed_capabilities
    FROM jsonb_array_elements_text(payload->'allowed_capabilities') AS t(value);
  END IF;

  v_role_purpose := initcap(replace(v_agent.role_type, '_', ' '));

  INSERT INTO public.matter_agent_assignments (
    matter_id, agent_id, assigned_by_kind, assigned_by_profile_id,
    supervising_kind, supervising_profile_id, role_purpose, instructions,
    allowed_context, allowed_capabilities, status
  ) VALUES (
    v_matter_id, v_agent.id, 'person', v_self,
    v_supervisor_kind, v_supervisor, v_role_purpose, v_instructions,
    v_allowed_context, v_allowed_capabilities, 'active'
  )
  RETURNING id INTO v_assignment_id;

  PERFORM public.matter_add_agent_party(v_matter_id, 'ai_agent', v_agent.id, v_role_purpose);

  IF v_task_title IS NOT NULL THEN
    INSERT INTO public.collaboration_tasks (
      parent_kind, parent_id, matter_id, title, description, priority,
      created_by_kind, created_by_profile_id, review_required, status,
      lead_kind, lead_profile_id
    ) VALUES (
      'matter', v_matter_id, v_matter_id, v_task_title,
      v_instructions, 'normal', 'person', v_self, true, 'assigned',
      'ai_agent', NULL
    )
    RETURNING id INTO v_task_id;

    INSERT INTO public.task_assignments (
      task_id, role, actor_kind, actor_profile_id, actor_agent_id,
      assigned_by_kind, assigned_by_profile_id, acceptance_status, accepted_at
    ) VALUES (
      v_task_id, 'lead', 'ai_agent', NULL, v_agent.id,
      'person', v_self, 'accepted', now()
    );

    IF NOT EXISTS (
      SELECT 1 FROM public.task_assignments ta
      WHERE ta.task_id = v_task_id
        AND ta.role = 'reviewer'
        AND ta.actor_kind = v_supervisor_kind
        AND ta.actor_profile_id = v_supervisor
    ) THEN
      INSERT INTO public.task_assignments (
        task_id, role, actor_kind, actor_profile_id,
        assigned_by_kind, assigned_by_profile_id, acceptance_status, accepted_at
      ) VALUES (
        v_task_id, 'reviewer', v_supervisor_kind, v_supervisor,
        'person', v_self, 'accepted', now()
      );
    END IF;

    UPDATE public.matter_agent_assignments
    SET task_id = v_task_id, updated_at = now()
    WHERE id = v_assignment_id;

    PERFORM public.matter_log_event(
      v_matter_id, 'task_created',
      'AI Task created: ' || v_task_title || '.',
      'person', v_self, false,
      jsonb_build_object('taskId', v_task_id, 'assignmentId', v_assignment_id)
    );
    PERFORM public.matter_log_event(
      v_matter_id, 'task_assigned',
      'Task assigned to ' || v_agent.display_name || ' (accepted by system policy).',
      'ai_agent', NULL, true,
      jsonb_build_object(
        'taskId', v_task_id,
        'assignmentId', v_assignment_id,
        'agentId', v_agent.id,
        'policyAccepted', true
      ),
      v_agent.id
    );
    PERFORM public.matter_log_event(
      v_matter_id, 'ai_task_accepted',
      v_agent.display_name || ' assignment accepted by system policy.',
      'ai_agent', NULL, true,
      jsonb_build_object('taskId', v_task_id, 'assignmentId', v_assignment_id),
      v_agent.id
    );

    UPDATE public.collaboration_tasks
    SET status = 'in_progress', start_at = now(), updated_at = now()
    WHERE id = v_task_id;

    PERFORM public.matter_assign_action(
      v_matter_id, 'complete_task', 'ai_agent', NULL, v_role_purpose,
      'task_execution', 'remind', 'task', v_task_id, NULL, v_agent.id
    );
  END IF;

  PERFORM public.matter_log_event(
    v_matter_id, 'ai_agent_assigned',
    v_agent.display_name || ' assigned under supervision of '
      || public.matter_profile_display_name(v_supervisor) || '.',
    'person', v_self, false,
    jsonb_build_object(
      'assignmentId', v_assignment_id,
      'agentId', v_agent.id,
      'supervisingProfileId', v_supervisor,
      'taskId', v_task_id
    )
  );
  PERFORM public.matter_notify_actor(
    v_supervisor_kind, v_supervisor,
    'ai_agent_assigned',
    'AI assistance assigned',
    v_agent.display_name || ' was assigned on a Matter you supervise.',
    v_matter_id
  );

  PERFORM public.queue_matter_agent_run(v_assignment_id);
  RETURN v_assignment_id;
END;
$$;


CREATE OR REPLACE FUNCTION public.add_matter_ai_comment(
  p_assignment_id uuid,
  p_body text,
  p_run_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.matter_agent_assignments%ROWTYPE;
  v_run public.ai_agent_runs%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO v_assignment FROM public.matter_agent_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent assignment not found.';
  END IF;
  IF NOT public.matter_ai_agent_has_capability(p_assignment_id, 'discussion.comment') THEN
    RAISE EXCEPTION 'This assignment may not add discussion comments.';
  END IF;
  IF char_length(trim(coalesce(p_body, ''))) < 1 THEN
    RAISE EXCEPTION 'Write a comment.';
  END IF;
  IF p_run_id IS NOT NULL THEN
    SELECT * INTO v_run
    FROM public.ai_agent_runs
    WHERE id = p_run_id AND assignment_id = p_assignment_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Agent run not found for this assignment.';
    END IF;
  END IF;

  INSERT INTO public.matter_comments (
    matter_id, author_kind, author_profile_id, body, task_id,
    is_ai_agent, agent_id, run_id
  ) VALUES (
    v_assignment.matter_id, 'ai_agent', NULL, trim(p_body), v_assignment.task_id,
    true, v_assignment.agent_id, p_run_id
  )
  RETURNING id INTO v_id;

  PERFORM public.matter_log_event(
    v_assignment.matter_id, 'ai_comment_added',
    public.matter_actor_display_name('ai_agent', NULL, v_assignment.agent_id)
      || ' added a discussion comment. This did not complete the required action.',
    'ai_agent', NULL, false,
    jsonb_build_object(
      'assignmentId', v_assignment.id,
      'runId', p_run_id,
      'commentId', v_id,
      'taskId', v_assignment.task_id
    ),
    v_assignment.agent_id
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.propose_matter_agent_plan(
  p_assignment_id uuid,
  p_plan jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.matter_agent_assignments%ROWTYPE;
  v_run_id uuid;
  v_artifact_id uuid;
  v_title text;
BEGIN
  SELECT * INTO v_assignment FROM public.matter_agent_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent assignment not found.';
  END IF;
  IF NOT public.matter_ai_agent_has_capability(p_assignment_id, 'task.propose') THEN
    RAISE EXCEPTION 'This assignment may not propose plans.';
  END IF;
  v_title := coalesce(nullif(trim(p_plan->>'title'), ''), 'Proposed resolution plan');
  SELECT r.id INTO v_run_id
  FROM public.ai_agent_runs r
  WHERE r.assignment_id = p_assignment_id
  ORDER BY r.created_at DESC
  LIMIT 1;
  IF v_run_id IS NULL THEN
    RAISE EXCEPTION 'An agent run is required before proposing a plan.';
  END IF;

  INSERT INTO public.matter_agent_artifacts (
    run_id, assignment_id, matter_id, artifact_type, title, body,
    source_references, generated_by_agent_id
  ) VALUES (
    v_run_id,
    v_assignment.id, v_assignment.matter_id, 'proposed_plan', v_title,
    coalesce(p_plan::text, '{}'),
    coalesce(p_plan->'source_references', '[]'::jsonb),
    v_assignment.agent_id
  )
  RETURNING id INTO v_artifact_id;

  PERFORM public.matter_log_event(
    v_assignment.matter_id, 'ai_plan_proposed',
    public.matter_actor_display_name('ai_agent', NULL, v_assignment.agent_id)
      || ' proposed a resolution plan.',
    'ai_agent', NULL, false,
    jsonb_build_object('assignmentId', v_assignment.id, 'artifactId', v_artifact_id),
    v_assignment.agent_id
  );
  RETURN v_artifact_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_agent_decision_suggestion(
  p_artifact_id uuid,
  p_title text,
  p_statement text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_artifact public.matter_agent_artifacts%ROWTYPE;
  v_decision_id uuid;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to promote an AI suggestion.';
  END IF;
  SELECT * INTO v_artifact FROM public.matter_agent_artifacts WHERE id = p_artifact_id;
  IF NOT FOUND OR NOT public.can_access_matter(v_artifact.matter_id) THEN
    RAISE EXCEPTION 'Artifact not found.';
  END IF;
  IF NOT public.matter_can_manage_work(v_artifact.matter_id) THEN
    RAISE EXCEPTION 'Only a Responsible Lead or Collaborator can promote AI suggestions.';
  END IF;
  IF char_length(trim(coalesce(p_title, ''))) < 3 OR char_length(trim(coalesce(p_statement, ''))) < 3 THEN
    RAISE EXCEPTION 'Add a Decision title and statement.';
  END IF;

  v_decision_id := public.propose_matter_decision(jsonb_build_object(
    'matter_id', v_artifact.matter_id,
    'title', trim(p_title),
    'statement', trim(p_statement),
    'rationale', 'Promoted from AI artifact ' || v_artifact.id::text || '. Original suggestion remains unverified until human confirmation.'
  ));

  UPDATE public.matter_agent_artifacts
  SET review_status = 'accepted', verification_state = 'human_reviewed'
  WHERE id = p_artifact_id;

  PERFORM public.matter_log_event(
    v_artifact.matter_id, 'ai_decision_promoted',
    public.matter_profile_display_name(v_self)
      || ' promoted an AI suggestion into a formal Decision.',
    'person', v_self, false,
    jsonb_build_object('artifactId', p_artifact_id, 'decisionId', v_decision_id)
  );
  RETURN v_decision_id;
END;
$$;

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


CREATE OR REPLACE FUNCTION public.review_matter_agent_work(
  p_action_id uuid,
  p_action text,
  p_message text DEFAULT NULL
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
  v_assignment public.matter_agent_assignments%ROWTYPE;
  v_artifact public.matter_agent_artifacts%ROWTYPE;
  v_reason text := nullif(trim(coalesce(p_message, '')), '');
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to review AI work.';
  END IF;
  SELECT * INTO v_action FROM public.matter_action_requirements WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND OR v_action.action_type <> 'review_task' OR v_action.status NOT IN ('pending', 'overdue') THEN
    RAISE EXCEPTION 'No AI review action is pending.';
  END IF;
  IF NOT public.current_profile_represents_actor(v_action.assigned_kind, v_action.assigned_profile_id) THEN
    RAISE EXCEPTION 'You are not assigned to review this submission.';
  END IF;
  IF v_action.context_kind <> 'task' OR v_action.context_id IS NULL THEN
    RAISE EXCEPTION 'Review action is not linked to a Task.';
  END IF;
  SELECT * INTO v_task FROM public.collaboration_tasks WHERE id = v_action.context_id FOR UPDATE;
  SELECT * INTO v_assignment
  FROM public.matter_agent_assignments
  WHERE task_id = v_task.id
  ORDER BY assigned_at DESC
  LIMIT 1;
  SELECT * INTO v_artifact
  FROM public.matter_agent_artifacts
  WHERE assignment_id = v_assignment.id
  ORDER BY created_at DESC
  LIMIT 1;

  IF p_action = 'accept' THEN
    PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'accept_completion');
    UPDATE public.collaboration_tasks
    SET status = 'completed', completed_at = now(), waiting_condition = NULL, updated_at = now()
    WHERE id = v_task.id;
    IF v_artifact.id IS NOT NULL THEN
      UPDATE public.matter_agent_artifacts
      SET review_status = 'accepted', verification_state = 'human_reviewed'
      WHERE id = v_artifact.id;
    END IF;
    IF v_assignment.id IS NOT NULL THEN
      UPDATE public.matter_agent_assignments
      SET status = 'completed', completed_at = now(), updated_at = now()
      WHERE id = v_assignment.id;
    END IF;
    PERFORM public.matter_log_event(
      v_action.matter_id, 'ai_work_accepted',
      coalesce(v_reason, 'AI submission accepted.'),
      'person', v_self, false,
      jsonb_build_object(
        'taskId', v_task.id,
        'assignmentId', v_assignment.id,
        'artifactId', v_artifact.id
      )
    );
    PERFORM public.matter_release_dependents(v_task.id);
  ELSIF p_action = 'request_changes' THEN
    PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'request_changes');
    IF v_artifact.id IS NOT NULL THEN
      UPDATE public.matter_agent_artifacts
      SET review_status = 'changes_requested'
      WHERE id = v_artifact.id;
    END IF;
    IF v_assignment.id IS NOT NULL THEN
      UPDATE public.matter_agent_assignments
      SET status = 'changes_requested',
          instructions = coalesce(v_reason, v_assignment.instructions),
          updated_at = now()
      WHERE id = v_assignment.id;
      UPDATE public.collaboration_tasks
      SET status = 'in_progress', waiting_condition = NULL, updated_at = now()
      WHERE id = v_task.id;
      PERFORM public.matter_assign_action(
        v_action.matter_id, 'complete_task', 'ai_agent', NULL, v_assignment.role_purpose,
        'task_execution', 'remind', 'task', v_task.id, NULL, v_assignment.agent_id
      );
      PERFORM public.matter_log_event(
        v_action.matter_id, 'ai_changes_requested',
        coalesce(v_reason, 'Changes requested on AI submission.'),
        'person', v_self, false,
        jsonb_build_object('taskId', v_task.id, 'assignmentId', v_assignment.id)
      );
      PERFORM public.queue_matter_agent_run(v_assignment.id);
    END IF;
  ELSIF p_action = 'reject' THEN
    PERFORM public.matter_complete_action(p_action_id, v_action.assigned_kind, v_self, 'reject');
    IF v_artifact.id IS NOT NULL THEN
      UPDATE public.matter_agent_artifacts
      SET review_status = 'rejected', verification_state = 'rejected'
      WHERE id = v_artifact.id;
    END IF;
    IF v_assignment.id IS NOT NULL THEN
      UPDATE public.matter_agent_assignments
      SET status = 'failed', updated_at = now()
      WHERE id = v_assignment.id;
    END IF;
    UPDATE public.collaboration_tasks
    SET status = 'waiting',
        waiting_condition = coalesce(v_reason, 'AI submission rejected.'),
        updated_at = now()
    WHERE id = v_task.id;
    PERFORM public.matter_log_event(
      v_action.matter_id, 'ai_work_rejected',
      coalesce(v_reason, 'AI submission rejected.'),
      'person', v_self, false,
      jsonb_build_object('taskId', v_task.id, 'assignmentId', v_assignment.id)
    );
  ELSE
    RAISE EXCEPTION 'That review action is not available.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.retry_matter_agent_run(p_assignment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_assignment public.matter_agent_assignments%ROWTYPE;
  v_run_id uuid;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to retry an agent run.';
  END IF;
  SELECT * INTO v_assignment FROM public.matter_agent_assignments WHERE id = p_assignment_id;
  IF NOT FOUND OR NOT public.can_access_matter(v_assignment.matter_id) THEN
    RAISE EXCEPTION 'Assignment not found.';
  END IF;
  IF NOT (
    public.matter_can_manage_work(v_assignment.matter_id)
    OR public.current_profile_represents_actor(v_assignment.supervising_kind, v_assignment.supervising_profile_id)
  ) THEN
    RAISE EXCEPTION 'You cannot retry this agent assignment.';
  END IF;
  IF v_assignment.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'This assignment cannot be retried.';
  END IF;

  v_run_id := public.queue_matter_agent_run(p_assignment_id);
  PERFORM public.matter_log_event(
    v_assignment.matter_id, 'ai_run_retry_requested',
    public.matter_profile_display_name(v_self) || ' requested a new agent run.',
    'person', v_self, false,
    jsonb_build_object('assignmentId', p_assignment_id, 'runId', v_run_id)
  );
  RETURN v_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_matter_agent_assignment(p_assignment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_assignment public.matter_agent_assignments%ROWTYPE;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to cancel an agent assignment.';
  END IF;
  SELECT * INTO v_assignment FROM public.matter_agent_assignments WHERE id = p_assignment_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_matter(v_assignment.matter_id) THEN
    RAISE EXCEPTION 'Assignment not found.';
  END IF;
  IF NOT public.matter_can_manage_work(v_assignment.matter_id) THEN
    RAISE EXCEPTION 'Only a Responsible Lead or Collaborator can cancel AI assignments.';
  END IF;
  IF v_assignment.status IN ('completed', 'cancelled') THEN
    RETURN;
  END IF;

  UPDATE public.ai_agent_runs
  SET status = 'cancelled', finished_at = coalesce(finished_at, now())
  WHERE assignment_id = p_assignment_id
    AND status IN ('queued', 'running', 'waiting_for_human');

  UPDATE public.matter_action_requirements
  SET status = 'cancelled', completed_at = now()
  WHERE matter_id = v_assignment.matter_id
    AND assigned_kind = 'ai_agent'
    AND assigned_agent_id = v_assignment.agent_id
    AND status IN ('pending', 'overdue')
    AND (
      v_assignment.task_id IS NULL
      OR (context_kind = 'task' AND context_id = v_assignment.task_id)
    );

  UPDATE public.matter_agent_assignments
  SET status = 'cancelled', cancelled_at = now(), updated_at = now()
  WHERE id = p_assignment_id;

  PERFORM public.matter_log_event(
    v_assignment.matter_id, 'ai_assignment_cancelled',
    public.matter_profile_display_name(v_self) || ' cancelled an AI assignment.',
    'person', v_self, false,
    jsonb_build_object('assignmentId', p_assignment_id, 'agentId', v_assignment.agent_id)
  );
  PERFORM public.matter_sync_headline(v_assignment.matter_id);
END;
$$;


-- ---------------------------------------------------------------------------
-- 7. Matter read model + close guard
-- ---------------------------------------------------------------------------

ALTER TABLE public.collaboration_tasks
  DROP CONSTRAINT IF EXISTS collaboration_tasks_lead_kind_check;
ALTER TABLE public.collaboration_tasks
  ADD CONSTRAINT collaboration_tasks_lead_kind_check
  CHECK (lead_kind IS NULL OR lead_kind IN ('person', 'organization', 'group', 'ai_agent'));

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
    AND (
      (a.assigned_kind = 'ai_agent')
      OR public.current_profile_represents_actor(a.assigned_kind, a.assigned_profile_id)
    )
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
        'assigned_display_name', public.matter_actor_display_name(
          v_action.assigned_kind, v_action.assigned_profile_id, v_action.assigned_agent_id
        ),
        'task_title', v_task_title
      )
    END,
    'pending_actions', coalesce((
      SELECT jsonb_agg(to_jsonb(a) || jsonb_build_object(
        'assigned_display_name', public.matter_actor_display_name(
          a.assigned_kind, a.assigned_profile_id, a.assigned_agent_id
        ),
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
      'open', (SELECT count(*) FROM public.collaboration_tasks t WHERE t.matter_id = p_id AND t.status NOT IN ('completed', 'cancelled', 'declined')),
      'active_ai_assignments', (
        SELECT count(*) FROM public.matter_agent_assignments ma
        WHERE ma.matter_id = p_id AND ma.status NOT IN ('cancelled', 'completed')
      )
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
  PERFORM public.matter_agent_run_blocked_mutations();
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
  UPDATE public.matter_agent_assignments
  SET status = 'cancelled', cancelled_at = now(), updated_at = now()
  WHERE matter_id = p_matter_id
    AND status NOT IN ('cancelled', 'completed');
  PERFORM public.matter_log_event(
    p_matter_id,
    CASE WHEN p_is_system THEN 'matter_auto_closed' ELSE 'matter_manually_closed' END,
    p_reason,
    p_actor_kind, p_actor_profile_id, p_is_system,
    jsonb_build_object('closeKind', p_close_kind)
  );
END;
$$;


-- ---------------------------------------------------------------------------
-- 8. RLS + grants
-- ---------------------------------------------------------------------------

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_agent_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_agents_select ON public.ai_agents;
CREATE POLICY ai_agents_select ON public.ai_agents
  FOR SELECT TO authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS matter_agent_assignments_select ON public.matter_agent_assignments;
CREATE POLICY matter_agent_assignments_select ON public.matter_agent_assignments
  FOR SELECT TO authenticated
  USING (public.can_access_matter(matter_id));

DROP POLICY IF EXISTS ai_agent_runs_select ON public.ai_agent_runs;
CREATE POLICY ai_agent_runs_select ON public.ai_agent_runs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matter_agent_assignments ma
    WHERE ma.id = ai_agent_runs.assignment_id
      AND public.can_access_matter(ma.matter_id)
  ));

DROP POLICY IF EXISTS matter_agent_artifacts_select ON public.matter_agent_artifacts;
CREATE POLICY matter_agent_artifacts_select ON public.matter_agent_artifacts
  FOR SELECT TO authenticated
  USING (public.can_access_matter(matter_id));

GRANT SELECT ON public.ai_agents TO authenticated;
GRANT SELECT ON public.matter_agent_assignments TO authenticated;
GRANT SELECT ON public.ai_agent_runs TO authenticated;
GRANT SELECT ON public.matter_agent_artifacts TO authenticated;

REVOKE ALL ON FUNCTION public.queue_matter_agent_run(uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_complete_agent_run_service(jsonb) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.add_matter_ai_comment(uuid, text, uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.propose_matter_agent_plan(uuid, jsonb) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_assign_action(uuid, text, text, uuid, text, text, text, text, uuid, text, uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_add_agent_party(uuid, text, uuid, text) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_ai_default_capabilities(text) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_ai_default_context() FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_agent_run_context_active() FROM PUBLIC, authenticated;

GRANT EXECUTE ON FUNCTION public.list_ai_agents() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_matter_ai_agent(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_matter_agent_work(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_matter_agent_run(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_matter_agent_assignment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_agent_decision_suggestion(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.matter_actor_display_name(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.matter_ai_agent_has_capability(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.matter_ai_assignment_can_read(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.matter_is_ai_agent_forbidden_responsibility(uuid, uuid, text) TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.queue_matter_agent_run(uuid) TO service_role;
    GRANT EXECUTE ON FUNCTION public.matter_complete_agent_run_service(jsonb) TO service_role;
    GRANT EXECUTE ON FUNCTION public.add_matter_ai_comment(uuid, text, uuid) TO service_role;
    GRANT EXECUTE ON FUNCTION public.propose_matter_agent_plan(uuid, jsonb) TO service_role;
    GRANT EXECUTE ON FUNCTION public.matter_agent_run_blocked_mutations() TO service_role;
  END IF;
END $$;

COMMENT ON TABLE public.ai_agents IS
  'Phase 4A stable AI actor registry. Agent identity is independent of individual runs; provider/model refs remain replaceable.';
COMMENT ON TABLE public.matter_agent_assignments IS
  'Phase 4A explicit human-authorized AI participation on a Matter. Every assignment has a supervising human and scoped context/capabilities.';
COMMENT ON TABLE public.ai_agent_runs IS
  'Phase 4A auditable executions of an Agent Assignment. Retries create new runs; failed runs are preserved.';
COMMENT ON TABLE public.matter_agent_artifacts IS
  'Phase 4A AI-generated outputs with provenance and human review state. Artifacts are assistance until a human promotes or accepts them.';
COMMENT ON FUNCTION public.assign_matter_ai_agent(jsonb) IS
  'Phase 4A: authorize an AI agent on a Matter, optionally create a Task, auto-accept by policy, queue the first run. AI cannot hold lead responsibility.';
COMMENT ON FUNCTION public.matter_complete_agent_run_service(jsonb) IS
  'Phase 4A service-only completion path. Writes artifacts, optional AI comments, completes AI complete_task, assigns human review_task. Must not close Matters or confirm Resolution.';
COMMENT ON FUNCTION public.review_matter_agent_work(uuid, text, text) IS
  'Phase 4A human review of AI Task submissions: accept, request_changes (new run), or reject.';
COMMENT ON FUNCTION public.matter_agent_run_blocked_mutations() IS
  'Phase 4A guard: when civizen.matter_agent_run is set, prohibited mutations (close Matter, confirm Resolution, accept responsibility) raise.';
