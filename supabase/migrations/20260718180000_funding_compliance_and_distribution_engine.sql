-- Phase 5 compliance scaffolding + Phase 6 distribution engine MVP.
-- No external KYC/payment provider keys required; ops can run manually until counsel approves live rails.

-- ---------------------------------------------------------------------------
-- Phase 5: compliance cases + payment receipts (manual)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.funding_compliance_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funder_id uuid REFERENCES public.funders(id) ON DELETE CASCADE,
  funding_commitment_id uuid REFERENCES public.funding_commitments(id) ON DELETE SET NULL,
  case_type text NOT NULL
    CHECK (case_type IN (
      'kyc',
      'kyb',
      'sanctions',
      'source_of_funds',
      'tax_docs',
      'restricted_funds',
      'other'
    )),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_review', 'cleared', 'blocked', 'waived')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  summary text NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funding_compliance_cases_status_idx
  ON public.funding_compliance_cases (status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS funding_compliance_cases_funder_idx
  ON public.funding_compliance_cases (funder_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.funding_payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funding_commitment_id uuid NOT NULL REFERENCES public.funding_commitments(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'manual'
    CHECK (provider IN ('manual', 'wire', 'ach', 'card_processor', 'crypto_custodian', 'other')),
  external_reference text,
  amount_usd numeric(18, 2) NOT NULL CHECK (amount_usd > 0),
  currency text NOT NULL DEFAULT 'USD',
  received_at date NOT NULL DEFAULT CURRENT_DATE,
  reconciliation_status text NOT NULL DEFAULT 'unreconciled'
    CHECK (reconciliation_status IN ('unreconciled', 'matched', 'disputed', 'void')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funding_payment_receipts_commitment_idx
  ON public.funding_payment_receipts (funding_commitment_id, created_at DESC);

ALTER TABLE public.funding_compliance_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_payment_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Treasury manage compliance cases" ON public.funding_compliance_cases;
CREATE POLICY "Treasury manage compliance cases" ON public.funding_compliance_cases
  FOR ALL TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

DROP POLICY IF EXISTS "Treasury manage payment receipts" ON public.funding_payment_receipts;
CREATE POLICY "Treasury manage payment receipts" ON public.funding_payment_receipts
  FOR ALL TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

GRANT SELECT, INSERT, UPDATE ON public.funding_compliance_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.funding_payment_receipts TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_funding_compliance_case(
  p_case_type text,
  p_summary text,
  p_funder_id uuid DEFAULT NULL,
  p_funding_commitment_id uuid DEFAULT NULL,
  p_status text DEFAULT 'open',
  p_priority text DEFAULT 'normal',
  p_notes text DEFAULT NULL,
  p_case_id uuid DEFAULT NULL
)
RETURNS public.funding_compliance_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.funding_compliance_cases%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_manage_funding_ledger() THEN
    RAISE EXCEPTION 'forbidden_funding_ledger' USING ERRCODE = '42501';
  END IF;
  IF p_summary IS NULL OR char_length(trim(p_summary)) = 0 THEN
    RAISE EXCEPTION 'summary_required' USING ERRCODE = '22023';
  END IF;

  IF p_case_id IS NOT NULL THEN
    UPDATE public.funding_compliance_cases
    SET
      case_type = COALESCE(p_case_type, case_type),
      summary = trim(p_summary),
      status = COALESCE(p_status, status),
      priority = COALESCE(p_priority, priority),
      notes = NULLIF(trim(COALESCE(p_notes, '')), ''),
      funder_id = COALESCE(p_funder_id, funder_id),
      funding_commitment_id = COALESCE(p_funding_commitment_id, funding_commitment_id),
      resolved_by = CASE
        WHEN COALESCE(p_status, status) IN ('cleared', 'blocked', 'waived') THEN v_uid
        ELSE resolved_by
      END,
      resolved_at = CASE
        WHEN COALESCE(p_status, status) IN ('cleared', 'blocked', 'waived') THEN now()
        ELSE resolved_at
      END,
      updated_at = now()
    WHERE id = p_case_id
    RETURNING * INTO v_row;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'case_not_found' USING ERRCODE = '22023';
    END IF;
  ELSE
    INSERT INTO public.funding_compliance_cases (
      funder_id,
      funding_commitment_id,
      case_type,
      status,
      priority,
      summary,
      notes,
      created_by
    ) VALUES (
      p_funder_id,
      p_funding_commitment_id,
      p_case_type,
      COALESCE(p_status, 'open'),
      COALESCE(p_priority, 'normal'),
      trim(p_summary),
      NULLIF(trim(COALESCE(p_notes, '')), ''),
      v_uid
    )
    RETURNING * INTO v_row;
  END IF;

  INSERT INTO public.funding_ledger_audit_events (
    event_type, entity_type, entity_id, payload, actor_user_id
  ) VALUES (
    'compliance_case_upserted',
    'funding_compliance_case',
    v_row.id,
    jsonb_build_object(
      'status', v_row.status,
      'case_type', v_row.case_type,
      'funder_id', v_row.funder_id,
      'funding_commitment_id', v_row.funding_commitment_id
    ),
    v_uid
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_funding_compliance_case FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_funding_compliance_case TO authenticated;

CREATE OR REPLACE FUNCTION public.record_funding_payment_receipt(
  p_funding_commitment_id uuid,
  p_amount_usd numeric,
  p_provider text DEFAULT 'manual',
  p_external_reference text DEFAULT NULL,
  p_currency text DEFAULT 'USD',
  p_received_at date DEFAULT CURRENT_DATE,
  p_notes text DEFAULT NULL,
  p_mark_commitment_received boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_receipt_id uuid := gen_random_uuid();
  v_mark jsonb := NULL;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_manage_funding_ledger() THEN
    RAISE EXCEPTION 'forbidden_funding_ledger' USING ERRCODE = '42501';
  END IF;
  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.funding_payment_receipts (
    id,
    funding_commitment_id,
    provider,
    external_reference,
    amount_usd,
    currency,
    received_at,
    notes,
    created_by
  ) VALUES (
    v_receipt_id,
    p_funding_commitment_id,
    COALESCE(p_provider, 'manual'),
    NULLIF(trim(COALESCE(p_external_reference, '')), ''),
    p_amount_usd,
    upper(trim(COALESCE(p_currency, 'USD'))),
    COALESCE(p_received_at, CURRENT_DATE),
    NULLIF(trim(COALESCE(p_notes, '')), ''),
    v_uid
  );

  IF p_mark_commitment_received THEN
    v_mark := public.mark_funding_commitment_status(
      p_commitment_id := p_funding_commitment_id,
      p_status := 'received',
      p_amount_usd := p_amount_usd,
      p_bank_reference := NULLIF(trim(COALESCE(p_external_reference, '')), ''),
      p_date_received := COALESCE(p_received_at, CURRENT_DATE)
    );
  END IF;

  INSERT INTO public.funding_ledger_audit_events (
    event_type, entity_type, entity_id, payload, actor_user_id
  ) VALUES (
    'payment_receipt_recorded',
    'funding_payment_receipt',
    v_receipt_id,
    jsonb_build_object(
      'funding_commitment_id', p_funding_commitment_id,
      'amount_usd', p_amount_usd,
      'provider', COALESCE(p_provider, 'manual'),
      'marked_received', p_mark_commitment_received,
      'mark_result', v_mark
    ),
    v_uid
  );

  RETURN jsonb_build_object(
    'receipt_id', v_receipt_id,
    'mark_result', v_mark
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_funding_payment_receipt FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_funding_payment_receipt TO authenticated;

-- Harden mark-received against open sanctions blocks / blocked compliance cases
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
  v_funder public.funders%ROWTYPE;
  v_amount_usd numeric(18, 2);
  v_ledger_id uuid := NULL;
  v_position_id uuid := NULL;
  v_existing_ledger uuid;
  v_existing_position uuid;
  v_credit_account text;
  v_blocked_cases int;
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

  SELECT * INTO v_funder FROM public.funders WHERE id = v_c.funder_id;

  IF p_status IN ('received', 'partially_received') THEN
    IF v_funder.sanctions_status = 'hit' THEN
      RAISE EXCEPTION 'sanctions_hit_blocks_receipt' USING ERRCODE = '42501';
    END IF;
    SELECT count(*) INTO v_blocked_cases
    FROM public.funding_compliance_cases
    WHERE status = 'blocked'
      AND (
        funder_id = v_c.funder_id
        OR funding_commitment_id = p_commitment_id
      );
    IF v_blocked_cases > 0 THEN
      RAISE EXCEPTION 'compliance_blocked' USING ERRCODE = '42501';
    END IF;
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
        id, source_type, source_id, debit_account, credit_account, amount_usd,
        currency_original, transaction_hash, bank_reference, restriction_code,
        audit_status, memo, created_by
      ) VALUES (
        v_ledger_id, 'funding_commitment', p_commitment_id,
        COALESCE(NULLIF(trim(p_debit_account), ''), 'treasury_clearing'),
        v_credit_account, v_amount_usd, v_c.currency,
        NULLIF(trim(COALESCE(p_transaction_hash, '')), ''),
        NULLIF(trim(COALESCE(p_bank_reference, '')), ''),
        v_c.restriction_code, 'recorded',
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
          id, funder_id, funding_commitment_id, verified_capital_usd, capital_points, created_by
        ) VALUES (
          v_position_id, v_c.funder_id, p_commitment_id, v_amount_usd, v_amount_usd, v_uid
        );
      ELSE
        v_position_id := v_existing_position;
        UPDATE public.investor_positions
        SET verified_capital_usd = v_amount_usd, capital_points = v_amount_usd
        WHERE id = v_position_id;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.funding_ledger_audit_events (
    event_type, entity_type, entity_id, payload, actor_user_id
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

-- ---------------------------------------------------------------------------
-- Phase 6: contributor records + distribution periods + payouts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contributor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  contributor_type text NOT NULL DEFAULT 'individual'
    CHECK (contributor_type IN ('individual', 'organization', 'other')),
  tax_status text NOT NULL DEFAULT 'unknown'
    CHECK (tax_status IN ('unknown', 'complete', 'incomplete', 'not_required')),
  payout_status text NOT NULL DEFAULT 'inactive'
    CHECK (payout_status IN ('inactive', 'eligible', 'hold', 'closed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contribution_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id uuid NOT NULL REFERENCES public.contributor_profiles(id) ON DELETE CASCADE,
  work_type text NOT NULL,
  evidence_url text,
  quality_score numeric(8, 2),
  impact_score numeric(8, 2),
  verified_points numeric(18, 2) NOT NULL DEFAULT 0 CHECK (verified_points >= 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'rejected', 'disputed')),
  reviewer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contribution_records_contributor_idx
  ON public.contribution_records (contributor_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.distribution_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  levela_shared_proceeds_usd numeric(18, 2) NOT NULL CHECK (levela_shared_proceeds_usd >= 0),
  investor_share numeric(8, 6) NOT NULL DEFAULT 0.10,
  contributor_share numeric(8, 6) NOT NULL DEFAULT 0.70,
  project_servicing_share numeric(8, 6) NOT NULL DEFAULT 0.10,
  founder_share numeric(8, 6) NOT NULL DEFAULT 0.01,
  investor_pool_usd numeric(18, 2) NOT NULL DEFAULT 0,
  contributor_pool_usd numeric(18, 2) NOT NULL DEFAULT 0,
  project_servicing_pool_usd numeric(18, 2) NOT NULL DEFAULT 0,
  founder_reserve_usd numeric(18, 2) NOT NULL DEFAULT 0,
  mission_reserve_usd numeric(18, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'calculated', 'approved', 'paid', 'cancelled')),
  notes text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT distribution_periods_range CHECK (period_end >= period_start),
  CONSTRAINT distribution_periods_investor_share CHECK (investor_share = 0.10),
  CONSTRAINT distribution_periods_founder_share CHECK (founder_share = 0.01),
  CONSTRAINT distribution_periods_contributor_cap CHECK (contributor_share >= 0 AND contributor_share <= 0.70),
  CONSTRAINT distribution_periods_servicing_cap CHECK (project_servicing_share >= 0 AND project_servicing_share <= 0.10)
);

CREATE TABLE IF NOT EXISTS public.funding_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_period_id uuid NOT NULL REFERENCES public.distribution_periods(id) ON DELETE CASCADE,
  recipient_type text NOT NULL
    CHECK (recipient_type IN ('investor', 'contributor', 'founder', 'project_servicing', 'mission_reserve')),
  recipient_id uuid,
  funder_id uuid REFERENCES public.funders(id) ON DELETE SET NULL,
  contributor_id uuid REFERENCES public.contributor_profiles(id) ON DELETE SET NULL,
  amount_usd numeric(18, 2) NOT NULL CHECK (amount_usd >= 0),
  payment_method text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  tax_document_status text NOT NULL DEFAULT 'unknown'
    CHECK (tax_document_status IN ('unknown', 'complete', 'incomplete', 'not_required')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funding_payouts_period_idx
  ON public.funding_payouts (distribution_period_id, recipient_type, status);

ALTER TABLE public.contributor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funding_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Treasury manage contributor profiles" ON public.contributor_profiles;
CREATE POLICY "Treasury manage contributor profiles" ON public.contributor_profiles
  FOR ALL TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

DROP POLICY IF EXISTS "Treasury manage contribution records" ON public.contribution_records;
CREATE POLICY "Treasury manage contribution records" ON public.contribution_records
  FOR ALL TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

DROP POLICY IF EXISTS "Treasury manage distribution periods" ON public.distribution_periods;
CREATE POLICY "Treasury manage distribution periods" ON public.distribution_periods
  FOR ALL TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

DROP POLICY IF EXISTS "Treasury manage funding payouts" ON public.funding_payouts;
CREATE POLICY "Treasury manage funding payouts" ON public.funding_payouts
  FOR ALL TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

GRANT SELECT, INSERT, UPDATE ON public.contributor_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contribution_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.distribution_periods TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.funding_payouts TO authenticated;

CREATE OR REPLACE FUNCTION public.create_distribution_period(
  p_label text,
  p_period_start date,
  p_period_end date,
  p_levela_shared_proceeds_usd numeric,
  p_contributor_share numeric DEFAULT 0.70,
  p_project_servicing_share numeric DEFAULT 0.10,
  p_notes text DEFAULT NULL
)
RETURNS public.distribution_periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.distribution_periods%ROWTYPE;
  v_investor numeric(18, 2);
  v_contributor numeric(18, 2);
  v_servicing numeric(18, 2);
  v_founder numeric(18, 2);
  v_mission numeric(18, 2);
  v_lsp numeric(18, 2);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_manage_funding_ledger() THEN
    RAISE EXCEPTION 'forbidden_funding_ledger' USING ERRCODE = '42501';
  END IF;
  IF p_label IS NULL OR char_length(trim(p_label)) = 0 THEN
    RAISE EXCEPTION 'label_required' USING ERRCODE = '22023';
  END IF;
  IF p_levela_shared_proceeds_usd IS NULL OR p_levela_shared_proceeds_usd < 0 THEN
    RAISE EXCEPTION 'invalid_lsp' USING ERRCODE = '22023';
  END IF;
  IF p_contributor_share IS NULL OR p_contributor_share < 0 OR p_contributor_share > 0.70 THEN
    RAISE EXCEPTION 'invalid_contributor_share' USING ERRCODE = '22023';
  END IF;
  IF p_project_servicing_share IS NULL OR p_project_servicing_share < 0 OR p_project_servicing_share > 0.10 THEN
    RAISE EXCEPTION 'invalid_servicing_share' USING ERRCODE = '22023';
  END IF;

  v_lsp := p_levela_shared_proceeds_usd;
  v_investor := round(v_lsp * 0.10, 2);
  v_contributor := round(v_lsp * p_contributor_share, 2);
  v_servicing := round(v_lsp * p_project_servicing_share, 2);
  v_founder := round(v_lsp * 0.01, 2);
  v_mission := round(v_lsp - v_investor - v_contributor - v_servicing - v_founder, 2);

  INSERT INTO public.distribution_periods (
    label, period_start, period_end, levela_shared_proceeds_usd,
    investor_share, contributor_share, project_servicing_share, founder_share,
    investor_pool_usd, contributor_pool_usd, project_servicing_pool_usd,
    founder_reserve_usd, mission_reserve_usd, status, notes, created_by
  ) VALUES (
    trim(p_label), p_period_start, p_period_end, v_lsp,
    0.10, p_contributor_share, p_project_servicing_share, 0.01,
    v_investor, v_contributor, v_servicing, v_founder, v_mission,
    'calculated', NULLIF(trim(COALESCE(p_notes, '')), ''), v_uid
  )
  RETURNING * INTO v_row;

  INSERT INTO public.funding_ledger_audit_events (
    event_type, entity_type, entity_id, payload, actor_user_id
  ) VALUES (
    'distribution_period_created',
    'distribution_period',
    v_row.id,
    jsonb_build_object(
      'label', v_row.label,
      'lsp', v_lsp,
      'investor_pool_usd', v_investor,
      'contributor_pool_usd', v_contributor
    ),
    v_uid
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_distribution_period FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_distribution_period TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_distribution_period(p_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_period public.distribution_periods%ROWTYPE;
  v_total_capital numeric(18, 2);
  v_pos record;
  v_payout_count int := 0;
  v_contrib_total numeric(18, 2);
  v_contrib record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_manage_funding_ledger() THEN
    RAISE EXCEPTION 'forbidden_funding_ledger' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_period
  FROM public.distribution_periods
  WHERE id = p_period_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'period_not_found' USING ERRCODE = '22023';
  END IF;
  IF v_period.status NOT IN ('draft', 'calculated') THEN
    RAISE EXCEPTION 'period_not_approvable' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.funding_payouts WHERE distribution_period_id = p_period_id;

  SELECT coalesce(sum(verified_capital_usd), 0) INTO v_total_capital FROM public.investor_positions;

  IF v_period.investor_pool_usd > 0 AND v_total_capital > 0 THEN
    FOR v_pos IN
      SELECT id, funder_id, verified_capital_usd FROM public.investor_positions
    LOOP
      INSERT INTO public.funding_payouts (
        distribution_period_id, recipient_type, recipient_id, funder_id,
        amount_usd, status, notes
      ) VALUES (
        p_period_id, 'investor', v_pos.id, v_pos.funder_id,
        round(v_period.investor_pool_usd * v_pos.verified_capital_usd / v_total_capital, 2),
        'approved',
        'Proportional investor participation payout'
      );
      v_payout_count := v_payout_count + 1;
    END LOOP;
  END IF;

  SELECT coalesce(sum(verified_points), 0) INTO v_contrib_total
  FROM public.contribution_records
  WHERE status = 'verified';

  IF v_period.contributor_pool_usd > 0 AND v_contrib_total > 0 THEN
    FOR v_contrib IN
      SELECT contributor_id, sum(verified_points) AS points
      FROM public.contribution_records
      WHERE status = 'verified'
      GROUP BY contributor_id
    LOOP
      INSERT INTO public.funding_payouts (
        distribution_period_id, recipient_type, recipient_id, contributor_id,
        amount_usd, status, notes
      ) VALUES (
        p_period_id, 'contributor', v_contrib.contributor_id, v_contrib.contributor_id,
        round(v_period.contributor_pool_usd * v_contrib.points / v_contrib_total, 2),
        'approved',
        'Proportional contributor reward payout'
      );
      v_payout_count := v_payout_count + 1;
    END LOOP;
  END IF;

  INSERT INTO public.funding_payouts (
    distribution_period_id, recipient_type, amount_usd, status, notes
  ) VALUES
    (p_period_id, 'founder', v_period.founder_reserve_usd, 'approved', 'Founder stewardship reserve allocation'),
    (p_period_id, 'project_servicing', v_period.project_servicing_pool_usd, 'approved', 'Project assets and servicing allocation'),
    (p_period_id, 'mission_reserve', v_period.mission_reserve_usd, 'approved', 'Mission / safety / liquidity residual');

  v_payout_count := v_payout_count + 3;

  UPDATE public.distribution_periods
  SET status = 'approved', approved_by = v_uid, approved_at = now(), updated_at = now()
  WHERE id = p_period_id;

  INSERT INTO public.funding_ledger_audit_events (
    event_type, entity_type, entity_id, payload, actor_user_id
  ) VALUES (
    'distribution_period_approved',
    'distribution_period',
    p_period_id,
    jsonb_build_object('payout_count', v_payout_count, 'total_investor_capital', v_total_capital),
    v_uid
  );

  RETURN jsonb_build_object(
    'period_id', p_period_id,
    'status', 'approved',
    'payout_count', v_payout_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_distribution_period FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_distribution_period TO authenticated;

COMMENT ON TABLE public.funding_compliance_cases IS 'Manual compliance review queue until provider integrations are live.';
COMMENT ON TABLE public.funding_payment_receipts IS 'Manual payment receipt / reconciliation records (no live processor required).';
COMMENT ON TABLE public.distribution_periods IS 'LSP distribution periods with Constitution pool allocations.';
COMMENT ON TABLE public.funding_payouts IS 'Calculated payout rows for an approved distribution period.';
