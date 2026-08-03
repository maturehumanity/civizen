import { formatEnglishList } from '@/lib/profile-skills';

/** Experience area seeds for the Profile Experience sentence picker. */
export const PROFILE_EXPERIENCE_AREA_SEEDS = [
  'Professional work',
  'Project work',
  'Leadership',
  'Volunteer work',
  'Community involvement',
  'Civic engagement',
  'Research',
  'Teaching',
  'Practical training',
  'Other relevant experience',
] as const;

/** Common position / role seeds. */
export const PROFILE_EXPERIENCE_POSITION_SEEDS = [
  'Analyst',
  'Consultant',
  'Coordinator',
  'Director',
  'Engineer',
  'Founder',
  'Manager',
  'Researcher',
  'Specialist',
  'Team lead',
] as const;

/**
 * Well-known company seeds to start with.
 * Location-aware filtering can refine this list when city/region/country are known.
 */
export const PROFILE_EXPERIENCE_COMPANY_SEEDS = [
  'Google',
  'Microsoft',
  'Apple',
  'Amazon',
  'Meta',
  'IBM',
  'Deloitte',
  'Accenture',
  'United Nations',
  'Red Cross',
] as const;

/** Month index 1–12 → short English label. */
export const PROFILE_EXPERIENCE_MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export type ExperienceMonthYear = {
  year: number;
  month: number; // 1–12
};

export type ExperienceEntry = {
  id: string;
  areas: string[];
  positions: string[];
  companies: string[];
  /** Sorted unique YYYY-MM keys representing selected month-years. */
  durationKeys: string[];
};

export function normalizeNameList(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

export function monthYearKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function parseMonthYearKey(key: string): ExperienceMonthYear | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
}

export function normalizeDurationKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const parsed: ExperienceMonthYear[] = [];
  for (const raw of keys) {
    const point = parseMonthYearKey(raw);
    if (!point) continue;
    const key = monthYearKey(point.year, point.month);
    if (seen.has(key)) continue;
    seen.add(key);
    parsed.push(point);
  }
  parsed.sort((a, b) => a.year - b.year || a.month - b.month);
  return parsed.map((p) => monthYearKey(p.year, p.month));
}

export function formatMonthYear(point: ExperienceMonthYear): string {
  const label = PROFILE_EXPERIENCE_MONTH_LABELS[point.month - 1] ?? String(point.month);
  return `${label} ${point.year}`;
}

/**
 * One selected month-year → "May 2021".
 * Two or more → range from earliest to latest → "May 2021 – June 2023".
 */
export function formatDurationRange(keys: string[]): string {
  const normalized = normalizeDurationKeys(keys);
  if (normalized.length === 0) return '';
  const first = parseMonthYearKey(normalized[0]);
  const last = parseMonthYearKey(normalized[normalized.length - 1]);
  if (!first || !last) return '';
  if (normalized.length === 1) return formatMonthYear(first);
  return `${formatMonthYear(first)} – ${formatMonthYear(last)}`;
}

export function experienceEntryComplete(entry: {
  areas: string[];
  positions: string[];
  companies: string[];
  durationKeys: string[];
}): boolean {
  return (
    normalizeNameList(entry.areas).length > 0 &&
    normalizeNameList(entry.positions).length > 0 &&
    normalizeNameList(entry.companies).length > 0 &&
    normalizeDurationKeys(entry.durationKeys).length > 0
  );
}

/** One line for a committed experience (no trailing period). */
export function formatExperienceLine(entry: {
  areas: string[];
  positions: string[];
  companies: string[];
  durationKeys: string[];
}): string {
  const areas = formatEnglishList(normalizeNameList(entry.areas));
  const positions = formatEnglishList(normalizeNameList(entry.positions));
  const duration = formatDurationRange(entry.durationKeys);
  const companies = formatEnglishList(normalizeNameList(entry.companies));
  if (!areas || !positions || !duration || !companies) return '';
  return `${areas} at the position of ${positions} for the duration of ${duration} with ${companies}`;
}

export function filterExperienceOptions(
  query: string,
  seeds: readonly string[],
  selected: string[] = [],
): string[] {
  const q = query.trim().toLowerCase();
  const selectedLower = new Set(selected.map((s) => s.toLowerCase()));
  const pool = [
    ...seeds,
    ...selected.filter(
      (name) => !seeds.some((seed) => seed.toLowerCase() === name.toLowerCase()),
    ),
  ];
  const filtered = q ? pool.filter((name) => name.toLowerCase().includes(q)) : [...pool];
  return filtered.sort((a, b) => {
    const aSel = selectedLower.has(a.toLowerCase()) ? 0 : 1;
    const bSel = selectedLower.has(b.toLowerCase()) ? 0 : 1;
    if (aSel !== bSel) return aSel - bSel;
    return a.localeCompare(b);
  });
}

export function experienceYearOptions(span = 60): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: span }, (_, index) => current - index);
}

export function newExperienceDraftId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `exp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyExperienceDraft(): Omit<ExperienceEntry, 'id'> & { id?: string } {
  return {
    areas: [],
    positions: [],
    companies: [],
    durationKeys: [],
  };
}

export function serializeExperienceEntries(entries: ExperienceEntry[]): string {
  return JSON.stringify(
    entries.map((entry) => ({
      id: entry.id,
      areas: normalizeNameList(entry.areas),
      positions: normalizeNameList(entry.positions),
      companies: normalizeNameList(entry.companies),
      durationKeys: normalizeDurationKeys(entry.durationKeys),
    })),
  );
}

export function parseExperienceEntries(raw: unknown): ExperienceEntry[] {
  if (!Array.isArray(raw)) return [];
  const result: ExperienceEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const areas = Array.isArray(row.areas)
      ? normalizeNameList(row.areas.filter((v): v is string => typeof v === 'string'))
      : Array.isArray(row.area_names)
        ? normalizeNameList(row.area_names.filter((v): v is string => typeof v === 'string'))
        : [];
    const positions = Array.isArray(row.positions)
      ? normalizeNameList(row.positions.filter((v): v is string => typeof v === 'string'))
      : Array.isArray(row.position_names)
        ? normalizeNameList(row.position_names.filter((v): v is string => typeof v === 'string'))
        : [];
    const companies = Array.isArray(row.companies)
      ? normalizeNameList(row.companies.filter((v): v is string => typeof v === 'string'))
      : Array.isArray(row.company_names)
        ? normalizeNameList(row.company_names.filter((v): v is string => typeof v === 'string'))
        : [];
    const durationKeys = Array.isArray(row.durationKeys)
      ? normalizeDurationKeys(row.durationKeys.filter((v): v is string => typeof v === 'string'))
      : Array.isArray(row.duration_keys)
        ? normalizeDurationKeys(row.duration_keys.filter((v): v is string => typeof v === 'string'))
        : [];
    const id =
      typeof row.id === 'string' && row.id.trim()
        ? row.id
        : newExperienceDraftId();
    if (!experienceEntryComplete({ areas, positions, companies, durationKeys })) continue;
    result.push({ id, areas, positions, companies, durationKeys });
  }
  return result;
}
