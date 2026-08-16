-- Phase 5 Human Outcome & System Learning Loop.
-- Links existing Challenges, Projects, Governance Solutions, and Phase 4A snapshots.
-- Does not SELECT private Happiness tables. Comparison lives in the trusted TypeScript engine.

CREATE TABLE IF NOT EXISTS public.human_outcome_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id uuid NOT NULL REFERENCES public.wellbeing_aggregate_scopes(id) ON DELETE CASCADE,
  systemic_issue_candidate_id uuid REFERENCES public.systemic_issue_candidates(id) ON DELETE SET NULL,
  challenge_id uuid REFERENCES public.community_challenges(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.implementation_projects(id) ON DELETE SET NULL,
  governance_solution_id uuid REFERENCES public.solution_problems(id) ON DELETE SET NULL,
  intervention_action_id uuid REFERENCES public.wellbeing_insight_actions(id) ON DELETE SET NULL,
  solution_record_id uuid REFERENCES public.solution_records(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_domain text NOT NULL,
  target_factor text,
  objective text NOT NULL,
  intervention_title text NOT NULL,
  operational_outcome text,
  interpretation text,
  uncertainty_note text,
  status text NOT NULL DEFAULT 'awaiting_evidence' CHECK (status IN (
    'awaiting_evidence', 'early_signal', 'improvement_observed', 'no_clear_change',
    'concern_persists', 'mixed_result', 'insufficient_evidence', 'needs_further_review'
  )),
  evidence_strength text NOT NULL DEFAULT 'observation' CHECK (evidence_strength IN (
    'observation', 'early_association', 'repeated_association', 'supporting_helpfulness', 'evaluated_evidence'
  )),
  evidence_model_version text NOT NULL DEFAULT 'human-outcome-evidence-v1',
  comparison_model_version text NOT NULL DEFAULT 'human-outcome-compare-v1',
  intervention_started_at timestamptz,
  next_review_window text CHECK (next_review_window IS NULL OR next_review_window IN ('month', 'quarter', 'rolling_6_weeks')),
  overlapping_interventions boolean NOT NULL DEFAULT false,
  composition_caveat boolean NOT NULL DEFAULT false,
  evaluation_planned boolean NOT NULL DEFAULT false,
  research_reference text,
  published_public boolean NOT NULL DEFAULT false,
  closed_at timestamptz,
  closed_reason text CHECK (closed_reason IS NULL OR closed_reason IN (
    'sufficient_learning', 'no_further_monitoring', 'insufficient_evidence', 'intervention_ended', 'superseded'
  )),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT human_outcome_reviews_objective_len CHECK (char_length(trim(objective)) BETWEEN 3 AND 400),
  CONSTRAINT human_outcome_reviews_title_len CHECK (char_length(trim(intervention_title)) BETWEEN 3 AND 160)
);

COMMENT ON TABLE public.human_outcome_reviews IS
  'Coordinator review of later privacy-safe wellbeing evidence after an intervention. Sequence is not causality. Must not store member Happiness rows.';

CREATE TABLE IF NOT EXISTS public.human_outcome_review_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.human_outcome_reviews(id) ON DELETE CASCADE,
  aggregate_snapshot_id uuid NOT NULL REFERENCES public.wellbeing_aggregate_snapshots(id) ON DELETE RESTRICT,
  evidence_role text NOT NULL CHECK (evidence_role IN ('baseline', 'followup', 'helpfulness')),
  period_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, aggregate_snapshot_id, evidence_role)
);

COMMENT ON TABLE public.human_outcome_review_evidence IS
  'Immutable snapshot references for a Human Outcome Review. Historic snapshots are not rewritten.';

CREATE TABLE IF NOT EXISTS public.human_outcome_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.human_outcome_reviews(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('launched', 'milestone', 'checkpoint', 'adjusted', 'closed')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.human_outcome_review_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.human_outcome_reviews(id) ON DELETE CASCADE,
  factor_kind text NOT NULL CHECK (factor_kind IN (
    'overlapping_intervention', 'external_event', 'seasonal', 'composition_change',
    'other_policy', 'insufficient_evidence', 'other'
  )),
  note text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT human_outcome_review_factors_note_len CHECK (char_length(trim(note)) BETWEEN 3 AND 400)
);

