/** Deterministic realized-impact model. Expected and realized stay distinct. */

export const CONTRIBUTION_IMPACT_VERSION = 'contribution-impact-v1';

export type ImpactBreadth =
  | 'local'
  | 'team'
  | 'organization'
  | 'community'
  | 'region'
  | 'national'
  | 'multinational'
  | 'global'
  | 'platform';

export type ImpactDepth = 'trivial' | 'modest' | 'meaningful' | 'substantial' | 'transformative';

export type ImpactEvidenceConfidence = 'high' | 'moderate' | 'low' | 'unknown';

export type ImpactFeedbackSample = {
  role: 'beneficiary' | 'peer' | 'expert' | 'public' | 'affected_user' | 'institutional';
  value: number;
  affected: boolean;
  evidenceSupplied: boolean;
  likesOnly?: boolean;
  raterId?: string;
};

export type ContributionImpactEvidence = {
  expectedImpact?: number | null;
  breadth?: ImpactBreadth | null;
  depth?: ImpactDepth | null;
  geographicScope?: ImpactBreadth | null;
  claimedScope?: ImpactBreadth | null;
  realizedReach?: ImpactBreadth | null;
  affectedPopulation?: number | null;
  affectedOrganizations?: number | null;
  affectedJurisdictions?: number | null;
  adoption?: number | null;
  outcomeMetric?: number | null;
  baselineValue?: number | null;
  resultingValue?: number | null;
  durabilityDays?: number | null;
  reversal?: boolean;
  adverseOutcome?: boolean;
  externalValidation?: boolean;
  feedback?: ImpactFeedbackSample[];
};

export type ContributionImpactAssessment = {
  impactVersion: string;
  expectedImpact: number | null;
  realizedImpact: number | null;
  longTermImpact: number | null;
  breadth: ImpactBreadth | 'unknown';
  claimedScope: ImpactBreadth | 'unknown';
  realizedReach: ImpactBreadth | 'unknown';
  depth: ImpactDepth | 'unknown';
  durabilityDays: number | null;
  confidence: ImpactEvidenceConfidence;
  adverseOutcome: boolean;
  popularityOnly: boolean;
  reason: string;
};

const BREADTH_FACTOR: Record<ImpactBreadth, number> = {
  local: 0.34,
  team: 0.4,
  organization: 0.48,
  community: 0.56,
  region: 0.64,
  national: 0.76,
  multinational: 0.86,
  global: 0.92,
  platform: 0.88,
};

const DEPTH_FACTOR: Record<ImpactDepth, number> = {
  trivial: 0.18,
  modest: 0.38,
  meaningful: 0.6,
  substantial: 0.8,
  transformative: 0.94,
};

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)) * 10) / 10;
}

export function parseImpactEvidence(meta: Record<string, unknown>): ContributionImpactEvidence {
  const nested = meta.impactEvidence;
  const source = nested && typeof nested === 'object' && !Array.isArray(nested)
    ? (nested as Record<string, unknown>)
    : meta;
  const feedback = Array.isArray(source.feedback)
    ? source.feedback.filter((item): item is ImpactFeedbackSample =>
        Boolean(item && typeof item === 'object' && typeof (item as ImpactFeedbackSample).value === 'number'),
      )
    : [];
  return {
    expectedImpact: asNumber(source.expectedImpact) ?? asNumber(meta.expectedImpact),
    breadth: typeof source.breadth === 'string' ? (source.breadth as ImpactBreadth) : null,
    depth: typeof source.depth === 'string' ? (source.depth as ImpactDepth) : null,
    geographicScope: typeof source.geographicScope === 'string' ? (source.geographicScope as ImpactBreadth) : null,
    claimedScope: typeof source.claimedScope === 'string' ? (source.claimedScope as ImpactBreadth) : null,
    realizedReach: typeof source.realizedReach === 'string' ? (source.realizedReach as ImpactBreadth) : null,
    affectedPopulation: asNumber(source.affectedPopulation),
    affectedOrganizations: asNumber(source.affectedOrganizations),
    affectedJurisdictions: asNumber(source.affectedJurisdictions),
    adoption: asNumber(source.adoption),
    outcomeMetric: asNumber(source.outcomeMetric) ?? asNumber(meta.realizedImpact),
    baselineValue: asNumber(source.baselineValue),
    resultingValue: asNumber(source.resultingValue),
    durabilityDays: asNumber(source.durabilityDays),
    reversal: source.reversal === true,
    adverseOutcome: source.adverseOutcome === true,
    externalValidation: source.externalValidation === true,
    feedback,
  };
}

function asBreadth(value: string | null | undefined): ImpactBreadth | null {
  return value && value in BREADTH_FACTOR ? (value as ImpactBreadth) : null;
}

function breadthFromPopulation(population: number | null): ImpactBreadth | null {
  if (population == null) return null;
  if (population >= 1_000_000) return 'national';
  if (population >= 50_000) return 'region';
  if (population >= 1_000) return 'community';
  if (population >= 50) return 'organization';
  if (population >= 5) return 'team';
  return 'local';
}

function breadthFromJurisdictions(count: number | null): ImpactBreadth | null {
  if (count == null || count <= 0) return null;
  if (count >= 40) return 'global';
  if (count >= 8) return 'multinational';
  if (count >= 2) return 'national';
  return 'local';
}

export function hasRealizedReachEvidence(evidence: ContributionImpactEvidence): boolean {
  return (evidence.adoption ?? 0) > 0
    || (evidence.affectedPopulation ?? 0) > 0
    || (evidence.affectedOrganizations ?? 0) > 0
    || (evidence.affectedJurisdictions ?? 0) > 0
    || asBreadth(evidence.realizedReach ?? null) != null;
}

