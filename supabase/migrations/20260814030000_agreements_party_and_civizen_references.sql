-- Party/custom reference (editable) plus Civizen AGR assigned on first signature.

ALTER TABLE public.agreements
  ADD COLUMN IF NOT EXISTS party_reference text;

CREATE OR REPLACE FUNCTION public.agreement_sanitize_party_reference(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(upper(regexp_replace(trim(coalesce(p_value, '')), '[^A-Za-z0-9-]', '', 'g')), '');
$$;

CREATE OR REPLACE FUNCTION public.ensure_agreement_civizen_reference(p_agreement_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
BEGIN
  SELECT reference_code INTO v_code
  FROM public.agreements
  WHERE id = p_agreement_id
  FOR UPDATE;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  v_code := public.agreement_next_reference();
  UPDATE public.agreements
  SET reference_code = v_code
  WHERE id = p_agreement_id;
  RETURN v_code;
END;
$$;

UPDATE public.agreements
SET party_reference = reference_code
WHERE party_reference IS NULL
  AND reference_code IS NOT NULL
  AND reference_code !~ '^AGR-[0-9]{4}-[0-9]+$';

UPDATE public.agreements
SET reference_code = NULL
WHERE status IN ('draft', 'in_review', 'withdrawn', 'declined', 'cancelled')
  AND reference_code IS NOT NULL
  AND reference_code !~ '^AGR-[0-9]{4}-[0-9]+$';

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
  IF NOT public.agreement_type_is_allowed(v_type) OR v_type IN ('market_core', 'market_product', 'market_service') THEN
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
    party_reference,
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
    NULL,
    public.agreement_sanitize_party_reference(p_payload->>'party_reference'),
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
    body_markdown = coalesce(v_content->>'purpose', body_markdown),
    party_reference = CASE
      WHEN p_payload ? 'party_reference' THEN public.agreement_sanitize_party_reference(p_payload->>'party_reference')
      ELSE party_reference
    END
  WHERE id = p_agreement_id;

  UPDATE public.agreement_versions
  SET content = v_content, change_note = coalesce(p_payload->>'change_note', change_note)
  WHERE id = v_version.id;

  PERFORM public.agreement_append_event(p_agreement_id, 'edited', v_version.id);
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

  PERFORM public.ensure_agreement_civizen_reference(p_agreement_id);
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

  PERFORM public.ensure_agreement_civizen_reference(p_agreement_id);

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
      a.party_reference,
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
  v_tid text;
  v_new_id uuid;
  v_type text;
  v_body text;
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
    v_body, 'draft', v_title, v_type, v_title, NULL
  )
  RETURNING id INTO v_new_id;

  INSERT INTO public.agreement_relationships (agreement_id, entity_type, entity_id, label_snapshot)
  VALUES (v_new_id, 'market_listing', p_market_listing_id, v_title);

  PERFORM public.agreement_append_event(v_new_id, 'created', NULL, NULL, jsonb_build_object('source', 'market_listing'));
  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.agreement_sanitize_party_reference(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_agreement_civizen_reference(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_collaboration_agreement(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_collaboration_agreement_draft(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sign_agreement_version(uuid, uuid, text, boolean, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_agreement_external_execution(uuid, text, timestamptz, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_accessible_agreements() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_agreement_from_listing(uuid, text) TO authenticated;
