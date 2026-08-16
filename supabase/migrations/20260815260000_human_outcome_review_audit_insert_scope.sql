-- Human Outcome Review audit INSERT must require the same scope viewer
-- authorization as SELECT. Owner-only actor check is not enough: any
-- authenticated member could otherwise insert audit rows for arbitrary reviews.

DROP POLICY IF EXISTS "Viewers can insert human_outcome_review_audit" ON public.human_outcome_review_audit;
CREATE POLICY "Viewers can insert human_outcome_review_audit"
  ON public.human_outcome_review_audit FOR INSERT TO authenticated
  WITH CHECK (
    public.happiness_owns_profile(actor_profile_id)
    AND review_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.human_outcome_reviews r
      WHERE r.id = review_id AND public.wellbeing_aggregate_can_view_scope(r.scope_id)
    )
  );