function depthFromOutcome(evidence: ContributionImpactEvidence): ImpactDepth | null {
  if (evidence.depth && evidence.depth in DEPTH_FACTOR) return evidence.depth;
  const baseline = evidence.baselineValue;
  const result = evidence.resultingValue;
  if (baseline != null && result != null && baseline !== 0) {
    const delta = Math.abs(result - baseline) / Math.abs(baseline);
    if (delta >= 0.4) return 'substantial';
    if (delta >= 0.15) return 'meaningful';
    if (delta >= 0.05) return 'modest';
    return 'trivial';
  }
  if (evidence.outcomeMetric != null) {
    if (evidence.outcomeMetric >= 80) return 'substantial';
    if (evidence.outcomeMetric >= 60) return 'meaningful';
    if (evidence.outcomeMetric >= 40) return 'modest';
    return 'trivial';
  }
  return null;
}

function feedbackSignal(samples: ImpactFeedbackSample[]): { value: number | null; popularityOnly: boolean } {
  const usable = samples.filter((item) => item.affected && !item.likesOnly);
  if (usable.length === 0) {
    return { value: null, popularityOnly: samples.some((item) => item.likesOnly || !item.affected) };
  }
  const mean = usable.reduce((sum, item) => sum + item.value, 0) / usable.length;
  return { value: mean, popularityOnly: false };
}

export function assessContributionImpact(evidence: ContributionImpactEvidence): ContributionImpactAssessment {
  const claimedScope = asBreadth(evidence.claimedScope)
    ?? asBreadth(evidence.geographicScope)
    ?? (hasRealizedReachEvidence(evidence) ? null : asBreadth(evidence.breadth))
    ?? 'unknown';
  const realizedReach = asBreadth(evidence.realizedReach)
    ?? (hasRealizedReachEvidence(evidence)
      ? asBreadth(evidence.breadth)
        ?? asBreadth(evidence.geographicScope)
        ?? breadthFromPopulation(evidence.affectedPopulation ?? null)
        ?? breadthFromJurisdictions(evidence.affectedJurisdictions ?? null)
      : null)
    ?? 'unknown';
  const breadth = realizedReach !== 'unknown' ? realizedReach : 'unknown';
  const depth = depthFromOutcome(evidence) ?? 'unknown';
  const feedback = feedbackSignal(evidence.feedback ?? []);
  const hasOutcome =
    depth !== 'unknown' ||
    evidence.outcomeMetric != null ||
    evidence.reversal === true ||
    evidence.adverseOutcome === true ||
    feedback.value != null;
  const expected = evidence.expectedImpact ?? null;

  if (!hasOutcome) {
    return {
      impactVersion: CONTRIBUTION_IMPACT_VERSION,
      expectedImpact: expected,
      realizedImpact: null,
      longTermImpact: null,
      breadth,
      claimedScope,
      realizedReach,
      depth,
      durabilityDays: evidence.durabilityDays ?? null,
      confidence: 'unknown',
      adverseOutcome: false,
      popularityOnly: feedback.popularityOnly,
      reason: feedback.popularityOnly ? 'popularity_without_outcome' : 'realized_impact_unknown',
    };
  }

  const breadthFactor = breadth === 'unknown' ? 0.5 : BREADTH_FACTOR[breadth];
  const depthFactor = depth === 'unknown' ? 0.5 : DEPTH_FACTOR[depth];
  const geometric = Math.sqrt(breadthFactor * depthFactor);
  const outcomeQuality = evidence.outcomeMetric != null
    ? evidence.outcomeMetric / 100
    : feedback.value != null
      ? feedback.value / 100
      : 0.7;
  const durability = evidence.durabilityDays != null
    ? Math.min(1.12, 0.82 + Math.log1p(evidence.durabilityDays / 30) * 0.08)
    : 0.88;
  const confidence: ImpactEvidenceConfidence = evidence.externalValidation
    ? 'high'
    : (evidence.feedback?.filter((item) => item.affected).length ?? 0) >= 8
      || (evidence.affectedPopulation ?? 0) >= 1000
      || (evidence.affectedJurisdictions ?? 0) >= 8
      ? 'moderate'
      : 'low';
  const confidenceFactor = confidence === 'high' ? 1 : confidence === 'moderate' ? 0.92 : 0.82;
  let realized = 100 * geometric * Math.min(1, Math.max(0.15, outcomeQuality)) * durability * confidenceFactor;
  if (evidence.reversal) realized *= 0.45;
  if (evidence.adverseOutcome) realized = Math.min(realized, 28);
  realized = clamp(realized, 0, 96);
  const longTerm = evidence.durabilityDays != null && evidence.durabilityDays >= 180
    ? clamp(realized * Math.min(1.08, 0.94 + evidence.durabilityDays / 2000), 0, 96)
    : null;

  return {
    impactVersion: CONTRIBUTION_IMPACT_VERSION,
    expectedImpact: expected,
    realizedImpact: realized,
    longTermImpact: longTerm,
    breadth,
    claimedScope,
    realizedReach,
    depth,
    durabilityDays: evidence.durabilityDays ?? null,
    confidence,
    adverseOutcome: evidence.adverseOutcome === true || evidence.reversal === true,
    popularityOnly: false,
    reason: evidence.adverseOutcome ? 'adverse_outcome' : evidence.reversal ? 'reversal' : 'outcome_evidence',
  };
}
