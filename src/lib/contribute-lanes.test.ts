import { describe, expect, it } from 'vitest';

import {
  CONTRIBUTE_LANES,
  CONTRIBUTE_PLACEHOLDER_IDS,
  CONTRIBUTE_SECTION_ORDER,
  getContributeLanesBySection,
  getContributePlaceholderLane,
  isContributePlaceholderId,
} from '@/lib/contribute-lanes';

describe('contribute-lanes', () => {
  it('covers the Phase 1 hub sections and lanes', () => {
    expect(CONTRIBUTE_SECTION_ORDER).toEqual(['ways', 'community', 'knowledge', 'impact']);
    expect(getContributeLanesBySection('ways').map((lane) => lane.id)).toEqual([
      'volunteer',
      'professional',
      'financial',
      'organization',
    ]);
    expect(CONTRIBUTE_LANES).toHaveLength(8);
  });

  it('wires existing surfaces for volunteer, funding, partners, and professional opportunities', () => {
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'volunteer')?.path).toBe('/fund/contribute');
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'financial')?.path).toBe('/fund');
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'organization')?.path).toBe('/partners');
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'professional')?.path).toBe('/contribute/professional');
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'professional')?.placeholder).toBe(false);
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'challenges')?.path).toBe('/contribute/challenges');
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'challenges')?.placeholder).toBe(false);
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'knowledge')?.path).toBe('/contribute/knowledge');
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'knowledge')?.placeholder).toBe(false);
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'impact')?.path).toBe('/contribute/impact');
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'impact')?.placeholder).toBe(false);
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'tasks')).toBeUndefined();
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'projects')).toBeUndefined();
  });

  it('exposes placeholder lanes under /contribute/*', () => {
    for (const id of CONTRIBUTE_PLACEHOLDER_IDS) {
      expect(isContributePlaceholderId(id)).toBe(true);
      const lane = getContributePlaceholderLane(id);
      expect(lane?.placeholder).toBe(true);
      expect(lane?.path).toBe(`/contribute/${id}`);
    }
    expect(isContributePlaceholderId('policy')).toBe(false);
    expect(getContributePlaceholderLane('policy')).toBeUndefined();
  });
});
