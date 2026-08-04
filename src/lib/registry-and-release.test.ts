import { describe, expect, it } from 'vitest';

import { APP_PERMISSIONS } from '@/lib/access-control';
import { pageRegistry, sectionRegistry } from '@/lib/feature-registry';
import { permissionMetadata } from '@/lib/permission-metadata';
import { APP_RELEASE_ID, APP_VERSION, APP_VERSION_TAG, ANDROID_VERSION_CODE } from '@/lib/app-release';
import { appPageLinks, getAccessiblePageLinks } from '@/lib/app-pages';
import { manageableRoles } from '@/lib/users-admin';

describe('feature-registry', () => {
  it('registers core pages used by admin and navigation', () => {
    expect(pageRegistry.home).toBeTruthy();
    expect(pageRegistry.adminUsers).toBeTruthy();
    expect(pageRegistry.settings).toBeTruthy();
    expect(Object.keys(sectionRegistry).length).toBeGreaterThan(0);
  });
});

describe('permission-metadata', () => {
  it('covers every app permission exactly once', () => {
    const listed = permissionMetadata.map((entry) => entry.permission);
    expect(new Set(listed).size).toBe(listed.length);
    for (const permission of APP_PERMISSIONS) {
      expect(listed).toContain(permission);
    }
  });
});

describe('app-release', () => {
  it('keeps version metadata aligned', () => {
    expect(APP_VERSION_TAG).toBe(`v${APP_VERSION}`);
    expect(APP_RELEASE_ID).toContain(APP_VERSION);
    expect(ANDROID_VERSION_CODE).toBeGreaterThan(0);
  });
});

describe('app-pages', () => {
  it('exposes navigable links and filters by permissions', () => {
    expect(appPageLinks.some((page) => page.id === 'home')).toBe(true);
    const filtered = getAccessiblePageLinks(['settings.manage', 'role.assign']);
    expect(filtered.some((page) => page.id === 'adminUsers')).toBe(true);
  });
});

describe('users-admin exports used by UI', () => {
  it('exports manageableRoles without system', () => {
    expect(manageableRoles).toContain('founder');
    expect(manageableRoles).not.toContain('system');
  });
});
