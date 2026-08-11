/** Integer minor-unit money helpers (no floating-point arithmetic). */

export type MoneyMinor = {
  amountMinor: number;
  currency: string;
};

export function normalizeCurrency(code: string): string {
  return code.trim().toUpperCase();
}

export function assertMinorInt(value: number, label = 'amount'): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer minor-unit value`);
  }
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} exceeds safe integer range`);
  }
  return value;
}

export function parseMajorToMinor(majorText: string, fractionDigits = 2): number {
  const cleaned = majorText.trim().replace(/,/g, '');
  if (!cleaned) throw new Error('amount is required');
  const match = cleaned.match(/^-?\d+(\.\d+)?$/);
  if (!match) throw new Error('invalid amount');
  const negative = cleaned.startsWith('-');
  const [wholeRaw, fracRaw = ''] = cleaned.replace(/^-/, '').split('.');
  const whole = wholeRaw === '' ? '0' : wholeRaw;
  const frac = (fracRaw + '0'.repeat(fractionDigits)).slice(0, fractionDigits);
  if (fracRaw.length > fractionDigits) throw new Error('too many decimal places');
  const minor = Number.parseInt(whole, 10) * 10 ** fractionDigits + Number.parseInt(frac || '0', 10);
  return assertMinorInt(negative ? -minor : minor);
}

export function formatMinor(amountMinor: number, currency: string, fractionDigits = 2): string {
  assertMinorInt(amountMinor);
  const sign = amountMinor < 0 ? '-' : '';
  const abs = Math.abs(amountMinor);
  const whole = Math.floor(abs / 10 ** fractionDigits);
  const frac = String(abs % 10 ** fractionDigits).padStart(fractionDigits, '0');
  const major = fractionDigits === 0 ? String(whole) : `${whole}.${frac}`;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizeCurrency(currency),
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(Number(`${sign}${major}`));
  } catch {
    return `${sign}${major} ${normalizeCurrency(currency)}`;
  }
}

/** Hide fractional cents in the default view when |major| ≥ 1,000. */
export function shouldHideMoneyCents(amountMinor: number, fractionDigits = 2): boolean {
  assertMinorInt(amountMinor);
  const thresholdMinor = 1000 * 10 ** fractionDigits;
  return Math.abs(amountMinor) >= thresholdMinor;
}

export function formatMinorCompact(amountMinor: number, currency: string, fractionDigits = 2): {
  display: string;
  precise: string;
  hideCents: boolean;
} {
  const precise = formatMinor(amountMinor, currency, fractionDigits);
  const hideCents = shouldHideMoneyCents(amountMinor, fractionDigits);
  if (!hideCents) {
    return { display: precise, precise, hideCents: false };
  }
  // formatMinor(..., 0) expects major units, not minor units.
  const wholeMajor = amountMinor < 0
    ? -Math.floor(Math.abs(amountMinor) / 10 ** fractionDigits)
    : Math.floor(amountMinor / 10 ** fractionDigits);
  return {
    display: formatMinor(wholeMajor, currency, 0),
    precise,
    hideCents: true,
  };
}

export function sumMinorByCurrency(
  rows: Array<{ amountMinor: number; currency: string }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const currency = normalizeCurrency(row.currency);
    const amount = assertMinorInt(row.amountMinor);
    out[currency] = (out[currency] ?? 0) + amount;
  }
  return out;
}

export function remainingPlanned(plannedMinor: number, actualMinor: number): number {
  return assertMinorInt(plannedMinor) - assertMinorInt(actualMinor);
}

export function uncommittedBudget(plannedMinor: number, committedMinor: number): number {
  return assertMinorInt(plannedMinor) - assertMinorInt(committedMinor);
}
