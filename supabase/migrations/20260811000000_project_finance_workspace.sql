-- Project finance workspace v1: versioned budget + funding-source ledger (minor units).
-- Separate from legacy capital ledger (funders / funding_commitments).
-- Authz reuses public.can_manage_funding_ledger().

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finance_require_manager()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.can_manage_funding_ledger() THEN
    RAISE EXCEPTION 'not authorized to manage project finance';
  END IF;
  RETURN uid;
END;
$$;

REVOKE ALL ON FUNCTION public.finance_require_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_require_manager() TO authenticated;

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
BEGIN
  INSERT INTO public.finance_audit_events (event_type, entity_type, entity_id, payload, actor_user_id)
  VALUES (p_event_type, p_entity_type, p_entity_id, COALESCE(p_payload, '{}'::jsonb), p_actor)
  RETURNING id INTO eid;
  RETURN eid;
END;
$$;

-- Created after audit table exists; redefined below after CREATE TABLE.

-- ---------------------------------------------------------------------------
-- Budget
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.project_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  purpose text,
  currency text NOT NULL DEFAULT 'USD' CHECK (char_length(trim(currency)) = 3),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  lifecycle_status text NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_status IN ('draft', 'under_review', 'approved', 'superseded')),
  period_start date,
  period_end date,
  internal_notes text,
  supersedes_budget_id uuid REFERENCES public.project_budgets(id) ON DELETE SET NULL,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approval_reason text,
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  publication_note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, version)
);

CREATE INDEX IF NOT EXISTS project_budgets_status_idx
  ON public.project_budgets (lifecycle_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.budget_expense_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) > 0),
  description text,
  display_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS budget_expense_groups_budget_idx
  ON public.budget_expense_groups (budget_id, display_order);

