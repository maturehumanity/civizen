-- Person-to-person threads: hide-for-me, mutual disappearing (going forward), 1-minute edit/unsend.
-- Nela / agent threads: members may still clear the whole assistant workspace.

ALTER TABLE public.private_conversations
  ADD COLUMN IF NOT EXISTS disappearing_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disappearing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS disappearing_set_by uuid REFERENCES public.profiles(id);

ALTER TABLE public.private_conversation_members
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'private_conversations_disappearing_minutes_chk'
  ) THEN
    ALTER TABLE public.private_conversations
      ADD CONSTRAINT private_conversations_disappearing_minutes_chk
      CHECK (disappearing_minutes IN (0, 60, 1440, 10080));
  END IF;
END
$$;

COMMENT ON COLUMN public.private_conversations.disappearing_minutes IS
  'Shared disappearing duration for both participants. 0 = off. Applies to messages sent after disappearing_started_at.';
COMMENT ON COLUMN public.private_conversation_members.hidden_at IS
  'When set, this member has hidden the thread from their inbox. The peer keeps their copy.';

-- ---------------------------------------------------------------------------
-- Edit window: 1 minute
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Participants can edit own recent private messages" ON public.private_messages;

CREATE POLICY "Participants can edit own recent private messages"
  ON public.private_messages
  FOR UPDATE
  USING (
    public.has_permission('message.create'::public.app_permission)
    AND private_messages.created_at >= now() - interval '1 minute'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = private_messages.sender_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_permission('message.create'::public.app_permission)
    AND private_messages.created_at >= now() - interval '1 minute'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = private_messages.sender_id
        AND p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Delete: unsend own recent in any thread; full clear only in agent threads
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Members can delete eligible private messages" ON public.private_messages;

CREATE POLICY "Members can delete eligible private messages"
  ON public.private_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.private_conversation_members m
      JOIN public.profiles p ON p.id = m.profile_id
      WHERE m.conversation_id = private_messages.conversation_id
        AND p.user_id = auth.uid()
    )
    AND (
      (
        EXISTS (
          SELECT 1
          FROM public.profiles me
          WHERE me.user_id = auth.uid()
            AND me.id = private_messages.sender_id
        )
        AND private_messages.created_at >= now() - interval '1 minute'
      )
      OR (
        EXISTS (
          SELECT 1
          FROM public.private_conversations c
          WHERE c.id = private_messages.conversation_id
            AND c.kind = 'agent'
        )
        AND (
          EXISTS (
            SELECT 1
            FROM public.profiles me
            WHERE me.user_id = auth.uid()
              AND me.id = private_messages.sender_id
          )
          OR private_messages.sender_id = 'a0000000-0000-4000-8000-000000000001'::uuid
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Members may update the shared disappearing setting on direct threads
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.private_conversations_before_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.id = OLD.id;
  NEW.kind = OLD.kind;
  NEW.created_at = OLD.created_at;

  IF NEW.disappearing_minutes IS DISTINCT FROM OLD.disappearing_minutes THEN
    IF NEW.disappearing_minutes = 0 THEN
      NEW.disappearing_started_at = NULL;
    ELSE
      NEW.disappearing_started_at = now();
    END IF;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_private_conversations_before_update_guard ON public.private_conversations;
CREATE TRIGGER trg_private_conversations_before_update_guard
BEFORE UPDATE ON public.private_conversations
FOR EACH ROW
EXECUTE FUNCTION public.private_conversations_before_update_guard();

DROP POLICY IF EXISTS "Members can update disappearing on their conversations" ON public.private_conversations;
CREATE POLICY "Members can update disappearing on their conversations"
  ON public.private_conversations
  FOR UPDATE
  USING (
    (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1) IS NOT NULL
    AND public.private_conversation_includes_profile(
      private_conversations.id,
      (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    )
    AND private_conversations.kind = 'direct'
  )
  WITH CHECK (
    (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1) IS NOT NULL
    AND public.private_conversation_includes_profile(
      private_conversations.id,
      (SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    )
    AND private_conversations.kind = 'direct'
  );

-- ---------------------------------------------------------------------------
-- New messages bring a hidden thread back for every member
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.private_messages_after_insert_unhide()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  UPDATE public.private_conversation_members
  SET hidden_at = NULL
  WHERE conversation_id = NEW.conversation_id
    AND hidden_at IS NOT NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_private_messages_after_insert_unhide ON public.private_messages;
CREATE TRIGGER trg_private_messages_after_insert_unhide
AFTER INSERT ON public.private_messages
FOR EACH ROW
EXECUTE FUNCTION public.private_messages_after_insert_unhide();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.private_hide_my_conversation(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_me uuid;
BEGIN
  SELECT p.id INTO v_me
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;

  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.private_conversation_includes_profile(p_conversation_id, v_me) THEN
    RAISE EXCEPTION 'not a member of this conversation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.private_conversations c
    WHERE c.id = p_conversation_id
      AND c.kind = 'direct'
  ) THEN
    RAISE EXCEPTION 'hide is only available for direct chats';
  END IF;

  UPDATE public.private_conversation_members
  SET hidden_at = now()
  WHERE conversation_id = p_conversation_id
    AND profile_id = v_me;
END;
$$;

REVOKE ALL ON FUNCTION public.private_hide_my_conversation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.private_hide_my_conversation(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.private_set_conversation_disappearing(
  p_conversation_id uuid,
  p_minutes integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_me uuid;
BEGIN
  IF p_minutes NOT IN (0, 60, 1440, 10080) THEN
    RAISE EXCEPTION 'invalid disappearing duration';
  END IF;

  SELECT p.id INTO v_me
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;

  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.private_conversation_includes_profile(p_conversation_id, v_me) THEN
    RAISE EXCEPTION 'not a member of this conversation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.private_conversations c
    WHERE c.id = p_conversation_id
      AND c.kind = 'direct'
  ) THEN
    RAISE EXCEPTION 'disappearing messages are only available for direct chats';
  END IF;

  UPDATE public.private_conversations
  SET
    disappearing_minutes = p_minutes,
    disappearing_set_by = v_me,
    updated_at = now()
  WHERE id = p_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.private_set_conversation_disappearing(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.private_set_conversation_disappearing(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.private_purge_expired_disappearing_messages(p_conversation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_me uuid;
  v_deleted integer := 0;
BEGIN
  SELECT p.id INTO v_me
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;

  IF v_me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.private_conversation_includes_profile(p_conversation_id, v_me) THEN
    RAISE EXCEPTION 'not a member of this conversation';
  END IF;

  DELETE FROM public.private_messages pm
  USING public.private_conversations c
  WHERE pm.conversation_id = c.id
    AND c.id = p_conversation_id
    AND c.disappearing_minutes > 0
    AND c.disappearing_started_at IS NOT NULL
    AND pm.created_at >= c.disappearing_started_at
    AND pm.created_at < now() - (c.disappearing_minutes * interval '1 minute');

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.private_purge_expired_disappearing_messages(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.private_purge_expired_disappearing_messages(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Inbox list: skip hidden threads; expose shared disappearing fields
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.private_list_my_conversations();

CREATE FUNCTION public.private_list_my_conversations()
RETURNS TABLE (
  conversation_id uuid,
  kind text,
  peer_profile_id uuid,
  peer_username text,
  peer_full_name text,
  peer_avatar_url text,
  last_content text,
  last_at timestamptz,
  last_is_e2ee boolean,
  disappearing_minutes integer,
  disappearing_started_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT p.id AS profile_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1
  ),
  my_conversations AS (
    SELECT
      c.id,
      c.kind,
      c.updated_at,
      c.disappearing_minutes,
      c.disappearing_started_at
    FROM public.private_conversations c
    JOIN public.private_conversation_members m ON m.conversation_id = c.id
    JOIN me ON m.profile_id = me.profile_id
    WHERE m.hidden_at IS NULL
  ),
  peers AS (
    SELECT
      mc.id AS conversation_id,
      mc.kind,
      mc.disappearing_minutes,
      mc.disappearing_started_at,
      p.id AS peer_profile_id,
      p.username AS peer_username,
      p.full_name AS peer_full_name,
      p.avatar_url AS peer_avatar_url
    FROM my_conversations mc
    JOIN public.private_conversation_members other
      ON other.conversation_id = mc.id
    JOIN me ON true
    JOIN public.profiles p ON p.id = other.profile_id
    WHERE other.profile_id <> me.profile_id
  ),
  last_msg AS (
    SELECT DISTINCT ON (pm.conversation_id)
      pm.conversation_id,
      CASE WHEN pm.message_kind = 'e2ee_v1' THEN NULL ELSE pm.content END AS last_content,
      pm.created_at AS last_at,
      (pm.message_kind = 'e2ee_v1') AS last_is_e2ee
    FROM public.private_messages pm
    JOIN my_conversations mc ON mc.id = pm.conversation_id
    WHERE NOT (
      mc.disappearing_minutes > 0
      AND mc.disappearing_started_at IS NOT NULL
      AND pm.created_at >= mc.disappearing_started_at
      AND pm.created_at < now() - (mc.disappearing_minutes * interval '1 minute')
    )
    ORDER BY pm.conversation_id, pm.created_at DESC
  )
  SELECT
    peers.conversation_id,
    peers.kind,
    peers.peer_profile_id,
    peers.peer_username,
    peers.peer_full_name,
    peers.peer_avatar_url,
    last_msg.last_content,
    last_msg.last_at,
    coalesce(last_msg.last_is_e2ee, false) AS last_is_e2ee,
    peers.disappearing_minutes,
    peers.disappearing_started_at
  FROM peers
  LEFT JOIN last_msg ON last_msg.conversation_id = peers.conversation_id
  ORDER BY
    CASE WHEN peers.kind = 'agent' THEN 0 ELSE 1 END,
    last_msg.last_at DESC NULLS LAST,
    peers.conversation_id DESC;
$$;

REVOKE ALL ON FUNCTION public.private_list_my_conversations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.private_list_my_conversations() TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.private_conversations;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

NOTIFY pgrst, 'reload schema';
