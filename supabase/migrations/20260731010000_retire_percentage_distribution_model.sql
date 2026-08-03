-- Retire superseded percentage-based shared-proceeds distribution model.
-- Historical distribution_periods / funding_payouts rows are retained as read-only prototype data.

CREATE OR REPLACE FUNCTION public.create_distribution_period(
  p_label text,
  p_period_start date,
  p_period_end date,
  p_civizen_shared_proceeds_usd numeric,
  p_contributor_share numeric DEFAULT NULL,
  p_project_servicing_share numeric DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS public.distribution_periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Superseded model: percentage-based distribution periods are retired and cannot be created';
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_distribution_period(p_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Superseded model: percentage-based distribution approvals are retired';
END;
$$;

REVOKE ALL ON FUNCTION public.create_distribution_period(text, date, date, numeric, numeric, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_distribution_period(text, date, date, numeric, numeric, numeric, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.create_distribution_period(text, date, date, numeric, numeric, numeric, text) FROM anon;
REVOKE ALL ON FUNCTION public.approve_distribution_period(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_distribution_period(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.approve_distribution_period(uuid) FROM anon;

-- Prevent new prototype payout mutations from app roles (keep SELECT for audit if granted elsewhere).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'distribution_periods'
  ) THEN
    REVOKE INSERT, UPDATE, DELETE ON public.distribution_periods FROM authenticated;
    REVOKE INSERT, UPDATE, DELETE ON public.distribution_periods FROM anon;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'funding_payouts'
  ) THEN
    REVOKE INSERT, UPDATE, DELETE ON public.funding_payouts FROM authenticated;
    REVOKE INSERT, UPDATE, DELETE ON public.funding_payouts FROM anon;
  END IF;
END $$;

COMMENT ON FUNCTION public.create_distribution_period(text, date, date, numeric, numeric, numeric, text) IS
  'Retired: superseded percentage-based funding distribution model.';
COMMENT ON FUNCTION public.approve_distribution_period(uuid) IS
  'Retired: superseded percentage-based funding distribution model.';
