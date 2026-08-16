/**
 * Civizen Score V2 — centralized reputation model.
 *
 * Distinguishes activity evaluation (how one activity went) from accumulated
 * category reputation (what the evidence justifies believing). Verification
 * changes evidential weight, not the evaluator's entered rating.
 *
 * Reputation uses Bayesian-style shrinkage toward a neutral prior. The prior
 * is used only inside an observed category; zero evidence stays unknown/null.
 *
 * Happiness & Human Fulfillment data must never feed this model, public
 * reputation, employment ranking, or governance power.
 */

export const SCORE_CALCULATION_VERSION = 'civizen-score-v2.0';
export const SCORE_CALCULATION_VERSION_LEGACY = 'civizen-score-v1.2';
export const SCORE_MODEL_VERSION_UNVERSIONED = 'legacy/unversioned';

/** Alias kept for call sites that prefer the V2 name. */
export const CIVIZEN_SCORE_MODEL_VERSION = SCORE_CALCULATION_VERSION;

export type ScoreMaturityStatus = 'not_established' | 'provisional' | 'established';
export type CategoryMaturityStatus = 'unknown' | 'provisional' | 'established';

export type ScoreConfidenceLevel =
  | 'insufficient'
  | 'low'
  | 'moderate'
  | 'high'
  | 'very_high';

export type ScoreCategoryIdV2 =
  | 'learning'
  | 'experience'
  | 'skills'
  | 'performance'
  | 'contributions';

export const SCORE_CATEGORY_COUNT = 5;

/**
 * Neutral prior for an *observed* category. Equivalent to several ordinary
 * independent activities so one excellent (or poor) event cannot dominate.
 */
export const REPUTATION_PRIOR_CENTER = 50;
export const REPUTATION_PRIOR_STRENGTH = 6;

/** Bounded observation weights. Duration/verification must not explode. */
export const EVIDENCE_WEIGHT_BASE = 1;
export const EVIDENCE_WEIGHT_VERIFIED = 1.25;
export const EVIDENCE_WEIGHT_UNVERIFIED = 0.55;
export const EVIDENCE_WEIGHT_RECENCY_MIN = 0.75;
export const EVIDENCE_WEIGHT_RECENCY_MAX = 1.12;
export const EVIDENCE_WEIGHT_EVALUATOR_MAX = 1.3;
export const EVIDENCE_WEIGHT_RELIABILITY_MIN = 0.35;
export const EVIDENCE_WEIGHT_RELIABILITY_MAX = 1.22;
export const EVIDENCE_WEIGHT_DURATION_MIN = 0.2;
export const EVIDENCE_WEIGHT_DURATION_MAX = 1.6;
export const EVIDENCE_WEIGHT_TOTAL_MAX = 2.75;
/** Project evidence may add bounded Experience support; it does not mint tenure. */
export const EXPERIENCE_PROJECT_SUPPORT_MAX = 12;
export const EXPERIENCE_PROJECT_PRIOR_STRENGTH = 8;
export const EXPERIENCE_PROJECT_SIGNAL_MIN = 8;
export const EXPERIENCE_PROJECT_SIGNAL_SPAN = 14;
export const EXPERIENCE_PROJECT_SIGNAL_FALLBACK = 12;

/** Recency window for "Recently Demonstrated" skills/projects. */
export const RECENTLY_DEMONSTRATED_DAYS = 180;
export const RECENCY_HALF_LIFE_DAYS = 180;

export const CATEGORY_PROVISIONAL_MAX_VOLUME = 3;
export const CATEGORY_ESTABLISHED_MIN_VOLUME = 4;

export type EvidenceRootRef = {
  id: string;
  sourceTable: string;
  sourceId: string;
  verified: boolean;
  occurredAt?: string | null;
  evaluatorIds?: string[];
  evaluationCount?: number;
};

