-- Label-only patch for Validation Budget v0.2 terminology.
-- Does not change planned/committed/actual amounts, lifecycle, or publication.
-- Idempotent: safe to re-run.

DO $$
DECLARE
  v_budget_id uuid;
BEGIN
  SELECT id INTO v_budget_id FROM public.project_budgets
  WHERE name = 'Civizen Pre-Major-Build Validation Program v0.2' AND version = 1
  LIMIT 1;

  IF v_budget_id IS NULL THEN
    RAISE NOTICE 'Validation Budget v0.2 not found; label patch skipped.';
    RETURN;
  END IF;

  UPDATE public.budget_expense_groups g
  SET
    name = 'Controlled prototypes & cost validation',
    description = 'Controlled non-authoritative prototypes and supplier evidence / cost validation.'
  WHERE g.budget_id = v_budget_id
    AND (
      g.name = 'Demonstrators & cost-model validation'
      OR g.name = 'Controlled prototypes & cost validation'
    );

  UPDATE public.budget_line_items li
  SET
    title = 'WS-12.1 · Health — systems, public health, clinical safety, medicines, workforce, data & financing',
    description = 'Commissioned priority domain study (Health): health systems, public health, clinical safety, medicines, workforce interfaces, health data, and health financing. Civizen role = standards/integration research — not clinical operator or insurer.'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id
    AND g.budget_id = v_budget_id
    AND li.title LIKE 'WS-12.1 ·%';

  UPDATE public.budget_line_items li
  SET
    title = 'WS-12.4 · Insurance — finance, banking, payments & monetary interfaces',
    description = 'Commissioned priority domain study (Insurance systems): finance, banking, insurance-system frameworks, payments, and monetary interfaces. Insurance SYSTEM domain — distinct from EX-16 program insurance OpEx. Civizen role = standards/integration — not underwriter or claims operator.'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id
    AND g.budget_id = v_budget_id
    AND li.title LIKE 'WS-12.4 ·%';

  UPDATE public.budget_line_items li
  SET
    title = 'WS-17 · Controlled non-authoritative prototypes',
    description = 'Controlled non-authoritative prototypes using synthetic or authorized test data only; safely stoppable and labeled. Insurance gate: EX-16 before multi-party prototypes.'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id
    AND g.budget_id = v_budget_id
    AND li.title LIKE 'WS-17 ·%';

  UPDATE public.budget_line_items li
  SET
    title = 'WS-20 · Supplier evidence & cost validation',
    description = 'Supplier evidence and cost validation (RFI/quotes/actuarial/benchmarks). Challenges planning hypotheses and publishes confidence bands — does not purchase insurance cover.'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id
    AND g.budget_id = v_budget_id
    AND li.title LIKE 'WS-20 ·%';

  INSERT INTO public.budget_revisions (budget_id, change_summary, changed_fields, reason, actor_user_id)
  VALUES (
    v_budget_id,
    'Terminology: Controlled prototypes & cost validation; Health/Insurance visible study titles',
    '["labels","validation-budget-v0.2"]'::jsonb,
    'Presentation-only clarification. No amount or lifecycle change.',
    NULL
  );

  RAISE NOTICE 'Validation Budget v0.2 labels patched (%).', v_budget_id;
END $$;
