import { describe, expect, it } from 'vitest';

import {
  buildSearchContentsCatalog,
  filterSearchContents,
  parseSearchTabParam,
} from '@/lib/search-contents';

describe('parseSearchTabParam', () => {
  it('treats missing and all as search-everything', () => {
    expect(parseSearchTabParam(null)).toBeNull();
    expect(parseSearchTabParam(undefined)).toBeNull();
    expect(parseSearchTabParam('all')).toBeNull();
    expect(parseSearchTabParam('bogus')).toBeNull();
  });

  it('accepts filter tabs including contents', () => {
    expect(parseSearchTabParam('people')).toBe('people');
    expect(parseSearchTabParam('contents')).toBe('contents');
  });
});

describe('filterSearchContents', () => {
  const catalog = buildSearchContentsCatalog((key) => {
    const map: Record<string, string> = {
      'common.study': 'Study',
      'features.pages.home': 'Home',
      'features.pages.features': 'Features',
      'features.pages.law': 'Law',
      'features.catalog.directorySearch.title': 'Directory search',
      'features.catalog.directorySearch.summary': 'Find people across Civizen',
      'features.catalog.adminRoles.title': 'Roles administration',
      'features.catalog.adminRoles.summary': 'Assign and manage user roles',
      'settings.governanceHub': 'Governance',
      'common.footerFund': 'Fund Civizen',
      'documents.indexTitle': 'Documents',
    };
    if (map[key]) return map[key];
    if (key.includes('adminRoles') && key.endsWith('.title')) return 'Roles administration';
    if (key.includes('adminRoles') && key.endsWith('.summary')) return 'Assign and manage user roles';
    if (key.includes('title')) return key.split('.').slice(-2, -1)[0] ?? key;
    if (key.includes('summary') || key.includes('description')) return `Summary for ${key}`;
    return key;
  }, ['profile.read', 'law.read', 'role.assign', 'settings.manage']);

  it('finds app pages and role-related features', () => {
    const roles = filterSearchContents(catalog, 'Roles');
    expect(roles.some((hit) => /role/i.test(hit.title) || hit.keywords.some((k) => /role/i.test(k)))).toBe(true);

    const study = filterSearchContents(catalog, 'Study');
    expect(study.some((hit) => hit.path === '/study' || hit.kind === 'study')).toBe(true);
  });

  it('returns nothing for short queries', () => {
    expect(filterSearchContents(catalog, 'R')).toEqual([]);
  });
});
