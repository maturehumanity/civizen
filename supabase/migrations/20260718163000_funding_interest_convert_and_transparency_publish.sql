-- Phase 4 slice: inquiry → commitment conversion + public transparency publish switch.

CREATE UNIQUE INDEX IF NOT EXISTS funding_commitments_interest_inquiry_unique
  ON public.funding_commitments (interest_inquiry_id)
  WHERE interest_inquiry_id IS NOT NULL;

ALTER TABLE public.funding_interest_inquiries
  ADD COLUMN IF NOT EXISTS converted_commitment_id uuid
    REFERENCES public.funding_commitments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS funding_interest_converted_commitment_idx
  ON public.funding_interest_inquiries (converted_commitment_id)
  WHERE converted_commitment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.map_interest_lane_to_ledger_lane(p_lane text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_lane
    WHEN 'investor' THEN 'investor'
    WHEN 'donation' THEN 'donation'
    WHEN 'institutional' THEN 'grant'
    WHEN 'sponsorship' THEN 'sponsorship'
    WHEN 'contributor' THEN 'other'
    ELSE 'other'
  END;
$$;

CREATE OR REPLACE FUNCTION public.convert_funding_interest_to_commitment(
  p_inquiry_id uuid,
  p_amount_original numeric DEFAULT NULL,
  p_currency text DEFAULT NULL,
  p_amount_usd numeric DEFAULT NULL,
  p_status text DEFAULT 'pledged',
  p_restriction_code text DEFAULT NULL,
  p_restrictions text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inquiry public.funding_interest_inquiries%ROWTYPE;
  v_lane text;
  v_amount numeric(18, 2);
  v_currency text;
  v_amount_usd numeric(18, 2);
  v_restriction_code text;
  v_restrictions text;
  v_result jsonb;
  v_funder_type text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_manage_funding_ledger() THEN
    RAISE EXCEPTION 'forbidden_funding_ledger' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_inquiry
  FROM public.funding_interest_inquiries
  WHERE id = p_inquiry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inquiry_not_found' USING ERRCODE = '22023';
  END IF;

  IF v_inquiry.converted_commitment_id IS NOT NULL THEN
    RAISE EXCEPTION 'inquiry_already_converted' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.funding_commitments c WHERE c.interest_inquiry_id = p_inquiry_id
  ) THEN
    RAISE EXCEPTION 'inquiry_already_converted' USING ERRCODE = '22023';
  END IF;

  v_lane := public.map_interest_lane_to_ledger_lane(v_inquiry.lane);
  v_amount := COALESCE(p_amount_original, v_inquiry.indicated_amount_usd);
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'amount_required' USING ERRCODE = '22023';
  END IF;

  v_currency := upper(trim(COALESCE(NULLIF(trim(COALESCE(p_currency, '')), ''), v_inquiry.currency, 'USD')));
  v_amount_usd := COALESCE(p_amount_usd, CASE WHEN v_currency = 'USD' THEN v_amount ELSE NULL END);

  IF v_lane IN ('grant', 'government') THEN
    v_restriction_code := COALESCE(
      NULLIF(trim(COALESCE(p_restriction_code, '')), ''),
      'PENDING_REVIEW'
    );
    v_restrictions := COALESCE(
      NULLIF(trim(COALESCE(p_restrictions, '')), ''),
      NULLIF(trim(COALESCE(v_inquiry.message, '')), ''),
      'Converted from institutional interest; restriction review pending.'
    );
  ELSE
    v_restriction_code := NULLIF(trim(COALESCE(p_restriction_code, '')), '');
    v_restrictions := COALESCE(
      NULLIF(trim(COALESCE(p_restrictions, '')), ''),
      NULLIF(trim(COALESCE(v_inquiry.message, '')), '')
    );
  END IF;

  v_funder_type := CASE
    WHEN v_inquiry.organization IS NOT NULL AND char_length(trim(v_inquiry.organization)) > 0 THEN 'organization'
    WHEN v_lane = 'government' THEN 'government'
    WHEN v_lane = 'grant' THEN 'foundation'
    ELSE 'individual'
  END;

  v_result := public.record_funding_commitment(
    p_legal_name := trim(v_inquiry.full_name),
    p_funder_type := v_funder_type,
    p_lane := v_lane,
    p_amount_original := v_amount,
    p_currency := v_currency,
    p_amount_usd := v_amount_usd,
    p_public_display_name := trim(v_inquiry.full_name),
    p_country := v_inquiry.country,
    p_email := v_inquiry.email,
    p_payment_method := NULL,
    p_status := COALESCE(NULLIF(trim(COALESCE(p_status, '')), ''), 'pledged'),
    p_restrictions := v_restrictions,
    p_restriction_code := v_restriction_code,
    p_agreement_id := NULL,
    p_receipt_id := NULL,
    p_date_pledged := CURRENT_DATE,
    p_date_received := NULL,
    p_bank_reference := NULL,
    p_transaction_hash := NULL,
    p_kyc_status := 'not_started',
    p_accredited_investor_status := CASE
      WHEN v_inquiry.accredited_investor_interest IS TRUE THEN 'yes'
      ELSE 'unknown'
    END,
    p_sanctions_status := 'not_screened',
    p_tax_profile_status := 'unknown',
    p_debit_account := 'treasury_clearing',
    p_notes := concat('Converted from funding interest inquiry ', p_inquiry_id::text),
    p_existing_funder_id := NULL,
    p_interest_inquiry_id := p_inquiry_id,
    p_round_id := NULL,
    p_legal_instrument_id := NULL
  );

  UPDATE public.funding_interest_inquiries
  SET
    converted_commitment_id = (v_result->>'commitment_id')::uuid,
    status = CASE
      WHEN status IN ('closed', 'spam') THEN status
      ELSE 'contacted'
    END,
    updated_at = now()
  WHERE id = p_inquiry_id;

  INSERT INTO public.funding_ledger_audit_events (
    event_type,
    entity_type,
    entity_id,
    payload,
    actor_user_id
  ) VALUES (
    'interest_converted',
    'funding_interest_inquiry',
    p_inquiry_id,
    jsonb_build_object(
      'commitment_id', v_result->>'commitment_id',
      'funder_id', v_result->>'funder_id',
      'ledger_lane', v_lane
    ),
    v_uid
  );

  RETURN v_result || jsonb_build_object('inquiry_id', p_inquiry_id, 'ledger_lane', v_lane);
END;
$$;

REVOKE ALL ON FUNCTION public.convert_funding_interest_to_commitment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_funding_interest_to_commitment TO authenticated;

CREATE TABLE IF NOT EXISTS public.funding_transparency_publish (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  unpublished_at timestamptz,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.funding_transparency_publish (id, is_published)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.funding_transparency_publish ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Treasury can read transparency publish" ON public.funding_transparency_publish;
CREATE POLICY "Treasury can read transparency publish" ON public.funding_transparency_publish
  FOR SELECT TO authenticated
  USING (public.can_manage_funding_ledger());

DROP POLICY IF EXISTS "Treasury can update transparency publish" ON public.funding_transparency_publish;
CREATE POLICY "Treasury can update transparency publish" ON public.funding_transparency_publish
  FOR UPDATE TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

-- Allow anyone to read publish flag only via RPC below; no direct anon select on full row needed.
GRANT SELECT, UPDATE ON public.funding_transparency_publish TO authenticated;

CREATE OR REPLACE FUNCTION public.set_funding_transparency_published(
  p_is_published boolean,
  p_note text DEFAULT NULL
)
RETURNS public.funding_transparency_publish
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.funding_transparency_publish%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.can_manage_funding_ledger() THEN
    RAISE EXCEPTION 'forbidden_funding_ledger' USING ERRCODE = '42501';
  END IF;

  UPDATE public.funding_transparency_publish
  SET
    is_published = p_is_published,
    published_at = CASE WHEN p_is_published THEN now() ELSE published_at END,
    unpublished_at = CASE WHEN NOT p_is_published THEN now() ELSE unpublished_at END,
    published_by = CASE WHEN p_is_published THEN v_uid ELSE published_by END,
    note = NULLIF(trim(COALESCE(p_note, '')), ''),
    updated_at = now()
  WHERE id = 1
  RETURNING * INTO v_row;

  INSERT INTO public.funding_ledger_audit_events (
    event_type,
    entity_type,
    entity_id,
    payload,
    actor_user_id
  ) VALUES (
    CASE WHEN p_is_published THEN 'transparency_published' ELSE 'transparency_unpublished' END,
    'funding_transparency_publish',
    '00000000-0000-0000-0000-000000000001'::uuid,
    jsonb_build_object('is_published', p_is_published, 'note', v_row.note),
    v_uid
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.set_funding_transparency_published FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_funding_transparency_published TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_funding_transparency()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_published boolean;
  v_published_at timestamptz;
  v_investor numeric(18, 2) := 0;
  v_donation numeric(18, 2) := 0;
  v_grants numeric(18, 2) := 0;
  v_commercial numeric(18, 2) := 0;
  v_sponsorship numeric(18, 2) := 0;
  v_other numeric(18, 2) := 0;
BEGIN
  SELECT is_published, published_at
  INTO v_published, v_published_at
  FROM public.funding_transparency_publish
  WHERE id = 1;

  IF COALESCE(v_published, false) IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'published', false,
      'published_at', NULL,
      'lanes', jsonb_build_object()
    );
  END IF;

  SELECT
    coalesce(sum(amount_usd) FILTER (WHERE lane = 'investor'), 0),
    coalesce(sum(amount_usd) FILTER (WHERE lane = 'donation'), 0),
    coalesce(sum(amount_usd) FILTER (WHERE lane IN ('grant', 'government')), 0),
    coalesce(sum(amount_usd) FILTER (WHERE lane = 'commercial'), 0),
    coalesce(sum(amount_usd) FILTER (WHERE lane = 'sponsorship'), 0),
    coalesce(sum(amount_usd) FILTER (WHERE lane = 'other'), 0)
  INTO v_investor, v_donation, v_grants, v_commercial, v_sponsorship, v_other
  FROM public.funding_commitments
  WHERE status IN ('received', 'partially_received')
    AND amount_usd IS NOT NULL;

  RETURN jsonb_build_object(
    'published', true,
    'published_at', v_published_at,
    'lanes', jsonb_build_object(
      'investor', v_investor,
      'donation', v_donation,
      'grants', v_grants,
      'commercial', v_commercial,
      'sponsorship', v_sponsorship,
      'other', v_other,
      'founderReserveEstimate', round(v_investor * 0.01, 2)
    ),
    'basis', 'received_and_partially_received_commitments_usd'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_funding_transparency() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_funding_transparency() TO anon, authenticated;

COMMENT ON FUNCTION public.convert_funding_interest_to_commitment IS
  'Treasury-only: create a ledger commitment from a funding interest inquiry.';
COMMENT ON FUNCTION public.get_public_funding_transparency IS
  'Public aggregates of received funding by lane when transparency publish is enabled.';
