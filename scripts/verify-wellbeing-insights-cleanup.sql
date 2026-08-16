-- Remove Phase 4B connected-walk seed. Safe to run when seed was partial.

DELETE FROM public.contribution_programs WHERE seed_key = 'phase4b-insights-transit';
DELETE FROM public.wellbeing_aggregate_audit
 WHERE scope_id IN (SELECT id FROM public.wellbeing_aggregate_scopes WHERE entity_ref LIKE 'phase4b-insights-%');
DELETE FROM public.wellbeing_aggregate_scopes WHERE entity_ref LIKE 'phase4b-insights-%';
