-- Phase 4B: can_view_scope must be SECURITY DEFINER so viewer SELECT on
-- wellbeing_aggregate_scopes is not recursively blocked by the same RLS policy.
-- Still keyed to auth.uid() via wellbeing_aggregate_viewer_profile_id.

CREATE OR REPLACE FUNCTION public.wellbeing_aggregate_viewer_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.wellbeing_aggregate_can_view_scope(p_scope_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wellbeing_aggregate_scopes s
    WHERE s.id = p_scope_id
      AND public.wellbeing_aggregate_viewer_profile_id() = ANY (s.viewer_profile_ids)
  );
$$;

REVOKE ALL ON FUNCTION public.wellbeing_aggregate_viewer_profile_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wellbeing_aggregate_can_view_scope(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wellbeing_aggregate_viewer_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wellbeing_aggregate_can_view_scope(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wellbeing_aggregate_viewer_profile_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.wellbeing_aggregate_can_view_scope(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
