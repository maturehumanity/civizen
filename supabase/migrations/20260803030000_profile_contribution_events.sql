-- Civizen Score Contributions ledger: estimated activity events from domain sources.

CREATE TABLE IF NOT EXISTS public.profile_contribution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_table text NOT NULL,
  source_id text NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  summary text,
  capacity_estimate numeric(6, 2) NOT NULL DEFAULT 0
    CHECK (capacity_estimate >= 0 AND capacity_estimate <= 100),
  impact_estimate numeric(6, 2) NOT NULL DEFAULT 0
    CHECK (impact_estimate >= 0 AND impact_estimate <= 100),
  collaboration_estimate numeric(6, 2) NOT NULL DEFAULT 0
    CHECK (collaboration_estimate >= 0 AND collaboration_estimate <= 100),
  beneficiary_estimate numeric(6, 2) NOT NULL DEFAULT 0
    CHECK (beneficiary_estimate >= 0 AND beneficiary_estimate <= 100),
  verified boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  raw_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_contribution_events_source_unique UNIQUE (source_table, source_id)
);

CREATE INDEX IF NOT EXISTS profile_contribution_events_profile_occurred_idx
  ON public.profile_contribution_events (profile_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS profile_contribution_events_profile_type_idx
  ON public.profile_contribution_events (profile_id, event_type);

COMMENT ON TABLE public.profile_contribution_events IS
  'Estimated contribution activity events feeding Civizen Score Contributions.';

DO $$
BEGIN
  CREATE TRIGGER update_profile_contribution_events_updated_at
    BEFORE UPDATE ON public.profile_contribution_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_function THEN NULL;
END $$;

ALTER TABLE public.profile_contribution_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read contribution events"
  ON public.profile_contribution_events;
CREATE POLICY "Members can read contribution events"
  ON public.profile_contribution_events FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can insert own contribution events"
  ON public.profile_contribution_events;
CREATE POLICY "Members can insert own contribution events"
  ON public.profile_contribution_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update own contribution events"
  ON public.profile_contribution_events;
CREATE POLICY "Members can update own contribution events"
  ON public.profile_contribution_events FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete own contribution events"
  ON public.profile_contribution_events;
CREATE POLICY "Members can delete own contribution events"
  ON public.profile_contribution_events FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_contribution_events TO authenticated;

-- ---------------------------------------------------------------------------
-- Historical backfill from existing domain tables (idempotent upsert).
-- Estimates mirror v1 client heuristics so scores appear before first sync.
-- ---------------------------------------------------------------------------

INSERT INTO public.profile_contribution_events (
  profile_id, source_table, source_id, event_type, title, summary,
  capacity_estimate, impact_estimate, collaboration_estimate, beneficiary_estimate,
  verified, occurred_at, raw_meta
)
SELECT
  lc.author_id,
  'law_contributions',
  lc.id::text,
  'law_contribution',
  left(coalesce(nullif(trim(lc.title), ''), 'Law contribution'), 120),
  left(coalesce(lc.contribution_type::text, ''), 80),
  least(100, 70 * CASE
    WHEN char_length(coalesce(lc.note, '')) > 300 THEN 1.1
    WHEN char_length(coalesce(lc.note, '')) < 50 THEN 0.85
    ELSE 1.0
  END),
  least(100, CASE WHEN lc.status = 'approved' THEN 55 * 1.25 ELSE 55 END),
  20,
  60,
  lc.status = 'approved',
  coalesce(lc.reviewed_at, lc.created_at),
  jsonb_build_object(
    'status', lc.status::text,
    'contribution_type', lc.contribution_type::text,
    'note_len', char_length(coalesce(lc.note, ''))
  )
FROM public.law_contributions lc
ON CONFLICT (source_table, source_id) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  capacity_estimate = EXCLUDED.capacity_estimate,
  impact_estimate = EXCLUDED.impact_estimate,
  collaboration_estimate = EXCLUDED.collaboration_estimate,
  beneficiary_estimate = EXCLUDED.beneficiary_estimate,
  verified = EXCLUDED.verified,
  occurred_at = EXCLUDED.occurred_at,
  raw_meta = EXCLUDED.raw_meta,
  updated_at = now();

INSERT INTO public.profile_contribution_events (
  profile_id, source_table, source_id, event_type, title, summary,
  capacity_estimate, impact_estimate, collaboration_estimate, beneficiary_estimate,
  verified, occurred_at, raw_meta
)
SELECT
  p.id,
  'contribution_records',
  cr.id::text,
  'funding_record',
  left(coalesce(nullif(trim(cr.work_type), ''), 'Funding contribution'), 120),
  left(coalesce(cr.status, ''), 80),
  least(100, coalesce(cr.quality_score, 65)::numeric),
  least(100, CASE
    WHEN cr.status = 'verified' THEN greatest(coalesce(cr.impact_score, 70), 70) * 1.25
    ELSE coalesce(cr.impact_score, 50)
  END),
  15,
  least(100, greatest(55, least(100, coalesce(cr.verified_points, 0) / 10))),
  cr.status = 'verified',
  cr.created_at,
  jsonb_build_object(
    'status', cr.status,
    'work_type', cr.work_type,
    'verified_points', cr.verified_points
  )
FROM public.contribution_records cr
JOIN public.contributor_profiles cp ON cp.id = cr.contributor_id
JOIN public.profiles p ON p.user_id = cp.user_id
WHERE cp.user_id IS NOT NULL
ON CONFLICT (source_table, source_id) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  capacity_estimate = EXCLUDED.capacity_estimate,
  impact_estimate = EXCLUDED.impact_estimate,
  collaboration_estimate = EXCLUDED.collaboration_estimate,
  beneficiary_estimate = EXCLUDED.beneficiary_estimate,
  verified = EXCLUDED.verified,
  occurred_at = EXCLUDED.occurred_at,
  raw_meta = EXCLUDED.raw_meta,
  updated_at = now();

INSERT INTO public.profile_contribution_events (
  profile_id, source_table, source_id, event_type, title, summary,
  capacity_estimate, impact_estimate, collaboration_estimate, beneficiary_estimate,
  verified, occurred_at, raw_meta
)
SELECT
  sp.author_id,
  'solution_problems',
  sp.id::text,
  'solution_problem',
  left(coalesce(nullif(trim(sp.title), ''), 'Solution problem'), 120),
  left(coalesce(sp.status, ''), 80),
  least(100, 55 * CASE
    WHEN char_length(coalesce(sp.body, '')) > 300 THEN 1.1
    WHEN char_length(coalesce(sp.body, '')) < 50 THEN 0.85
    ELSE 1.0
  END),
  least(100, CASE
    WHEN sp.status IN ('consensus', 'closed') THEN 50 * 1.25
    ELSE 50
  END),
  35,
  65,
  sp.status IN ('consensus', 'closed'),
  sp.created_at,
  jsonb_build_object('status', sp.status, 'body_len', char_length(coalesce(sp.body, '')))
FROM public.solution_problems sp
ON CONFLICT (source_table, source_id) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  capacity_estimate = EXCLUDED.capacity_estimate,
  impact_estimate = EXCLUDED.impact_estimate,
  collaboration_estimate = EXCLUDED.collaboration_estimate,
  beneficiary_estimate = EXCLUDED.beneficiary_estimate,
  verified = EXCLUDED.verified,
  occurred_at = EXCLUDED.occurred_at,
  raw_meta = EXCLUDED.raw_meta,
  updated_at = now();

INSERT INTO public.profile_contribution_events (
  profile_id, source_table, source_id, event_type, title, summary,
  capacity_estimate, impact_estimate, collaboration_estimate, beneficiary_estimate,
  verified, occurred_at, raw_meta
)
SELECT
  sc.author_id,
  'solution_comments',
  sc.id::text,
  'solution_comment',
  left(coalesce(nullif(trim(sc.body), ''), 'Solution comment'), 120),
  'discuss',
  least(100, 35 * CASE
    WHEN char_length(coalesce(sc.body, '')) > 300 THEN 1.1
    WHEN char_length(coalesce(sc.body, '')) < 50 THEN 0.85
    ELSE 1.0
  END),
  30,
  70,
  40,
  false,
  sc.created_at,
  jsonb_build_object('body_len', char_length(coalesce(sc.body, '')))
FROM public.solution_comments sc
ON CONFLICT (source_table, source_id) DO UPDATE SET
  title = EXCLUDED.title,
  capacity_estimate = EXCLUDED.capacity_estimate,
  impact_estimate = EXCLUDED.impact_estimate,
  collaboration_estimate = EXCLUDED.collaboration_estimate,
  beneficiary_estimate = EXCLUDED.beneficiary_estimate,
  occurred_at = EXCLUDED.occurred_at,
  raw_meta = EXCLUDED.raw_meta,
  updated_at = now();

INSERT INTO public.profile_contribution_events (
  profile_id, source_table, source_id, event_type, title, summary,
  capacity_estimate, impact_estimate, collaboration_estimate, beneficiary_estimate,
  verified, occurred_at, raw_meta
)
SELECT
  spe.profile_id,
  'solution_proposal_endorsements',
  spe.proposal_id::text || ':' || spe.profile_id::text,
  'solution_endorsement',
  'Solution endorsement',
  'endorse',
  25,
  35,
  60,
  40,
  false,
  spe.created_at,
  jsonb_build_object('proposal_id', spe.proposal_id)
FROM public.solution_proposal_endorsements spe
ON CONFLICT (source_table, source_id) DO UPDATE SET
  capacity_estimate = EXCLUDED.capacity_estimate,
  impact_estimate = EXCLUDED.impact_estimate,
  collaboration_estimate = EXCLUDED.collaboration_estimate,
  beneficiary_estimate = EXCLUDED.beneficiary_estimate,
  occurred_at = EXCLUDED.occurred_at,
  raw_meta = EXCLUDED.raw_meta,
  updated_at = now();

INSERT INTO public.profile_contribution_events (
  profile_id, source_table, source_id, event_type, title, summary,
  capacity_estimate, impact_estimate, collaboration_estimate, beneficiary_estimate,
  verified, occurred_at, raw_meta
)
SELECT
  gp.proposer_id,
  'governance_proposals',
  gp.id::text,
  'governance_proposal',
  left(coalesce(nullif(trim(gp.title), ''), 'Governance proposal'), 120),
  left(coalesce(gp.status::text, ''), 80),
  least(100, 75 * CASE
    WHEN char_length(coalesce(gp.body, '')) > 300 THEN 1.1
    WHEN char_length(coalesce(gp.body, '')) < 50 THEN 0.85
    ELSE 1.0
  END),
  least(100, CASE
    WHEN gp.status::text = 'approved' THEN 60 * 1.25
    ELSE 60
  END),
  40,
  70,
  gp.status::text = 'approved',
  gp.created_at,
  jsonb_build_object('status', gp.status::text, 'body_len', char_length(coalesce(gp.body, '')))
FROM public.governance_proposals gp
ON CONFLICT (source_table, source_id) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  capacity_estimate = EXCLUDED.capacity_estimate,
  impact_estimate = EXCLUDED.impact_estimate,
  collaboration_estimate = EXCLUDED.collaboration_estimate,
  beneficiary_estimate = EXCLUDED.beneficiary_estimate,
  verified = EXCLUDED.verified,
  occurred_at = EXCLUDED.occurred_at,
  raw_meta = EXCLUDED.raw_meta,
  updated_at = now();

INSERT INTO public.profile_contribution_events (
  profile_id, source_table, source_id, event_type, title, summary,
  capacity_estimate, impact_estimate, collaboration_estimate, beneficiary_estimate,
  verified, occurred_at, raw_meta
)
SELECT
  gv.voter_id,
  'governance_proposal_votes',
  gv.id::text,
  'governance_vote',
  'Governance vote',
  left(coalesce(gv.choice::text, ''), 80),
  20,
  25,
  50,
  45,
  false,
  gv.created_at,
  jsonb_build_object('choice', gv.choice::text, 'proposal_id', gv.proposal_id)
FROM public.governance_proposal_votes gv
ON CONFLICT (source_table, source_id) DO UPDATE SET
  summary = EXCLUDED.summary,
  capacity_estimate = EXCLUDED.capacity_estimate,
  impact_estimate = EXCLUDED.impact_estimate,
  collaboration_estimate = EXCLUDED.collaboration_estimate,
  beneficiary_estimate = EXCLUDED.beneficiary_estimate,
  occurred_at = EXCLUDED.occurred_at,
  raw_meta = EXCLUDED.raw_meta,
  updated_at = now();

INSERT INTO public.profile_contribution_events (
  profile_id, source_table, source_id, event_type, title, summary,
  capacity_estimate, impact_estimate, collaboration_estimate, beneficiary_estimate,
  verified, occurred_at, raw_meta
)
SELECT
  po.author_id,
  'posts',
  po.id::text,
  'post',
  left(coalesce(nullif(trim(po.content), ''), 'Post'), 120),
  'social',
  least(100, 25 * CASE
    WHEN char_length(coalesce(po.content, '')) > 300 THEN 1.1
    WHEN char_length(coalesce(po.content, '')) < 50 THEN 0.85
    ELSE 1.0
  END),
  15,
  20,
  20,
  false,
  po.created_at,
  jsonb_build_object('content_len', char_length(coalesce(po.content, '')))
FROM public.posts po
ON CONFLICT (source_table, source_id) DO UPDATE SET
  title = EXCLUDED.title,
  capacity_estimate = EXCLUDED.capacity_estimate,
  impact_estimate = EXCLUDED.impact_estimate,
  collaboration_estimate = EXCLUDED.collaboration_estimate,
  beneficiary_estimate = EXCLUDED.beneficiary_estimate,
  occurred_at = EXCLUDED.occurred_at,
  raw_meta = EXCLUDED.raw_meta,
  updated_at = now();

INSERT INTO public.profile_contribution_events (
  profile_id, source_table, source_id, event_type, title, summary,
  capacity_estimate, impact_estimate, collaboration_estimate, beneficiary_estimate,
  verified, occurred_at, raw_meta
)
SELECT
  pc.author_id,
  'post_comments',
  pc.id::text,
  'post_comment',
  left(coalesce(nullif(trim(pc.content), ''), 'Comment'), 120),
  'social',
  least(100, 15 * CASE
    WHEN char_length(coalesce(pc.content, '')) > 300 THEN 1.1
    WHEN char_length(coalesce(pc.content, '')) < 50 THEN 0.85
    ELSE 1.0
  END),
  10,
  55,
  15,
  false,
  pc.created_at,
  jsonb_build_object('content_len', char_length(coalesce(pc.content, '')))
FROM public.post_comments pc
ON CONFLICT (source_table, source_id) DO UPDATE SET
  title = EXCLUDED.title,
  capacity_estimate = EXCLUDED.capacity_estimate,
  impact_estimate = EXCLUDED.impact_estimate,
  collaboration_estimate = EXCLUDED.collaboration_estimate,
  beneficiary_estimate = EXCLUDED.beneficiary_estimate,
  occurred_at = EXCLUDED.occurred_at,
  raw_meta = EXCLUDED.raw_meta,
  updated_at = now();

INSERT INTO public.profile_contribution_events (
  profile_id, source_table, source_id, event_type, title, summary,
  capacity_estimate, impact_estimate, collaboration_estimate, beneficiary_estimate,
  verified, occurred_at, raw_meta
)
SELECT
  ci.author_id,
  'content_items',
  ci.id::text,
  'content_item',
  left(coalesce(nullif(trim(ci.title), ''), nullif(trim(ci.body_preview), ''), 'Content item'), 120),
  left(coalesce(ci.review_status::text, ci.content_type, ''), 80),
  least(100, 50 * CASE
    WHEN char_length(coalesce(ci.body_preview, '')) > 300 THEN 1.1
    WHEN char_length(coalesce(ci.body_preview, '')) < 50 THEN 0.85
    ELSE 1.0
  END),
  least(100, CASE
    WHEN ci.review_status::text = 'approved' THEN 40 * 1.25
    ELSE 40
  END),
  25,
  45,
  ci.review_status::text = 'approved',
  coalesce(ci.submitted_at, ci.created_at),
  jsonb_build_object(
    'review_status', ci.review_status::text,
    'source_table', ci.source_table,
    'content_type', ci.content_type
  )
FROM public.content_items ci
WHERE ci.author_id IS NOT NULL
  AND (
    ci.source_table IS NULL
    OR ci.source_table NOT IN (
      'posts',
      'post_comments',
      'law_contributions',
      'solution_problems',
      'solution_comments',
      'governance_proposals',
      'governance_proposal_votes',
      'contribution_records'
    )
  )
ON CONFLICT (source_table, source_id) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  capacity_estimate = EXCLUDED.capacity_estimate,
  impact_estimate = EXCLUDED.impact_estimate,
  collaboration_estimate = EXCLUDED.collaboration_estimate,
  beneficiary_estimate = EXCLUDED.beneficiary_estimate,
  verified = EXCLUDED.verified,
  occurred_at = EXCLUDED.occurred_at,
  raw_meta = EXCLUDED.raw_meta,
  updated_at = now();
