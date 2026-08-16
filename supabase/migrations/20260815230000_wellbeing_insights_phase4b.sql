-- Phase 4B Institutional & Community Wellbeing Insights.
-- Reviews, deliberate actions, and existing-effort links. Aggregate-safe entities only.
-- Viewers still cannot SELECT private Happiness tables.

CREATE TABLE IF NOT EXISTS public.wellbeing_insight_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id uuid NOT NULL REFERENCES public.wellbeing_aggregate_scopes(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.systemic_issue_candidates(id) ON DELETE SET NULL,
  reviewer_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('monitor', 'investigate', 'under_review', 'archived')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.wellbeing_insight_reviews IS
  'Coordinator notes about privacy-safe aggregate issues. Must not store member-level Happiness source material.';

CREATE TABLE IF NOT EXISTS public.wellbeing_insight_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id uuid NOT NULL REFERENCES public.wellbeing_aggregate_scopes(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.systemic_issue_candidates(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN (
    'monitor', 'investigate', 'link_existing', 'challenge_draft', 'governance_draft', 'contribute_evidence'
  )),
  related_entity_type text,
  related_entity_id text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.wellbeing_insight_actions IS
  'Deliberate coordinator actions from Wellbeing Insights. No automatic Challenge or Governance publication.';

CREATE TABLE IF NOT EXISTS public.wellbeing_insight_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.systemic_issue_candidates(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN (
    'challenge', 'governance_solution', 'knowledge_space', 'solution_record'
  )),
  entity_id text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, entity_type, entity_id)
);

COMMENT ON TABLE public.wellbeing_insight_links IS
  'Links systemic candidates to existing Challenges, Governance Solutions, or knowledge. Snapshot-safe only.';

ALTER TABLE public.wellbeing_insight_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellbeing_insight_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellbeing_insight_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Viewers can read wellbeing_insight_reviews" ON public.wellbeing_insight_reviews;
CREATE POLICY "Viewers can read wellbeing_insight_reviews"
  ON public.wellbeing_insight_reviews FOR SELECT TO authenticated
  USING (public.wellbeing_aggregate_can_view_scope(scope_id));
DROP POLICY IF EXISTS "Viewers can insert wellbeing_insight_reviews" ON public.wellbeing_insight_reviews;
CREATE POLICY "Viewers can insert wellbeing_insight_reviews"
  ON public.wellbeing_insight_reviews FOR INSERT TO authenticated
  WITH CHECK (
    public.wellbeing_aggregate_can_view_scope(scope_id)
    AND public.happiness_owns_profile(reviewer_profile_id)
  );

DROP POLICY IF EXISTS "Viewers can read wellbeing_insight_actions" ON public.wellbeing_insight_actions;
CREATE POLICY "Viewers can read wellbeing_insight_actions"
  ON public.wellbeing_insight_actions FOR SELECT TO authenticated
  USING (public.wellbeing_aggregate_can_view_scope(scope_id));
DROP POLICY IF EXISTS "Viewers can insert wellbeing_insight_actions" ON public.wellbeing_insight_actions;
CREATE POLICY "Viewers can insert wellbeing_insight_actions"
  ON public.wellbeing_insight_actions FOR INSERT TO authenticated
  WITH CHECK (
    public.wellbeing_aggregate_can_view_scope(scope_id)
    AND public.happiness_owns_profile(created_by)
  );

DROP POLICY IF EXISTS "Viewers can read wellbeing_insight_links" ON public.wellbeing_insight_links;
CREATE POLICY "Viewers can read wellbeing_insight_links"
  ON public.wellbeing_insight_links FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.systemic_issue_candidates c
      WHERE c.id = candidate_id AND public.wellbeing_aggregate_can_view_scope(c.scope_id)
    )
  );
DROP POLICY IF EXISTS "Viewers can insert wellbeing_insight_links" ON public.wellbeing_insight_links;
CREATE POLICY "Viewers can insert wellbeing_insight_links"
  ON public.wellbeing_insight_links FOR INSERT TO authenticated
  WITH CHECK (
    public.happiness_owns_profile(created_by)
    AND EXISTS (
      SELECT 1 FROM public.systemic_issue_candidates c
      WHERE c.id = candidate_id AND public.wellbeing_aggregate_can_view_scope(c.scope_id)
    )
  );

GRANT SELECT, INSERT ON public.wellbeing_insight_reviews TO authenticated;
GRANT SELECT, INSERT ON public.wellbeing_insight_actions TO authenticated;
GRANT SELECT, INSERT ON public.wellbeing_insight_links TO authenticated;
REVOKE ALL ON public.wellbeing_insight_reviews FROM anon;
REVOKE ALL ON public.wellbeing_insight_actions FROM anon;
REVOKE ALL ON public.wellbeing_insight_links FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.wellbeing_insight_reviews FROM authenticated;
GRANT SELECT, INSERT ON public.wellbeing_insight_reviews TO authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.wellbeing_insight_actions FROM authenticated;
GRANT SELECT, INSERT ON public.wellbeing_insight_actions TO authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.wellbeing_insight_links FROM authenticated;
GRANT SELECT, INSERT ON public.wellbeing_insight_links TO authenticated;

NOTIFY pgrst, 'reload schema';
