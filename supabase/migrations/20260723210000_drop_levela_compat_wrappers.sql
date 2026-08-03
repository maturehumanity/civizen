-- Drop pre-rebrand Levela function wrappers and Civizen-brand remaining live identifiers.
-- Historical migration files keep Levela names as immutable history.

-- ---------------------------------------------------------------------------
-- Drop thin Levela compatibility wrappers (Civizen names are canonical)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.levela_mrz_check_digit(text);
DROP FUNCTION IF EXISTS public.levela_identity_status_prefix(public.app_role, boolean);
DROP FUNCTION IF EXISTS public.generate_levela_lsi(text, integer);
DROP FUNCTION IF EXISTS public.levela_luhn36_check_char(text);
DROP FUNCTION IF EXISTS public.levela_mrz_char_value(text);
DROP FUNCTION IF EXISTS public.levela_base32_hash_prefix(text, integer);
DROP FUNCTION IF EXISTS public.levela_base36_hash_prefix(text, integer);
DROP FUNCTION IF EXISTS public.levela_luhn36_char_value(text);

-- ---------------------------------------------------------------------------
-- Public-audit webhook event names → Civizen
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._dispatch_public_audit_external_execution_page_webhook(target_page_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy_metadata jsonb;
  webhook_url text;
  page_id uuid;
  page_batch_id uuid;
  page_key text;
  page_severity text;
  page_message text;
  page_oncall text;
  page_opened_at timestamptz;
  payload jsonb;
BEGIN
  IF target_page_id IS NULL THEN
    RETURN;
  END IF;

  SELECT p.metadata
  INTO policy_metadata
  FROM public.governance_public_audit_external_execution_policies AS p
  WHERE p.policy_key = 'default'
  LIMIT 1;

  webhook_url := nullif(btrim(coalesce(policy_metadata ->> 'oncall_webhook_url', '')), '');

  IF webhook_url IS NULL OR length(webhook_url) > 2048 THEN
    RETURN;
  END IF;

  IF lower(webhook_url) NOT LIKE 'https://%' THEN
    RAISE NOTICE '_dispatch_public_audit_external_execution_page_webhook: skipped oncall_webhook_url (https required)';
    RETURN;
  END IF;

  SELECT
    page.id,
    page.batch_id,
    page.page_key,
    page.severity,
    page.page_message,
    page.oncall_channel,
    page.opened_at
  INTO
    page_id,
    page_batch_id,
    page_key,
    page_severity,
    page_message,
    page_oncall,
    page_opened_at
  FROM public.governance_public_audit_external_execution_pages AS page
  WHERE page.id = target_page_id;

  IF NOT FOUND OR page_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE '_dispatch_public_audit_external_execution_page_webhook: pg_net not installed; skipping HTTP dispatch';
    RETURN;
  END IF;

  payload := jsonb_build_object(
    'event', 'civizen.public_audit.external_execution_page_opened',
    'page_id', page_id,
    'batch_id', page_batch_id,
    'page_key', page_key,
    'severity', page_severity,
    'page_message', page_message,
    'oncall_channel', page_oncall,
    'opened_at', page_opened_at
  );

  BEGIN
    PERFORM net.http_post(
      url := webhook_url,
      body := payload,
      params := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Civizen-Event', 'public_audit_external_execution_page_opened'
      ),
      timeout_milliseconds := 8000
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '_dispatch_public_audit_external_execution_page_webhook: net.http_post failed (%): %', SQLSTATE, SQLERRM;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public._dispatch_public_audit_external_execution_page_webhook(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._dispatch_public_audit_external_execution_page_webhook(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public._dispatch_public_audit_external_execution_page_webhook(uuid) FROM service_role;

COMMENT ON SCHEMA public IS 'Civizen product DB';

-- NOTE: private_get_or_create_* conversation UUID v5 name strings must remain
-- the historical `levela-dm:` / `levela-agent:` salts. Changing them would mint
-- new conversation IDs and orphan existing threads/messages. They are not
-- user-visible brand strings.
