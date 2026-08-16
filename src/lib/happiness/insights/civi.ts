import { toCiviAggregateContext, type CiviAggregateContext } from '@/lib/happiness/aggregate/civi-context';
import type { WellbeingAggregateResult } from '@/lib/happiness/aggregate/types';
import { INSIGHTS_COPY } from './copy';
import type { PresentedOverview } from './types';

export type CiviInsightContext = CiviAggregateContext & {
  surface: 'wellbeing_insights';
  goingWell: string[];
  needsAttention: string[];
  patternStatuses: string[];
};

const PRIVATE = /member-|privateNote|profile_id|check-in note|work joy/i;

export function toCiviInsightContext(input: {
  overview: PresentedOverview;
  focus?: WellbeingAggregateResult | null;
}): CiviInsightContext {
  const focus = input.focus ?? input.overview.suppressed;
  const base = focus
    ? toCiviAggregateContext(focus)
    : {
        kind: 'wellbeing_aggregate' as const,
        summary: INSIGHTS_COPY.emptyBody,
        scopeId: input.overview.scope?.id ?? null,
        timePeriod: null,
        sufficiency: 'unavailable',
        caveats: [INSIGHTS_COPY.privacyHint, INSIGHTS_COPY.noCausation],
        privacyPolicyVersion: 'wellbeing-aggregate-privacy-v1',
        aggregationModelVersion: 'wellbeing-aggregate-v1',
      };
  if (input.overview.unauthorized || input.overview.suppressed) {
    return {
      ...base,
      scopeId: null,
      timePeriod: null,
      sufficiency: 'unavailable',
      summary: input.overview.suppressed?.summary ?? INSIGHTS_COPY.unauthorizedTitle,
      surface: 'wellbeing_insights',
      goingWell: [],
      needsAttention: [],
      patternStatuses: [],
      caveats: [...base.caveats, 'Suppressed or unauthorized insights cannot be reconstructed from private records.'],
    };
  }
  const context: CiviInsightContext = {
    ...base,
    surface: 'wellbeing_insights',
    goingWell: input.overview.goingWell.map((row) => row.summary),
    needsAttention: input.overview.needsAttention.map((row) => row.summary),
    patternStatuses: [...input.overview.emerging, ...input.overview.established, ...input.overview.monitoring].map(
      (row) => `${row.domain}:${row.status}`,
    ),
  };
  if (PRIVATE.test(JSON.stringify(context))) {
    throw new Error('Civi insight context must not include private member material');
  }
  return context;
}

export function civiMayReconstructSuppressed(): false {
  return false;
}
