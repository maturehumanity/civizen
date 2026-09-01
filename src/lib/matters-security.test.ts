import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const original = readFileSync('supabase/migrations/20260831010000_matter_collaboration_system.sql', 'utf8');
const stabilization = readFileSync('supabase/migrations/20260831200000_matter_collaboration_stabilization.sql', 'utf8');
const collaborative = readFileSync('supabase/migrations/20260901120000_matter_collaborative_work.sql', 'utf8');
const workStab = readFileSync('supabase/migrations/20260901140000_matter_collaborative_work_stabilization.sql', 'utf8');

describe('Matter SQL security and timeout isolation', () => {
  it('keeps SECURITY DEFINER Matter functions on a controlled search_path', () => {
    const definerBlocks = [...stabilization.matchAll(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$;/g)];
    expect(definerBlocks.length).toBeGreaterThan(5);
    for (const block of definerBlocks) {
      if (!/SECURITY DEFINER/.test(block[0])) continue;
      expect(block[0]).toMatch(/SET search_path = public/);
    }
  });

  it('relies on schema public CREATE denial rather than rewriting definer search_path', () => {
    const spec = readFileSync('docs/04-operations/dev/matter-collaboration.md', 'utf8');
    const check = readFileSync('scripts/db/verify-public-schema-create.sql', 'utf8');
    expect(spec).toMatch(/untrusted roles cannot create objects/);
    expect(spec).toMatch(/anon.*no/s);
    expect(spec).toMatch(/authenticated.*no/s);
    expect(check).toMatch(/has_schema_privilege\('authenticated', 'public', 'CREATE'\)/);
  });

  it('does not run timeout mutations from list_matters', () => {
    const start = stabilization.indexOf('CREATE OR REPLACE FUNCTION public.list_matters');
    const listFn = stabilization.slice(start, stabilization.indexOf('REVOKE ALL ON FUNCTION public.matter_log_event', start));
    expect(listFn).toMatch(/LANGUAGE plpgsql\nSTABLE/);
    expect(listFn).not.toMatch(/process_matter_action_timeouts/);
    expect(original).toMatch(/PERFORM public.process_matter_action_timeouts/);
  });

  it('makes process_matter_action_timeouts the locked authoritative worker', () => {
    expect(stabilization).toMatch(/pg_advisory_xact_lock\(hashtextextended\('process_matter_action_timeouts'/);
    expect(stabilization).toMatch(/FOR UPDATE OF a SKIP LOCKED/);
    expect(stabilization).toMatch(/ON CONFLICT \(action_id, reminder_kind\) DO NOTHING/);
    expect(stabilization).toMatch(/AND status = 'pending'/);
    expect(stabilization).toMatch(/REVOKE ALL ON FUNCTION public.process_matter_action_timeouts\(\) FROM authenticated/);
  });

  it('does not trust caller-supplied person initiator IDs', () => {
    expect(stabilization).toMatch(/v_init_kind = 'person' AND v_init_id <> v_self/);
    expect(stabilization).toMatch(/current_profile_represents_actor\(v_init_kind, v_init_id\)/);
    expect(stabilization).toMatch(/matter_formal_action_is_allowed/);
    expect(stabilization).toMatch(/v_actor_kind := 'person'/);
  });

  it('revokes helper mutation functions from authenticated callers', () => {
    for (const name of [
      'matter_assign_action',
      'matter_complete_current_action',
      'matter_close',
      'matter_log_event',
      'matter_notify_actor',
      'matter_add_party',
    ]) {
      expect(stabilization).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public.${name}`));
    }
  });

  it('blocks comments and attachments on closed Matters', () => {
    expect(stabilization.match(/IF v_lifecycle = 'closed'/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps Phase 2 collaborative helpers on controlled search_path and revoked from callers', () => {
    const definerBlocks = [...collaborative.matchAll(/CREATE (?:OR REPLACE )?FUNCTION[\s\S]*?\$\$;/g)];
    expect(definerBlocks.length).toBeGreaterThan(8);
    for (const block of definerBlocks) {
      if (!/SECURITY DEFINER/.test(block[0])) continue;
      expect(block[0]).toMatch(/SET search_path = public/);
    }
    for (const name of [
      'matter_assign_action',
      'matter_complete_action',
      'matter_activate_task',
      'matter_release_dependents',
      'matter_ensure_lead_responsibility',
      'matter_sync_headline',
      'process_matter_action_timeouts',
    ]) {
      expect(collaborative).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public.${name}`));
    }
  });

  it('does not treat a Task comment as completing an Action Requirement', () => {
    expect(collaborative).toMatch(/Task comment posted\. This did not complete the required action\./);
    expect(collaborative).not.toMatch(/perform_collaboration_action[\s\S]{0,200}add_matter_comment/);
  });

  it('scopes concurrent action assignment instead of superseding every pending clock', () => {
    expect(collaborative).toMatch(/context_kind/);
    expect(collaborative).toMatch(/AND context_kind = v_kind/);
    expect(collaborative).toMatch(/coalesce\(context_id/);
  });

  it('gates ordinary work completion and keeps shared-responsibility helpers revoked', () => {
    const definerBlocks = [...workStab.matchAll(/CREATE (?:OR REPLACE )?FUNCTION[\s\S]*?\$\$;/g)];
    expect(definerBlocks.length).toBeGreaterThan(4);
    for (const block of definerBlocks) {
      if (!/SECURITY DEFINER/.test(block[0])) continue;
      expect(block[0]).toMatch(/SET search_path = public/);
    }
    expect(workStab).toMatch(/p_status IN \('completed', 'cancelled'\)/);
    expect(workStab).toMatch(/p_allow_outstanding/);
    expect(workStab).toMatch(/collaborative_work_completed_with_outstanding/);
    expect(workStab).toMatch(/shared_responsibility_response/);
    expect(workStab).toMatch(/suggestion_reason/);
    expect(workStab).toMatch(/DROP FUNCTION IF EXISTS public.complete_matter_collaborative_work\(uuid\)/);
    for (const name of [
      'matter_request_shared_responsibility',
      'matter_respond_shared_responsibility',
      'matter_outstanding_work_tasks',
      'matter_task_is_terminal_for_work',
      'matter_row_json',
    ]) {
      expect(workStab).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public.${name}`));
    }
  });
});
