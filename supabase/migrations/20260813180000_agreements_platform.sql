-- Platform Agreements: extend the existing agreements identity table.
-- Market listing agreements remain one type. Lifecycle, parties, versions,
-- signatures, attachments, relationships, and audit live in child tables.

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'agreements.create';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'agreements.sign_org';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.role_permissions (role, permission)
VALUES
  ('member', 'agreements.create'),
  ('citizen', 'agreements.create'),
  ('verified_member', 'agreements.create'),
  ('certified', 'agreements.create'),
  ('moderator', 'agreements.create'),
  ('market_manager', 'agreements.create'),
  ('admin', 'agreements.create'),
  ('founder', 'agreements.create'),
  ('system', 'agreements.create'),
  ('admin', 'agreements.sign_org'),
  ('founder', 'agreements.sign_org'),
  ('system', 'agreements.sign_org')
ON CONFLICT (role, permission) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Identity table evolution
-- ---------------------------------------------------------------------------

ALTER TABLE public.agreements
  ALTER COLUMN buyer_profile_id DROP NOT NULL,
  ALTER COLUMN seller_profile_id DROP NOT NULL,
  ALTER COLUMN listing_title_snapshot DROP NOT NULL,
  ALTER COLUMN listing_price_lumens_snapshot DROP NOT NULL,
  ALTER COLUMN template_key DROP NOT NULL;

ALTER TABLE public.agreements DROP CONSTRAINT IF EXISTS agreements_status_check;
ALTER TABLE public.agreements DROP CONSTRAINT IF EXISTS agreements_template_key_check;
ALTER TABLE public.agreements DROP CONSTRAINT IF EXISTS agreements_distinct_parties;

ALTER TABLE public.agreements
  ADD CONSTRAINT agreements_status_check CHECK (status IN (
    'draft', 'in_review', 'proposed', 'partially_signed', 'signed', 'active',
    'completed', 'terminated', 'declined', 'withdrawn', 'expired',
    'pending_counterparty', 'cancelled'
  )),
  ADD CONSTRAINT agreements_template_key_check CHECK (
    template_key IS NULL OR template_key IN ('core', 'product', 'service')
  ),
  ADD CONSTRAINT agreements_distinct_parties CHECK (
    buyer_profile_id IS NULL OR seller_profile_id IS NULL OR buyer_profile_id <> seller_profile_id
  );

ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS reference_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS agreement_type text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS owner_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_version_id uuid,
  ADD COLUMN IF NOT EXISTS executed_version_id uuid,
  ADD COLUMN IF NOT EXISTS amends_agreement_id uuid REFERENCES public.agreements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS effective_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS terminated_at timestamptz,
  ADD COLUMN IF NOT EXISTS termination_reason text,
  ADD COLUMN IF NOT EXISTS execution_method text,
  ADD COLUMN IF NOT EXISTS executed_at timestamptz;

ALTER TABLE public.agreements DROP CONSTRAINT IF EXISTS agreements_type_check;
ALTER TABLE public.agreements
  ADD CONSTRAINT agreements_type_check CHECK (
    agreement_type IS NULL OR agreement_type IN (
      'general', 'mou', 'partnership', 'pilot', 'program', 'funding',
      'service_contribution', 'data_research', 'nda', 'amendment', 'other',
      'market_core', 'market_product', 'market_service'
    )
  );

ALTER TABLE public.agreements DROP CONSTRAINT IF EXISTS agreements_execution_method_check;
ALTER TABLE public.agreements
  ADD CONSTRAINT agreements_execution_method_check CHECK (
    execution_method IS NULL OR execution_method IN (
      'native_electronic', 'paper', 'external_electronic', 'other'
    )
  );

CREATE TABLE IF NOT EXISTS public.agreement_reference_counters (
  year integer PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.agreement_next_reference()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM timezone('utc', now()))::integer;
  v_n integer;
BEGIN
  INSERT INTO public.agreement_reference_counters (year, last_value)
  VALUES (v_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_value = public.agreement_reference_counters.last_value + 1
  RETURNING last_value INTO v_n;
  RETURN 'AGR-' || v_year::text || '-' || lpad(v_n::text, 4, '0');
END;
$$;

UPDATE public.agreements
SET
  title = COALESCE(title, listing_title_snapshot, 'Agreement'),
  agreement_type = COALESCE(
    agreement_type,
    CASE template_key
      WHEN 'service' THEN 'market_service'
      WHEN 'core' THEN 'market_core'
      ELSE 'market_product'
    END
  ),
  owner_profile_id = COALESCE(owner_profile_id, initiator_profile_id),
  summary = COALESCE(summary, listing_title_snapshot)
WHERE title IS NULL OR agreement_type IS NULL OR owner_profile_id IS NULL;

UPDATE public.agreements
SET reference_code = public.agreement_next_reference()
WHERE reference_code IS NULL;

-- ---------------------------------------------------------------------------
-- Child tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agreement_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  party_kind text NOT NULL CHECK (party_kind IN (
    'civizen_organization', 'civizen_individual', 'external_organization', 'external_individual'
  )),
  display_name text NOT NULL,
  legal_name text,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  role_in_agreement text,
  contact text,
  representative_name text,
  representative_title text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agreement_parties_agreement_idx
  ON public.agreement_parties (agreement_id, sort_order);

CREATE TABLE IF NOT EXISTS public.agreement_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  parties_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  signatories_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  change_note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  fingerprint text,
  UNIQUE (agreement_id, version_number)
);

CREATE INDEX IF NOT EXISTS agreement_versions_agreement_idx
  ON public.agreement_versions (agreement_id, version_number DESC);

ALTER TABLE public.agreements
  DROP CONSTRAINT IF EXISTS agreements_current_version_fk,
  DROP CONSTRAINT IF EXISTS agreements_executed_version_fk;
