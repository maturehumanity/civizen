/**
 * Hash-chain helpers for civic_voting_events transparency (Phase A).
 * Browser-safe; uses Web Crypto when available.
 */

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashVotingEvent(input: {
  electionId: string | null;
  sessionId: string | null;
  actorId: string | null;
  eventType: string;
  payload: unknown;
  prevEventHash: string | null;
  createdAt: string;
}): Promise<string> {
  const canonical = JSON.stringify({
    electionId: input.electionId,
    sessionId: input.sessionId,
    actorId: input.actorId,
    eventType: input.eventType,
    payload: input.payload,
    prevEventHash: input.prevEventHash,
    createdAt: input.createdAt,
  });
  return sha256Hex(canonical);
}

/** Inclusion confirmation without revealing ballot choice. */
export async function ballotInclusionCode(ballotId: string, salt: string): Promise<string> {
  return sha256Hex(`${ballotId}|${salt}`);
}
