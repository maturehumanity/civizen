import { getCountryName } from '@/lib/countries';

const COUNTRY_TITLE_PREFIXES: Record<string, RegExp[]> = {
  US: [/^U\.S\.\s+/i, /^United States\s+/i],
  GB: [/^U\.K\.\s+/i, /^UK\s+/i, /^United Kingdom\s+/i],
  FR: [/^France\s+/i, /^French\s+/i],
  BR: [/^Brazil\s+/i, /^Brazilian\s+/i],
  DE: [/^Germany\s+/i, /^German\s+/i],
  IT: [/^Italy\s+/i, /^Italian\s+/i],
};

const COUNTRY_TITLE_ALIASES: Record<string, string[]> = {
  US: ['U.S.', 'United States', 'USA'],
  GB: ['U.K.', 'United Kingdom', 'Britain', 'Great Britain'],
  FR: ['France'],
  BR: ['Brazil'],
  DE: ['Germany'],
  IT: ['Italy'],
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Drop country wording from an election title when the flag already conveys it.
 * Example: "U.S. Senate — California (2024)" → "Senate — California (2024)"
 */
export function electionTitleWithoutCountryLabel(
  title: string,
  countryCode: string | null | undefined,
  locale = 'en',
): string {
  const code = countryCode?.trim().toUpperCase();
  if (!code || !title.trim()) return title;
  // Non-country scopes (e.g. GLOBAL) keep the title as authored.
  if (!/^[A-Z]{2}$/.test(code)) return title;

  let next = title.trim();

  for (const pattern of COUNTRY_TITLE_PREFIXES[code] ?? []) {
    next = next.replace(pattern, '');
  }

  const aliases = [...(COUNTRY_TITLE_ALIASES[code] ?? []), getCountryName(code, locale)];

  for (const alias of aliases) {
    const trimmed = alias.trim();
    if (!trimmed) continue;
    const escaped = escapeRegExp(trimmed);
    next = next
      .replace(new RegExp(`\\s*[—–-]\\s*${escaped}\\b`, 'i'), '')
      .replace(new RegExp(`\\(\\s*${escaped}\\s*\\)`, 'i'), '');
  }

  next = next
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+[—–-]\s+/g, ' — ')
    .replace(/^\s*[—–-]\s*/, '')
    .replace(/\s*[—–-]\s*$/, '')
    .trim();

  return next || title;
}
