-- Finance fine-grained permissions + RPC gates for project finance workspace.
-- Temporary compatibility: settings.manage / role.assign / can_manage_funding_ledger() still grant access.

DO $$
BEGIN
  ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'finance.view';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'finance.edit';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'finance.approve';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'finance.publish';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'finance.admin';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.role_permissions (role, permission)
VALUES
  ('founder', 'finance.view'),
  ('founder', 'finance.edit'),
  ('founder', 'finance.approve'),
  ('founder', 'finance.publish'),
  ('founder', 'finance.admin'),
  ('admin', 'finance.view'),
  ('admin', 'finance.edit'),
  ('admin', 'finance.approve'),
  ('admin', 'finance.publish'),
  ('admin', 'finance.admin'),
  ('system', 'finance.view'),
  ('system', 'finance.edit'),
  ('system', 'finance.approve'),
  ('system', 'finance.publish'),
  ('system', 'finance.admin')
ON CONFLICT (role, permission) DO NOTHING;

-- Track who submitted a budget for review (self-approve control).
ALTER TABLE public.project_budgets
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_demonstration boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- Permission helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_finance_legacy_compat()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_manage_funding_ledger();
$$;

CREATE OR REPLACE FUNCTION public.has_finance_permission(p_permission public.app_permission)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_permission(p_permission) OR public.has_finance_legacy_compat();
$$;

CREATE OR REPLACE FUNCTION public.can_finance_view()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_finance_permission('finance.view'::public.app_permission)
    OR public.has_finance_permission('finance.edit'::public.app_permission)
    OR public.has_finance_permission('finance.approve'::public.app_permission)
    OR public.has_finance_permission('finance.publish'::public.app_permission)
    OR public.has_finance_permission('finance.admin'::public.app_permission);
$$;

CREATE OR REPLACE FUNCTION public.can_finance_edit()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_finance_permission('finance.edit'::public.app_permission)
      OR public.has_finance_permission('finance.admin'::public.app_permission);
$$;

CREATE OR REPLACE FUNCTION public.can_finance_approve()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_finance_permission('finance.approve'::public.app_permission)
      OR public.has_finance_permission('finance.admin'::public.app_permission);
$$;

CREATE OR REPLACE FUNCTION public.can_finance_publish()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_finance_permission('finance.publish'::public.app_permission)
      OR public.has_finance_permission('finance.admin'::public.app_permission);
$$;

CREATE OR REPLACE FUNCTION public.can_finance_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_finance_permission('finance.admin'::public.app_permission);
$$;

REVOKE ALL ON FUNCTION public.has_finance_legacy_compat() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_finance_permission(public.app_permission) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_finance_view() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_finance_edit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_finance_approve() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_finance_publish() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_finance_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_finance_legacy_compat() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_finance_permission(public.app_permission) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_finance_view() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_finance_edit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_finance_approve() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_finance_publish() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_finance_admin() TO authenticated;

-- Replace broad manager RLS with view/edit split for project finance tables.
DROP POLICY IF EXISTS project_budgets_manager_all ON public.project_budgets;
DROP POLICY IF EXISTS budget_expense_groups_manager_all ON public.budget_expense_groups;
DROP POLICY IF EXISTS budget_line_items_manager_all ON public.budget_line_items;
DROP POLICY IF EXISTS budget_revisions_manager_select ON public.budget_revisions;
DROP POLICY IF EXISTS budget_revisions_manager_insert ON public.budget_revisions;
DROP POLICY IF EXISTS budget_publications_manager_select ON public.budget_publications;
DROP POLICY IF EXISTS budget_publications_manager_insert ON public.budget_publications;
DROP POLICY IF EXISTS finance_funding_sources_manager_all ON public.finance_funding_sources;
DROP POLICY IF EXISTS finance_source_events_manager_select ON public.finance_source_events;
DROP POLICY IF EXISTS finance_source_events_manager_insert ON public.finance_source_events;
DROP POLICY IF EXISTS finance_commitments_manager_all ON public.finance_commitments;
DROP POLICY IF EXISTS finance_receipts_manager_select ON public.finance_receipts;
DROP POLICY IF EXISTS finance_receipts_manager_insert ON public.finance_receipts;
DROP POLICY IF EXISTS finance_allocations_manager_select ON public.finance_allocations;
DROP POLICY IF EXISTS finance_allocations_manager_insert ON public.finance_allocations;
DROP POLICY IF EXISTS finance_cost_assessments_manager_select ON public.finance_cost_assessments;
DROP POLICY IF EXISTS finance_cost_assessments_manager_insert ON public.finance_cost_assessments;
DROP POLICY IF EXISTS finance_audit_events_manager_select ON public.finance_audit_events;

