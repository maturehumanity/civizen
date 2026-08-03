import { describe, expect, it } from 'vitest';

import { createLumaTransferIdempotencyKey, lumaTransferErrorMessageKey } from '@/lib/luma-transfer';

describe('luma-transfer helpers', () => {
  it('creates idempotency keys with reasonable length', () => {
    const a = createLumaTransferIdempotencyKey();
    const b = createLumaTransferIdempotencyKey();
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(b.length).toBeGreaterThanOrEqual(8);
    expect(a).not.toBe(b);
  });

  it('maps known RPC error fragments to allocation message keys', () => {
    expect(lumaTransferErrorMessageKey('forbidden_mint')).toBe('lumaMintForbidden');
    expect(lumaTransferErrorMessageKey('target_profile_not_found')).toBe('lumaMintRecipient');
    expect(lumaTransferErrorMessageKey('insufficient_balance')).toBe('lumaMintGeneric');
    expect(lumaTransferErrorMessageKey('listing_sold_out')).toBe('lumaMintGeneric');
    expect(lumaTransferErrorMessageKey('unknown')).toBe('lumaMintGeneric');
  });
});
