/**
 * Prototype Luma credit display helpers for the Civizen app.
 * Not money, not a financial instrument — demonstration allocation only.
 * Issuance / monetary-policy simulation lives under
 * `research/economic-simulations/luma-monetary-model/` and must not be imported by the app.
 */

/** Controlling notice for Luma prototype status (amendment P1-01). */
export const LUMA_PROTOTYPE_NOTICE =
  'Luma is a prototype feature used for demonstration and internal product testing. It is not money, a security, a deposit, a stablecoin, a claim on assets, or a promise of financial value. It cannot be purchased, withdrawn, redeemed, converted, or transferred between participants. It has no cash value and does not provide governance rights.' as const;

/**
 * Display units for prototype Luma credits (not currency, money, or a financial instrument).
 * Amounts in APIs and the database should use **whole Lumens** (integer); use {@link formatLumaFromLumens} for display.
 *
 * @see {@link LUMA_PROTOTYPE_NOTICE}
 */
export const LUMA_PROTOTYPE_UNIT = {
  name: 'Luma',
  ticker: 'LUMA',
  symbol: 'LU',
  subunitName: 'Lumen',
  subunitsPerUnit: 100,
  prototype: true,
  transferable: false,
} as const;

/** @deprecated Prefer {@link LUMA_PROTOTYPE_UNIT}. Compatibility alias only — not a currency. */
export const LUMA_CURRENCY = LUMA_PROTOTYPE_UNIT;

export type FormatLumaFromLumensOptions = {
  locale?: string;
  /** When false, suffix uses the full unit name instead of the short symbol. */
  useSymbol?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export function toLumens(lumaAmount: number) {
  return Math.round(lumaAmount * LUMA_PROTOTYPE_UNIT.subunitsPerUnit);
}

export function fromLumens(lumenAmount: number) {
  return lumenAmount / LUMA_PROTOTYPE_UNIT.subunitsPerUnit;
}

/**
 * Format a non-negative **whole Lumen** balance for UI (avoids float drift from repeated fractional math).
 */
export function formatLumaFromLumens(lumens: number, options?: FormatLumaFromLumensOptions): string {
  if (!Number.isInteger(lumens) || lumens < 0) {
    throw new RangeError('lumens must be a non-negative integer');
  }
  if (lumens > Number.MAX_SAFE_INTEGER) {
    throw new RangeError('lumens exceeds safe integer range for display');
  }
  const whole = Math.floor(lumens / LUMA_PROTOTYPE_UNIT.subunitsPerUnit);
  const frac = lumens % LUMA_PROTOTYPE_UNIT.subunitsPerUnit;
  const lumaAsNumber = whole + frac / LUMA_PROTOTYPE_UNIT.subunitsPerUnit;
  const fmt = new Intl.NumberFormat(options?.locale, {
    minimumFractionDigits: options?.minimumFractionDigits ?? (frac === 0 ? 0 : 2),
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });
  const suffix = options?.useSymbol === false ? ` ${LUMA_PROTOTYPE_UNIT.name}` : ` ${LUMA_PROTOTYPE_UNIT.symbol}`;
  return `${fmt.format(lumaAsNumber)}${suffix}`;
}

/**
 * Parse a user-entered decimal Luma amount (e.g. from a price field) into whole Lumens.
 * Accepts optional commas as decimal separators. Returns null if empty or invalid.
 */
export function parseUserLumaInputToLumens(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, '').replace(/,/g, '.');
  if (normalized === '') return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return toLumens(n);
}