CREATE TABLE IF NOT EXISTS public.human_outcome_review_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.human_outcome_reviews(id) ON DELETE SET NULL,
  actor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.human_outcome_review_audit IS
  'Outcome Review actions. Must not log private member-level wellbeing data.';

CREATE TABLE IF NOT EXISTS public.human_outcome_public_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL UNIQUE REFERENCES public.human_outcome_reviews(id) ON DELETE CASCADE,
  solution_record_id uuid REFERENCES public.solution_records(id) ON DELETE SET NULL,
  domain text NOT NULL,
  factor_category text,
  intervention_category text,
  title text NOT NULL,
  problem text NOT NULL,
  intervention text NOT NULL,
  operational_outcome text NOT NULL,
  human_outcome text NOT NULL,
  evidence_strength text NOT NULL,
  status text NOT NULL,
  limitations text NOT NULL,
  replication_notes text,
  published_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  published_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.human_outcome_public_lessons IS
  'Intentionally published, public-safe lessons. No aggregate snapshot payloads or member identities.';

CREATE INDEX IF NOT EXISTS human_outcome_reviews_scope_idx ON public.human_outcome_reviews (scope_id, status);
CREATE INDEX IF NOT EXISTS human_outcome_reviews_challenge_idx ON public.human_outcome_reviews (challenge_id);
CREATE INDEX IF NOT EXISTS human_outcome_reviews_project_idx ON public.human_outcome_reviews (project_id);
CREATE INDEX IF NOT EXISTS human_outcome_reviews_governance_idx ON public.human_outcome_reviews (governance_solution_id);
CREATE INDEX IF NOT EXISTS human_outcome_review_evidence_review_idx ON public.human_outcome_review_evidence (review_id, evidence_role, period_order);
CREATE INDEX IF NOT EXISTS human_outcome_public_lessons_domain_idx ON public.human_outcome_public_lessons (domain, factor_category);

ALTER TABLE public.human_outcome_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_outcome_review_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_outcome_review_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_outcome_review_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_outcome_review_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_outcome_public_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Viewers can read human_outcome_reviews" ON public.human_outcome_reviews;
CREATE POLICY "Viewers can read human_outcome_reviews"
  ON public.human_outcome_reviews FOR SELECT TO authenticated
  USING (public.wellbeing_aggregate_can_view_scope(scope_id));

DROP POLICY IF EXISTS "Viewers can insert human_outcome_reviews" ON public.human_outcome_reviews;
CREATE POLICY "Viewers can insert human_outcome_reviews"
  ON public.human_outcome_reviews FOR INSERT TO authenticated
  WITH CHECK (
    public.wellbeing_aggregate_can_view_scope(scope_id)
    AND public.happiness_owns_profile(created_by)
  );

DROP POLICY IF EXISTS "Viewers can update human_outcome_reviews" ON public.human_outcome_reviews;
CREATE POLICY "Viewers can update human_outcome_reviews"
  ON public.human_outcome_reviews FOR UPDATE TO authenticated
  USING (public.wellbeing_aggregate_can_view_scope(scope_id))
  WITH CHECK (public.wellbeing_aggregate_can_view_scope(scope_id));

DROP POLICY IF EXISTS "Viewers can read human_outcome_review_evidence" ON public.human_outcome_review_evidence;
CREATE POLICY "Viewers can read human_outcome_review_evidence"
  ON public.human_outcome_review_evidence FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.human_outcome_reviews r
      WHERE r.id = review_id AND public.wellbeing_aggregate_can_view_scope(r.scope_id)
    )
  );

DROP POLICY IF EXISTS "Viewers can insert human_outcome_review_evidence" ON public.human_outcome_review_evidence;
CREATE POLICY "Viewers can insert human_outcome_review_evidence"
  ON public.human_outcome_review_evidence FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.human_outcome_reviews r
      WHERE r.id = review_id AND public.wellbeing_aggregate_can_view_scope(r.scope_id)
    )
  );

DROP POLICY IF EXISTS "Viewers can read human_outcome_review_events" ON public.human_outcome_review_events;
CREATE POLICY "Viewers can read human_outcome_review_events"
  ON public.human_outcome_review_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.human_outcome_reviews r
      WHERE r.id = review_id AND public.wellbeing_aggregate_can_view_scope(r.scope_id)
    )
  );