export type CategoryObservation = {
  evidenceRootId: string;
  value: number;
  verified: boolean;
  occurredAt?: string | null;
  evaluatorIds?: string[];
  evaluationCount?: number;
  /** Minutes of activity when known; omitted rather than invented. */
  durationMinutes?: number | null;
  /** Bounded evaluator reliability from evaluator-reputation-v1. Default 1. */
  evaluatorReliability?: number | null;
};

export type CategoryReputation = {
  score: number | null;
  status: CategoryMaturityStatus;
  independentEvidenceCount: number;
  independentVerifiedCount: number;
  evaluationCount: number;
  effectiveEvidenceVolume: number;
  evidenceRoots: string[];
  priorApplied: boolean;
};

export type EvidenceMaturity = {
  independentEvidenceCount: number;
  independentVerifiedCount: number;
  evaluationCount: number;
  evaluatorCount: number;
  effectiveEvidenceVolume: number;
  scoredCategoryCount: number;
  establishedCategoryCount: number;
  hasRecurrence: boolean;
  timeSpanDays: number;
  recentVerifiedRootCount: number;
  evidenceRoots: string[];
};

export type ScoreCoverage = {
  scoredCount: number;
  totalCount: number;
  ratio: number;
  missingCategoryIds: ScoreCategoryIdV2[];
  limited: boolean;
};

export type ConfidenceFactor = {
  id: string;
  label: string;
  met: boolean;
  current: number | boolean | string | null;
  required: number | boolean | string | null;
};

export type ConfidenceResult = {
  confidence: ScoreConfidenceLevel;
  factors: ConfidenceFactor[];
};

export type ScoreCalculationExplanation = {
  modelVersion: string;
  categoryStatus: Partial<Record<ScoreCategoryIdV2, CategoryMaturityStatus>>;
  categoryEvidenceRoots: Partial<Record<ScoreCategoryIdV2, string[]>>;
  rawEvidenceCount: number;
  effectiveEvidenceVolume: number;
  independentEvidenceCount: number;
  independentVerifiedCount: number;
  confidence: ScoreConfidenceLevel;
  coverage: ScoreCoverage;
  keyFactors: string[];
  provisionalReasons: string[];
};

