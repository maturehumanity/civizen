/**
 * Civizen Score — five category model (V2).
 * Categories summarize demonstrated reputation from evidence; they are not a measure of human worth.
 * Activity evaluation (how one activity went) is kept separate from accumulated reputation.
 * Domains/pillars remain separate (where activity occurred vs how it is scored).
 */

import {
  calculateTierStatus,
  type CivizenTierStatus,
  type TierReadiness,
} from '@/lib/civizen-score-tiers';
import {
  EDUCATION_LEVEL_BASE_SCORE,
  highestEducationLevel,
  type EducationLevel,
} from '@/lib/education-institutions';
import {
  CIVIZEN_SCORE_MODEL_VERSION,
  SCORE_CALCULATION_VERSION as SCORE_MODEL_VERSION,
  SCORE_CALCULATION_VERSION_LEGACY,
  SCORE_MODEL_VERSION_UNVERSIONED,
  computeConfidence,
  computeCoverage,
  computeEvidenceMaturity,
  countRecentlyDemonstratedSkills,
  countVerifiedUniqueSkills,
  deriveOverallStatus,
  mergeCanonicalSkills,
  projectSupportForExperience,
  reputationFromObservations,
  resolveScoreModelVersion,
  uniqueEvidenceRoots,
  uniqueProjectRoots,
  type CanonicalSkillState,
  type CategoryMaturityStatus,
  type CategoryObservation,
  type ConfidenceFactor,
  type DemonstratedProjectEvidence,
  type EvidenceRootRef,
  type ScoreCoverage,
  type ScoreMaturityStatus,
} from '@/lib/civizen-score-model';

export const SCORE_CALCULATION_VERSION = SCORE_MODEL_VERSION;
export {
  CIVIZEN_SCORE_MODEL_VERSION,
  SCORE_CALCULATION_VERSION_LEGACY,
  SCORE_MODEL_VERSION_UNVERSIONED,
  resolveScoreModelVersion,
};

/** Education row input for Learning (level-aware). */
export type EducationScoreEntry = {
  level?: string | null;
  verificationStatus?: string | null;
};

export function isEducationVerified(status?: string | null): boolean {
  return status === 'verified' || status === 'certificate_provided';
}

export type ScoreCategoryId =
  | 'learning'
  | 'experience'
  | 'skills'
  | 'performance'
  | 'contributions';

export type ScoreConfidence =
  | 'insufficient'
  | 'low'
  | 'moderate'
  | 'high'
  | 'very_high';

export type ScoreStage =
  | 'not_scored'
  | 'building'
  | 'developing'
  | 'established'
  | 'highly_established';

export const DEFAULT_SCORE_WEIGHTS: Record<ScoreCategoryId, number> = {
  learning: 0.15,
  experience: 0.2,
  skills: 0.2,
  performance: 0.2,
  contributions: 0.25,
};

/** Clockwise from top on the dial. */
export const SCORE_CATEGORY_ORDER: ScoreCategoryId[] = [
  'learning',
  'skills',
  'performance',
  'contributions',
  'experience',
];

export interface ScoreCategoryMeta {
  id: ScoreCategoryId;
  shortLabel: string;
  fullLabel: string;
  description: string;
  icon: string;
  colorClass: string;
  metricGroups: Array<{ id: string; label: string }>;
  primaryAction: { label: string; href?: string };
}

export const SCORE_CATEGORIES: ScoreCategoryMeta[] = [
  {
    id: 'learning',
    shortLabel: 'Learning',
    fullLabel: 'Learning & Qualifications',
    description:
      'Education, qualifications, training, assessments, and continuing learning.',
    icon: 'GraduationCap',
    colorClass: 'pillar-education',
    metricGroups: [
      { id: 'education', label: 'Education' },
      { id: 'qualifications', label: 'Qualifications' },
      { id: 'training', label: 'Training' },
      { id: 'assessments', label: 'Assessments' },
      { id: 'continuing', label: 'Continuing Learning' },
    ],
    primaryAction: { label: 'Add Qualification', href: '/profile' },
  },
  {
    id: 'skills',
    shortLabel: 'Skills',
    fullLabel: 'Skills',
    description: 'Demonstrated abilities supported by evidence and validation.',
    icon: 'Sparkles',
    colorClass: 'pillar-culture',
    metricGroups: [
      { id: 'top', label: 'Top Skills' },
      { id: 'assessed', label: 'Assessed Skills' },
      { id: 'verified', label: 'Verified Skills' },
      { id: 'recent', label: 'Recently Demonstrated' },
      { id: 'needs_evidence', label: 'Needs Evidence' },
    ],
    primaryAction: { label: 'Add Skill', href: '/profile' },
  },
  {
    id: 'performance',
    shortLabel: 'Performance',
    fullLabel: 'Performance & Reliability',
    description:
      'Assignment engagement, reliability, on-time completion, and accomplishment.',
    icon: 'BadgeCheck',
    colorClass: 'pillar-responsibility',
    metricGroups: [
      { id: 'engagement', label: 'Engagement' },
      { id: 'activity', label: 'Activity' },
      { id: 'reliability', label: 'Reliability' },
      { id: 'accomplishment', label: 'Accomplishment' },
      { id: 'ratings', label: 'Ratings' },
    ],
    primaryAction: { label: 'Browse Assignments', href: '/market' },
  },
  {
    id: 'contributions',
    shortLabel: 'Contributions',
    fullLabel: 'Contributions & Impact',
    description: 'Value created for people, communities, and the public interest.',
    icon: 'Users',
    colorClass: 'pillar-environment',
    metricGroups: [
      { id: 'recent', label: 'Recent Contributions' },
      { id: 'verified', label: 'Verified Contributions' },
      { id: 'impact', label: 'Impact' },
      { id: 'collaboration', label: 'Collaboration' },
      { id: 'beneficiaries', label: 'Beneficiaries' },
      { id: 'ratings', label: 'Ratings' },
    ],
    primaryAction: { label: 'Add Contribution', href: '/profile' },
  },
  {
    id: 'experience',
    shortLabel: 'Experience',
    fullLabel: 'Experience',
    description:
      'Roles, projects, leadership, community, and other relevant lived experience.',
    icon: 'Briefcase',
    colorClass: 'pillar-economy',
    metricGroups: [
      { id: 'professional', label: 'Professional' },
      { id: 'projects', label: 'Projects' },
      { id: 'leadership', label: 'Leadership' },
      { id: 'community', label: 'Community' },
      { id: 'other', label: 'Other Relevant Experience' },
    ],
    primaryAction: { label: 'Add Experience', href: '/profile' },
  },
];

