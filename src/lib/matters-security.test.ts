import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const original = readFileSync('supabase/migrations/20260831010000_matter_collaboration_system.sql', 'utf8');
const stabilization = readFileSync('supabase/migrations/20260831200000_matter_collaboration_stabilization.sql', 'utf8');

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
});
