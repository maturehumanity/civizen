-- Phase 4 completion: mark commitment status (received → ledger/position) + audit list support.

CREATE OR REPLACE FUNCTION public.mark_funding_commitment_status(
  p_commitment_id uuid,
  p_status text,
  p_amount_usd numeric DEFAULT NULL,
  p_bank_reference text DEFAULT NULL,
  p_transaction_hash text DEFAULT NULL,
  p_date_received date DEFAULT NULL,
  p_debit_account text DEFAULT 'treasury_clearing'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_c public.funding_commitments%ROWTYPE;
  v_amount_usd numeric(18, 2);
  v_ledger_id uuid := NULL;
  v_position_id uuid := NULL;
  v_existing_ledger uuid;
  v_existing_position uuid;
  v_credit_account text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_manage_funding_ledger() THEN
    RAISE EXCEPTION 'forbidden_funding_ledger' USING ERRCODE = '42501';
  END IF;

  IF p_status IS NULL OR p_status NOT IN (
    'pledged', 'received', 'partially_received', 'refunded', 'cancelled'
  ) THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_c
  FROM public.funding_commitments
  WHERE id = p_commitment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'commitment_not_found' USING ERRCODE = '22023';
  END IF;

  v_amount_usd := COALESCE(p_amount_usd, v_c.amount_usd);
  IF p_status IN ('received', 'partially_received') THEN
    IF v_amount_usd IS NULL OR v_amount_usd <= 0 THEN
      IF upper(v_c.currency) = 'USD' THEN
        v_amount_usd := v_c.amount_original;
      ELSE
        RAISE EXCEPTION 'amount_usd_required_when_received' USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;

  UPDATE public.funding_commitments
  SET
    status = p_status,
    amount_usd = COALESCE(v_amount_usd, amount_usd),
    date_received = CASE
      WHEN p_status IN ('received', 'partially_received')
        THEN COALESCE(p_date_received, date_received, CURRENT_DATE)
      ELSE date_received
    END,
    updated_at = now()
  WHERE id = p_commitment_id
  RETURNING * INTO v_c;

  IF p_status IN ('received', 'partially_received') THEN
    SELECT id INTO v_existing_ledger
    FROM public.funding_ledger_entries
    WHERE source_type = 'funding_commitment'
      AND source_id = p_commitment_id
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_existing_ledger IS NULL THEN
      v_credit_account := public.funding_lane_credit_account(v_c.lane);
      v_ledger_id := gen_random_uuid();
      INSERT INTO public.funding_ledger_entries (
        id,
        source_type,
        source_id,
        debit_account,
        credit_account,
        amount_usd,
        currency_original,
        transaction_hash,
        bank_reference,
        restriction_code,
        audit_status,
        memo,
        created_by
      ) VALUES (
        v_ledger_id,
        'funding_commitment',
        p_commitment_id,
        COALESCE(NULLIF(trim(p_debit_account), ''), 'treasury_clearing'),
        v_credit_account,
        v_amount_usd,
        v_c.currency,
        NULLIF(trim(COALESCE(p_transaction_hash, '')), ''),
        NULLIF(trim(COALESCE(p_bank_reference, '')), ''),
        v_c.restriction_code,
        'recorded',
        left(concat('Commitment ', p_commitment_id::text, ' marked ', p_status), 500),
        v_uid
      );
    ELSE
      v_ledger_id := v_existing_ledger;
    END IF;

    IF v_c.lane = 'investor' AND p_status = 'received' THEN
      SELECT id INTO v_existing_position
      FROM public.investor_positions
      WHERE funding_commitment_id = p_commitment_id
      LIMIT 1;

      IF v_existing_position IS NULL THEN
        v_position_id := gen_random_uuid();
        INSERT INTO public.investor_positions (
          id,
          funder_id,
          funding_commitment_id,
          verified_capital_usd,
          capital_points,
          created_by
        ) VALUES (
          v_position_id,
          v_c.funder_id,
          p_commitment_id,
          v_amount_usd,
          v_amount_usd,
          v_uid
        );
      ELSE
        v_position_id := v_existing_position;
        UPDATE public.investor_positions
        SET
          verified_capital_usd = v_amount_usd,
          capital_points = v_amount_usd
        WHERE id = v_position_id;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.funding_ledger_audit_events (
    event_type,
    entity_type,
    entity_id,
    payload,
    actor_user_id
  ) VALUES (
    'commitment_status_changed',
    'funding_commitment',
    p_commitment_id,
    jsonb_build_object(
      'status', p_status,
      'amount_usd', v_amount_usd,
      'ledger_entry_id', v_ledger_id,
      'investor_position_id', v_position_id
    ),
    v_uid
  );

  RETURN jsonb_build_object(
    'commitment_id', p_commitment_id,
    'status', p_status,
    'amount_usd', v_amount_usd,
    'ledger_entry_id', v_ledger_id,
    'investor_position_id', v_position_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_funding_commitment_status FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_funding_commitment_status TO authenticated;

COMMENT ON FUNCTION public.mark_funding_commitment_status IS
  'Treasury-only: update commitment status; creates ledger/investor position when marking received.';
