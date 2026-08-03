-- Funding ledger self-test (run as postgres). Seeds tagged rows, asserts transparency, then cleans up.
-- Marker: legal_name / notes contain __civizen_funding_selftest__

DO $$
DECLARE
  v_funder_donation uuid := gen_random_uuid();
  v_funder_investor uuid := gen_random_uuid();
  v_commit_donation uuid := gen_random_uuid();
  v_commit_investor uuid := gen_random_uuid();
  v_ledger_donation uuid := gen_random_uuid();
  v_ledger_investor uuid := gen_random_uuid();
  v_position uuid := gen_random_uuid();
  v_pub jsonb;
  v_was_published boolean;
  v_missing text;
BEGIN
  -- Object smoke checks
  IF to_regclass('public.funders') IS NULL THEN
    RAISE EXCEPTION 'missing table funders';
  END IF;
  IF to_regclass('public.funding_commitments') IS NULL THEN
    RAISE EXCEPTION 'missing table funding_commitments';
  END IF;
  IF to_regclass('public.funding_ledger_entries') IS NULL THEN
    RAISE EXCEPTION 'missing table funding_ledger_entries';
  END IF;
  IF to_regprocedure('public.get_public_funding_transparency()') IS NULL THEN
    RAISE EXCEPTION 'missing function get_public_funding_transparency';
  END IF;
  IF to_regprocedure('public.convert_funding_interest_to_commitment(uuid, numeric, text, numeric, text, text, text)') IS NULL THEN
    RAISE EXCEPTION 'missing function convert_funding_interest_to_commitment';
  END IF;
  IF to_regprocedure('public.mark_funding_commitment_status(uuid, text, numeric, text, text, date, text)') IS NULL THEN
    RAISE EXCEPTION 'missing function mark_funding_commitment_status';
  END IF;

  SELECT is_published INTO v_was_published FROM public.funding_transparency_publish WHERE id = 1;

  -- Cleanup any prior selftest residue (ledger is append-only)
  ALTER TABLE public.funding_ledger_entries DISABLE TRIGGER prevent_funding_ledger_entries_delete;
  DELETE FROM public.investor_positions
  WHERE funding_commitment_id IN (
    SELECT id FROM public.funding_commitments WHERE notes ILIKE '%__civizen_funding_selftest__%'
  );
  DELETE FROM public.funding_ledger_entries
  WHERE memo ILIKE '%__civizen_funding_selftest__%'
     OR source_id IN (
       SELECT id FROM public.funding_commitments WHERE notes ILIKE '%__civizen_funding_selftest__%'
     );
  DELETE FROM public.funding_commitments WHERE notes ILIKE '%__civizen_funding_selftest__%';
  DELETE FROM public.funders WHERE legal_name ILIKE '%__civizen_funding_selftest__%';
  DELETE FROM public.funding_interest_inquiries WHERE full_name ILIKE '%__civizen_funding_selftest__%';
  ALTER TABLE public.funding_ledger_entries ENABLE TRIGGER prevent_funding_ledger_entries_delete;

  INSERT INTO public.funders (id, legal_name, funder_type, country, kyc_status)
  VALUES
    (v_funder_donation, '__civizen_funding_selftest__ Donor', 'individual', 'US', 'not_started'),
    (v_funder_investor, '__civizen_funding_selftest__ Investor', 'individual', 'US', 'not_started');

  INSERT INTO public.funding_commitments (
    id, funder_id, lane, amount_original, currency, amount_usd, payment_method, status, notes, date_received
  ) VALUES
    (v_commit_donation, v_funder_donation, 'donation', 2500, 'USD', 2500, 'wire', 'received',
     '__civizen_funding_selftest__ donation', CURRENT_DATE),
    (v_commit_investor, v_funder_investor, 'investor', 10000, 'USD', 10000, 'wire', 'received',
     '__civizen_funding_selftest__ investor', CURRENT_DATE);

  INSERT INTO public.funding_ledger_entries (
    id, source_type, source_id, debit_account, credit_account, amount_usd, currency_original, audit_status, memo
  ) VALUES
    (v_ledger_donation, 'funding_commitment', v_commit_donation, 'treasury_clearing', 'lane_donations', 2500, 'USD', 'recorded',
     '__civizen_funding_selftest__'),
    (v_ledger_investor, 'funding_commitment', v_commit_investor, 'treasury_clearing', 'lane_investor_capital', 10000, 'USD', 'recorded',
     '__civizen_funding_selftest__');

  INSERT INTO public.investor_positions (
    id, funder_id, funding_commitment_id, verified_capital_usd, capital_points
  ) VALUES (
    v_position, v_funder_investor, v_commit_investor, 10000, 10000
  );

  UPDATE public.funding_transparency_publish
  SET is_published = true, published_at = now(), updated_at = now()
  WHERE id = 1;

  v_pub := public.get_public_funding_transparency();
  IF (v_pub->>'published')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'expected transparency published=true, got %', v_pub;
  END IF;
  IF (v_pub->'lanes'->>'donation')::numeric < 2500 THEN
    RAISE EXCEPTION 'expected donation >= 2500, got %', v_pub->'lanes'->>'donation';
  END IF;
  IF (v_pub->'lanes'->>'investor')::numeric < 10000 THEN
    RAISE EXCEPTION 'expected investor >= 10000, got %', v_pub->'lanes'->>'investor';
  END IF;
  IF (v_pub->'lanes'->>'founderReserveEstimate')::numeric < 100 THEN
    RAISE EXCEPTION 'expected founderReserveEstimate >= 100, got %',
      v_pub->'lanes'->>'founderReserveEstimate';
  END IF;

  -- Unpublished path
  UPDATE public.funding_transparency_publish
  SET is_published = false, unpublished_at = now(), updated_at = now()
  WHERE id = 1;
  v_pub := public.get_public_funding_transparency();
  IF (v_pub->>'published')::boolean IS TRUE THEN
    RAISE EXCEPTION 'expected unpublished transparency';
  END IF;

  -- Restore prior publish flag
  UPDATE public.funding_transparency_publish
  SET is_published = COALESCE(v_was_published, false), updated_at = now()
  WHERE id = 1;

  -- Cleanup (ledger is append-only — disable delete guard for self-test only)
  ALTER TABLE public.funding_ledger_entries DISABLE TRIGGER prevent_funding_ledger_entries_delete;
  DELETE FROM public.investor_positions WHERE id = v_position;
  DELETE FROM public.funding_ledger_entries WHERE id IN (v_ledger_donation, v_ledger_investor);
  DELETE FROM public.funding_commitments WHERE id IN (v_commit_donation, v_commit_investor);
  DELETE FROM public.funders WHERE id IN (v_funder_donation, v_funder_investor);
  ALTER TABLE public.funding_ledger_entries ENABLE TRIGGER prevent_funding_ledger_entries_delete;

  RAISE NOTICE 'funding_ledger_selftest_ok';
END $$;
