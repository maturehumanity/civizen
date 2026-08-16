import type { WellbeingAggregateResult } from './types';

export type CiviAggregateContext = {
  kind: 'wellbeing_aggregate';
  summary: string;
  scopeId: string | null;
  timePeriod: string | null;
  sufficiency: string;
  caveats: string[];
  privacyPolicyVersion: string;
  aggregationModelVersion: string;
};

export function toCiviAggregateContext(result: WellbeingAggregateResult): CiviAggregateContext {
  if (result.kind === 'suppressed') {
    return {
      kind: 'wellbeing_aggregate',
      summary: result.summary,
      scopeId: null,
      timePeriod: null,
      sufficiency: 'unavailable',
      caveats: ['Individual Happiness records are not included.', 'Suppressed results do not reveal how close a group is to the threshold.'],
      privacyPolicyVersion: result.privacyPolicyVersion,
      aggregationModelVersion: result.aggregationModelVersion,
    };
  }
  return {
    kind: 'wellbeing_aggregate',
    summary: result.summary,
    scopeId: result.scopeId,
    timePeriod: `${result.timeBucket}:${result.periodStart}`,
    sufficiency: result.sufficiency,
    caveats: [
      'This is a privacy-protected group insight, not a scientific finding.',
      'Reported factors are not automatic causation.',
      'Individual names, notes, and check-ins are not included.',
    ],
    privacyPolicyVersion: result.privacyPolicyVersion,
    aggregationModelVersion: result.aggregationModelVersion,
  };
}
