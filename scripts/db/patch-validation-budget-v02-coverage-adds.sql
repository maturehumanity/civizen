-- Apply seven Base coverage additions to Validation Budget v0.2.
-- Exact Base becomes $530,200,000.00. Contingency $65M and safe-pause $55M unchanged.
-- Draft / unapproved / unpublished. Committed/actual remain 0. publish_flag false.

DO $$
DECLARE
  v_budget_id uuid;
  v_group_id uuid;
  v_sum bigint;
  v_lines int;
  v_cont bigint;
  v_pause bigint;
BEGIN
  SELECT id INTO v_budget_id FROM public.project_budgets
  WHERE name = 'Civizen Pre-Major-Build Validation Program v0.2' AND version = 1
  LIMIT 1;
  IF v_budget_id IS NULL THEN
    RAISE EXCEPTION 'Validation Budget v0.2 not found';
  END IF;

  UPDATE public.project_budgets SET
    purpose = 'Provisional working draft for the 18–24 month pre-major-build validation program (docs 14/29/30/31). Base scenario exact $530,200,000.00 (~$530M externally). Not an approved budget, bid, commitment, or authorization to accept funds.',
    internal_notes = 'Coverage adds (+$6.2M) applied to prior $524M working total. Contingency $65M and safe-pause $55M unchanged (formula deltas +$0.6M/+~$0.8M reported, not applied). Historical $446M and $524M superseded estimates. Draft only.',
    updated_at = now()
  WHERE id = v_budget_id;

  UPDATE public.budget_line_items li
  SET title = 'WS-01 · Core multidisciplinary program office & stewardship teams', description = 'Primary EX-01/EX-13. Loaded FTE/contractor stewardship. Includes embedded EX-02 benefits slice (~$25.9M disclosed across personnel-heavy lines; not additive here). Excludes WS-01.ADM (split).', planned_minor = 2600000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-01 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-01.ADM · Recruitment, onboarding, training, background checks & workforce administration', description = 'Traceable split from WS-01 ($28M→$26M+$2M). Primary EX-13/EX-19. Recruitment, onboarding, training, and workforce administration. Role-based screening/safeguarding depth beyond this slice is VAL-SCR (additive — not double-counted).', planned_minor = 200000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-01.ADM ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-21 · Public documentation & transparency program', description = 'Primary EX-21. Public documentation, transparency artifacts, and communications for the validation program (not broad marketing spend).', planned_minor = 600000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-21 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-22 · Travel, fieldwork & international coordination', description = 'Primary EX-22. Airfare, accommodation, visas, per diem, ground transport, field logistics, travel safety, accessibility-related travel support, and international coordination. Participant medical/evacuation risk transfer sits in VAL-EX16; cash emergency assistance in WS-25.IR.', planned_minor = 1000000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-22 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-02 · Constitutional & institutional design', description = 'Primary EX-14. Constitutional and institutional design for validation-phase governance frameworks.', planned_minor = 1600000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-02 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-03 · Human-rights & anti-capture safeguards', description = 'Primary EX-14. Human-rights review, anti-capture safeguards, and related ethics work.', planned_minor = 1100000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-03 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-18 · Legal entity & organizational formation package', description = 'Primary EX-15/EX-03. Entity formation, corporate counsel, regulatory filings setup. Ongoing accounting/audit ops clarified under WS-19.FIN (split from WS-19).', planned_minor = 1400000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-18 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-04 · System-inventory validation campaign (467 entries)', description = 'Primary EX-04. Challenges and validates the 467-entry system catalog; research/data acquisition for inventory rows included.', planned_minor = 1200000000,
      period_label = 'Months 2–19 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-04 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-05 · Architecture alternatives & threat modeling', description = 'Primary EX-05/EX-07. Architecture alternatives and threat modeling labor. Cloud/tooling/security tooling carved to WS-05.TEC (split from prior $22M).', planned_minor = 1700000000,
      period_label = 'Months 1–20 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-05 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-05.TEC · Cloud, communications, AI/API use, research tooling & security tooling', description = 'Traceable split from WS-05 ($22M→$17M+$5M). Primary EX-05/EX-06/EX-08/EX-18. Validation-phase cloud/hosting for research, communications infra, AI/API usage, specialist research tools, and security tooling (non-production).', planned_minor = 500000000,
      period_label = 'Months 1–20 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-05.TEC ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-06 · Federation & operator-network design validation', description = 'Primary EX-10. Design validation of federation/operator-network models — not funding 100 production operators.', planned_minor = 1500000000,
      period_label = 'Months 4–21 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-06 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-07 · Privacy & data-governance design', description = 'Primary EX-07. Privacy/data-governance design, DPIA methods, and related assurance research.', planned_minor = 1000000000,
      period_label = 'Months 2–19 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-07 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-08 · Security & cryptographic research', description = 'Primary EX-07. Security and cryptographic research (methods, threat models, test suites). Premium purchase is VAL-EX16; tooling spend also in WS-05.TEC / WS-17.HST.', planned_minor = 1600000000,
      period_label = 'Months 2–21 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-08 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-09 · AI governance & assurance frameworks', description = 'Primary EX-06/EX-07. AI governance and assurance frameworks; model-eval methods. AI/API usage budget home includes WS-05.TEC.', planned_minor = 900000000,
      period_label = 'Months 3–20 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-09 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-10 · Identity & credential interoperability design', description = 'Primary EX-05/EX-12. Identity and credential interoperability design (standards/hooks — not production IdP ops).', planned_minor = 1000000000,
      period_label = 'Months 3–20 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-10 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-11 · Economic, payments, accounting & taxation feasibility', description = 'Primary EX-04/EX-15. Feasibility of economic/payments/accounting/tax hooks — not live rails. Live banking/FX OpEx is VAL-EX17; tax charges VAL-EX28.', planned_minor = 1200000000,
      period_label = 'Months 4–21 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-11 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-14 · Standards & interoperability planning', description = 'Primary EX-12. Standards and interoperability planning; conformance test-suite seeds.', planned_minor = 800000000,
      period_label = 'Months 4–21 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-14 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-15 · Accessibility, localization & nondigital inclusion', description = 'Primary EX-20. Translation, interpretation, localization, accessibility engineering, and nondigital participation channels for validation activities.', planned_minor = 1000000000,
      period_label = 'Months 3–22 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-15 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-12.1 · Health — systems, public health, clinical safety, medicines, workforce, data & financing', description = 'Commissioned Health-system validation study (EX-04). Health systems, public health, clinical safety, medicines, workforce interfaces, health data, financing. Includes study-local research data, specialist tools, participant compensation, and publication prep. Role = standards/integration — not clinical operator or insurer. Distinct from VAL-EX02-GAP (employer benefits OpEx).', planned_minor = 850000000,
      period_label = 'Months 3–22 · working estimate', owner_label = 'Grants / pass-through'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-12.1 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-12.2 · Justice and dispute-resolution systems study', description = 'Commissioned domain study (EX-04). Includes study research data, specialist input, participant compensation, and publication prep.', planned_minor = 500000000,
      period_label = 'Months 3–22 · working estimate', owner_label = 'Grants / pass-through'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-12.2 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-12.3 · Tax and public-revenue systems study', description = 'Commissioned domain study (EX-04). Hooks/feasibility — not tax authority. Study research/data/publication included.', planned_minor = 350000000,
      period_label = 'Months 4–20 · working estimate', owner_label = 'Grants / pass-through'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-12.3 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-12.4 · Insurance — finance, banking, payments & monetary interfaces', description = 'Commissioned Insurance-system validation study (EX-04). Finance, banking, insurance-system frameworks, payments, monetary interfaces. Includes study research data, specialist tools, participant compensation, publications. Distinct from VAL-EX16 (program insurance OpEx). Role = standards/integration — not underwriter.', planned_minor = 700000000,
      period_label = 'Months 3–22 · working estimate', owner_label = 'Grants / pass-through'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-12.4 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-12.5 · Migration, borders, residency & mobility study', description = 'Commissioned domain study (EX-04). Study research/data/participant/publication costs included.', planned_minor = 500000000,
      period_label = 'Months 3–22 · working estimate', owner_label = 'Grants / pass-through'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-12.5 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-12.6 · Elections and democratic participation study', description = 'Commissioned domain study (EX-04). Non-binding research only. Study research/data/participant/publication costs included.', planned_minor = 450000000,
      period_label = 'Months 4–21 · working estimate', owner_label = 'Grants / pass-through'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-12.6 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-12.7 · Social protection, children, disability, pensions & care study', description = 'Commissioned domain study (EX-04). Study research/data/participant/publication costs included.', planned_minor = 450000000,
      period_label = 'Months 4–21 · working estimate', owner_label = 'Grants / pass-through'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-12.7 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-12.8 · Land, housing, property, communal & Indigenous rights study', description = 'Commissioned domain study (EX-04). FPIC-sensitive methods; study research/data/participant/publication costs included.', planned_minor = 500000000,
      period_label = 'Months 3–22 · working estimate', owner_label = 'Grants / pass-through'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-12.8 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-12.9 · Energy, environment & nuclear-accounting boundaries study', description = 'Commissioned domain study (EX-04). Boundary research; nuclear custody excluded. Study research/data/publication included.', planned_minor = 350000000,
      period_label = 'Months 4–20 · working estimate', owner_label = 'Grants / pass-through'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-12.9 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-12.10 · Official statistics, measurement & public evidence study', description = 'Commissioned domain study (EX-04). Not becoming an NSO. Study research/data/publication included.', planned_minor = 350000000,
      period_label = 'Months 4–20 · working estimate', owner_label = 'Grants / pass-through'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-12.10 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-12.C · Domain-study coordination & synthesis', description = 'Primary EX-04/EX-13. Cross-study coordination and synthesis — not an equal residual of the former $32M envelope.', planned_minor = 400000000,
      period_label = 'Months 3–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-12.C ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-13 · Jurisdiction & institutional consultations', description = 'Primary EX-11/EX-21. Jurisdiction and institutional consultations, convenings, and related participant/host compensation (distinct from WS-23 grants).', planned_minor = 2200000000,
      period_label = 'Months 2–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-13 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-16 · Independent multidisciplinary review panels (16)', description = 'Primary EX-04/EX-14. Ring-fenced independent panels and secretariat; includes Health panel among others.', planned_minor = 3400000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Independent review'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-16 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-17 · Controlled non-authoritative prototypes', description = 'Primary EX-05. Controlled non-authoritative prototypes (synthetic/authorized test data); labeled and stoppable. Hosting/security tooling/shutdown carved to WS-17.HST. Insurance gate: VAL-EX16 before multi-party prototypes.', planned_minor = 2100000000,
      period_label = 'Months 6–23 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-17 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-17.HST · Prototype hosting, security tooling & controlled shutdown/decommissioning', description = 'Traceable split from WS-17 ($24M→$21M+$3M). Primary EX-08/EX-27/EX-30-05. Prototype hosting, security tooling, controlled shutdown, and data export for prototype environments. Broader secure disposal/e-waste is VAL-DISP (additive — not double-counted).', planned_minor = 300000000,
      period_label = 'Months 6–23 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-17.HST ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-20 · Supplier evidence & cost validation', description = 'Primary EX-04. RFI/quotes/actuarial/benchmarks challenging planning hypotheses. Licensing/data tools carved to WS-20.LIC. Does not purchase insurance cover (VAL-EX16).', planned_minor = 800000000,
      period_label = 'Months 6–23 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-20 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-20.LIC · Data acquisition, specialist research tools, publications & licensing', description = 'Traceable split from WS-20 ($10M→$8M+$2M). Primary EX-18/EX-04. Data acquisition, specialist research tools, publications, and software/data licensing for validation evidence work.', planned_minor = 200000000,
      period_label = 'Months 6–23 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-20.LIC ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-19 · Procurement & financial-control systems setup', description = 'Primary EX-18/EX-15. Procurement and multi-entity financial-control systems setup. Accounting/audit/treasury ops carved to WS-19.FIN.', planned_minor = 500000000,
      period_label = 'Months 1–12 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-19 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-19.FIN · Accounting, independent financial audit, tax compliance & payment controls', description = 'Traceable split from WS-19 ($7M→$5M+$2M). Primary EX-03/EX-15/EX-17. Accounting setup, audit readiness, tax compliance processes, and payment-control operations. Recurring independent financial audit fees are VAL-AUD (additive — not double-counted). Live FX/fees also VAL-EX17.', planned_minor = 200000000,
      period_label = 'Months 1–12 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-19.FIN ·%';

  UPDATE public.budget_line_items li
  SET title = 'VAL-EX02-GAP · Workforce health, benefits, safety & wellbeing (EX-02 gap)', description = 'Explicit EX-02 additive gap beyond loaded personnel: employer health/jurisdictional equivalent uplift, disability/life, OHS, mental health/EAP, workers’ compensation equivalents, leave/statutory, contractor/participant duty-of-care. Embedded ~$25.9M remains inside personnel-heavy WS totals (disclosure only — not added twice).', planned_minor = 550000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'VAL-EX02-GAP ·%';

  UPDATE public.budget_line_items li
  SET title = 'VAL-EX16 · Program insurance & liability (EX-16)', description = 'Explicit EX-16. Quote-required program insurance: D&O, E&O, cyber, GL, EPL, travel/medical, participant liability, demonstrator/prototype cover, property, self-insured retention. Distinct from Insurance-system study (WS-12.4) and from EX-02 workforce benefits.', planned_minor = 900000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'VAL-EX16 ·%';

  UPDATE public.budget_line_items li
  SET title = 'VAL-EX17 · Banking, treasury & foreign-exchange costs (EX-17)', description = 'Explicit EX-17. Bank/payment processing fees, treasury/custody, and FX conversion costs for the validation phase.', planned_minor = 100000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'VAL-EX17 ·%';

  UPDATE public.budget_line_items li
  SET title = 'VAL-EX28 · Taxes, duties & mandatory charges (EX-28)', description = 'Explicit EX-28. Taxes, duties, assessments, and mandatory charges not absorbed in loaded FTE.', planned_minor = 100000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'VAL-EX28 ·%';

  UPDATE public.budget_line_items li
  SET title = 'VAL-EX09-GAP · Facilities, equipment, supplies & secure asset disposal (EX-09 gap)', description = 'Explicit EX-09 gap beyond thin embeds in WS-01: offices/facilities, equipment/devices, supplies, and secure asset disposal / e-waste compliance for validation ops.', planned_minor = 150000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'VAL-EX09-GAP ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-23 · Grants to research institutions & civil-society participants', description = 'Primary EX-23. Grants and participant compensation to research institutions and civil-society participants (events/consultations also touch WS-13 / study lines).', planned_minor = 2600000000,
      period_label = 'Months 2–24 · working estimate', owner_label = 'Grants / pass-through'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-23 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-24 · Program contingency (policy)', description = 'Primary EX-30-01. Policy contingency held at $65M (prior ~16% of $404M work program). After coverage adds, work-program denominator is $410.2M; formula ~16% would imply ~$65.6M (+$0.6M) — not applied pending owner decision. Not a substitute for named EX-02/EX-16 lines.', planned_minor = 6500000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Core-controlled'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-24 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-25 · Safe-pause & validation-program continuity reserve', description = 'Primary EX-30-04. Safe-pause held at $51M within $55M reserve group (with WS-25.IR $4M). After coverage adds, ~13.6% of $410.2M work program would imply ~$55.8M (+$0.8M) — not applied pending owner decision. Not production continuity ($2–4B) and not EX-16 premiums. Distinct from VAL-EMR emergency assistance.', planned_minor = 5100000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Protected reserve'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-25 ·%';

  UPDATE public.budget_line_items li
  SET title = 'WS-25.IR · Incident response, emergency assistance & demonstrator decommissioning', description = 'Traceable split from WS-25 ($55M→$51M+$4M). Primary EX-27/EX-30-05. Incident response readiness and demonstrator/prototype decommissioning beyond WS-17.HST tooling. Defined emergency participant/field assistance fund is VAL-EMR (additive — not double-counted).', planned_minor = 400000000,
      period_label = 'Months 1–24 · working estimate', owner_label = 'Protected reserve'
  FROM public.budget_expense_groups g
  WHERE li.group_id = g.id AND g.budget_id = v_budget_id AND li.title LIKE 'WS-25.IR ·%';

  SELECT g.id INTO v_group_id FROM public.budget_expense_groups g
  WHERE g.budget_id = v_budget_id AND g.name = 'Program office & coordination' LIMIT 1;
  IF NOT EXISTS (
    SELECT 1 FROM public.budget_line_items li
    JOIN public.budget_expense_groups g ON g.id = li.group_id
    WHERE g.budget_id = v_budget_id AND li.title LIKE 'VAL-SCR ·%'
  ) THEN
    INSERT INTO public.budget_line_items (
      group_id, title, description, public_description,
      planned_minor, committed_minor, actual_minor, currency, period_label,
      publish_flag, status, owner_label
    ) VALUES (
      v_group_id, 'VAL-SCR · Role-based screening, safeguarding & background checks', 'Additive EX-13/EX-19 depth beyond WS-01.ADM. Role-specific, proportionate, purpose-limited screening and safeguarding checks for defined validation roles; appealable where relevant; compliant with applicable rights and employment law. Not universal participant screening.',
      'Working estimate — not published financial figures.',
      80000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
      false, 'active', 'Core-controlled'
    );
  ELSE
    UPDATE public.budget_line_items li
    SET title='VAL-SCR · Role-based screening, safeguarding & background checks', description='Additive EX-13/EX-19 depth beyond WS-01.ADM. Role-specific, proportionate, purpose-limited screening and safeguarding checks for defined validation roles; appealable where relevant; compliant with applicable rights and employment law. Not universal participant screening.', planned_minor=80000000,
        period_label='Months 1–24 · working estimate', owner_label='Core-controlled'
    FROM public.budget_expense_groups g
    WHERE li.group_id=g.id AND g.budget_id=v_budget_id AND li.title LIKE 'VAL-SCR ·%';
  END IF;

  SELECT g.id INTO v_group_id FROM public.budget_expense_groups g
  WHERE g.budget_id = v_budget_id AND g.name = 'Procurement & financial controls' LIMIT 1;
  IF NOT EXISTS (
    SELECT 1 FROM public.budget_line_items li
    JOIN public.budget_expense_groups g ON g.id = li.group_id
    WHERE g.budget_id = v_budget_id AND li.title LIKE 'VAL-AUD ·%'
  ) THEN
    INSERT INTO public.budget_line_items (
      group_id, title, description, public_description,
      planned_minor, committed_minor, actual_minor, currency, period_label,
      publish_flag, status, owner_label
    ) VALUES (
      v_group_id, 'VAL-AUD · Recurring independent financial audit', 'Additive EX-03/EX-07 beyond WS-19.FIN setup. Recurring independent financial audit fees for the validation phase — not formation-only accounting setup.',
      'Working estimate — not published financial figures.',
      150000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
      false, 'active', 'Core-controlled'
    );
  ELSE
    UPDATE public.budget_line_items li
    SET title='VAL-AUD · Recurring independent financial audit', description='Additive EX-03/EX-07 beyond WS-19.FIN setup. Recurring independent financial audit fees for the validation phase — not formation-only accounting setup.', planned_minor=150000000,
        period_label='Months 1–24 · working estimate', owner_label='Core-controlled'
    FROM public.budget_expense_groups g
    WHERE li.group_id=g.id AND g.budget_id=v_budget_id AND li.title LIKE 'VAL-AUD ·%';
  END IF;

  SELECT g.id INTO v_group_id FROM public.budget_expense_groups g
  WHERE g.budget_id = v_budget_id AND g.name = 'Controlled prototypes & cost validation' LIMIT 1;
  IF NOT EXISTS (
    SELECT 1 FROM public.budget_line_items li
    JOIN public.budget_expense_groups g ON g.id = li.group_id
    WHERE g.budget_id = v_budget_id AND li.title LIKE 'VAL-DISP ·%'
  ) THEN
    INSERT INTO public.budget_line_items (
      group_id, title, description, public_description,
      planned_minor, committed_minor, actual_minor, currency, period_label,
      publish_flag, status, owner_label
    ) VALUES (
      v_group_id, 'VAL-DISP · Secure disposal & e-waste handling', 'Additive EX-09/EX-25 beyond WS-17.HST prototype disposal and VAL-EX09-GAP facilities. Secure disposal, crypto-erase where required, and e-waste handling for validation equipment and media. Not double-counted with WS-17.HST.',
      'Working estimate — not published financial figures.',
      60000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
      false, 'active', 'Core-controlled'
    );
  ELSE
    UPDATE public.budget_line_items li
    SET title='VAL-DISP · Secure disposal & e-waste handling', description='Additive EX-09/EX-25 beyond WS-17.HST prototype disposal and VAL-EX09-GAP facilities. Secure disposal, crypto-erase where required, and e-waste handling for validation equipment and media. Not double-counted with WS-17.HST.', planned_minor=60000000,
        period_label='Months 1–24 · working estimate', owner_label='Core-controlled'
    FROM public.budget_expense_groups g
    WHERE li.group_id=g.id AND g.budget_id=v_budget_id AND li.title LIKE 'VAL-DISP ·%';
  END IF;

  SELECT g.id INTO v_group_id FROM public.budget_expense_groups g
  WHERE g.budget_id = v_budget_id AND g.name = 'Controlled prototypes & cost validation' LIMIT 1;
  IF NOT EXISTS (
    SELECT 1 FROM public.budget_line_items li
    JOIN public.budget_expense_groups g ON g.id = li.group_id
    WHERE g.budget_id = v_budget_id AND li.title LIKE 'VAL-UTIL ·%'
  ) THEN
    INSERT INTO public.budget_line_items (
      group_id, title, description, public_description,
      planned_minor, committed_minor, actual_minor, currency, period_label,
      publish_flag, status, owner_label
    ) VALUES (
      v_group_id, 'VAL-UTIL · Utilities & energy for validation compute', 'Additive EX-25. Utilities and energy for validation-phase compute and research environments — beyond thin embeds in cloud/tooling lines.',
      'Working estimate — not published financial figures.',
      50000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
      false, 'active', 'Core-controlled'
    );
  ELSE
    UPDATE public.budget_line_items li
    SET title='VAL-UTIL · Utilities & energy for validation compute', description='Additive EX-25. Utilities and energy for validation-phase compute and research environments — beyond thin embeds in cloud/tooling lines.', planned_minor=50000000,
        period_label='Months 1–24 · working estimate', owner_label='Core-controlled'
    FROM public.budget_expense_groups g
    WHERE li.group_id=g.id AND g.budget_id=v_budget_id AND li.title LIKE 'VAL-UTIL ·%';
  END IF;

  SELECT g.id INTO v_group_id FROM public.budget_expense_groups g
  WHERE g.budget_id = v_budget_id AND g.name = 'Explicit operating provisions' LIMIT 1;
  IF NOT EXISTS (
    SELECT 1 FROM public.budget_line_items li
    JOIN public.budget_expense_groups g ON g.id = li.group_id
    WHERE g.budget_id = v_budget_id AND li.title LIKE 'VAL-EMR ·%'
  ) THEN
    INSERT INTO public.budget_line_items (
      group_id, title, description, public_description,
      planned_minor, committed_minor, actual_minor, currency, period_label,
      publish_flag, status, owner_label
    ) VALUES (
      v_group_id, 'VAL-EMR · Emergency participant/field assistance', 'Additive EX-27 cash/ops fund distinct from WS-25.IR and VAL-EX16 insurance. Defined purpose: emergency participant/field assistance during authorized validation activities. Eligibility rule, authorization process, evidence requirement, and audit trail required — not discretionary cash.',
      'Working estimate — not published financial figures.',
      100000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
      false, 'active', 'Core-controlled'
    );
  ELSE
    UPDATE public.budget_line_items li
    SET title='VAL-EMR · Emergency participant/field assistance', description='Additive EX-27 cash/ops fund distinct from WS-25.IR and VAL-EX16 insurance. Defined purpose: emergency participant/field assistance during authorized validation activities. Eligibility rule, authorization process, evidence requirement, and audit trail required — not discretionary cash.', planned_minor=100000000,
        period_label='Months 1–24 · working estimate', owner_label='Core-controlled'
    FROM public.budget_expense_groups g
    WHERE li.group_id=g.id AND g.budget_id=v_budget_id AND li.title LIKE 'VAL-EMR ·%';
  END IF;

  SELECT g.id INTO v_group_id FROM public.budget_expense_groups g
  WHERE g.budget_id = v_budget_id AND g.name = 'Explicit operating provisions' LIMIT 1;
  IF NOT EXISTS (
    SELECT 1 FROM public.budget_line_items li
    JOIN public.budget_expense_groups g ON g.id = li.group_id
    WHERE g.budget_id = v_budget_id AND li.title LIKE 'VAL-LOSS ·%'
  ) THEN
    INSERT INTO public.budget_line_items (
      group_id, title, description, public_description,
      planned_minor, committed_minor, actual_minor, currency, period_label,
      publish_flag, status, owner_label
    ) VALUES (
      v_group_id, 'VAL-LOSS · Refunds, reversals, bad debt & loss adjustments', 'Additive EX-29. Refunds, reversals, bad-debt expense, and loss adjustments arising in validation-phase financial operations. Not contingency and not safe-pause.',
      'Working estimate — not published financial figures.',
      30000000, 0, 0, 'USD', 'Months 1–24 · working estimate',
      false, 'active', 'Core-controlled'
    );
  ELSE
    UPDATE public.budget_line_items li
    SET title='VAL-LOSS · Refunds, reversals, bad debt & loss adjustments', description='Additive EX-29. Refunds, reversals, bad-debt expense, and loss adjustments arising in validation-phase financial operations. Not contingency and not safe-pause.', planned_minor=30000000,
        period_label='Months 1–24 · working estimate', owner_label='Core-controlled'
    FROM public.budget_expense_groups g
    WHERE li.group_id=g.id AND g.budget_id=v_budget_id AND li.title LIKE 'VAL-LOSS ·%';
  END IF;

  SELECT g.id INTO v_group_id FROM public.budget_expense_groups g
  WHERE g.budget_id = v_budget_id AND g.name = 'Grants & civil-society participation' LIMIT 1;
  IF NOT EXISTS (
    SELECT 1 FROM public.budget_line_items li
    JOIN public.budget_expense_groups g ON g.id = li.group_id
    WHERE g.budget_id = v_budget_id AND li.title LIKE 'VAL-EVT ·%'
  ) THEN
    INSERT INTO public.budget_line_items (
      group_id, title, description, public_description,
      planned_minor, committed_minor, actual_minor, currency, period_label,
      publish_flag, status, owner_label
    ) VALUES (
      v_group_id, 'VAL-EVT · Convenings, consultations & events beyond travel', 'Additive EX-21/EX-22-02 beyond WS-22 travel logistics and WS-13 consultation labor. Convenings, consultations, and events (venue, facilitation, participant support for events) owned with civil-society/grants coordination. Airfare/lodging/visas/per diem/ground/logistics/travel safety remain WS-22.',
      'Working estimate — not published financial figures.',
      150000000, 0, 0, 'USD', 'Months 2–24 · working estimate',
      false, 'active', 'Grants / pass-through'
    );
  ELSE
    UPDATE public.budget_line_items li
    SET title='VAL-EVT · Convenings, consultations & events beyond travel', description='Additive EX-21/EX-22-02 beyond WS-22 travel logistics and WS-13 consultation labor. Convenings, consultations, and events (venue, facilitation, participant support for events) owned with civil-society/grants coordination. Airfare/lodging/visas/per diem/ground/logistics/travel safety remain WS-22.', planned_minor=150000000,
        period_label='Months 2–24 · working estimate', owner_label='Grants / pass-through'
    FROM public.budget_expense_groups g
    WHERE li.group_id=g.id AND g.budget_id=v_budget_id AND li.title LIKE 'VAL-EVT ·%';
  END IF;

  SELECT COALESCE(SUM(li.planned_minor),0) INTO v_cont
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_budget_id AND li.title LIKE 'WS-24 ·%';
  SELECT COALESCE(SUM(li.planned_minor),0) INTO v_pause
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_budget_id AND (li.title LIKE 'WS-25 ·%' OR li.title LIKE 'WS-25.IR ·%');
  IF v_cont <> 6500000000 THEN RAISE EXCEPTION 'contingency changed to %', v_cont; END IF;
  IF v_pause <> 5500000000 THEN RAISE EXCEPTION 'safe-pause group changed to %', v_pause; END IF;

  SELECT COUNT(*), COALESCE(SUM(li.planned_minor),0) INTO v_lines, v_sum
  FROM public.budget_line_items li
  JOIN public.budget_expense_groups g ON g.id = li.group_id
  WHERE g.budget_id = v_budget_id;
  IF v_lines <> 53 THEN RAISE EXCEPTION 'expected 53 lines, got %', v_lines; END IF;
  IF v_sum <> 53020000000 THEN RAISE EXCEPTION 'planned_minor %, expected 53020000000', v_sum; END IF;

  INSERT INTO public.budget_revisions (budget_id, change_summary, changed_fields, reason, actor_user_id)
  VALUES (
    v_budget_id,
    'Applied seven Base coverage additions (+$6.2M). Exact Base $530,200,000.00. Contingency/safe-pause unchanged.',
    '["coverage-adds","validation-budget-v0.2","base-530.2"]'::jsonb,
    'Owner accepted doc 31 Base adds. Formula reserve deltas (+~$0.6M contingency, +~$0.8M safe-pause) reported not applied. Draft remains unapproved/unpublished.',
    NULL
  );
  RAISE NOTICE 'Adds applied OK budget=% lines=% planned_minor=% cont=% pause=%', v_budget_id, v_lines, v_sum, v_cont, v_pause;
END $$;
