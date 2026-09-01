-- Matter Collaboration Phase 3: Resolution, Evaluation, Escalation & Accountability
-- Builds on Phase 1/2 without redesigning accepted foundations.

-- ---------------------------------------------------------------------------
-- Extend close kinds and action types
-- ---------------------------------------------------------------------------

ALTER TABLE public.matters DROP CONSTRAINT IF EXISTS matters_close_kind_check;
ALTER TABLE public.matters ADD CONSTRAINT matters_close_kind_check CHECK (
  close_kind IS NULL OR close_kind IN (
    'confirmed_resolution', 'partially_resolved', 'auto_no_initiator_response',
    'no_action_required', 'withdrawn', 'manual', 'unable_to_resolve', 'referred', 'administrative_close'
  )
);

ALTER TABLE public.matters
  ADD COLUMN IF NOT EXISTS latest_resolution_id uuid,
  ADD COLUMN IF NOT EXISTS resolution_attempt_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.matter_action_requirements DROP CONSTRAINT IF EXISTS matter_action_requirements_action_type_check;
ALTER TABLE public.matter_action_requirements ADD CONSTRAINT matter_action_requirements_action_type_check CHECK (
  action_type IN (
    'respond', 'responsibility_response', 'clarify', 'address',
    'confirm_resolution', 'review_resolution', 'choose_next_party',
    'accept_task', 'complete_task', 'review_task', 'reconsider_task',
    'confirm_decision', 'shared_responsibility_response',
    'propose_resolution', 'outcome_followup', 'manual_review'
  )
);

ALTER TABLE public.matter_action_requirements DROP CONSTRAINT IF EXISTS matter_action_requirements_context_kind_check;
ALTER TABLE public.matter_action_requirements ADD CONSTRAINT matter_action_requirements_context_kind_check CHECK (
  context_kind IN ('matter', 'task', 'decision', 'responsibility', 'resolution', 'outcome')
);

