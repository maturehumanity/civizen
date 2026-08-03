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

/** Sentinel for an ongoing experience end date. */
export const DURATION_PRESENT = 'present';

export type ExperienceMonthYear = {
  year: number;
  month: number; // 1–12
};

export type ExperienceEntry = {
  id: string;
  areas: string[];
  positions: string[];
  companies: string[];
  /** Start month-year as YYYY-MM. */
  durationStart: string;
  /** End month-year as YYYY-MM, or {@link DURATION_PRESENT}. */
  durationEnd: string;
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

export function isDurationPresent(value: string | null | undefined): boolean {
  return (value ?? '').trim().toLowerCase() === DURATION_PRESENT;
}

export function normalizeDurationStart(value: string | null | undefined): string {
  const point = parseMonthYearKey(value ?? '');
  return point ? monthYearKey(point.year, point.month) : '';
}

export function normalizeDurationEnd(value: string | null | undefined): string {
  if (isDurationPresent(value)) return DURATION_PRESENT;
  return normalizeDurationStart(value);
}

/**
 * Compare two ends for ordering. Present sorts after any concrete month-year.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareDurationEnds(a: string, b: string): number {
  if (isDurationPresent(a) && isDurationPresent(b)) return 0;
  if (isDurationPresent(a)) return 1;
  if (isDurationPresent(b)) return -1;
  const pa = parseMonthYearKey(a);
  const pb = parseMonthYearKey(b);
  if (!pa && !pb) return 0;
  if (!pa) return -1;
  if (!pb) return 1;
  return pa.year - pb.year || pa.month - pb.month;
}

export function formatMonthYear(point: ExperienceMonthYear): string {
  const label = PROFILE_EXPERIENCE_MONTH_LABELS[point.month - 1] ?? String(point.month);
  return `${label} ${point.year}`;
}

export function formatDurationEndLabel(end: string, presentLabel = 'Present'): string {
  if (isDurationPresent(end)) return presentLabel;
  const point = parseMonthYearKey(end);
  return point ? formatMonthYear(point) : '';
}

/**
 * From only → empty (incomplete until end is set; callers usually default end to Present).
 * From + Present → "May 2002 – Present".
 * From + To → "May 2002 – June 2023".
 * Same start/end concrete month → "May 2002".
 */
export function formatDurationRange(
  start: string,
  end: string,
  presentLabel = 'Present',
): string {
  const from = normalizeDurationStart(start);
  const to = normalizeDurationEnd(end);
  if (!from) return '';
  const fromPoint = parseMonthYearKey(from);
  if (!fromPoint) return '';
  if (!to) return formatMonthYear(fromPoint);
  if (isDurationPresent(to)) return `${formatMonthYear(fromPoint)} – ${presentLabel}`;
  const toPoint = parseMonthYearKey(to);
  if (!toPoint) return formatMonthYear(fromPoint);
  if (from === to) return formatMonthYear(fromPoint);
  // Ensure chronological display even if ends were swapped in storage.
  if (compareDurationEnds(from, to) > 0) {
    return `${formatMonthYear(toPoint)} – ${formatMonthYear(fromPoint)}`;
  }
  return `${formatMonthYear(fromPoint)} – ${formatMonthYear(toPoint)}`;
}

/**
 * Legacy multi-point durationKeys → start/end.
 * One point → start that month, end Present.
 * Two+ → min start, max end.
 */
export function durationFromLegacyKeys(keys: unknown): {
  durationStart: string;
  durationEnd: string;
} {
  if (!Array.isArray(keys)) return { durationStart: '', durationEnd: '' };
  const points = keys
    .filter((item): item is string => typeof item === 'string')
    .map((item) => {
      if (isDurationPresent(item)) return DURATION_PRESENT;
      return normalizeDurationStart(item);
    })
    .filter(Boolean);
  const concrete = points
    .filter((item) => !isDurationPresent(item))
    .map((item) => parseMonthYearKey(item))
    .filter((item): item is ExperienceMonthYear => item != null)
    .sort((a, b) => a.year - b.year || a.month - b.month);
  const hasPresent = points.some((item) => isDurationPresent(item));
  if (concrete.length === 0) return { durationStart: '', durationEnd: '' };
  const start = monthYearKey(concrete[0].year, concrete[0].month);
  if (hasPresent || concrete.length === 1) {
    return { durationStart: start, durationEnd: DURATION_PRESENT };
  }
  const last = concrete[concrete.length - 1];
  return {
    durationStart: start,
    durationEnd: monthYearKey(last.year, last.month),
  };
}

export function experienceDurationComplete(entry: {
  durationStart?: string;
  durationEnd?: string;
}): boolean {
  const start = normalizeDurationStart(entry.durationStart);
  const end = normalizeDurationEnd(entry.durationEnd);
  if (!start || !end) return false;
  if (isDurationPresent(end)) return true;
  return compareDurationEnds(start, end) <= 0;
}

export function experienceEntryComplete(entry: {
  areas: string[];
  positions: string[];
  companies: string[];
  durationStart?: string;
  durationEnd?: string;
  /** @deprecated legacy */
  durationKeys?: string[];
}): boolean {
  const duration =
    entry.durationStart || entry.durationEnd
      ? { durationStart: entry.durationStart ?? '', durationEnd: entry.durationEnd ?? '' }
      : durationFromLegacyKeys(entry.durationKeys);
  return (
    normalizeNameList(entry.areas).length > 0 &&
    normalizeNameList(entry.positions).length > 0 &&
    normalizeNameList(entry.companies).length > 0 &&
    experienceDurationComplete(duration)
  );
}

/** One line for a committed experience (no trailing period). */
export function formatExperienceLine(
  entry: {
    areas: string[];
    positions: string[];
    companies: string[];
    durationStart?: string;
    durationEnd?: string;
    durationKeys?: string[];
  },
  presentLabel = 'Present',
): string {
  const areas = formatEnglishList(normalizeNameList(entry.areas));
  const positions = formatEnglishList(normalizeNameList(entry.positions));
  const duration =
    entry.durationStart || entry.durationEnd
      ? { durationStart: entry.durationStart ?? '', durationEnd: entry.durationEnd ?? '' }
      : durationFromLegacyKeys(entry.durationKeys);
  const durationText = formatDurationRange(
    duration.durationStart,
    duration.durationEnd,
    presentLabel,
  );
  const companies = formatEnglishList(normalizeNameList(entry.companies));
  if (!areas || !positions || !durationText || !companies) return '';
  return `${areas} at the position of ${positions} for the duration of ${durationText} with ${companies}`;
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
    durationStart: '',
    // To defaults to Present so the sentence shows “from – Present” before From is chosen.
    durationEnd: DURATION_PRESENT,
  };
}

