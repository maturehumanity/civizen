import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LUMA_PROTOTYPE_NOTICE,
  formatLumaFromLumens,
  fromLumens,
  parseUserLumaInputToLumens,
  toLumens,
} from '@/lib/prototype-credits';

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('prototype credit helpers', () => {
  it('exposes the controlling P1-01 notice text', () => {
    expect(LUMA_PROTOTYPE_NOTICE).toBe(
      'Luma is a prototype feature used for demonstration and internal product testing. It is not money, a security, a deposit, a stablecoin, a claim on assets, or a promise of financial value. It cannot be purchased, withdrawn, redeemed, converted, or transferred between participants. It has no cash value and does not provide governance rights.',
    );
  });

  it('formats whole lumens without trailing decimals when fractional part is zero', () => {
    expect(formatLumaFromLumens(0, { locale: 'en-US' })).toMatch(/^0\s+LU$/);
    expect(formatLumaFromLumens(100, { locale: 'en-US' })).toMatch(/^1\s+LU$/);
  });

  it('formats fractional Luma using two decimal places by default', () => {
    expect(formatLumaFromLumens(1, { locale: 'en-US' })).toBe('0.01 LU');
    expect(formatLumaFromLumens(12345, { locale: 'en-US' })).toBe('123.45 LU');
  });

  it('can show the full unit name instead of the symbol', () => {
    expect(formatLumaFromLumens(100, { locale: 'en-US', useSymbol: false })).toBe('1 Luma');
  });

  it('parses user input strings into lumens', () => {
    expect(parseUserLumaInputToLumens('')).toBeNull();
    expect(parseUserLumaInputToLumens('12')).toBe(toLumens(12));
    expect(parseUserLumaInputToLumens('12,5')).toBe(toLumens(12.5));
    expect(parseUserLumaInputToLumens('not-a-number')).toBeNull();
  });

  it('rejects invalid lumens for formatting', () => {
    expect(() => formatLumaFromLumens(1.5)).toThrow(RangeError);
    expect(() => formatLumaFromLumens(-1)).toThrow(RangeError);
  });

  it('keeps toLumens and fromLumens consistent for representative values', () => {
    expect(toLumens(0.1)).toBe(10);
    expect(fromLumens(10)).toBe(0.1);
  });
});

describe('P1-01 production removals', () => {
  it('does not ship PeerSendLumaDialog in the production tree', () => {
    expect(existsSync(path.join(srcRoot, 'components/market/PeerSendLumaDialog.tsx'))).toBe(false);
  });

  it('does not keep the operational monetary engine under src/lib', () => {
    expect(existsSync(path.join(srcRoot, 'lib/monetary.ts'))).toBe(false);
  });
});
