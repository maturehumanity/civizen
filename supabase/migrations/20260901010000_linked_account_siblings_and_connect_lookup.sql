-- Sibling business accounts of the same owner must be visible to each other,
-- and the add-business dialog must be able to find an existing company
-- before submit (Connect instead of Register).

CREATE OR REPLACE FUNCTION public.linked_account_owner_ids_for_viewer()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(DISTINCT la.owner_profile_id), '{}'::uuid[])
  FROM public.linked_accounts AS la
  JOIN public.profiles AS viewer
    ON viewer.id IN (la.owner_profile_id, la.linked_profile_id)
  WHERE viewer.user_id = auth.uid()
    AND viewer.deleted_at IS NULL
    AND la.relationship_type = 'business';
$$;

REVOKE ALL ON FUNCTION public.linked_account_owner_ids_for_viewer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.linked_account_owner_ids_for_viewer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.linked_account_owner_ids_for_viewer() TO service_role;

DROP POLICY IF EXISTS "Linked accounts are visible to owners and linked profiles" ON public.linked_accounts;
CREATE POLICY "Linked accounts are visible to owners and linked profiles"
  ON public.linked_accounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = linked_accounts.owner_profile_id
        AND p.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = linked_accounts.linked_profile_id
        AND p.user_id = auth.uid()
    )
    OR (
      linked_accounts.relationship_type = 'business'
      AND linked_accounts.owner_profile_id = ANY (public.linked_account_owner_ids_for_viewer())
    )
    OR public.has_permission('settings.manage'::public.app_permission)
  );

CREATE OR REPLACE FUNCTION public.lookup_business_accounts_for_connect(
  p_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_limit integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_id uuid;
  name_q text := lower(btrim(coalesce(p_name, '')));
  email_q text := lower(btrim(coalesce(p_email, '')));
  name_escaped text;
  name_key text := regexp_replace(name_q, '[^a-z0-9]', '', 'g');
  result_limit integer := greatest(1, least(coalesce(p_limit, 5), 8));
  matches jsonb;
BEGIN
  SELECT id
  INTO requester_id
  FROM public.profiles
  WHERE user_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;

  IF requester_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  IF char_length(name_q) < 2 AND position('@' in email_q) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  name_escaped := replace(replace(replace(name_q, '\', '\\'), '%', '\%'), '_', '\_');

  WITH candidates AS (
    SELECT
      p.id AS profile_id,
      p.full_name,
      p.username,
      p.avatar_url,
      la.business_name_normalized,
      la.owner_profile_id,
      owner.full_name AS owner_full_name,
      CASE
        WHEN email_q <> '' AND lower(u.email) = email_q THEN 'email'
        WHEN p.username IS NOT NULL AND lower(p.username) = name_q THEN 'username'
        WHEN char_length(name_key) >= 8
          AND char_length(regexp_replace(split_part(split_part(coalesce(u.email, ''), '@', 2), '.', 1), '[^a-z0-9]', '', 'g')) >= 8
          AND (
            name_key LIKE '%' || regexp_replace(split_part(split_part(u.email, '@', 2), '.', 1), '[^a-z0-9]', '', 'g') || '%'
            OR regexp_replace(split_part(split_part(u.email, '@', 2), '.', 1), '[^a-z0-9]', '', 'g') LIKE '%' || name_key || '%'
          )
          THEN 'email_domain'
        ELSE 'name'
      END AS match_reason,
      CASE
        WHEN email_q <> '' AND lower(u.email) = email_q THEN 1
        WHEN p.username IS NOT NULL AND lower(p.username) = name_q THEN 2
        WHEN char_length(name_key) >= 8
          AND char_length(regexp_replace(split_part(split_part(coalesce(u.email, ''), '@', 2), '.', 1), '[^a-z0-9]', '', 'g')) >= 8
          AND name_key LIKE '%' || regexp_replace(split_part(split_part(u.email, '@', 2), '.', 1), '[^a-z0-9]', '', 'g') || '%'
          THEN 3
        ELSE 4
      END AS rank_n,
      (la.owner_profile_id = requester_id) AS already_linked_to_requester
    FROM public.profiles AS p
    JOIN auth.users AS u ON u.id = p.user_id
    LEFT JOIN public.linked_accounts AS la
      ON la.linked_profile_id = p.id
      AND la.relationship_type = 'business'
    LEFT JOIN public.profiles AS owner
      ON owner.id = la.owner_profile_id
    WHERE p.deleted_at IS NULL
      AND p.id <> requester_id
      AND (
        (email_q <> '' AND lower(u.email) = email_q)
        OR (
          char_length(name_q) >= 2
          AND (
            p.full_name ILIKE '%' || name_escaped || '%' ESCAPE '\'
            OR coalesce(p.username, '') ILIKE '%' || name_escaped || '%' ESCAPE '\'
            OR coalesce(la.business_name_normalized, '') ILIKE '%' || name_escaped || '%' ESCAPE '\'
          )
        )
        OR (
          char_length(name_key) >= 8
          AND char_length(regexp_replace(split_part(split_part(coalesce(u.email, ''), '@', 2), '.', 1), '[^a-z0-9]', '', 'g')) >= 8
          AND (
            name_key LIKE '%' || regexp_replace(split_part(split_part(u.email, '@', 2), '.', 1), '[^a-z0-9]', '', 'g') || '%'
            OR regexp_replace(split_part(split_part(u.email, '@', 2), '.', 1), '[^a-z0-9]', '', 'g') LIKE '%' || name_key || '%'
          )
        )
      )
  )
  SELECT coalesce(jsonb_agg(to_jsonb(match) ORDER BY match.rank_n, match.sort_name), '[]'::jsonb)
  INTO matches
  FROM (
    SELECT
      deduped.profile_id,
      deduped.full_name,
      deduped.username,
      deduped.avatar_url,
      deduped.business_name_normalized,
      deduped.owner_profile_id,
      deduped.owner_full_name,
      deduped.match_reason,
      deduped.already_linked_to_requester,
      deduped.rank_n,
      deduped.sort_name
    FROM (
      SELECT DISTINCT ON (c.profile_id)
        c.profile_id,
        c.full_name,
        c.username,
        c.avatar_url,
        c.business_name_normalized,
        c.owner_profile_id,
        c.owner_full_name,
        c.match_reason,
        c.already_linked_to_requester,
        c.rank_n,
        lower(coalesce(c.full_name, c.username, '')) AS sort_name
      FROM candidates AS c
      ORDER BY c.profile_id, c.rank_n
    ) AS deduped
    ORDER BY deduped.rank_n, deduped.sort_name
    LIMIT result_limit
  ) AS match;

  RETURN coalesce(matches, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_business_accounts_for_connect(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_business_accounts_for_connect(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_business_accounts_for_connect(text, text, integer) TO service_role;

COMMENT ON FUNCTION public.linked_account_owner_ids_for_viewer() IS
  'Owner profile ids for the signed-in personal or business account, used so sibling organizations stay visible.';

COMMENT ON FUNCTION public.lookup_business_accounts_for_connect(text, text, integer) IS
  'Find existing business accounts by name, username, email, or company email domain so Add business can Connect instead of Register.';