export interface ScoreMetric {
  id: string;
  label: string;
  value: number | null;
  unit?: string;
  confidence?: ScoreConfidence;
  sourceCount?: number;
}

export interface CategoryScoreInput {
  score: number | null;
  confidence?: ScoreConfidence;
  sourceCount?: number;
  verifiedSourceCount?: number;
  metrics?: ScoreMetric[];
  status?: CategoryMaturityStatus;
  independentEvidenceCount?: number;
  effectiveEvidenceVolume?: number;
  evidenceRoots?: string[];
  evidenceRootRefs?: EvidenceRootRef[];
}

export interface ScoreHistoryItem {
  id: string;
  eventDate: string;
  categoryId: ScoreCategoryId | 'overall';
  previousValue: number | null;
  newValue: number | null;
  overallPrevious: number | null;
  overallNew: number | null;
  reason: string;
  sourceRecordId?: string;
  calculationVersion: string;
}

export interface ScoreNextStep {
  id: string;
  label: string;
  actionType: string;
  actionTarget?: string;
  priority: number;
}

export interface ScoreValidationSummary {
  evidenceCount: number;
  verifiedEvidenceCount: number;
  ratingCount: number;
  endorsementCount: number;
  institutionalConfirmationCount: number;
  disputedItemCount: number;
  independentEvidenceCount?: number;
  independentVerifiedCount?: number;
  evaluationCount?: number;
}

export interface CategoryScoreResult {
  id: ScoreCategoryId;
  shortLabel: string;
  fullLabel: string;
  score: number | null;
  confidence: ScoreConfidence;
  sourceCount: number;
  verifiedSourceCount: number;
  metrics: ScoreMetric[];
  weight: number;
  status?: CategoryMaturityStatus;
  independentEvidenceCount?: number;
  effectiveEvidenceVolume?: number;
  evidenceRoots?: string[];
}

export interface CivizenScoreResponse {
  userId: string;
  overall: {
    /** Public established Civizen Score. Null until status is established. */
    score: number | null;
    /**
     * Observed-category average. Present whenever any category is scored.
     * Not a mature Civizen Score; UI must not present it as one.
     */
    provisionalEstimate: number | null;
    stage: ScoreStage;
    confidence: ScoreConfidence;
    lastCalculatedAt: string | null;
    calculationVersion: string;
    status?: ScoreMaturityStatus;
    modelVersion?: string;
  };
  tier: CivizenTierStatus;
  categories: CategoryScoreResult[];
  validation: ScoreValidationSummary;
  history: ScoreHistoryItem[];
  nextSteps: ScoreNextStep[];
  explanation: {
    weights: Record<ScoreCategoryId, number>;
    includedCategories: ScoreCategoryId[];
    excludedCategories: ScoreCategoryId[];
    missingData: string[];
    notes: string[];
  };
  coverage?: ScoreCoverage;
  confidenceFactors?: ConfidenceFactor[];
  tierReadiness?: TierReadiness;
  independentEvidenceCount?: number;
  effectiveEvidenceVolume?: number;
  explanations?: {
    modelVersion: string;
    coverageLimited: boolean;
    provisionalReasons: string[];
    keyFactors: string[];
  };
}

export interface ScoreCalculationInput {
  userId?: string;
  weights?: Partial<Record<ScoreCategoryId, number>>;
  categories?: Partial<Record<ScoreCategoryId, CategoryScoreInput>>;
  validation?: Partial<ScoreValidationSummary>;
  history?: ScoreHistoryItem[];
  calculatedAt?: string | null;
  hasSustainedActivity?: boolean;
  hasSubstantialImpact?: boolean;
  hasUnresolvedSeriousIntegrityIssue?: boolean;
  evidenceRoots?: EvidenceRootRef[];
  evaluatorCount?: number;
  timeSpanDays?: number;
  hasRecurrence?: boolean;
}

export function clampScore(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
}

function mergeWeights(
  overrides?: Partial<Record<ScoreCategoryId, number>>,
): Record<ScoreCategoryId, number> {
  return { ...DEFAULT_SCORE_WEIGHTS, ...overrides };
}

function metaFor(id: ScoreCategoryId): ScoreCategoryMeta {
  return SCORE_CATEGORIES.find((c) => c.id === id)!;
}

function emptyMetrics(id: ScoreCategoryId): ScoreMetric[] {
  return metaFor(id).metricGroups.map((group) => ({
    id: group.id,
    label: group.label,
    value: null,
    sourceCount: 0,
  }));
}

function deriveCategoryConfidence(args: {
  score: number | null;
  independentEvidenceCount: number;
  independentVerifiedCount: number;
  explicit?: ScoreConfidence;
}): ScoreConfidence {
  if (args.score == null && args.independentEvidenceCount === 0) return 'insufficient';
  // Category confidence is capped by local evidence volume; overall gates still apply.
  if (args.independentVerifiedCount <= 0) return args.independentEvidenceCount > 0 ? 'low' : 'insufficient';
  if (args.independentVerifiedCount < 5) return 'low';
  if (args.explicit && args.independentVerifiedCount >= 5) return args.explicit;
  if (args.independentVerifiedCount < 12) return 'low';
  return 'low';
}

