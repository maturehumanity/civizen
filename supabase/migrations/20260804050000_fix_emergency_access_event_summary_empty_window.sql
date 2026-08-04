-- Always return one summary row even when there are no recent emergency-access events.
-- Previous FROM recent_events returned zero rows on an empty lookback window.

CREATE OR REPLACE FUNCTION public.governance_emergency_access_event_summary(
  requested_lookback_hours integer DEFAULT 168
)
RETURNS TABLE (
  lookback_hours integer,
  request_count integer,
  approved_count integer,
  rejected_count integer,
  expired_count integer,
  consumed_count integer,
  pending_count integer,
  latest_event_at timestamptz
) AS $$
DECLARE
  lookback integer := greatest(1, coalesce(requested_lookback_hours, 168));
BEGIN
  IF NOT (
    public.has_permission('settings.manage'::public.app_permission)
    OR public.has_permission('role.assign'::public.app_permission)
  ) THEN
    RAISE EXCEPTION 'Current profile is not authorized to read emergency access event summary';
  END IF;

  RETURN QUERY
  WITH recent_events AS (
    SELECT event.event_type, event.created_at
    FROM public.governance_emergency_access_request_events AS event
    WHERE event.created_at >= now() - make_interval(hours => lookback)
  ),
  pending_requests AS (
    SELECT count(*)::integer AS pending_count
    FROM public.governance_emergency_access_requests AS request
    WHERE request.request_status = 'pending'
  )
  SELECT
    lookback,
    coalesce((SELECT count(*)::integer FROM recent_events WHERE event_type = 'requested'), 0),
    coalesce((SELECT count(*)::integer FROM recent_events WHERE event_type = 'approved'), 0),
    coalesce((SELECT count(*)::integer FROM recent_events WHERE event_type = 'rejected'), 0),
    coalesce((SELECT count(*)::integer FROM recent_events WHERE event_type = 'expired'), 0),
    coalesce((SELECT count(*)::integer FROM recent_events WHERE event_type = 'consumed'), 0),
    coalesce((SELECT pending_count FROM pending_requests), 0),
    (SELECT max(created_at) FROM recent_events);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.governance_emergency_access_event_summary(integer) TO authenticated;
