import { describe, expect, it } from 'vitest';

import { PILLARS } from '@/lib/constants';
import { listCurrentAreas } from '@/lib/classification';
import { MAIN_NAV_ITEMS } from '@/lib/main-nav';
import {
  DEFAULT_CONTRIBUTE_HREF,
  INSTITUTIONAL_INQUIRY_PATH,
  UNPUBLISHED_INTERNAL_WORK_IDS,
  exposesUnpublishedInternalWork,
  getPublicAreaPage,
  institutionalPartnerHref,
  listPublicAreaCards,
  listPublicInitiativeIds,
  listPublicSystemIds,
  usesPublicFundingOutreachStatus,
} from '@/lib/areas';

const LIVE_PILLAR_IDS = [
  'education_skills',
  'culture_ethics',
  'responsibility_reliability',
  'environment_community',
  'economy_contribution',
] as const;

describe('public Areas V1 content', () => {
  it('lists the current foundational Area model, not live PILLARS', () => {
    expect(listPublicAreaCards().map((area) => area.name)).toEqual([
      'Health',
      'Education',
      'Culture',
      'Responsibility',
      'Environment',
    ]);
    expect(listPublicAreaCards().map((area) => area.slug)).toEqual(
      listCurrentAreas().map((node) => node.code),
    );
    expect(PILLARS.map((pillar) => pillar.id)).toEqual([...LIVE_PILLAR_IDS]);
    expect(listPublicAreaCards().map((area) => area.slug)).not.toEqual(
      PILLARS.map((pillar) => pillar.id),
    );
    expect(listPublicAreaCards().some((area) => area.name === 'Community')).toBe(false);
    expect(listPublicAreaCards().some((area) => area.name === 'Economy')).toBe(false);
  });

  it('keeps related systems distinct from initiatives', () => {
    const education = getPublicAreaPage('education');
    expect(education?.systems.map((item) => item.id)).toEqual(['study']);
    expect(education?.initiatives).toEqual([]);
    expect(education?.systems.some((item) => item.title === 'Study')).toBe(true);

    const responsibility = getPublicAreaPage('responsibility');
    expect(responsibility?.systems.map((item) => item.id)).toEqual([
      'civic-voting',
      'governance',
      'contribute',
    ]);
    expect(responsibility?.initiatives.map((item) => item.id)).toEqual(['governance-solutions']);
    expect(listPublicSystemIds()).not.toContain('governance-solutions');
    expect(listPublicInitiativeIds()).not.toContain('study');
    expect(listPublicInitiativeIds()).not.toContain('civic-voting');
  });

  it('uses an honest empty state for Areas without public work', () => {
    for (const slug of ['health', 'culture', 'environment'] as const) {
      const page = getPublicAreaPage(slug);
      expect(page?.systems).toEqual([]);
      expect(page?.initiatives).toEqual([]);
    }
  });

  it('routes Partner and Contribute through existing surfaces', () => {
    const health = getPublicAreaPage('health');
    expect(health?.contributeHref).toBe(DEFAULT_CONTRIBUTE_HREF);
    expect(health?.partnerHref).toBe(institutionalPartnerHref({ areaSlug: 'health' }));
    expect(health?.partnerHref).toBe(`${INSTITUTIONAL_INQUIRY_PATH}?area=health`);
    expect(institutionalPartnerHref({ areaSlug: 'responsibility', initiativeId: 'governance-solutions' })).toBe(
      `${INSTITUTIONAL_INQUIRY_PATH}?area=responsibility&initiative=governance-solutions`,
    );
  });

  it('does not expose unpublished internal work or public funding outreach', () => {
    expect(exposesUnpublishedInternalWork()).toBe(false);
    expect(usesPublicFundingOutreachStatus()).toBe(false);
    const published = JSON.stringify({
      cards: listPublicAreaCards(),
      pages: listPublicAreaCards().map((card) => getPublicAreaPage(card.slug)),
    }).toLowerCase();
    for (const id of UNPUBLISHED_INTERNAL_WORK_IDS) {
      expect(published).not.toContain(id.replaceAll('-', ' '));
    }
    expect(published).not.toContain('seeking funding');
    expect(published).not.toContain('validation budget');
    expect(published).not.toContain('p0–p6');
    expect(published).not.toContain('foundational_areas');
    expect(MAIN_NAV_ITEMS.map((item) => item.path)).not.toContain('/areas');
  });

  it('returns undefined for unknown Area slugs', () => {
    expect(getPublicAreaPage('not-an-area')).toBeUndefined();
  });
});
