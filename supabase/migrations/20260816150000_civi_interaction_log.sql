-- Civi development-phase interaction history for Settings > AI Agent.
-- Founder / admin / system review only. Not a member-facing archive.

CREATE TABLE IF NOT EXISTS public.civi_interaction_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  audience text NOT NULL CHECK (audience IN ('guest', 'member')),
  channel text NOT NULL CHECK (channel IN ('public', 'messaging')),
  question text NOT NULL,
  answer text NOT NULL,
  answer_source text NOT NULL CHECK (answer_source IN ('knowledge', 'memory', 'model', 'refusal', 'greeting')),
  remembered boolean NOT NULL DEFAULT false,
  actor_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  conversation_id uuid
);

CREATE INDEX IF NOT EXISTS civi_interaction_log_created_idx
  ON public.civi_interaction_log (created_at DESC);

ALTER TABLE public.civi_interaction_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.civi_interaction_log IS
  'Development-phase Civi question/answer log for founder review. Not a personal archive and not a product memory store.';

CREATE OR REPLACE FUNCTION public.civi_caller_can_review_interactions()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN true;
  END IF;
  SELECT role::text INTO v_role
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN v_role IN ('founder', 'admin', 'system');
END;
$$;

CREATE OR REPLACE FUNCTION public.list_civi_interactions(p_limit integer DEFAULT 200)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  audience text,
  channel text,
  question text,
  answer text,
  answer_source text,
  remembered boolean,
  actor_name text,
  actor_username text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
BEGIN
  IF NOT public.civi_caller_can_review_interactions() THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 200), 200));

  RETURN QUERY
  SELECT
    log_row.id,
    log_row.created_at,
    log_row.audience,
    log_row.channel,
    log_row.question,
    log_row.answer,
    log_row.answer_source,
    log_row.remembered,
    NULLIF(btrim(COALESCE(p.full_name, '')), ''),
    NULLIF(btrim(COALESCE(p.username, '')), '')
  FROM public.civi_interaction_log AS log_row
  LEFT JOIN public.profiles AS p ON p.id = log_row.actor_profile_id
  ORDER BY log_row.created_at DESC
  LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.ingest_civi_interaction(
  p_audience text,
  p_channel text,
  p_question text,
  p_answer text,
  p_answer_source text,
  p_remembered boolean DEFAULT false,
  p_actor_profile_id uuid DEFAULT NULL,
  p_conversation_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_audience text;
  v_channel text;
  v_source text;
  v_question text;
  v_answer text;
  v_actor uuid;
  v_self uuid;
BEGIN
  v_audience := NULLIF(btrim(p_audience), '');
  v_channel := NULLIF(btrim(p_channel), '');
  v_source := NULLIF(btrim(p_answer_source), '');
  v_question := NULLIF(btrim(p_question), '');
  v_answer := NULLIF(btrim(p_answer), '');

  IF v_audience IS NULL OR v_channel IS NULL
     OR v_audience NOT IN ('guest', 'member')
     OR v_channel NOT IN ('public', 'messaging') THEN
    RAISE EXCEPTION 'invalid audience or channel';
  END IF;
  IF v_source IS NULL OR v_source NOT IN ('knowledge', 'memory', 'model', 'refusal', 'greeting') THEN
    RAISE EXCEPTION 'invalid answer source';
  END IF;
  IF v_question IS NULL OR v_answer IS NULL THEN
    RAISE EXCEPTION 'question and answer required';
  END IF;
  IF v_source = 'greeting' THEN
    RETURN NULL;
  END IF;

  v_question := left(v_question, 2000);
  v_answer := left(v_answer, 8000);
  v_actor := p_actor_profile_id;

  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    v_self := NULL;
    SELECT id INTO v_self
    FROM public.profiles
    WHERE user_id = auth.uid()
    LIMIT 1;
    IF v_self IS NULL THEN
      v_actor := NULL;
      v_audience := 'guest';
    ELSE
      v_actor := v_self;
      v_audience := 'member';
    END IF;
  END IF;

  IF (SELECT count(*) FROM public.civi_interaction_log) >= 2000 THEN
    DELETE FROM public.civi_interaction_log
    WHERE id IN (
      SELECT id
      FROM public.civi_interaction_log
      ORDER BY created_at ASC
      LIMIT 100
    );
  END IF;

  INSERT INTO public.civi_interaction_log (
    audience,
    channel,
    question,
    answer,
    answer_source,
    remembered,
    actor_profile_id,
    conversation_id
  )
  VALUES (
    v_audience,
    v_channel,
    v_question,
    v_answer,
    v_source,
    COALESCE(p_remembered, false),
    v_actor,
    p_conversation_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.civi_caller_can_review_interactions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.civi_caller_can_review_interactions() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.list_civi_interactions(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_civi_interactions(integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ingest_civi_interaction(text, text, text, text, text, boolean, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_civi_interaction(text, text, text, text, text, boolean, uuid, uuid) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
