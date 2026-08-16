import { AFFECTING_TO_CAUSE_GROUP, AFFECTING_TO_DOMAIN } from './domains';
import { tagsForPolarity } from './causes';
import type {
  AffectingCategory,
  CausePolarity,
  CheckInArea,
  CheckInAreaPolarity,
  HappinessCauseGroup,
} from './types';

export type CheckInFollowUp = {
  category: AffectingCategory;
  polarity: CausePolarity;
  group: HappinessCauseGroup;
  tags: readonly string[];
};

const SKIP_TAG_FOLLOW_UP = new Set<AffectingCategory>(['something_else', 'environment']);

export function causeGroupForArea(category: AffectingCategory): HappinessCauseGroup | null {
  const group = AFFECTING_TO_CAUSE_GROUP[category];
  if (group === 'work' || group === 'health' || group === 'relationships' || group === 'security' || group === 'time' || group === 'purpose') {
    return group;
  }
  return null;
}

export function polaritiesForArea(polarity: CheckInAreaPolarity): CausePolarity[] {
  if (polarity === 'both') return ['problem', 'support'];
  return [polarity];
}

export function followUpsForAreas(areas: CheckInArea[]): CheckInFollowUp[] {
  const followUps: CheckInFollowUp[] = [];
  for (const area of areas) {
    if (SKIP_TAG_FOLLOW_UP.has(area.category)) continue;
    const group = causeGroupForArea(area.category);
    if (!group) continue;
    for (const polarity of polaritiesForArea(area.polarity)) {
      const tags = tagsForPolarity(group, polarity);
      if (!tags.length) continue;
      followUps.push({ category: area.category, polarity, group, tags });
    }
  }
  return followUps;
}

export function primaryAffectingMost(areas: CheckInArea[]): AffectingCategory | null {
  return areas.find((area) => area.polarity === 'problem' || area.polarity === 'both')?.category ?? areas[0]?.category ?? null;
}

export function areaHasProblem(areas: CheckInArea[], category: AffectingCategory): boolean {
  return areas.some((area) => area.category === category && (area.polarity === 'problem' || area.polarity === 'both'));
}

export function buildCheckInCauseRows(
  profileId: string,
  checkInId: string,
  areas: CheckInArea[],
  tags: { category: AffectingCategory; polarity: CausePolarity; tag: string }[] = [],
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const area of areas) {
    if (area.category === 'something_else') continue;
    for (const polarity of polaritiesForArea(area.polarity)) {
      rows.push({
        profile_id: profileId,
        source_kind: 'checkin',
        source_id: checkInId,
        domain: AFFECTING_TO_DOMAIN[area.category] ?? null,
        cause_group: AFFECTING_TO_CAUSE_GROUP[area.category] ?? 'purpose',
        category: area.category,
        polarity,
        confirmed: true,
        is_ai_suggestion: false,
      });
    }
  }
  for (const tag of tags) {
    rows.push({
      profile_id: profileId,
      source_kind: 'checkin',
      source_id: checkInId,
      domain: AFFECTING_TO_DOMAIN[tag.category] ?? null,
      cause_group: AFFECTING_TO_CAUSE_GROUP[tag.category] ?? 'purpose',
      category: tag.tag,
      polarity: tag.polarity,
      confirmed: true,
      is_ai_suggestion: false,
    });
  }
  return rows;
}
