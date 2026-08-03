-- Phase 2: public funding interest inquiries (no capital acceptance).
-- Admin review uses treasury_finance domain or settings.manage / role.assign.

CREATE TABLE IF NOT EXISTS public.funding_interest_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lane text NOT NULL
    CHECK (lane IN (
      'donation',
      'investor',
      'institutional',
      'contributor',
      'sponsorship',
      'other'
    )),
  full_name text NOT NULL,
  email text NOT NULL,
  organization text,
  country text,
  indicated_amount_usd numeric(18, 2),
  currency text DEFAULT 'USD',
  message text,
  accredited_investor_interest boolean,
  accept_risk_disclosure boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewing', 'contacted', 'closed', 'spam')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funding_interest_inquiries_lane_created_idx
  ON public.funding_interest_inquiries (lane, created_at DESC);

CREATE INDEX IF NOT EXISTS funding_interest_inquiries_status_created_idx
  ON public.funding_interest_inquiries (status, created_at DESC);

ALTER TABLE public.funding_interest_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit funding interest" ON public.funding_interest_inquiries;
CREATE POLICY "Anyone can submit funding interest"
  ON public.funding_interest_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    full_name <> ''
    AND email <> ''
    AND (
      lane <> 'investor'
      OR accept_risk_disclosure = true
    )
  );

DROP POLICY IF EXISTS "Treasury admins can read funding interest" ON public.funding_interest_inquiries;
CREATE POLICY "Treasury admins can read funding interest"
  ON public.funding_interest_inquiries
  FOR SELECT
  TO authenticated
  USING (
    public.has_permission('settings.manage'::public.app_permission)
    OR public.has_permission('role.assign'::public.app_permission)
    OR public.current_profile_in_governance_domain(ARRAY['treasury_finance', 'policy_legal'])
  );

DROP POLICY IF EXISTS "Treasury admins can update funding interest" ON public.funding_interest_inquiries;
CREATE POLICY "Treasury admins can update funding interest"
  ON public.funding_interest_inquiries
  FOR UPDATE
  TO authenticated
  USING (
    public.has_permission('settings.manage'::public.app_permission)
    OR public.has_permission('role.assign'::public.app_permission)
    OR public.current_profile_in_governance_domain(ARRAY['treasury_finance', 'policy_legal'])
  )
  WITH CHECK (
    public.has_permission('settings.manage'::public.app_permission)
    OR public.has_permission('role.assign'::public.app_permission)
    OR public.current_profile_in_governance_domain(ARRAY['treasury_finance', 'policy_legal'])
  );

GRANT INSERT ON public.funding_interest_inquiries TO anon, authenticated;
GRANT SELECT, UPDATE ON public.funding_interest_inquiries TO authenticated;

COMMENT ON TABLE public.funding_interest_inquiries IS
  'Interest-only funding inquiries. Does not accept or record capital.';