CREATE POLICY project_budgets_select ON public.project_budgets
  FOR SELECT TO authenticated USING (public.can_finance_view());
CREATE POLICY project_budgets_insert ON public.project_budgets
  FOR INSERT TO authenticated WITH CHECK (public.can_finance_edit());
CREATE POLICY project_budgets_update ON public.project_budgets
  FOR UPDATE TO authenticated USING (public.can_finance_edit()) WITH CHECK (public.can_finance_edit());
CREATE POLICY project_budgets_delete ON public.project_budgets
  FOR DELETE TO authenticated USING (public.can_finance_admin());

CREATE POLICY budget_expense_groups_select ON public.budget_expense_groups
  FOR SELECT TO authenticated USING (public.can_finance_view());
CREATE POLICY budget_expense_groups_mutate ON public.budget_expense_groups
  FOR ALL TO authenticated
  USING (public.can_finance_edit())
  WITH CHECK (public.can_finance_edit());

CREATE POLICY budget_line_items_select ON public.budget_line_items
  FOR SELECT TO authenticated USING (public.can_finance_view());
CREATE POLICY budget_line_items_mutate ON public.budget_line_items
  FOR ALL TO authenticated
  USING (public.can_finance_edit())
  WITH CHECK (public.can_finance_edit());

CREATE POLICY budget_revisions_select ON public.budget_revisions
  FOR SELECT TO authenticated USING (public.can_finance_view());
CREATE POLICY budget_revisions_insert ON public.budget_revisions
  FOR INSERT TO authenticated WITH CHECK (public.can_finance_edit() OR public.can_finance_approve() OR public.can_finance_publish());

CREATE POLICY budget_publications_select ON public.budget_publications
  FOR SELECT TO authenticated USING (public.can_finance_view());
CREATE POLICY budget_publications_insert ON public.budget_publications
  FOR INSERT TO authenticated WITH CHECK (public.can_finance_publish());

CREATE POLICY finance_funding_sources_select ON public.finance_funding_sources
  FOR SELECT TO authenticated USING (public.can_finance_view());
CREATE POLICY finance_funding_sources_mutate ON public.finance_funding_sources
  FOR ALL TO authenticated
  USING (public.can_finance_edit())
  WITH CHECK (public.can_finance_edit());

CREATE POLICY finance_source_events_select ON public.finance_source_events
  FOR SELECT TO authenticated USING (public.can_finance_view());
CREATE POLICY finance_source_events_insert ON public.finance_source_events
  FOR INSERT TO authenticated WITH CHECK (public.can_finance_edit());

CREATE POLICY finance_commitments_select ON public.finance_commitments
  FOR SELECT TO authenticated USING (public.can_finance_view());
CREATE POLICY finance_commitments_mutate ON public.finance_commitments
  FOR ALL TO authenticated
  USING (public.can_finance_edit())
  WITH CHECK (public.can_finance_edit());

CREATE POLICY finance_receipts_select ON public.finance_receipts
  FOR SELECT TO authenticated USING (public.can_finance_view());
CREATE POLICY finance_receipts_insert ON public.finance_receipts
  FOR INSERT TO authenticated WITH CHECK (public.can_finance_edit());

CREATE POLICY finance_allocations_select ON public.finance_allocations
  FOR SELECT TO authenticated USING (public.can_finance_view());
CREATE POLICY finance_allocations_insert ON public.finance_allocations
  FOR INSERT TO authenticated WITH CHECK (public.can_finance_edit() OR public.can_finance_admin());

CREATE POLICY finance_cost_assessments_select ON public.finance_cost_assessments
  FOR SELECT TO authenticated USING (public.can_finance_view());
CREATE POLICY finance_cost_assessments_insert ON public.finance_cost_assessments
  FOR INSERT TO authenticated WITH CHECK (public.can_finance_edit());

CREATE POLICY finance_audit_events_select ON public.finance_audit_events
  FOR SELECT TO authenticated USING (public.can_finance_view());

-- ---------------------------------------------------------------------------
-- Allocate: override requires finance.admin + reason
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
  actor uuid := auth.uid();
  receipt public.finance_receipts%ROWTYPE;
  allocated bigint;
  available bigint;
  needs_override boolean;
  row_out public.finance_allocations%ROWTYPE;
