-- LOCAL DEVELOPMENT ONLY — do not apply to remote/production via ordinary migration paths.
-- Idempotent seed: Civizen Draft Budget v0.1 (planning skeleton, amounts TBD = 0).
-- Safe to re-run: if name+version already exists, exits without changes.
-- Does NOT approve, publish, or create funding commitments/receipts/allocations.
-- Source of truth for structure: src/lib/finance/initial-budget-v01.ts
-- Spec: docs/04-operations/funding-and-budget/06-initial-working-budget-v0.1.md
-- Retired from ordinary application use 2026-08-11; see scripts/db/retire-demo-draft-budget-v01.sql

DO $$
DECLARE
  v_budget_id uuid;
  v_group_id uuid;
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing
  FROM public.project_budgets
  WHERE name = 'Civizen Draft Budget v0.1'
    AND version = 1;

  IF v_existing IS NOT NULL THEN
    RAISE NOTICE 'Civizen Draft Budget v0.1 already exists (%); seed skipped.', v_existing;
    RETURN;
  END IF;

  INSERT INTO public.project_budgets (
    name,
    purpose,
    currency,
    version,
    lifecycle_status,
    internal_notes,
    is_demonstration
  ) VALUES (
    'Civizen Draft Budget v0.1',
    'Internal planning skeleton for Civizen foundation through production readiness. Amounts are TBD planning placeholders — not quotes, commitments, or actual expenses.',
    'USD',
    1,
    'draft',
    'Source: docs/04-operations/funding-and-budget/06-initial-working-budget-v0.1.md. Currency USD is a planning-display assumption pending owner confirmation. is_demonstration=true until amounts are owner-confirmed. Do not approve or publish until estimates are reviewed.',
    true
  )
  RETURNING id INTO v_budget_id;

  INSERT INTO public.budget_revisions (
    budget_id,
    change_summary,
    changed_fields,
    reason
  ) VALUES (
    v_budget_id,
    'Seeded Draft Budget v0.1 structure (all amounts TBD/0)',
    '["seed","initial-working-budget-v0.1"]'::jsonb,
    'Idempotent planning skeleton; no monetary estimates invented from evidence-insufficient repository search.'
  );

  -- Groups + lines (planned/committed/actual = 0, publish_flag = false)

  -- 1. Product and engineering
  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Product and engineering',
    'Application development, quality, release continuity, and technical delivery.',
    10
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'Core platform engineering (Phase 1)',
    'Planning estimate TBD — engineering capacity to maintain and extend the working Civizen platform during foundation/prototype continuity. Basis: active development evidenced in repo; no contracted rate on file.',
    'Product engineering for the working Civizen platform (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 1 · personnel_or_service · TBD', false, 'active'
  ),
  (
    v_group_id,
    'Core platform engineering (Phase 2)',
    'Planning estimate TBD — engineering for pilot-ready features and hardening support. No staffing contracts documented in-repo.',
    'Engineering support for limited pilot readiness (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 2 · personnel_or_service · TBD', false, 'active'
  ),
  (
    v_group_id,
    'Core platform engineering (Phase 3)',
    'Planning estimate TBD — engineering for production readiness and institutional integration work. Not funded.',
    'Engineering for production-readiness work (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 3 · personnel_or_service · TBD', false, 'active'
  ),
  (
    v_group_id,
    'Automated test and release quality capacity',
    'Planning estimate TBD — sustained Vitest/CI/release verification capacity. Repo has verify:ci and Vitest; no separate vendor quote.',
    'Quality and release verification capacity (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 1 · one_time · TBD', false, 'active'
  );

  -- 2. Design and accessibility
  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Design and accessibility',
    'UX/UI refinement, accessibility review, and public-surface clarity.',
    20
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, publish_flag, status
  ) VALUES (
    v_group_id,
    'UX/UI and accessibility review (Phase 1–2)',
    'Planning estimate TBD — accessibility and UX polish for public and member surfaces. No agency quote in-repo.',
    'Design and accessibility improvements (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 2 · personnel_or_service · TBD', false, 'active'
  );

  -- 3. Security
  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Security, privacy, auditing, and resilience',
    'Hardening, reviews, incident readiness, and privacy-preserving operations.',
    30
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'Security hardening sprint',
    'Planning estimate TBD — focused hardening before limited pilot. No third-party audit quote in-repo.',
    'Security hardening before limited pilot (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 2 · one_time · TBD', false, 'active'
  ),
  (
    v_group_id,
    'Independent security / privacy review',
    'Planning estimate TBD — external review when pilot or institutional partners require it. No vendor selected.',
    'Independent security or privacy review (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 3 · one_time · TBD', false, 'active'
  ),
  (
    v_group_id,
    'Ongoing security monitoring and incident readiness',
    'Planning estimate TBD — annual monitoring/retainer capacity. Recurring; not a live contract.',
    'Ongoing security monitoring capacity (planning amount TBD).',
    0, 0, 0, 'USD', 'Annual · recurring · TBD', false, 'active'
  );

  -- 4. Infrastructure
  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Infrastructure and development tools',
    'Hosting, database, CI, DNS/edge, and developer tooling already implied by the stack.',
    40
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'Application hosting and database (annual)',
    'Planning estimate TBD — VPS/nginx production host and Supabase-managed database/auth implied by ops docs and stack. No invoice amounts in public repo.',
    'Hosting and managed database operations (planning amount TBD).',
    0, 0, 0, 'USD', 'Annual · infrastructure_or_vendor · TBD', false, 'active'
  ),
  (
    v_group_id,
    'DNS, edge, and CI tooling (annual)',
    'Planning estimate TBD — Cloudflare DNS/edge keys and GitHub Actions CI referenced in ops docs. Plan tier unknown.',
    'DNS/edge and continuous integration tooling (planning amount TBD).',
    0, 0, 0, 'USD', 'Annual · infrastructure_or_vendor · TBD', false, 'active'
  ),
  (
    v_group_id,
    'AI model/API usage for in-app agents',
    'Planning estimate TBD — OpenAI / Gemini / Anthropic usage implied by solutions-council and messaging agent docs. Usage-based; no spend history published in-repo.',
    'AI API usage for product features (planning amount TBD).',
    0, 0, 0, 'USD', 'Annual · infrastructure_or_vendor · TBD', false, 'active'
  ),
  (
    v_group_id,
    'Environment bootstrap and staging capacity',
    'Planning estimate TBD — one-time staging/isolation improvements aligned with ENVIRONMENT_LIFECYCLE. No vendor quote.',
    'Staging and environment bootstrap (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 1 · one_time · TBD', false, 'active'
  );

  -- 5. Legal
  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Legal, governance, accounting, and compliance preparation',
    'Entity readiness, counsel, accounting setup, and compliance foundations (not capital acceptance).',
    50
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'Legal entity and counsel engagement',
    'Planning estimate TBD — receiving-entity architecture remains an open legal question (open-legal-questions.md). Not an accepted counsel engagement.',
    'Legal entity and counsel preparation (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 3 · personnel_or_service · TBD', false, 'active'
  ),
  (
    v_group_id,
    'Accounting setup and bookkeeping readiness',
    'Planning estimate TBD — software ledger ≠ legal books (funding integrity policy). No accountant engaged in-repo.',
    'Accounting and bookkeeping readiness (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 3 · personnel_or_service · TBD', false, 'active'
  ),
  (
    v_group_id,
    'Compliance preparation (KYC/AML outline readiness)',
    'Planning estimate TBD — policy outline exists; live providers gated. Preparation only, not provider fees.',
    'Compliance preparation work (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 3 · one_time · TBD', false, 'active'
  );

  -- 6. Research / pilots
  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Research, testing, and pilots',
    'Evaluation, limited pilots, and evidence gathering for adoption and funding conversations.',
    60
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'Limited pilot facilitation (Phase 2)',
    'Planning estimate TBD — scoped pilot facilitation per funding-readiness Stage 3. No partner or pilot budget locked.',
    'Limited pilot facilitation (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 2 · one_time · TBD', false, 'active'
  ),
  (
    v_group_id,
    'Evaluation and research partnership support',
    'Planning estimate TBD — university/NGO evaluation capacity. No MoU or award in-repo.',
    'Research and evaluation support (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 2 · personnel_or_service · TBD', false, 'active'
  );

  -- 7. Operations
  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Project and organizational operations',
    'Day-to-day coordination, administration, and founder-led operating capacity.',
    70
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'Project coordination and administration (annual)',
    'Planning estimate TBD — founder-led coordination capacity. Not a payroll commitment.',
    'Project coordination and administration (planning amount TBD).',
    0, 0, 0, 'USD', 'Annual · personnel_or_service · TBD', false, 'active'
  ),
  (
    v_group_id,
    'Administrative tooling and productivity software (annual)',
    'Planning estimate TBD — generic ops tooling. No SaaS spend register in-repo.',
    'Administrative tooling (planning amount TBD).',
    0, 0, 0, 'USD', 'Annual · recurring · TBD', false, 'active'
  );

  -- 8. Partnerships / comms
  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Partnerships, communications, and funding outreach',
    'Public messaging, institutional conversations, and targeted outreach (not broad fundraising campaigns).',
    80
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'Public documentation and messaging capacity',
    'Planning estimate TBD — documentation/messaging aligned with funding readiness Stages 1–2. No agency retainers documented.',
    'Public documentation and messaging (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 1 · personnel_or_service · TBD', false, 'active'
  ),
  (
    v_group_id,
    'Targeted institutional outreach (Phase 2–3)',
    'Planning estimate TBD — selective conversations after pilot readiness; not indiscriminate fundraising. No campaign budget.',
    'Targeted institutional outreach (planning amount TBD).',
    0, 0, 0, 'USD', 'Phase 3 · one_time · TBD', false, 'active'
  );

  -- 9. Contingency
  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Contingency',
    'Planning reserve for unknowns; not allocated spending.',
    90
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, publish_flag, status
  ) VALUES (
    v_group_id,
    'Planning contingency reserve',
    'Planning estimate TBD — reserve percentage/amount to be set by owner once base estimates exist. Not spent funds.',
    'Contingency reserve (planning amount TBD).',
    0, 0, 0, 'USD', 'Annual · reserve · TBD', false, 'active'
  );

  RAISE NOTICE 'Seeded Civizen Draft Budget v0.1 as draft/demonstration (id %).', v_budget_id;
