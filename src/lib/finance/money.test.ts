import { describe, expect, it } from 'vitest';

import { formatMinor, formatMinorCompact, shouldHideMoneyCents } from '@/lib/finance/money';

describe('money compact display', () => {
  it('hides cents for amounts of $1,000 and above', () => {
    expect(shouldHideMoneyCents(99_999)).toBe(false);
    expect(shouldHideMoneyCents(100_000)).toBe(true);
    expect(shouldHideMoneyCents(4_400_000_000)).toBe(true);
    expect(formatMinor(100_000, 'USD')).toBe('$1,000.00');
    expect(formatMinorCompact(100_000, 'USD')).toEqual({
      display: '$1,000',
      precise: '$1,000.00',
      hideCents: true,
    });
    expect(formatMinorCompact(99_999, 'USD').hideCents).toBe(false);
    expect(formatMinorCompact(4_400_000_000, 'USD').display).toBe('$44,000,000');
    expect(formatMinorCompact(4_400_000_000, 'USD').precise).toBe('$44,000,000.00');
  });
});
