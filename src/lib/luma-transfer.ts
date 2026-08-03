/**
 * Client-generated idempotency key for `transfer_luma_between_profiles` retries (same key = same outcome).
 */
export function createLumaTransferIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Map Postgres / RPC exception text to a short user-facing message key suffix
 * for prototype-credit allocation (caller runs `t(\`settings.${key}\`)` for mint keys).
 */
export function lumaTransferErrorMessageKey(message: string | undefined | null): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('forbidden_mint')) return 'lumaMintForbidden';
  if (m.includes('target_profile_not_found')) return 'lumaMintRecipient';
  return 'lumaMintGeneric';
}
