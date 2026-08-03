/**
 * Duress PIN — lookalike booth that casts a non-countable ballot and silently alerts watchers.
 * The coerced UI path must never acknowledge that duress mode activated.
 */

import { sha256Hex } from './transparency';

export const DURESS_EVENT_TYPE = 'session.duress_void_cast';
export const DURESS_ALERT_EVENT_TYPE = 'watchers.duress_alert';

export type DuressPinEnrollment = {
  pinHash: string;
  pinSalt: string;
};

export type DuressPinCheck =
  | { matched: true; mode: 'duress' }
  | { matched: false; mode: 'normal' | 'invalid' };

export type DuressBallotResult = {
  isDuress: true;
  isCountable: false;
  ballotCommitment: string;
  silentAlert: {
    eventType: typeof DURESS_ALERT_EVENT_TYPE;
    shouldNotifyWatchers: boolean;
  };
  voterVisibleEventType: 'session.ballot_cast';
};

function normalizePin(pin: string): string {
  return pin.trim();
}

export function isValidDuressPinFormat(pin: string): boolean {
  const normalized = normalizePin(pin);
  return /^\d{6,8}$/.test(normalized);
}

export async function enrollDuressPin(pin: string, salt?: string): Promise<DuressPinEnrollment> {
  if (!isValidDuressPinFormat(pin)) {
    throw new Error('duress_pin_invalid_format');
  }
  const pinSalt = salt ?? (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `salt-${Date.now()}`);
  const pinHash = await sha256Hex(`${pinSalt}:${normalizePin(pin)}`);
  return { pinHash, pinSalt };
}

export async function checkBoothUnlockPin(input: {
  enteredPin: string;
  normalPinHash: string | null;
  normalPinSalt: string | null;
  duressPinHash: string | null;
  duressPinSalt: string | null;
}): Promise<DuressPinCheck> {
  const entered = normalizePin(input.enteredPin);

  if (input.duressPinHash && input.duressPinSalt) {
    const duressHash = await sha256Hex(`${input.duressPinSalt}:${entered}`);
    if (duressHash === input.duressPinHash) {
      return { matched: true, mode: 'duress' };
    }
  }

  if (input.normalPinHash && input.normalPinSalt) {
    const normalHash = await sha256Hex(`${input.normalPinSalt}:${entered}`);
    if (normalHash === input.normalPinHash) {
      return { matched: false, mode: 'normal' };
    }
  }

  return { matched: false, mode: 'invalid' };
}

/**
 * Build a void ballot that looks identical to a normal cast from the voter's POV.
 * Watchers receive a silent alert; the voter-facing event type stays generic.
 */
export async function buildDuressVoidBallot(input: {
  sessionId: string;
  electionId: string;
  alertEnabled?: boolean;
}): Promise<DuressBallotResult> {
  const ballotCommitment = await sha256Hex(
    `duress-void|${input.electionId}|${input.sessionId}|${Date.now()}`,
  );

  return {
    isDuress: true,
    isCountable: false,
    ballotCommitment,
    silentAlert: {
      eventType: DURESS_ALERT_EVENT_TYPE,
      shouldNotifyWatchers: input.alertEnabled !== false,
    },
    voterVisibleEventType: 'session.ballot_cast',
  };
}
