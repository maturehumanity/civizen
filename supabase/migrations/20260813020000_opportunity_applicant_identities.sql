-- Slice 1 follow-up: organizer-only applicant identity readout.
-- Does not copy identity onto participation rows or change profiles RLS.

CREATE OR REPLACE FUNCTION public.list_opportunity_applicant_identities(p_opportunity_id uuid)
RETURNS TABLE (
  participation_id uuid,
  profile_id uuid,
  display_name text,
  username text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    pr.id,
    coalesce(
      nullif(trim(pr.full_name), ''),
      nullif(trim(pr.username), ''),
      'Applicant'
    ),
    nullif(trim(pr.username), ''),
    nullif(trim(pr.avatar_url), '')
  FROM public.opportunity_participations p
  INNER JOIN public.profiles pr ON pr.id = p.participant_profile_id
  WHERE p.opportunity_id = p_opportunity_id
    AND public.current_profile_manages_publisher(
      public.opportunity_publisher_id(p_opportunity_id)
    )
    AND pr.deleted_at IS NULL
  ORDER BY p.applied_at DESC;
$$;

COMMENT ON FUNCTION public.list_opportunity_applicant_identities(uuid) IS
  'Returns public identity fields for applicants on an opportunity the caller manages. Does not broaden profiles RLS.';

REVOKE ALL ON FUNCTION public.list_opportunity_applicant_identities(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_opportunity_applicant_identities(uuid) TO authenticated;