CREATE TABLE IF NOT EXISTS public.budget_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.budget_expense_groups(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  description text,
  planned_minor bigint NOT NULL DEFAULT 0 CHECK (planned_minor >= 0),
  committed_minor bigint NOT NULL DEFAULT 0 CHECK (committed_minor >= 0),
  actual_minor bigint NOT NULL DEFAULT 0 CHECK (actual_minor >= 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (char_length(trim(currency)) = 3),
  period_label text,
  owner_label text,
  funding_restriction_tag text,
  public_description text,
  publish_flag boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS budget_line_items_group_idx
  ON public.budget_line_items (group_id, status);

CREATE TABLE IF NOT EXISTS public.budget_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  change_summary text NOT NULL,
  changed_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approval_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS budget_revisions_budget_idx
  ON public.budget_revisions (budget_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.budget_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES public.project_budgets(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('publish', 'unpublish')),
  public_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Funding-source ledger
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.finance_funding_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL CHECK (char_length(trim(display_name)) > 0),
  category text NOT NULL
    CHECK (category IN (
      'government',
      'multilateral',
      'grant',
      'philanthropy',
      'private_capital',
      'contributor',
      'system_revenue',
      'other'
    )),
  jurisdiction text,
  website text,
  internal_owner text,
  relationship_status text NOT NULL DEFAULT 'identified'
    CHECK (relationship_status IN (
      'identified',
      'researching',
      'contact_planned',
      'contacted',
      'engaged',
      'application_or_proposal',
      'due_diligence',
      'decision_pending',
      'committed',
      'declined',
      'paused',
      'closed'
    )),
  requested_minor bigint CHECK (requested_minor IS NULL OR requested_minor >= 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (char_length(trim(currency)) = 3),
  priority integer CHECK (priority IS NULL OR (priority BETWEEN 1 AND 5)),
  probability_pct integer CHECK (probability_pct IS NULL OR (probability_pct BETWEEN 0 AND 100)),
  public_display_name text,
  publish_source boolean NOT NULL DEFAULT false,
  publish_requested_amount boolean NOT NULL DEFAULT false,
  internal_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_funding_sources_status_idx
  ON public.finance_funding_sources (relationship_status, category);

CREATE TABLE IF NOT EXISTS public.finance_source_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.finance_funding_sources(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_at timestamptz NOT NULL DEFAULT now(),
  summary text NOT NULL,
  next_action text,
  next_action_at date,
  private_notes text,
  evidence_ref text,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  corrects_event_id uuid REFERENCES public.finance_source_events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_source_events_source_idx
  ON public.finance_source_events (source_id, event_at DESC);

CREATE TABLE IF NOT EXISTS public.finance_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.finance_funding_sources(id) ON DELETE RESTRICT,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (char_length(trim(currency)) = 3),
  commitment_date date NOT NULL DEFAULT CURRENT_DATE,
  conditional boolean NOT NULL DEFAULT false,
  conditions text,
  restrictions text,
  intended_period text,
  evidence_ref text,
  status text NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'confirmed', 'amended', 'cancelled', 'fulfilled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_commitments_source_idx
  ON public.finance_commitments (source_id, status);

CREATE TABLE IF NOT EXISTS public.finance_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.finance_funding_sources(id) ON DELETE RESTRICT,
  commitment_id uuid REFERENCES public.finance_commitments(id) ON DELETE SET NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (char_length(trim(currency)) = 3),
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  external_reference text,
  evidence_ref text,
  restriction_tag text,
  reverses_receipt_id uuid REFERENCES public.finance_receipts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_receipts_source_idx
  ON public.finance_receipts (source_id, received_date DESC);

CREATE TABLE IF NOT EXISTS public.finance_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.finance_receipts(id) ON DELETE RESTRICT,
  line_item_id uuid NOT NULL REFERENCES public.budget_line_items(id) ON DELETE RESTRICT,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL DEFAULT 'USD' CHECK (char_length(trim(currency)) = 3),
  allocated_at date NOT NULL DEFAULT CURRENT_DATE,
  purpose_note text,
  override_reason text,
  reverses_allocation_id uuid REFERENCES public.finance_allocations(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_allocations_receipt_idx
  ON public.finance_allocations (receipt_id);

CREATE TABLE IF NOT EXISTS public.finance_cost_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  related_receipt_id uuid REFERENCES public.finance_receipts(id) ON DELETE SET NULL,
  related_transaction_ref text,
  liable_party_type text NOT NULL CHECK (liable_party_type IN ('individual', 'legal_entity')),
  liable_legal_entity_name text,
  processor_cost_minor bigint NOT NULL DEFAULT 0 CHECK (processor_cost_minor >= 0),
  audit_cost_minor bigint NOT NULL DEFAULT 0 CHECK (audit_cost_minor >= 0),
  other_allowed_cost_minor bigint NOT NULL DEFAULT 0 CHECK (other_allowed_cost_minor >= 0),
  adjustment_minor bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD' CHECK (char_length(trim(currency)) = 3),
  rule_version text NOT NULL DEFAULT 'cost-recovery-v1',
  assessed_user_fee_minor bigint NOT NULL CHECK (assessed_user_fee_minor >= 0),
  calculation_note text NOT NULL,
  reason text,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT finance_cost_assessments_individual_zero_fee CHECK (
    liable_party_type <> 'individual' OR assessed_user_fee_minor = 0
  ),
  CONSTRAINT finance_cost_assessments_entity_name CHECK (
    liable_party_type <> 'legal_entity'
    OR (liable_legal_entity_name IS NOT NULL AND char_length(trim(liable_legal_entity_name)) > 0)
  )
);

CREATE TABLE IF NOT EXISTS public.finance_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_audit_events_entity_idx
  ON public.finance_audit_events (entity_type, entity_id, created_at DESC);

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
BEGIN
  INSERT INTO public.finance_audit_events (event_type, entity_type, entity_id, payload, actor_user_id)
  VALUES (p_event_type, p_entity_type, p_entity_id, COALESCE(p_payload, '{}'::jsonb), p_actor)
  RETURNING id INTO eid;
  RETURN eid;
END;
$$;

REVOKE ALL ON FUNCTION public.finance_write_audit(text, text, uuid, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_write_audit(text, text, uuid, jsonb, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_expense_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_funding_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_source_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_cost_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_budgets_manager_all ON public.project_budgets
  FOR ALL TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

CREATE POLICY budget_expense_groups_manager_all ON public.budget_expense_groups
  FOR ALL TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

CREATE POLICY budget_line_items_manager_all ON public.budget_line_items
  FOR ALL TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

CREATE POLICY budget_revisions_manager_select ON public.budget_revisions
  FOR SELECT TO authenticated
  USING (public.can_manage_funding_ledger());

CREATE POLICY budget_revisions_manager_insert ON public.budget_revisions
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_funding_ledger());

CREATE POLICY budget_publications_manager_select ON public.budget_publications
  FOR SELECT TO authenticated
  USING (public.can_manage_funding_ledger());

CREATE POLICY budget_publications_manager_insert ON public.budget_publications
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_funding_ledger());

CREATE POLICY finance_funding_sources_manager_all ON public.finance_funding_sources
  FOR ALL TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

CREATE POLICY finance_source_events_manager_select ON public.finance_source_events
  FOR SELECT TO authenticated
  USING (public.can_manage_funding_ledger());

CREATE POLICY finance_source_events_manager_insert ON public.finance_source_events
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_funding_ledger());

CREATE POLICY finance_commitments_manager_all ON public.finance_commitments
  FOR ALL TO authenticated
  USING (public.can_manage_funding_ledger())
  WITH CHECK (public.can_manage_funding_ledger());

CREATE POLICY finance_receipts_manager_select ON public.finance_receipts
  FOR SELECT TO authenticated
  USING (public.can_manage_funding_ledger());

CREATE POLICY finance_receipts_manager_insert ON public.finance_receipts
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_funding_ledger());

CREATE POLICY finance_allocations_manager_select ON public.finance_allocations
  FOR SELECT TO authenticated
  USING (public.can_manage_funding_ledger());

CREATE POLICY finance_allocations_manager_insert ON public.finance_allocations
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_funding_ledger());

CREATE POLICY finance_cost_assessments_manager_select ON public.finance_cost_assessments
  FOR SELECT TO authenticated
  USING (public.can_manage_funding_ledger());

CREATE POLICY finance_cost_assessments_manager_insert ON public.finance_cost_assessments
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_funding_ledger());

CREATE POLICY finance_audit_events_manager_select ON public.finance_audit_events
  FOR SELECT TO authenticated
  USING (public.can_manage_funding_ledger());

-- ---------------------------------------------------------------------------
-- Business RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finance_allocate_receipt(
  p_receipt_id uuid,
  p_line_item_id uuid,
  p_amount_minor bigint,
  p_purpose_note text DEFAULT NULL,
  p_override_reason text DEFAULT NULL
)
RETURNS public.finance_allocations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := public.finance_require_manager();
  receipt public.finance_receipts%ROWTYPE;
  allocated bigint;
  available bigint;
  row_out public.finance_allocations%ROWTYPE;
BEGIN
  IF p_amount_minor IS NULL OR p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'allocation amount must be positive';
  END IF;

  SELECT * INTO receipt FROM public.finance_receipts WHERE id = p_receipt_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'receipt not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.budget_line_items li
    WHERE li.id = p_line_item_id AND li.status = 'active'
  ) THEN
    RAISE EXCEPTION 'budget line item not found or archived';
  END IF;

  SELECT COALESCE(SUM(
    CASE WHEN a.reverses_allocation_id IS NULL THEN a.amount_minor ELSE -a.amount_minor END
  ), 0)
  INTO allocated
  FROM public.finance_allocations a
  WHERE a.receipt_id = p_receipt_id;

  available := receipt.amount_minor - allocated;
  IF p_amount_minor > available AND (p_override_reason IS NULL OR char_length(trim(p_override_reason)) = 0) THEN
    RAISE EXCEPTION 'allocation exceeds unallocated receipt balance (%)', available;
  END IF;

  INSERT INTO public.finance_allocations (
    receipt_id, line_item_id, amount_minor, currency, purpose_note, override_reason, actor_user_id
  ) VALUES (
    p_receipt_id, p_line_item_id, p_amount_minor, receipt.currency, p_purpose_note,
    NULLIF(trim(p_override_reason), ''), actor
  )
  RETURNING * INTO row_out;

  PERFORM public.finance_write_audit(
    'allocation_created',
    'finance_allocation',
    row_out.id,
    jsonb_build_object(
      'receipt_id', p_receipt_id,
      'line_item_id', p_line_item_id,
      'amount_minor', p_amount_minor,
      'override', p_override_reason IS NOT NULL AND char_length(trim(p_override_reason)) > 0
    ),
    actor
  );

  RETURN row_out;