INSERT INTO public.matter_timing_policies (id, display_name, duration_value, duration_unit, reminder_value, reminder_unit, notes)
VALUES
  ('resolution_review', 'Resolution review', 3, 'calendar_days', 1, 'calendar_days', 'Initiator reviews a proposed Resolution.'),
  ('resolution_followup', 'Resolution follow-up work', 5, 'calendar_days', 1, 'calendar_days', 'Responsible Lead after rejected or partial resolution.'),
  ('outcome_followup', 'Outcome follow-up', 30, 'calendar_days', 7, 'calendar_days', 'Optional post-resolution outcome check.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.matter_escalation_policies
  ADD COLUMN IF NOT EXISTS trigger_action_type text,
  ADD COLUMN IF NOT EXISTS max_depth integer NOT NULL DEFAULT 3;

INSERT INTO public.matter_escalation_policies (id, display_name, timeout_behavior, notes, trigger_action_type, max_depth)
VALUES
  ('response_escalation', 'Response overdue escalation', 'escalate', 'Phase 3 default response escalation.', 'respond', 3),
  ('responsibility_escalation', 'Responsibility request escalation', 'escalate', 'Phase 3 responsibility escalation.', 'responsibility_response', 3)
ON CONFLICT (id) DO UPDATE SET
  trigger_action_type = EXCLUDED.trigger_action_type,
  max_depth = EXCLUDED.max_depth,
  notes = EXCLUDED.notes;

-- ---------------------------------------------------------------------------
-- Core Phase 3 tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.matter_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL CHECK (attempt_number > 0),
  resolution_kind text NOT NULL CHECK (resolution_kind IN (
    'answered', 'addressed', 'resolved', 'partially_resolved', 'no_action_required',
    'unable_to_resolve', 'referred_elsewhere', 'withdrawn', 'other'
  )),
  summary text NOT NULL,
  actions_taken text,
  outstanding_items text,
  limitations text,
  resolution_status text NOT NULL DEFAULT 'proposed' CHECK (resolution_status IN (
    'proposed', 'confirmed', 'partially_accepted', 'rejected', 'auto_closed', 'superseded'
  )),
  responsible_party_position text NOT NULL,
  initiator_position text,
  evaluator_position text,
  proposed_by_kind text NOT NULL CHECK (proposed_by_kind IN ('person', 'organization', 'group')),
  proposed_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  proposed_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  closure_kind text CHECK (closure_kind IS NULL OR closure_kind IN (
    'confirmed_resolution', 'auto_closed_no_response', 'partial_resolution_accepted',
    'no_action_required', 'withdrawn_by_initiator', 'unable_to_resolve', 'referred',
    'administrative_close', 'other'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (matter_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS matter_resolutions_matter_idx ON public.matter_resolutions (matter_id, attempt_number DESC);

CREATE TABLE IF NOT EXISTS public.matter_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  resolution_id uuid REFERENCES public.matter_resolutions(id) ON DELETE SET NULL,
  evaluator_kind text NOT NULL CHECK (evaluator_kind IN ('person', 'organization', 'group')),
  evaluator_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  evaluator_role text NOT NULL CHECK (evaluator_role IN (
    'initiator', 'responsible_lead', 'responsible_collaborator', 'assigned_evaluator', 'affected_participant'
  )),
  dimension text NOT NULL CHECK (dimension IN (
    'resolution_quality', 'completeness', 'timeliness', 'communication', 'responsiveness', 'collaboration'
  )),
  rating text NOT NULL CHECK (rating IN ('poor', 'limited', 'adequate', 'good', 'excellent')),
  comment text,
  visibility text NOT NULL DEFAULT 'participants' CHECK (visibility IN ('participants', 'organization', 'private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (matter_id, resolution_id, evaluator_profile_id, evaluator_role, dimension)
);

CREATE TABLE IF NOT EXISTS public.matter_outcome_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  resolution_id uuid REFERENCES public.matter_resolutions(id) ON DELETE SET NULL,
  review_due_at timestamptz NOT NULL,
  outcome_question text NOT NULL,
  target_indicator text,
  reviewer_kind text NOT NULL CHECK (reviewer_kind IN ('person', 'organization', 'group')),
  reviewer_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'pending', 'completed', 'cancelled')),
  result text CHECK (result IS NULL OR result IN (
    'improved', 'partly_improved', 'no_change', 'worsened', 'unable_to_determine'
  )),
  notes text,
  action_id uuid REFERENCES public.matter_action_requirements(id) ON DELETE SET NULL,
  human_outcome_review_id uuid,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.matter_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  to_matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  relationship_kind text NOT NULL CHECK (relationship_kind IN ('follow_up_to')),
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_matter_id, to_matter_id, relationship_kind)
);

CREATE TABLE IF NOT EXISTS public.matter_escalation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id text NOT NULL REFERENCES public.matter_escalation_policies(id) ON DELETE CASCADE,
  step_order integer NOT NULL CHECK (step_order > 0),
  after_hours integer NOT NULL CHECK (after_hours >= 0),
  step_behavior text NOT NULL CHECK (step_behavior IN (
    'remind', 'notify_lead', 'mark_unresponsive', 'require_manual_review',
    'return_to_initiator', 'forward_responsibility', 'involve_additional_party'
  )),
  target_role text NOT NULL CHECK (target_role IN (
    'assigned_actor', 'responsible_lead', 'initiator', 'fallback_profile', 'manual_queue'
  )),
  target_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (policy_id, step_order)
);

