-- Civizen rebrand: rename Levela DB identifiers to Civizen.
-- Historical migration filenames stay as-is; this applies live renames.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'governance_eligibility_snapshots' AND column_name = 'levela_score'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'governance_eligibility_snapshots' AND column_name = 'civizen_score'
  ) THEN
    ALTER TABLE public.governance_eligibility_snapshots RENAME COLUMN levela_score TO civizen_score;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'civizen_score'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'levela_score'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN civizen_score;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'levela_score'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'civizen_score'
  ) THEN
    ALTER TABLE public.profiles RENAME COLUMN levela_score TO civizen_score;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'distribution_periods' AND column_name = 'levela_shared_proceeds_usd'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'distribution_periods' AND column_name = 'civizen_shared_proceeds_usd'
  ) THEN
    ALTER TABLE public.distribution_periods RENAME COLUMN levela_shared_proceeds_usd TO civizen_shared_proceeds_usd;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'levela_mrz_char_value') THEN
    ALTER FUNCTION public.levela_mrz_char_value(text) RENAME TO civizen_mrz_char_value;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'levela_mrz_check_digit') THEN
    ALTER FUNCTION public.levela_mrz_check_digit(text) RENAME TO civizen_mrz_check_digit;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'levela_identity_status_prefix') THEN
    ALTER FUNCTION public.levela_identity_status_prefix(public.app_role, boolean) RENAME TO civizen_identity_status_prefix;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'levela_base32_hash_prefix') THEN
    ALTER FUNCTION public.levela_base32_hash_prefix(text, integer) RENAME TO civizen_base32_hash_prefix;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'levela_base36_hash_prefix') THEN
    ALTER FUNCTION public.levela_base36_hash_prefix(text, integer) RENAME TO civizen_base36_hash_prefix;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'levela_luhn36_char_value') THEN
    ALTER FUNCTION public.levela_luhn36_char_value(text) RENAME TO civizen_luhn36_char_value;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'levela_luhn36_check_char') THEN
    ALTER FUNCTION public.levela_luhn36_check_char(text) RENAME TO civizen_luhn36_check_char;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'generate_levela_lsi') THEN
    ALTER FUNCTION public.generate_levela_lsi(text, integer) RENAME TO generate_civizen_lsi;
  END IF;
END $$;

-- Thin legacy wrappers for any remaining SQL that still calls Levela names
CREATE OR REPLACE FUNCTION public.levela_mrz_check_digit(input_text text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$ SELECT public.civizen_mrz_check_digit($1) $$;

CREATE OR REPLACE FUNCTION public.levela_identity_status_prefix(user_role public.app_role, verified boolean)
RETURNS text LANGUAGE sql STABLE AS $$ SELECT public.civizen_identity_status_prefix($1, $2) $$;

CREATE OR REPLACE FUNCTION public.generate_levela_lsi(source text, attempt integer DEFAULT 0)
RETURNS text LANGUAGE sql STABLE AS $$ SELECT public.generate_civizen_lsi($1, $2) $$;

CREATE OR REPLACE FUNCTION public.levela_luhn36_check_char(input_text text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT public.civizen_luhn36_check_char($1) $$;

-- ---------------------------------------------------------------------------
-- create_distribution_period (parameter + column names)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_distribution_period(text, date, date, numeric, numeric, numeric, text);

CREATE OR REPLACE FUNCTION public.create_distribution_period(
  p_label text,
  p_period_start date,
  p_period_end date,
  p_civizen_shared_proceeds_usd numeric,
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
  IF p_civizen_shared_proceeds_usd IS NULL OR p_civizen_shared_proceeds_usd < 0 THEN
    RAISE EXCEPTION 'invalid_lsp' USING ERRCODE = '22023';
  END IF;
  IF p_contributor_share IS NULL OR p_contributor_share < 0 OR p_contributor_share > 0.70 THEN
    RAISE EXCEPTION 'invalid_contributor_share' USING ERRCODE = '22023';
  END IF;
  IF p_project_servicing_share IS NULL OR p_project_servicing_share < 0 OR p_project_servicing_share > 0.10 THEN
    RAISE EXCEPTION 'invalid_servicing_share' USING ERRCODE = '22023';
  END IF;

  v_lsp := p_civizen_shared_proceeds_usd;
  v_investor := round(v_lsp * 0.10, 2);
  v_contributor := round(v_lsp * p_contributor_share, 2);
  v_servicing := round(v_lsp * p_project_servicing_share, 2);
  v_founder := round(v_lsp * 0.01, 2);
  v_mission := round(v_lsp - v_investor - v_contributor - v_servicing - v_founder, 2);

  INSERT INTO public.distribution_periods (
    label, period_start, period_end, civizen_shared_proceeds_usd,
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

UPDATE public.profiles
SET username = 'civizen_guide'
WHERE username = 'levela_guide';
