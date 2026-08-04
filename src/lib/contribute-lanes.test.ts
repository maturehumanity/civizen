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
    expect(CONTRIBUTE_LANES).toHaveLength(10);
  });

  it('wires existing surfaces for volunteer, funding, and partners', () => {
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'volunteer')?.path).toBe('/fund/contribute');
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'financial')?.path).toBe('/fund');
    expect(CONTRIBUTE_LANES.find((lane) => lane.id === 'organization')?.path).toBe('/partners');
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
