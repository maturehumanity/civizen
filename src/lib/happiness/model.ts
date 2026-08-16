/**
 * Versioned Happiness Level derivation (`happiness-level-v1`).
 *
 * This is a working, replaceable model — not a scientifically final formula
 * and not a diagnosis. Thresholds and distress caps live here / in `levels.ts`,
 * not in UI. Historic `happiness_state_snapshots.model_version` keeps the
 * version used when a snapshot was stored so later formula changes do not
 * silently rewrite those rows.
 *
 * Internal 0–100 values are for aggregation only. Public output is five levels,
 * trend words, and domain states. One distressed domain must not vanish inside
 * a positive average: high-priority areas are always listed separately, and
 * overall level is capped when distress is severe.
 */

import { AFFECTING_TO_DOMAIN } from './domains';
import { HAPPINESS_LEVEL_BOUNDS, internalFromFeeling, internalFromLevel, levelFromInternal } from './levels';
import {
  HAPPINESS_DOMAINS,
  HAPPINESS_MODEL_VERSION,
  type CheckInFeeling,
  type HappinessCheckIn,
  type HappinessConfidence,
  type HappinessDomainId,
  type HappinessInternalSnapshot,
  type HappinessLevel,
  type HappinessMonthlyReview,
  type HappinessPublicView,
  type HappinessTrend,
  type HappinessWeeklyPulse,
} from './types';

const MS_DAY = 86_400_000;
const TREND_THRESHOLD = 6;
const RECENCY_HALF_LIFE_DAYS = 21;

export type HappinessObservationBundle = {
  checkIns: HappinessCheckIn[];
  pulses: HappinessWeeklyPulse[];
  reviews: HappinessMonthlyReview[];
  previousOverallLevel?: HappinessLevel | null;
  pendingFollowUp?: HappinessPublicView['pendingFollowUp'];
  now?: Date;
  /** Work assessments influence only the Work Fulfillment domain, slowly. */
  workAssessments?: { dimensions: Partial<Record<string, HappinessLevel>>; createdAt: string }[];
};

type WeightedSample = { domain: HappinessDomainId; value: number; weight: number; at: number };

function daysAgo(at: number, now: number): number {
  return Math.max(0, (now - at) / MS_DAY);
}

