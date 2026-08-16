-- Civi checked memory: reusable answers after a Gemini (or other model) reply is reviewed.
-- Never stores personal records. Does not override identity, cheat sheet, or capability registry.

CREATE TABLE IF NOT EXISTS public.civi_learned_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_key text NOT NULL UNIQUE,
  question text NOT NULL,
  answer text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('general', 'grounded')),
  source text NOT NULL DEFAULT 'llm_checked',
  hit_count integer NOT NULL DEFAULT 1 CHECK (hit_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS civi_learned_memories_hit_idx
  ON public.civi_learned_memories (hit_count DESC, last_used_at DESC NULLS LAST);

ALTER TABLE public.civi_learned_memories ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.civi_learned_memories IS
  'Civi memory of checked model answers. General/world facts and grounded paraphrases only — never invented Civizen product claims or personal records.';

CREATE OR REPLACE FUNCTION public.list_civi_learned_memories(p_limit integer DEFAULT 200)
RETURNS TABLE (
  question_key text,
  question text,
  answer text,
  kind text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer;
BEGIN
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 200), 200));
  RETURN QUERY
  SELECT
    row.question_key,
    row.question,
    row.answer,
    row.kind
  FROM public.civi_learned_memories AS row
  ORDER BY row.hit_count DESC, row.last_used_at DESC NULLS LAST, row.created_at DESC
  LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.ingest_civi_learned_memory(
  p_question_key text,
  p_question text,
  p_answer text,
  p_kind text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_key text;
  v_kind text;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required'
      USING ERRCODE = '42501';
  END IF;

  v_key := NULLIF(btrim(p_question_key), '');
  v_kind := NULLIF(btrim(p_kind), '');
  IF v_key IS NULL OR NULLIF(btrim(p_question), '') IS NULL OR NULLIF(btrim(p_answer), '') IS NULL THEN
    RAISE EXCEPTION 'question and answer required';
  END IF;
  IF v_kind NOT IN ('general', 'grounded') THEN
    RAISE EXCEPTION 'invalid memory kind';
  END IF;
  IF char_length(btrim(p_answer)) < 40 OR char_length(btrim(p_answer)) > 2000 THEN
    RAISE EXCEPTION 'answer length is not reusable';
  END IF;

  SELECT id INTO v_id
  FROM public.civi_learned_memories
  WHERE question_key = v_key;

  IF v_id IS NOT NULL THEN
    UPDATE public.civi_learned_memories
    SET
      hit_count = hit_count + 1,
      last_used_at = now(),
      updated_at = now()
    WHERE id = v_id;
    RETURN v_id;
  END IF;

  IF (SELECT count(*) FROM public.civi_learned_memories) >= 400 THEN
    DELETE FROM public.civi_learned_memories
    WHERE id = (
      SELECT id
      FROM public.civi_learned_memories
      ORDER BY hit_count ASC, last_used_at NULLS FIRST, created_at ASC
      LIMIT 1
    );
  END IF;

  INSERT INTO public.civi_learned_memories (question_key, question, answer, kind)
  VALUES (v_key, btrim(p_question), btrim(p_answer), v_kind)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_civi_learned_memory(p_question_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service role required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.civi_learned_memories
  SET
    hit_count = hit_count + 1,
    last_used_at = now(),
    updated_at = now()
  WHERE question_key = NULLIF(btrim(p_question_key), '');
END;
$$;

REVOKE ALL ON FUNCTION public.list_civi_learned_memories(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_civi_learned_memories(integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.ingest_civi_learned_memory(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ingest_civi_learned_memory(text, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.touch_civi_learned_memory(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_civi_learned_memory(text) TO service_role;

NOTIFY pgrst, 'reload schema';
