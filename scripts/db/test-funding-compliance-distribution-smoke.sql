-- Phase 5–6 funding compliance + distribution self-test (run as postgres).
-- Marker: legal_name / notes / display_name / label contain __civizen_funding_p56_selftest__
-- Note: SECURITY DEFINER RPCs that require auth.uid() are object-checked only; data paths are exercised via direct inserts.

DO $$
DECLARE
  v_funder uuid := gen_random_uuid();
  v_commit uuid := gen_random_uuid();
  v_case uuid := gen_random_uuid();
  v_period uuid := gen_random_uuid();
  v_contrib uuid := gen_random_uuid();
  v_blocked int;
  v_payouts int;
BEGIN
  IF to_regclass('public.funding_compliance_cases') IS NULL THEN
    RAISE EXCEPTION 'missing table funding_compliance_cases';
  END IF;
  IF to_regclass('public.funding_payment_receipts') IS NULL THEN
    RAISE EXCEPTION 'missing table funding_payment_receipts';
  END IF;
  IF to_regclass('public.distribution_periods') IS NULL THEN
    RAISE EXCEPTION 'missing table distribution_periods';
  END IF;
  IF to_regclass('public.funding_payouts') IS NULL THEN
    RAISE EXCEPTION 'missing table funding_payouts';
  END IF;
  IF to_regclass('public.contributor_profiles') IS NULL THEN
    RAISE EXCEPTION 'missing table contributor_profiles';
  END IF;
  IF to_regclass('public.contribution_records') IS NULL THEN
    RAISE EXCEPTION 'missing table contribution_records';
  END IF;
  IF to_regprocedure('public.upsert_funding_compliance_case(text, text, uuid, uuid, text, text, text, uuid)') IS NULL THEN
    RAISE EXCEPTION 'missing function upsert_funding_compliance_case';
  END IF;
  IF to_regprocedure('public.record_funding_payment_receipt(uuid, numeric, text, text, text, date, text, boolean)') IS NULL THEN
    RAISE EXCEPTION 'missing function record_funding_payment_receipt';
  END IF;
  IF to_regprocedure('public.create_distribution_period(text, date, date, numeric, numeric, numeric, text)') IS NULL THEN
    RAISE EXCEPTION 'missing function create_distribution_period';
  END IF;
  IF to_regprocedure('public.approve_distribution_period(uuid)') IS NULL THEN
    RAISE EXCEPTION 'missing function approve_distribution_period';
  END IF;

  -- Cleanup prior residue
  ALTER TABLE public.funding_ledger_entries DISABLE TRIGGER prevent_funding_ledger_entries_delete;
  DELETE FROM public.funding_payouts
  WHERE distribution_period_id IN (
    SELECT id FROM public.distribution_periods WHERE label ILIKE '%__civizen_funding_p56_selftest__%'
  );
  DELETE FROM public.distribution_periods WHERE label ILIKE '%__civizen_funding_p56_selftest__%';
  DELETE FROM public.contribution_records
  WHERE contributor_id IN (
    SELECT id FROM public.contributor_profiles WHERE display_name ILIKE '%__civizen_funding_p56_selftest__%'
  );
  DELETE FROM public.contributor_profiles WHERE display_name ILIKE '%__civizen_funding_p56_selftest__%';
  DELETE FROM public.funding_payment_receipts
  WHERE funding_commitment_id IN (
    SELECT id FROM public.funding_commitments WHERE notes ILIKE '%__civizen_funding_p56_selftest__%'
  );
  DELETE FROM public.funding_compliance_cases
  WHERE summary ILIKE '%__civizen_funding_p56_selftest__%'
     OR funder_id IN (
       SELECT id FROM public.funders WHERE legal_name ILIKE '%__civizen_funding_p56_selftest__%'
     );
  DELETE FROM public.investor_positions
  WHERE funding_commitment_id IN (
    SELECT id FROM public.funding_commitments WHERE notes ILIKE '%__civizen_funding_p56_selftest__%'
  );
  DELETE FROM public.funding_ledger_entries
  WHERE source_id IN (
    SELECT id FROM public.funding_commitments WHERE notes ILIKE '%__civizen_funding_p56_selftest__%'
  );
  DELETE FROM public.funding_commitments WHERE notes ILIKE '%__civizen_funding_p56_selftest__%';
  DELETE FROM public.funders WHERE legal_name ILIKE '%__civizen_funding_p56_selftest__%';
  ALTER TABLE public.funding_ledger_entries ENABLE TRIGGER prevent_funding_ledger_entries_delete;

  INSERT INTO public.funders (id, legal_name, funder_type, country, kyc_status, sanctions_status)
  VALUES (v_funder, '__civizen_funding_p56_selftest__ Investor', 'individual', 'US', 'cleared', 'clear');

  INSERT INTO public.funding_commitments (
    id, funder_id, lane, amount_original, currency, amount_usd, payment_method, status, notes
  ) VALUES (
    v_commit, v_funder, 'investor', 5000, 'USD', 5000, 'wire', 'pledged',
    '__civizen_funding_p56_selftest__ pledged'
  );

  INSERT INTO public.funding_compliance_cases (
    id, funder_id, funding_commitment_id, case_type, status, priority, summary
  ) VALUES (
    v_case, v_funder, v_commit, 'sanctions', 'blocked', 'high',
    '__civizen_funding_p56_selftest__ blocked case'
  );

  -- Mirror mark_funding_commitment_status compliance gate
  SELECT count(*) INTO v_blocked
  FROM public.funding_compliance_cases
  WHERE status = 'blocked'
    AND (funder_id = v_funder OR funding_commitment_id = v_commit);

  IF v_blocked < 1 THEN
    RAISE EXCEPTION 'expected blocked compliance case';
  END IF;

  UPDATE public.funding_compliance_cases
  SET status = 'cleared', updated_at = now()
  WHERE id = v_case;

  SELECT count(*) INTO v_blocked
  FROM public.funding_compliance_cases
  WHERE status = 'blocked'
    AND (funder_id = v_funder OR funding_commitment_id = v_commit);

  IF v_blocked <> 0 THEN
    RAISE EXCEPTION 'blocked case should be cleared';
  END IF;

  UPDATE public.funding_commitments
  SET status = 'received', date_received = CURRENT_DATE, updated_at = now()
  WHERE id = v_commit;

  INSERT INTO public.funding_ledger_entries (
    source_type, source_id, debit_account, credit_account, amount_usd, currency_original, audit_status, memo
  ) VALUES (
    'funding_commitment', v_commit, 'treasury_clearing', 'lane_investor_capital', 5000, 'USD', 'recorded',
    '__civizen_funding_p56_selftest__'
  );

  INSERT INTO public.investor_positions (
    funder_id, funding_commitment_id, verified_capital_usd, capital_points
  ) VALUES (v_funder, v_commit, 5000, 5000);

  INSERT INTO public.funding_payment_receipts (
    funding_commitment_id, provider, amount_usd, currency, notes
  ) VALUES (
    v_commit, 'wire', 5000, 'USD', '__civizen_funding_p56_selftest__ receipt'
  );

  INSERT INTO public.contributor_profiles (id, display_name, contributor_type, payout_status)
  VALUES (v_contrib, '__civizen_funding_p56_selftest__ Contributor', 'individual', 'eligible');

  INSERT INTO public.contribution_records (
    contributor_id, work_type, verified_points, status, notes
  ) VALUES (
    v_contrib, 'selftest_work', 100, 'verified', '__civizen_funding_p56_selftest__'
  );

  INSERT INTO public.distribution_periods (
    id, label, period_start, period_end, civizen_shared_proceeds_usd,
    investor_share, contributor_share, project_servicing_share, founder_share,
    investor_pool_usd, contributor_pool_usd, project_servicing_pool_usd,
    founder_reserve_usd, mission_reserve_usd, status
  ) VALUES (
    v_period,
    '__civizen_funding_p56_selftest__ Q1',
    CURRENT_DATE - 30,
    CURRENT_DATE,
    10000,
    0.10, 0.70, 0.10, 0.01,
    1000, 7000, 1000, 100, 900,
    'calculated'
  );

  IF (SELECT investor_pool_usd FROM public.distribution_periods WHERE id = v_period) <> 1000 THEN
    RAISE EXCEPTION 'investor pool mismatch';
  END IF;
  IF (SELECT contributor_pool_usd FROM public.distribution_periods WHERE id = v_period) <> 7000 THEN
    RAISE EXCEPTION 'contributor pool mismatch';
  END IF;
  IF (SELECT mission_reserve_usd FROM public.distribution_periods WHERE id = v_period) <> 900 THEN
    RAISE EXCEPTION 'mission residual mismatch';
  END IF;

  INSERT INTO public.funding_payouts (
    distribution_period_id, recipient_type, contributor_id, amount_usd, status, notes
  ) VALUES
    (v_period, 'contributor', v_contrib, 7000, 'approved', '__civizen_funding_p56_selftest__'),
    (v_period, 'investor', NULL, 1000, 'approved', '__civizen_funding_p56_selftest__'),
    (v_period, 'founder', NULL, 100, 'approved', '__civizen_funding_p56_selftest__'),
    (v_period, 'project_servicing', NULL, 1000, 'approved', '__civizen_funding_p56_selftest__'),
    (v_period, 'mission_reserve', NULL, 900, 'approved', '__civizen_funding_p56_selftest__');

  SELECT count(*) INTO v_payouts
  FROM public.funding_payouts
  WHERE distribution_period_id = v_period;

  IF v_payouts <> 5 THEN
    RAISE EXCEPTION 'expected 5 payout rows, got %', v_payouts;
  END IF;

  -- Cleanup
  ALTER TABLE public.funding_ledger_entries DISABLE TRIGGER prevent_funding_ledger_entries_delete;
  DELETE FROM public.funding_payouts WHERE distribution_period_id = v_period;
  DELETE FROM public.distribution_periods WHERE id = v_period;
  DELETE FROM public.contribution_records WHERE contributor_id = v_contrib;
  DELETE FROM public.contributor_profiles WHERE id = v_contrib;
  DELETE FROM public.funding_payment_receipts WHERE funding_commitment_id = v_commit;
  DELETE FROM public.funding_compliance_cases WHERE funder_id = v_funder;
  DELETE FROM public.investor_positions WHERE funding_commitment_id = v_commit;
  DELETE FROM public.funding_ledger_entries WHERE source_id = v_commit;
  DELETE FROM public.funding_commitments WHERE id = v_commit;
  DELETE FROM public.funders WHERE id = v_funder;
  ALTER TABLE public.funding_ledger_entries ENABLE TRIGGER prevent_funding_ledger_entries_delete;

  RAISE NOTICE 'funding_p56_selftest_ok';
END;
$$;
