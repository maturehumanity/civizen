import type { HappinessDomainId } from '@/lib/happiness/types';
import type {
  AggregateInsightResult,
  AggregateSuppressedResult,
  QualifyingScope,
  SystemicIssueCandidate,
  WellbeingAggregateResult,
} from '@/lib/happiness/aggregate/types';
import { classifyProblemKind, factorLabel } from './classify';
import { INSIGHTS_COPY } from './copy';
import type { InsightPolarity, InsightTrend, PresentedDomainInsight, PresentedOverview } from './types';

const CAVEATS = [INSIGHTS_COPY.noCausation, INSIGHTS_COPY.noParticipants];

function asInsight(result: WellbeingAggregateResult): AggregateInsightResult | null {
  return result.kind === 'insight' ? result : null;
}

export function polarityFromInsight(result: AggregateInsightResult): InsightPolarity {
  const cells = result.groupedDistribution ?? {};
  if (cells.struggling === 'shown' || cells.unsettled === 'shown') return 'needs_attention';
  if (cells.flourishing === 'shown' || cells.thriving === 'shown') return 'going_well';
  return 'mixed';
}

export function trendFromInsights(rows: AggregateInsightResult[]): InsightTrend {
  if (rows.length < 2) return 'unknown';
  const ordered = [...rows].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const earlier = polarityFromInsight(ordered[0]);
  const later = polarityFromInsight(ordered[ordered.length - 1]);
  if (earlier === later) return 'stable';
  if (later === 'going_well' && earlier === 'needs_attention') return 'improving';
  if (later === 'needs_attention' && earlier === 'going_well') return 'declining';
  return 'stable';
}

export function presentDomainInsight(
  domain: HappinessDomainId,
  results: WellbeingAggregateResult[],
  scopeKind?: QualifyingScope['kind'],
): PresentedDomainInsight | null {
  const insights = results
    .map(asInsight)
    .filter((row): row is AggregateInsightResult => Boolean(row && row.domain === domain && row.topic === 'domain_state'));
  const latest = insights.sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0];
  if (!latest) return null;
  const factorRows = results
    .map(asInsight)
    .filter((row): row is AggregateInsightResult => Boolean(row && row.domain === domain && row.topic === 'factor_category'));
  const factors = factorRows.flatMap((row) => {
    const match = row.summary.match(/^(.+?) is frequently selected/i);
    return match ? [match[1].trim()] : [];
  });
  const factorTags = [...new Set(insights.flatMap((row) => (row.summary.toLowerCase().includes('transport') ? ['transportation'] : [])))];
  const helpful = results
    .map(asInsight)
    .find((row) => row && row.domain === domain && row.topic === 'intervention_helpfulness');
  return {
    domain,
    polarity: polarityFromInsight(latest),
    trend: trendFromInsights(insights),
    summary: latest.summary,
    sufficiency: latest.sufficiency,
    factors: [...new Set([...factors, ...factorTags])].map(factorLabel),
    helpfulness: helpful ? helpful.summary : null,
    problemKind: classifyProblemKind({ domain, factors: [...factors, ...factorTags], scopeKind }),
    caveats: helpful ? [...CAVEATS, INSIGHTS_COPY.helpfulnessCaveat] : CAVEATS,
    periodStart: latest.periodStart,
    timeBucket: latest.timeBucket,
  };
}

export function presentOverview(input: {
  scope: QualifyingScope | null;
  results: WellbeingAggregateResult[];
  candidates: SystemicIssueCandidate[];
  suppressed?: AggregateSuppressedResult | null;
  unauthorized?: boolean;
}): PresentedOverview {
  if (input.unauthorized) {
    return emptyOverview({ unauthorized: true, suppressed: input.suppressed ?? null });
  }
  if (!input.scope) return emptyOverview({ unauthorized: false, suppressed: input.suppressed ?? null });
  if (!input.scope.enabled) {
    return { ...emptyOverview({ unauthorized: false, suppressed: null }), scope: input.scope, scopeDisabled: true };
  }
  const suppressed =
    input.suppressed ??
    input.results.find((row): row is AggregateSuppressedResult => row.kind === 'suppressed') ??
    null;
  const domains = [...new Set(input.results.flatMap((row) => (row.kind === 'insight' && row.domain ? [row.domain] : [])))];
  const presented = domains
    .map((domain) => presentDomainInsight(domain, input.results, input.scope?.kind))
    .filter((row): row is PresentedDomainInsight => Boolean(row));
  return {
    scope: input.scope,
    goingWell: presented.filter((row) => row.polarity === 'going_well').slice(0, 4),
    needsAttention: presented.filter((row) => row.polarity === 'needs_attention').slice(0, 4),
    emerging: input.candidates.filter((row) => row.status === 'emerging'),
    established: input.candidates.filter((row) => row.status === 'established_pattern' || row.status === 'needs_review'),
    monitoring: input.candidates.filter((row) => row.status === 'observing'),
    movement: presented.filter((row) => row.trend !== 'unknown').slice(0, 4),
    suppressed,
    scopeDisabled: false,
    unauthorized: false,
  };
}

function emptyOverview(flags: { unauthorized: boolean; suppressed: AggregateSuppressedResult | null }): PresentedOverview {
  return {
    scope: null,
    goingWell: [],
    needsAttention: [],
    emerging: [],
    established: [],
    monitoring: [],
    movement: [],
    suppressed: flags.suppressed,
    scopeDisabled: false,
    unauthorized: flags.unauthorized,
  };
}

export function overviewHasQualifyingInsight(overview: PresentedOverview): boolean {
  return Boolean(overview.goingWell.length || overview.needsAttention.length || overview.established.length || overview.emerging.length);
}
