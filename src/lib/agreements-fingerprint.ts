import type { AgreementContent } from '@/lib/agreements-model';

/** Recursively sort object keys for a deterministic JSON snapshot. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sortValue);
  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    const item = record[key];
    if (item === undefined) continue;
    sorted[key] = sortValue(item);
  }
  return sorted;
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export type AgreementFingerprintPayload = {
  agreementId: string;
  versionNumber: number;
  title: string;
  agreementType: string;
  content: AgreementContent;
  parties: unknown;
  signatories: unknown;
  attachments: unknown;
};

export async function fingerprintAgreementVersion(payload: AgreementFingerprintPayload): Promise<string> {
  return sha256Hex(canonicalJson(payload));
}
