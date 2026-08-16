import { isAffectingCategory, isCauseTag, isSupportTag, tagLabelKey } from './causes';
import { causeGroupForArea } from './checkin-flow';
import type {
  AffectingCategory,
  CausePolarity,
  HappinessCause,
  HappinessCheckIn,
} from './types';

export const CHECKIN_PATTERN_MIN_HITS = 2;

export type CheckInPattern = {
  category: AffectingCategory;
  polarity: CausePolarity;
  tags: string[];
  hits: number;
};

function isTagForGroup(group: ReturnType<typeof causeGroupForArea>, tag: string, polarity: CausePolarity): boolean {
  if (!group) return false;
  return polarity === 'support' ? isSupportTag(group, tag) : isCauseTag(group, tag);
}

/**
 * After several check-ins, name the specific supports and problems members
 * confirmed — not merely “Balanced + Work.” Does not invent or diagnose.
 */
export function explainCheckInPatterns(
  checkIns: Pick<HappinessCheckIn, 'id' | 'areas' | 'affectingMost'>[],
  causes: Pick<HappinessCause, 'sourceKind' | 'sourceId' | 'category' | 'polarity' | 'group'>[],
): CheckInPattern[] {
  const recentIds = new Set(checkIns.slice(0, 8).map((row) => row.id));
  const areaHits = new Map<string, number>();
  const tagHits = new Map<string, number>();

  for (const checkIn of checkIns.slice(0, 8)) {
    const areas = checkIn.areas.length
      ? checkIn.areas
      : checkIn.affectingMost
        ? [{ category: checkIn.affectingMost, polarity: 'problem' as const }]
        : [];
    const seenArea = new Set<string>();
    for (const area of areas) {
      for (const polarity of area.polarity === 'both' ? (['problem', 'support'] as const) : [area.polarity]) {
        const key = `${area.category}:${polarity}`;
        if (seenArea.has(key)) continue;
        seenArea.add(key);
        areaHits.set(key, (areaHits.get(key) ?? 0) + 1);
      }
    }
  }

  for (const cause of causes) {
    if (cause.sourceKind !== 'checkin' || !cause.sourceId || !recentIds.has(cause.sourceId)) continue;
    if (!isAffectingCategory(cause.category) && isTagForGroup(cause.group, cause.category, cause.polarity)) {
      const key = `${cause.group}:${cause.polarity}:${cause.category}`;
      tagHits.set(key, (tagHits.get(key) ?? 0) + 1);
    }
  }

  const patterns: CheckInPattern[] = [];
  for (const [key, hits] of areaHits) {
    if (hits < CHECKIN_PATTERN_MIN_HITS) continue;
    const [category, polarity] = key.split(':') as [AffectingCategory, CausePolarity];
    const group = causeGroupForArea(category);
    const tags: string[] = [];
    if (group) {
      for (const [tagKey, tagCount] of tagHits) {
        const [tagGroup, tagPolarity, tag] = tagKey.split(':');
        if (tagGroup === group && tagPolarity === polarity && tagCount >= CHECKIN_PATTERN_MIN_HITS && tag) {
          tags.push(tag);
        }
      }
    }
    patterns.push({ category, polarity, tags, hits });
  }

  patterns.sort((a, b) => b.hits - a.hits || Number(b.polarity === 'problem') - Number(a.polarity === 'problem'));
  return patterns.slice(0, 4);
}

export function formatCheckInPattern(
  pattern: CheckInPattern,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const area = t(`happiness.affecting.${pattern.category}`);
  const group = causeGroupForArea(pattern.category);
  const tagLabels = pattern.tags
    .map((tag) => (group ? t(tagLabelKey(group, tag, pattern.polarity)) : tag))
    .filter(Boolean);
  if (tagLabels.length) {
    const key = pattern.polarity === 'support' ? 'happiness.patternSupportWithTags' : 'happiness.patternProblemWithTags';
    return t(key, { area, tags: tagLabels.join(', ') });
  }
  const key = pattern.polarity === 'support' ? 'happiness.patternSupport' : 'happiness.patternProblem';
  return t(key, { area });
}

export function formatCheckInAreasLine(
  checkIn: Pick<HappinessCheckIn, 'areas' | 'affectingMost'>,
  causes: Pick<HappinessCause, 'sourceId' | 'sourceKind' | 'category' | 'polarity' | 'group'>[],
  t: (key: string, vars?: Record<string, string | number>) => string,
  checkInId?: string,
): string {
  const areas = checkIn.areas.length
    ? checkIn.areas
    : checkIn.affectingMost
      ? [{ category: checkIn.affectingMost, polarity: 'problem' as const }]
      : [];
  if (!areas.length) return '';
  const related = causes.filter((cause) => cause.sourceKind === 'checkin' && cause.sourceId === checkInId);
  return areas
    .map((area) => {
      const polarityLabel =
        area.polarity === 'support'
          ? t('happiness.polarity.support')
          : area.polarity === 'both'
            ? t('happiness.polarity.both')
            : t('happiness.polarity.problem');
      const group = causeGroupForArea(area.category);
      const tags = related
        .filter((cause) => {
          if (!group) return false;
          const polarities = area.polarity === 'both' ? ['problem', 'support'] : [area.polarity];
          return polarities.includes(cause.polarity) && isTagForGroup(group, cause.category, cause.polarity);
        })
        .map((cause) => (group ? t(tagLabelKey(group, cause.category, cause.polarity)) : cause.category));
      const unique = [...new Set(tags)];
      const base = `${t(`happiness.affecting.${area.category}`)} (${polarityLabel.toLowerCase()})`;
      return unique.length ? `${base} — ${unique.join(', ')}` : base;
    })
    .join(' · ');
}
