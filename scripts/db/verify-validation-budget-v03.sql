-- Verification only for Validation Budget v0.3 seed (read-only asserts).
DO $$
DECLARE
  v01 uuid; v02 uuid; v03 uuid;
  v_sum bigint; v_lines int; v_groups int;
  v_comm bigint; v_act bigint; v_pub boolean;
  v_status text; v_demo boolean;
BEGIN
  SELECT id INTO v01 FROM public.project_budgets
  WHERE name = 'Civizen Pre-Major-Build Validation Program v0.1' AND version = 1;
  SELECT id INTO v02 FROM public.project_budgets
  WHERE name = 'Civizen Pre-Major-Build Validation Program v0.2' AND version = 1;
  SELECT id, lifecycle_status, is_demonstration INTO v03, v_status, v_demo
  FROM public.project_budgets
  WHERE name = 'Civizen Pre-Major-Build Validation Program v0.3' AND version = 1;

  IF v01 IS NULL THEN RAISE EXCEPTION 'v0.1 missing'; END IF;
  IF v02 IS NULL THEN RAISE EXCEPTION 'v0.2 missing'; END IF;
  IF v03 IS NULL THEN RAISE EXCEPTION 'v0.3 missing'; END IF;
  IF v_status <> 'draft' THEN RAISE EXCEPTION 'v0.3 status %', v_status; END IF;
  IF v_demo IS TRUE THEN RAISE EXCEPTION 'v0.3 must not be demonstration'; END IF;

  IF (SELECT lifecycle_status FROM public.project_budgets WHERE id = v02) <> 'superseded' THEN
    RAISE EXCEPTION 'v0.2 should be superseded';
  END IF;

  SELECT COUNT(*) INTO v_groups FROM public.budget_expense_groups WHERE budget_id = v03;
  SELECT COUNT(*), COALESCE(SUM(li.planned_minor),0), COALESCE(SUM(li.committed_minor),0),
         COALESCE(SUM(li.actual_minor),0), COALESCE(BOOL_OR(li.publish_flag), false)
  INTO v_lines, v_sum, v_comm, v_act, v_pub
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v03;

  IF v_groups <> 13 OR v_lines <> 53 OR v_sum <> 63440000000 THEN
    RAISE EXCEPTION 'v0.3 structure/total mismatch groups=% lines=% sum=%', v_groups, v_lines, v_sum;
  END IF;
  IF v_comm <> 0 OR v_act <> 0 OR v_pub IS TRUE THEN
    RAISE EXCEPTION 'v0.3 must have zero committed/actual and no publish flags';
  END IF;

  RAISE NOTICE 'VERIFY OK v01=% v02=%(superseded) v03=% draft groups=13 lines=53 planned=63440000000 zeros',
    v01, v02, v03;
END $$;
