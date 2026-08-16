import type { HappinessDomainId } from '@/lib/happiness/types';
import type { SystemicIssueCandidate, WellbeingAggregateResult } from './types';
import { SYSTEMIC_PATTERN_MODEL_VERSION, WELLBEING_AGGREGATE_PRIVACY_VERSION } from './types';

export const SYSTEMIC_PATTERN_V1 = {
  version: SYSTEMIC_PATTERN_MODEL_VERSION,
  minQualifyingPeriods: 3,
  autoPublishChallenge: false,
  autoPublishGovernance: false,
} as const;

export function deriveSystemicIssueCandidate(input: {
  scopeId: string;
  domain: HappinessDomainId;
  factorCategory?: string | null;
  qualifyingInsights: WellbeingAggregateResult[];
}): SystemicIssueCandidate {
  const periods = input.qualifyingInsights.filter((row) => row.kind === 'insight').length;
  let status: SystemicIssueCandidate['status'] = 'observing';
  if (periods >= SYSTEMIC_PATTERN_V1.minQualifyingPeriods) status = 'established_pattern';
  else if (periods >= 2) status = 'emerging';
  return {
    scopeId: input.scopeId,
    domain: input.domain,
    factorCategory: input.factorCategory ?? null,
    status,
    evidencePeriods: periods,
    summary:
      periods >= SYSTEMIC_PATTERN_V1.minQualifyingPeriods
        ? `${input.domain} appears as a recurring pattern across several qualifying periods. This is a candidate for review, not a published Challenge or Governance item.`
        : `${input.domain} is being observed. Recurring qualifying evidence is still needed.`,
    privacyPolicyVersion: WELLBEING_AGGREGATE_PRIVACY_VERSION,
    patternModelVersion: SYSTEMIC_PATTERN_V1.version,
    publishesChallenge: false,
    publishesGovernance: false,
  };
}

export function mayAutoPublish(candidate: SystemicIssueCandidate): boolean {
  return candidate.publishesChallenge || candidate.publishesGovernance;
}
