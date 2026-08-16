/**
 * Privileged snapshot generation. Callers must be the trusted job / service_role path,
 * never an aggregate viewer and never the browser.
 */
import type { HappinessDomainId, HappinessLevel } from '@/lib/happiness/types';

import { applyWellbeingAggregatePrivacy, snapshotHasPrivateLeak } from './engine';
import { fingerprintQuery, rejectUnsafeAggregateFlags } from './query-guard';
import type {
  AggregateAuditRecord,
  AggregateQuery,
  EligibleObservation,
  QualifyingScope,
  WellbeingAggregateResult,
} from './types';
import { WELLBEING_AGGREGATE_MODEL_VERSION, WELLBEING_AGGREGATE_PRIVACY_VERSION } from './types';

export const PRIVILEGED_GENERATION_ROLE = 'service_role';
export const GENERATOR_REQUESTER_ID = 'wellbeing-aggregate-generator';
export { UNSAFE_AGGREGATE_FLAGS, rejectUnsafeAggregateFlags } from './query-guard';

export type PersistableSnapshot = {
  scopeId: string;
  fingerprint: string;
  periodStart: string;
  timeBucket: AggregateQuery['timeBucket'];
  topic: AggregateQuery['topic'];
  result: WellbeingAggregateResult;
  privacyPolicyVersion: string;
  aggregationModelVersion: string;
  createdAt: string;
};

export const AGGREGATE_VIEWER_FORBIDDEN_TABLES = [
  'happiness_checkins',
  'happiness_assessment_responses',
  'happiness_weekly_pulses',
  'happiness_monthly_reviews',
  'fulfillment_plans',
  'fulfillment_plan_factors',
  'work_joy_entries',
  'wellbeing_aggregate_participation',
  'wellbeing_aggregate_scope_membership',
] as const;

const AUDIT_FORBIDDEN = ['memberKey', 'privateNote', 'profile_id', 'checkIns', 'workJoy', 'desiredOutcome'];

/** Maps privileged collector JSON (opaque member_key, no notes) into engine observations. */
export function mapCollectedSignals(signals: Array<Record<string, unknown>>): EligibleObservation[] {
  return signals.map((row) => ({
    memberKey: String(row.member_key ?? row.memberKey ?? ''),
    participating: Boolean(row.participating),
    inScope: Boolean(row.in_scope ?? row.inScope),
    inPeriod: Boolean(row.in_period ?? row.inPeriod),
    domain: String(row.domain) as HappinessDomainId,
    level: String(row.level) as HappinessLevel,
    factorCategory: row.factor_category ? String(row.factor_category) : undefined,
    interventionType: row.intervention_type ? String(row.intervention_type) : undefined,
  }));
}

export function stripPrivateObservationFields(rows: EligibleObservation[]): EligibleObservation[] {
  return rows.map((row) => ({
    ...row,
    privateNote: undefined,
  }));
}

export function persistSnapshotWithoutRewrite(
  store: Map<string, PersistableSnapshot>,
  next: PersistableSnapshot,
): { stored: PersistableSnapshot; wroteNew: boolean } {
  const key = `${next.scopeId}|${next.fingerprint}|${next.privacyPolicyVersion}|${next.aggregationModelVersion}`;
  const existing = store.get(key);
  if (existing) return { stored: existing, wroteNew: false };
  store.set(key, next);
  return { stored: next, wroteNew: true };
}

export function auditContainsPrivatePayload(audit: AggregateAuditRecord): boolean {
  const blob = JSON.stringify(audit);
  return AUDIT_FORBIDDEN.some((token) => blob.includes(token) && token !== 'profile_id') || /\bmember-\d+\b/.test(blob);
}

export function generateWellbeingAggregateSnapshot(input: {
  query: AggregateQuery;
  scope: QualifyingScope;
  observations: EligibleObservation[];
  request?: Record<string, unknown>;
  store?: Map<string, PersistableSnapshot>;
  now?: string;
}): {
  result: WellbeingAggregateResult;
  audit: AggregateAuditRecord;
  stored: PersistableSnapshot;
  wroteNew: boolean;
  leaked: boolean;
} {
  const fingerprint = fingerprintQuery(input.query);
  const finish = (result: WellbeingAggregateResult) => ({
    result,
    audit: {
      requesterProfileId: GENERATOR_REQUESTER_ID,
      scopeId: input.query.scopeId,
      fingerprint,
      timeBucket: input.query.timeBucket,
      topic: input.query.topic,
      privacyPolicyVersion: WELLBEING_AGGREGATE_PRIVACY_VERSION,
      aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
      suppression: result.kind === 'suppressed' ? result.reason : null,
    } satisfies AggregateAuditRecord,
  });

  const bypass = rejectUnsafeAggregateFlags(input.request ?? {});
  if (bypass) {
    const blocked = finish({
      kind: 'suppressed',
      reason: bypass,
      privacyPolicyVersion: WELLBEING_AGGREGATE_PRIVACY_VERSION,
      aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
      summary: 'That combination of wellbeing insight is not available.',
    });
    return finalize(input, blocked, fingerprint);
  }

  if (input.scope.id !== input.query.scopeId || !input.scope.enabled) {
    return finalize(
      input,
      finish({
        kind: 'suppressed',
        reason: 'scope_not_enabled',
        privacyPolicyVersion: WELLBEING_AGGREGATE_PRIVACY_VERSION,
        aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
        summary: 'This group has not enabled privacy-protected wellbeing insights.',
      }),
      fingerprint,
    );
  }

  const derived = applyWellbeingAggregatePrivacy(
    input.query,
    { profileId: GENERATOR_REQUESTER_ID, canViewScope: true },
    { scope: input.scope, observations: stripPrivateObservationFields(input.observations) },
    finish,
  );
  return finalize(input, derived, fingerprint);
}

function finalize(
  input: {
    query: AggregateQuery;
    observations: EligibleObservation[];
    store?: Map<string, PersistableSnapshot>;
    now?: string;
  },
  derived: { result: WellbeingAggregateResult; audit: AggregateAuditRecord },
  fingerprint: string,
) {
  const persistable: PersistableSnapshot = {
    scopeId: input.query.scopeId,
    fingerprint,
    periodStart: input.query.periodStart,
    timeBucket: input.query.timeBucket,
    topic: input.query.topic,
    result: derived.result,
    privacyPolicyVersion: WELLBEING_AGGREGATE_PRIVACY_VERSION,
    aggregationModelVersion: WELLBEING_AGGREGATE_MODEL_VERSION,
    createdAt: input.now ?? '2026-08-15T00:00:00.000Z',
  };
  const store = input.store ?? new Map<string, PersistableSnapshot>();
  const persisted = persistSnapshotWithoutRewrite(store, persistable);
  return {
    result: derived.result,
    audit: derived.audit,
    stored: persisted.stored,
    wroteNew: persisted.wroteNew,
    leaked:
      snapshotHasPrivateLeak(derived.result, input.observations) ||
      snapshotHasPrivateLeak(persisted.stored.result, input.observations) ||
      auditContainsPrivatePayload(derived.audit),
  };
}