function deriveStage(args: {
  overallScore: number | null;
  confidence: ScoreConfidence;
  evidenceCount: number;
  verifiedEvidenceCount: number;
  scoredCategoryCount: number;
}): ScoreStage {
  // Numerical "Not yet scored" is separate from stage; empty and early profiles use Building.
  if (args.overallScore == null) {
    return 'building';
  }
  if (args.confidence === 'very_high' && args.verifiedEvidenceCount >= 20) {
    return 'highly_established';
  }
  if (
    (args.confidence === 'high' || args.confidence === 'very_high') &&
    args.verifiedEvidenceCount >= 8 &&
    args.scoredCategoryCount >= 3
  ) {
    return 'established';
  }
  if (args.confidence === 'insufficient' || args.confidence === 'low') {
    return 'building';
  }
  return 'developing';
}

function buildNextSteps(
  categories: CategoryScoreResult[],
  validation: ScoreValidationSummary,
  options?: { skills?: CanonicalSkillState[] },
): ScoreNextStep[] {
  const steps: ScoreNextStep[] = [];
  const byId = Object.fromEntries(categories.map((c) => [c.id, c])) as Record<
    ScoreCategoryId,
    CategoryScoreResult
  >;

  const skills = options?.skills ?? [];
  const declaredOnly = skills.filter((skill) => skill.declared && !skill.demonstrated);
  const demonstrated = skills.filter((skill) => skill.demonstrated && skill.verifiedDemonstrations > 0);
  const staleDemonstrated = demonstrated.filter((skill) => !skill.lastDemonstratedAt);

  if (declaredOnly.length > 0) {
    const sample = declaredOnly[0].name;
    steps.push({
      id: 'demonstrate-declared-skill',
      label: `Demonstrate ${sample} through verified contribution.`,
      actionType: 'add_skill_evidence',
      actionTarget: '/contribute',
      priority: 1,
    });
  } else if (demonstrated.length > 0 && demonstrated.every((skill) => skill.verifiedDemonstrations < 2)) {
    steps.push({
      id: 'add-independent-skill-evidence',
      label: 'Add more independent verified evidence for a demonstrated skill.',
      actionType: 'add_skill_evidence',
      actionTarget: '/contribute',
      priority: 1,
    });
  } else if (staleDemonstrated.length > 0) {
    steps.push({
      id: 'refresh-skill-evidence',
      label: `Add a recent demonstration of ${staleDemonstrated[0].name}.`,
      actionType: 'add_skill_evidence',
      actionTarget: '/contribute',
      priority: 1,
    });
  } else if (byId.skills.score == null) {
    steps.push({
      id: 'add-skill-evidence',
      label: 'Add a skill and later demonstrate it through verified work.',
      actionType: 'add_skill_evidence',
      actionTarget: '/profile',
      priority: 1,
    });
  }
  if (byId.learning.sourceCount > 0 && byId.learning.verifiedSourceCount === 0) {
    steps.push({
      id: 'verify-qualification',
      label: 'Verify an existing qualification.',
      actionType: 'verify_qualification',
      actionTarget: '/profile',
      priority: 2,
    });
  }
  if (byId.performance.score == null) {
    steps.push({
      id: 'complete-assignment',
      label: 'Complete an active assignment.',
      actionType: 'browse_assignments',
      actionTarget: '/market',
      priority: 3,
    });
  }
  if (byId.contributions.score == null) {
    steps.push({
      id: 'record-contribution',
      label: 'Record the outcome of a contribution.',
      actionType: 'add_contribution',
      actionTarget: '/profile',
      priority: 4,
    });
  }
  if (validation.ratingCount === 0 && byId.performance.sourceCount > 0) {
    steps.push({
      id: 'request-rating',
      label: 'Request a contextual rating from an assignment recipient.',
      actionType: 'request_rating',
      priority: 5,
    });
  }
  if (byId.experience.sourceCount > 0 && byId.experience.verifiedSourceCount === 0) {
    steps.push({
      id: 'confirm-experience',
      label: 'Confirm an experience record.',
      actionType: 'confirm_experience',
      actionTarget: '/profile',
      priority: 6,
    });
  }
  if (byId.learning.score == null) {
    steps.push({
      id: 'add-learning',
      label: 'Add a learning or qualification record.',
      actionType: 'add_qualification',
      actionTarget: '/profile',
      priority: 7,
    });
  }
  if (byId.experience.score == null) {
    steps.push({
      id: 'add-experience',
      label: 'Add Experience',
      actionType: 'add_experience',
      actionTarget: '/profile',
      priority: 8,
    });
  }

  return steps.sort((a, b) => a.priority - b.priority).slice(0, 6);
}

/**
 * Numerical estimate from scored categories only.
 * Missing categories are never treated as zero. Weights are renormalized for the
 * estimate, but coverage remains first-class so a sparse profile is not presented
 * as a mature overall reputation.
 */
export function computeWeightedOverall(
  categoryScores: Record<ScoreCategoryId, number | null>,
  weights: Record<ScoreCategoryId, number> = DEFAULT_SCORE_WEIGHTS,
): { overall: number | null; included: ScoreCategoryId[]; excluded: ScoreCategoryId[] } {
  const included: ScoreCategoryId[] = [];
  const excluded: ScoreCategoryId[] = [];
  let weightedSum = 0;
  let weightSum = 0;

  for (const id of SCORE_CATEGORY_ORDER) {
    const score = categoryScores[id];
    if (score == null) {
      excluded.push(id);
      continue;
    }
    included.push(id);
    weightedSum += score * weights[id];
    weightSum += weights[id];
  }

  if (weightSum <= 0 || included.length === 0) {
    return { overall: null, included, excluded };
  }

  return {
    overall: clampScore(weightedSum / weightSum),
    included,
    excluded,
  };
}

