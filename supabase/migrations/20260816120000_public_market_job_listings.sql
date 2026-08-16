-- Public Market Jobs: anyone can post a seeker or employer listing without an account.
-- The public board never returns raw names, company names, or phone numbers.

CREATE OR REPLACE FUNCTION public.market_job_seeker_public_name(full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text := btrim(coalesce(full_name, ''));
  first_token text;
  rest text;
BEGIN
  IF cleaned = '' THEN
    RETURN '—';
  END IF;
  first_token := split_part(cleaned, ' ', 1);
  rest := btrim(substr(cleaned, char_length(first_token) + 1));
  IF rest = '' THEN
    RETURN first_token;
  END IF;
  RETURN first_token || ' ' || upper(left(rest, 1)) || '.';
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_market_job_listings(
  p_mode text,
  p_limit integer DEFAULT 40
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  mode text,
  job_types text[],
  city text,
  region_code text,
  country_code text,
  age text,
  pay_amount text,
  pay_period text,
  display_name text,
  phone_country_code text,
  has_phone boolean,
  is_own boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  listing_limit integer := LEAST(GREATEST(coalesce(p_limit, 40), 1), 100);
BEGIN
  IF p_mode IS NULL OR p_mode NOT IN ('seeker', 'employer') THEN
    RAISE EXCEPTION 'invalid mode';
  END IF;

  RETURN QUERY
  SELECT
    row.id,
    row.created_at,
    row.mode,
    row.job_types,
    row.city,
    row.region_code,
    row.country_code,
    row.age,
    row.pay_amount,
    row.pay_period,
    CASE
      WHEN row.mode = 'employer' THEN '••••••••'
      ELSE public.market_job_seeker_public_name(row.full_name)
    END AS display_name,
    row.phone_country_code,
    (btrim(coalesce(row.phone_number, '')) <> '') AS has_phone,
    (row.user_id IS NOT NULL AND row.user_id = auth.uid()) AS is_own
  FROM public.market_job_interests AS row
  WHERE row.mode = p_mode
    AND row.status IN ('new', 'reviewing', 'contacted')
  ORDER BY row.created_at DESC
  LIMIT listing_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlock_market_job_contact(p_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  company_name text,
  phone_country_code text,
  phone_number text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'sign in required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    row.id,
    row.full_name,
    row.company_name,
    row.phone_country_code,
    row.phone_number
  FROM public.market_job_interests AS row
  WHERE row.id = p_id
    AND row.status IN ('new', 'reviewing', 'contacted')
  LIMIT 1;
END;
$$;

DROP POLICY IF EXISTS "Signed-in members can submit market job interests" ON public.market_job_interests;
DROP POLICY IF EXISTS "Anyone can submit market job interests" ON public.market_job_interests;
CREATE POLICY "Anyone can submit market job interests"
  ON public.market_job_interests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    cardinality(job_types) > 0
    AND btrim(full_name) <> ''
    AND (
      (
        auth.uid() IS NULL
        AND user_id IS NULL
        AND profile_id IS NULL
      )
      OR (
        auth.uid() IS NOT NULL
        AND auth.uid() = user_id
      )
    )
  );

GRANT INSERT ON public.market_job_interests TO anon;

REVOKE ALL ON FUNCTION public.market_job_seeker_public_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.market_job_seeker_public_name(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.list_public_market_job_listings(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_market_job_listings(text, integer) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.unlock_market_job_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_market_job_contact(uuid) TO authenticated;

COMMENT ON FUNCTION public.list_public_market_job_listings(text, integer) IS
  'Public Market Jobs board. Returns sanitized rows only — no raw names, company names, or phone numbers.';

COMMENT ON FUNCTION public.unlock_market_job_contact(uuid) IS
  'Signed-in members may reveal contact details for a public Jobs listing. Not a paid unlock.';

NOTIFY pgrst, 'reload schema';
