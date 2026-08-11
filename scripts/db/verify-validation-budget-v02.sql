-- Verify Validation Budget v0.2 labels and totals (read-only).

DO $$
DECLARE
  v_id uuid;
  v_sum bigint;
  v_lines int;
  v_groups int;
  v_group_name text;
  v_health text;
  v_insurance text;
  v_ws17 text;
  v_ws20 text;
  v_v01_status text;
  v_v02_status text;
  v_pub int;
  v_commit bigint;
BEGIN
  SELECT id, lifecycle_status INTO v_id, v_v02_status
  FROM public.project_budgets
  WHERE name = 'Civizen Pre-Major-Build Validation Program v0.2' AND version = 1;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'v0.2 missing';
  END IF;

  SELECT lifecycle_status INTO v_v01_status
  FROM public.project_budgets
  WHERE name = 'Civizen Pre-Major-Build Validation Program v0.1' AND version = 1
  LIMIT 1;

  SELECT COUNT(*) INTO v_groups FROM public.budget_expense_groups WHERE budget_id = v_id;
  SELECT COUNT(*), COALESCE(SUM(li.planned_minor),0), COALESCE(SUM(li.committed_minor),0),
         COUNT(*) FILTER (WHERE li.publish_flag)
  INTO v_lines, v_sum, v_commit, v_pub
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_id;

  SELECT name INTO v_group_name
  FROM public.budget_expense_groups
  WHERE budget_id = v_id AND display_order = 80;

  SELECT li.title INTO v_health
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_id AND li.title LIKE 'WS-12.1 ·%' LIMIT 1;

  SELECT li.title INTO v_insurance
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_id AND li.title LIKE 'WS-12.4 ·%' LIMIT 1;

  SELECT li.title INTO v_ws17
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_id AND li.title LIKE 'WS-17 ·%' LIMIT 1;

  SELECT li.title INTO v_ws20
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_id AND li.title LIKE 'WS-20 ·%' LIMIT 1;

  IF v_groups <> 13 OR v_lines <> 40 OR v_sum <> 52400000000 THEN
    RAISE EXCEPTION 'structure/totals fail groups=% lines=% sum=%', v_groups, v_lines, v_sum;
  END IF;
  IF v_commit <> 0 OR v_pub <> 0 THEN
    RAISE EXCEPTION 'unexpected commitments/publish commit=% publish=%', v_commit, v_pub;
  END IF;
  IF v_v02_status <> 'draft' THEN
    RAISE EXCEPTION 'v0.2 status %, expected draft', v_v02_status;
  END IF;
  IF v_group_name IS DISTINCT FROM 'Controlled prototypes & cost validation' THEN
    RAISE EXCEPTION 'group label %, expected Controlled prototypes & cost validation', v_group_name;
  END IF;
  IF v_health IS NULL OR position('Health' in v_health) = 0 THEN
    RAISE EXCEPTION 'WS-12.1 title missing Health: %', v_health;
  END IF;
  IF v_insurance IS NULL OR position('Insurance' in v_insurance) = 0 THEN
    RAISE EXCEPTION 'WS-12.4 title missing Insurance: %', v_insurance;
  END IF;
  IF v_ws17 IS NULL OR position('Controlled non-authoritative prototypes' in v_ws17) = 0 THEN
    RAISE EXCEPTION 'WS-17 label unexpected: %', v_ws17;
  END IF;
  IF v_ws20 IS NULL OR position('Supplier evidence & cost validation' in v_ws20) = 0 THEN
    RAISE EXCEPTION 'WS-20 label unexpected: %', v_ws20;
  END IF;

  RAISE NOTICE 'VERIFY OK v0.2=% status=% v0.1_status=% group=%', v_id, v_v02_status, v_v01_status, v_group_name;
  RAISE NOTICE 'health=%', v_health;
  RAISE NOTICE 'insurance=%', v_insurance;
  RAISE NOTICE 'ws17=%', v_ws17;
  RAISE NOTICE 'ws20=%', v_ws20;
END $$;