export function calculateCivizenScoreModel(
  input: ScoreCalculationInput = {},
  options?: { skills?: CanonicalSkillState[] },
): CivizenScoreResponse {
  const weights = mergeWeights(input.weights);
  const collectedRoots: EvidenceRootRef[] = [...(input.evidenceRoots ?? [])];

  const categories: CategoryScoreResult[] = SCORE_CATEGORY_ORDER.map((id) => {
    const meta = metaFor(id);
    const raw = input.categories?.[id];
    const score =
      raw?.score == null || Number.isNaN(raw.score) ? null : clampScore(raw.score);
    const sourceCount = raw?.sourceCount ?? 0;
    const verifiedSourceCount = raw?.verifiedSourceCount ?? 0;
    const independentEvidenceCount = raw?.independentEvidenceCount ?? sourceCount;
    const independentVerifiedCount = raw?.verifiedSourceCount ?? 0;
    const confidence = deriveCategoryConfidence({
      score,
      independentEvidenceCount,
      independentVerifiedCount,
      explicit: raw?.confidence,
    });
    if (raw?.evidenceRootRefs?.length) {
      collectedRoots.push(...raw.evidenceRootRefs);
    } else if (raw?.evidenceRoots?.length) {
      for (const rootId of raw.evidenceRoots) {
        const [sourceTable, ...rest] = rootId.split(':');
        collectedRoots.push({
          id: rootId,
          sourceTable: sourceTable || id,
          sourceId: rest.join(':') || rootId,
          verified: independentVerifiedCount > 0,
        });
      }
    }
    const status: CategoryMaturityStatus =
      raw?.status ??
      (score == null
        ? 'unknown'
        : (raw?.effectiveEvidenceVolume ?? independentEvidenceCount) >= 4
          ? 'established'
          : 'provisional');
    return {
      id,
      shortLabel: meta.shortLabel,
      fullLabel: meta.fullLabel,
      score,
      confidence,
      sourceCount,
      verifiedSourceCount,
      metrics: raw?.metrics?.length ? raw.metrics : emptyMetrics(id),
      weight: weights[id],
      status,
      independentEvidenceCount,
      effectiveEvidenceVolume: raw?.effectiveEvidenceVolume,
      evidenceRoots: raw?.evidenceRoots,
    };
  });

  const scoreMap = Object.fromEntries(
    categories.map((c) => [c.id, c.score]),
  ) as Record<ScoreCategoryId, number | null>;

  const { overall: provisionalEstimate, included, excluded } = computeWeightedOverall(scoreMap, weights);
  const coverage = computeCoverage(scoreMap, SCORE_CATEGORY_ORDER);
  const establishedCategoryCount = categories.filter((c) => c.status === 'established').length;
  const effectiveEvidenceVolume = categories.reduce(
    (sum, c) => sum + (c.effectiveEvidenceVolume ?? 0),
    0,
  );

  const maturity = computeEvidenceMaturity({
    roots: collectedRoots,
    scoredCategoryCount: included.length,
    establishedCategoryCount,
    effectiveEvidenceVolume,
  });
  if (typeof input.timeSpanDays === 'number') {
    maturity.timeSpanDays = input.timeSpanDays;
  }
  if (typeof input.hasRecurrence === 'boolean') {
    maturity.hasRecurrence = input.hasRecurrence;
  }
  if (typeof input.evaluatorCount === 'number' && input.evaluatorCount > maturity.evaluatorCount) {
    maturity.evaluatorCount = input.evaluatorCount;
  }

  const independentVerifiedCount = Math.max(
    maturity.independentVerifiedCount,
    input.validation?.independentVerifiedCount ?? 0,
    collectedRoots.length === 0 ? (input.validation?.verifiedEvidenceCount ?? 0) : 0,
  );
  const independentEvidenceCount = Math.max(
    maturity.independentEvidenceCount,
    input.validation?.independentEvidenceCount ?? 0,
    collectedRoots.length === 0 ? (input.validation?.evidenceCount ?? 0) : 0,
  );

  const confidenceResult = computeConfidence({
    ...maturity,
    independentVerifiedCount,
    independentEvidenceCount,
  });
  const confidence = confidenceResult.confidence;

  const uniqueCollectedRoots = uniqueEvidenceRoots(collectedRoots);
  const validation: ScoreValidationSummary = {
    evidenceCount:
      uniqueCollectedRoots.length > 0
        ? uniqueCollectedRoots.length
        : (input.validation?.evidenceCount ?? independentEvidenceCount),
    verifiedEvidenceCount:
      uniqueCollectedRoots.length > 0
        ? uniqueCollectedRoots.filter((root) => root.verified).length
        : (input.validation?.verifiedEvidenceCount ?? independentVerifiedCount),
    ratingCount: input.validation?.ratingCount ?? 0,
    endorsementCount: input.validation?.endorsementCount ?? 0,
    institutionalConfirmationCount: input.validation?.institutionalConfirmationCount ?? 0,
    disputedItemCount: input.validation?.disputedItemCount ?? 0,
    independentEvidenceCount,
    independentVerifiedCount,
    evaluationCount: input.validation?.evaluationCount ?? maturity.evaluationCount,
  };

  const overallStatus = deriveOverallStatus({
    overallScore: provisionalEstimate,
    coverage,
    confidence,
    independentVerifiedCount,
  });
  const publicScore = overallStatus === 'established' ? provisionalEstimate : null;

  const stage = deriveStage({
    overallScore: provisionalEstimate,
    confidence,
    evidenceCount: validation.evidenceCount,
    verifiedEvidenceCount: independentVerifiedCount,
    scoredCategoryCount: included.length,
  });

  const missingData = excluded.map((id) => `${metaFor(id).fullLabel} not yet scored`);
  const provisionalReasons: string[] = [];
  if (coverage.limited) {
    provisionalReasons.push('Category coverage is limited; missing categories stay unknown.');
  }
  if (confidence === 'insufficient' || confidence === 'low') {
    provisionalReasons.push('Confidence is low until more independent verified evidence exists.');
  }
  if (independentVerifiedCount < 5) {
    provisionalReasons.push(
      `Independent verified evidence is ${independentVerifiedCount}; one activity cannot establish mature reputation.`,
    );
  }

  const notes: string[] = [
    'Unavailable category scores stay unknown. They are not treated as zero and do not imply full coverage.',
    'A provisional estimate averages observed categories only. It is not an established Civizen Score.',
    'Verification confirms evidence; it does not increase an evaluator’s rating.',
    'The Civizen Score reflects demonstrated participation history. It does not measure a person’s intrinsic value or human worth.',
    'Tiers recognize demonstrated participation within Civizen. They do not measure dignity, social worth, or citizenship status.',
  ];
  if (provisionalReasons.length > 0) {
    notes.push(...provisionalReasons);
  }

  const performance = categories.find((c) => c.id === 'performance');
  const contributions = categories.find((c) => c.id === 'contributions');
  const lastCalculatedAt =
    input.calculatedAt ?? (provisionalEstimate != null ? new Date().toISOString() : null);

  const hasVerifiedActivity = independentVerifiedCount > 0;
  const hasSustainedActivity =
    input.hasSustainedActivity ?? (maturity.hasRecurrence && maturity.timeSpanDays >= 90);
  const hasSubstantialImpact =
    input.hasSubstantialImpact ?? independentVerifiedCount >= 20;

  const history = (input.history ?? []).map((item) => ({
    ...item,
    calculationVersion: resolveScoreModelVersion(item.calculationVersion),
  }));

  const tier = calculateTierStatus(
    {
      overallScore: provisionalEstimate,
      performanceScore: performance?.score ?? null,
      contributionsScore: contributions?.score ?? null,
      confidence,
      hasVerifiedActivity,
      hasSustainedActivity,
      hasSubstantialImpact,
      hasUnresolvedSeriousIntegrityIssue: input.hasUnresolvedSeriousIntegrityIssue ?? false,
      independentVerifiedEvidenceCount: independentVerifiedCount,
      scoredCategoryCount: included.length,
      establishedCategoryCount,
      hasRecurrence: maturity.hasRecurrence,
      timeSpanDays: maturity.timeSpanDays,
      overallStatus,
    },
    lastCalculatedAt,
  );

  return {
    userId: input.userId ?? '',
    overall: {
      score: publicScore,
      provisionalEstimate,
      stage,
      confidence,
      lastCalculatedAt,
      calculationVersion: SCORE_CALCULATION_VERSION,
      status: overallStatus,
      modelVersion: SCORE_CALCULATION_VERSION,
    },
    tier,
    categories,
    validation,
    history,
    nextSteps: buildNextSteps(categories, validation, { skills: options?.skills }),
    explanation: {
      weights,
      includedCategories: included,
      excludedCategories: excluded,
      missingData,
      notes,
    },
    coverage,
    confidenceFactors: confidenceResult.factors,
    tierReadiness: tier.readiness,
    independentEvidenceCount,
    effectiveEvidenceVolume,
    explanations: {
      modelVersion: SCORE_CALCULATION_VERSION,
      coverageLimited: coverage.limited,
      provisionalReasons,
      keyFactors: [
        `Independent verified evidence: ${independentVerifiedCount}`,
        `Coverage: ${coverage.scoredCount}/${coverage.totalCount} categories`,
        `Confidence: ${confidence}`,
      ],
    },
  };
}