function recencyWeight(at: number, now: number): number {
  const days = daysAgo(at, now);
  return Math.exp(-days / RECENCY_HALF_LIFE_DAYS);
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weightedMean(samples: { value: number; weight: number }[]): number | null {
  const total = samples.reduce((sum, sample) => sum + sample.weight, 0);
  if (total <= 0) return null;
  return samples.reduce((sum, sample) => sum + sample.value * sample.weight, 0) / total;
}

const WORK_TO_HAPPINESS_WEIGHT = 0.55;

function collectSamples(bundle: HappinessObservationBundle, nowMs: number): WeightedSample[] {
  const samples: WeightedSample[] = [];

  for (const checkIn of bundle.checkIns) {
    const at = new Date(checkIn.createdAt).getTime();
    const weight = recencyWeight(at, nowMs);
    const value = internalFromFeeling(checkIn.feeling);
    samples.push({ domain: 'emotional_wellbeing', value, weight, at });
    samples.push({ domain: 'life_satisfaction', value, weight: weight * 0.45, at });
    const mapped = checkIn.affectingMost ? AFFECTING_TO_DOMAIN[checkIn.affectingMost] : undefined;
    if (mapped) {
      samples.push({ domain: mapped, value, weight: weight * 0.7, at });
    }
  }

  for (const pulse of bundle.pulses) {
    const at = new Date(pulse.createdAt).getTime();
    const weight = recencyWeight(at, nowMs) * 1.1;
    for (const domain of HAPPINESS_DOMAINS) {
      const level = pulse.domainAnswers[domain];
      if (!level) continue;
      samples.push({ domain, value: internalFromLevel(level), weight, at });
    }
  }

  for (const review of bundle.reviews) {
    const at = new Date(review.createdAt).getTime();
    const weight = recencyWeight(at, nowMs) * 1.35;
    for (const domain of HAPPINESS_DOMAINS) {
      const level = review.domainAnswers[domain];
      if (!level) continue;
      samples.push({ domain, value: internalFromLevel(level), weight, at });
    }
  }

  for (const assessment of bundle.workAssessments ?? []) {
    const at = new Date(assessment.createdAt).getTime();
    const levels = Object.values(assessment.dimensions).filter((level): level is HappinessLevel => Boolean(level));
    if (!levels.length) continue;
    const order: HappinessLevel[] = ['struggling', 'unsettled', 'balanced', 'flourishing', 'thriving'];
    const ranks = levels.map((level) => order.indexOf(level)).sort((a, b) => a - b);
    const median = order[ranks[Math.floor(ranks.length / 2)]];
    if (!median) continue;
    samples.push({
      domain: 'work_fulfillment',
      value: internalFromLevel(median),
      weight: recencyWeight(at, nowMs) * WORK_TO_HAPPINESS_WEIGHT,
      at,
    });
  }

  return samples;
}

function domainInternals(samples: WeightedSample[]): Partial<Record<HappinessDomainId, number>> {
  const byDomain = new Map<HappinessDomainId, { value: number; weight: number }[]>();
  for (const sample of samples) {
    const list = byDomain.get(sample.domain) ?? [];
    list.push(sample);
    byDomain.set(sample.domain, list);
  }
  const result: Partial<Record<HappinessDomainId, number>> = {};
  for (const domain of HAPPINESS_DOMAINS) {
    const list = byDomain.get(domain);
    if (!list?.length) continue;
    const value = weightedMean(list);
    if (value != null) result[domain] = value;
  }
  return result;
}

function capOverallForDistress(
  overall: number,
  domainLevels: Partial<Record<HappinessDomainId, HappinessLevel>>,
): number {
  const strugglingCount = HAPPINESS_DOMAINS.filter((domain) => domainLevels[domain] === 'struggling').length;
  if (strugglingCount >= 2) {
    return Math.min(overall, HAPPINESS_LEVEL_MAX_FOR_CAP[HAPPINESS_DISTRESS_CAPS.twoOrMoreStrugglingMax]);
  }
  if (strugglingCount === 1) {
    return Math.min(overall, HAPPINESS_LEVEL_MAX_FOR_CAP[HAPPINESS_DISTRESS_CAPS.oneStrugglingMax]);
  }
  return overall;
}

/** Distress caps use the public level bounds so UI never hard-codes them. */
export const HAPPINESS_DISTRESS_CAPS = {
  twoOrMoreStrugglingMax: 'balanced',
  oneStrugglingMax: 'flourishing',
} as const;

const HAPPINESS_LEVEL_MAX_FOR_CAP = {
  balanced: HAPPINESS_LEVEL_BOUNDS.balanced.max,
  flourishing: HAPPINESS_LEVEL_BOUNDS.flourishing.max,
} as const;

function deriveOverallInternal(
  domainInternal: Partial<Record<HappinessDomainId, number>>,
  samples: WeightedSample[],
  nowMs: number,
): number | null {
  const domainValues = HAPPINESS_DOMAINS.map((domain) => domainInternal[domain]).filter(
    (value): value is number => typeof value === 'number',
  );
  const domainMean = mean(domainValues);
  const emotional = weightedMean(
    samples.filter((sample) => sample.domain === 'emotional_wellbeing' && daysAgo(sample.at, nowMs) <= 14),
  );
  const lifeEval = domainInternal.life_satisfaction ?? null;
  const meaning = domainInternal.meaning_purpose ?? null;

  const parts: { value: number; weight: number }[] = [];
  if (emotional != null) parts.push({ value: emotional, weight: 0.25 });
  if (lifeEval != null) parts.push({ value: lifeEval, weight: 0.2 });
  if (meaning != null) parts.push({ value: meaning, weight: 0.15 });
  if (domainMean != null) parts.push({ value: domainMean, weight: 0.25 });

  const recent = samples.filter((sample) => daysAgo(sample.at, nowMs) <= 21);
  const recentMean = weightedMean(recent);
  if (recentMean != null) parts.push({ value: recentMean, weight: 0.15 });

  return weightedMean(parts);
}

function deriveTrend(
  samples: WeightedSample[],
  nowMs: number,
  previousLevel: HappinessLevel | null | undefined,
  currentLevel: HappinessLevel | null,
): HappinessPublicView['trend'] {
  const recent = samples.filter((sample) => daysAgo(sample.at, nowMs) <= 7);
  const prior = samples.filter((sample) => {
    const days = daysAgo(sample.at, nowMs);
    return days > 7 && days <= 28;
  });
  const recentMean = weightedMean(recent);
  const priorMean = weightedMean(prior);

  let direction: HappinessTrend = 'unknown';
  if (recentMean != null && priorMean != null && recent.length >= 2 && prior.length >= 2) {
    const delta = recentMean - priorMean;
    if (delta >= TREND_THRESHOLD) direction = 'improving';
    else if (delta <= -TREND_THRESHOLD) direction = 'declining';
    else direction = 'stable';
  } else if (previousLevel && currentLevel && previousLevel !== currentLevel) {
    direction = compareLevelTrend(previousLevel, currentLevel);
  } else if (currentLevel) {
    direction = 'stable';
  }

  let weeks: number | undefined;
  if (direction === 'improving' || direction === 'declining') {
    weeks = estimateTrendWeeks(samples, nowMs, direction);
  }

  const decliningWork = isDomainDeclining(samples, nowMs, 'work_fulfillment');
  return {
    direction,
    weeks,
    previousLevel: previousLevel && currentLevel && previousLevel !== currentLevel ? previousLevel : undefined,
    domainNote: decliningWork ? 'work_fulfillment' : undefined,
  };
}

function compareLevelTrend(previous: HappinessLevel, current: HappinessLevel): HappinessTrend {
  const order: HappinessLevel[] = ['struggling', 'unsettled', 'balanced', 'flourishing', 'thriving'];
  const delta = order.indexOf(current) - order.indexOf(previous);
  if (delta > 0) return 'improving';
  if (delta < 0) return 'declining';
  return 'stable';
}

function estimateTrendWeeks(
  samples: WeightedSample[],
  nowMs: number,
  direction: 'improving' | 'declining',
): number | undefined {
  const byWeek = new Map<number, number[]>();
  for (const sample of samples) {
    const week = Math.floor(daysAgo(sample.at, nowMs) / 7);
    const list = byWeek.get(week) ?? [];
    list.push(sample.value);
    byWeek.set(week, list);
  }
  const weeks = [...byWeek.keys()].sort((a, b) => a - b);
  if (weeks.length < 2) return undefined;
  const means = weeks.map((week) => mean(byWeek.get(week) ?? []) ?? 0);
  let streak = 1;
  for (let i = 1; i < means.length; i += 1) {
    const delta = means[i - 1]! - means[i]!;
    const matches = direction === 'improving' ? delta >= 2 : delta <= -2;
    if (matches) streak += 1;
    else break;
  }
  return streak >= 2 ? streak : undefined;
}

function isDomainDeclining(samples: WeightedSample[], nowMs: number, domain: HappinessDomainId): boolean {
  const domainSamples = samples.filter((sample) => sample.domain === domain);
  const recent = weightedMean(domainSamples.filter((sample) => daysAgo(sample.at, nowMs) <= 10));
  const prior = weightedMean(
    domainSamples.filter((sample) => {
      const days = daysAgo(sample.at, nowMs);
      return days > 10 && days <= 40;
    }),
  );
  return recent != null && prior != null && recent <= prior - TREND_THRESHOLD;
}

function deriveConfidence(samples: WeightedSample[], reviews: HappinessMonthlyReview[], nowMs: number): HappinessConfidence {
  const uniqueDays = new Set(samples.map((sample) => new Date(sample.at).toISOString().slice(0, 10)));
  const newest = samples.reduce((max, sample) => Math.max(max, sample.at), 0);
  const newestAge = newest ? daysAgo(newest, nowMs) : 999;
  const monthlyRecent = reviews.some((review) => daysAgo(new Date(review.createdAt).getTime(), nowMs) <= 45);

  if (uniqueDays.size < 2) return 'insufficient';
  if (uniqueDays.size < 5 || newestAge > 21) return 'low';
  if (uniqueDays.size >= 10 && monthlyRecent) return 'high';
  return 'moderate';
}

function pickStrongestAndAttention(
  domainLevels: Partial<Record<HappinessDomainId, HappinessLevel>>,
): { strongest: HappinessDomainId[]; attention: HappinessDomainId[] } {
  const order: HappinessLevel[] = ['struggling', 'unsettled', 'balanced', 'flourishing', 'thriving'];
  const ranked = HAPPINESS_DOMAINS.filter((domain) => domainLevels[domain]).map((domain) => ({
    domain,
    rank: order.indexOf(domainLevels[domain]!),
  }));
  const strongest = [...ranked]
    .filter((row) => row.rank >= order.indexOf('flourishing'))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 3)
    .map((row) => row.domain);
  const attention = [...ranked]
    .filter((row) => row.rank <= order.indexOf('unsettled'))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3)
    .map((row) => row.domain);
  return { strongest, attention };
}

