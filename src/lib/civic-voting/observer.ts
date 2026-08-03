/**
 * Observer mode — accredited watchers see process metrics without PII.
 */

export type ObserverSessionStat = {
  status: string;
  attemptNumber: number;
};

export type ObserverGateStat = {
  checkKind: string;
  result: string;
};

export type ObserverMetrics = {
  eligibleRosterCount: number;
  sessionsScheduled: number;
  sessionsNotified: number;
  sessionsCast: number;
  sessionsMissed: number;
  sessionsFailed: number;
  sessionsExhausted: number;
  turnoutRate: number;
  gateFailRates: Record<string, number>;
  averageAttemptsAmongCast: number;
};

export function computeObserverMetrics(input: {
  eligibleRosterCount: number;
  sessions: ObserverSessionStat[];
  gateChecks: ObserverGateStat[];
}): ObserverMetrics {
  const sessions = input.sessions;
  const countStatus = (status: string) => sessions.filter((s) => s.status === status).length;

  const sessionsCast = countStatus('cast');
  const sessionsScheduled = sessions.length;
  const sessionsNotified = sessions.filter((s) =>
    ['notified', 'in_progress', 'cast', 'missed', 'failed', 'exhausted', 'voided'].includes(s.status),
  ).length;
  const sessionsMissed = countStatus('missed');
  const sessionsFailed = countStatus('failed');
  const sessionsExhausted = countStatus('exhausted');

  const roster = Math.max(0, input.eligibleRosterCount);
  const turnoutRate = roster === 0 ? 0 : sessionsCast / roster;

  const gateTotals = new Map<string, { total: number; failed: number }>();
  for (const check of input.gateChecks) {
    const entry = gateTotals.get(check.checkKind) ?? { total: 0, failed: 0 };
    entry.total += 1;
    if (check.result === 'failed') entry.failed += 1;
    gateTotals.set(check.checkKind, entry);
  }

  const gateFailRates: Record<string, number> = {};
  for (const [kind, stats] of gateTotals) {
    gateFailRates[kind] = stats.total === 0 ? 0 : stats.failed / stats.total;
  }

  const castAttempts = sessions.filter((s) => s.status === 'cast').map((s) => s.attemptNumber);
  const averageAttemptsAmongCast =
    castAttempts.length === 0
      ? 0
      : castAttempts.reduce((sum, n) => sum + n, 0) / castAttempts.length;

  return {
    eligibleRosterCount: roster,
    sessionsScheduled,
    sessionsNotified,
    sessionsCast,
    sessionsMissed,
    sessionsFailed,
    sessionsExhausted,
    turnoutRate,
    gateFailRates,
    averageAttemptsAmongCast,
  };
}

/** Strip any accidental PII fields before observer display. */
export function sanitizeObserverPayload<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const blocked = new Set([
    'profile_id',
    'profileId',
    'full_name',
    'fullName',
    'email',
    'phone',
    'address_line',
    'addressLine',
    'latitude',
    'longitude',
    'push_token',
    'pushToken',
    'ballot_commitment',
    'encrypted_payload',
    'selection_ciphertext',
  ]);

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (blocked.has(key)) continue;
    out[key] = value;
  }
  return out as Partial<T>;
}

export function formatTurnoutPercent(turnoutRate: number): string {
  return `${(Math.max(0, Math.min(1, turnoutRate)) * 100).toFixed(1)}%`;
}
