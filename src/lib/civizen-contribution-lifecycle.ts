/** Contribution evaluation lifecycle: evolving assessments of one canonical root. */

import { blendActivityEvaluation } from '@/lib/civizen-score-model';
import type { ContributionEvent } from '@/lib/civizen-contributions';
import {
  assessContributionImpact,
  parseImpactEvidence,
  type ContributionImpactAssessment,
} from '@/lib/civizen-contribution-impact';
import {
  evaluateDevelopmentSignificance,
  type DevelopmentContributionFunction,
} from '@/lib/civizen-development-significance';

export const CONTRIBUTION_EVALUATION_VERSION = 'contribution-evaluation-v2';

export type ContributionMaturityStage =
  | 'initial_evaluation'
  | 'verified_evaluation'
  | 'realized_impact'
  | 'durability_outcome';

export type ContributionVerificationKind =
  | 'independently_validated'
  | 'outcome_validated'
  | 'system_verified'
  | 'unverified';

export type ContributionEvidenceEvent = {
  kind:
    | 'initial_evaluation'
    | 'verification'
    | 'independent_validation'
    | 'realized_outcome'
    | 'durability'
    | 'reversal'
    | 'adverse_outcome'
    | 'dispute'
    | 'evaluator_reweight';
  at: string;
  modelVersion: string;
  evidenceVersion: string;
  cause: string;
  rawValue?: number | null;
};

export type ContributionLifecycleView = {
  evaluationVersion: string;
  impactVersion: string;
  stage: ContributionMaturityStage;
  rawQuality: number | null;
  quality: number | null;
  expectedImpact: number | 'unknown';
  realizedImpact: number | 'unknown';
  longTermImpact: number | 'unknown';
  impactBreadth: ContributionImpactAssessment['breadth'];
  impactDepth: ContributionImpactAssessment['depth'];
  durabilityDays: number | 'unknown';
  collaboration: number | null;
  observation: number | null;
  impact: number | null;
  contributionFunction: DevelopmentContributionFunction | 'communication' | 'opportunity' | 'unknown';
  artifactFunction: DevelopmentContributionFunction | 'communication' | 'opportunity' | 'unknown';
  structuralSignificance: 'high' | 'moderate' | 'localized' | 'unknown';
  scope: 'platform' | 'subsystem' | 'local' | 'unknown';
  qualityEvidence: string;
  evidenceConfidence: 'high' | 'moderate' | 'low' | 'unknown';
  verificationKind: ContributionVerificationKind;
  reconstructionResult: string | null;
  roles: string[];
  implementationAssisted: boolean;
  domain: string | null;
  subsystems: string[];
  adverseOutcome: boolean;
  claimedScope: ContributionImpactAssessment['claimedScope'];
  realizedReach: ContributionImpactAssessment['realizedReach'];
  evidenceEvents: ContributionEvidenceEvent[];
  supports: { contributions: true; performance: boolean; skills: string[]; experience: boolean };
  impliesAdditivePoints: false;
};

const SKILL_BY_FUNCTION: Record<string, string> = {
  system_architecture: 'System architecture',
  product_architecture: 'Product design',
  governance_design: 'Governance design',
  model_evolution: 'Model design',
  implementation: 'Implementation',
  documentation: 'Documentation',
};

