import {
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_PRIMARY_WINDOW_SECONDS,
  DEFAULT_RETRY_SPACING_HOURS,
} from './security-class';

export type VoteWindow = {
  opensAt: Date;
  closesAt: Date;
  durationSeconds: number;
};

export type ScheduleRetryInput = {
  failedAt: Date;
  attemptNumber: number;
  maxAttempts: number;
  retrySpacingHours: number;
  votingClosesAt: Date;
  /** Optional: constrain retries to a preferred hour-of-day window in local time. */
  preferredHourStart?: number;
  preferredHourEnd?: number;
};

export type ScheduleRetryResult =
  | { ok: true; scheduledFor: Date; attemptNumber: number }
  | { ok: false; reason: 'attempts_exhausted' | 'past_election_close' };

export function openVoteWindow(
  notifiedAt: Date,
  durationSeconds = DEFAULT_PRIMARY_WINDOW_SECONDS,
): VoteWindow {
  const opensAt = new Date(notifiedAt.getTime());
  const closesAt = new Date(notifiedAt.getTime() + durationSeconds * 1000);
  return { opensAt, closesAt, durationSeconds };
}

export function isWithinVoteWindow(now: Date, window: VoteWindow): boolean {
  return now.getTime() >= window.opensAt.getTime() && now.getTime() <= window.closesAt.getTime();
}

export function remainingWindowSeconds(now: Date, window: VoteWindow): number {
  if (now.getTime() > window.closesAt.getTime()) return 0;
  if (now.getTime() < window.opensAt.getTime()) {
    return Math.ceil((window.closesAt.getTime() - window.opensAt.getTime()) / 1000);
  }
  return Math.max(0, Math.ceil((window.closesAt.getTime() - now.getTime()) / 1000));
}

/**
 * After a missed/failed attempt, schedule the next chance ~every other day,
 * still before election close. Optionally nudge into a preferred local hour band.
 */
export function scheduleRetryAttempt(input: ScheduleRetryInput): ScheduleRetryResult {
  const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const spacingHours = input.retrySpacingHours ?? DEFAULT_RETRY_SPACING_HOURS;
  const nextAttempt = input.attemptNumber + 1;

  if (nextAttempt > maxAttempts) {
    return { ok: false, reason: 'attempts_exhausted' };
  }

  let scheduledFor = new Date(input.failedAt.getTime() + spacingHours * 60 * 60 * 1000);

  if (
    typeof input.preferredHourStart === 'number' &&
    typeof input.preferredHourEnd === 'number' &&
    input.preferredHourEnd > input.preferredHourStart
  ) {
    const hour = scheduledFor.getHours() + scheduledFor.getMinutes() / 60;
    if (hour < input.preferredHourStart || hour >= input.preferredHourEnd) {
      scheduledFor.setHours(input.preferredHourStart, Math.floor(Math.random() * 60), 0, 0);
      if (scheduledFor.getTime() <= input.failedAt.getTime()) {
        scheduledFor = new Date(scheduledFor.getTime() + 24 * 60 * 60 * 1000);
      }
    }
  }

  if (scheduledFor.getTime() >= input.votingClosesAt.getTime()) {
    return { ok: false, reason: 'past_election_close' };
  }

  return { ok: true, scheduledFor, attemptNumber: nextAttempt };
}

export type HomePresenceSlot = {
  /** Hour of day [0, 24) in local time. */
  hourStart: number;
  hourEnd: number;
  /** Empirical presence probability 0..1. */
  probability: number;
};

/**
 * Pick a random instant inside the election window weighted by presence slots.
 * Falls back to uniform random within [opens, closes) if no slots qualify.
 */
export function pickRandomHomePresenceTime(input: {
  votingOpensAt: Date;
  votingClosesAt: Date;
  presenceSlots: HomePresenceSlot[];
  minProbability?: number;
  random?: () => number;
}): Date {
  const random = input.random ?? Math.random;
  const minP = input.minProbability ?? 0.35;
  const openMs = input.votingOpensAt.getTime();
  const closeMs = input.votingClosesAt.getTime();
  if (closeMs <= openMs) return new Date(openMs);

  const qualifying = input.presenceSlots.filter((s) => s.probability >= minP && s.hourEnd > s.hourStart);
  if (qualifying.length === 0) {
    return new Date(openMs + random() * (closeMs - openMs));
  }

  const weightSum = qualifying.reduce((sum, s) => sum + s.probability, 0);
  let pick = random() * weightSum;
  let chosen = qualifying[0];
  for (const slot of qualifying) {
    pick -= slot.probability;
    if (pick <= 0) {
      chosen = slot;
      break;
    }
  }

  // Sample a day within the election window, then place within the chosen hour band.
  const spanDays = Math.max(1, Math.ceil((closeMs - openMs) / (24 * 60 * 60 * 1000)));
  const dayOffset = Math.floor(random() * spanDays);
  const candidate = new Date(openMs + dayOffset * 24 * 60 * 60 * 1000);
  const minuteInBand = Math.floor(random() * (chosen.hourEnd - chosen.hourStart) * 60);
  candidate.setHours(chosen.hourStart, 0, 0, 0);
  candidate.setMinutes(candidate.getMinutes() + minuteInBand);

  if (candidate.getTime() < openMs) return new Date(openMs + random() * (closeMs - openMs));
  if (candidate.getTime() >= closeMs) return new Date(closeMs - 60_000);
  return candidate;
}

export function haversineDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isInsideHomeGeofence(input: {
  current: { latitude: number; longitude: number };
  home: { latitude: number; longitude: number };
  radiusMeters: number;
}): boolean {
  return haversineDistanceMeters(input.current, input.home) <= input.radiusMeters;
}
