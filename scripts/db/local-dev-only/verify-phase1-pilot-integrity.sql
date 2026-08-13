-- Read-only Phase 1 integrity snapshot. Safe for the remote application database.
-- Does not mutate rows.

SELECT 'programs' AS check, program_kind, status, title
FROM public.contribution_programs
WHERE seed_key IN (
  'community-problem-solving-lab',
  'shared-knowledge-challenge',
  'education-to-contribution'
)
ORDER BY seed_key;

SELECT 'open_smoke_tests' AS check, count(*)::int AS n
FROM public.contribution_opportunities
WHERE title ILIKE 'Smoke test:%' AND status = 'open';

SELECT 'resolved_gap_without_result' AS check, count(*)::int AS n
FROM public.knowledge_gaps
WHERE status = 'resolved'
  AND result_resource_id IS NULL
  AND result_solution_record_id IS NULL;

SELECT 'completed_challenge_without_outcome' AS check, count(*)::int AS n
FROM public.community_challenges
WHERE status = 'completed'
  AND coalesce(nullif(trim(outcome_summary), ''), '') = '';

SELECT 'completed_challenge_without_project' AS check, count(*)::int AS n
FROM public.community_challenges c
WHERE c.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM public.implementation_projects p WHERE p.challenge_id = c.id
  );

SELECT 'orphan_solution_records' AS check, count(*)::int AS n
FROM public.solution_records s
WHERE NOT EXISTS (
  SELECT 1 FROM public.community_challenges c WHERE c.id = s.challenge_id
);

SELECT 'duplicate_participations' AS check, count(*)::int AS n
FROM (
  SELECT opportunity_id, participant_profile_id, count(*) AS copies
  FROM public.opportunity_participations
  GROUP BY 1, 2
  HAVING count(*) > 1
) d;

SELECT 'contribution_events_from_participations' AS check, count(*)::int AS n
FROM public.profile_contribution_events
WHERE source_table = 'opportunity_participations';
