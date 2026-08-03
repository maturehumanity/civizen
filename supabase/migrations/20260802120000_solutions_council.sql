-- Governance Solutions: citizen problems + multi-agent (ChatGPT / Gemini / Claude) council.

-- ---------------------------------------------------------------------------
-- System agent profiles (no auth.users row)
-- ---------------------------------------------------------------------------

INSERT INTO public.profiles (
  id,
  user_id,
  username,
  full_name,
  role,
  is_system_agent,
  is_verified,
  avatar_url
)
VALUES
  (
    'a0000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'chatgpt_agent',
    'ChatGPT',
    'system'::public.app_role,
    true,
    false,
    '/avatars/chatgpt.svg'
  ),
  (
    'a0000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'gemini_agent',
    'Gemini',
    'system'::public.app_role,
    true,
    false,
    '/avatars/gemini.svg'
  ),
  (
    'a0000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'claude_agent',
    'Claude',
    'system'::public.app_role,
    true,
    false,
    '/avatars/claude.svg'
  )
ON CONFLICT (id) DO UPDATE SET
  username = excluded.username,
  full_name = excluded.full_name,
  role = excluded.role,
  is_system_agent = excluded.is_system_agent,
  avatar_url = excluded.avatar_url,
  user_id = NULL,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.solution_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'debating'
    CHECK (status IN ('open', 'debating', 'consensus', 'split', 'closed')),
  agreed_proposal_id uuid NULL,
  current_round integer NOT NULL DEFAULT 0,
  max_rounds integer NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT solution_problems_title_len CHECK (char_length(trim(title)) BETWEEN 3 AND 200),
  CONSTRAINT solution_problems_body_len CHECK (char_length(trim(body)) BETWEEN 10 AND 8000)
);

COMMENT ON TABLE public.solution_problems IS 'Citizen-posted problems for the multi-agent Solutions council.';

CREATE TABLE IF NOT EXISTS public.solution_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.solution_problems(id) ON DELETE CASCADE,
  speaker text NOT NULL CHECK (speaker IN ('citizen', 'chatgpt', 'gemini', 'claude')),
  speaker_profile_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  stance jsonb NOT NULL DEFAULT '{}'::jsonb,
  round integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS solution_turns_problem_created_idx
  ON public.solution_turns (problem_id, created_at);

CREATE INDEX IF NOT EXISTS solution_turns_problem_round_speaker_idx
  ON public.solution_turns (problem_id, round, speaker);

CREATE TABLE IF NOT EXISTS public.solution_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.solution_problems(id) ON DELETE CASCADE,
  source text NOT NULL
    CHECK (source IN ('consensus', 'chatgpt', 'gemini', 'claude', 'coalition')),
  title text NOT NULL,
  body text NOT NULL,
  supporting_speakers text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS solution_proposals_problem_idx
  ON public.solution_proposals (problem_id);

ALTER TABLE public.solution_problems
  DROP CONSTRAINT IF EXISTS solution_problems_agreed_proposal_fk;
ALTER TABLE public.solution_problems
  ADD CONSTRAINT solution_problems_agreed_proposal_fk
  FOREIGN KEY (agreed_proposal_id) REFERENCES public.solution_proposals(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.solution_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.solution_problems(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT solution_comments_body_len CHECK (char_length(trim(body)) BETWEEN 1 AND 4000)
);

CREATE INDEX IF NOT EXISTS solution_comments_problem_created_idx
  ON public.solution_comments (problem_id, created_at);

CREATE TABLE IF NOT EXISTS public.solution_proposal_endorsements (
  proposal_id uuid NOT NULL REFERENCES public.solution_proposals(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (proposal_id, profile_id)
);

CREATE INDEX IF NOT EXISTS solution_problems_status_created_idx
  ON public.solution_problems (status, created_at DESC);

CREATE INDEX IF NOT EXISTS solution_problems_author_created_idx
  ON public.solution_problems (author_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.solution_problems_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS solution_problems_updated_at ON public.solution_problems;
CREATE TRIGGER solution_problems_updated_at
  BEFORE UPDATE ON public.solution_problems
  FOR EACH ROW
  EXECUTE FUNCTION public.solution_problems_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.solution_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_proposal_endorsements ENABLE ROW LEVEL SECURITY;

-- Problems: authenticated members can read; insert/update own as author
DROP POLICY IF EXISTS "Members can read solution problems" ON public.solution_problems;
CREATE POLICY "Members can read solution problems"
  ON public.solution_problems FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can insert own solution problems" ON public.solution_problems;
CREATE POLICY "Members can insert own solution problems"
  ON public.solution_problems FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = author_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authors can update own solution problems" ON public.solution_problems;
CREATE POLICY "Authors can update own solution problems"
  ON public.solution_problems FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = author_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = author_id AND p.user_id = auth.uid()
    )
  );

-- Turns: members read; citizens insert own citizen turns; service role writes agent turns
DROP POLICY IF EXISTS "Members can read solution turns" ON public.solution_turns;
CREATE POLICY "Members can read solution turns"
  ON public.solution_turns FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can insert citizen solution turns" ON public.solution_turns;
CREATE POLICY "Members can insert citizen solution turns"
  ON public.solution_turns FOR INSERT TO authenticated
  WITH CHECK (
    speaker = 'citizen'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = speaker_profile_id AND p.user_id = auth.uid()
    )
  );

-- Proposals: read for members; inserts via service role (edge function)
DROP POLICY IF EXISTS "Members can read solution proposals" ON public.solution_proposals;
CREATE POLICY "Members can read solution proposals"
  ON public.solution_proposals FOR SELECT TO authenticated
  USING (true);

-- Comments
DROP POLICY IF EXISTS "Members can read solution comments" ON public.solution_comments;
CREATE POLICY "Members can read solution comments"
  ON public.solution_comments FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can insert own solution comments" ON public.solution_comments;
CREATE POLICY "Members can insert own solution comments"
  ON public.solution_comments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = author_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authors can delete own solution comments" ON public.solution_comments;
CREATE POLICY "Authors can delete own solution comments"
  ON public.solution_comments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = author_id AND p.user_id = auth.uid()
    )
  );

-- Endorsements
DROP POLICY IF EXISTS "Members can read solution endorsements" ON public.solution_proposal_endorsements;
CREATE POLICY "Members can read solution endorsements"
  ON public.solution_proposal_endorsements FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can insert own solution endorsements" ON public.solution_proposal_endorsements;
CREATE POLICY "Members can insert own solution endorsements"
  ON public.solution_proposal_endorsements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete own solution endorsements" ON public.solution_proposal_endorsements;
CREATE POLICY "Members can delete own solution endorsements"
  ON public.solution_proposal_endorsements FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime (optional publication — ignore if already members)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.solution_problems;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.solution_turns;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.solution_proposals;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
