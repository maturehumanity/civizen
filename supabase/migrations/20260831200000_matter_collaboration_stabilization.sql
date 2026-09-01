-- Matter Collaboration Phase 1 stabilization.
-- list_matters is read-only. Timeouts run only through process_matter_action_timeouts
-- (pg_cron when installed, otherwise scripts/db/run-matter-timeout-tick.sh).

CREATE OR REPLACE FUNCTION public.resolve_civizen_org_profile()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM (
    SELECT la.linked_profile_id AS id, 1 AS rank
    FROM public.linked_accounts la
    WHERE la.relationship_type = 'business'
      AND la.business_name_normalized = 'civizen'
    UNION ALL
    SELECT p.id, 2
    FROM public.profiles p
    WHERE lower(trim(p.username)) = 'civizen'
  ) candidates
  ORDER BY rank
  LIMIT 1
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
    WHEN p_action_type = 'confirm_resolution' THEN p_action IN (
      'confirm_resolved', 'confirm_partially_resolved', 'confirm_not_resolved', 'need_clarification', 'revealed_issue'
    )
    WHEN p_action_type = 'choose_next_party' THEN p_action IN ('redirect', 'invite_party')
    ELSE false
  END
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
  RETURNING current_action_id, id INTO v_action_id, v_closed;
  IF v_closed IS NULL THEN
    RETURN;
  END IF;
  IF v_action_id IS NOT NULL THEN
    UPDATE public.matter_action_requirements
    SET status = CASE WHEN p_is_system THEN 'expired' ELSE 'cancelled' END,
        completed_at = now(),
        completed_by_kind = p_actor_kind,
        completed_by_profile_id = p_actor_profile_id
    WHERE id = v_action_id
      AND status IN ('pending', 'overdue');
  END IF;
  PERFORM public.matter_log_event(
    p_matter_id,
    CASE WHEN p_is_system THEN 'matter_auto_closed' ELSE 'matter_manually_closed' END,
    p_reason,
    p_actor_kind, p_actor_profile_id, p_is_system,
    jsonb_build_object('closeKind', p_close_kind)
  );
END;
$$;

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
  IF v_init_kind = 'person' AND v_init_id <> v_self THEN
    RAISE EXCEPTION 'You can only create a Matter as yourself or an organization you represent.';
  END IF;
  IF NOT public.current_profile_represents_actor(v_init_kind, v_init_id) THEN
    RAISE EXCEPTION 'You can only create a Matter as yourself or an organization you represent.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_addr_id) THEN
    RAISE EXCEPTION 'Choose who this Matter is for.';
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
    matter_id, parent_id, author_kind, author_profile_id, body, mentioned_profile_ids
  ) VALUES (
    p_matter_id, p_parent_id, v_kind, v_author, trim(p_body), coalesce(p_mentioned_profile_ids, '{}'::uuid[])
  )
  RETURNING id INTO v_id;
  PERFORM public.matter_log_event(
    p_matter_id, 'comment_added',
    'Comment posted. This did not complete the required action.',
    v_kind, v_author, false
  );
  PERFORM public.matter_add_party(p_matter_id, 'participant', v_kind, v_author, NULL);
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
        coalesce(nullif(trim(coalesce(p_message, '')), ''), 'Need more information — discussion continues.'),
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
      AND a.id = m.current_action_id
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
        AND m.current_action_id = v_locked.id
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
          'matter_action_reminder', 'Matter deadline approaching',
          'A Matter still needs your action.', v_locked.matter_id
        );
        v_count := v_count + 1;
      END IF;
    END IF;

    IF now() >= v_locked.due_at AND v_locked.timeout_action = 'auto_close' THEN
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
          'system', NULL, true, jsonb_build_object('actionId', v_locked.id)
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
          'matter_action_overdue', 'Matter action overdue',
          'A required Matter action is overdue.', v_locked.matter_id
        );
      END IF;
    END IF;
  END LOOP;
  RETURN v_count;
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

REVOKE ALL ON FUNCTION public.matter_log_event(uuid, text, text, text, uuid, boolean, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.matter_notify_actor(text, uuid, text, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.matter_add_party(uuid, text, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.matter_assign_action(uuid, text, text, uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.matter_complete_current_action(uuid, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.matter_close(uuid, text, text, text, uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.matter_row_json(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_matter_action_timeouts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_profile_is_matter_party(uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.process_matter_action_timeouts() FROM authenticated;
REVOKE ALL ON FUNCTION public.matter_log_event(uuid, text, text, text, uuid, boolean, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.matter_notify_actor(text, uuid, text, text, text, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.matter_add_party(uuid, text, text, uuid, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.matter_assign_action(uuid, text, text, uuid, text, text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.matter_complete_current_action(uuid, text, uuid, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.matter_close(uuid, text, text, text, uuid, boolean) FROM authenticated;
REVOKE ALL ON FUNCTION public.matter_row_json(uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.resolve_civizen_org_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_matters(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_matter_action_timeouts() TO postgres;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.process_matter_action_timeouts() TO service_role;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    GRANT EXECUTE ON FUNCTION public.process_matter_action_timeouts() TO supabase_admin;
  END IF;
END $$;

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

COMMENT ON FUNCTION public.list_matters(text) IS
  'Read-only Matter queues. Does not run timeout/reminder/auto-close mutations.';
COMMENT ON FUNCTION public.process_matter_action_timeouts() IS
  'Authoritative Matter timeout worker. Serialized by advisory lock; row claims use FOR UPDATE SKIP LOCKED. Invoked by pg_cron job matter_action_timeout_tick (minute 15) when installed, or scripts/db/run-matter-timeout-tick.sh.';