CREATE TABLE IF NOT EXISTS public.matter_escalation_executions (
  action_id uuid NOT NULL REFERENCES public.matter_action_requirements(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (action_id, step_order)
);

ALTER TABLE public.matter_attachments
  ADD COLUMN IF NOT EXISTS resolution_id uuid REFERENCES public.matter_resolutions(id) ON DELETE SET NULL;

ALTER TABLE public.matters
  ADD CONSTRAINT matters_latest_resolution_fk
  FOREIGN KEY (latest_resolution_id) REFERENCES public.matter_resolutions(id) ON DELETE SET NULL;

-- Seed default escalation steps for responsibility_response
INSERT INTO public.matter_escalation_steps (policy_id, step_order, after_hours, step_behavior, target_role)
VALUES
  ('responsibility_escalation', 1, 24, 'remind', 'assigned_actor'),
  ('responsibility_escalation', 2, 48, 'mark_unresponsive', 'assigned_actor'),
  ('responsibility_escalation', 3, 72, 'notify_lead', 'responsible_lead'),
  ('responsibility_escalation', 4, 120, 'require_manual_review', 'manual_queue')
ON CONFLICT (policy_id, step_order) DO NOTHING;

INSERT INTO public.matter_escalation_steps (policy_id, step_order, after_hours, step_behavior, target_role)
VALUES
  ('response_escalation', 1, 24, 'remind', 'assigned_actor'),
  ('response_escalation', 2, 48, 'mark_unresponsive', 'assigned_actor'),
  ('response_escalation', 3, 72, 'notify_lead', 'responsible_lead')
ON CONFLICT (policy_id, step_order) DO NOTHING;


-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.matter_outstanding_work_summary(p_matter_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(string_agg(t.title, '; ' ORDER BY t.created_at), '')
  FROM public.collaboration_tasks t
  WHERE t.matter_id = p_matter_id
    AND t.status NOT IN ('completed', 'cancelled');
$$;

CREATE OR REPLACE FUNCTION public.matter_pattern_counts(p_matter_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'redirectCount', (
      SELECT count(*)::int FROM public.matter_events e
      WHERE e.matter_id = p_matter_id AND e.event_type IN ('redirected', 'forwarded')
    ),
    'reopenCount', coalesce((SELECT reopen_count FROM public.matters WHERE id = p_matter_id), 0),
    'resolutionRejectionCount', (
      SELECT count(*)::int FROM public.matter_events e
      WHERE e.matter_id = p_matter_id AND e.event_type IN ('resolution_rejected', 'resolution_partially_accepted')
    ),
    'resolutionAttemptCount', coalesce((SELECT resolution_attempt_count FROM public.matters WHERE id = p_matter_id), 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.matter_find_stalled()
RETURNS TABLE (matter_id uuid, title text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.title
  FROM public.matters m
  WHERE m.lifecycle_status IN ('submitted', 'active')
    AND coalesce(m.waiting_condition, '') = ''
    AND NOT EXISTS (
      SELECT 1 FROM public.matter_action_requirements a
      WHERE a.matter_id = m.id AND a.status IN ('pending', 'overdue')
    );
$$;

CREATE OR REPLACE FUNCTION public.matter_resolution_kinds_for_type(p_matter_type text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_matter_type
    WHEN 'question' THEN ARRAY['answered', 'no_action_required', 'unable_to_resolve', 'referred_elsewhere', 'other']
    WHEN 'issue' THEN ARRAY['resolved', 'partially_resolved', 'unable_to_resolve', 'no_action_required', 'other']
    WHEN 'suggestion' THEN ARRAY['resolved', 'partially_resolved', 'addressed', 'other']
    WHEN 'request' THEN ARRAY['resolved', 'partially_resolved', 'unable_to_resolve', 'other']
    ELSE ARRAY['resolved', 'partially_resolved', 'addressed', 'no_action_required', 'other']
  END;
$$;

CREATE OR REPLACE FUNCTION public.matter_internal_propose_resolution(
  p_matter_id uuid,
  p_resolution_kind text,
  p_summary text,
  p_actions_taken text,
  p_limitations text,
  p_responsible_position text,
  p_actor_kind text,
  p_actor_profile_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
  v_attempt integer;
  v_outstanding text;
  v_id uuid;
BEGIN
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id FOR UPDATE;
  IF NOT FOUND OR v_matter.lifecycle_status = 'closed' THEN
    RAISE EXCEPTION 'This Matter cannot receive a Resolution proposal.';
  END IF;
  v_outstanding := public.matter_outstanding_work_summary(p_matter_id);
  v_attempt := coalesce(v_matter.resolution_attempt_count, 0) + 1;
  INSERT INTO public.matter_resolutions (
    matter_id, attempt_number, resolution_kind, summary, actions_taken, outstanding_items,
    limitations, resolution_status, responsible_party_position,
    proposed_by_kind, proposed_by_profile_id
  ) VALUES (
    p_matter_id, v_attempt, p_resolution_kind, p_summary, p_actions_taken,
    nullif(v_outstanding, ''), p_limitations, 'proposed', p_responsible_position,
    p_actor_kind, p_actor_profile_id
  )
  RETURNING id INTO v_id;
  UPDATE public.matters
  SET latest_resolution_id = v_id,
      resolution_attempt_count = v_attempt,
      updated_at = now()
  WHERE id = p_matter_id;
  PERFORM public.matter_log_event(
    p_matter_id, 'resolution_proposed',
    'Resolution attempt ' || v_attempt || ' proposed.',
    p_actor_kind, p_actor_profile_id, false,
    jsonb_build_object('resolutionId', v_id, 'attemptNumber', v_attempt, 'resolutionKind', p_resolution_kind,
      'outstandingItems', nullif(v_outstanding, ''))
  );
  PERFORM public.matter_assign_action(
    p_matter_id, 'review_resolution', v_matter.initiator_kind, v_matter.initiator_profile_id,
    v_matter.initiator_unit_label, 'resolution_review', 'auto_close', 'resolution', v_id
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.propose_matter_resolution(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_matter_id uuid := (payload->>'matter_id')::uuid;
  v_kind text := lower(trim(coalesce(payload->>'resolution_kind', 'resolved')));
  v_summary text := trim(coalesce(payload->>'summary', ''));
  v_actions text := nullif(trim(coalesce(payload->>'actions_taken', '')), '');
  v_limits text := nullif(trim(coalesce(payload->>'limitations', '')), '');
  v_position text := trim(coalesce(payload->>'responsible_party_position', ''));
  v_actor_kind text := 'person';
  v_matter public.matters%ROWTYPE;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to propose a Resolution.';
  END IF;
  IF v_summary = '' THEN
    RAISE EXCEPTION 'Describe what was done and what outcome is being claimed.';
  END IF;
  SELECT * INTO v_matter FROM public.matters WHERE id = v_matter_id;
  IF NOT FOUND OR NOT public.can_access_matter(v_matter_id) THEN
    RAISE EXCEPTION 'You cannot propose a Resolution on this Matter.';
  END IF;
  IF NOT public.matter_is_responsible_lead(v_matter_id)
     AND NOT public.current_profile_represents_actor(v_matter.responsible_kind, v_matter.responsible_profile_id) THEN
    RAISE EXCEPTION 'Only the Responsible Lead can propose a Resolution.';
  END IF;
  IF v_position = '' THEN
    v_position := v_summary;
  END IF;
  IF public.current_profile_represents_actor(v_matter.responsible_kind, v_matter.responsible_profile_id)
     AND v_matter.responsible_kind = 'organization' THEN
    v_actor_kind := 'organization';
  END IF;
  RETURN public.matter_internal_propose_resolution(
    v_matter_id, v_kind, v_summary, v_actions, v_limits, v_position, v_actor_kind, v_self
  );
END;
$$;


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
          closure_kind = CASE WHEN coalesce(p_follow_up_choice, 'continue') = 'follow_up' THEN NULL ELSE 'partial_resolution_accepted' END,
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

CREATE OR REPLACE FUNCTION public.create_matter_follow_up(
  p_source_matter_id uuid,
  p_resolution_id uuid,
  p_title text,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_source public.matters%ROWTYPE;
  v_new_id uuid;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to create a follow-up Matter.';
  END IF;
  SELECT * INTO v_source FROM public.matters WHERE id = p_source_matter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source Matter not found.';
  END IF;
  v_new_id := public.create_matter(jsonb_build_object(
    'title', trim(p_title),
    'description', trim(p_description),
    'matter_type', v_source.matter_type,
    'visibility', v_source.visibility,
    'area_node_id', v_source.area_node_id,
    'initiator_kind', v_source.initiator_kind,
    'initiator_profile_id', v_source.initiator_profile_id,
    'initiator_unit_label', v_source.initiator_unit_label,
    'addressee_kind', v_source.addressee_kind,
    'addressee_profile_id', v_source.addressee_profile_id,
    'addressee_unit_label', v_source.addressee_unit_label,
    'responsible_kind', v_source.responsible_kind,
    'responsible_profile_id', v_source.responsible_profile_id,
    'responsible_unit_label', v_source.responsible_unit_label
  ));
  INSERT INTO public.matter_relationships (from_matter_id, to_matter_id, relationship_kind, created_by_profile_id)
  VALUES (v_new_id, p_source_matter_id, 'follow_up_to', v_self);
  PERFORM public.matter_log_event(
    p_source_matter_id, 'follow_up_matter_created',
    'Follow-up Matter created for unresolved portions.',
    'person', v_self, false,
    jsonb_build_object('followUpMatterId', v_new_id, 'resolutionId', p_resolution_id)
  );
  PERFORM public.matter_log_event(
    v_new_id, 'follow_up_from_matter',
    'This Matter follows up on a partially resolved Matter.',
    'system', NULL, true,
    jsonb_build_object('sourceMatterId', p_source_matter_id, 'resolutionId', p_resolution_id)
  );
  RETURN v_new_id;
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
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to submit an evaluation.';
  END IF;
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
    'Evaluation recorded for ' || replace(v_dimension, '_', ' ') || '.',
    'person', v_self, false,
    jsonb_build_object('evaluationId', v_id, 'dimension', v_dimension, 'rating', v_rating, 'evaluatorRole', v_role)
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_matter_outcome_followup(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_matter_id uuid := (payload->>'matter_id')::uuid;
  v_resolution_id uuid := nullif(payload->>'resolution_id', '')::uuid;
  v_days integer := coalesce((payload->>'days_until_review')::int, 30);
  v_question text := trim(coalesce(payload->>'outcome_question', ''));
  v_reviewer_kind text := coalesce(nullif(trim(payload->>'reviewer_kind'), ''), 'person');
  v_reviewer_profile_id uuid := coalesce(nullif(payload->>'reviewer_profile_id', '')::uuid, v_self);
  v_id uuid;
  v_matter public.matters%ROWTYPE;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to schedule outcome follow-up.';
  END IF;
  IF v_question = '' THEN
    v_question := 'Did the intervention improve the situation?';
  END IF;
  SELECT * INTO v_matter FROM public.matters WHERE id = v_matter_id;
  IF NOT FOUND OR NOT public.can_access_matter(v_matter_id) THEN
    RAISE EXCEPTION 'You cannot schedule outcome follow-up on this Matter.';
  END IF;
  IF NOT public.matter_is_responsible_lead(v_matter_id)
     AND NOT public.current_profile_represents_actor(v_matter.initiator_kind, v_matter.initiator_profile_id) THEN
    RAISE EXCEPTION 'Only the initiator or Responsible Lead can schedule outcome follow-up.';
  END IF;
  INSERT INTO public.matter_outcome_followups (
    matter_id, resolution_id, review_due_at, outcome_question, target_indicator,
    reviewer_kind, reviewer_profile_id, status, created_by_profile_id
  ) VALUES (
    v_matter_id, v_resolution_id, now() + make_interval(days => v_days), v_question,
    nullif(trim(coalesce(payload->>'target_indicator', '')), ''),
    v_reviewer_kind, v_reviewer_profile_id, 'scheduled', v_self
  )
  RETURNING id INTO v_id;
  PERFORM public.matter_log_event(
    v_matter_id, 'outcome_followup_scheduled',
    'Outcome follow-up scheduled.',
    'person', v_self, false,
    jsonb_build_object('followupId', v_id, 'reviewDueAt', now() + make_interval(days => v_days))
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_activate_due_outcome_followups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.matter_outcome_followups%ROWTYPE;
  v_count integer := 0;
  v_action_id uuid;
BEGIN
  FOR v_row IN
    SELECT * FROM public.matter_outcome_followups
    WHERE status = 'scheduled' AND review_due_at <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    v_action_id := public.matter_assign_action(
      v_row.matter_id, 'outcome_followup', v_row.reviewer_kind, v_row.reviewer_profile_id,
      NULL, 'outcome_followup', 'remind', 'outcome', v_row.id
    );
    UPDATE public.matter_outcome_followups
    SET status = 'pending', action_id = v_action_id
    WHERE id = v_row.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.perform_outcome_followup(
  p_action_id uuid,
  p_result text,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_action public.matter_action_requirements%ROWTYPE;
  v_followup public.matter_outcome_followups%ROWTYPE;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to complete outcome follow-up.';
  END IF;
  SELECT * INTO v_action FROM public.matter_action_requirements WHERE id = p_action_id FOR UPDATE;
  IF NOT FOUND OR v_action.action_type <> 'outcome_followup' OR v_action.status NOT IN ('pending', 'overdue') THEN
    RAISE EXCEPTION 'No outcome follow-up is pending.';
  END IF;
  IF NOT public.current_profile_represents_actor(v_action.assigned_kind, v_action.assigned_profile_id) THEN
    RAISE EXCEPTION 'You are not assigned to this outcome follow-up.';
  END IF;
  SELECT * INTO v_followup FROM public.matter_outcome_followups WHERE id = v_action.context_id FOR UPDATE;
  PERFORM public.matter_complete_action(p_action_id, 'person', v_self, 'outcome_recorded');
  UPDATE public.matter_outcome_followups
  SET status = 'completed', result = p_result, notes = nullif(trim(coalesce(p_notes, '')), ''),
      completed_at = now()
  WHERE id = v_followup.id;
  PERFORM public.matter_log_event(
    v_action.matter_id, 'outcome_followup_completed',
    'Outcome observed after resolution: ' || replace(p_result, '_', ' ') || '.',
    'person', v_self, false,
    jsonb_build_object('followupId', v_followup.id, 'result', p_result)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_execute_escalation_step(
  p_action public.matter_action_requirements,
  p_step public.matter_escalation_steps
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
  v_target_kind text;
  v_target_profile uuid;
  v_lead public.matter_responsibilities%ROWTYPE;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.matter_escalation_executions
    WHERE action_id = p_action.id AND step_order = p_step.step_order
  ) THEN
    RETURN;
  END IF;
  SELECT * INTO v_matter FROM public.matters WHERE id = p_action.matter_id;
  v_target_kind := 'person';
  v_target_profile := p_action.assigned_profile_id;
  CASE p_step.target_role
    WHEN 'responsible_lead' THEN
      SELECT * INTO v_lead FROM public.matter_responsibilities
      WHERE matter_id = p_action.matter_id AND kind = 'lead' AND status = 'accepted'
      ORDER BY assigned_at LIMIT 1;
      IF FOUND THEN
        v_target_kind := v_lead.actor_kind;
        v_target_profile := v_lead.actor_profile_id;
      ELSE
        v_target_kind := v_matter.responsible_kind;
        v_target_profile := v_matter.responsible_profile_id;
      END IF;
    WHEN 'initiator' THEN
      v_target_kind := v_matter.initiator_kind;
      v_target_profile := v_matter.initiator_profile_id;
    WHEN 'fallback_profile' THEN
      v_target_profile := p_step.target_profile_id;
    WHEN 'manual_queue' THEN
      v_target_profile := v_matter.responsible_profile_id;
    ELSE
      NULL;
  END CASE;
  CASE p_step.step_behavior
    WHEN 'remind' THEN
      PERFORM public.matter_notify_actor(
        p_action.assigned_kind, p_action.assigned_profile_id,
        'matter_action_reminder', 'Matter deadline approaching', 'A Matter still needs your action.', p_action.matter_id
      );
    WHEN 'mark_unresponsive' THEN
      PERFORM public.matter_log_event(
        p_action.matter_id, 'actor_marked_unresponsive',
        'No response received after escalation period.',
        'system', NULL, true,
        jsonb_build_object('actionId', p_action.id, 'profileId', p_action.assigned_profile_id)
      );
    WHEN 'notify_lead' THEN
      PERFORM public.matter_notify_actor(
        v_target_kind, v_target_profile,
        'matter_escalated', 'Matter escalated', 'A Matter needs attention — assigned actor is overdue.',
        p_action.matter_id
      );
      PERFORM public.matter_log_event(
        p_action.matter_id, 'escalation_performed',
        'Escalation notified Responsible Lead.',
        'system', NULL, true,
        jsonb_build_object('actionId', p_action.id, 'stepOrder', p_step.step_order)
      );
    WHEN 'require_manual_review' THEN
      PERFORM public.matter_assign_action(
        p_action.matter_id, 'manual_review', v_target_kind, v_target_profile,
        NULL, 'address_work', 'remind', 'matter', NULL
      );
      PERFORM public.matter_log_event(
        p_action.matter_id, 'manual_review_required',
        'Manual review required after escalation.',
        'system', NULL, true,
        jsonb_build_object('actionId', p_action.id, 'stepOrder', p_step.step_order)
      );
    WHEN 'return_to_initiator' THEN
      PERFORM public.matter_notify_actor(
        v_matter.initiator_kind, v_matter.initiator_profile_id,
        'matter_escalated', 'Matter returned for review', 'A Matter needs your attention.',
        p_action.matter_id
      );
    WHEN 'forward_responsibility' THEN
      IF p_step.target_profile_id IS NOT NULL THEN
        PERFORM public.matter_log_event(
          p_action.matter_id, 'escalation_forwarded',
          'Escalation forwarded responsibility request.',
          'system', NULL, true,
          jsonb_build_object('targetProfileId', p_step.target_profile_id)
        );
      END IF;
    ELSE
      NULL;
  END CASE;
  INSERT INTO public.matter_escalation_executions (action_id, step_order)
  VALUES (p_action.id, p_step.step_order)
  ON CONFLICT DO NOTHING;
END;
$$;


-- ---------------------------------------------------------------------------
-- Update matter_close to preserve Resolution on auto-close
-- ---------------------------------------------------------------------------

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
  v_action_id uuid;
  v_closed uuid;
  v_resolution_id uuid;
BEGIN
  SELECT latest_resolution_id INTO v_resolution_id FROM public.matters WHERE id = p_matter_id;
  UPDATE public.matters
  SET lifecycle_status = 'closed',
      close_kind = p_close_kind,
      close_reason = p_reason,
      closed_at = now(),
      waiting_condition = NULL,
      updated_at = now()
  WHERE id = p_matter_id
    AND lifecycle_status <> 'closed'
  RETURNING current_action_id, id INTO v_action_id, v_closed;
  IF v_closed IS NULL THEN
    RETURN;
  END IF;
  IF v_resolution_id IS NOT NULL AND p_close_kind = 'auto_no_initiator_response' THEN
    UPDATE public.matter_resolutions
    SET resolution_status = 'auto_closed',
        closure_kind = 'auto_closed_no_response',
        closed_at = now(),
        updated_at = now()
    WHERE id = v_resolution_id AND resolution_status = 'proposed';
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

-- Complete pending propose/address when Resolution is proposed
CREATE OR REPLACE FUNCTION public.matter_internal_propose_resolution(
  p_matter_id uuid,
  p_resolution_kind text,
  p_summary text,
  p_actions_taken text,
  p_limitations text,
  p_responsible_position text,
  p_actor_kind text,
  p_actor_profile_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
  v_attempt integer;
  v_outstanding text;
  v_id uuid;
BEGIN
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id FOR UPDATE;
  IF NOT FOUND OR v_matter.lifecycle_status = 'closed' THEN
    RAISE EXCEPTION 'This Matter cannot receive a Resolution proposal.';
  END IF;
  v_outstanding := public.matter_outstanding_work_summary(p_matter_id);
  v_attempt := coalesce(v_matter.resolution_attempt_count, 0) + 1;
  INSERT INTO public.matter_resolutions (
    matter_id, attempt_number, resolution_kind, summary, actions_taken, outstanding_items,
    limitations, resolution_status, responsible_party_position,
    proposed_by_kind, proposed_by_profile_id
  ) VALUES (
    p_matter_id, v_attempt, p_resolution_kind, p_summary, p_actions_taken,
    nullif(v_outstanding, ''), p_limitations, 'proposed', p_responsible_position,
    p_actor_kind, p_actor_profile_id
  )
  RETURNING id INTO v_id;
  UPDATE public.matters
  SET latest_resolution_id = v_id,
      resolution_attempt_count = v_attempt,
      updated_at = now()
  WHERE id = p_matter_id;
  UPDATE public.matter_action_requirements
  SET status = 'completed',
      completed_at = now(),
      completed_by_kind = p_actor_kind,
      completed_by_profile_id = p_actor_profile_id,
      completion_action = 'propose_resolution'
  WHERE matter_id = p_matter_id
    AND status IN ('pending', 'overdue')
    AND action_type IN ('propose_resolution', 'address');
  PERFORM public.matter_log_event(
    p_matter_id, 'resolution_proposed',
    'Resolution attempt ' || v_attempt || ' proposed.',
    p_actor_kind, p_actor_profile_id, false,
    jsonb_build_object('resolutionId', v_id, 'attemptNumber', v_attempt, 'resolutionKind', p_resolution_kind,
      'outstandingItems', nullif(v_outstanding, ''))
  );
  PERFORM public.matter_assign_action(
    p_matter_id, 'review_resolution', v_matter.initiator_kind, v_matter.initiator_profile_id,
    v_matter.initiator_unit_label, 'resolution_review', 'auto_close', 'resolution', v_id
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_matter_collaborative_work(
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
      'Collaborative work completed. Propose Resolution when ready.',
      v_kind, v_self, false
    );
  END IF;

  PERFORM public.matter_assign_action(
    p_matter_id, 'propose_resolution',
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

CREATE OR REPLACE FUNCTION public.matter_formal_action_is_allowed(
  p_action text,
  p_action_type text,
  p_matter_type text,
  p_is_assigned boolean,
  p_is_initiator boolean,
  p_is_party boolean,
  p_lifecycle text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_lifecycle = 'closed' THEN p_action = 'reopen' AND (p_is_initiator OR p_is_assigned)
    WHEN p_lifecycle = 'draft' THEN false
    WHEN p_action = 'close' THEN p_is_initiator
    WHEN p_action = 'revealed_issue' THEN p_is_initiator AND p_matter_type = 'question'
    WHEN p_action = 'confirm_resolved' AND p_is_initiator AND p_matter_type = 'question' THEN true
    WHEN p_action = 'invite_party' THEN p_is_party OR p_is_assigned OR p_is_initiator
    WHEN NOT p_is_assigned THEN false
    WHEN p_action_type = 'respond' THEN p_action IN (
      'respond', 'request_clarification', 'forward', 'invite_party', 'redirect', 'mark_no_action_required'
    )
    WHEN p_action_type = 'responsibility_response' THEN p_action IN (
      'accept_responsibility', 'accept_jointly', 'partially_accept', 'dispute_responsibility',
      'redirect', 'request_clarification', 'forward', 'invite_party'
    )
    WHEN p_action_type = 'clarify' THEN p_action = 'respond'
    WHEN p_action_type = 'address' THEN p_action IN (
      'mark_addressed', 'request_clarification', 'forward', 'invite_party', 'redirect'
    )
    WHEN p_action_type IN ('confirm_resolution', 'review_resolution') THEN p_action IN (
      'confirm_resolved', 'confirm_partially_resolved', 'confirm_not_resolved', 'need_clarification', 'revealed_issue', 'cannot_verify'
    )
    WHEN p_action_type = 'choose_next_party' THEN p_action IN ('redirect', 'invite_party')
    WHEN p_action_type = 'propose_resolution' THEN false
    ELSE false
  END
$$;


-- perform_matter_formal_action Phase 3 routing
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
      PERFORM public.matter_close(
        p_matter_id, 'partially_resolved',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Initiator marked this as partially resolved.'),
        v_actor_kind, v_self, false
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
       AND (
         (v_locked.context_kind = 'matter' AND v_locked.action_type = 'confirm_resolution')
         OR (v_locked.context_kind = 'resolution' AND v_locked.action_type = 'review_resolution')
       ) THEN
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

    -- Phase 3 escalation steps (idempotent via matter_escalation_executions)
    IF now() >= v_locked.due_at AND v_locked.timeout_action IN ('remind', 'escalate') THEN
      FOR v_step IN
        SELECT s.*
        FROM public.matter_escalation_steps s
        JOIN public.matter_escalation_policies p ON p.id = s.policy_id
        WHERE p.trigger_action_type = v_locked.action_type
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
  v_resolution_id uuid;
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
  ELSIF v_action.context_kind = 'resolution' AND v_action.context_id IS NOT NULL THEN
    v_resolution_id := v_action.context_id;
  END IF;
  RETURN jsonb_build_object(
    'matter', to_jsonb(v_matter) || jsonb_build_object(
      'initiator_display_name', public.matter_profile_display_name(v_matter.initiator_profile_id),
      'addressee_display_name', public.matter_profile_display_name(v_matter.addressee_profile_id),
      'responsible_display_name', public.matter_profile_display_name(v_matter.responsible_profile_id),
      'latest_resolution_id', v_matter.latest_resolution_id,
      'resolution_attempt_count', v_matter.resolution_attempt_count
    ),
    'current_action', CASE
      WHEN v_action.id IS NULL THEN NULL
      ELSE to_jsonb(v_action) || jsonb_build_object(
        'assigned_display_name', public.matter_profile_display_name(v_action.assigned_profile_id),
        'task_title', v_task_title,
        'resolution_id', v_resolution_id
      )
    END,
    'pending_actions', coalesce((
      SELECT jsonb_agg(to_jsonb(a) || jsonb_build_object(
        'assigned_display_name', public.matter_profile_display_name(a.assigned_profile_id),
        'task_title', t.title,
        'resolution_id', CASE WHEN a.context_kind = 'resolution' THEN a.context_id ELSE NULL END
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
      'outstanding', (SELECT count(*) FROM public.collaboration_tasks t WHERE t.matter_id = p_id AND t.status NOT IN ('completed', 'cancelled'))
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
    'pattern_counts', public.matter_pattern_counts(p_matter_id)
  );
END;
$$;



ALTER TABLE public.matter_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_outcome_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_escalation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_escalation_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS matter_resolutions_select ON public.matter_resolutions;
CREATE POLICY matter_resolutions_select ON public.matter_resolutions FOR SELECT TO authenticated
  USING (public.can_access_matter(matter_id));
DROP POLICY IF EXISTS matter_evaluations_select ON public.matter_evaluations;
CREATE POLICY matter_evaluations_select ON public.matter_evaluations FOR SELECT TO authenticated
  USING (public.can_access_matter(matter_id) AND visibility <> 'private');
DROP POLICY IF EXISTS matter_outcome_followups_select ON public.matter_outcome_followups;
CREATE POLICY matter_outcome_followups_select ON public.matter_outcome_followups FOR SELECT TO authenticated
  USING (public.can_access_matter(matter_id));
DROP POLICY IF EXISTS matter_relationships_select ON public.matter_relationships;
CREATE POLICY matter_relationships_select ON public.matter_relationships FOR SELECT TO authenticated
  USING (public.can_access_matter(from_matter_id) OR public.can_access_matter(to_matter_id));

GRANT SELECT ON public.matter_resolutions TO authenticated;
GRANT SELECT ON public.matter_evaluations TO authenticated;
GRANT SELECT ON public.matter_outcome_followups TO authenticated;
GRANT SELECT ON public.matter_relationships TO authenticated;
GRANT SELECT ON public.matter_escalation_steps TO authenticated;

REVOKE ALL ON FUNCTION public.matter_internal_propose_resolution(uuid, text, text, text, text, text, text, uuid) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_execute_escalation_step(public.matter_action_requirements, public.matter_escalation_steps) FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_activate_due_outcome_followups() FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.matter_find_stalled() FROM PUBLIC, authenticated;
REVOKE ALL ON FUNCTION public.create_matter_follow_up(uuid, uuid, text, text) FROM PUBLIC, authenticated;

GRANT EXECUTE ON FUNCTION public.propose_matter_resolution(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_resolution_review(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_matter_evaluation(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_matter_outcome_followup(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_outcome_followup(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_matter_follow_up(uuid, uuid, text, text) TO authenticated;

COMMENT ON TABLE public.matter_resolutions IS 'Phase 3 formal Resolution attempts — never overwritten.';
