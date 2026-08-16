-- Remove Phase 5 connected-walk seed. Safe to run when seed was partial.

DELETE FROM public.human_outcome_reviews
 WHERE scope_id IN (SELECT id FROM public.wellbeing_aggregate_scopes WHERE entity_ref LIKE 'phase5-outcome-%');
DELETE FROM public.contribution_programs WHERE seed_key = 'phase5-outcome-loop';
DELETE FROM public.solution_problems
 WHERE (title LIKE 'Phase 5 %' OR title LIKE 'Verify Evening %')
   AND author_id IN (
     SELECT p.id FROM auth.users u JOIN public.profiles p ON p.user_id = u.id
     WHERE u.email = 'member@test.civizen.local'
   );
DELETE FROM public.wellbeing_aggregate_audit
 WHERE scope_id IN (SELECT id FROM public.wellbeing_aggregate_scopes WHERE entity_ref LIKE 'phase5-outcome-%');
DELETE FROM public.wellbeing_aggregate_scopes WHERE entity_ref LIKE 'phase5-outcome-%';
