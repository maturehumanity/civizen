import { MARKET_JOB_TYPE_SEEDS } from '@/lib/market-job-types';

/** Indicative monthly minimums in USD for sentence-form guide pay. Editable by the visitor. */
export const MARKET_JOB_GUIDE_MONTHLY_USD: Record<string, number> = {
  Baker: 3200,
  Cashier: 2800,
  Cook: 3100,
  Driver: 3500,
  Electrician: 4800,
  Gardener: 3000,
  Housekeeper: 2800,
  Mechanic: 4200,
  Nurse: 5200,
  Painter: 3750,
  Plumber: 4700,
  Receptionist: 3000,
  'Sales associate': 3200,
  'Security guard': 3100,
  Teacher: 4000,
  Waiter: 2700,
  'Warehouse worker': 3300,
  Cleaner: 2600,
  Carpenter: 4100,
  'Delivery courier': 3000,
  Caregiver: 3200,
  Barista: 2700,
  'Construction worker': 3800,
  'IT support': 4500,
  'Office assistant': 3100,
};

const DEFAULT_GUIDE_MONTHLY_USD = 3000;

type CountryMoney = {
  currency: string;
  rateFromUsd: number;
};

const COUNTRY_MONEY: Record<string, CountryMoney> = {
  US: { currency: 'USD', rateFromUsd: 1 },
  AM: { currency: 'AMD', rateFromUsd: 390 },
  GB: { currency: 'GBP', rateFromUsd: 0.79 },
  CA: { currency: 'CAD', rateFromUsd: 1.37 },
  AU: { currency: 'AUD', rateFromUsd: 1.52 },
  NZ: { currency: 'NZD', rateFromUsd: 1.66 },
  EU: { currency: 'EUR', rateFromUsd: 0.92 },
  DE: { currency: 'EUR', rateFromUsd: 0.92 },
  FR: { currency: 'EUR', rateFromUsd: 0.92 },
  IT: { currency: 'EUR', rateFromUsd: 0.92 },
  ES: { currency: 'EUR', rateFromUsd: 0.92 },
  NL: { currency: 'EUR', rateFromUsd: 0.92 },
  IN: { currency: 'INR', rateFromUsd: 83 },
  GE: { currency: 'GEL', rateFromUsd: 2.7 },
  AE: { currency: 'AED', rateFromUsd: 3.67 },
  RU: { currency: 'RUB', rateFromUsd: 90 },
  BR: { currency: 'BRL', rateFromUsd: 5.1 },
  MX: { currency: 'MXN', rateFromUsd: 17 },
  JP: { currency: 'JPY', rateFromUsd: 150 },
  KR: { currency: 'KRW', rateFromUsd: 1350 },
};

export function guideMonthlyPayUsd(jobType: string): number {
  const exact = MARKET_JOB_GUIDE_MONTHLY_USD[jobType];
  if (exact) return exact;
  const match = Object.entries(MARKET_JOB_GUIDE_MONTHLY_USD).find(
    ([name]) => name.toLowerCase() === jobType.trim().toLowerCase(),
  );
  return match?.[1] ?? DEFAULT_GUIDE_MONTHLY_USD;
}

export function moneyForCountry(countryCode: string | null | undefined): CountryMoney {
  const code = countryCode?.trim().toUpperCase() || 'US';
  return COUNTRY_MONEY[code] ?? { currency: 'USD', rateFromUsd: 1 };
}

function roundLocalAmount(value: number, currency: string): number {
  if (currency === 'AMD' || currency === 'KRW' || currency === 'JPY') {
    return Math.round(value / 1000) * 1000;
  }
  if (currency === 'INR' || currency === 'RUB') {
    return Math.round(value / 100) * 100;
  }
  return Math.round(value / 50) * 50;
}

export function localizeGuideMonthlyPay(
  usd: number,
  countryCode: string | null | undefined,
): { currency: string; value: number } {
  const money = moneyForCountry(countryCode);
  return {
    currency: money.currency,
    value: roundLocalAmount(usd * money.rateFromUsd, money.currency),
  };
}

export function formatMarketJobPayAmount(
  amount: number,
  countryCode: string | null | undefined,
): string {
  const currency = moneyForCountry(countryCode).currency;
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function cyclingJobTypeAt(index: number, options: readonly string[] = MARKET_JOB_TYPE_SEEDS): string {
  if (options.length === 0) return '';
  return options[((index % options.length) + options.length) % options.length] ?? '';
}