BEGIN
  IF actor IS NULL OR NOT (public.can_finance_edit() OR public.can_finance_admin()) THEN
    RAISE EXCEPTION 'not authorized to allocate funding';
  END IF;
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
  needs_override := p_amount_minor > available;

  IF needs_override THEN
    IF NOT public.can_finance_admin() THEN
      RAISE EXCEPTION 'allocation override requires finance.admin permission';
    END IF;
    IF p_override_reason IS NULL OR char_length(trim(p_override_reason)) = 0 THEN
      RAISE EXCEPTION 'allocation override requires a recorded reason';
    END IF;
  END IF;

  INSERT INTO public.finance_allocations (
    receipt_id, line_item_id, amount_minor, currency, purpose_note, override_reason, actor_user_id
  ) VALUES (
    p_receipt_id, p_line_item_id, p_amount_minor, receipt.currency, p_purpose_note,
    CASE WHEN needs_override THEN trim(p_override_reason) ELSE NULL END,
    actor
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
      'override', needs_override
    ),
    actor
  );

  RETURN row_out;
END;
$$;

-- ---------------------------------------------------------------------------
-- Approve / publish RPCs (distinct permissions; no self-approve without admin)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.finance_approve_budget(
  p_budget_id uuid,
  p_reason text
)
RETURNS public.project_budgets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  budget public.project_budgets%ROWTYPE;
  row_out public.project_budgets%ROWTYPE;
BEGIN
  IF actor IS NULL OR NOT public.can_finance_approve() THEN
    RAISE EXCEPTION 'not authorized to approve budgets (requires finance.approve)';
  END IF;

  SELECT * INTO budget FROM public.project_budgets WHERE id = p_budget_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'budget not found';
  END IF;
  IF budget.lifecycle_status <> 'under_review' THEN
    RAISE EXCEPTION 'budget must be under_review before approval';
  END IF;
  IF budget.submitted_by IS NOT NULL AND budget.submitted_by = actor AND NOT public.can_finance_admin() THEN
    RAISE EXCEPTION 'cannot approve your own submitted budget revision without finance.admin';
  END IF;
  IF p_reason IS NULL OR char_length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'approval reason is required';
  END IF;

  UPDATE public.project_budgets
  SET
    lifecycle_status = 'approved',
    approved_at = now(),
    approved_by = actor,
    approval_reason = trim(p_reason),
    updated_by = actor,
    updated_at = now()
  WHERE id = p_budget_id
  RETURNING * INTO row_out;

  IF row_out.supersedes_budget_id IS NOT NULL THEN
    UPDATE public.project_budgets
    SET lifecycle_status = 'superseded', updated_at = now()
    WHERE id = row_out.supersedes_budget_id
      AND lifecycle_status = 'approved';
  END IF;

  INSERT INTO public.budget_revisions (budget_id, change_summary, changed_fields, reason, actor_user_id, approval_reference)
  VALUES (
    p_budget_id,
    'Budget approved',
    jsonb_build_array(jsonb_build_object('field', 'lifecycle_status', 'before', 'under_review', 'after', 'approved')),
    trim(p_reason),
    actor,
    row_out.approved_at::text
  );

  PERFORM public.finance_write_audit(
    'budget_approved',
    'project_budget',
    p_budget_id,
    jsonb_build_object('reason', trim(p_reason)),
    actor
  );

  RETURN row_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_publish_budget(
  p_budget_id uuid,
  p_note text DEFAULT NULL
)
RETURNS public.project_budgets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  budget public.project_budgets%ROWTYPE;
  row_out public.project_budgets%ROWTYPE;
  snapshot jsonb;
