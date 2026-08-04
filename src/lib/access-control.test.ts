import { describe, expect, it } from 'vitest';

import {
  APP_PERMISSIONS,
  coalesceRpcEffectivePermissions,
  rolePermissionMap,
} from '@/lib/access-control';

describe('access control', () => {
  it('keeps founder as full-superuser during bootstrap decentralization stage', () => {
    const founderPermissions = rolePermissionMap.founder;

    expect(founderPermissions).toEqual(APP_PERMISSIONS);
    expect(founderPermissions).toContain('role.assign');
    expect(founderPermissions).toContain('settings.manage');
    expect(founderPermissions).toContain('profile.update_any');
    expect(founderPermissions).toContain('market.manage');
  });

  it('keeps admin as the full application-superuser role', () => {
    expect(rolePermissionMap.admin).toEqual(APP_PERMISSIONS);
    expect(rolePermissionMap.system).toEqual(APP_PERMISSIONS);
  });

  it('falls back to role permissions when RPC returns empty for founder/admin', () => {
    expect(coalesceRpcEffectivePermissions('founder', [], { rpcFailed: false })).toEqual(APP_PERMISSIONS);
    expect(coalesceRpcEffectivePermissions('admin', null, { rpcFailed: true })).toEqual(APP_PERMISSIONS);
    expect(coalesceRpcEffectivePermissions('member', [], { rpcFailed: false })).toEqual([]);
    expect(
      coalesceRpcEffectivePermissions('member', ['content.read', 'profile.read'], { rpcFailed: false }),
    ).toEqual(['content.read', 'profile.read']);
  });

  it('falls back when founder RPC omits admin permissions', () => {
    expect(
      coalesceRpcEffectivePermissions('founder', ['content.read', 'profile.read'], { rpcFailed: false }),
    ).toEqual(APP_PERMISSIONS);
  });
});
