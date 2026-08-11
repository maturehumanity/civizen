-- Idempotent seed: Civizen Pre-Major-Build Validation Program v0.1
-- Source: docs/04-operations/funding-and-budget/14-*.md/csv
-- Base-scenario planned amounts only. committed/actual = 0. draft, unapproved, unpublished.
-- Does NOT recreate Civizen Draft Budget v0.1 (retired from ordinary use).
-- No commitments/receipts/allocations.

DO $$
DECLARE
  v_budget_id uuid;
  v_group_id uuid;
  v_existing uuid;
  v_group_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  SELECT id INTO v_existing
  FROM public.project_budgets
  WHERE name = 'Civizen Pre-Major-Build Validation Program v0.1'
    AND version = 1;

  IF v_existing IS NOT NULL THEN
    RAISE NOTICE 'Validation Program budget v0.1 already exists (%); seed skipped.', v_existing;
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
    'Civizen Pre-Major-Build Validation Program v0.1',
    'Draft working estimates for the 18–24 month pre-major-build validation and institutional-formation program (document 14). Base scenario only. Not an approved budget, bid, commitment, or authorization to accept funds or begin production.',
    'USD',
    1,
    'draft',
    'Source: docs/04-operations/funding-and-budget/14-pre-major-build-validation-program-v0.1.md and 14-validation-workstreams-and-budget-v0.1.csv. All planned amounts are working estimates (base scenario). Low/high scenarios stay in Program Plan. Do not approve or publish until owner review. Civizen Draft Budget v0.1 demonstration skeleton is retired from ordinary application use.',
    false
  )
  RETURNING id INTO v_budget_id;

  INSERT INTO public.budget_revisions (
    budget_id,
    change_summary,
    changed_fields,
    reason
  ) VALUES (
    v_budget_id,
    'Seeded Pre-Major-Build Validation Program v0.1 (base scenario working estimates)',
    '["seed","validation-budget-v0.1"]'::jsonb,
    'Idempotent import from document 14 CSV base scenario. Draft only; no approval, publication, commitments, receipts, or allocations.'
  );

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Program office & coordination',
    'Core stewardship, public documentation, and international coordination.',
    10
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, owner_label, funding_restriction_tag, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'WS-01 · Core multidisciplinary program office & stewardship teams',
    'Working estimate (base scenario). Purpose: Program mgmt, inventory leads, architecture liaison, finance, ops; FTE loaded costs Funding responsibility: Core-controlled (core). Source workstream WS-01 from document 14.',
    'Core program office and stewardship for the validation phase (working estimate).',
    2800000000, 0, 0, 'USD',
    'Months 1–24 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  ),
  (
    v_group_id,
    'WS-21 · Public documentation & transparency program',
    'Working estimate (base scenario). Purpose: Public goods packaging; concept summary; open reports Funding responsibility: Core-controlled (core). Source workstream WS-21 from document 14.',
    'Public documentation and transparency program (working estimate).',
    600000000, 0, 0, 'USD',
    'Months 1–24 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  ),
  (
    v_group_id,
    'WS-22 · Travel & international coordination',
    'Working estimate (base scenario). Purpose: Hybrid-first; equity travel fund for Global South participants Funding responsibility: Core-controlled (core). Source workstream WS-22 from document 14.',
    'Travel and international coordination for validation (working estimate).',
    1000000000, 0, 0, 'USD',
    'Months 1–24 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  );

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Constitutional, rights & legal formation',
    'Institutional design, anti-capture safeguards, and legal entity formation.',
    20
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, owner_label, funding_restriction_tag, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'WS-02 · Constitutional & institutional design',
    'Working estimate (base scenario). Purpose: Charters, SoD, temporary→mature governance pathway; counsel Funding responsibility: Core-controlled (core). Source workstream WS-02 from document 14.',
    'Constitutional and institutional design work for validation (working estimate).',
    1600000000, 0, 0, 'USD',
    'Months 1–24 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  ),
  (
    v_group_id,
    'WS-03 · Human-rights & anti-capture safeguards',
    'Working estimate (base scenario). Purpose: Rights impact assessments; capture scenarios; complaint design Funding responsibility: Core-controlled (core). Source workstream WS-03 from document 14.',
    'Human-rights and anti-capture safeguard design (working estimate).',
    1100000000, 0, 0, 'USD',
    'Months 1–24 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  ),
  (
    v_group_id,
    'WS-18 · Legal entity & organizational formation package',
    'Working estimate (base scenario). Purpose: Core steward; independent bodies; CoI; whistleblower; procurement rules Funding responsibility: Core-controlled (core). Source workstream WS-18 from document 14.',
    'Legal entity and organizational formation for validation (working estimate).',
    1400000000, 0, 0, 'USD',
    'Months 1–24 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  );

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Inventory, architecture & federation',
    'System-catalog validation, architecture alternatives, and operator-network design.',
    30
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, owner_label, funding_restriction_tag, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'WS-04 · System-inventory validation campaign (467 entries)',
    'Working estimate (base scenario). Purpose: Structured review method; special tracks for operate/never-centralize Funding responsibility: Core-controlled (core). Source workstream WS-04 from document 14.',
    'Validation of the living system catalog (working estimate).',
    1200000000, 0, 0, 'USD',
    'Months 2–19 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  ),
  (
    v_group_id,
    'WS-05 · Architecture alternatives & threat modeling',
    'Working estimate (base scenario). Purpose: Federation topologies; adversarial models; alternative analyses Funding responsibility: Core-controlled (core). Source workstream WS-05 from document 14.',
    'Architecture alternatives and threat modeling (working estimate).',
    2200000000, 0, 0, 'USD',
    'Months 1–20 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  ),
  (
    v_group_id,
    'WS-06 · Federation & operator-network design validation',
    'Working estimate (base scenario). Purpose: ≤10 design-validation operators; independence criteria; no production authority Funding responsibility: Core-controlled (core). Source workstream WS-06 from document 14.',
    'Federation and operator-network design validation (working estimate).',
    1500000000, 0, 0, 'USD',
    'Months 4–21 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  );

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Privacy, security & AI assurance',
    'Privacy/data governance, security research, and AI governance frameworks.',
    40
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, owner_label, funding_restriction_tag, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'WS-07 · Privacy & data-governance design',
    'Working estimate (base scenario). Purpose: Data classes; cross-border rules; DPIA patterns; minimization Funding responsibility: Core-controlled (core). Source workstream WS-07 from document 14.',
    'Privacy and data-governance design (working estimate).',
    1000000000, 0, 0, 'USD',
    'Months 2–19 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  ),
  (
    v_group_id,
    'WS-08 · Security & cryptographic research',
    'Working estimate (base scenario). Purpose: Crypto agility; supply chain; IR drills on demos only Funding responsibility: Core-controlled (core). Source workstream WS-08 from document 14.',
    'Security and cryptographic research for validation (working estimate).',
    1600000000, 0, 0, 'USD',
    'Months 2–21 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  ),
  (
    v_group_id,
    'WS-09 · AI governance & assurance frameworks',
    'Working estimate (base scenario). Purpose: Model inventory; HITL; evaluation protocols for Civizen agents Funding responsibility: Core-controlled (core). Source workstream WS-09 from document 14.',
    'AI governance and assurance frameworks (working estimate).',
    900000000, 0, 0, 'USD',
    'Months 3–20 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  );

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Identity, economics, standards & inclusion',
    'Identity interoperability, economic feasibility, standards, and accessibility/localization.',
    50
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, owner_label, funding_restriction_tag, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'WS-10 · Identity & credential interoperability design',
    'Working estimate (base scenario). Purpose: Interop profiles; no production population binding Funding responsibility: Core-controlled (core). Source workstream WS-10 from document 14.',
    'Identity and credential interoperability design (working estimate).',
    1000000000, 0, 0, 'USD',
    'Months 3–20 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  ),
  (
    v_group_id,
    'WS-11 · Economic, payments, accounting & taxation feasibility',
    'Working estimate (base scenario). Purpose: Hooks vs rails; no real-money custody; tax authority boundaries Funding responsibility: Core-controlled (core). Source workstream WS-11 from document 14.',
    'Economic, payments, accounting, and taxation feasibility (working estimate).',
    1200000000, 0, 0, 'USD',
    'Months 4–21 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  ),
  (
    v_group_id,
    'WS-14 · Standards & interoperability planning',
    'Working estimate (base scenario). Purpose: Conformance suites planning; liaison to SDOs Funding responsibility: Core-controlled (core). Source workstream WS-14 from document 14.',
    'Standards and interoperability planning (working estimate).',
    800000000, 0, 0, 'USD',
    'Months 4–21 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  ),
  (
    v_group_id,
    'WS-15 · Accessibility, localization & nondigital inclusion',
    'Working estimate (base scenario). Purpose: Priority languages; paper/phone/kiosk patterns for demos Funding responsibility: Core-controlled (core). Source workstream WS-15 from document 14.',
    'Accessibility, localization, and nondigital inclusion design (working estimate).',
    1000000000, 0, 0, 'USD',
    'Months 3–22 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  );

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Domain studies & consultations',
    'Commissioned domain studies and jurisdiction/institutional consultations.',
    60
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, owner_label, funding_restriction_tag, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'WS-12 · Commissioned priority domain studies (10)',
    'Working estimate (base scenario). Purpose: See doc 15 briefs; published public-interest outputs required Funding responsibility: Grants / pass-through (grant_pass_through). Source workstream WS-12 from document 14.',
    'Commissioned priority domain studies (working estimate; grant pass-through).',
    3200000000, 0, 0, 'USD',
    'Months 3–22 · working estimate',
    'Grants / pass-through',
    'grant_pass_through',
    false,
    'active'
  ),
  (
    v_group_id,
    'WS-13 · Jurisdiction & institutional consultations',
    'Working estimate (base scenario). Purpose: Sample legal traditions; MoU prep only; in-kind J time tracked separately Funding responsibility: Core-controlled (core). Source workstream WS-13 from document 14.',
    'Jurisdiction and institutional consultations (working estimate).',
    2200000000, 0, 0, 'USD',
    'Months 2–24 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  );

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Independent multidisciplinary review',
    'Ring-fenced independent review panels (not unilaterally controlled by the implementer).',
    70
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, owner_label, funding_restriction_tag, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'WS-16 · Independent multidisciplinary review panels (16)',
    'Working estimate (base scenario). Purpose: Ring-fenced; honoraria; secretariat; minority reports preserved Funding responsibility: Independent review (independent). Source workstream WS-16 from document 14.',
    'Independent multidisciplinary review panels (working estimate; independently administered).',
    3400000000, 0, 0, 'USD',
    'Months 1–24 · working estimate',
    'Independent review',
    'independent',
    false,
    'active'
  );

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Demonstrators & cost-model validation',
    'Non-authoritative demonstrators and independent cost-model validation.',
    80
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, owner_label, funding_restriction_tag, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'WS-17 · Controlled non-authoritative demonstrators',
    'Working estimate (base scenario). Purpose: Synthetic/authorized test data only; safely stoppable; labeled Funding responsibility: Core-controlled (core). Source workstream WS-17 from document 14.',
    'Controlled non-authoritative demonstrators (working estimate).',
    2400000000, 0, 0, 'USD',
    'Months 6–23 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  ),
  (
    v_group_id,
    'WS-20 · Cost-model validation (RFI/quotes/actuarial/benchmarks)',
    'Working estimate (base scenario). Purpose: Challenges 11/12/13 hypotheses; publishes confidence bands Funding responsibility: Core-controlled (core). Source workstream WS-20 from document 14.',
    'Cost-model validation via RFI, quotes, and benchmarks (working estimate).',
    1000000000, 0, 0, 'USD',
    'Months 6–23 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  );

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Procurement & financial controls',
    'Procurement and multi-entity financial-control systems setup for this phase.',
    90
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, owner_label, funding_restriction_tag, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'WS-19 · Procurement & financial-control systems setup',
    'Working estimate (base scenario). Purpose: Multi-entity ledgers design; not loading civilization figures into app DB Funding responsibility: Core-controlled (core). Source workstream WS-19 from document 14.',
    'Procurement and financial-control systems setup (working estimate).',
    700000000, 0, 0, 'USD',
    'Months 1–12 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  );

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Grants & civil-society participation',
    'Pass-through grants to research institutions and civil-society participants.',
    100
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, owner_label, funding_restriction_tag, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'WS-23 · Grants to research institutions & civil-society participants',
    'Working estimate (base scenario). Purpose: Inclusion; community validation; not core P&L spend Funding responsibility: Grants / pass-through (grant_pass_through). Source workstream WS-23 from document 14.',
    'Grants to research and civil-society participants (working estimate; pass-through).',
    2600000000, 0, 0, 'USD',
    'Months 2–24 · working estimate',
    'Grants / pass-through',
    'grant_pass_through',
    false,
    'active'
  );

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Program contingency',
    'Policy contingency for the validation program (working estimate).',
    110
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, owner_label, funding_restriction_tag, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'WS-24 · Program contingency (policy)',
    'Working estimate (base scenario). Purpose: ~15–18% of workstreams WS-01..WS-23; drawdown rules Funding responsibility: Core-controlled (core). Source workstream WS-24 from document 14.',
    'Validation program contingency (working estimate).',
    4000000000, 0, 0, 'USD',
    'Months 1–24 · working estimate',
    'Core-controlled',
    'core',
    false,
    'active'
  );

  INSERT INTO public.budget_expense_groups (budget_id, name, description, display_order)
  VALUES (
    v_budget_id,
    'Safe-pause reserve',
    'Validation-phase wind-down and continuity reserve — not the production continuity package.',
    120
  )
  RETURNING id INTO v_group_id;

  INSERT INTO public.budget_line_items (
    group_id, title, description, public_description,
    planned_minor, committed_minor, actual_minor, currency,
    period_label, owner_label, funding_restriction_tag, publish_flag, status
  ) VALUES
  (
    v_group_id,
    'WS-25 · Safe-pause & validation-program continuity reserve',
    'Working estimate (base scenario). Purpose: Wind-down, publish, archive, transfer; NOT the $2–4B production continuity package Funding responsibility: Protected reserve (reserve). Source workstream WS-25 from document 14.',
    'Safe-pause reserve for the validation phase only (working estimate).',
    4200000000, 0, 0, 'USD',
    'Months 1–24 · working estimate',
    'Protected reserve',
    'reserve',
    false,
    'active'
  );

  RAISE NOTICE 'Seeded Civizen Pre-Major-Build Validation Program v0.1 as %', v_budget_id;
END $$;
