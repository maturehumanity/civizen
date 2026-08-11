-- Retire obsolete demonstration fixture: Civizen Draft Budget v0.1
-- Safety precondition (verified 2026-08-11 on remote):
--   draft, is_demonstration=true, 9 groups / 22 lines, all amounts 0,
--   no allocations/commitments/receipts/fees, no publication, no submission,
--   one seed revision row only; no material finance dependencies.
-- Does NOT touch Civizen Pre-Major-Build Validation Program v0.1.
-- Recoverability: structure retained in src/lib/finance/initial-budget-v01.ts
--   and scripts/db/local-dev-only/seed-initial-working-budget-v01.sql (explicit local only).

DO $$
DECLARE
  v_demo_id uuid;
  v_group_count integer;
  v_line_count integer;
  v_nonzero integer;
  v_alloc integer;
  v_pubs integer;
  v_validation_id uuid;
  v_validation_planned bigint;
BEGIN
  SELECT id INTO v_demo_id
  FROM public.project_budgets
  WHERE name = 'Civizen Draft Budget v0.1' AND version = 1
  LIMIT 1;

  IF v_demo_id IS NULL THEN
    RAISE NOTICE 'Civizen Draft Budget v0.1 not present; retirement no-op.';
  ELSE
    SELECT count(*) INTO v_group_count
    FROM public.budget_expense_groups WHERE budget_id = v_demo_id;

    SELECT count(*), coalesce(sum(CASE WHEN planned_minor <> 0 OR committed_minor <> 0 OR actual_minor <> 0 THEN 1 ELSE 0 END), 0)
      INTO v_line_count, v_nonzero
    FROM public.budget_line_items l
    JOIN public.budget_expense_groups g ON g.id = l.group_id
    WHERE g.budget_id = v_demo_id;

    SELECT count(*) INTO v_alloc
    FROM public.finance_allocations a
    WHERE a.line_item_id IN (
      SELECT l.id
      FROM public.budget_line_items l
      JOIN public.budget_expense_groups g ON g.id = l.group_id
      WHERE g.budget_id = v_demo_id
    );

    SELECT count(*) INTO v_pubs
    FROM public.budget_publications WHERE budget_id = v_demo_id;

    IF v_nonzero <> 0 OR v_alloc <> 0 OR v_pubs <> 0 THEN
      RAISE EXCEPTION
        'Refusing to retire Civizen Draft Budget v0.1: nonzero=% allocations=% publications=%',
        v_nonzero, v_alloc, v_pubs;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.project_budgets
      WHERE id = v_demo_id AND (published_at IS NOT NULL OR approved_at IS NOT NULL OR lifecycle_status <> 'draft')
    ) THEN
      RAISE EXCEPTION 'Refusing to retire Civizen Draft Budget v0.1: not a plain draft demonstration fixture';
    END IF;

    INSERT INTO public.finance_audit_events (event_type, entity_type, entity_id, payload, actor_user_id)
    VALUES (
      'budget.demonstration_retired',
      'project_budget',
      v_demo_id,
      jsonb_build_object(
        'name', 'Civizen Draft Budget v0.1',
        'version', 1,
        'reason', 'Obsolete zero-value demonstration fixture retired from ordinary application use',
        'group_count', v_group_count,
        'line_count', v_line_count,
        'planned_committed_actual_minor', 0,
        'recoverable_via', 'scripts/db/local-dev-only/seed-initial-working-budget-v01.sql + src/lib/finance/initial-budget-v01.ts',
        'retired_at', now()
      ),
      NULL
    );

    DELETE FROM public.project_budgets WHERE id = v_demo_id;
    RAISE NOTICE 'Retired Civizen Draft Budget v0.1 (%) with % groups / % lines.', v_demo_id, v_group_count, v_line_count;
  END IF;

  SELECT id INTO v_validation_id
  FROM public.project_budgets
  WHERE name = 'Civizen Pre-Major-Build Validation Program v0.1' AND version = 1
  LIMIT 1;

  IF v_validation_id IS NULL THEN
    RAISE EXCEPTION 'Validation budget missing after demo retirement — abort';
  END IF;

  SELECT coalesce(sum(l.planned_minor), 0) INTO v_validation_planned
  FROM public.budget_line_items l
  JOIN public.budget_expense_groups g ON g.id = l.group_id
  WHERE g.budget_id = v_validation_id;

  IF v_validation_planned <> 44600000000 THEN
    RAISE EXCEPTION 'Validation planned total changed unexpectedly: % (expected 44600000000)', v_validation_planned;
  END IF;

  IF EXISTS (SELECT 1 FROM public.project_budgets WHERE name = 'Civizen Draft Budget v0.1') THEN
    RAISE EXCEPTION 'Civizen Draft Budget v0.1 still present after retirement';
  END IF;

  RAISE NOTICE 'Validation budget intact (id %, planned_minor %).', v_validation_id, v_validation_planned;
END $$;