ALTER TABLE public.agreements
  ADD CONSTRAINT agreements_current_version_fk
    FOREIGN KEY (current_version_id) REFERENCES public.agreement_versions(id) ON DELETE SET NULL,
  ADD CONSTRAINT agreements_executed_version_fk
    FOREIGN KEY (executed_version_id) REFERENCES public.agreement_versions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.agreement_signatories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES public.agreement_parties(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'required' CHECK (kind IN ('required', 'optional')),
  display_name text,
  title_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agreement_signatories_agreement_idx
  ON public.agreement_signatories (agreement_id);

CREATE TABLE IF NOT EXISTS public.agreement_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.agreement_versions(id) ON DELETE CASCADE,
  signatory_id uuid NOT NULL REFERENCES public.agreement_signatories(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES public.agreement_parties(id) ON DELETE CASCADE,
  signer_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  signer_user_id uuid,
  signer_name_snapshot text NOT NULL,
  representative_title_snapshot text,
  party_name_snapshot text NOT NULL,
  role_snapshot text,
  fingerprint text NOT NULL,
  signing_method text NOT NULL DEFAULT 'native_electronic'
    CHECK (signing_method IN ('native_electronic', 'paper', 'external_electronic', 'other')),
  electronic_records_consent boolean NOT NULL DEFAULT false,
  electronic_signature_consent boolean NOT NULL DEFAULT false,
  authority_attested boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'signed' CHECK (status IN ('signed', 'declined')),
  signed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (version_id, signatory_id)
);

CREATE INDEX IF NOT EXISTS agreement_signatures_agreement_idx
  ON public.agreement_signatures (agreement_id, version_id);

CREATE TABLE IF NOT EXISTS public.agreement_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  label_snapshot text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agreement_relationships_agreement_idx
  ON public.agreement_relationships (agreement_id);
CREATE INDEX IF NOT EXISTS agreement_relationships_entity_idx
  ON public.agreement_relationships (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.agreement_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.agreement_versions(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'working'
    CHECK (kind IN ('working', 'incorporated', 'executed_external')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  content_type text,
  byte_size bigint,
  fingerprint text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agreement_attachments_agreement_idx
  ON public.agreement_attachments (agreement_id);

CREATE TABLE IF NOT EXISTS public.agreement_review_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.agreement_versions(id) ON DELETE SET NULL,
  author_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agreement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id uuid NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.agreement_versions(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  party_id uuid REFERENCES public.agreement_parties(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agreement_events_agreement_idx
  ON public.agreement_events (agreement_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_notifications_recipient_idx
  ON public.user_notifications (recipient_profile_id, created_at DESC);

INSERT INTO storage.buckets (id, name, public)
VALUES ('agreement-files', 'agreement-files', false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_access_agreement(p_agreement_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_profile_id() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.agreements a WHERE a.id = p_agreement_id)
    AND (
      public.has_permission('settings.manage')
      OR EXISTS (
        SELECT 1 FROM public.agreements a
        WHERE a.id = p_agreement_id
          AND (
            a.initiator_profile_id = public.current_profile_id()
            OR a.owner_profile_id = public.current_profile_id()
            OR a.buyer_profile_id = public.current_profile_id()
            OR a.seller_profile_id = public.current_profile_id()
            OR public.current_profile_manages_publisher(a.owner_profile_id)
            OR public.current_profile_manages_publisher(a.initiator_profile_id)
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.agreement_parties p
        WHERE p.agreement_id = p_agreement_id
          AND (
            p.profile_id = public.current_profile_id()
            OR public.current_profile_manages_publisher(p.profile_id)
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.agreement_signatories s
        WHERE s.agreement_id = p_agreement_id
          AND s.profile_id = public.current_profile_id()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_agreement(p_agreement_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.can_access_agreement(p_agreement_id)
    AND EXISTS (
      SELECT 1 FROM public.agreements a
      WHERE a.id = p_agreement_id
        AND a.status IN ('draft')
        AND (
          a.initiator_profile_id = public.current_profile_id()
          OR a.owner_profile_id = public.current_profile_id()
          OR public.current_profile_manages_publisher(a.owner_profile_id)
          OR public.has_permission('settings.manage')
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.agreement_append_event(
  p_agreement_id uuid,
  p_event_type text,
  p_version_id uuid DEFAULT NULL,
  p_party_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.agreement_events (
    agreement_id, version_id, event_type, actor_profile_id, party_id, metadata
  ) VALUES (
    p_agreement_id, p_version_id, p_event_type, public.current_profile_id(), p_party_id, COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.agreement_notify(
  p_profile_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_agreement_id uuid,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_profile_id IS NULL OR p_profile_id = public.current_profile_id() THEN
    RETURN;
  END IF;
  INSERT INTO public.user_notifications (
    recipient_profile_id, notification_type, title, body, entity_type, entity_id, metadata
  ) VALUES (
    p_profile_id, p_type, p_title, p_body, 'agreement', p_agreement_id, COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.agreement_fingerprint_payload(
  p_agreement_id uuid,
  p_version_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agreement public.agreements%ROWTYPE;
  v_version public.agreement_versions%ROWTYPE;
BEGIN
  SELECT * INTO v_agreement FROM public.agreements WHERE id = p_agreement_id;
  SELECT * INTO v_version FROM public.agreement_versions WHERE id = p_version_id;
  RETURN jsonb_build_object(
    'agreementId', v_agreement.id,
    'referenceCode', v_agreement.reference_code,
    'title', v_agreement.title,
    'agreementType', v_agreement.agreement_type,
    'versionNumber', v_version.version_number,
    'content', v_version.content,
    'parties', v_version.parties_snapshot,
    'signatories', v_version.signatories_snapshot,
    'attachments', v_version.attachments_snapshot
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.agreement_compute_fingerprint(p_payload jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(extensions.digest(convert_to(p_payload::text, 'UTF8'), 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.agreement_lock_version(p_agreement_id uuid, p_version_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
  v_parties jsonb;
  v_signatories jsonb;
  v_attachments jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(p) ORDER BY p.sort_order, p.created_at), '[]'::jsonb)
    INTO v_parties
  FROM public.agreement_parties p
  WHERE p.agreement_id = p_agreement_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.created_at), '[]'::jsonb)
    INTO v_signatories
  FROM public.agreement_signatories s
  WHERE s.agreement_id = p_agreement_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at), '[]'::jsonb)
    INTO v_attachments
  FROM public.agreement_attachments a
  WHERE a.agreement_id = p_agreement_id
    AND a.kind = 'incorporated'
    AND (a.version_id IS NULL OR a.version_id = p_version_id);

  UPDATE public.agreement_versions
  SET
    parties_snapshot = v_parties,
    signatories_snapshot = v_signatories,
    attachments_snapshot = v_attachments
  WHERE id = p_version_id;

  v_hash := public.agreement_compute_fingerprint(
    public.agreement_fingerprint_payload(p_agreement_id, p_version_id)
  );

  UPDATE public.agreement_versions
  SET locked_at = now(), fingerprint = v_hash
  WHERE id = p_version_id AND locked_at IS NULL;

  RETURN v_hash;
END;
$$;

-- ---------------------------------------------------------------------------
-- Create / update
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_collaboration_agreement(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_id uuid;
  v_version uuid;
  v_title text;
  v_type text;
  v_party jsonb;
  v_related jsonb;
  v_party_id uuid;
  v_content jsonb;
  v_order integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_permission('agreements.create') AND NOT public.has_permission('settings.manage') THEN
    RAISE EXCEPTION 'Not allowed to create agreements';
  END IF;

  v_actor := public.current_profile_id();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  v_title := nullif(trim(p_payload->>'title'), '');
  v_type := coalesce(nullif(trim(p_payload->>'agreement_type'), ''), 'general');
  IF v_title IS NULL OR char_length(v_title) < 3 THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  IF v_type NOT IN (
    'general', 'mou', 'partnership', 'pilot', 'program', 'funding',
    'service_contribution', 'data_research', 'nda', 'amendment', 'other'
  ) THEN
    RAISE EXCEPTION 'Invalid agreement type';
  END IF;

  v_content := coalesce(p_payload->'content', jsonb_build_object(
    'purpose', coalesce(p_payload->>'summary', p_payload->>'purpose', ''),
    'structured', coalesce(p_payload->'structured', '{}'::jsonb),
    'sections', coalesce(p_payload->'sections', '[]'::jsonb)
  ));

  INSERT INTO public.agreements (
    initiator_profile_id,
    owner_profile_id,
    buyer_profile_id,
    seller_profile_id,
    template_key,
    listing_title_snapshot,
    listing_price_lumens_snapshot,
    listing_kind_snapshot,
    body_markdown,
    status,
    reference_code,
    title,
    agreement_type,
    summary,
    effective_at,
    end_at
  ) VALUES (
    v_actor,
    v_actor,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'collaboration',
    coalesce(v_content->>'purpose', v_title),
    'draft',
    public.agreement_next_reference(),
    v_title,
    v_type,
    nullif(trim(p_payload->>'summary'), ''),
    nullif(p_payload->>'start_at', '')::timestamptz,
    nullif(p_payload->>'end_at', '')::timestamptz
  )
  RETURNING id INTO v_id;

  INSERT INTO public.agreement_versions (
    agreement_id, version_number, content, created_by, change_note
  ) VALUES (
    v_id, 1, v_content, v_actor, 'Initial version'
  )
  RETURNING id INTO v_version;

  UPDATE public.agreements SET current_version_id = v_version WHERE id = v_id;

  FOR v_party IN SELECT value FROM jsonb_array_elements(coalesce(p_payload->'parties', '[]'::jsonb))
  LOOP
    v_order := v_order + 1;
    INSERT INTO public.agreement_parties (
      agreement_id, party_kind, display_name, legal_name, profile_id,
      role_in_agreement, contact, representative_name, representative_title, snapshot, sort_order
    ) VALUES (
      v_id,
      coalesce(nullif(v_party->>'kind', ''), 'external_organization'),
      coalesce(nullif(trim(v_party->>'display_name'), ''), 'Party'),
      nullif(v_party->>'legal_name', ''),
      nullif(v_party->>'profile_id', '')::uuid,
      nullif(v_party->>'role', ''),
      nullif(v_party->>'contact', ''),
      nullif(v_party->>'representative_name', ''),
      nullif(v_party->>'representative_title', ''),
      v_party,
      v_order
    )
    RETURNING id INTO v_party_id;

    INSERT INTO public.agreement_signatories (
      agreement_id, party_id, profile_id, kind, display_name, title_snapshot
    ) VALUES (
      v_id,
      v_party_id,
      nullif(v_party->>'signatory_profile_id', v_party->>'profile_id')::uuid,
      'required',
      coalesce(nullif(v_party->>'representative_name', ''), nullif(v_party->>'display_name', '')),
      nullif(v_party->>'representative_title', '')
    );
  END LOOP;

  FOR v_related IN SELECT value FROM jsonb_array_elements(coalesce(p_payload->'related', '[]'::jsonb))
  LOOP
    INSERT INTO public.agreement_relationships (
      agreement_id, entity_type, entity_id, label_snapshot
    ) VALUES (
      v_id,
      coalesce(nullif(v_related->>'entity_type', ''), 'program'),
      nullif(v_related->>'entity_id', '')::uuid,
      coalesce(nullif(v_related->>'label', ''), 'Related activity')
    );
  END LOOP;

  PERFORM public.agreement_append_event(v_id, 'created', v_version, NULL, jsonb_build_object('title', v_title));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_collaboration_agreement_draft(
  p_agreement_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.agreements%ROWTYPE;
  v_version public.agreement_versions%ROWTYPE;
  v_content jsonb;
BEGIN
  IF NOT public.can_edit_agreement(p_agreement_id) THEN
    RAISE EXCEPTION 'Not allowed to edit this agreement';
  END IF;
  SELECT * INTO r FROM public.agreements WHERE id = p_agreement_id FOR UPDATE;
  SELECT * INTO v_version FROM public.agreement_versions WHERE id = r.current_version_id FOR UPDATE;
  IF v_version.locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'This version is locked';
  END IF;

  v_content := coalesce(p_payload->'content', v_version.content);
  UPDATE public.agreements
  SET
    title = coalesce(nullif(trim(p_payload->>'title'), ''), title),
    summary = coalesce(p_payload->>'summary', summary),
    agreement_type = coalesce(nullif(p_payload->>'agreement_type', ''), agreement_type),
    effective_at = COALESCE(nullif(p_payload->>'start_at', '')::timestamptz, effective_at),
    end_at = COALESCE(nullif(p_payload->>'end_at', '')::timestamptz, end_at),
    body_markdown = coalesce(v_content->>'purpose', body_markdown)
  WHERE id = p_agreement_id;

  UPDATE public.agreement_versions
  SET content = v_content, change_note = coalesce(p_payload->>'change_note', change_note)
  WHERE id = v_version.id;

  PERFORM public.agreement_append_event(p_agreement_id, 'edited', v_version.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_next_agreement_version(
  p_agreement_id uuid,
  p_change_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.agreements%ROWTYPE;
  v_prev public.agreement_versions%ROWTYPE;
  v_new uuid;
  v_num integer;
BEGIN
  IF NOT public.can_access_agreement(p_agreement_id) THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;
  SELECT * INTO r FROM public.agreements WHERE id = p_agreement_id FOR UPDATE;
  IF r.status IN ('signed', 'active', 'completed', 'terminated') THEN
    RAISE EXCEPTION 'Create an amendment instead of editing an executed agreement';
  END IF;
  IF r.initiator_profile_id <> public.current_profile_id()
     AND r.owner_profile_id <> public.current_profile_id()
     AND NOT public.current_profile_manages_publisher(r.owner_profile_id)
     AND NOT public.has_permission('settings.manage') THEN
    RAISE EXCEPTION 'Not allowed to create a version';
  END IF;

  SELECT * INTO v_prev FROM public.agreement_versions WHERE id = r.current_version_id;
  v_num := coalesce(v_prev.version_number, 0) + 1;

  IF r.status IN ('proposed', 'partially_signed') THEN
    UPDATE public.agreement_signatures SET status = 'declined'
    WHERE version_id = r.current_version_id AND status = 'signed';
    DELETE FROM public.agreement_signatures WHERE version_id = r.current_version_id;
    PERFORM public.agreement_append_event(p_agreement_id, 'signing_superseded', r.current_version_id);
    r.status := 'draft';
  END IF;

  INSERT INTO public.agreement_versions (
    agreement_id, version_number, content, created_by, change_note,
    parties_snapshot, signatories_snapshot, attachments_snapshot
  ) VALUES (
    p_agreement_id, v_num, coalesce(v_prev.content, '{}'::jsonb), public.current_profile_id(),
    p_change_note, coalesce(v_prev.parties_snapshot, '[]'::jsonb),
    coalesce(v_prev.signatories_snapshot, '[]'::jsonb),
    coalesce(v_prev.attachments_snapshot, '[]'::jsonb)
  )
  RETURNING id INTO v_new;

  UPDATE public.agreements
  SET current_version_id = v_new, status = 'draft'
  WHERE id = p_agreement_id;

  PERFORM public.agreement_append_event(p_agreement_id, 'version_created', v_new, NULL,
    jsonb_build_object('version', v_num, 'note', p_change_note));
  RETURN v_new;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_agreement_review(p_agreement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.agreements%ROWTYPE;
  rec record;
BEGIN
  IF NOT public.can_edit_agreement(p_agreement_id) AND NOT public.can_access_agreement(p_agreement_id) THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;
  SELECT * INTO r FROM public.agreements WHERE id = p_agreement_id FOR UPDATE;
  IF r.status NOT IN ('draft', 'in_review') THEN
    RAISE EXCEPTION 'Invalid agreement status transition: % → in_review', r.status;
  END IF;
  UPDATE public.agreements SET status = 'in_review' WHERE id = p_agreement_id;
  PERFORM public.agreement_append_event(p_agreement_id, 'review_requested', r.current_version_id);
  FOR rec IN
    SELECT DISTINCT coalesce(s.profile_id, p.profile_id) AS pid
    FROM public.agreement_parties p
    LEFT JOIN public.agreement_signatories s ON s.party_id = p.id
    WHERE p.agreement_id = p_agreement_id
  LOOP
    PERFORM public.agreement_notify(rec.pid, 'agreement.review', 'Review requested',
      coalesce(r.title, 'An agreement') || ' is ready for review.', p_agreement_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_agreement_review_note(
  p_agreement_id uuid,
  p_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.agreements%ROWTYPE;
BEGIN
  IF NOT public.can_access_agreement(p_agreement_id) THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;
  IF p_body IS NULL OR char_length(trim(p_body)) < 1 THEN
    RAISE EXCEPTION 'Review note is required';
  END IF;
  SELECT * INTO r FROM public.agreements WHERE id = p_agreement_id;
  INSERT INTO public.agreement_review_notes (agreement_id, version_id, author_profile_id, body)
  VALUES (p_agreement_id, r.current_version_id, public.current_profile_id(), trim(p_body));
  PERFORM public.agreement_append_event(p_agreement_id, 'change_requested', r.current_version_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.propose_agreement_version(p_agreement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.agreements%ROWTYPE;
  v_hash text;
  rec record;
BEGIN
  SELECT * INTO r FROM public.agreements WHERE id = p_agreement_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_agreement(p_agreement_id) THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;
  IF r.status NOT IN ('draft', 'in_review', 'withdrawn') THEN
    RAISE EXCEPTION 'Invalid agreement status transition: % → proposed', r.status;
  END IF;
  IF r.initiator_profile_id <> public.current_profile_id()
     AND r.owner_profile_id <> public.current_profile_id()
     AND NOT public.current_profile_manages_publisher(r.owner_profile_id)
     AND NOT public.has_permission('settings.manage') THEN
    RAISE EXCEPTION 'Not allowed to propose this agreement';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agreement_signatories s WHERE s.agreement_id = p_agreement_id AND s.kind = 'required') THEN
    RAISE EXCEPTION 'At least one required signatory is needed';
  END IF;

  v_hash := public.agreement_lock_version(p_agreement_id, r.current_version_id);
  UPDATE public.agreements SET status = 'proposed' WHERE id = p_agreement_id;
  PERFORM public.agreement_append_event(p_agreement_id, 'proposed', r.current_version_id, NULL,
    jsonb_build_object('fingerprint', v_hash));
  PERFORM public.agreement_append_event(p_agreement_id, 'version_locked', r.current_version_id);

  FOR rec IN
    SELECT s.profile_id, p.display_name
    FROM public.agreement_signatories s
    JOIN public.agreement_parties p ON p.id = s.party_id
    WHERE s.agreement_id = p_agreement_id AND s.kind = 'required'
  LOOP
    PERFORM public.agreement_notify(rec.profile_id, 'agreement.signature_required',
      'Signature required', coalesce(r.title, 'An agreement') || ' is ready for your signature.', p_agreement_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_agreement_proposal(p_agreement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.agreements%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.agreements WHERE id = p_agreement_id FOR UPDATE;
  IF r.initiator_profile_id <> public.current_profile_id()
     AND r.owner_profile_id <> public.current_profile_id()
     AND NOT public.has_permission('settings.manage') THEN
    RAISE EXCEPTION 'Not allowed to withdraw this proposal';
  END IF;
  IF r.status NOT IN ('proposed', 'partially_signed', 'in_review') THEN
    RAISE EXCEPTION 'Invalid agreement status transition: % → withdrawn', r.status;
  END IF;
  DELETE FROM public.agreement_signatures WHERE version_id = r.current_version_id;
  UPDATE public.agreements SET status = 'withdrawn' WHERE id = p_agreement_id;
  PERFORM public.agreement_append_event(p_agreement_id, 'proposal_withdrawn', r.current_version_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.sign_agreement_version(
  p_agreement_id uuid,
  p_signatory_id uuid,
  p_signer_name text,
  p_electronic_records_consent boolean,
  p_electronic_signature_consent boolean,
  p_authority_attested boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.agreements%ROWTYPE;
  v_version public.agreement_versions%ROWTYPE;
  v_sig public.agreement_signatories%ROWTYPE;
  v_party public.agreement_parties%ROWTYPE;
  v_actor uuid;
  v_required integer;
  v_signed integer;
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_electronic_records_consent IS NOT TRUE OR p_electronic_signature_consent IS NOT TRUE THEN
    RAISE EXCEPTION 'Electronic records and signature consent are required';
  END IF;
  IF p_signer_name IS NULL OR char_length(trim(p_signer_name)) < 2 THEN
    RAISE EXCEPTION 'Full name is required to sign';
  END IF;

  v_actor := public.current_profile_id();
  SELECT * INTO r FROM public.agreements WHERE id = p_agreement_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_access_agreement(p_agreement_id) THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;
  IF r.status NOT IN ('proposed', 'partially_signed') THEN
    RAISE EXCEPTION 'This agreement is not open for signing';
  END IF;

  SELECT * INTO v_version FROM public.agreement_versions WHERE id = r.current_version_id FOR UPDATE;
  IF v_version.locked_at IS NULL OR v_version.fingerprint IS NULL THEN
    RAISE EXCEPTION 'This version is not locked for signing';
  END IF;

  SELECT * INTO v_sig FROM public.agreement_signatories WHERE id = p_signatory_id AND agreement_id = p_agreement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signatory not found';
  END IF;
  SELECT * INTO v_party FROM public.agreement_parties WHERE id = v_sig.party_id;

  IF v_sig.profile_id IS NOT NULL AND v_sig.profile_id <> v_actor AND NOT public.current_profile_manages_publisher(v_sig.profile_id) THEN
    RAISE EXCEPTION 'You are not the assigned signatory';
  END IF;
  IF v_sig.profile_id IS NULL AND v_party.profile_id IS NOT NULL
     AND v_party.profile_id <> v_actor
     AND NOT public.current_profile_manages_publisher(v_party.profile_id) THEN
    RAISE EXCEPTION 'You are not authorized to sign for this party';
  END IF;
  IF v_party.party_kind IN ('civizen_organization', 'external_organization') THEN
    IF p_authority_attested IS NOT TRUE THEN
      RAISE EXCEPTION 'You must attest that you are authorized to sign for this organization';
    END IF;
    IF v_party.profile_id IS NOT NULL
       AND NOT public.current_profile_manages_publisher(v_party.profile_id)
       AND NOT public.has_permission('agreements.sign_org')
       AND v_sig.profile_id IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'You are not authorized to sign for this organization';
    END IF;
  END IF;
  IF v_party.party_kind LIKE 'external%' AND v_sig.profile_id IS NULL AND v_party.profile_id IS NULL THEN
    RAISE EXCEPTION 'External parties cannot sign natively until they have a Civizen identity';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.agreement_signatures s
    WHERE s.version_id = v_version.id AND s.signatory_id = v_sig.id AND s.status = 'signed'
  ) THEN
    RAISE EXCEPTION 'This signatory already signed this version';
  END IF;

  INSERT INTO public.agreement_signatures (
    agreement_id, version_id, signatory_id, party_id, signer_profile_id, signer_user_id,
    signer_name_snapshot, representative_title_snapshot, party_name_snapshot, role_snapshot,
    fingerprint, signing_method, electronic_records_consent, electronic_signature_consent,
    authority_attested, status, metadata
  ) VALUES (
    p_agreement_id, v_version.id, v_sig.id, v_party.id, v_actor, auth.uid(),
    trim(p_signer_name), v_sig.title_snapshot, v_party.display_name, v_party.role_in_agreement,
    v_version.fingerprint, 'native_electronic', true, true, coalesce(p_authority_attested, false),
    'signed',
    jsonb_build_object(
      'party_kind', v_party.party_kind,
      'signatory_kind', v_sig.kind,
      'version_number', v_version.version_number
    )
  );

  PERFORM public.agreement_append_event(p_agreement_id, 'signature_completed', v_version.id, v_party.id);

  SELECT count(*) INTO v_required
  FROM public.agreement_signatories WHERE agreement_id = p_agreement_id AND kind = 'required';
  SELECT count(*) INTO v_signed
  FROM public.agreement_signatures sig
  JOIN public.agreement_signatories s ON s.id = sig.signatory_id
  WHERE sig.version_id = v_version.id AND sig.status = 'signed' AND s.kind = 'required';

  IF v_signed >= v_required AND v_required > 0 THEN
    v_status := 'signed';
    UPDATE public.agreements
    SET status = 'signed', executed_version_id = v_version.id,
        execution_method = 'native_electronic', executed_at = now()
    WHERE id = p_agreement_id;
    PERFORM public.agreement_append_event(p_agreement_id, 'fully_signed', v_version.id);
    IF r.effective_at IS NULL OR r.effective_at <= now() THEN
      UPDATE public.agreements SET status = 'active', activated_at = now() WHERE id = p_agreement_id;
      PERFORM public.agreement_append_event(p_agreement_id, 'activated', v_version.id);
      v_status := 'active';
    END IF;
    PERFORM public.agreement_append_event(p_agreement_id, 'final_pdf_generated', v_version.id);
  ELSE
    UPDATE public.agreements SET status = 'partially_signed' WHERE id = p_agreement_id AND status = 'proposed';
    v_status := 'partially_signed';
  END IF;

  PERFORM public.agreement_notify(
    r.owner_profile_id,
    CASE WHEN v_status IN ('signed', 'active') THEN 'agreement.fully_signed' ELSE 'agreement.counterparty_signed' END,
    CASE WHEN v_status IN ('signed', 'active') THEN 'Agreement signed' ELSE 'A party signed' END,
    coalesce(r.title, 'An agreement') || ' was updated.',
    p_agreement_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_agreement_external_execution(
  p_agreement_id uuid,
  p_method text,
  p_executed_at timestamptz,
  p_note text,
  p_file_path text,
  p_file_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.agreements%ROWTYPE;
  v_hash text;
BEGIN
  SELECT * INTO r FROM public.agreements WHERE id = p_agreement_id FOR UPDATE;
  IF NOT public.can_access_agreement(p_agreement_id) THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;
  IF r.initiator_profile_id <> public.current_profile_id()
     AND r.owner_profile_id <> public.current_profile_id()
     AND NOT public.current_profile_manages_publisher(r.owner_profile_id)
     AND NOT public.has_permission('settings.manage') THEN
    RAISE EXCEPTION 'Not allowed to record external execution';
  END IF;
  IF r.status IN ('signed', 'active', 'completed', 'terminated') THEN
    RAISE EXCEPTION 'This agreement is already executed';
  END IF;
  IF p_file_path IS NULL OR p_file_name IS NULL THEN
    RAISE EXCEPTION 'An executed document is required';
  END IF;
  IF p_method NOT IN ('paper', 'external_electronic', 'other') THEN
    RAISE EXCEPTION 'Invalid execution method';
  END IF;

  IF r.current_version_id IS NOT NULL THEN
    SELECT locked_at INTO v_hash FROM public.agreement_versions WHERE id = r.current_version_id;
    IF v_hash IS NULL THEN
      PERFORM public.agreement_lock_version(p_agreement_id, r.current_version_id);
    END IF;
  END IF;

  INSERT INTO public.agreement_attachments (
    agreement_id, version_id, kind, file_path, file_name, uploaded_by
  ) VALUES (
    p_agreement_id, r.current_version_id, 'executed_external', p_file_path, p_file_name, public.current_profile_id()
  );

  UPDATE public.agreements
  SET
    status = 'signed',
    executed_version_id = current_version_id,
    execution_method = p_method,
    executed_at = coalesce(p_executed_at, now())
  WHERE id = p_agreement_id;

  PERFORM public.agreement_append_event(
    p_agreement_id, 'external_execution_recorded', r.current_version_id, NULL,
    jsonb_build_object('method', p_method, 'note', p_note, 'file', p_file_name)
  );
  PERFORM public.agreement_append_event(p_agreement_id, 'fully_signed', r.current_version_id);

  SELECT * INTO r FROM public.agreements WHERE id = p_agreement_id;
  IF r.effective_at IS NULL OR r.effective_at <= now() THEN
    UPDATE public.agreements SET status = 'active', activated_at = now() WHERE id = p_agreement_id;
    PERFORM public.agreement_append_event(p_agreement_id, 'activated', r.current_version_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_agreement(p_agreement_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.agreements%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.agreements WHERE id = p_agreement_id FOR UPDATE;
  IF r.status NOT IN ('active', 'signed') THEN
    RAISE EXCEPTION 'Invalid agreement status transition: % → completed', r.status;
  END IF;
  IF r.owner_profile_id <> public.current_profile_id()
     AND r.initiator_profile_id <> public.current_profile_id()
     AND NOT public.has_permission('settings.manage') THEN
    RAISE EXCEPTION 'Not allowed to complete this agreement';
  END IF;
  UPDATE public.agreements SET status = 'completed', completed_at = now() WHERE id = p_agreement_id;
  PERFORM public.agreement_append_event(p_agreement_id, 'completed', r.executed_version_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.terminate_agreement(p_agreement_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.agreements%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.agreements WHERE id = p_agreement_id FOR UPDATE;
  IF r.status NOT IN ('signed', 'active') THEN
    RAISE EXCEPTION 'Invalid agreement status transition: % → terminated', r.status;
  END IF;
  IF r.owner_profile_id <> public.current_profile_id()
     AND r.initiator_profile_id <> public.current_profile_id()
     AND NOT public.has_permission('settings.manage') THEN
    RAISE EXCEPTION 'Not allowed to terminate this agreement';
  END IF;
  UPDATE public.agreements
  SET status = 'terminated', terminated_at = now(), termination_reason = nullif(trim(p_reason), '')
  WHERE id = p_agreement_id;
  PERFORM public.agreement_append_event(p_agreement_id, 'terminated', r.executed_version_id, NULL,
    jsonb_build_object('reason', p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.create_agreement_amendment(p_agreement_id uuid, p_title text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.agreements%ROWTYPE;
  v_id uuid;
  v_party record;
BEGIN
  SELECT * INTO r FROM public.agreements WHERE id = p_agreement_id;
  IF NOT public.can_access_agreement(p_agreement_id) THEN
    RAISE EXCEPTION 'Agreement not found';
  END IF;
  IF r.status NOT IN ('signed', 'active', 'completed') THEN
    RAISE EXCEPTION 'Amendments require an executed agreement';
  END IF;

  v_id := public.create_collaboration_agreement(jsonb_build_object(
    'title', coalesce(nullif(trim(p_title), ''), 'Amendment to ' || coalesce(r.title, r.reference_code)),
    'agreement_type', 'amendment',
    'summary', 'Amendment to ' || coalesce(r.reference_code, r.title),
    'content', jsonb_build_object(
      'purpose', 'This amendment modifies ' || coalesce(r.reference_code, r.title) || ' without changing the executed original.',
      'sections', jsonb_build_array(
        jsonb_build_object('id', 'original', 'title', 'Original agreement', 'body', coalesce(r.reference_code, '')),
        jsonb_build_object('id', 'changes', 'title', 'Changes', 'body', ''),
        jsonb_build_object('id', 'effect', 'title', 'Effect', 'body', '')
      )
    ),
    'related', jsonb_build_array(jsonb_build_object(
      'entity_type', 'agreement', 'entity_id', r.id, 'label', coalesce(r.reference_code, r.title)
    ))
  ));

  UPDATE public.agreements SET amends_agreement_id = p_agreement_id WHERE id = v_id;
  DELETE FROM public.agreement_parties WHERE agreement_id = v_id;
  DELETE FROM public.agreement_signatories WHERE agreement_id = v_id;

  FOR v_party IN SELECT * FROM public.agreement_parties WHERE agreement_id = p_agreement_id ORDER BY sort_order
  LOOP
    INSERT INTO public.agreement_parties (
      agreement_id, party_kind, display_name, legal_name, profile_id, role_in_agreement,
      contact, representative_name, representative_title, snapshot, sort_order
    )
    SELECT v_id, party_kind, display_name, legal_name, profile_id, role_in_agreement,
      contact, representative_name, representative_title, snapshot, sort_order
    FROM public.agreement_parties WHERE id = v_party.id;
  END LOOP;

  INSERT INTO public.agreement_signatories (agreement_id, party_id, profile_id, kind, display_name, title_snapshot)
  SELECT v_id, np.id, s.profile_id, s.kind, s.display_name, s.title_snapshot
  FROM public.agreement_signatories s
  JOIN public.agreement_parties op ON op.id = s.party_id
  JOIN public.agreement_parties np ON np.agreement_id = v_id AND np.display_name = op.display_name AND np.sort_order = op.sort_order
  WHERE s.agreement_id = p_agreement_id;

  PERFORM public.agreement_append_event(p_agreement_id, 'amendment_created', NULL, NULL, jsonb_build_object('amendment_id', v_id));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_accessible_agreements()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := public.current_profile_id();
  v_result jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      a.id,
      a.reference_code,
      coalesce(a.title, a.listing_title_snapshot, 'Agreement') AS title,
      a.agreement_type,
      a.status,
      a.summary,
      a.market_listing_id,
      a.created_at,
      a.effective_at,
      a.end_at,
      a.execution_method,
      (
        a.status IN ('draft') AND (a.owner_profile_id = v_actor OR a.initiator_profile_id = v_actor)
      ) OR (
        a.status IN ('in_review') AND public.can_access_agreement(a.id)
      ) OR (
        a.status IN ('proposed', 'partially_signed', 'pending_counterparty')
        AND (
          EXISTS (
            SELECT 1 FROM public.agreement_signatories s
            WHERE s.agreement_id = a.id AND s.kind = 'required' AND s.profile_id = v_actor
              AND NOT EXISTS (
                SELECT 1 FROM public.agreement_signatures sig
                WHERE sig.signatory_id = s.id AND sig.version_id = a.current_version_id AND sig.status = 'signed'
              )
          )
          OR (a.buyer_profile_id = v_actor AND a.buyer_signed_at IS NULL)
          OR (a.seller_profile_id = v_actor AND a.seller_signed_at IS NULL)
        )
      ) AS needs_action,
      (
        SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'displayName', p.display_name) ORDER BY p.sort_order), '[]'::jsonb)
        FROM public.agreement_parties p WHERE p.agreement_id = a.id
      ) AS parties
    FROM public.agreements a
    WHERE public.can_access_agreement(a.id)
  ) x;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_agreement_detail(p_agreement_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.agreements%ROWTYPE;
BEGIN
  IF NOT public.can_access_agreement(p_agreement_id) THEN
    RETURN NULL;
  END IF;
  SELECT * INTO r FROM public.agreements WHERE id = p_agreement_id;
  RETURN jsonb_build_object(
    'agreement', to_jsonb(r),
    'parties', (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.sort_order), '[]'::jsonb) FROM public.agreement_parties p WHERE p.agreement_id = p_agreement_id),
    'versions', (SELECT coalesce(jsonb_agg(to_jsonb(v) ORDER BY v.version_number), '[]'::jsonb) FROM public.agreement_versions v WHERE v.agreement_id = p_agreement_id),
    'signatories', (SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.created_at), '[]'::jsonb) FROM public.agreement_signatories s WHERE s.agreement_id = p_agreement_id),
    'signatures', (SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.signed_at), '[]'::jsonb) FROM public.agreement_signatures s WHERE s.agreement_id = p_agreement_id),
    'relationships', (SELECT coalesce(jsonb_agg(to_jsonb(rel) ORDER BY rel.created_at), '[]'::jsonb) FROM public.agreement_relationships rel WHERE rel.agreement_id = p_agreement_id),
    'attachments', (SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.created_at), '[]'::jsonb) FROM public.agreement_attachments a WHERE a.agreement_id = p_agreement_id),
    'notes', (SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY n.created_at), '[]'::jsonb) FROM public.agreement_review_notes n WHERE n.agreement_id = p_agreement_id),
    'events', (SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.created_at), '[]'::jsonb) FROM public.agreement_events e WHERE e.agreement_id = p_agreement_id),
    'amendments', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', am.id, 'title', am.title, 'status', am.status, 'referenceCode', am.reference_code
      ) ORDER BY am.created_at), '[]'::jsonb)
      FROM public.agreements am WHERE am.amends_agreement_id = p_agreement_id
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_agreements_for_entity(p_entity_type text, p_entity_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id,
      'title', coalesce(a.title, a.listing_title_snapshot),
      'status', a.status,
      'referenceCode', a.reference_code,
      'agreementType', a.agreement_type
    ) ORDER BY a.created_at DESC), '[]'::jsonb)
    FROM public.agreement_relationships rel
    JOIN public.agreements a ON a.id = rel.agreement_id
    WHERE rel.entity_type = p_entity_type
      AND rel.entity_id = p_entity_id
      AND public.can_access_agreement(a.id)
  );
END;
$$;

-- Keep Market listing creation on the same identity table.
CREATE OR REPLACE FUNCTION public.create_agreement_from_listing(
  p_market_listing_id uuid,
  p_template_key text DEFAULT 'product'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid;
  v_seller uuid;
  v_title text;
  v_price bigint;
  v_kind text;
  v_body text;
  v_tid text;
  v_new_id uuid;
  v_type text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_tid := lower(trim(p_template_key));
  IF v_tid NOT IN ('core', 'product', 'service') THEN
    RAISE EXCEPTION 'Invalid template key';
  END IF;

  SELECT p.id INTO v_buyer FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1;
  IF v_buyer IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT ml.seller_profile_id, trim(ml.title), ml.price_lumens, coalesce(ml.listing_kind::text, 'product')
  INTO v_seller, v_title, v_price, v_kind
  FROM public.market_listings ml
  WHERE ml.id = p_market_listing_id AND ml.status = 'published';

  IF v_seller IS NULL OR v_title IS NULL THEN
    RAISE EXCEPTION 'Listing not available';
  END IF;
  IF v_buyer = v_seller THEN
    RAISE EXCEPTION 'Cannot create agreement with yourself';
  END IF;

  v_body := public.build_default_agreement_body_markdown(v_tid, v_title, coalesce(v_price, 0), v_kind);
  v_type := CASE v_tid WHEN 'service' THEN 'market_service' WHEN 'core' THEN 'market_core' ELSE 'market_product' END;

  INSERT INTO public.agreements (
    market_listing_id, initiator_profile_id, owner_profile_id, buyer_profile_id, seller_profile_id,
    template_key, listing_title_snapshot, listing_price_lumens_snapshot, listing_kind_snapshot,
    body_markdown, status, title, agreement_type, summary, reference_code
  ) VALUES (
    p_market_listing_id, v_buyer, v_buyer, v_buyer, v_seller,
    v_tid, v_title, coalesce(v_price, 0), v_kind,
    v_body, 'draft', v_title, v_type, v_title, public.agreement_next_reference()
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.agreement_relationships (agreement_id, entity_type, entity_id, label_snapshot)
  VALUES (v_new_id, 'market_listing', p_market_listing_id, v_title);

  PERFORM public.agreement_append_event(v_new_id, 'created', NULL, NULL, jsonb_build_object('source', 'market_listing'));
  RETURN v_new_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Agreement parties can read" ON public.agreements;
CREATE POLICY "Agreement parties can read"
  ON public.agreements FOR SELECT TO authenticated
  USING (public.can_access_agreement(id));

ALTER TABLE public.agreement_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_signatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_review_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY agreement_parties_select ON public.agreement_parties
  FOR SELECT TO authenticated USING (public.can_access_agreement(agreement_id));
CREATE POLICY agreement_versions_select ON public.agreement_versions
  FOR SELECT TO authenticated USING (public.can_access_agreement(agreement_id));
CREATE POLICY agreement_signatories_select ON public.agreement_signatories
  FOR SELECT TO authenticated USING (public.can_access_agreement(agreement_id));
CREATE POLICY agreement_signatures_select ON public.agreement_signatures
  FOR SELECT TO authenticated USING (public.can_access_agreement(agreement_id));
CREATE POLICY agreement_relationships_select ON public.agreement_relationships
  FOR SELECT TO authenticated USING (public.can_access_agreement(agreement_id));
CREATE POLICY agreement_attachments_select ON public.agreement_attachments
  FOR SELECT TO authenticated USING (public.can_access_agreement(agreement_id));
CREATE POLICY agreement_review_notes_select ON public.agreement_review_notes
  FOR SELECT TO authenticated USING (public.can_access_agreement(agreement_id));
CREATE POLICY agreement_events_select ON public.agreement_events
  FOR SELECT TO authenticated USING (public.can_access_agreement(agreement_id));

CREATE POLICY user_notifications_own_select ON public.user_notifications
  FOR SELECT TO authenticated
  USING (recipient_profile_id = public.current_profile_id());
CREATE POLICY user_notifications_own_update ON public.user_notifications
  FOR UPDATE TO authenticated
  USING (recipient_profile_id = public.current_profile_id())
  WITH CHECK (recipient_profile_id = public.current_profile_id());

GRANT SELECT ON public.agreement_parties TO authenticated;
GRANT SELECT ON public.agreement_versions TO authenticated;
GRANT SELECT ON public.agreement_signatories TO authenticated;
GRANT SELECT ON public.agreement_signatures TO authenticated;
GRANT SELECT ON public.agreement_relationships TO authenticated;
GRANT SELECT ON public.agreement_attachments TO authenticated;
GRANT SELECT ON public.agreement_review_notes TO authenticated;
GRANT SELECT ON public.agreement_events TO authenticated;
GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;

GRANT EXECUTE ON FUNCTION public.can_access_agreement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_agreement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_collaboration_agreement(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_collaboration_agreement_draft(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_next_agreement_version(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_agreement_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_agreement_review_note(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.propose_agreement_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_agreement_proposal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sign_agreement_version(uuid, uuid, text, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_agreement_external_execution(uuid, text, timestamptz, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_agreement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.terminate_agreement(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_agreement_amendment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_accessible_agreements() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_agreement_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_agreements_for_entity(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_agreement_from_listing(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Agreement files read entitled" ON storage.objects;
DROP POLICY IF EXISTS "Agreement files insert entitled" ON storage.objects;

CREATE POLICY "Agreement files read entitled"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'agreement-files'
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.can_access_agreement(split_part(name, '/', 1)::uuid)
);

CREATE POLICY "Agreement files insert entitled"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'agreement-files'
  AND split_part(name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND public.can_access_agreement(split_part(name, '/', 1)::uuid)
);