END $$;

-- Post-seed reconciliation (raises if structure is wrong after first insert or on re-check)
DO $$
DECLARE
  v_budget_id uuid;
  v_group_count integer;
  v_line_count integer;
  v_nonzero integer;
  v_pub_flag integer;
  v_lifecycle text;
  v_demo boolean;
  v_published timestamptz;
  v_approved timestamptz;
  v_currency_mismatch integer;
  v_funding_sources integer;
  v_commitments integer;
  v_receipts integer;
  v_allocations integer;
BEGIN
  SELECT id, lifecycle_status, is_demonstration, published_at, approved_at
  INTO v_budget_id, v_lifecycle, v_demo, v_published, v_approved
  FROM public.project_budgets
  WHERE name = 'Civizen Draft Budget v0.1' AND version = 1;

  IF v_budget_id IS NULL THEN
    RAISE EXCEPTION 'Draft Budget v0.1 missing after seed';
  END IF;

  IF v_lifecycle <> 'draft' THEN
    RAISE EXCEPTION 'Draft Budget v0.1 must remain draft (got %)', v_lifecycle;
  END IF;
  IF v_demo IS NOT TRUE THEN
    RAISE EXCEPTION 'Draft Budget v0.1 must have is_demonstration=true';
  END IF;
  IF v_published IS NOT NULL THEN
    RAISE EXCEPTION 'Draft Budget v0.1 must not be published';
  END IF;
  IF v_approved IS NOT NULL THEN
    RAISE EXCEPTION 'Draft Budget v0.1 must not be approved';
  END IF;

  SELECT COUNT(*) INTO v_group_count
  FROM public.budget_expense_groups WHERE budget_id = v_budget_id AND archived_at IS NULL;
  SELECT COUNT(*) INTO v_line_count
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_budget_id AND li.status = 'active';

  IF v_group_count <> 9 THEN
    RAISE EXCEPTION 'Expected 9 expense groups, got %', v_group_count;
  END IF;
  IF v_line_count <> 22 THEN
    RAISE EXCEPTION 'Expected 22 line items, got %', v_line_count;
  END IF;

  SELECT COUNT(*) INTO v_nonzero
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_budget_id
    AND (li.planned_minor <> 0 OR li.committed_minor <> 0 OR li.actual_minor <> 0);

  IF v_nonzero <> 0 THEN
    RAISE EXCEPTION 'Draft Budget v0.1 must keep all amounts at 0 (found % non-zero)', v_nonzero;
  END IF;

  SELECT COUNT(*) INTO v_pub_flag
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_budget_id AND li.publish_flag = true;

  IF v_pub_flag <> 0 THEN
    RAISE EXCEPTION 'Draft Budget v0.1 lines must not have publish_flag=true';
  END IF;

  SELECT COUNT(*) INTO v_currency_mismatch
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_budget_id AND li.currency <> 'USD';

  IF v_currency_mismatch <> 0 THEN
    RAISE EXCEPTION 'Draft Budget v0.1 must be USD-only';
  END IF;

  -- Ensure this seed did not fabricate funding ledger activity for this budget.
  -- (Global counts may be non-zero from other work; we only assert no allocations
  -- referencing these line items.)
  SELECT COUNT(*) INTO v_allocations
  FROM public.finance_allocations fa
  JOIN public.budget_line_items li ON li.id = fa.line_item_id
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_budget_id;

  IF v_allocations <> 0 THEN
    RAISE EXCEPTION 'Draft Budget v0.1 must have no funding allocations';
  END IF;

  -- Quiet unused vars (kept for documentation of what we deliberately do not create)
  v_funding_sources := 0;
  v_commitments := 0;
  v_receipts := 0;

  RAISE NOTICE 'Draft Budget v0.1 reconciliation OK (groups=%, lines=%, demo=%, lifecycle=%).',
    v_group_count, v_line_count, v_demo, v_lifecycle;
END $$;
