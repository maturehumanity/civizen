-- Prefer auth.uid() when finance_write_audit is called without an explicit actor.
CREATE OR REPLACE FUNCTION public.finance_write_audit(
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_actor uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  eid uuid;
  actor uuid := COALESCE(p_actor, auth.uid());
BEGIN
  INSERT INTO public.finance_audit_events (event_type, entity_type, entity_id, payload, actor_user_id)
  VALUES (p_event_type, p_entity_type, p_entity_id, COALESCE(p_payload, '{}'::jsonb), actor)
  RETURNING id INTO eid;
  RETURN eid;
END;
$$;
