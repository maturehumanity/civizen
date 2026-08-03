/**
 * Civizen Score — five category model.
 * Categories summarize demonstrated activity; they are not a measure of human worth.
 * Domains/pillars remain separate (where activity occurred vs how it is scored).
 */

import {
  calculateTierStatus,
  type CivizenTierStatus,
} from '@/lib/civizen-score-tiers';

export const SCORE_CALCULATION_VERSION = 'civizen-score-v1';

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
}

export interface CivizenScoreResponse {
  userId: string;
  overall: {
    score: number | null;
    stage: ScoreStage;
    confidence: ScoreConfidence;
    lastCalculatedAt: string | null;
    calculationVersion: string;
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

function deriveConfidence(args: {
  score: number | null;
  sourceCount: number;
  verifiedSourceCount: number;
  explicit?: ScoreConfidence;
}): ScoreConfidence {
  if (args.explicit) return args.explicit;
  if (args.score == null && args.sourceCount === 0) return 'insufficient';
  if (args.verifiedSourceCount <= 0) return 'low';
  if (args.verifiedSourceCount < 3) return 'moderate';
  if (args.verifiedSourceCount < 10) return 'high';
  return 'very_high';
}

function rankConfidence(value: ScoreConfidence): number {
  switch (value) {
    case 'insufficient':
      return 0;
    case 'low':
      return 1;
    case 'moderate':
      return 2;
    case 'high':
      return 3;
    case 'very_high':
      return 4;
  }
}

function minConfidence(values: ScoreConfidence[]): ScoreConfidence {
  if (values.length === 0) return 'insufficient';
  return values.reduce((lowest, current) =>
    rankConfidence(current) < rankConfidence(lowest) ? current : lowest,
  );
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
): ScoreNextStep[] {
  const steps: ScoreNextStep[] = [];
  const byId = Object.fromEntries(categories.map((c) => [c.id, c])) as Record<
    ScoreCategoryId,
    CategoryScoreResult
  >;

  if (byId.skills.score == null || byId.skills.verifiedSourceCount < 2) {
    steps.push({
      id: 'add-skill-evidence',
      label: 'Add evidence for two skills.',
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
 * Weighted overall from scored categories only.
 * Missing categories are excluded and weights are renormalized — never treated as zero.
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
): CivizenScoreResponse {
  const weights = mergeWeights(input.weights);
  const validation: ScoreValidationSummary = {
    evidenceCount: input.validation?.evidenceCount ?? 0,
    verifiedEvidenceCount: input.validation?.verifiedEvidenceCount ?? 0,
    ratingCount: input.validation?.ratingCount ?? 0,
    endorsementCount: input.validation?.endorsementCount ?? 0,
    institutionalConfirmationCount: input.validation?.institutionalConfirmationCount ?? 0,
    disputedItemCount: input.validation?.disputedItemCount ?? 0,
  };

  const categories: CategoryScoreResult[] = SCORE_CATEGORY_ORDER.map((id) => {
    const meta = metaFor(id);
    const raw = input.categories?.[id];
    const score =
      raw?.score == null || Number.isNaN(raw.score) ? null : clampScore(raw.score);
    const sourceCount = raw?.sourceCount ?? 0;
    const verifiedSourceCount = raw?.verifiedSourceCount ?? 0;
    const confidence = deriveConfidence({
      score,
      sourceCount,
      verifiedSourceCount,
      explicit: raw?.confidence,
    });
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
    };
  });

  const scoreMap = Object.fromEntries(
    categories.map((c) => [c.id, c.score]),
  ) as Record<ScoreCategoryId, number | null>;

  const { overall, included, excluded } = computeWeightedOverall(scoreMap, weights);
  const scoredConfidences = categories
    .filter((c) => c.score != null)
    .map((c) => c.confidence);
  let confidence =
    overall == null
      ? validation.evidenceCount > 0
        ? 'low'
        : 'insufficient'
      : minConfidence(scoredConfidences);

  if (overall != null && validation.verifiedEvidenceCount === 0) {
    confidence = minConfidence([confidence, 'low']);
  } else if (overall != null && validation.verifiedEvidenceCount >= 20 && confidence === 'high') {
    confidence = 'very_high';
  }

  const stage = deriveStage({
    overallScore: overall,
    confidence,
    evidenceCount: validation.evidenceCount,
    verifiedEvidenceCount: validation.verifiedEvidenceCount,
    scoredCategoryCount: included.length,
  });

  const missingData = excluded.map((id) => `${metaFor(id).fullLabel} not yet scored`);
  const notes: string[] = [
    'Unavailable category scores are excluded and weights are renormalized; missing data is never treated as zero.',
    'Ratings, endorsements, evidence, and verification support categories; they are not a sixth circle segment.',
    'The Civizen Score reflects demonstrated activity and reliability. It does not measure a person’s intrinsic value or human worth.',
    'Tiers recognize demonstrated participation within Civizen. They do not measure dignity, social worth, or citizenship status.',
  ];

  const performance = categories.find((c) => c.id === 'performance');
  const contributions = categories.find((c) => c.id === 'contributions');
  const lastCalculatedAt =
    input.calculatedAt ?? (overall != null ? new Date().toISOString() : null);

  const hasVerifiedActivity = validation.verifiedEvidenceCount > 0;
  const hasSustainedActivity =
    input.hasSustainedActivity ?? validation.verifiedEvidenceCount >= 8;
  const hasSubstantialImpact =
    input.hasSubstantialImpact ?? validation.verifiedEvidenceCount >= 20;

  const tier = calculateTierStatus(
    {
      overallScore: overall,
      performanceScore: performance?.score ?? null,
      contributionsScore: contributions?.score ?? null,
      confidence,
      hasVerifiedActivity,
      hasSustainedActivity,
      hasSubstantialImpact,
      hasUnresolvedSeriousIntegrityIssue: input.hasUnresolvedSeriousIntegrityIssue ?? false,
    },
    lastCalculatedAt,
  );

  return {
    userId: input.userId ?? '',
    overall: {
      score: overall,
      stage,
      confidence,
      lastCalculatedAt,
      calculationVersion: SCORE_CALCULATION_VERSION,
    },
    tier,
    categories,
    validation,
    history: input.history ?? [],
    nextSteps: buildNextSteps(categories, validation),
    explanation: {
      weights,
      includedCategories: included,
      excludedCategories: excluded,
      missingData,
      notes,
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
 * Build a score model from currently available app data.
 * Education → Learning; skills → Skills; experience → Experience;
 * contribution events → Contributions; performance ratings → Performance.
 * Endorsements are validation only.
 */
export function buildScoreFromProfileActivity(args: {
  userId?: string;
  educationCount?: number;
  verifiedEducationCount?: number;
  skillCount?: number;
  verifiedSkillCount?: number;
  experienceCount?: number;
  verifiedExperienceCount?: number;
  endorsementCount?: number;
  /** Precomputed Contributions category from estimated activity events. */
  contributions?: CategoryScoreInput | null;
  /** Precomputed Performance category from system + peer ratings on activities. */
  performance?: CategoryScoreInput | null;
  categoryOverrides?: Partial<Record<ScoreCategoryId, CategoryScoreInput>>;
  history?: ScoreHistoryItem[];
}): CivizenScoreResponse {
  const educationCount = args.educationCount ?? 0;
  const verifiedEducationCount = args.verifiedEducationCount ?? 0;
  const skillCount = args.skillCount ?? 0;
  const verifiedSkillCount = args.verifiedSkillCount ?? 0;
  const experienceCount = args.experienceCount ?? 0;
  const verifiedExperienceCount = args.verifiedExperienceCount ?? 0;
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

  if (!categories.learning && educationCount > 0) {
    const base = diminishingQuantityScore(educationCount, 6, 55);
    const verifiedBoost = Math.min(30, verifiedEducationCount * 10);
    categories.learning = {
      score: clampScore(base + verifiedBoost),
      sourceCount: educationCount,
      verifiedSourceCount: verifiedEducationCount,
      confidence: verifiedEducationCount > 0 ? 'moderate' : 'low',
      metrics: [
        {
          id: 'education',
          label: 'Education',
          value: clampScore(base + verifiedBoost),
          sourceCount: educationCount,
          confidence: verifiedEducationCount > 0 ? 'moderate' : 'low',
        },
        ...emptyMetrics('learning').filter((m) => m.id !== 'education'),
      ],
    };
  }

  if (!categories.skills && skillCount > 0) {
    // Same preliminary curve as Learning so a few declared skills surface a rating
    // immediately; verification later raises confidence and score.
    const base = diminishingQuantityScore(skillCount, 8, 55);
    const verifiedBoost = Math.min(30, verifiedSkillCount * 8);
    const score = clampScore(base + verifiedBoost);
    categories.skills = {
      score,
      sourceCount: skillCount,
      verifiedSourceCount: verifiedSkillCount,
      confidence: verifiedSkillCount > 0 ? 'moderate' : 'low',
      metrics: [
        {
          id: 'top',
          label: 'Top Skills',
          value: score,
          sourceCount: skillCount,
          confidence: verifiedSkillCount > 0 ? 'moderate' : 'low',
        },
        ...emptyMetrics('skills').filter((m) => m.id !== 'top'),
      ],
    };
  }

  if (!categories.experience && experienceCount > 0) {
    const base = diminishingQuantityScore(experienceCount, 6, 55);
    const verifiedBoost = Math.min(30, verifiedExperienceCount * 10);
    const score = clampScore(base + verifiedBoost);
    categories.experience = {
      score,
      sourceCount: experienceCount,
      verifiedSourceCount: verifiedExperienceCount,
      confidence: verifiedExperienceCount > 0 ? 'moderate' : 'low',
      metrics: [
        {
          id: 'professional',
          label: 'Professional',
          value: score,
          sourceCount: experienceCount,
          confidence: verifiedExperienceCount > 0 ? 'moderate' : 'low',
        },
        ...emptyMetrics('experience').filter((m) => m.id !== 'professional'),
      ],
    };
  }

  const contributionSourceCount = args.contributions?.sourceCount ?? 0;
  const contributionVerifiedCount = args.contributions?.verifiedSourceCount ?? 0;
  const performanceSourceCount = args.performance?.sourceCount ?? 0;
  const performanceVerifiedCount = args.performance?.verifiedSourceCount ?? 0;
  const performanceRatingCount =
    args.performance?.metrics?.find((m) => m.id === 'ratings')?.sourceCount ?? 0;
  const evidenceCount =
    educationCount +
    skillCount +
    experienceCount +
    endorsementCount +
    contributionSourceCount +
    performanceSourceCount;
  const verifiedEvidenceCount =
    verifiedEducationCount +
    verifiedSkillCount +
    verifiedExperienceCount +
    contributionVerifiedCount +
    performanceVerifiedCount;

  return calculateCivizenScoreModel({
    userId: args.userId,
    categories,
    validation: {
      evidenceCount,
      verifiedEvidenceCount,
      endorsementCount,
      ratingCount: performanceRatingCount,
      institutionalConfirmationCount: 0,
      disputedItemCount: 0,
    },
    history: args.history,
    calculatedAt:
      evidenceCount > 0 || Object.keys(categories).length > 0 ? new Date().toISOString() : null,
  });
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
