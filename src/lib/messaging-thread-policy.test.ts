import { describe, expect, it } from 'vitest';

import {
  DISAPPEARING_MINUTE_OPTIONS,
  MESSAGE_EDIT_WINDOW_MS,
  MESSAGE_UNSEND_WINDOW_MS,
  isAllowedDisappearingMinutes,
  isWithinMessageActionWindow,
  messageIsVisibleUnderDisappearing,
} from '@/lib/messaging-thread-policy';

describe('messaging thread policy', () => {
  const now = Date.parse('2026-08-13T18:00:00.000Z');

  it('allows edit and unsend only inside a one-minute window', () => {
    expect(MESSAGE_EDIT_WINDOW_MS).toBe(60_000);
    expect(MESSAGE_UNSEND_WINDOW_MS).toBe(60_000);
    expect(isWithinMessageActionWindow('2026-08-13T17:59:30.000Z', MESSAGE_EDIT_WINDOW_MS, now)).toBe(true);
    expect(isWithinMessageActionWindow('2026-08-13T17:58:59.000Z', MESSAGE_UNSEND_WINDOW_MS, now)).toBe(false);
  });

  it('keeps the WhatsApp-style duration set', () => {
    expect(DISAPPEARING_MINUTE_OPTIONS).toEqual([0, 60, 1440, 10080]);
    expect(isAllowedDisappearingMinutes(60)).toBe(true);
    expect(isAllowedDisappearingMinutes(30)).toBe(false);
  });

  it('does not rewrite history from before disappearing was turned on', () => {
    expect(
      messageIsVisibleUnderDisappearing({
        createdAt: '2026-08-13T10:00:00.000Z',
        disappearingMinutes: 60,
        disappearingStartedAt: '2026-08-13T17:00:00.000Z',
        nowMs: now,
      }),
    ).toBe(true);
  });

  it('hides only messages sent after the shared setting that are past the timer', () => {
    expect(
      messageIsVisibleUnderDisappearing({
        createdAt: '2026-08-13T16:50:00.000Z',
        disappearingMinutes: 60,
        disappearingStartedAt: '2026-08-13T16:00:00.000Z',
        nowMs: now,
      }),
    ).toBe(false);
    expect(
      messageIsVisibleUnderDisappearing({
        createdAt: '2026-08-13T17:30:00.000Z',
        disappearingMinutes: 60,
        disappearingStartedAt: '2026-08-13T16:00:00.000Z',
        nowMs: now,
      }),
    ).toBe(true);
  });

  it('shows every message when disappearing is off', () => {
    expect(
      messageIsVisibleUnderDisappearing({
        createdAt: '2020-01-01T00:00:00.000Z',
        disappearingMinutes: 0,
        disappearingStartedAt: null,
        nowMs: now,
      }),
    ).toBe(true);
  });
});
