import { cohortThresholdFor, dimensionMeta, WELLBEING_AGGREGATE_PRIVACY_V1 } from './policy';
import type { AggregateDimensionId, AggregateQuery, SuppressionReason } from './types';
import { AGGREGATE_GEOGRAPHY_GRAINS, AGGREGATE_TIME_BUCKETS } from './types';

export function queryDimensions(query: AggregateQuery): AggregateDimensionId[] {
  const ids: AggregateDimensionId[] = ['time_bucket'];
  if (query.domain) ids.push('domain');
  if (query.factorCategory) ids.push('factor_category');
  if (query.interventionType) ids.push('intervention_type');
  if (query.workContextType) ids.push('work_context_type');
  if (query.geography) ids.push('geography');
  return ids;
}

export function fingerprintQuery(query: AggregateQuery): string {
  return [
    query.scopeId,
    query.topic,
    query.timeBucket,
    query.periodStart,
    query.domain ?? '',
    query.factorCategory ?? '',
    query.interventionType ?? '',
    query.workContextType ?? '',
    query.geography ?? '',
  ].join('|');
}

export function assertDimensionAllowed(
  id: AggregateDimensionId,
  policy = WELLBEING_AGGREGATE_PRIVACY_V1,
): SuppressionReason | null {
  const meta = dimensionMeta(id, policy);
  if (!meta || meta.classification === 'prohibited' || meta.classification === 'research_only') {
    return id === 'geography' || id === 'street' || id === 'building' || id === 'gps' || id === 'neighborhood'
      ? 'geography_not_permitted'
      : id === 'day' || id === 'week'
        ? 'time_period_too_narrow'
        : 'dimension_not_permitted';
  }
  if (meta.classification === 'elevated' || meta.classification === 'approval_required') return 'dimension_not_permitted';
  return null;
}

export function validateAggregateQuery(
  query: AggregateQuery,
  policy = WELLBEING_AGGREGATE_PRIVACY_V1,
): SuppressionReason | null {
  if (!AGGREGATE_TIME_BUCKETS.includes(query.timeBucket)) return 'time_period_too_narrow';
  if (query.geography && !AGGREGATE_GEOGRAPHY_GRAINS.includes(query.geography)) return 'geography_not_permitted';
  const ids = queryDimensions(query);
  for (const id of ids) {
    const blocked = assertDimensionAllowed(id, policy);
    if (blocked) return blocked;
  }
  const nonTime = ids.filter((id) => id !== 'time_bucket');
  if (nonTime.length > policy.maxNonTimeDimensions) return 'combination_too_specific';
  return null;
}

export const UNSAFE_AGGREGATE_FLAGS = [
  'raw',
  'unsuppressed',
  'bypassPrivacy',
  'includeMemberIds',
  'debugCohort',
  'exactCounts',
] as const;

export function rejectUnsafeAggregateFlags(request: Record<string, unknown>): SuppressionReason | null {
  for (const flag of UNSAFE_AGGREGATE_FLAGS) {
    if (request[flag] === true || request[flag] === 'true') return 'bypass_not_permitted';
  }
  return null;
}

export function requiredCohort(query: AggregateQuery, policy = WELLBEING_AGGREGATE_PRIVACY_V1): number {
  return cohortThresholdFor(queryDimensions(query), policy);
}

export function isSubsetFingerprint(current: string, previous: string): boolean {
  const [scopeA, topicA, bucketA, periodA, ...restA] = current.split('|');
  const [scopeB, topicB, bucketB, periodB, ...restB] = previous.split('|');
  if (scopeA !== scopeB || topicA !== topicB || bucketA !== bucketB || periodA !== periodB) return false;
  const extraA = restA.filter(Boolean);
  const extraB = restB.filter(Boolean);
  if (extraA.length >= extraB.length) return false;
  return extraA.every((value) => extraB.includes(value));
}
