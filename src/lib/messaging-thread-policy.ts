/** Shared person-to-person vs Civi thread rules. Keep in sync with the SQL migration. */

export const MESSAGE_EDIT_WINDOW_MS = 60 * 1000;
export const MESSAGE_UNSEND_WINDOW_MS = 60 * 1000;

/** Allowed disappearing durations in minutes (Off, 1h, 1d, 7d). */
export const DISAPPEARING_MINUTE_OPTIONS = [0, 60, 1440, 10080] as const;
export type DisappearingMinutes = (typeof DISAPPEARING_MINUTE_OPTIONS)[number];

export function isAllowedDisappearingMinutes(value: number): value is DisappearingMinutes {
  return (DISAPPEARING_MINUTE_OPTIONS as readonly number[]).includes(value);
}

export function isWithinMessageActionWindow(
  createdAt: string,
  windowMs: number,
  nowMs = Date.now(),
): boolean {
  const createdMs = new Date(createdAt).getTime();
  if (!Number.isFinite(createdMs)) return false;
  const ageMs = nowMs - createdMs;
  return ageMs >= 0 && ageMs <= windowMs;
}

/**
 * Disappearing mode applies only to messages sent after the shared setting was turned on.
 * Older history stays until the participants hide the thread or Civi is cleared.
 */
export function messageIsVisibleUnderDisappearing(options: {
  createdAt: string;
  disappearingMinutes: number;
  disappearingStartedAt: string | null | undefined;
  nowMs?: number;
}): boolean {
  const minutes = options.disappearingMinutes;
  if (!Number.isFinite(minutes) || minutes <= 0) return true;

  const createdMs = new Date(options.createdAt).getTime();
  if (!Number.isFinite(createdMs)) return true;

  const startedRaw = options.disappearingStartedAt;
  if (!startedRaw) return true;
  const startedMs = new Date(startedRaw).getTime();
  if (!Number.isFinite(startedMs) || createdMs < startedMs) return true;

  const cutoffMs = (options.nowMs ?? Date.now()) - minutes * 60 * 1000;
  return createdMs >= cutoffMs;
}
