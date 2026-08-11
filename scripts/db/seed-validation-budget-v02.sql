-- Idempotent seed: Civizen Pre-Major-Build Validation Program v0.2
-- Exact Base planned $530,200,000.00. Preserves v0.1. Marks v0.1 superseded.
-- No commitments/receipts/allocations. draft, unapproved, unpublished.

DO $$
DECLARE
  v_budget_id uuid;
  v_existing uuid;
  v_v01_id uuid;
  v_group_id uuid;
  v_group_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT id INTO v_existing FROM public.project_budgets
  WHERE name = 'Civizen Pre-Major-Build Validation Program v0.2' AND version = 1;
  IF v_existing IS NOT NULL THEN
    RAISE NOTICE 'Validation Budget v0.2 already exists (%); seed skipped.', v_existing;
    RETURN;
  END IF;

  SELECT id INTO v_v01_id FROM public.project_budgets
  WHERE name = 'Civizen Pre-Major-Build Validation Program v0.1' AND version = 1
  LIMIT 1;

  INSERT INTO public.project_budgets (
    name, purpose, currency, version, lifecycle_status, internal_notes,
    is_demonstration, supersedes_budget_id
  ) VALUES (
    'Civizen Pre-Major-Build Validation Program v0.2',
    'Provisional working draft for the 18–24 month pre-major-build validation program (docs 14/29/30). Base scenario exact $530,200,000.00. Not an approved budget, bid, commitment, or authorization to accept funds.',
    'USD', 1, 'draft',
    'Adopted Validation Budget v0.2 after reconciliation. Historical v0.1 ($446M) retained as superseded. EX-02 embedded benefits disclosed in provenance only.',
    false, v_v01_id
  ) RETURNING id INTO v_budget_id;

  INSERT INTO public.budget_revisions (budget_id, change_summary, changed_fields, reason, actor_user_id)
  VALUES (v_budget_id, 'Seeded Validation Budget v0.2 (exact $530,200,000.00 Base)',
    '["seed","validation-budget-v0.2"]'::jsonb,
    'Provisional working draft from docs 29/30. Does not create commitments, receipts, allocations, or publication.', NULL);

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (v_budget_id, 'Program office & coordination', 'Core stewardship, workforce administration, public documentation, and travel/fieldwork coordination.', 10)
  RETURNING id INTO v_group_id;
  v_group_ids := array_append(v_group_ids, v_group_id);

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (v_budget_id, 'Constitutional, rights & legal formation', 'Institutional design, anti-capture safeguards, and legal entity formation.', 20)
  RETURNING id INTO v_group_id;
  v_group_ids := array_append(v_group_ids, v_group_id);

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (v_budget_id, 'Inventory, architecture & federation', 'System-catalog validation, architecture/threat work, validation tech tooling, and operator-network design.', 30)
  RETURNING id INTO v_group_id;
  v_group_ids := array_append(v_group_ids, v_group_id);

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (v_budget_id, 'Privacy, security & AI assurance', 'Privacy/data governance, security research, and AI governance frameworks.', 40)
  RETURNING id INTO v_group_id;
  v_group_ids := array_append(v_group_ids, v_group_id);

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (v_budget_id, 'Identity, economics, standards & inclusion', 'Identity interoperability, economic feasibility, standards, and accessibility/localization.', 50)
  RETURNING id INTO v_group_id;
  v_group_ids := array_append(v_group_ids, v_group_id);

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (v_budget_id, 'Domain studies & consultations', 'Named priority domain studies (WS-12.1–12.10), coordination, and jurisdiction consultations.', 60)
  RETURNING id INTO v_group_id;
  v_group_ids := array_append(v_group_ids, v_group_id);

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (v_budget_id, 'Independent multidisciplinary review', 'Ring-fenced independent panels and secretariat.', 70)
  RETURNING id INTO v_group_id;
  v_group_ids := array_append(v_group_ids, v_group_id);

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (v_budget_id, 'Controlled prototypes & cost validation', 'Controlled non-authoritative prototypes, hosting/shutdown, supplier evidence, and research licensing.', 80)
  RETURNING id INTO v_group_id;
  v_group_ids := array_append(v_group_ids, v_group_id);

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (v_budget_id, 'Procurement & financial controls', 'Procurement setup plus accounting, audit readiness, and payment controls.', 90)
  RETURNING id INTO v_group_id;
  v_group_ids := array_append(v_group_ids, v_group_id);

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (v_budget_id, 'Explicit operating provisions', 'Workforce benefits gap, program insurance, treasury/tax, and facilities/equipment/disposal bridge items (v0.2).', 100)
  RETURNING id INTO v_group_id;
  v_group_ids := array_append(v_group_ids, v_group_id);

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (v_budget_id, 'Grants & civil-society participation', 'Grants to research institutions and civil-society participants.', 110)
  RETURNING id INTO v_group_id;
  v_group_ids := array_append(v_group_ids, v_group_id);

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (v_budget_id, 'Program contingency', 'Policy contingency on the revised work program (~16%).', 120)
  RETURNING id INTO v_group_id;
  v_group_ids := array_append(v_group_ids, v_group_id);

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (v_budget_id, 'Safe-pause reserve', 'Safe-pause continuity plus incident response, emergency assistance, and decommissioning.', 130)
  RETURNING id INTO v_group_id;
  v_group_ids := array_append(v_group_ids, v_group_id);

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[1], 'WS-01 · Core multidisciplinary program office & stewardship teams', 'Primary EX-01/EX-13. Loaded FTE/contractor stewardship. Includes embedded EX-02 benefits slice (~$25.9M disclosed across personnel-heavy lines; not additive here). Excludes WS-01.ADM (split).',
    'Working estimate — not published financial figures.',
    2600000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[1], 'WS-01.ADM · Recruitment, onboarding, training, background checks & workforce administration', 'Traceable split from WS-01 ($28M→$26M+$2M). Primary EX-13/EX-19. Recruitment, onboarding, training, and workforce administration. Role-based screening/safeguarding depth beyond this slice is VAL-SCR (additive — not double-counted).',
    'Working estimate — not published financial figures.',
    200000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[1], 'VAL-SCR · Role-based screening, safeguarding & background checks', 'Additive EX-13/EX-19 depth beyond WS-01.ADM. Role-specific, proportionate, purpose-limited screening and safeguarding checks for defined validation roles; appealable where relevant; compliant with applicable rights and employment law. Not universal participant screening.',
    'Working estimate — not published financial figures.',
    80000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[1], 'WS-21 · Public documentation & transparency program', 'Primary EX-21. Public documentation, transparency artifacts, and communications for the validation program (not broad marketing spend).',
    'Working estimate — not published financial figures.',
    600000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[1], 'WS-22 · Travel, fieldwork & international coordination', 'Primary EX-22. Airfare, accommodation, visas, per diem, ground transport, field logistics, travel safety, accessibility-related travel support, and international coordination. Participant medical/evacuation risk transfer sits in VAL-EX16; cash emergency assistance in WS-25.IR.',
    'Working estimate — not published financial figures.',
    1000000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[2], 'WS-02 · Constitutional & institutional design', 'Primary EX-14. Constitutional and institutional design for validation-phase governance frameworks.',
    'Working estimate — not published financial figures.',
    1600000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[2], 'WS-03 · Human-rights & anti-capture safeguards', 'Primary EX-14. Human-rights review, anti-capture safeguards, and related ethics work.',
    'Working estimate — not published financial figures.',
    1100000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[2], 'WS-18 · Legal entity & organizational formation package', 'Primary EX-15/EX-03. Entity formation, corporate counsel, regulatory filings setup. Ongoing accounting/audit ops clarified under WS-19.FIN (split from WS-19).',
    'Working estimate — not published financial figures.',
    1400000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[3], 'WS-04 · System-inventory validation campaign (467 entries)', 'Primary EX-04. Challenges and validates the 467-entry system catalog; research/data acquisition for inventory rows included.',
    'Working estimate — not published financial figures.',
    1200000000, 0, 0, 'USD', 'Months 2–19 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[3], 'WS-05 · Architecture alternatives & threat modeling', 'Primary EX-05/EX-07. Architecture alternatives and threat modeling labor. Cloud/tooling/security tooling carved to WS-05.TEC (split from prior $22M).',
    'Working estimate — not published financial figures.',
    1700000000, 0, 0, 'USD', 'Months 1–20 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[3], 'WS-05.TEC · Cloud, communications, AI/API use, research tooling & security tooling', 'Traceable split from WS-05 ($22M→$17M+$5M). Primary EX-05/EX-06/EX-08/EX-18. Validation-phase cloud/hosting for research, communications infra, AI/API usage, specialist research tools, and security tooling (non-production).',
    'Working estimate — not published financial figures.',
    500000000, 0, 0, 'USD', 'Months 1–20 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[3], 'WS-06 · Federation & operator-network design validation', 'Primary EX-10. Design validation of federation/operator-network models — not funding 100 production operators.',
    'Working estimate — not published financial figures.',
    1500000000, 0, 0, 'USD', 'Months 4–21 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[4], 'WS-07 · Privacy & data-governance design', 'Primary EX-07. Privacy/data-governance design, DPIA methods, and related assurance research.',
    'Working estimate — not published financial figures.',
    1000000000, 0, 0, 'USD', 'Months 2–19 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[4], 'WS-08 · Security & cryptographic research', 'Primary EX-07. Security and cryptographic research (methods, threat models, test suites). Premium purchase is VAL-EX16; tooling spend also in WS-05.TEC / WS-17.HST.',
    'Working estimate — not published financial figures.',
    1600000000, 0, 0, 'USD', 'Months 2–21 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[4], 'WS-09 · AI governance & assurance frameworks', 'Primary EX-06/EX-07. AI governance and assurance frameworks; model-eval methods. AI/API usage budget home includes WS-05.TEC.',
    'Working estimate — not published financial figures.',
    900000000, 0, 0, 'USD', 'Months 3–20 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[5], 'WS-10 · Identity & credential interoperability design', 'Primary EX-05/EX-12. Identity and credential interoperability design (standards/hooks — not production IdP ops).',
    'Working estimate — not published financial figures.',
    1000000000, 0, 0, 'USD', 'Months 3–20 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[5], 'WS-11 · Economic, payments, accounting & taxation feasibility', 'Primary EX-04/EX-15. Feasibility of economic/payments/accounting/tax hooks — not live rails. Live banking/FX OpEx is VAL-EX17; tax charges VAL-EX28.',
    'Working estimate — not published financial figures.',
    1200000000, 0, 0, 'USD', 'Months 4–21 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[5], 'WS-14 · Standards & interoperability planning', 'Primary EX-12. Standards and interoperability planning; conformance test-suite seeds.',
    'Working estimate — not published financial figures.',
    800000000, 0, 0, 'USD', 'Months 4–21 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[5], 'WS-15 · Accessibility, localization & nondigital inclusion', 'Primary EX-20. Translation, interpretation, localization, accessibility engineering, and nondigital participation channels for validation activities.',
    'Working estimate — not published financial figures.',
    1000000000, 0, 0, 'USD', 'Months 3–22 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[6], 'WS-12.1 · Health — systems, public health, clinical safety, medicines, workforce, data & financing', 'Commissioned Health-system validation study (EX-04). Health systems, public health, clinical safety, medicines, workforce interfaces, health data, financing. Includes study-local research data, specialist tools, participant compensation, and publication prep. Role = standards/integration — not clinical operator or insurer. Distinct from VAL-EX02-GAP (employer benefits OpEx).',
    'Working estimate — not published financial figures.',
    850000000, 0, 0, 'USD', 'Months 3–22 · working estimate',
    false, 'active', 'Grants / pass-through'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[6], 'WS-12.2 · Justice and dispute-resolution systems study', 'Commissioned domain study (EX-04). Includes study research data, specialist input, participant compensation, and publication prep.',
    'Working estimate — not published financial figures.',
    500000000, 0, 0, 'USD', 'Months 3–22 · working estimate',
    false, 'active', 'Grants / pass-through'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[6], 'WS-12.3 · Tax and public-revenue systems study', 'Commissioned domain study (EX-04). Hooks/feasibility — not tax authority. Study research/data/publication included.',
    'Working estimate — not published financial figures.',
    350000000, 0, 0, 'USD', 'Months 4–20 · working estimate',
    false, 'active', 'Grants / pass-through'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[6], 'WS-12.4 · Insurance — finance, banking, payments & monetary interfaces', 'Commissioned Insurance-system validation study (EX-04). Finance, banking, insurance-system frameworks, payments, monetary interfaces. Includes study research data, specialist tools, participant compensation, publications. Distinct from VAL-EX16 (program insurance OpEx). Role = standards/integration — not underwriter.',
    'Working estimate — not published financial figures.',
    700000000, 0, 0, 'USD', 'Months 3–22 · working estimate',
    false, 'active', 'Grants / pass-through'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[6], 'WS-12.5 · Migration, borders, residency & mobility study', 'Commissioned domain study (EX-04). Study research/data/participant/publication costs included.',
    'Working estimate — not published financial figures.',
    500000000, 0, 0, 'USD', 'Months 3–22 · working estimate',
    false, 'active', 'Grants / pass-through'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[6], 'WS-12.6 · Elections and democratic participation study', 'Commissioned domain study (EX-04). Non-binding research only. Study research/data/participant/publication costs included.',
    'Working estimate — not published financial figures.',
    450000000, 0, 0, 'USD', 'Months 4–21 · working estimate',
    false, 'active', 'Grants / pass-through'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[6], 'WS-12.7 · Social protection, children, disability, pensions & care study', 'Commissioned domain study (EX-04). Study research/data/participant/publication costs included.',
    'Working estimate — not published financial figures.',
    450000000, 0, 0, 'USD', 'Months 4–21 · working estimate',
    false, 'active', 'Grants / pass-through'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[6], 'WS-12.8 · Land, housing, property, communal & Indigenous rights study', 'Commissioned domain study (EX-04). FPIC-sensitive methods; study research/data/participant/publication costs included.',
    'Working estimate — not published financial figures.',
    500000000, 0, 0, 'USD', 'Months 3–22 · working estimate',
    false, 'active', 'Grants / pass-through'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[6], 'WS-12.9 · Energy, environment & nuclear-accounting boundaries study', 'Commissioned domain study (EX-04). Boundary research; nuclear custody excluded. Study research/data/publication included.',
    'Working estimate — not published financial figures.',
    350000000, 0, 0, 'USD', 'Months 4–20 · working estimate',
    false, 'active', 'Grants / pass-through'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[6], 'WS-12.10 · Official statistics, measurement & public evidence study', 'Commissioned domain study (EX-04). Not becoming an NSO. Study research/data/publication included.',
    'Working estimate — not published financial figures.',
    350000000, 0, 0, 'USD', 'Months 4–20 · working estimate',
    false, 'active', 'Grants / pass-through'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[6], 'WS-12.C · Domain-study coordination & synthesis', 'Primary EX-04/EX-13. Cross-study coordination and synthesis — not an equal residual of the former $32M envelope.',
    'Working estimate — not published financial figures.',
    400000000, 0, 0, 'USD', 'Months 3–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[6], 'WS-13 · Jurisdiction & institutional consultations', 'Primary EX-11/EX-21. Jurisdiction and institutional consultations, convenings, and related participant/host compensation (distinct from WS-23 grants).',
    'Working estimate — not published financial figures.',
    2200000000, 0, 0, 'USD', 'Months 2–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[7], 'WS-16 · Independent multidisciplinary review panels (16)', 'Primary EX-04/EX-14. Ring-fenced independent panels and secretariat; includes Health panel among others.',
    'Working estimate — not published financial figures.',
    3400000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Independent review'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[8], 'WS-17 · Controlled non-authoritative prototypes', 'Primary EX-05. Controlled non-authoritative prototypes (synthetic/authorized test data); labeled and stoppable. Hosting/security tooling/shutdown carved to WS-17.HST. Insurance gate: VAL-EX16 before multi-party prototypes.',
    'Working estimate — not published financial figures.',
    2100000000, 0, 0, 'USD', 'Months 6–23 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[8], 'WS-17.HST · Prototype hosting, security tooling & controlled shutdown/decommissioning', 'Traceable split from WS-17 ($24M→$21M+$3M). Primary EX-08/EX-27/EX-30-05. Prototype hosting, security tooling, controlled shutdown, and data export for prototype environments. Broader secure disposal/e-waste is VAL-DISP (additive — not double-counted).',
    'Working estimate — not published financial figures.',
    300000000, 0, 0, 'USD', 'Months 6–23 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[8], 'WS-20 · Supplier evidence & cost validation', 'Primary EX-04. RFI/quotes/actuarial/benchmarks challenging planning hypotheses. Licensing/data tools carved to WS-20.LIC. Does not purchase insurance cover (VAL-EX16).',
    'Working estimate — not published financial figures.',
    800000000, 0, 0, 'USD', 'Months 6–23 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[8], 'WS-20.LIC · Data acquisition, specialist research tools, publications & licensing', 'Traceable split from WS-20 ($10M→$8M+$2M). Primary EX-18/EX-04. Data acquisition, specialist research tools, publications, and software/data licensing for validation evidence work.',
    'Working estimate — not published financial figures.',
    200000000, 0, 0, 'USD', 'Months 6–23 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[8], 'VAL-DISP · Secure disposal & e-waste handling', 'Additive EX-09/EX-25 beyond WS-17.HST prototype disposal and VAL-EX09-GAP facilities. Secure disposal, crypto-erase where required, and e-waste handling for validation equipment and media. Not double-counted with WS-17.HST.',
    'Working estimate — not published financial figures.',
    60000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[8], 'VAL-UTIL · Utilities & energy for validation compute', 'Additive EX-25. Utilities and energy for validation-phase compute and research environments — beyond thin embeds in cloud/tooling lines.',
    'Working estimate — not published financial figures.',
    50000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[9], 'WS-19 · Procurement & financial-control systems setup', 'Primary EX-18/EX-15. Procurement and multi-entity financial-control systems setup. Accounting/audit/treasury ops carved to WS-19.FIN.',
    'Working estimate — not published financial figures.',
    500000000, 0, 0, 'USD', 'Months 1–12 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[9], 'WS-19.FIN · Accounting, independent financial audit, tax compliance & payment controls', 'Traceable split from WS-19 ($7M→$5M+$2M). Primary EX-03/EX-15/EX-17. Accounting setup, audit readiness, tax compliance processes, and payment-control operations. Recurring independent financial audit fees are VAL-AUD (additive — not double-counted). Live FX/fees also VAL-EX17.',
    'Working estimate — not published financial figures.',
    200000000, 0, 0, 'USD', 'Months 1–12 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[9], 'VAL-AUD · Recurring independent financial audit', 'Additive EX-03/EX-07 beyond WS-19.FIN setup. Recurring independent financial audit fees for the validation phase — not formation-only accounting setup.',
    'Working estimate — not published financial figures.',
    150000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[10], 'VAL-EX02-GAP · Workforce health, benefits, safety & wellbeing (EX-02 gap)', 'Explicit EX-02 additive gap beyond loaded personnel: employer health/jurisdictional equivalent uplift, disability/life, OHS, mental health/EAP, workers’ compensation equivalents, leave/statutory, contractor/participant duty-of-care. Embedded ~$25.9M remains inside personnel-heavy WS totals (disclosure only — not added twice).',
    'Working estimate — not published financial figures.',
    550000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[10], 'VAL-EX16 · Program insurance & liability (EX-16)', 'Explicit EX-16. Quote-required program insurance: D&O, E&O, cyber, GL, EPL, travel/medical, participant liability, demonstrator/prototype cover, property, self-insured retention. Distinct from Insurance-system study (WS-12.4) and from EX-02 workforce benefits.',
    'Working estimate — not published financial figures.',
    900000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[10], 'VAL-EX17 · Banking, treasury & foreign-exchange costs (EX-17)', 'Explicit EX-17. Bank/payment processing fees, treasury/custody, and FX conversion costs for the validation phase.',
    'Working estimate — not published financial figures.',
    100000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[10], 'VAL-EX28 · Taxes, duties & mandatory charges (EX-28)', 'Explicit EX-28. Taxes, duties, assessments, and mandatory charges not absorbed in loaded FTE.',
    'Working estimate — not published financial figures.',
    100000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[10], 'VAL-EX09-GAP · Facilities, equipment, supplies & secure asset disposal (EX-09 gap)', 'Explicit EX-09 gap beyond thin embeds in WS-01: offices/facilities, equipment/devices, supplies, and secure asset disposal / e-waste compliance for validation ops.',
    'Working estimate — not published financial figures.',
    150000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[10], 'VAL-EMR · Emergency participant/field assistance', 'Additive EX-27 cash/ops fund distinct from WS-25.IR and VAL-EX16 insurance. Defined purpose: emergency participant/field assistance during authorized validation activities. Eligibility rule, authorization process, evidence requirement, and audit trail required — not discretionary cash.',
    'Working estimate — not published financial figures.',
    100000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[10], 'VAL-LOSS · Refunds, reversals, bad debt & loss adjustments', 'Additive EX-29. Refunds, reversals, bad-debt expense, and loss adjustments arising in validation-phase financial operations. Not contingency and not safe-pause.',
    'Working estimate — not published financial figures.',
    30000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[11], 'WS-23 · Grants to research institutions & civil-society participants', 'Primary EX-23. Grants and participant compensation to research institutions and civil-society participants (events/consultations also touch WS-13 / study lines).',
    'Working estimate — not published financial figures.',
    2600000000, 0, 0, 'USD', 'Months 2–24 · working estimate',
    false, 'active', 'Grants / pass-through'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[11], 'VAL-EVT · Convenings, consultations & events beyond travel', 'Additive EX-21/EX-22-02 beyond WS-22 travel logistics and WS-13 consultation labor. Convenings, consultations, and events (venue, facilitation, participant support for events) owned with civil-society/grants coordination. Airfare/lodging/visas/per diem/ground/logistics/travel safety remain WS-22.',
    'Working estimate — not published financial figures.',
    150000000, 0, 0, 'USD', 'Months 2–24 · working estimate',
    false, 'active', 'Grants / pass-through'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[12], 'WS-24 · Program contingency (policy)', 'Primary EX-30-01. Policy contingency held at $65M (prior ~16% of $404M work program). After coverage adds, work-program denominator is $410.2M; formula ~16% would imply ~$65.6M (+$0.6M) — not applied pending owner decision. Not a substitute for named EX-02/EX-16 lines.',
    'Working estimate — not published financial figures.',
    6500000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Core-controlled'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[13], 'WS-25 · Safe-pause & validation-program continuity reserve', 'Primary EX-30-04. Safe-pause held at $51M within $55M reserve group (with WS-25.IR $4M). After coverage adds, ~13.6% of $410.2M work program would imply ~$55.8M (+$0.8M) — not applied pending owner decision. Not production continuity ($2–4B) and not EX-16 premiums. Distinct from VAL-EMR emergency assistance.',
    'Working estimate — not published financial figures.',
    5100000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Protected reserve'
  );
  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency, period_label,
    publish_flag, status, owner_label
  ) VALUES (
    v_group_ids[13], 'WS-25.IR · Incident response, emergency assistance & demonstrator decommissioning', 'Traceable split from WS-25 ($55M→$51M+$4M). Primary EX-27/EX-30-05. Incident response readiness and demonstrator/prototype decommissioning beyond WS-17.HST tooling. Defined emergency participant/field assistance fund is VAL-EMR (additive — not double-counted).',
    'Working estimate — not published financial figures.',
    400000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
    false, 'active', 'Protected reserve'
  );

  IF v_v01_id IS NOT NULL THEN
    UPDATE public.project_budgets SET lifecycle_status = 'superseded', updated_at = now()
    WHERE id = v_v01_id AND lifecycle_status = 'draft';
    RAISE NOTICE 'Marked Validation Budget v0.1 (%) as superseded.', v_v01_id;
  END IF;

  RAISE NOTICE 'Seeded Validation Budget v0.2 (%) with exact planned_minor 53020000000.', v_budget_id;
END $$;

-- Assert totals
DO $$
DECLARE
  v_id uuid;
  v_sum bigint;
  v_lines int;
  v_groups int;
BEGIN
  SELECT id INTO v_id FROM public.project_budgets
  WHERE name = 'Civizen Pre-Major-Build Validation Program v0.2' AND version = 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Validation Budget v0.2 missing after seed';
  END IF;
  SELECT COUNT(*) INTO v_groups FROM public.budget_expense_groups WHERE budget_id = v_id;
  SELECT COUNT(*), COALESCE(SUM(li.planned_minor),0) INTO v_lines, v_sum
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_id;
  IF v_groups <> 13 THEN
    RAISE EXCEPTION 'expected 13 groups, got %', v_groups;
  END IF;
  IF v_lines <> 53 THEN
    RAISE EXCEPTION 'expected 53 lines, got %', v_lines;
  END IF;
  IF v_sum <> 53020000000 THEN
    RAISE EXCEPTION 'planned_minor %, expected 53020000000', v_sum;
  END IF;
  RAISE NOTICE 'v0.2 reconciliation OK groups=% lines=% planned_minor=%', v_groups, v_lines, v_sum;
END $$;
