-- Matter Collaboration System (Phase 1).
-- Generic Matter under Contribute. Action requirements carry operational state.
-- Comments are not formal actions. Auto-close is not initiator confirmation.

-- ---------------------------------------------------------------------------
-- Catalogs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.matter_timing_policies (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  duration_value integer NOT NULL CHECK (duration_value > 0),
  duration_unit text NOT NULL DEFAULT 'calendar_days'
    CHECK (duration_unit IN ('calendar_days', 'business_days', 'hours')),
  reminder_value integer NOT NULL CHECK (reminder_value >= 0),
  reminder_unit text NOT NULL DEFAULT 'calendar_days'
    CHECK (reminder_unit IN ('calendar_days', 'business_days', 'hours')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.matter_timing_policies (id, display_name, duration_value, duration_unit, reminder_value, reminder_unit, notes)
VALUES
  ('question_response', 'Question response', 3, 'calendar_days', 1, 'calendar_days', 'Initial testing default.'),
  ('responsibility_response', 'Responsibility response', 2, 'calendar_days', 12, 'hours', 'Initial testing default.'),
  ('clarification_response', 'Clarification response', 5, 'calendar_days', 1, 'calendar_days', 'Initial testing default.'),
  ('resolution_confirmation', 'Resolution confirmation', 3, 'calendar_days', 1, 'calendar_days', 'Initial testing default.'),
  ('suggestion_response', 'Suggestion response', 3, 'calendar_days', 1, 'calendar_days', 'Initial testing default.'),
  ('request_response', 'Request response', 3, 'calendar_days', 1, 'calendar_days', 'Initial testing default.'),
  ('discussion_response', 'Discussion response', 5, 'calendar_days', 1, 'calendar_days', 'Initial testing default.'),
  ('address_work', 'Address work', 5, 'calendar_days', 1, 'calendar_days', 'Initial testing default.')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.matter_type_defaults (
  matter_type text PRIMARY KEY
    CHECK (matter_type IN ('question', 'issue', 'suggestion', 'request', 'discussion', 'other')),
  initial_action_type text NOT NULL,
  timing_policy_id text NOT NULL REFERENCES public.matter_timing_policies(id),
  timeout_behavior text NOT NULL
    CHECK (timeout_behavior IN (
      'remind', 'escalate', 'forward', 'involve_additional_party',
      'continue_without_response', 'return_to_initiator', 'auto_close',
      'mark_unresponsive', 'require_manual_review'
    ))
);

INSERT INTO public.matter_type_defaults (matter_type, initial_action_type, timing_policy_id, timeout_behavior)
VALUES
  ('question', 'respond', 'question_response', 'remind'),
  ('issue', 'responsibility_response', 'responsibility_response', 'remind'),
  ('suggestion', 'respond', 'suggestion_response', 'remind'),
  ('request', 'responsibility_response', 'responsibility_response', 'remind'),
  ('discussion', 'respond', 'discussion_response', 'remind'),
  ('other', 'respond', 'question_response', 'remind')
ON CONFLICT (matter_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.matter_escalation_policies (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  timeout_behavior text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.matter_escalation_policies (id, display_name, timeout_behavior, notes)
VALUES
  ('default_remind', 'Remind and keep pending', 'remind', 'Phase 1 default for response actions.'),
  ('initiator_auto_close', 'Auto-close after initiator silence', 'auto_close', 'Resolution-review silence is not confirmation.')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.matters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  matter_type text NOT NULL
    CHECK (matter_type IN ('question', 'issue', 'suggestion', 'request', 'discussion', 'other')),
  lifecycle_status text NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft', 'submitted', 'active', 'closed')),
  visibility text NOT NULL DEFAULT 'participants'
    CHECK (visibility IN ('private', 'participants', 'organization', 'group', 'public')),
  area_node_id text REFERENCES public.classification_nodes(id) ON DELETE SET NULL,
  initiator_kind text NOT NULL CHECK (initiator_kind IN ('person', 'organization', 'group')),
  initiator_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  initiator_unit_label text,
  addressee_kind text NOT NULL CHECK (addressee_kind IN ('person', 'organization', 'group')),
  addressee_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  addressee_unit_label text,
  responsible_kind text NOT NULL CHECK (responsible_kind IN ('person', 'organization', 'group')),
  responsible_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  responsible_unit_label text,
  current_action_id uuid,
  waiting_condition text,
  close_kind text
    CHECK (close_kind IS NULL OR close_kind IN (
      'confirmed_resolution', 'partially_resolved', 'auto_no_initiator_response',
      'no_action_required', 'withdrawn', 'manual'
    )),
  close_reason text,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  closed_at timestamptz,
  last_reopened_at timestamptz,
  reopen_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matters_title_len CHECK (char_length(trim(title)) BETWEEN 3 AND 160),
  CONSTRAINT matters_description_len CHECK (char_length(trim(description)) BETWEEN 3 AND 8000)
);

CREATE INDEX IF NOT EXISTS matters_lifecycle_updated_idx ON public.matters (lifecycle_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS matters_initiator_idx ON public.matters (initiator_profile_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS matters_responsible_idx ON public.matters (responsible_profile_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS matters_addressee_idx ON public.matters (addressee_profile_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.matter_action_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  action_type text NOT NULL
    CHECK (action_type IN (
      'respond', 'responsibility_response', 'clarify', 'address',
      'confirm_resolution', 'choose_next_party'
    )),
  assigned_kind text NOT NULL CHECK (assigned_kind IN ('person', 'organization', 'group')),
  assigned_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_unit_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  due_at timestamptz NOT NULL,
  reminder_at timestamptz NOT NULL,
  timing_policy_id text NOT NULL REFERENCES public.matter_timing_policies(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'overdue', 'escalated', 'expired', 'cancelled', 'superseded')),
  completed_at timestamptz,
  completed_by_kind text CHECK (completed_by_kind IS NULL OR completed_by_kind IN ('person', 'organization', 'group', 'system')),
  completed_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completion_action text,
  timeout_action text NOT NULL DEFAULT 'remind'
    CHECK (timeout_action IN (
      'remind', 'escalate', 'forward', 'involve_additional_party',
      'continue_without_response', 'return_to_initiator', 'auto_close',
      'mark_unresponsive', 'require_manual_review'
    )),
  escalation_policy_id text REFERENCES public.matter_escalation_policies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS matter_actions_matter_idx
  ON public.matter_action_requirements (matter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS matter_actions_assignee_status_idx
  ON public.matter_action_requirements (assigned_profile_id, status, due_at);
CREATE INDEX IF NOT EXISTS matter_actions_pending_due_idx
  ON public.matter_action_requirements (status, due_at)
  WHERE status IN ('pending', 'overdue');

CREATE TABLE IF NOT EXISTS public.matter_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  role text NOT NULL
    CHECK (role IN ('initiator', 'addressee', 'responsible', 'invitee', 'follower', 'participant')),
  actor_kind text NOT NULL CHECK (actor_kind IN ('person', 'organization', 'group')),
  actor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_unit_label text,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (matter_id, role, actor_kind, actor_profile_id)
);

CREATE INDEX IF NOT EXISTS matter_parties_actor_idx
  ON public.matter_parties (actor_profile_id, matter_id);

CREATE TABLE IF NOT EXISTS public.matter_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.matter_comments(id) ON DELETE CASCADE,
  author_kind text NOT NULL CHECK (author_kind IN ('person', 'organization', 'group')),
  author_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body text NOT NULL,
  mentioned_profile_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  visibility text CHECK (visibility IS NULL OR visibility IN ('private', 'participants', 'organization', 'group', 'public')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matter_comments_body_len CHECK (char_length(trim(body)) BETWEEN 1 AND 8000)
);

CREATE INDEX IF NOT EXISTS matter_comments_matter_idx
  ON public.matter_comments (matter_id, created_at);

CREATE TABLE IF NOT EXISTS public.matter_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.matter_comments(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'file' CHECK (kind IN ('file', 'url')),
  file_path text,
  file_name text,
  content_type text,
  byte_size bigint,
  url text,
  label text,
  visibility text CHECK (visibility IS NULL OR visibility IN ('private', 'participants', 'organization', 'group', 'public')),
  uploaded_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS matter_attachments_matter_idx
  ON public.matter_attachments (matter_id, created_at);

CREATE TABLE IF NOT EXISTS public.matter_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind IN ('person', 'organization', 'group', 'system')),
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_system boolean NOT NULL DEFAULT false,
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS matter_events_matter_idx
  ON public.matter_events (matter_id, created_at);

CREATE TABLE IF NOT EXISTS public.matter_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.matter_action_requirements(id) ON DELETE CASCADE,
  reminder_kind text NOT NULL CHECK (reminder_kind IN ('assigned', 'approaching', 'overdue')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (action_id, reminder_kind)
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('matter-files', 'matter-files', false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.matter_profile_display_name(p_profile_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.username), ''), 'Member')
  FROM public.profiles p
  WHERE p.id = p_profile_id
$$;

CREATE OR REPLACE FUNCTION public.matter_duration_ms(p_value integer, p_unit text)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_unit = 'hours' THEN (p_value::bigint) * 3600000
    ELSE (p_value::bigint) * 86400000
  END
$$;

CREATE OR REPLACE FUNCTION public.current_profile_represents_actor(p_kind text, p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_profile_id() IS NOT NULL
    AND p_profile_id IS NOT NULL
    AND (
      public.current_profile_id() = p_profile_id
      OR (
        p_kind = 'organization'
        AND public.current_profile_manages_publisher(p_profile_id)
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.current_profile_is_matter_party(p_matter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matter_parties mp
    WHERE mp.matter_id = p_matter_id
      AND public.current_profile_represents_actor(mp.actor_kind, mp.actor_profile_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_matter(p_matter_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matter public.matters%ROWTYPE;
BEGIN
  IF public.current_profile_id() IS NULL THEN
    RETURN false;
  END IF;
  IF public.has_permission('settings.manage') THEN
    RETURN true;
  END IF;
  SELECT * INTO v_matter FROM public.matters WHERE id = p_matter_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF public.current_profile_represents_actor(v_matter.initiator_kind, v_matter.initiator_profile_id)
     OR public.current_profile_represents_actor(v_matter.addressee_kind, v_matter.addressee_profile_id)
     OR public.current_profile_represents_actor(v_matter.responsible_kind, v_matter.responsible_profile_id)
     OR public.current_profile_is_matter_party(p_matter_id) THEN
    RETURN true;
  END IF;
  IF v_matter.lifecycle_status = 'draft' THEN
    RETURN false;
  END IF;
  IF v_matter.visibility = 'public' THEN
    RETURN true;
  END IF;
  IF v_matter.visibility = 'organization' THEN
    RETURN public.current_profile_manages_publisher(v_matter.addressee_profile_id)
        OR public.current_profile_manages_publisher(v_matter.responsible_profile_id)
        OR public.current_profile_manages_publisher(v_matter.initiator_profile_id);
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_log_event(
  p_matter_id uuid,
  p_event_type text,
  p_summary text,
  p_actor_kind text,
  p_actor_profile_id uuid,
  p_is_system boolean,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.matter_events (
    matter_id, event_type, actor_kind, actor_profile_id, is_system, summary, payload
  ) VALUES (
    p_matter_id, p_event_type, p_actor_kind, p_actor_profile_id, coalesce(p_is_system, false),
    p_summary, coalesce(p_payload, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_notify_actor(
  p_kind text,
  p_profile_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_matter_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient uuid;
  v_self uuid := public.current_profile_id();
BEGIN
  IF p_profile_id IS NULL THEN
    RETURN;
  END IF;
  FOR v_recipient IN
    SELECT DISTINCT recipient_id
    FROM (
      SELECT p_profile_id AS recipient_id
      UNION
      SELECT la.owner_profile_id
      FROM public.linked_accounts la
      WHERE la.linked_profile_id = p_profile_id
        AND la.relationship_type = 'business'
    ) recipients
  LOOP
    IF v_recipient IS NULL OR v_recipient = v_self THEN
      CONTINUE;
    END IF;
    INSERT INTO public.user_notifications (
      recipient_profile_id, notification_type, title, body, entity_type, entity_id, metadata
    ) VALUES (
      v_recipient, p_type, p_title, p_body, 'matter', p_matter_id, '{}'::jsonb
    );
  END LOOP;
END;
$$;

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
  INSERT INTO public.matter_parties (matter_id, role, actor_kind, actor_profile_id, actor_unit_label)
  VALUES (p_matter_id, p_role, p_kind, p_profile_id, nullif(trim(coalesce(p_unit_label, '')), ''))
  ON CONFLICT (matter_id, role, actor_kind, actor_profile_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.matter_assign_action(
  p_matter_id uuid,
  p_action_type text,
  p_assigned_kind text,
  p_assigned_profile_id uuid,
  p_assigned_unit_label text,
  p_timing_policy_id text,
  p_timeout_action text
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
BEGIN
  SELECT * INTO v_policy FROM public.matter_timing_policies WHERE id = p_timing_policy_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown timing policy.';
  END IF;

  UPDATE public.matter_action_requirements
  SET status = 'superseded'
  WHERE matter_id = p_matter_id
    AND status IN ('pending', 'overdue');

  v_due := now() + (public.matter_duration_ms(v_policy.duration_value, v_policy.duration_unit) || ' milliseconds')::interval;
  v_reminder := v_due - (public.matter_duration_ms(v_policy.reminder_value, v_policy.reminder_unit) || ' milliseconds')::interval;
  IF v_reminder < now() THEN
    v_reminder := now();
  END IF;

  INSERT INTO public.matter_action_requirements (
    matter_id, action_type, assigned_kind, assigned_profile_id, assigned_unit_label,
    due_at, reminder_at, timing_policy_id, timeout_action
  ) VALUES (
    p_matter_id, p_action_type, p_assigned_kind, p_assigned_profile_id,
    nullif(trim(coalesce(p_assigned_unit_label, '')), ''),
    v_due, v_reminder, v_policy.id, p_timeout_action
  )
  RETURNING id INTO v_id;

  UPDATE public.matters
  SET current_action_id = v_id,
      waiting_condition = NULL,
      lifecycle_status = CASE
        WHEN lifecycle_status = 'draft' THEN 'submitted'
        WHEN lifecycle_status = 'closed' THEN 'active'
        ELSE 'active'
      END,
      updated_at = now()
  WHERE id = p_matter_id;

  v_name := public.matter_profile_display_name(p_assigned_profile_id);
  PERFORM public.matter_log_event(
    p_matter_id, 'action_assigned',
    'Action assigned to ' || v_name || '.',
    'system', NULL, true,
    jsonb_build_object('actionType', p_action_type, 'timingPolicyId', v_policy.id, 'dueAt', v_due)
  );
  PERFORM public.matter_log_event(
    p_matter_id, 'timer_started',
    'Timer started using ' || v_policy.display_name || '.',
    'system', NULL, true,
    jsonb_build_object('timingPolicyId', v_policy.id, 'dueAt', v_due)
  );
  INSERT INTO public.matter_reminders (action_id, reminder_kind)
  VALUES (v_id, 'assigned')
  ON CONFLICT (action_id, reminder_kind) DO NOTHING;
  PERFORM public.matter_log_event(
    p_matter_id, 'reminder_sent', 'Initial assignment notification sent.',
    'system', NULL, true, jsonb_build_object('reminderKind', 'assigned')
  );
  PERFORM public.matter_notify_actor(
    p_assigned_kind, p_assigned_profile_id,
    'matter_action_assigned',
    'Action required',
    'A Matter needs a response from you.',
    p_matter_id
  );
  RETURN v_id;
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
  UPDATE public.matter_action_requirements
  SET status = 'completed',
      completed_at = now(),
      completed_by_kind = p_actor_kind,
      completed_by_profile_id = p_actor_profile_id,
      completion_action = p_completion_action
  WHERE id = v_action_id
    AND status IN ('pending', 'overdue');
  PERFORM public.matter_log_event(
    p_matter_id, 'action_completed',
    'Formal action completed: ' || replace(p_completion_action, '_', ' ') || '.',
    p_actor_kind, p_actor_profile_id, p_actor_kind = 'system',
    jsonb_build_object('completionAction', p_completion_action)
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
  v_action_id uuid;
BEGIN
  SELECT current_action_id INTO v_action_id FROM public.matters WHERE id = p_matter_id;
  IF v_action_id IS NOT NULL THEN
    UPDATE public.matter_action_requirements
    SET status = CASE WHEN p_is_system THEN 'expired' ELSE 'cancelled' END,
        completed_at = now(),
        completed_by_kind = p_actor_kind,
        completed_by_profile_id = p_actor_profile_id
    WHERE id = v_action_id
      AND status IN ('pending', 'overdue');
  END IF;
  UPDATE public.matters
  SET lifecycle_status = 'closed',
      close_kind = p_close_kind,
      close_reason = p_reason,
      closed_at = now(),
      waiting_condition = NULL,
      updated_at = now()
  WHERE id = p_matter_id;
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
-- Mutations
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_matter(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_id uuid;
  v_type text := coalesce(payload->>'matter_type', 'other');
  v_submit boolean := coalesce((payload->>'submit')::boolean, true);
  v_init_kind text := coalesce(payload->>'initiator_kind', 'person');
  v_init_id uuid := coalesce((payload->>'initiator_profile_id')::uuid, v_self);
  v_addr_kind text := coalesce(payload->>'addressee_kind', 'person');
  v_addr_id uuid := (payload->>'addressee_profile_id')::uuid;
  v_defaults public.matter_type_defaults%ROWTYPE;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to create a Matter.';
  END IF;
  IF char_length(trim(coalesce(payload->>'title', ''))) < 3 THEN
    RAISE EXCEPTION 'Add a short title.';
  END IF;
  IF char_length(trim(coalesce(payload->>'description', ''))) < 3 THEN
    RAISE EXCEPTION 'Describe the Matter.';
  END IF;
  IF v_addr_id IS NULL OR v_addr_id = v_init_id THEN
    RAISE EXCEPTION 'Choose who this Matter is for.';
  END IF;
  IF v_type NOT IN ('question', 'issue', 'suggestion', 'request', 'discussion', 'other') THEN
    RAISE EXCEPTION 'Choose a Matter type.';
  END IF;
  IF NOT public.current_profile_represents_actor(v_init_kind, v_init_id) THEN
    RAISE EXCEPTION 'You can only create a Matter as yourself or an organization you represent.';
  END IF;

  INSERT INTO public.matters (
    title, description, matter_type, lifecycle_status, visibility, area_node_id,
    initiator_kind, initiator_profile_id, initiator_unit_label,
    addressee_kind, addressee_profile_id, addressee_unit_label,
    responsible_kind, responsible_profile_id, responsible_unit_label,
    created_by_profile_id, submitted_at
  ) VALUES (
    trim(payload->>'title'),
    trim(payload->>'description'),
    v_type,
    CASE WHEN v_submit THEN 'submitted' ELSE 'draft' END,
    coalesce(nullif(payload->>'visibility', ''), 'participants'),
    nullif(payload->>'area_node_id', ''),
    v_init_kind, v_init_id, nullif(trim(coalesce(payload->>'initiator_unit_label', '')), ''),
    v_addr_kind, v_addr_id, nullif(trim(coalesce(payload->>'addressee_unit_label', '')), ''),
    v_addr_kind, v_addr_id, nullif(trim(coalesce(payload->>'addressee_unit_label', '')), ''),
    v_self,
    CASE WHEN v_submit THEN now() ELSE NULL END
  )
  RETURNING id INTO v_id;

  PERFORM public.matter_add_party(v_id, 'initiator', v_init_kind, v_init_id, payload->>'initiator_unit_label');
  PERFORM public.matter_add_party(v_id, 'addressee', v_addr_kind, v_addr_id, payload->>'addressee_unit_label');
  PERFORM public.matter_add_party(v_id, 'responsible', v_addr_kind, v_addr_id, payload->>'addressee_unit_label');
  PERFORM public.matter_log_event(v_id, 'matter_created', 'Matter created.', v_init_kind, v_init_id, false);

  IF nullif(trim(coalesce(payload->>'evidence_url', '')), '') IS NOT NULL THEN
    INSERT INTO public.matter_attachments (
      matter_id, kind, url, label, uploaded_by_profile_id
    ) VALUES (
      v_id, 'url', trim(payload->>'evidence_url'),
      nullif(trim(coalesce(payload->>'evidence_label', '')), ''),
      v_self
    );
  END IF;

  IF v_submit THEN
    PERFORM public.matter_log_event(v_id, 'matter_submitted', 'Matter submitted.', v_init_kind, v_init_id, false);
    PERFORM public.matter_log_event(
      v_id, 'recipient_assigned',
      'Addressed to ' || public.matter_profile_display_name(v_addr_id) || '.',
      v_init_kind, v_init_id, false
    );
    SELECT * INTO v_defaults FROM public.matter_type_defaults WHERE matter_type = v_type;
    PERFORM public.matter_assign_action(
      v_id, v_defaults.initial_action_type, v_addr_kind, v_addr_id,
      payload->>'addressee_unit_label', v_defaults.timing_policy_id, v_defaults.timeout_behavior
    );
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_matter_comment(
  p_matter_id uuid,
  p_body text,
  p_parent_id uuid DEFAULT NULL,
  p_author_kind text DEFAULT 'person',
  p_mentioned_profile_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_id uuid;
  v_kind text := coalesce(nullif(p_author_kind, ''), 'person');
  v_author uuid := v_self;
  v_mention uuid;
BEGIN
  IF v_self IS NULL THEN
    RAISE EXCEPTION 'Sign in to comment.';
  END IF;
  IF NOT public.can_access_matter(p_matter_id) THEN
    RAISE EXCEPTION 'You cannot comment on this Matter.';
  END IF;
  IF char_length(trim(coalesce(p_body, ''))) < 1 THEN
    RAISE EXCEPTION 'Write a comment.';
  END IF;
  IF v_kind = 'organization' THEN
    SELECT responsible_profile_id INTO v_author
    FROM public.matters WHERE id = p_matter_id;
    IF NOT public.current_profile_represents_actor('organization', v_author) THEN
      v_author := v_self;
      v_kind := 'person';
    END IF;
  END IF;
  INSERT INTO public.matter_comments (
    matter_id, parent_id, author_kind, author_profile_id, body, mentioned_profile_ids
  ) VALUES (
    p_matter_id, p_parent_id, v_kind, v_self, trim(p_body), coalesce(p_mentioned_profile_ids, '{}'::uuid[])
  )
  RETURNING id INTO v_id;
  PERFORM public.matter_log_event(
    p_matter_id, 'comment_added',
    'Comment posted. This did not complete the required action.',
    v_kind, v_self, false
  );
  PERFORM public.matter_add_party(p_matter_id, 'participant', v_kind, v_self, NULL);
  FOREACH v_mention IN ARRAY coalesce(p_mentioned_profile_ids, '{}'::uuid[])
  LOOP
    PERFORM public.matter_notify_actor('person', v_mention, 'matter_mention', 'You were mentioned', 'Someone mentioned you on a Matter.', p_matter_id);
  END LOOP;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_matter_attachment(
  p_matter_id uuid,
  p_kind text,
  p_file_path text DEFAULT NULL,
  p_file_name text DEFAULT NULL,
  p_content_type text DEFAULT NULL,
  p_byte_size bigint DEFAULT NULL,
  p_url text DEFAULT NULL,
  p_label text DEFAULT NULL,
  p_comment_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_self uuid := public.current_profile_id();
  v_id uuid;
BEGIN
  IF v_self IS NULL OR NOT public.can_access_matter(p_matter_id) THEN
    RAISE EXCEPTION 'You cannot add evidence to this Matter.';
  END IF;
  INSERT INTO public.matter_attachments (
    matter_id, comment_id, kind, file_path, file_name, content_type, byte_size, url, label, uploaded_by_profile_id
  ) VALUES (
    p_matter_id, p_comment_id, coalesce(p_kind, 'file'), p_file_path, p_file_name, p_content_type, p_byte_size,
    p_url, p_label, v_self
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

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

  IF v_actor_kind = 'organization' AND NOT public.current_profile_represents_actor(
    v_matter.responsible_kind, v_matter.responsible_profile_id
  ) AND NOT public.current_profile_represents_actor(
    v_matter.addressee_kind, v_matter.addressee_profile_id
  ) THEN
    v_actor_kind := 'person';
  END IF;

  IF p_action = 'reopen' THEN
    IF v_matter.lifecycle_status <> 'closed' THEN
      RAISE EXCEPTION 'Only a closed Matter can be reopened.';
    END IF;
    IF NOT (
      public.current_profile_represents_actor(v_matter.initiator_kind, v_matter.initiator_profile_id)
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
    WHERE id = p_matter_id;
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

  IF p_action = 'close' THEN
    IF NOT public.current_profile_represents_actor(v_matter.initiator_kind, v_matter.initiator_profile_id) THEN
      RAISE EXCEPTION 'Only the initiator can close this Matter.';
    END IF;
    PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'close');
    PERFORM public.matter_close(
      p_matter_id, 'manual', coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Closed by the initiator.'),
      v_actor_kind, v_self, false
    );
    RETURN;
  END IF;

  SELECT * INTO v_action
  FROM public.matter_action_requirements
  WHERE id = v_matter.current_action_id;
  IF NOT FOUND OR v_action.status NOT IN ('pending', 'overdue') THEN
    RAISE EXCEPTION 'No pending action on this Matter.';
  END IF;
  IF NOT public.current_profile_represents_actor(v_action.assigned_kind, v_action.assigned_profile_id)
     AND p_action <> 'invite_party' THEN
    RAISE EXCEPTION 'This action is assigned to someone else.';
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
        p_matter_id, 'response_requested',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'A response was recorded.'),
        v_actor_kind, v_self, false
      );
      IF v_action.action_type = 'clarify' THEN
        PERFORM public.matter_assign_action(
          p_matter_id, 'respond', v_matter.responsible_kind, v_matter.responsible_profile_id,
          v_matter.responsible_unit_label, 'question_response', 'remind'
        );
      ELSE
        PERFORM public.matter_assign_action(
          p_matter_id, 'confirm_resolution', v_matter.initiator_kind, v_matter.initiator_profile_id,
          v_matter.initiator_unit_label, 'resolution_confirmation', 'auto_close'
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
      PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'mark_no_action_required');
      PERFORM public.matter_log_event(
        p_matter_id, 'no_action_required_marked',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Marked as no action required.'),
        v_actor_kind, v_self, false
      );
      PERFORM public.matter_assign_action(
        p_matter_id, 'confirm_resolution', v_matter.initiator_kind, v_matter.initiator_profile_id,
        v_matter.initiator_unit_label, 'resolution_confirmation', 'auto_close'
      );
    WHEN 'mark_addressed' THEN
      PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'mark_addressed');
      PERFORM public.matter_log_event(
        p_matter_id, 'marked_addressed',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Marked as addressed with a final response.'),
        v_actor_kind, v_self, false
      );
      PERFORM public.matter_assign_action(
        p_matter_id, 'confirm_resolution', v_matter.initiator_kind, v_matter.initiator_profile_id,
        v_matter.initiator_unit_label, 'resolution_confirmation', 'auto_close'
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
        v_matter.responsible_unit_label, 'address_work', 'remind'
      );
    WHEN 'need_clarification' THEN
      PERFORM public.matter_complete_current_action(p_matter_id, v_actor_kind, v_self, 'need_clarification');
      PERFORM public.matter_log_event(
        p_matter_id, 'clarification_requested',
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Initiator needs clarification.'),
        v_actor_kind, v_self, false
      );
      PERFORM public.matter_assign_action(
        p_matter_id, 'respond', v_matter.responsible_kind, v_matter.responsible_profile_id,
        v_matter.responsible_unit_label, 'clarification_response', 'remind'
      );
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
  v_count integer := 0;
BEGIN
  FOR v_row IN
    SELECT a.*
    FROM public.matter_action_requirements a
    JOIN public.matters m ON m.id = a.matter_id
    WHERE a.status IN ('pending', 'overdue')
      AND m.lifecycle_status IN ('submitted', 'active')
      AND a.id = m.current_action_id
  LOOP
    IF now() >= v_row.reminder_at AND now() < v_row.due_at THEN
      INSERT INTO public.matter_reminders (action_id, reminder_kind)
      VALUES (v_row.id, 'approaching')
      ON CONFLICT (action_id, reminder_kind) DO NOTHING;
      IF FOUND THEN
        PERFORM public.matter_log_event(
          v_row.matter_id, 'reminder_sent', 'Approaching-deadline reminder sent.',
          'system', NULL, true, jsonb_build_object('reminderKind', 'approaching')
        );
        PERFORM public.matter_notify_actor(
          v_row.assigned_kind, v_row.assigned_profile_id,
          'matter_action_reminder', 'Matter deadline approaching',
          'A Matter still needs your action.', v_row.matter_id
        );
        v_count := v_count + 1;
      END IF;
    END IF;

    IF now() >= v_row.due_at AND v_row.timeout_action = 'auto_close' THEN
      PERFORM public.matter_close(
        v_row.matter_id,
        'auto_no_initiator_response',
        'Closed automatically after no response from the initiator within the resolution-review period.',
        'system', NULL, true
      );
      v_count := v_count + 1;
      CONTINUE;
    END IF;

    IF now() >= v_row.due_at AND v_row.status = 'pending' THEN
      UPDATE public.matter_action_requirements SET status = 'overdue' WHERE id = v_row.id;
      PERFORM public.matter_log_event(
        v_row.matter_id, 'action_overdue', 'The required action is overdue.',
        'system', NULL, true, '{}'::jsonb
      );
      INSERT INTO public.matter_reminders (action_id, reminder_kind)
      VALUES (v_row.id, 'overdue')
      ON CONFLICT (action_id, reminder_kind) DO NOTHING;
      IF FOUND THEN
        PERFORM public.matter_log_event(
          v_row.matter_id, 'reminder_sent', 'Overdue notification sent.',
          'system', NULL, true, jsonb_build_object('reminderKind', 'overdue')
        );
        PERFORM public.matter_notify_actor(
          v_row.assigned_kind, v_row.assigned_profile_id,
          'matter_action_overdue', 'Matter action overdue',
          'A required Matter action is overdue.', v_row.matter_id
        );
      END IF;
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ---------------------------------------------------------------------------
-- Reads
-- ---------------------------------------------------------------------------

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
BEGIN
  SELECT * INTO v_matter FROM public.matters WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF v_matter.current_action_id IS NOT NULL THEN
    SELECT * INTO v_action FROM public.matter_action_requirements WHERE id = v_matter.current_action_id;
  END IF;
  RETURN jsonb_build_object(
    'matter', to_jsonb(v_matter) || jsonb_build_object(
      'initiator_display_name', public.matter_profile_display_name(v_matter.initiator_profile_id),
      'addressee_display_name', public.matter_profile_display_name(v_matter.addressee_profile_id),
      'responsible_display_name', public.matter_profile_display_name(v_matter.responsible_profile_id)
    ),
    'current_action', CASE
      WHEN v_matter.current_action_id IS NULL OR v_action.id IS NULL THEN NULL
      ELSE to_jsonb(v_action) || jsonb_build_object(
        'assigned_display_name', public.matter_profile_display_name(v_action.assigned_profile_id)
      )
    END
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
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_matters(p_queue text DEFAULT 'mine')
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
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
  PERFORM public.process_matter_action_timeouts();

  SELECT coalesce(jsonb_agg(public.matter_row_json(x.id) ORDER BY x.updated_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT DISTINCT m.id, m.updated_at
    FROM public.matters m
    LEFT JOIN public.matter_action_requirements a ON a.id = m.current_action_id
    LEFT JOIN public.matter_parties p ON p.matter_id = m.id
    WHERE public.can_access_matter(m.id)
      AND (
        (p_queue = 'needs_action'
          AND m.lifecycle_status IN ('submitted', 'active')
          AND a.status IN ('pending', 'overdue')
          AND public.current_profile_represents_actor(a.assigned_kind, a.assigned_profile_id))
        OR (p_queue = 'mine'
          AND (
            public.current_profile_represents_actor(m.initiator_kind, m.initiator_profile_id)
            OR public.current_profile_represents_actor(m.responsible_kind, m.responsible_profile_id)
            OR public.current_profile_represents_actor(m.addressee_kind, m.addressee_profile_id)
          ))
        OR (p_queue = 'participating'
          AND public.current_profile_is_matter_party(m.id)
          AND NOT public.current_profile_represents_actor(m.initiator_kind, m.initiator_profile_id)
          AND (a.id IS NULL OR NOT public.current_profile_represents_actor(a.assigned_kind, a.assigned_profile_id)))
        OR (p_queue = 'organization'
          AND EXISTS (
            SELECT 1 FROM public.linked_accounts la
            WHERE la.owner_profile_id = v_self
              AND la.relationship_type = 'business'
              AND (
                m.addressee_profile_id = la.linked_profile_id
                OR m.responsible_profile_id = la.linked_profile_id
                OR (a.assigned_profile_id = la.linked_profile_id AND a.status IN ('pending', 'overdue'))
              )
          ))
      )
    ORDER BY m.updated_at DESC
    LIMIT 100
  ) x;
  RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------

ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_action_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_timing_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_type_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_escalation_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS matters_select ON public.matters;
CREATE POLICY matters_select ON public.matters FOR SELECT TO authenticated
  USING (public.can_access_matter(id));

DROP POLICY IF EXISTS matter_actions_select ON public.matter_action_requirements;
CREATE POLICY matter_actions_select ON public.matter_action_requirements FOR SELECT TO authenticated
  USING (public.can_access_matter(matter_id));

DROP POLICY IF EXISTS matter_parties_select ON public.matter_parties;
CREATE POLICY matter_parties_select ON public.matter_parties FOR SELECT TO authenticated
  USING (public.can_access_matter(matter_id));

DROP POLICY IF EXISTS matter_comments_select ON public.matter_comments;
CREATE POLICY matter_comments_select ON public.matter_comments FOR SELECT TO authenticated
  USING (public.can_access_matter(matter_id));

DROP POLICY IF EXISTS matter_attachments_select ON public.matter_attachments;
CREATE POLICY matter_attachments_select ON public.matter_attachments FOR SELECT TO authenticated
  USING (public.can_access_matter(matter_id));

DROP POLICY IF EXISTS matter_events_select ON public.matter_events;
CREATE POLICY matter_events_select ON public.matter_events FOR SELECT TO authenticated
  USING (public.can_access_matter(matter_id));

DROP POLICY IF EXISTS matter_reminders_select ON public.matter_reminders;
CREATE POLICY matter_reminders_select ON public.matter_reminders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.matter_action_requirements a
    WHERE a.id = matter_reminders.action_id AND public.can_access_matter(a.matter_id)
  ));

DROP POLICY IF EXISTS matter_timing_select ON public.matter_timing_policies;
CREATE POLICY matter_timing_select ON public.matter_timing_policies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS matter_type_defaults_select ON public.matter_type_defaults;
CREATE POLICY matter_type_defaults_select ON public.matter_type_defaults FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS matter_escalation_select ON public.matter_escalation_policies;
CREATE POLICY matter_escalation_select ON public.matter_escalation_policies FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.matters TO authenticated;
GRANT SELECT ON public.matter_action_requirements TO authenticated;
GRANT SELECT ON public.matter_parties TO authenticated;
GRANT SELECT ON public.matter_comments TO authenticated;
GRANT SELECT ON public.matter_attachments TO authenticated;
GRANT SELECT ON public.matter_events TO authenticated;
GRANT SELECT ON public.matter_reminders TO authenticated;
GRANT SELECT ON public.matter_timing_policies TO authenticated;
GRANT SELECT ON public.matter_type_defaults TO authenticated;
GRANT SELECT ON public.matter_escalation_policies TO authenticated;

REVOKE ALL ON FUNCTION public.create_matter(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_matter_comment(uuid, text, uuid, text, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_matter_attachment(uuid, text, text, text, text, bigint, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.perform_matter_formal_action(uuid, text, text, text, uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_matter_action_timeouts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_matter(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_matters(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_matter(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_matter(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_matter_comment(uuid, text, uuid, text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_matter_attachment(uuid, text, text, text, text, bigint, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perform_matter_formal_action(uuid, text, text, text, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_matter_action_timeouts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_matter(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_matters(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_matter(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_represents_actor(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.matter_profile_display_name(uuid) TO authenticated;

DROP POLICY IF EXISTS "Matter files select entitled" ON storage.objects;
CREATE POLICY "Matter files select entitled"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'matter-files'
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.can_access_matter(split_part(name, '/', 1)::uuid)
);

DROP POLICY IF EXISTS "Matter files insert entitled" ON storage.objects;
CREATE POLICY "Matter files insert entitled"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'matter-files'
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.can_access_matter(split_part(name, '/', 1)::uuid)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('matter_action_timeout_tick');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule(
      'matter_action_timeout_tick',
      '15 * * * *',
      $cron$SELECT public.process_matter_action_timeouts();$cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

COMMENT ON TABLE public.matters IS
  'Generic Matter collaboration object. Type is a classification, not a frozen workflow.';
COMMENT ON TABLE public.matter_action_requirements IS
  'Current Action engine. Comments never complete these rows.';