export function deriveHappinessView(bundle: HappinessObservationBundle): {
  view: HappinessPublicView;
  internal: HappinessInternalSnapshot;
} {
  const now = bundle.now ?? new Date();
  const nowMs = now.getTime();
  const samples = collectSamples(bundle, nowMs);
  const domainInternal = domainInternals(samples);
  const domainLevels: Partial<Record<HappinessDomainId, HappinessLevel>> = {};
  for (const domain of HAPPINESS_DOMAINS) {
    const value = domainInternal[domain];
    if (typeof value === 'number') domainLevels[domain] = levelFromInternal(value);
  }

  const rawOverall = deriveOverallInternal(domainInternal, samples, nowMs);
  const capped = rawOverall == null ? null : capOverallForDistress(rawOverall, domainLevels);
  const overallLevel = capped == null ? null : levelFromInternal(capped);
  const { strongest, attention } = pickStrongestAndAttention(domainLevels);
  const latestCheckIn = [...bundle.checkIns].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0] ?? null;

  const view: HappinessPublicView = {
    modelVersion: HAPPINESS_MODEL_VERSION,
    overallLevel,
    trend: deriveTrend(samples, nowMs, bundle.previousOverallLevel, overallLevel),
    confidence: deriveConfidence(samples, bundle.reviews, nowMs),
    strongestDomains: strongest,
    attentionDomains: attention,
    domainLevels,
    latestCheckIn,
    pendingFollowUp: bundle.pendingFollowUp ?? null,
    observationCount: new Set(samples.map((sample) => new Date(sample.at).toISOString().slice(0, 10))).size,
    computedAt: now.toISOString(),
  };

  return {
    view,
    internal: {
      overallInternal: capped,
      domainInternal,
    },
  };
}

export function emptyHappinessView(now = new Date()): HappinessPublicView {
  return {
    modelVersion: HAPPINESS_MODEL_VERSION,
    overallLevel: null,
    trend: { direction: 'unknown' },
    confidence: 'insufficient',
    strongestDomains: [],
    attentionDomains: [],
    domainLevels: {},
    latestCheckIn: null,
    pendingFollowUp: null,
    observationCount: 0,
    computedAt: now.toISOString(),
  };
}

export function feelingFromUnknown(value: string): CheckInFeeling | null {
  return (['very_difficult', 'difficult', 'okay', 'good', 'very_good'] as const).includes(value as CheckInFeeling)
    ? (value as CheckInFeeling)
    : null;
}
