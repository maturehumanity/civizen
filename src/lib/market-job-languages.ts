import { languageOptions } from '@/lib/i18n.languages';
import { getLanguageFlagCountryCode } from '@/lib/i18n.runtime';

/** Common workplace languages shown first in the Jobs More picker. */
export const MARKET_JOB_LANGUAGE_SEEDS = [
  'hy',
  'en',
  'ru',
  'es',
  'fr',
  'ar',
  'de',
  'zh',
  'pt',
  'hi',
  'tr',
  'fa',
  'ka',
  'uk',
  'it',
  'ja',
  'ko',
  'pl',
  'nl',
  'el',
] as const;

const COUNTRY_PRIMARY_LANGUAGE: Record<string, string> = {
  AM: 'hy',
  AU: 'en',
  AE: 'ar',
  BR: 'pt',
  BY: 'be',
  CA: 'en',
  CN: 'zh',
  DE: 'de',
  EG: 'ar',
  ES: 'es',
  FR: 'fr',
  GB: 'en',
  GE: 'ka',
  GR: 'el',
  IN: 'hi',
  IR: 'fa',
  IT: 'it',
  JP: 'ja',
  KR: 'ko',
  MX: 'es',
  NL: 'nl',
  PL: 'pl',
  PT: 'pt',
  RU: 'ru',
  SA: 'ar',
  TR: 'tr',
  UA: 'uk',
  US: 'en',
};

export function normalizeMarketJobLanguageCode(code: string): string {
  return code.trim().toLowerCase().split('-')[0] || '';
}

export function marketJobLanguageLabel(code: string, locale = 'en'): string {
  const normalized = normalizeMarketJobLanguageCode(code);
  if (!normalized) return '';
  try {
    const name = new Intl.DisplayNames([locale], { type: 'language' }).of(normalized);
    if (name) return name;
  } catch {
    /* Use the catalog label below. */
  }
  const option = languageOptions.find(
    (item) => normalizeMarketJobLanguageCode(item.code) === normalized,
  );
  return option?.label || normalized;
}

export function marketJobLanguageFlagCountry(code: string): string {
  const normalized = normalizeMarketJobLanguageCode(code);
  return getLanguageFlagCountryCode(code) || getLanguageFlagCountryCode(normalized);
}

export function defaultMarketJobLanguages(uiLanguage: string, countryCode: string): string[] {
  const codes: string[] = [];
  const ui = normalizeMarketJobLanguageCode(uiLanguage);
  if (ui) codes.push(ui);
  const fromCountry = COUNTRY_PRIMARY_LANGUAGE[countryCode.trim().toUpperCase()];
  if (fromCountry && !codes.includes(fromCountry)) codes.push(fromCountry);
  return codes;
}

export function filterMarketJobLanguageOptions(
  query: string,
  selected: readonly string[] = [],
  locale = 'en',
): Array<{ code: string; label: string }> {
  const needle = query.trim().toLowerCase();
  const selectedSet = new Set(selected.map(normalizeMarketJobLanguageCode).filter(Boolean));
  const pool = new Map<string, string>();

  const add = (code: string) => {
    const normalized = normalizeMarketJobLanguageCode(code);
    if (!normalized || pool.has(normalized)) return;
    pool.set(normalized, marketJobLanguageLabel(normalized, locale));
  };

  for (const seed of MARKET_JOB_LANGUAGE_SEEDS) add(seed);
  for (const code of selected) add(code);

  if (needle) {
    for (const option of languageOptions) {
      const code = normalizeMarketJobLanguageCode(option.code);
      const label = marketJobLanguageLabel(code, locale);
      if (
        code.includes(needle) ||
        label.toLowerCase().includes(needle) ||
        option.label.toLowerCase().includes(needle)
      ) {
        add(code);
      }
    }
  }

  return [...pool.entries()]
    .map(([code, label]) => ({ code, label }))
    .filter(
      (item) =>
        !needle ||
        item.code.includes(needle) ||
        item.label.toLowerCase().includes(needle),
    )
    .sort((left, right) => {
      const leftSelected = selectedSet.has(left.code) ? 0 : 1;
      const rightSelected = selectedSet.has(right.code) ? 0 : 1;
      if (leftSelected !== rightSelected) return leftSelected - rightSelected;
      return left.label.localeCompare(right.label);
    });
}