/** Diminishing-returns helper for quantity-heavy metrics. */
export function diminishingQuantityScore(
  count: number,
  softCap = 12,
  maxScore = 70,
): number {
  if (count <= 0) return 0;
  const ratio = 1 - Math.exp(-count / softCap);
  return clampScore(ratio * maxScore);
}

/**
 * Learning: highest degree level is primary; trainings are a secondary boost.
 * Extra education credentials add a small breadth bonus; verification raises the score.
 * Count-only fallback remains when no level strings are available.
 */
export function scoreLearningFromEducation(args: {
  educationCount: number;
  verifiedEducationCount: number;
  educationLevels?: Array<string | null | undefined>;
  trainingCount?: number;
}): { score: number; highestLevel: EducationLevel | null } {
  const levels = (args.educationLevels ?? []).filter(
    (level): level is string => typeof level === 'string' && level.trim().length > 0,
  );
  const count = Math.max(args.educationCount, levels.length);
  const verified = Math.max(0, args.verifiedEducationCount);
  const trainingCount = Math.max(0, args.trainingCount ?? 0);
  const highestLevel = highestEducationLevel(levels);

  let levelScore = 0;
  if (highestLevel) {
    // Degree / diploma attainment is the primary Learning factor.
    levelScore = EDUCATION_LEVEL_BASE_SCORE[highestLevel];
  } else if (count > 0) {
    // Legacy / missing level: quantity curve only (same as pre-v1.1).
    levelScore = diminishingQuantityScore(count, 6, 55);
  }

  const extra = Math.max(0, count - 1);
  const breadthBonus =
    extra > 0 ? Math.min(12, diminishingQuantityScore(extra, 3, 12)) : 0;
  // Trainings add continuing-learning signal; capped lower when a degree already carries the score.
  const trainingCap = highestLevel || count > 0 ? 18 : 45;
  const trainingBonus =
    trainingCount > 0
      ? Math.min(trainingCap, diminishingQuantityScore(trainingCount, 6, trainingCap))
      : 0;
  const verifiedBoost = Math.min(22, verified * 10);

  return {
    score: clampScore(levelScore + breadthBonus + trainingBonus + verifiedBoost),
    highestLevel,
  };
}

/**
 * Build a score model from currently available app data.
 * Education → Learning; skills → Skills; experience → Experience;
 * contribution events → Contributions; performance ratings → Performance.
 * Endorsements are validation only.
 */