END;
$$;

REVOKE ALL ON FUNCTION public.finance_allocate_receipt(uuid, uuid, bigint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_allocate_receipt(uuid, uuid, bigint, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.finance_assess_transaction_cost(
  p_liable_party_type text,
  p_liable_legal_entity_name text,
  p_processor_cost_minor bigint,
  p_audit_cost_minor bigint,
  p_other_allowed_cost_minor bigint,
  p_adjustment_minor bigint DEFAULT 0,
  p_currency text DEFAULT 'USD',
  p_related_receipt_id uuid DEFAULT NULL,
  p_related_transaction_ref text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS public.finance_cost_assessments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := public.finance_require_manager();
  assessed bigint;
  note text;
  row_out public.finance_cost_assessments%ROWTYPE;
BEGIN
  IF p_liable_party_type = 'individual' THEN
    assessed := 0;
    note := 'Personal-capacity individual: assessed user fee is always zero (cost-recovery-v1).';
  ELSIF p_liable_party_type = 'legal_entity' THEN
    assessed := GREATEST(
      0,
      COALESCE(p_processor_cost_minor, 0)
        + COALESCE(p_audit_cost_minor, 0)
        + COALESCE(p_other_allowed_cost_minor, 0)
        + COALESCE(p_adjustment_minor, 0)
    );
    note := format(
      'cost-recovery-v1: processor=%s + audit=%s + other=%s + adjustment=%s = %s',
      COALESCE(p_processor_cost_minor, 0),
      COALESCE(p_audit_cost_minor, 0),
      COALESCE(p_other_allowed_cost_minor, 0),
      COALESCE(p_adjustment_minor, 0),
      assessed
    );
  ELSE
    RAISE EXCEPTION 'invalid liable_party_type';
  END IF;

  INSERT INTO public.finance_cost_assessments (
    related_receipt_id,
    related_transaction_ref,
    liable_party_type,
    liable_legal_entity_name,
    processor_cost_minor,
    audit_cost_minor,
    other_allowed_cost_minor,
    adjustment_minor,
    currency,
    rule_version,
    assessed_user_fee_minor,
    calculation_note,
    reason,
    actor_user_id
  ) VALUES (
    p_related_receipt_id,
    p_related_transaction_ref,
    p_liable_party_type,
    NULLIF(trim(p_liable_legal_entity_name), ''),
    COALESCE(p_processor_cost_minor, 0),
    COALESCE(p_audit_cost_minor, 0),
    COALESCE(p_other_allowed_cost_minor, 0),
    COALESCE(p_adjustment_minor, 0),
    UPPER(trim(p_currency)),
    'cost-recovery-v1',
    assessed,
    note,
    p_reason,
    actor
  )
  RETURNING * INTO row_out;

  PERFORM public.finance_write_audit(
    'cost_assessment_created',
    'finance_cost_assessment',
    row_out.id,
    jsonb_build_object(
      'liable_party_type', p_liable_party_type,
      'assessed_user_fee_minor', assessed,
      'rule_version', 'cost-recovery-v1'
    ),
    actor
  );

  RETURN row_out;
END;
$$;

REVOKE ALL ON FUNCTION public.finance_assess_transaction_cost(text, text, bigint, bigint, bigint, bigint, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_assess_transaction_cost(text, text, bigint, bigint, bigint, bigint, text, uuid, text, text) TO authenticated;

-- Public sanitized summary (service boundary — allowlisted fields only)
CREATE OR REPLACE FUNCTION public.get_public_project_finance_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  budget public.project_budgets%ROWTYPE;
  groups jsonb := '[]'::jsonb;
  funding jsonb;
BEGIN
  SELECT * INTO budget
  FROM public.project_budgets
  WHERE lifecycle_status = 'approved'
    AND published_at IS NOT NULL
  ORDER BY published_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'published', false,
      'budget', NULL,
      'funding', NULL
    );
  END IF;

  SELECT COALESCE(jsonb_agg(g ORDER BY g->>'display_order'), '[]'::jsonb)
  INTO groups
  FROM (
    SELECT jsonb_build_object(
      'name', eg.name,
      'description', eg.description,
      'display_order', eg.display_order,
      'planned_minor', COALESCE((
        SELECT SUM(li.planned_minor) FROM public.budget_line_items li
        WHERE li.group_id = eg.id AND li.status = 'active' AND li.publish_flag = true AND li.currency = budget.currency
      ), 0),
      'committed_minor', COALESCE((
        SELECT SUM(li.committed_minor) FROM public.budget_line_items li
        WHERE li.group_id = eg.id AND li.status = 'active' AND li.publish_flag = true AND li.currency = budget.currency
      ), 0),
      'actual_minor', COALESCE((
        SELECT SUM(li.actual_minor) FROM public.budget_line_items li
        WHERE li.group_id = eg.id AND li.status = 'active' AND li.publish_flag = true AND li.currency = budget.currency
      ), 0),
      'line_items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'title', li.title,
          'public_description', li.public_description,
          'planned_minor', li.planned_minor,
          'committed_minor', li.committed_minor,
          'actual_minor', li.actual_minor,
          'currency', li.currency
        ) ORDER BY li.title)
        FROM public.budget_line_items li
        WHERE li.group_id = eg.id AND li.status = 'active' AND li.publish_flag = true
      ), '[]'::jsonb)
    ) AS g
    FROM public.budget_expense_groups eg
    WHERE eg.budget_id = budget.id AND eg.archived_at IS NULL
  ) s;

  SELECT jsonb_build_object(
    'received_by_currency', COALESCE((
      SELECT jsonb_object_agg(currency, total)
      FROM (
        SELECT r.currency, SUM(
          CASE WHEN r.reverses_receipt_id IS NULL THEN r.amount_minor ELSE -r.amount_minor END
        ) AS total
        FROM public.finance_receipts r
        GROUP BY r.currency
      ) t
    ), '{}'::jsonb),
    'published_sources', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'display_name', COALESCE(NULLIF(s.public_display_name, ''), s.display_name),
        'category', s.category,
        'requested_minor', CASE WHEN s.publish_requested_amount THEN s.requested_minor ELSE NULL END,
        'currency', s.currency
      ) ORDER BY s.display_name)
      FROM public.finance_funding_sources s
      WHERE s.publish_source = true
    ), '[]'::jsonb)
  ) INTO funding;

  RETURN jsonb_build_object(
    'published', true,
    'budget', jsonb_build_object(
      'name', budget.name,
      'purpose', budget.purpose,
      'currency', budget.currency,
      'version', budget.version,
      'period_start', budget.period_start,
      'period_end', budget.period_end,
      'published_at', budget.published_at,
      'groups', groups
    ),
    'funding', funding
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_project_finance_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_project_finance_summary() TO anon, authenticated;
