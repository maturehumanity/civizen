import { describe, expect, it } from 'vitest';

import {
  FUNDING_ADMIN_DEFAULT_SECTION,
  FUNDING_SOURCE_WORK_PANELS,
  fundingAdminPath,
  parseFundingSourceWorkPanel,
  resolveFundingAdminSection,
  visibleFundingAdminSections,
} from '@/lib/funding/admin-sections';

describe('funding admin sections', () => {
  it('defaults to budget and places economics after program plan in primary navigation', () => {
    expect(FUNDING_ADMIN_DEFAULT_SECTION).toBe('budget');
    const sections = visibleFundingAdminSections(false);
    expect(sections).toEqual(['budget', 'program-plan', 'economics', 'overview', 'sources', 'interest']);
    expect(sections).not.toContain('ledger');
    expect(fundingAdminPath('budget')).toBe('/settings/admin/funding');
    expect(fundingAdminPath('program-plan')).toContain('section=program-plan');
    expect(fundingAdminPath('economics')).toContain('section=economics');
    expect(fundingAdminPath('overview')).toContain('section=overview');
  });

  it('quarantines legacy sections unless legacy=1', () => {
    const blocked = resolveFundingAdminSection({ sectionParam: 'ledger', legacyParam: null });
    expect(blocked.section).toBe('budget');
    expect(blocked.redirectedFromLegacy).toBe(true);

    const allowed = resolveFundingAdminSection({ sectionParam: 'ledger', legacyParam: '1' });
    expect(allowed.section).toBe('ledger');
    expect(allowed.legacyMode).toBe(true);
    expect(visibleFundingAdminSections(true)).toContain('contributors');
  });

  it('resolves program-plan, economics, and overview without enabling legacy mode', () => {
    const plan = resolveFundingAdminSection({ sectionParam: 'program-plan', legacyParam: null });
    expect(plan.section).toBe('program-plan');
    expect(plan.legacyMode).toBe(false);

    const economics = resolveFundingAdminSection({ sectionParam: 'economics', legacyParam: null });
    expect(economics.section).toBe('economics');
    expect(economics.legacyMode).toBe(false);
    const overview = resolveFundingAdminSection({ sectionParam: 'overview', legacyParam: null });
    expect(overview.section).toBe('overview');
    expect(overview.legacyMode).toBe(false);
  });

  it('parses source work panels for progressive disclosure', () => {
    expect(FUNDING_SOURCE_WORK_PANELS).toEqual([
      'outreach',
      'commitments',
      'receipts',
      'allocations',
      'fees',
    ]);
    expect(parseFundingSourceWorkPanel('fees')).toBe('fees');
    expect(parseFundingSourceWorkPanel('nope')).toBe('outreach');
  });
});