export function buildScoreFromProfileActivity(args: {
  userId?: string;
  educationCount?: number;
  verifiedEducationCount?: number;
  /** Raw education levels (built-in keys or custom labels). Preferred over count-only. */
  educationLevels?: Array<string | null | undefined>;
  /** Full education rows; when set, derives count / verified / levels. */
  educationEntries?: EducationScoreEntry[];
  /** Declared trainings / continuing courses (secondary Learning factor). */
  trainingCount?: number;
  skillCount?: number;
  verifiedSkillCount?: number;
  declaredSkillNames?: string[];
  demonstratedSkills?: Array<{
    skillName: string;
    skillId?: string | null;
    participationId?: string;
    opportunityId?: string;
    evidenceRootId?: string;
    verified?: boolean;
    demonstratedAt?: string | null;
  }>;
  experienceCount?: number;
  verifiedExperienceCount?: number;
  /** Cumulative months of experience (union of intervals). Primary Experience factor. */
  experienceMonths?: number;
  demonstratedProjects?: DemonstratedProjectEvidence[];
  endorsementCount?: number;
  /** Precomputed Contributions category from estimated activity events. */
  contributions?: CategoryScoreInput | null;
  /** Precomputed Performance category from system + peer ratings on activities. */
  performance?: CategoryScoreInput | null;
  categoryOverrides?: Partial<Record<ScoreCategoryId, CategoryScoreInput>>;
  history?: ScoreHistoryItem[];
}): CivizenScoreResponse {
  const educationEntries = args.educationEntries;
  const educationLevelsFromEntries = educationEntries?.map((entry) => entry.level);
  const educationLevels = args.educationLevels ?? educationLevelsFromEntries;
  const educationCount = Math.max(
    args.educationCount ?? 0,
    educationEntries?.length ?? 0,
    educationLevels?.filter((level) => typeof level === 'string' && level.trim()).length ?? 0,
  );
  const verifiedEducationCount = Math.max(
    args.verifiedEducationCount ?? 0,
    educationEntries?.filter((entry) => isEducationVerified(entry.verificationStatus)).length ?? 0,
  );
  const trainingCount = Math.max(0, args.trainingCount ?? 0);
  const declaredSkillNames = args.declaredSkillNames ?? [];
  const skillCount = Math.max(args.skillCount ?? 0, declaredSkillNames.length);
  const canonicalSkills = mergeCanonicalSkills({
    declaredNames: declaredSkillNames,
    demonstrated: (args.demonstratedSkills ?? []).map((item) => ({
      skillName: item.skillName,
      skillId: item.skillId,
      evidenceRootId:
        item.evidenceRootId ||
        (item.participationId
          ? `opportunity_participations:${item.participationId}`
          : `skill:${item.skillName.toLowerCase()}`),
      verified: item.verified !== false,
      demonstratedAt: item.demonstratedAt,
    })),
  });
  const verifiedUniqueSkills = countVerifiedUniqueSkills(canonicalSkills);
  const recentlyDemonstratedSkills = countRecentlyDemonstratedSkills(canonicalSkills);
  const verifiedSkillCount = Math.max(args.verifiedSkillCount ?? 0, verifiedUniqueSkills);
  const experienceCount = args.experienceCount ?? 0;
  const verifiedExperienceCount = args.verifiedExperienceCount ?? 0;
  const experienceMonths = Math.max(0, args.experienceMonths ?? 0);
  const demonstratedProjects = args.demonstratedProjects ?? [];
  const projectSupportResult = projectSupportForExperience(demonstratedProjects);
  const projectRoots = uniqueProjectRoots(demonstratedProjects);
  const endorsementCount = args.endorsementCount ?? 0;

  const categories: Partial<Record<ScoreCategoryId, CategoryScoreInput>> = {
    ...args.categoryOverrides,
  };

  if (!categories.contributions && args.contributions?.score != null) {
    categories.contributions = args.contributions;
  }

  if (!categories.performance && args.performance?.score != null) {
    categories.performance = args.performance;
  }

  if (!categories.learning && (educationCount > 0 || trainingCount > 0)) {
    const { score } = scoreLearningFromEducation({
      educationCount,
      verifiedEducationCount,
      educationLevels,
      trainingCount,
    });
    const sourceCount = Math.max(educationCount, trainingCount > 0 ? educationCount + trainingCount : educationCount);
    categories.learning = {
      score,
      sourceCount: Math.max(1, sourceCount),
      verifiedSourceCount: verifiedEducationCount,
      confidence: 'low',
      metrics: [
        {
          id: 'education',
          label: 'Education',
          value: score,
          sourceCount: Math.max(educationCount, trainingCount > 0 ? 1 : 0),
          confidence: 'low',
        },
        ...emptyMetrics('learning').filter((m) => m.id !== 'education'),
      ],
    };
  }

  if (!categories.skills && (skillCount > 0 || canonicalSkills.length > 0)) {
    const declaredCount = Math.max(skillCount, canonicalSkills.filter((skill) => skill.declared).length);
    const declaredBase = declaredCount > 0 ? diminishingQuantityScore(declaredCount, 8, 55) : 0;
    const demonstratedObservations: CategoryObservation[] = canonicalSkills
      .filter((skill) => skill.demonstrated && skill.verifiedDemonstrations > 0)
      .flatMap((skill) =>
        skill.evidenceRoots.map((root) => ({
          evidenceRootId: root,
          value: 62,
          verified: true,
          occurredAt: skill.lastDemonstratedAt,
        })),
      );
    const demonstratedReputation = reputationFromObservations(demonstratedObservations);
    const uniqueCanonical = canonicalSkills.length || declaredCount;
    // Matching declared + demonstrated skills stay one canonical skill (no double count).
    const score =
      demonstratedReputation.score != null
        ? clampScore(declaredBase * 0.45 + demonstratedReputation.score * 0.55)
        : declaredCount > 0
          ? clampScore(declaredBase)
          : null;
    const skillsMetrics = emptyMetrics('skills').map((metric) => {
      if (metric.id === 'top') {
        return { ...metric, value: score, sourceCount: uniqueCanonical, confidence: 'low' as const };
      }
      if (metric.id === 'verified') {
        return {
          ...metric,
          value: verifiedUniqueSkills > 0 ? clampScore(verifiedUniqueSkills * 8) : null,
          sourceCount: verifiedUniqueSkills,
        };
      }
      if (metric.id === 'recent') {
        return {
          ...metric,
          value: recentlyDemonstratedSkills > 0 ? clampScore(recentlyDemonstratedSkills * 10) : null,
          sourceCount: recentlyDemonstratedSkills,
        };
      }
      return metric;
    });
    categories.skills = {
      score,
      sourceCount: uniqueCanonical,
      verifiedSourceCount: verifiedUniqueSkills,
      confidence: 'low',
      independentEvidenceCount: demonstratedReputation.independentEvidenceCount || uniqueCanonical,
      effectiveEvidenceVolume: demonstratedReputation.effectiveEvidenceVolume,
      evidenceRoots: demonstratedReputation.evidenceRoots,
      status: demonstratedReputation.status === 'unknown' && score != null ? 'provisional' : demonstratedReputation.status,
      metrics: skillsMetrics,
    };
  }

  if (!categories.experience && (experienceMonths > 0 || experienceCount > 0 || projectRoots.length > 0)) {
    const years = experienceMonths / 12;
    const durationScore = years > 0 || experienceCount > 0 ? diminishingQuantityScore(years, 15, 72) : 0;
    const breadthBonus =
      experienceCount > 1
        ? Math.min(12, diminishingQuantityScore(experienceCount - 1, 3, 12))
        : 0;
    const { support: projectSupport, uniqueCount: uniqueProjectCount } = projectSupportResult;
    const hasEnteredHistory = durationScore > 0 || experienceCount > 0;
    const score = hasEnteredHistory
      ? clampScore(durationScore + breadthBonus + projectSupport)
      : null;
    const experienceMetrics = emptyMetrics('experience').map((metric) => {
      if (metric.id === 'professional') {
        return {
          ...metric,
          value: durationScore > 0 ? clampScore(durationScore + breadthBonus) : null,
          sourceCount: Math.max(experienceCount, experienceMonths > 0 ? 1 : 0),
          confidence: 'low' as const,
        };
      }
      if (metric.id === 'projects') {
        return {
          ...metric,
          value: uniqueProjectCount > 0 ? clampScore(projectSupport) : null,
          sourceCount: uniqueProjectCount,
        };
      }
      return metric;
    });
    categories.experience = {
      score,
      sourceCount: Math.max(experienceCount, experienceMonths > 0 ? 1 : 0, projectRoots.length),
      verifiedSourceCount: Math.max(verifiedExperienceCount, projectRoots.length),
      confidence: 'low',
      independentEvidenceCount: Math.max(experienceCount, projectRoots.length),
      evidenceRoots: experienceCount > 0 ? undefined : projectRoots,
      status: score == null ? 'unknown' : 'provisional',
      metrics: experienceMetrics,
    };
  }

  const contributionRoots = args.contributions?.evidenceRootRefs ?? [];
  const performanceRoots = args.performance?.evidenceRootRefs ?? [];
  const skillRoots = canonicalSkills.flatMap((skill) =>
    skill.evidenceRoots.map((id) => ({
      id,
      sourceTable: id.split(':')[0] || 'opportunity_participations',
      sourceId: id.split(':').slice(1).join(':') || id,
      verified: skill.verifiedDemonstrations > 0,
      occurredAt: skill.lastDemonstratedAt,
    })),
  );
  const projectRootRefs: EvidenceRootRef[] = projectRoots.map((id) => ({
    id,
    sourceTable: id.split(':')[0] || 'contribution_opportunities',
    sourceId: id.split(':').slice(1).join(':') || id,
    verified: true,
  }));
  const educationRoots: EvidenceRootRef[] = Array.from({ length: educationCount }, (_, index) => ({
    id: `profile_education_entries:${index}`,
    sourceTable: 'profile_education_entries',
    sourceId: String(index),
    verified: index < verifiedEducationCount,
  }));
  const experienceRoots: EvidenceRootRef[] = Array.from({ length: experienceCount }, (_, index) => ({
    id: `profile_experience_entries:${index}`,
    sourceTable: 'profile_experience_entries',
    sourceId: String(index),
    verified: index < verifiedExperienceCount,
  }));

  const performanceRatingCount =
    args.performance?.metrics?.find((m) => m.id === 'ratings')?.sourceCount ?? 0;

  const allRoots = uniqueEvidenceRoots([
    ...contributionRoots,
    ...performanceRoots,
    ...skillRoots,
    ...educationRoots,
    ...experienceRoots,
    ...projectRootRefs,
  ]);

  return calculateCivizenScoreModel(
    {
      userId: args.userId,
      categories,
      evidenceRoots: allRoots,
      validation: {
        evidenceCount: allRoots.length,
        verifiedEvidenceCount: allRoots.filter((root) => root.verified).length,
        independentEvidenceCount: args.contributions?.independentEvidenceCount,
        independentVerifiedCount: args.contributions?.verifiedSourceCount,
        endorsementCount,
        ratingCount: performanceRatingCount,
        institutionalConfirmationCount: 0,
        disputedItemCount: 0,
      },
      history: args.history,
      calculatedAt:
        allRoots.length > 0 || Object.keys(categories).length > 0 ? new Date().toISOString() : null,
    },
    { skills: canonicalSkills },
  );
}

