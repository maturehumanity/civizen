-- Match device phone numbers to Civizen profiles without exposing unmatched numbers.
-- Callers send candidate digit strings; only registered matches are returned.

CREATE OR REPLACE FUNCTION public.lookup_civizen_contacts_by_phone(p_phones text[])
RETURNS TABLE (
  phone_digits text,
  profile_id uuid,
  username text,
  full_name text,
  avatar_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phones text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT regexp_replace(candidate, '[^0-9]', '', 'g')
    FROM unnest(coalesce(p_phones, ARRAY[]::text[])) AS candidate
    WHERE length(regexp_replace(candidate, '[^0-9]', '', 'g')) BETWEEN 7 AND 15
    LIMIT 300
  )
  INTO phones;

  IF phones IS NULL OR cardinality(phones) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    regexp_replace(coalesce(pr.phone_e164, pr.phone_number, ''), '[^0-9]', '', 'g') AS phone_digits,
    pr.id,
    pr.username,
    pr.full_name,
    pr.avatar_url
  FROM public.profiles pr
  WHERE pr.deleted_at IS NULL
    AND coalesce(pr.is_system_agent, false) = false
    AND pr.user_id IS DISTINCT FROM auth.uid()
    AND regexp_replace(coalesce(pr.phone_e164, pr.phone_number, ''), '[^0-9]', '', 'g') = ANY (phones);
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_civizen_contacts_by_phone(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_civizen_contacts_by_phone(text[]) TO authenticated;

COMMENT ON FUNCTION public.lookup_civizen_contacts_by_phone(text[]) IS
  'Returns Civizen profiles whose phone digits match a caller-supplied candidate list from the device address book.';

NOTIFY pgrst, 'reload schema';
