-- Verify Civizen Draft Budget v0.1 retirement (read-only asserts).
DO $$
DECLARE
  v_demo_count int;
  v_validation_id uuid;
  v_planned bigint;
  v_audit int;
BEGIN
  SELECT COUNT(*) INTO v_demo_count
  FROM public.project_budgets
  WHERE name = 'Civizen Draft Budget v0.1';

  IF v_demo_count <> 0 THEN
    RAISE EXCEPTION 'Demo Draft Budget v0.1 still present (count=%)', v_demo_count;
  END IF;

  SELECT id INTO v_validation_id
  FROM public.project_budgets
  WHERE name = 'Civizen Pre-Major-Build Validation Program v0.1'
  LIMIT 1;

  IF v_validation_id IS NULL THEN
    RAISE EXCEPTION 'Validation budget missing after demo retirement';
  END IF;

  SELECT COALESCE(SUM(li.planned_minor), 0) INTO v_planned
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_validation_id;

  IF v_planned <> 44600000000 THEN
    RAISE EXCEPTION 'Validation planned_minor changed (got %)', v_planned;
  END IF;

  SELECT COUNT(*) INTO v_audit
  FROM public.finance_audit_events
  WHERE event_type = 'budget.demonstration_retired';

  IF v_audit < 1 THEN
    RAISE EXCEPTION 'Missing budget.demonstration_retired audit event';
  END IF;

  RAISE NOTICE 'OK: demo absent; validation id=% planned_minor=%; retirement audits=%',
    v_validation_id, v_planned, v_audit;
END $$;

SELECT name, version, lifecycle_status, is_demonstration
FROM public.project_budgets
ORDER BY name;

SELECT event_type, entity_id, payload->>'name' AS retired_name, created_at
FROM public.finance_audit_events
WHERE event_type = 'budget.demonstration_retired'
ORDER BY created_at DESC
LIMIT 5;