export function formatScoreValue(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return '—';
  return score.toFixed(1);
}

export function formatScoreOutOf100(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return 'Not yet scored';
  return `${score.toFixed(1)} / 100`;
}

export function getCategoryMeta(id: ScoreCategoryId): ScoreCategoryMeta {
  return metaFor(id);
}

function fixtureEvidenceRoots(count: number, verified = true): EvidenceRootRef[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, index) => ({
    id: `fixture:${index}`,
    sourceTable: 'fixture',
    sourceId: String(index),
    verified,
    occurredAt: new Date(now - index * 4 * 24 * 60 * 60 * 1000).toISOString(),
    evaluatorIds: [`evaluator-${index % 8}`],
    evaluationCount: 1,
  }));
}

/** Representative fixtures for automated tests and demos. */
export const SCORE_TEST_PROFILES = {
  A_newUser: (): ScoreCalculationInput => ({
    userId: 'profile-a',
    categories: {},
    validation: {
      evidenceCount: 0,
      verifiedEvidenceCount: 0,
      ratingCount: 0,
      endorsementCount: 0,
    },
  }),
  B_educationHeavy: (): ScoreCalculationInput => ({
    userId: 'profile-b',
    categories: {
      learning: {
        score: 82,
        confidence: 'high',
        sourceCount: 6,
        verifiedSourceCount: 4,
      },
      experience: {
        score: 55,
        confidence: 'moderate',
        sourceCount: 2,
        verifiedSourceCount: 1,
      },
      skills: {
        score: 48,
        confidence: 'low',
        sourceCount: 3,
        verifiedSourceCount: 0,
      },
    },
    validation: {
      evidenceCount: 11,
      verifiedEvidenceCount: 5,
      endorsementCount: 1,
      ratingCount: 0,
    },
  }),
  C_activeContributor: (): ScoreCalculationInput => ({
    userId: 'profile-c',
    categories: {
      learning: { score: 71, confidence: 'high', sourceCount: 8, verifiedSourceCount: 6 },
      experience: { score: 76, confidence: 'high', sourceCount: 10, verifiedSourceCount: 7 },
      skills: { score: 81, confidence: 'high', sourceCount: 12, verifiedSourceCount: 9 },
      performance: {
        score: 84,
        confidence: 'high',
        sourceCount: 15,
        verifiedSourceCount: 12,
        metrics: [
          { id: 'engagement', label: 'Engagement', value: 88, sourceCount: 15 },
          { id: 'activity', label: 'Activity', value: 80, sourceCount: 15 },
          { id: 'reliability', label: 'Reliability', value: 86, sourceCount: 12 },
          { id: 'accomplishment', label: 'Accomplishment', value: 82, sourceCount: 12 },
          { id: 'ratings', label: 'Ratings', value: 85, sourceCount: 10 },
        ],
      },
      contributions: {
        score: 88,
        confidence: 'very_high',
        sourceCount: 14,
        verifiedSourceCount: 11,
      },
    },
    validation: {
      evidenceCount: 59,
      verifiedEvidenceCount: 45,
      ratingCount: 18,
      endorsementCount: 12,
      institutionalConfirmationCount: 4,
    },
    evidenceRoots: fixtureEvidenceRoots(45),
    hasSustainedActivity: true,
    hasSubstantialImpact: true,
    history: [
      {
        id: 'h1',
        eventDate: '2026-08-01T12:00:00.000Z',
        categoryId: 'performance',
        previousValue: 76,
        newValue: 78,
        overallPrevious: 72.8,
        overallNew: 73.4,
        reason: 'Assignment completed on time',
        calculationVersion: SCORE_CALCULATION_VERSION,
      },
      {
        id: 'h2',
        eventDate: '2026-08-02T09:00:00.000Z',
        categoryId: 'learning',
        previousValue: 68,
        newValue: 71,
        overallPrevious: 73.4,
        overallNew: 73.9,
        reason: 'Professional certificate verified',
        calculationVersion: SCORE_CALCULATION_VERSION,
      },
    ],
  }),
  D_unverifiedExperience: (): ScoreCalculationInput => ({
    userId: 'profile-d',
    categories: {
      experience: {
        score: 78,
        confidence: 'low',
        sourceCount: 8,
        verifiedSourceCount: 0,
      },
      skills: {
        score: 62,
        confidence: 'low',
        sourceCount: 5,
        verifiedSourceCount: 0,
      },
    },
    validation: {
      evidenceCount: 13,
      verifiedEvidenceCount: 0,
      endorsementCount: 0,
      ratingCount: 0,
    },
  }),
  E_reliabilityProblem: (): ScoreCalculationInput => ({
    userId: 'profile-e',
    categories: {
      performance: {
        score: 42,
        confidence: 'moderate',
        sourceCount: 20,
        verifiedSourceCount: 16,
        metrics: [
          { id: 'engagement', label: 'Engagement', value: 90, sourceCount: 20 },
          { id: 'activity', label: 'Activity', value: 75, sourceCount: 18 },
          { id: 'reliability', label: 'Reliability', value: 28, sourceCount: 16 },
          { id: 'accomplishment', label: 'Accomplishment', value: 35, sourceCount: 16 },
          { id: 'ratings', label: 'Ratings', value: 48, sourceCount: 10 },
        ],
      },
      experience: { score: 60, confidence: 'moderate', sourceCount: 4, verifiedSourceCount: 2 },
      skills: { score: 55, confidence: 'moderate', sourceCount: 3, verifiedSourceCount: 2 },
    },
    validation: {
      evidenceCount: 27,
      verifiedEvidenceCount: 20,
      ratingCount: 10,
      endorsementCount: 2,
    },
    evidenceRoots: fixtureEvidenceRoots(20),
  }),
  F_highQuantityLowImpact: (): ScoreCalculationInput => {
    const quantityOnly = diminishingQuantityScore(40, 12, 70);
    return {
      userId: 'profile-f',
      categories: {
        contributions: {
          score: clampScore(quantityOnly * 0.55),
          confidence: 'low',
          sourceCount: 40,
          verifiedSourceCount: 2,
          metrics: [
            { id: 'recent', label: 'Recent Contributions', value: quantityOnly, sourceCount: 40 },
            { id: 'verified', label: 'Verified Contributions', value: 18, sourceCount: 2 },
            { id: 'impact', label: 'Impact', value: 22, sourceCount: 40 },
            { id: 'collaboration', label: 'Collaboration', value: 30, sourceCount: 8 },
            { id: 'beneficiaries', label: 'Beneficiaries', value: 20, sourceCount: 40 },
            { id: 'ratings', label: 'Ratings', value: null, sourceCount: 0 },
          ],
        },
      },
      validation: {
        evidenceCount: 40,
        verifiedEvidenceCount: 2,
        ratingCount: 0,
        endorsementCount: 1,
      },
    };
  },
} as const;