BEGIN
  IF actor IS NULL OR NOT public.can_finance_publish() THEN
    RAISE EXCEPTION 'not authorized to publish budgets (requires finance.publish)';
  END IF;

  SELECT * INTO budget FROM public.project_budgets WHERE id = p_budget_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'budget not found';
  END IF;
  IF budget.lifecycle_status <> 'approved' THEN
    RAISE EXCEPTION 'only approved budgets can be published';
  END IF;

  snapshot := public.finance_build_public_budget_snapshot(p_budget_id);

  UPDATE public.project_budgets
  SET
    published_at = now(),
    published_by = actor,
    publication_note = NULLIF(trim(COALESCE(p_note, '')), ''),
    updated_by = actor,
    updated_at = now()
  WHERE id = p_budget_id
  RETURNING * INTO row_out;

  INSERT INTO public.budget_publications (budget_id, action, public_snapshot, actor_user_id, note)
  VALUES (p_budget_id, 'publish', snapshot, actor, NULLIF(trim(COALESCE(p_note, '')), ''));

  PERFORM public.finance_write_audit(
    'budget_published',
    'project_budget',
    p_budget_id,
    jsonb_build_object('note', p_note, 'version', row_out.version),
    actor
  );

  RETURN row_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_submit_budget(
  p_budget_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS public.project_budgets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  budget public.project_budgets%ROWTYPE;
  row_out public.project_budgets%ROWTYPE;
BEGIN
  IF actor IS NULL OR NOT public.can_finance_edit() THEN
    RAISE EXCEPTION 'not authorized to submit budgets (requires finance.edit)';
  END IF;

  SELECT * INTO budget FROM public.project_budgets WHERE id = p_budget_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'budget not found';
  END IF;
  IF budget.lifecycle_status <> 'draft' THEN
    RAISE EXCEPTION 'only draft budgets can be submitted for review';
  END IF;

  UPDATE public.project_budgets
  SET
    lifecycle_status = 'under_review',
    submitted_by = actor,
    submitted_at = now(),
    updated_by = actor,
    updated_at = now()
  WHERE id = p_budget_id
  RETURNING * INTO row_out;

  INSERT INTO public.budget_revisions (budget_id, change_summary, changed_fields, reason, actor_user_id)
  VALUES (
    p_budget_id,
    'Budget submitted for review',
    jsonb_build_array(jsonb_build_object('field', 'lifecycle_status', 'before', 'draft', 'after', 'under_review')),
    NULLIF(trim(COALESCE(p_reason, '')), ''),
    actor
  );

  PERFORM public.finance_write_audit('budget_submitted', 'project_budget', p_budget_id, jsonb_build_object('reason', p_reason), actor);
  RETURN row_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.finance_build_public_budget_snapshot(p_budget_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  budget public.project_budgets%ROWTYPE;
  groups jsonb;
BEGIN
  SELECT * INTO budget FROM public.project_budgets WHERE id = p_budget_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'budget not found';
  END IF;

  SELECT COALESCE(jsonb_agg(g ORDER BY (g->>'display_order')::int), '[]'::jsonb)
  INTO groups
  FROM (
    SELECT jsonb_build_object(
      'name', eg.name,
      'description', eg.description,
      'display_order', eg.display_order,
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

  RETURN jsonb_build_object(
    'name', budget.name,
    'purpose', budget.purpose,
    'currency', budget.currency,
    'version', budget.version,
    'is_demonstration', budget.is_demonstration,
    'groups', groups
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finance_approve_budget(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_publish_budget(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_submit_budget(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finance_build_public_budget_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_approve_budget(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finance_publish_budget(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finance_submit_budget(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finance_build_public_budget_snapshot(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Hardened public summary (allowlist only; no contacts/notes/evidence)
-- ---------------------------------------------------------------------------

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
      'funding', NULL,
      'last_published_at', NULL,
      'published_version', NULL,
      'is_demonstration', false
    );
  END IF;

  SELECT COALESCE(jsonb_agg(g ORDER BY (g->>'display_order')::int), '[]'::jsonb)
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
      WHERE total IS NOT NULL
    ), '{}'::jsonb),
    'published_sources', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'display_name', COALESCE(NULLIF(s.public_display_name, ''), s.display_name),
        'category', s.category,
        'requested_minor', CASE WHEN s.publish_requested_amount THEN s.requested_minor ELSE NULL END,
        'currency', s.currency
      ) ORDER BY COALESCE(NULLIF(s.public_display_name, ''), s.display_name))
      FROM public.finance_funding_sources s
      WHERE s.publish_source = true
    ), '[]'::jsonb)
  ) INTO funding;

  RETURN jsonb_build_object(
    'published', true,
    'last_published_at', budget.published_at,
    'published_version', budget.version,
    'is_demonstration', budget.is_demonstration,
    'budget', jsonb_build_object(
      'name', budget.name,
      'purpose', budget.purpose,
      'currency', budget.currency,
      'version', budget.version,
      'period_start', budget.period_start,
      'period_end', budget.period_end,
      'published_at', budget.published_at,
      'is_demonstration', budget.is_demonstration,
      'groups', groups
    ),
    'funding', funding
  );
END;
$$;

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
  IF uid IS NULL OR NOT (public.can_finance_edit() OR public.can_finance_admin()) THEN
    RAISE EXCEPTION 'not authorized to manage project finance';
  END IF;
  RETURN uid;
END;
$$;
