-- Safety check only: Civizen Draft Budget v0.1 (demonstration). Read-only.

\echo '=== Demo budget row ==='
SELECT
  id,
  name,
  version,
  lifecycle_status,
  is_demonstration,
  currency,
  approved_at,
  published_at,
  submitted_at,
  submitted_by,
  approved_by,
  published_by,
  supersedes_budget_id,
  created_at,
  updated_at
FROM public.project_budgets
WHERE name = 'Civizen Draft Budget v0.1'
ORDER BY version;

\echo '=== Group/line counts and nonzero amounts ==='
WITH demo AS (
  SELECT id FROM public.project_budgets WHERE name = 'Civizen Draft Budget v0.1'
),
groups AS (
  SELECT g.id
  FROM public.budget_expense_groups g
  JOIN demo d ON d.id = g.budget_id
),
lines AS (
  SELECT l.*
  FROM public.budget_line_items l
  JOIN groups g ON g.id = l.group_id
)
SELECT
  (SELECT count(*) FROM demo) AS budget_rows,
  (SELECT count(*) FROM groups) AS group_rows,
  (SELECT count(*) FROM lines) AS line_rows,
  (SELECT coalesce(sum(planned_minor), 0) FROM lines) AS sum_planned_minor,
  (SELECT coalesce(sum(committed_minor), 0) FROM lines) AS sum_committed_minor,
  (SELECT coalesce(sum(actual_minor), 0) FROM lines) AS sum_actual_minor,
  (SELECT count(*) FROM lines WHERE planned_minor <> 0 OR committed_minor <> 0 OR actual_minor <> 0) AS nonzero_line_count,
  (SELECT count(*) FROM lines WHERE publish_flag IS TRUE) AS publish_flag_true_count;

\echo '=== Allocations to demo lines ==='
SELECT count(*) AS allocation_count
FROM public.funding_allocations a
WHERE a.budget_line_id IN (
  SELECT l.id
  FROM public.budget_line_items l
  JOIN public.budget_expense_groups g ON g.id = l.group_id
  JOIN public.project_budgets b ON b.id = g.budget_id
  WHERE b.name = 'Civizen Draft Budget v0.1'
);

\echo '=== Supersession links ==='
SELECT id, name, version, supersedes_budget_id
FROM public.project_budgets
WHERE name = 'Civizen Draft Budget v0.1'
   OR supersedes_budget_id IN (
     SELECT id FROM public.project_budgets WHERE name = 'Civizen Draft Budget v0.1'
   );

\echo '=== Budget revisions / approval fields (demo) ==='
SELECT id, version, lifecycle_status, approval_reason, publication_note, internal_notes
FROM public.project_budgets
WHERE name = 'Civizen Draft Budget v0.1';

\echo '=== Finance audit events mentioning demo budget id ==='
SELECT count(*) AS audit_count
FROM public.finance_audit_events e
WHERE e.entity_id::text IN (
  SELECT id::text FROM public.project_budgets WHERE name = 'Civizen Draft Budget v0.1'
)
OR (
  e.payload::text ILIKE '%Civizen Draft Budget v0.1%'
);

\echo '=== Validation budget untouched check ==='
SELECT id, name, version, lifecycle_status, is_demonstration, published_at,
  (SELECT coalesce(sum(l.planned_minor),0)
   FROM public.budget_line_items l
   JOIN public.budget_expense_groups g ON g.id = l.group_id
   WHERE g.budget_id = b.id) AS planned_sum
FROM public.project_budgets b
WHERE name = 'Civizen Pre-Major-Build Validation Program v0.1';
