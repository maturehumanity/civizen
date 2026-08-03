-- Phase 3: Internal funding ledger MVP (classify & record capital — not public acceptance rails).
-- Software ledger supports ops/transparency; does not replace legal books or counsel approval.

CREATE OR REPLACE FUNCTION public.can_manage_funding_ledger()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_permission('settings.manage'::public.app_permission)
    OR public.has_permission('role.assign'::public.app_permission)
    OR public.current_profile_in_governance_domain(ARRAY['treasury_finance', 'policy_legal']);
$$;

REVOKE ALL ON FUNCTION public.can_manage_funding_ledger() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_funding_ledger() TO authenticated;

CREATE TABLE IF NOT EXISTS public.funders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL CHECK (char_length(trim(legal_name)) > 0),
  public_display_name text,
  funder_type text NOT NULL
    CHECK (funder_type IN (
      'individual',
      'organization',
      'foundation',
      'government',
      'institution',
      'other'
    )),
  country text,
  email text,
  kyc_status text NOT NULL DEFAULT 'not_started'
    CHECK (kyc_status IN ('not_started', 'pending', 'cleared', 'rejected', 'waived')),
  accredited_investor_status text NOT NULL DEFAULT 'unknown'
    CHECK (accredited_investor_status IN ('unknown', 'yes', 'no', 'not_applicable')),
  sanctions_status text NOT NULL DEFAULT 'not_screened'
    CHECK (sanctions_status IN ('not_screened', 'clear', 'hit', 'under_review')),
  tax_profile_status text NOT NULL DEFAULT 'unknown'
    CHECK (tax_profile_status IN ('unknown', 'complete', 'incomplete', 'not_required')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funders_legal_name_idx ON public.funders (lower(legal_name));
CREATE INDEX IF NOT EXISTS funders_type_created_idx ON public.funders (funder_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.funding_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funder_id uuid NOT NULL REFERENCES public.funders(id) ON DELETE RESTRICT,
  lane text NOT NULL
    CHECK (lane IN (
      'investor',
      'donation',
      'grant',
      'government',
      'commercial',
      'sponsorship',
      'other'
    )),
  amount_original numeric(18, 2) NOT NULL CHECK (amount_original > 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (char_length(trim(currency)) BETWEEN 3 AND 12),
  amount_usd numeric(18, 2) CHECK (amount_usd IS NULL OR amount_usd >= 0),
  payment_method text
    CHECK (payment_method IS NULL OR payment_method IN (
      'wire',
      'ach',
      'card',
      'check',
      'usdt',
      'other_crypto',
      'in_kind',
      'other'
    )),
  status text NOT NULL DEFAULT 'pledged'
    CHECK (status IN ('pledged', 'received', 'partially_received', 'refunded', 'cancelled')),
  restrictions text,
  restriction_code text,
  agreement_id text,
  receipt_id text,
  date_pledged date,
  date_received date,
  interest_inquiry_id uuid REFERENCES public.funding_interest_inquiries(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT funding_commitments_restricted_lane_has_code CHECK (
    lane NOT IN ('grant', 'government')
    OR (
      (restriction_code IS NOT NULL AND char_length(trim(restriction_code)) > 0)
      OR (restrictions IS NOT NULL AND char_length(trim(restrictions)) > 0)
    )
  )
);

CREATE INDEX IF NOT EXISTS funding_commitments_lane_status_idx
  ON public.funding_commitments (lane, status, created_at DESC);
CREATE INDEX IF NOT EXISTS funding_commitments_funder_idx
  ON public.funding_commitments (funder_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.funding_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL
    CHECK (source_type IN ('funding_commitment', 'adjustment', 'refund', 'allocation', 'other')),
  source_id uuid NOT NULL,
  debit_account text NOT NULL,
  credit_account text NOT NULL,
  amount_usd numeric(18, 2) NOT NULL CHECK (amount_usd > 0),
  currency_original text,
  transaction_hash text,
  bank_reference text,
  restriction_code text,
  audit_status text NOT NULL DEFAULT 'recorded'
    CHECK (audit_status IN ('recorded', 'reconciled', 'disputed', 'void_marked')),
  memo text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funding_ledger_entries_source_idx
  ON public.funding_ledger_entries (source_type, source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS funding_ledger_entries_created_idx
  ON public.funding_ledger_entries (created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_funding_ledger_entries_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'funding_ledger_entries is append-only';
END;
$$;

DROP TRIGGER IF EXISTS prevent_funding_ledger_entries_update ON public.funding_ledger_entries;
CREATE TRIGGER prevent_funding_ledger_entries_update
  BEFORE UPDATE ON public.funding_ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_funding_ledger_entries_mutation();

DROP TRIGGER IF EXISTS prevent_funding_ledger_entries_delete ON public.funding_ledger_entries;
CREATE TRIGGER prevent_funding_ledger_entries_delete
  BEFORE DELETE ON public.funding_ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_funding_ledger_entries_mutation();

CREATE TABLE IF NOT EXISTS public.investor_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funder_id uuid NOT NULL REFERENCES public.funders(id) ON DELETE RESTRICT,
  funding_commitment_id uuid NOT NULL UNIQUE REFERENCES public.funding_commitments(id) ON DELETE RESTRICT,
  verified_capital_usd numeric(18, 2) NOT NULL CHECK (verified_capital_usd > 0),
  capital_points numeric(18, 2) NOT NULL CHECK (capital_points > 0),
  round_id text,
  legal_instrument_id text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS investor_positions_funder_idx
  ON public.investor_positions (funder_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.funding_ledger_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funding_ledger_audit_events_entity_idx
  ON public.funding_ledger_audit_events (entity_type, entity_id, created_at DESC);

ALTER TABLE public.funders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_ledger_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Treasury can manage funders" ON public.funders;
CREATE POLICY "Treasury can manage funders" ON public.funders
  FOR ALL TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

DROP POLICY IF EXISTS "Treasury can manage funding commitments" ON public.funding_commitments;
CREATE POLICY "Treasury can manage funding commitments" ON public.funding_commitments
  FOR ALL TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

DROP POLICY IF EXISTS "Treasury can read funding ledger entries" ON public.funding_ledger_entries;
CREATE POLICY "Treasury can read funding ledger entries" ON public.funding_ledger_entries
  FOR SELECT TO authenticated
  USING (public.can_manage_funding_ledger());

DROP POLICY IF EXISTS "Treasury can insert funding ledger entries" ON public.funding_ledger_entries;
CREATE POLICY "Treasury can insert funding ledger entries" ON public.funding_ledger_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_funding_ledger());

DROP POLICY IF EXISTS "Treasury can manage investor positions" ON public.investor_positions;
CREATE POLICY "Treasury can manage investor positions" ON public.investor_positions
  FOR ALL TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

DROP POLICY IF EXISTS "Treasury can read funding audit events" ON public.funding_ledger_audit_events;
CREATE POLICY "Treasury can read funding audit events" ON public.funding_ledger_audit_events
  FOR SELECT TO authenticated
  USING (public.can_manage_funding_ledger());

DROP POLICY IF EXISTS "Treasury can insert funding audit events" ON public.funding_ledger_audit_events;
CREATE POLICY "Treasury can insert funding audit events" ON public.funding_ledger_audit_events
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_funding_ledger());

GRANT SELECT, INSERT, UPDATE ON public.funders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.funding_commitments TO authenticated;
GRANT SELECT, INSERT ON public.funding_ledger_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.investor_positions TO authenticated;
GRANT SELECT, INSERT ON public.funding_ledger_audit_events TO authenticated;

CREATE OR REPLACE FUNCTION public.funding_lane_credit_account(p_lane text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_lane
    WHEN 'investor' THEN 'lane_investor_capital'
    WHEN 'donation' THEN 'lane_donations'
    WHEN 'grant' THEN 'lane_grants_restricted'
    WHEN 'government' THEN 'lane_government_restricted'
    WHEN 'commercial' THEN 'lane_commercial_revenue'
    WHEN 'sponsorship' THEN 'lane_sponsorships'
    ELSE 'lane_other'
  END;
$$;

CREATE OR REPLACE FUNCTION public.record_funding_commitment(
  p_legal_name text,
  p_funder_type text,
  p_lane text,
  p_amount_original numeric,
  p_currency text DEFAULT 'USD',
  p_amount_usd numeric DEFAULT NULL,
  p_public_display_name text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_status text DEFAULT 'pledged',
  p_restrictions text DEFAULT NULL,
  p_restriction_code text DEFAULT NULL,
  p_agreement_id text DEFAULT NULL,
  p_receipt_id text DEFAULT NULL,
  p_date_pledged date DEFAULT NULL,
  p_date_received date DEFAULT NULL,
  p_bank_reference text DEFAULT NULL,
  p_transaction_hash text DEFAULT NULL,
  p_kyc_status text DEFAULT 'not_started',
  p_accredited_investor_status text DEFAULT 'unknown',
  p_sanctions_status text DEFAULT 'not_screened',
  p_tax_profile_status text DEFAULT 'unknown',
  p_debit_account text DEFAULT 'treasury_clearing',
  p_notes text DEFAULT NULL,
  p_existing_funder_id uuid DEFAULT NULL,
  p_interest_inquiry_id uuid DEFAULT NULL,
  p_round_id text DEFAULT NULL,
  p_legal_instrument_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_funder_id uuid;
  v_commitment_id uuid := gen_random_uuid();
  v_ledger_id uuid := NULL;
  v_position_id uuid := NULL;
  v_amount_usd numeric(18, 2);
  v_credit_account text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_manage_funding_ledger() THEN
    RAISE EXCEPTION 'forbidden_funding_ledger' USING ERRCODE = '42501';
  END IF;

  IF p_legal_name IS NULL OR char_length(trim(p_legal_name)) = 0 THEN
    RAISE EXCEPTION 'legal_name_required' USING ERRCODE = '22023';
  END IF;
  IF p_amount_original IS NULL OR p_amount_original <= 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;

  v_amount_usd := COALESCE(p_amount_usd, CASE WHEN upper(trim(p_currency)) = 'USD' THEN p_amount_original ELSE NULL END);
  IF p_status IN ('received', 'partially_received') AND (v_amount_usd IS NULL OR v_amount_usd <= 0) THEN
    RAISE EXCEPTION 'amount_usd_required_when_received' USING ERRCODE = '22023';
  END IF;

  IF p_existing_funder_id IS NOT NULL THEN
    SELECT id INTO v_funder_id FROM public.funders WHERE id = p_existing_funder_id;
    IF v_funder_id IS NULL THEN
      RAISE EXCEPTION 'funder_not_found' USING ERRCODE = '22023';
    END IF;
    UPDATE public.funders SET
      legal_name = trim(p_legal_name),
      public_display_name = NULLIF(trim(COALESCE(p_public_display_name, '')), ''),
      funder_type = p_funder_type,
      country = NULLIF(trim(COALESCE(p_country, '')), ''),
      email = NULLIF(trim(COALESCE(p_email, '')), ''),
      kyc_status = COALESCE(p_kyc_status, kyc_status),
      accredited_investor_status = COALESCE(p_accredited_investor_status, accredited_investor_status),
      sanctions_status = COALESCE(p_sanctions_status, sanctions_status),
      tax_profile_status = COALESCE(p_tax_profile_status, tax_profile_status),
      updated_at = now()
    WHERE id = v_funder_id;
  ELSE
    INSERT INTO public.funders (
      legal_name,
      public_display_name,
      funder_type,
      country,
      email,
      kyc_status,
      accredited_investor_status,
      sanctions_status,
      tax_profile_status,
      notes,
      created_by
    ) VALUES (
      trim(p_legal_name),
      NULLIF(trim(COALESCE(p_public_display_name, '')), ''),
      p_funder_type,
      NULLIF(trim(COALESCE(p_country, '')), ''),
      NULLIF(trim(COALESCE(p_email, '')), ''),
      COALESCE(p_kyc_status, 'not_started'),
      COALESCE(p_accredited_investor_status, 'unknown'),
      COALESCE(p_sanctions_status, 'not_screened'),
      COALESCE(p_tax_profile_status, 'unknown'),
      NULLIF(trim(COALESCE(p_notes, '')), ''),
      v_uid
    )
    RETURNING id INTO v_funder_id;
  END IF;

  INSERT INTO public.funding_commitments (
    id,
    funder_id,
    lane,
    amount_original,
    currency,
    amount_usd,
    payment_method,
    status,
    restrictions,
    restriction_code,
    agreement_id,
    receipt_id,
    date_pledged,
    date_received,
    interest_inquiry_id,
    notes,
    created_by
  ) VALUES (
    v_commitment_id,
    v_funder_id,
    p_lane,
    p_amount_original,
    upper(trim(COALESCE(p_currency, 'USD'))),
    v_amount_usd,
    p_payment_method,
    COALESCE(p_status, 'pledged'),
    NULLIF(trim(COALESCE(p_restrictions, '')), ''),
    NULLIF(trim(COALESCE(p_restriction_code, '')), ''),
    NULLIF(trim(COALESCE(p_agreement_id, '')), ''),
    NULLIF(trim(COALESCE(p_receipt_id, '')), ''),
    p_date_pledged,
    p_date_received,
    p_interest_inquiry_id,
    NULLIF(trim(COALESCE(p_notes, '')), ''),
    v_uid
  );

  IF COALESCE(p_status, 'pledged') IN ('received', 'partially_received') THEN
    v_credit_account := public.funding_lane_credit_account(p_lane);
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
      v_commitment_id,
      COALESCE(NULLIF(trim(p_debit_account), ''), 'treasury_clearing'),
      v_credit_account,
      v_amount_usd,
      upper(trim(COALESCE(p_currency, 'USD'))),
      NULLIF(trim(COALESCE(p_transaction_hash, '')), ''),
      NULLIF(trim(COALESCE(p_bank_reference, '')), ''),
      NULLIF(trim(COALESCE(p_restriction_code, '')), ''),
      'recorded',
      left(concat('Commitment ', v_commitment_id::text, ' recorded as ', p_status), 500),
      v_uid
    );
  END IF;

  IF p_lane = 'investor' AND COALESCE(p_status, 'pledged') = 'received' THEN
    v_position_id := gen_random_uuid();
    INSERT INTO public.investor_positions (
      id,
      funder_id,
      funding_commitment_id,
      verified_capital_usd,
      capital_points,
      round_id,
      legal_instrument_id,
      created_by
    ) VALUES (
      v_position_id,
      v_funder_id,
      v_commitment_id,
      v_amount_usd,
      v_amount_usd,
      NULLIF(trim(COALESCE(p_round_id, '')), ''),
      NULLIF(trim(COALESCE(p_legal_instrument_id, '')), ''),
      v_uid
    );
  END IF;

  INSERT INTO public.funding_ledger_audit_events (
    event_type,
    entity_type,
    entity_id,
    payload,
    actor_user_id
  ) VALUES (
    'commitment_recorded',
    'funding_commitment',
    v_commitment_id,
    jsonb_build_object(
      'funder_id', v_funder_id,
      'lane', p_lane,
      'status', COALESCE(p_status, 'pledged'),
      'amount_usd', v_amount_usd,
      'ledger_entry_id', v_ledger_id,
      'investor_position_id', v_position_id
    ),
    v_uid
  );

  RETURN jsonb_build_object(
    'funder_id', v_funder_id,
    'commitment_id', v_commitment_id,
    'ledger_entry_id', v_ledger_id,
    'investor_position_id', v_position_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_funding_commitment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_funding_commitment TO authenticated;

DROP VIEW IF EXISTS public.funding_lane_totals;
CREATE VIEW public.funding_lane_totals
WITH (security_invoker = true)
AS
SELECT
  lane,
  status,
  count(*)::bigint AS commitment_count,
  coalesce(sum(amount_usd), 0)::numeric(18, 2) AS total_amount_usd
FROM public.funding_commitments
GROUP BY lane, status;

GRANT SELECT ON public.funding_lane_totals TO authenticated;

COMMENT ON TABLE public.funders IS 'Legal/public funder identities for Levela funding ledger.';
COMMENT ON TABLE public.funding_commitments IS 'Classified funding pledges and receipts by lane.';
COMMENT ON TABLE public.funding_ledger_entries IS 'Append-only USD funding ledger movements.';
COMMENT ON TABLE public.investor_positions IS 'Verified investor capital positions for proportional LSP participation.';
COMMENT ON FUNCTION public.record_funding_commitment IS 'Treasury-only transactional recording of funder + commitment (+ ledger/position when received).';
