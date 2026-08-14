-- Live contribution evidence, evaluation history, score history, and declared context.
-- Evidence attaches to an existing canonical contribution root. It does not mint a new contribution.

CREATE TABLE IF NOT EXISTS public.contribution_evidence_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_source_table text NOT NULL,
  contribution_source_id text NOT NULL,
  subject_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluator_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL
    CHECK (kind IN (
      'impact_outcome',
      'beneficiary_feedback',
      'observer_feedback',
      'independent_validation',
      'durability',
      'reversal',
      'adverse_outcome',
      'dispute',
      'evaluator_reweight'
    )),
  evaluator_role text NOT NULL
    CHECK (evaluator_role IN (
      'general_observer',
      'affected_user',
      'beneficiary',
      'contributor',
      'collaborator',
      'peer',
      'domain_expert',
      'institutional_evaluator'
    )),
  ratings jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  relationship_context text,
  affected boolean NOT NULL DEFAULT false,
  conflict_type text,
  conflict_disclosed boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_status text
    CHECK (validation_status IS NULL OR validation_status IN ('submitted', 'accepted', 'disputed', 'withdrawn')),
  reweight_reason text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contribution_evidence_records_root_idx
  ON public.contribution_evidence_records (contribution_source_table, contribution_source_id, occurred_at);

CREATE INDEX IF NOT EXISTS contribution_evidence_records_subject_idx
  ON public.contribution_evidence_records (subject_profile_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS contribution_evidence_records_evaluator_idx
  ON public.contribution_evidence_records (evaluator_profile_id, occurred_at DESC);

COMMENT ON TABLE public.contribution_evidence_records IS
  'Immutable later evidence, feedback, and independent validation attached to an existing contribution root.';

ALTER TABLE public.contribution_evidence_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read contribution evidence" ON public.contribution_evidence_records;
CREATE POLICY "Members can read contribution evidence"
  ON public.contribution_evidence_records FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can insert own contribution evidence" ON public.contribution_evidence_records;
CREATE POLICY "Members can insert own contribution evidence"
  ON public.contribution_evidence_records FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = evaluator_profile_id AND p.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON public.contribution_evidence_records TO authenticated;

CREATE TABLE IF NOT EXISTS public.contribution_evaluation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_source_table text NOT NULL,
  contribution_source_id text NOT NULL,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_version text NOT NULL,
  stage text,
  observation numeric(6, 2),
  realized_impact numeric(6, 2),
  verification_kind text,
  cause text NOT NULL,
  evidence_record_id uuid REFERENCES public.contribution_evidence_records(id) ON DELETE SET NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contribution_evaluation_history_root_idx
  ON public.contribution_evaluation_history (contribution_source_table, contribution_source_id, created_at);

ALTER TABLE public.contribution_evaluation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read contribution evaluation history" ON public.contribution_evaluation_history;
CREATE POLICY "Members can read contribution evaluation history"
  ON public.contribution_evaluation_history FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can insert contribution evaluation history" ON public.contribution_evaluation_history;
CREATE POLICY "Members can insert contribution evaluation history"
  ON public.contribution_evaluation_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON public.contribution_evaluation_history TO authenticated;

CREATE TABLE IF NOT EXISTS public.profile_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_version text NOT NULL,
  previous_contributions numeric(6, 2),
  new_contributions numeric(6, 2),
  previous_overall numeric(6, 2),
  new_overall numeric(6, 2),
  previous_confidence text,
  new_confidence text,
  cause text NOT NULL,
  evidence_root text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_score_history_profile_idx
  ON public.profile_score_history (profile_id, created_at DESC);

ALTER TABLE public.profile_score_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read profile score history" ON public.profile_score_history;
CREATE POLICY "Members can read profile score history"
  ON public.profile_score_history FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can insert profile score history" ON public.profile_score_history;
CREATE POLICY "Members can insert profile score history"
  ON public.profile_score_history FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON public.profile_score_history TO authenticated;

CREATE TABLE IF NOT EXISTS public.profile_declared_context (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  interests text[] NOT NULL DEFAULT ARRAY[]::text[],
  goals text[] NOT NULL DEFAULT ARRAY[]::text[],
  contribution_interests text[] NOT NULL DEFAULT ARRAY[]::text[],
  priorities text[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_declared_context ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read declared context" ON public.profile_declared_context;
CREATE POLICY "Members can read declared context"
  ON public.profile_declared_context FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Members can write own declared context" ON public.profile_declared_context;
CREATE POLICY "Members can write own declared context"
  ON public.profile_declared_context FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update own declared context" ON public.profile_declared_context;
CREATE POLICY "Members can update own declared context"
  ON public.profile_declared_context FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "Members can delete own declared context" ON public.profile_declared_context;
CREATE POLICY "Members can delete own declared context"
  ON public.profile_declared_context FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_id AND p.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_declared_context TO authenticated;