function metaString(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function verificationKind(event: ContributionEvent): ContributionVerificationKind {
  const eligibility = metaString(event.rawMeta, 'eligibility');
  if (event.rawMeta.independentValidation === true || eligibility === 'independently_validated') {
    return 'independently_validated';
  }
  if (event.rawMeta.outcomeValidated === true || eligibility === 'outcome_validated') return 'outcome_validated';
  if (event.verified || eligibility === 'system_verified') return 'system_verified';
  return 'unverified';
}

function developmentQuality(structural: string, testsPassed: boolean, scope: string): number {
  const base = structural === 'high' ? 76 : structural === 'moderate' ? 64 : structural === 'localized' ? 56 : 50;
  return Math.min(90, base + (testsPassed ? 8 : 0) + (scope === 'platform' ? 4 : scope === 'subsystem' ? 2 : 0));
}

function maturityStage(
  kind: ContributionVerificationKind,
  impact: ContributionImpactAssessment,
): ContributionMaturityStage {
  if ((impact.durabilityDays ?? 0) >= 180 && impact.realizedImpact != null) return 'durability_outcome';
  if (impact.realizedImpact != null || impact.adverseOutcome) return 'realized_impact';
  if (kind !== 'unverified') return 'verified_evaluation';
  return 'initial_evaluation';
}

function evidenceConfidence(
  kind: ContributionVerificationKind,
  testsPassed: boolean,
  structural: string,
  impact: ContributionImpactAssessment,
): ContributionLifecycleView['evidenceConfidence'] {
  if (impact.confidence === 'high' || (testsPassed && structural === 'high' && kind === 'independently_validated')) {
    return 'high';
  }
  if (kind !== 'unverified' || impact.confidence === 'moderate') return 'moderate';
  return 'low';
}

export function evaluateContributionLifecycle(event: ContributionEvent): ContributionLifecycleView {
  const kind = verificationKind(event);
  const impact = assessContributionImpact(parseImpactEvidence(event.rawMeta));
  const paths = Array.isArray(event.rawMeta.affectedPaths)
    ? event.rawMeta.affectedPaths.filter((item): item is string => typeof item === 'string')
    : [];
  const testsPassed =
    event.rawMeta.testsPassed === true ||
    (Array.isArray(event.rawMeta.realFeatures) &&
      event.rawMeta.realFeatures.some((item) => typeof item === 'string' && /\.(test|spec)\./.test(item)));

  let quality: number | null = null;
  let contributionFunction: ContributionLifecycleView['contributionFunction'] = 'unknown';
  let artifactFunction: ContributionLifecycleView['artifactFunction'] = 'unknown';
  let structuralSignificance: ContributionLifecycleView['structuralSignificance'] = 'unknown';
  let scope: ContributionLifecycleView['scope'] = 'unknown';
  let subsystems: string[] = [];
  let qualityEvidence = 'unknown';
  let collaboration: number | null = asNumber(event.rawMeta.collaborationScore);

  if (event.eventType === 'development_story') {
    const significance = evaluateDevelopmentSignificance({
      affectedPaths: paths,
      testsPassed,
      contributionFunction: metaString(event.rawMeta, 'contributionFunction'),
      title: event.title,
      roles: event.rawMeta.contributionRoles ?? event.rawMeta.roles,
      implementationAssisted: event.rawMeta.implementationAssisted === true,
    });
    quality = developmentQuality(significance.structuralSignificance, testsPassed, significance.scope);
    contributionFunction = significance.contributionFunction;
    artifactFunction = significance.artifactFunction;
    structuralSignificance = significance.structuralSignificance;
    scope = significance.scope;
    subsystems = significance.subsystems;
    qualityEvidence = testsPassed ? 'tests_passed' : 'initial_evidence';
    if (kind === 'independently_validated') collaboration = collaboration ?? 58;
  } else {
    quality = asNumber(event.rawMeta.qualityScore) ??
      (event.eventType === 'opportunity_participation' || event.eventType === 'post' || event.eventType === 'post_comment'
        ? event.capacityEstimate
        : event.capacityEstimate);
    if (event.eventType === 'opportunity_participation') {
      contributionFunction = 'opportunity';
      artifactFunction = 'opportunity';
      collaboration = collaboration ?? event.collaborationEstimate;
      qualityEvidence = event.verified ? 'verified_activity' : 'initial_evidence';
    } else if (event.eventType === 'post' || event.eventType === 'post_comment') {
      contributionFunction = 'communication';
      artifactFunction = 'communication';
      qualityEvidence = 'communication_activity';
    }
  }

  const activityImpact = event.eventType === 'opportunity_participation'
    ? (asNumber(event.rawMeta.impactScore) ?? event.impactEstimate)
    : asNumber(event.rawMeta.expectedImpact);
  const realized = impact.realizedImpact;
  const observation = blendActivityEvaluation({
    quality,
    impact: realized ?? (event.eventType === 'opportunity_participation' ? activityImpact : null),
    collaboration,
  });
  const skill = SKILL_BY_FUNCTION[contributionFunction];
  const stage = maturityStage(kind, impact);
  const at = event.occurredAt;
  const events: ContributionEvidenceEvent[] = [
    {
      kind: 'initial_evaluation',
      at,
      modelVersion: CONTRIBUTION_EVALUATION_VERSION,
      evidenceVersion: 'raw-v1',
      cause: 'contribution_occurred',
      rawValue: quality,
    },
  ];
  if (kind !== 'unverified') {
    events.push({
      kind: kind === 'independently_validated' ? 'independent_validation' : 'verification',
      at,
      modelVersion: CONTRIBUTION_EVALUATION_VERSION,
      evidenceVersion: 'eligibility-v1',
      cause: kind,
      rawValue: quality,
    });
  }
  if (realized != null) {
    events.push({
      kind: impact.adverseOutcome ? 'adverse_outcome' : 'realized_outcome',
      at,
      modelVersion: impact.impactVersion,
      evidenceVersion: 'impact-v1',
      cause: impact.reason,
      rawValue: realized,
    });
  }
  const liveEvents = Array.isArray(event.rawMeta.liveEvidenceEvents)
    ? event.rawMeta.liveEvidenceEvents.filter((item): item is ContributionEvidenceEvent =>
        Boolean(item && typeof item === 'object' && typeof (item as ContributionEvidenceEvent).kind === 'string'),
      )
    : [];
  for (const item of liveEvents) {
    if (!events.some((existing) => existing.kind === item.kind && existing.at === item.at && existing.cause === item.cause)) {
      events.push(item);
    }
  }

  return {
    evaluationVersion: CONTRIBUTION_EVALUATION_VERSION,
    impactVersion: impact.impactVersion,
    stage,
    rawQuality: quality,
    quality,
    expectedImpact: impact.expectedImpact ?? activityImpact ?? 'unknown',
    realizedImpact: realized ?? 'unknown',
    longTermImpact: impact.longTermImpact ?? 'unknown',
    impactBreadth: impact.breadth,
    impactDepth: impact.depth,
    durabilityDays: impact.durabilityDays ?? 'unknown',
    collaboration,
    observation,
    impact: realized ?? (event.eventType === 'opportunity_participation' ? activityImpact : null),
    contributionFunction,
    artifactFunction,
    structuralSignificance,
    scope,
    qualityEvidence,
    evidenceConfidence: evidenceConfidence(kind, testsPassed, structuralSignificance, impact),
    verificationKind: kind,
    reconstructionResult: metaString(event.rawMeta, 'reconstructionResult') ??
      (event.rawMeta.reconstruction === true ? 'reconstructed' : null),
    roles: Array.isArray(event.rawMeta.contributionRoles)
      ? event.rawMeta.contributionRoles.filter((item): item is string => typeof item === 'string')
      : [],
    implementationAssisted: event.rawMeta.implementationAssisted === true,
    domain: metaString(event.rawMeta, 'domain'),
    subsystems,
    adverseOutcome: impact.adverseOutcome,
    claimedScope: impact.claimedScope,
    realizedReach: impact.realizedReach,
    evidenceEvents: events,
    supports: {
      contributions: true,
      performance: kind !== 'unverified',
      skills: skill ? [skill] : [],
      experience: kind !== 'unverified',
    },
    impliesAdditivePoints: false,
  };
}

export function withVerificationUnchanged(
  initial: ContributionLifecycleView,
  verified: ContributionLifecycleView,
): boolean {
  return initial.rawQuality === verified.rawQuality;
}
