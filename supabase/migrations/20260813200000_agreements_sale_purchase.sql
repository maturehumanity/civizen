-- Sale / Purchase Agreement type on the existing agreements identity.

ALTER TABLE public.agreements DROP CONSTRAINT IF EXISTS agreements_type_check;
ALTER TABLE public.agreements
  ADD CONSTRAINT agreements_type_check CHECK (
    agreement_type IS NULL OR agreement_type IN (
      'general', 'mou', 'partnership', 'pilot', 'program', 'funding',
      'service_contribution', 'sale_purchase', 'data_research', 'nda',
      'amendment', 'other',
      'market_core', 'market_product', 'market_service'
    )
  );

CREATE OR REPLACE FUNCTION public.agreement_type_is_allowed(p_type text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_type IN (
    'general', 'mou', 'partnership', 'pilot', 'program', 'funding',
    'service_contribution', 'sale_purchase', 'data_research', 'nda',
    'amendment', 'other', 'market_core', 'market_product', 'market_service'
  );
$$;

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