export function serializeExperienceEntries(entries: ExperienceEntry[]): string {
  return JSON.stringify(
    entries.map((entry) => ({
      id: entry.id,
      areas: normalizeNameList(entry.areas),
      positions: normalizeNameList(entry.positions),
      companies: normalizeNameList(entry.companies),
      durationStart: normalizeDurationStart(entry.durationStart),
      durationEnd: normalizeDurationEnd(entry.durationEnd),
    })),
  );
}

function readDurationFields(row: Record<string, unknown>): {
  durationStart: string;
  durationEnd: string;
} {
  if (typeof row.durationStart === 'string' || typeof row.duration_start === 'string') {
    const start = normalizeDurationStart(
      (typeof row.durationStart === 'string' ? row.durationStart : row.duration_start) as string,
    );
    const endRaw =
      typeof row.durationEnd === 'string'
        ? row.durationEnd
        : typeof row.duration_end === 'string'
          ? row.duration_end
          : '';
    const end = normalizeDurationEnd(endRaw || (start ? DURATION_PRESENT : ''));
    return { durationStart: start, durationEnd: end };
  }
  return durationFromLegacyKeys(row.durationKeys ?? row.duration_keys);
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
    const { durationStart, durationEnd } = readDurationFields(row);
    const id =
      typeof row.id === 'string' && row.id.trim()
        ? row.id
        : newExperienceDraftId();
    if (
      !experienceEntryComplete({
        areas,
        positions,
        companies,
        durationStart,
        durationEnd,
      })
    ) {
      continue;
    }
    result.push({ id, areas, positions, companies, durationStart, durationEnd });
  }
  return result;
}
