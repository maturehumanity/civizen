-- Safety check only (continued): Civizen Draft Budget v0.1. Read-only.

\echo '=== Allocations to demo lines ==='
SELECT count(*) AS allocation_count
FROM public.finance_allocations a
WHERE a.line_item_id IN (
  SELECT l.id
  FROM public.budget_line_items l
  JOIN public.budget_expense_groups g ON g.id = l.group_id
  JOIN public.project_budgets b ON b.id = g.budget_id
  WHERE b.name = 'Civizen Draft Budget v0.1'
);

\echo '=== Commitments / receipts linked via allocations path ==='
SELECT
  (SELECT count(*) FROM public.finance_commitments) AS all_commitments,
  (SELECT count(*) FROM public.finance_receipts) AS all_receipts,
  (SELECT count(*) FROM public.finance_cost_assessments) AS all_fee_assessments;

\echo '=== Revisions and publications for demo budget ==='
SELECT
  (SELECT count(*) FROM public.budget_revisions r
   JOIN public.project_budgets b ON b.id = r.budget_id
   WHERE b.name = 'Civizen Draft Budget v0.1') AS revision_rows,
  (SELECT count(*) FROM public.budget_publications p
   JOIN public.project_budgets b ON b.id = p.budget_id
   WHERE b.name = 'Civizen Draft Budget v0.1') AS publication_rows;

\echo '=== Audit events for demo budget entity ids ==='
WITH demo AS (
  SELECT id FROM public.project_budgets WHERE name = 'Civizen Draft Budget v0.1'
),
demo_groups AS (
  SELECT g.id FROM public.budget_expense_groups g JOIN demo d ON d.id = g.budget_id
),
demo_lines AS (
  SELECT l.id FROM public.budget_line_items l JOIN demo_groups g ON g.id = l.group_id
),
ids AS (
  SELECT id FROM demo
  UNION ALL SELECT id FROM demo_groups
  UNION ALL SELECT id FROM demo_lines
)
SELECT event_type, entity_type, count(*) AS n
FROM public.finance_audit_events e
WHERE e.entity_id IN (SELECT id FROM ids)
   OR e.payload::text ILIKE '%Civizen Draft Budget v0.1%'
   OR e.payload::text ILIKE '%Draft Budget v0.1%'
GROUP BY 1, 2
ORDER BY n DESC;

\echo '=== Sample audit payloads (demo seed) ==='
SELECT event_type, entity_type, entity_id, left(payload::text, 200) AS payload_preview, created_at
FROM public.finance_audit_events e
WHERE e.payload::text ILIKE '%Draft Budget v0.1%'
   OR e.entity_id IN (SELECT id FROM public.project_budgets WHERE name = 'Civizen Draft Budget v0.1')
ORDER BY created_at
LIMIT 20;
