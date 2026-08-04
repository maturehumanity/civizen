-- Public directory search for people + linked businesses (with owner).
-- linked_accounts RLS is owner/linked only; this SECURITY DEFINER RPC exposes
-- only public profile fields needed for Search.

CREATE OR REPLACE FUNCTION public.search_civizen_directory(
  p_query text,
  p_exclude_profile_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text := lower(btrim(coalesce(p_query, '')));
  result_limit integer := greatest(1, least(coalesce(p_limit, 30), 50));
  people_json jsonb;
  companies_json jsonb;
BEGIN
  IF char_length(normalized) < 2 THEN
    RETURN jsonb_build_object('people', '[]'::jsonb, 'companies', '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(person) ORDER BY person.sort_name), '[]'::jsonb)
  INTO people_json
  FROM (
    SELECT
      p.id,
      p.username,
      p.full_name,
      p.avatar_url,
      p.is_verified,
      lower(coalesce(p.full_name, p.username, '')) AS sort_name
    FROM public.profiles AS p
    WHERE p.deleted_at IS NULL
      AND (p_exclude_profile_id IS NULL OR p.id <> p_exclude_profile_id)
      AND (
        p.username ILIKE '%' || normalized || '%'
        OR p.full_name ILIKE '%' || normalized || '%'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.linked_accounts AS la
        WHERE la.linked_profile_id = p.id
          AND la.relationship_type = 'business'
      )
    ORDER BY lower(coalesce(p.full_name, p.username, ''))
    LIMIT result_limit
  ) AS person;

  SELECT coalesce(jsonb_agg(to_jsonb(company) ORDER BY company.sort_name), '[]'::jsonb)
  INTO companies_json
  FROM (
    SELECT
      business.id AS profile_id,
      la.business_name_normalized,
      business.username,
      business.full_name,
      business.avatar_url,
      business.is_verified,
      owner.id AS owner_id,
      owner.username AS owner_username,
      owner.full_name AS owner_full_name,
      owner.avatar_url AS owner_avatar_url,
      owner.is_verified AS owner_is_verified,
      lower(coalesce(business.full_name, la.business_name_normalized, business.username, '')) AS sort_name
    FROM public.linked_accounts AS la
    JOIN public.profiles AS business
      ON business.id = la.linked_profile_id
    JOIN public.profiles AS owner
      ON owner.id = la.owner_profile_id
    WHERE la.relationship_type = 'business'
      AND business.deleted_at IS NULL
      AND owner.deleted_at IS NULL
      AND (p_exclude_profile_id IS NULL OR business.id <> p_exclude_profile_id)
      AND (
        business.username ILIKE '%' || normalized || '%'
        OR business.full_name ILIKE '%' || normalized || '%'
        OR coalesce(la.business_name_normalized, '') ILIKE '%' || normalized || '%'
      )
    ORDER BY lower(coalesce(business.full_name, la.business_name_normalized, business.username, ''))
    LIMIT result_limit
  ) AS company;

  RETURN jsonb_build_object(
    'people', coalesce(people_json, '[]'::jsonb),
    'companies', coalesce(companies_json, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.search_civizen_directory(text, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_civizen_directory(text, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_civizen_directory(text, uuid, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.search_civizen_directory(text, uuid, integer) TO service_role;

COMMENT ON FUNCTION public.search_civizen_directory(text, uuid, integer) IS
  'Search people (non-business profiles) and companies with public owner fields for the unified Search screen.';