export function clampUnitInterval(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function clampScoreValue(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
}

/**
 * Historical snapshots keep whatever version they were stored with.
 * Missing versions are marked unversioned — never rewritten as V2.
 */
export function resolveScoreModelVersion(version?: string | null): string {
  const trimmed = typeof version === 'string' ? version.trim() : '';
  if (!trimmed) return SCORE_MODEL_VERSION_UNVERSIONED;
  return trimmed;
}

export function isLegacyScoreModelVersion(version?: string | null): boolean {
  const resolved = resolveScoreModelVersion(version);
  return (
    resolved === SCORE_MODEL_VERSION_UNVERSIONED ||
    resolved.startsWith('civizen-score-v1')
  );
}

export function evidenceRootId(sourceTable: string, sourceId: string): string {
  return `${sourceTable}:${sourceId}`;
}

export function uniqueEvidenceRoots(refs: EvidenceRootRef[]): EvidenceRootRef[] {
  const seen = new Map<string, EvidenceRootRef>();
  for (const ref of refs) {
    const id = ref.id || evidenceRootId(ref.sourceTable, ref.sourceId);
    const existing = seen.get(id);
    if (!existing) {
      seen.set(id, { ...ref, id });
      continue;
    }
    const evaluatorIds = [...new Set([...(existing.evaluatorIds ?? []), ...(ref.evaluatorIds ?? [])])];
    seen.set(id, {
      ...existing,
      verified: existing.verified || ref.verified,
      evaluationCount: Math.max(existing.evaluationCount ?? 0, ref.evaluationCount ?? 0) || evaluatorIds.length,
      evaluatorIds,
    });
  }
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function recencyWeight(occurredAt?: string | null, nowMs = Date.now()): number {
  if (!occurredAt) return 1;
  const t = Date.parse(occurredAt);
  if (!Number.isFinite(t)) return 1;
  const ageDays = Math.max(0, (nowMs - t) / (24 * 60 * 60 * 1000));
  const decay = Math.exp(-ageDays / RECENCY_HALF_LIFE_DAYS);
  return clampUnitInterval(
    EVIDENCE_WEIGHT_RECENCY_MIN + decay * (EVIDENCE_WEIGHT_RECENCY_MAX - EVIDENCE_WEIGHT_RECENCY_MIN),
    EVIDENCE_WEIGHT_RECENCY_MIN,
    EVIDENCE_WEIGHT_RECENCY_MAX,
  );
}

function durationWeight(durationMinutes?: number | null): number {
  if (durationMinutes == null || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return 1;
  }
  const hours = durationMinutes / 60;
  // 15 minutes remains a small fraction of a working-day activity.
  const scaled = 0.18 + (Math.log1p(hours) / Math.log1p(8)) * 1.15;
  return clampUnitInterval(scaled, EVIDENCE_WEIGHT_DURATION_MIN, EVIDENCE_WEIGHT_DURATION_MAX);
}

function evaluatorWeight(evaluatorCount: number): number {
  if (evaluatorCount <= 1) return 1;
  return clampUnitInterval(1 + Math.log1p(evaluatorCount - 1) * 0.18, 1, EVIDENCE_WEIGHT_EVALUATOR_MAX);
}

/** Bounded weight for one canonical evidence root. Duplicate projections must collapse first. */
export function observationWeight(
  observation: CategoryObservation,
  options?: { nowMs?: number },
): number {
  const verifiedPart = observation.verified ? EVIDENCE_WEIGHT_VERIFIED : EVIDENCE_WEIGHT_UNVERIFIED;
  const reliability = clampUnitInterval(
    observation.evaluatorReliability ?? 1,
    EVIDENCE_WEIGHT_RELIABILITY_MIN,
    EVIDENCE_WEIGHT_RELIABILITY_MAX,
  );
  const product =
    EVIDENCE_WEIGHT_BASE *
    verifiedPart *
    recencyWeight(observation.occurredAt, options?.nowMs) *
    durationWeight(observation.durationMinutes) *
    evaluatorWeight(Math.max(observation.evaluatorIds?.length ?? 0, 0)) *
    reliability;
  return clampUnitInterval(product, 0.15, EVIDENCE_WEIGHT_TOTAL_MAX);
}

/**
 * Weighted Bayesian estimate. Empty observations → null (never the prior center).
 */
export function shrinkReputation(
  observations: Array<{ value: number; weight: number }>,
  options?: { priorCenter?: number; priorStrength?: number },
): number | null {
  if (observations.length === 0) return null;
  const usable = observations.filter(
    (item) => Number.isFinite(item.value) && Number.isFinite(item.weight) && item.weight > 0,
  );
  if (usable.length === 0) return null;
  const priorCenter = options?.priorCenter ?? REPUTATION_PRIOR_CENTER;
  const priorStrength = options?.priorStrength ?? REPUTATION_PRIOR_STRENGTH;
  const weightSum = usable.reduce((sum, item) => sum + item.weight, 0);
  const weighted = usable.reduce((sum, item) => sum + item.weight * item.value, 0);
  return clampScoreValue((priorStrength * priorCenter + weighted) / (priorStrength + weightSum));
}

export function effectiveVolume(weights: number[]): number {
  return Math.round(weights.reduce((sum, w) => sum + w, 0) * 100) / 100;
}

export function reputationFromObservations(
  observations: CategoryObservation[],
  options?: { nowMs?: number },
): CategoryReputation {
  const byRoot = new Map<string, CategoryObservation[]>();
  for (const observation of observations) {
    const list = byRoot.get(observation.evidenceRootId) ?? [];
    list.push(observation);
    byRoot.set(observation.evidenceRootId, list);
  }

  const collapsed: Array<{ value: number; weight: number; root: string; verified: boolean; evaluations: number }> =
    [];
  for (const [root, items] of [...byRoot.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const values = items.map((item) => item.value).filter((value) => Number.isFinite(value));
    if (values.length === 0) continue;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const evaluatorIds = [...new Set(items.flatMap((item) => item.evaluatorIds ?? []))];
    // Duplicate rows of the same root must not sum. Distinct evaluator IDs are the diversity signal;
    // otherwise keep the strongest stored evaluationCount on a single canonical observation.
    const evaluationCount =
      evaluatorIds.length > 0
        ? evaluatorIds.length
        : Math.max(1, ...items.map((item) => item.evaluationCount ?? 0), 1);
    const latest = [...items].sort(
      (a, b) => Date.parse(b.occurredAt ?? '') - Date.parse(a.occurredAt ?? ''),
    )[0];
    const combined: CategoryObservation = {
      ...latest,
      evidenceRootId: root,
      value: mean,
      verified: items.some((item) => item.verified),
      evaluatorIds,
      evaluationCount,
    };
    collapsed.push({
      value: mean,
      weight: observationWeight(combined, { nowMs: options?.nowMs }),
      root,
      verified: combined.verified,
      evaluations: Math.max(evaluationCount, 1),
    });
  }

  const score = shrinkReputation(collapsed.map((item) => ({ value: item.value, weight: item.weight })));
  const volume = effectiveVolume(collapsed.map((item) => item.weight));
  const independentEvidenceCount = collapsed.length;
  const independentVerifiedCount = collapsed.filter((item) => item.verified).length;
  let status: CategoryMaturityStatus = 'unknown';
  if (score != null) {
    status = volume >= CATEGORY_ESTABLISHED_MIN_VOLUME ? 'established' : 'provisional';
  }

  return {
    score,
    status,
    independentEvidenceCount,
    independentVerifiedCount,
    evaluationCount: collapsed.reduce((sum, item) => sum + item.evaluations, 0),
    effectiveEvidenceVolume: volume,
    evidenceRoots: collapsed.map((item) => item.root),
    priorApplied: score != null,
  };
}

export function meanFinite(values: Array<number | null | undefined>): number | null {
  const usable = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (usable.length === 0) return null;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

export function daysBetween(startIso?: string | null, endIso?: string | null): number {
  const start = startIso ? Date.parse(startIso) : NaN;
  const end = endIso ? Date.parse(endIso) : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.round(Math.abs(end - start) / (24 * 60 * 60 * 1000)));
}

export function isWithinRecentWindow(iso?: string | null, nowMs = Date.now()): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return nowMs - t <= RECENTLY_DEMONSTRATED_DAYS * 24 * 60 * 60 * 1000;
}

export function blendActivityEvaluation(args: {
  quality?: number | null;
  impact?: number | null;
  collaboration?: number | null;
}): number | null {
  const parts: Array<{ value: number; weight: number }> = [];
  if (args.impact != null && Number.isFinite(args.impact)) parts.push({ value: args.impact, weight: 0.45 });
  if (args.quality != null && Number.isFinite(args.quality)) parts.push({ value: args.quality, weight: 0.4 });
  if (args.collaboration != null && Number.isFinite(args.collaboration)) {
    parts.push({ value: args.collaboration, weight: 0.15 });
  }
  if (parts.length === 0) return null;
  const weightSum = parts.reduce((sum, part) => sum + part.weight, 0);
  return parts.reduce((sum, part) => sum + part.value * part.weight, 0) / weightSum;
}

export {
  CONFIDENCE_GATES,
  TIER_EVIDENCE_GATES,
  computeCoverage,
  computeEvidenceMaturity,
  computeConfidence,
  deriveOverallStatus,
  minConfidenceLevel,
} from '@/lib/civizen-score-maturity';
export {
  type CanonicalSkillState,
  type DemonstratedProjectEvidence,
  canonicalSkillId,
  mergeCanonicalSkills,
  countVerifiedUniqueSkills,
  countRecentlyDemonstratedSkills,
  uniqueProjectRoots,
  projectSupportForExperience,
} from '@/lib/civizen-score-skills';