DROP POLICY IF EXISTS "Viewers can insert human_outcome_review_events" ON public.human_outcome_review_events;
CREATE POLICY "Viewers can insert human_outcome_review_events"
  ON public.human_outcome_review_events FOR INSERT TO authenticated
  WITH CHECK (
    public.happiness_owns_profile(created_by)
    AND EXISTS (
      SELECT 1 FROM public.human_outcome_reviews r
      WHERE r.id = review_id AND public.wellbeing_aggregate_can_view_scope(r.scope_id)
    )
  );

DROP POLICY IF EXISTS "Viewers can read human_outcome_review_factors" ON public.human_outcome_review_factors;
CREATE POLICY "Viewers can read human_outcome_review_factors"
  ON public.human_outcome_review_factors FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.human_outcome_reviews r
      WHERE r.id = review_id AND public.wellbeing_aggregate_can_view_scope(r.scope_id)
    )
  );

DROP POLICY IF EXISTS "Viewers can insert human_outcome_review_factors" ON public.human_outcome_review_factors;
CREATE POLICY "Viewers can insert human_outcome_review_factors"
  ON public.human_outcome_review_factors FOR INSERT TO authenticated
  WITH CHECK (
    public.happiness_owns_profile(created_by)
    AND EXISTS (
      SELECT 1 FROM public.human_outcome_reviews r
      WHERE r.id = review_id AND public.wellbeing_aggregate_can_view_scope(r.scope_id)
    )
  );

DROP POLICY IF EXISTS "Viewers can insert human_outcome_review_audit" ON public.human_outcome_review_audit;
CREATE POLICY "Viewers can insert human_outcome_review_audit"
  ON public.human_outcome_review_audit FOR INSERT TO authenticated
  WITH CHECK (public.happiness_owns_profile(actor_profile_id));

DROP POLICY IF EXISTS "Viewers can read human_outcome_review_audit" ON public.human_outcome_review_audit;
CREATE POLICY "Viewers can read human_outcome_review_audit"
  ON public.human_outcome_review_audit FOR SELECT TO authenticated
  USING (
    review_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.human_outcome_reviews r
      WHERE r.id = review_id AND public.wellbeing_aggregate_can_view_scope(r.scope_id)
    )
  );

DROP POLICY IF EXISTS "Members can read human_outcome_public_lessons" ON public.human_outcome_public_lessons;
CREATE POLICY "Members can read human_outcome_public_lessons"
  ON public.human_outcome_public_lessons FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Viewers can insert human_outcome_public_lessons" ON public.human_outcome_public_lessons;
CREATE POLICY "Viewers can insert human_outcome_public_lessons"
  ON public.human_outcome_public_lessons FOR INSERT TO authenticated
  WITH CHECK (
    public.happiness_owns_profile(published_by)
    AND EXISTS (
      SELECT 1 FROM public.human_outcome_reviews r
      WHERE r.id = review_id AND public.wellbeing_aggregate_can_view_scope(r.scope_id)
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.human_outcome_reviews TO authenticated;
GRANT SELECT, INSERT ON public.human_outcome_review_evidence TO authenticated;
GRANT SELECT, INSERT ON public.human_outcome_review_events TO authenticated;
GRANT SELECT, INSERT ON public.human_outcome_review_factors TO authenticated;
GRANT SELECT, INSERT ON public.human_outcome_review_audit TO authenticated;
GRANT SELECT, INSERT ON public.human_outcome_public_lessons TO authenticated;

REVOKE ALL ON public.human_outcome_reviews FROM anon;
REVOKE ALL ON public.human_outcome_review_evidence FROM anon;
REVOKE ALL ON public.human_outcome_review_events FROM anon;
REVOKE ALL ON public.human_outcome_review_factors FROM anon;
REVOKE ALL ON public.human_outcome_review_audit FROM anon;
REVOKE ALL ON public.human_outcome_public_lessons FROM anon;

REVOKE DELETE, TRUNCATE ON public.human_outcome_reviews FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.human_outcome_review_evidence FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.human_outcome_review_events FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.human_outcome_review_factors FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.human_outcome_review_audit FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.human_outcome_public_lessons FROM authenticated;

NOTIFY pgrst, 'reload schema';
