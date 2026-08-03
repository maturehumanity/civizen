export type EducationInstitutionSeed = {
  name: string;
  countryCode?: string;
  regionCode?: string;
  city?: string;
};

/** Curated seed list for institution combobox suggestions (not exhaustive). */
export const EDUCATION_INSTITUTION_SEEDS: EducationInstitutionSeed[] = [
  { name: 'Harvard University', countryCode: 'US', regionCode: 'MA', city: 'Cambridge' },
  { name: 'Massachusetts Institute of Technology', countryCode: 'US', regionCode: 'MA', city: 'Cambridge' },
  { name: 'Stanford University', countryCode: 'US', regionCode: 'CA', city: 'Stanford' },
  { name: 'University of California, Berkeley', countryCode: 'US', regionCode: 'CA', city: 'Berkeley' },
  { name: 'University of California, Los Angeles', countryCode: 'US', regionCode: 'CA', city: 'Los Angeles' },
  { name: 'Yale University', countryCode: 'US', regionCode: 'CT', city: 'New Haven' },
  { name: 'Columbia University', countryCode: 'US', regionCode: 'NY', city: 'New York' },
  { name: 'University of Oxford', countryCode: 'GB', regionCode: 'ENG', city: 'Oxford' },
  { name: 'University of Cambridge', countryCode: 'GB', regionCode: 'ENG', city: 'Cambridge' },
  { name: 'Imperial College London', countryCode: 'GB', regionCode: 'ENG', city: 'London' },
  { name: 'ETH Zurich', countryCode: 'CH', city: 'Zurich' },
  { name: 'University of Toronto', countryCode: 'CA', regionCode: 'ON', city: 'Toronto' },
  { name: 'McGill University', countryCode: 'CA', regionCode: 'QC', city: 'Montreal' },
  { name: 'University of Melbourne', countryCode: 'AU', regionCode: 'VIC', city: 'Melbourne' },
  { name: 'National University of Singapore', countryCode: 'SG', city: 'Singapore' },
  { name: 'University of Tokyo', countryCode: 'JP', city: 'Tokyo' },
  { name: 'Sorbonne University', countryCode: 'FR', city: 'Paris' },
  { name: 'Technical University of Munich', countryCode: 'DE', regionCode: 'BY', city: 'Munich' },
  { name: 'American University of Armenia', countryCode: 'AM', city: 'Yerevan' },
  { name: 'Yerevan State University', countryCode: 'AM', city: 'Yerevan' },
  { name: 'Russian-Armenian University', countryCode: 'AM', city: 'Yerevan' },
];

export const EDUCATION_LEVELS = [
  'middle_school',
  'high_school',
  'associate',
  'bachelor',
  'master',
  'doctorate',
  'certificate',
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const DEFAULT_EDUCATION_LEVEL: EducationLevel = 'middle_school';

/** Ordinal rank for comparing attainment (higher = more advanced). */
export const EDUCATION_LEVEL_RANK: Record<EducationLevel, number> = {
  middle_school: 1,
  high_school: 2,
  certificate: 3,
  associate: 4,
  bachelor: 5,
  master: 6,
  doctorate: 7,
};

/**
 * Preliminary Learning base from highest attainment (before verification / breadth).
 * Vocational certificates are scored above high school so formal university is not
 * the only path to a meaningful Learning score.
 */
export const EDUCATION_LEVEL_BASE_SCORE: Record<EducationLevel, number> = {
  middle_school: 12,
  high_school: 22,
  certificate: 32,
  associate: 42,
  bachelor: 55,
  master: 68,
  doctorate: 78,
};

const KNOWN_EDUCATION_LEVELS = new Set<string>(EDUCATION_LEVELS);

/**
 * Map stored degree labels (built-in keys or custom free text) onto a canonical level.
 * Recognizes specialist / 5-year diploma programs as master’s-equivalent.
 */
export function normalizeEducationLevel(raw: string | null | undefined): EducationLevel {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return DEFAULT_EDUCATION_LEVEL;

  const key = trimmed.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  const compact = key.replace(/\s/g, '');

  if (KNOWN_EDUCATION_LEVELS.has(trimmed)) return trimmed as EducationLevel;
  if (KNOWN_EDUCATION_LEVELS.has(key.replace(/\s/g, '_'))) {
    return key.replace(/\s/g, '_') as EducationLevel;
  }

  if (/\b(ph\.?\s*d|doctorate|doctoral|dphil|edd|md)\b/.test(key) || compact.includes('phd')) {
    return 'doctorate';
  }

  // Soviet / Armenian / European specialist diplomas (typically 5 years) ≈ master’s.
  if (
    (/\b(5\s*year|five\s*year)\b/.test(key) && /\b(diploma|degree|specialist)\b/.test(key)) ||
    /\bspecialist\s+degree\b/.test(key) ||
    /\bdiplom\b/.test(key) && /\b(specialist|magister)\b/.test(key)
  ) {
    return 'master';
  }

  if (
    /\b(master|masters|mba|magister|mphil|msc|ma)\b/.test(key) ||
    compact.startsWith('master')
  ) {
    return 'master';
  }

  if (
    /\b(bachelor|baccalaureate|undergraduate|bsc|ba|bs)\b/.test(key) ||
    compact.startsWith('bachelor')
  ) {
    return 'bachelor';
  }

  if (/\b(associate|aa|as)\b/.test(key) || compact.startsWith('associate')) {
    return 'associate';
  }

  if (/\b(high\s*school|secondary|ged|lycee|lycée)\b/.test(key)) {
    return 'high_school';
  }

  if (/\b(middle\s*school|junior\s*high|primary)\b/.test(key)) {
    return 'middle_school';
  }

  if (/\b(certificate|certification|license|licence|diploma|vocational|trade|bootcamp)\b/.test(key)) {
    return 'certificate';
  }

  // Unknown custom labels: treat as certificate-level, not middle school.
  return 'certificate';
}

export function highestEducationLevel(
  levels: Array<string | null | undefined>,
): EducationLevel | null {
  let best: EducationLevel | null = null;
  for (const raw of levels) {
    if (raw == null || String(raw).trim() === '') continue;
    const level = normalizeEducationLevel(raw);
    if (!best || EDUCATION_LEVEL_RANK[level] > EDUCATION_LEVEL_RANK[best]) {
      best = level;
    }
  }
  return best;
}

/** Broad fields / departments for the Education sentence picker. */
export const EDUCATION_DEPARTMENT_SEEDS = [
  'Economics',
  'Business Administration',
  'Computer Science',
  'Information Technology',
  'Engineering',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Medicine',
  'Nursing',
  'Public Health',
  'Law',
  'Education',
  'Psychology',
  'Sociology',
  'Political Science',
  'International Relations',
  'History',
  'Philosophy',
  'Languages',
  'Communications',
  'Journalism',
  'Fine Arts',
  'Music',
  'Design',
  'Architecture',
  'Agriculture',
  'Environmental Science',
  'Hospitality',
  'Human Resources',
  'Workforce Development',
] as const;

/** Specializations / majors for the Education sentence picker. */
export const EDUCATION_SPECIALIZATION_SEEDS = [
  'Finance and Banking',
  'Finance',
  'Accounting',
  'Marketing',
  'Software Engineering',
  'Data Science',
  'Artificial Intelligence',
  'Cybersecurity',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Macroeconomics',
  'Microeconomics',
  'Development Economics',
  'Corporate Finance',
  'Investment Management',
  'Public Policy',
  'Clinical Psychology',
  'Organizational Psychology',
  'International Law',
  'Constitutional Law',
  'Primary Education',
  'Secondary Education',
  'Curriculum and Instruction',
  'Graphic Design',
  'Industrial Design',
  'Film and Media',
  'Creative Writing',
  'Applied Mathematics',
  'Statistics',
  'Biotechnology',
] as const;

/** @deprecated Use EDUCATION_SPECIALIZATION_SEEDS */
export const EDUCATION_MAJOR_SEEDS = EDUCATION_SPECIALIZATION_SEEDS;

export function filterEducationInstitutions(
  query: string,
  options: {
    countryCode?: string;
    regionCode?: string;
    city?: string;
    extraNames?: string[];
  } = {},
): string[] {
  const q = query.trim().toLowerCase();
  const country = options.countryCode?.trim().toUpperCase();
  const region = options.regionCode?.trim().toUpperCase();
  const city = options.city?.trim().toLowerCase();

  const fromSeed = EDUCATION_INSTITUTION_SEEDS.filter((item) => {
    if (country && item.countryCode && item.countryCode.toUpperCase() !== country) return false;
    if (region && item.regionCode && item.regionCode.toUpperCase() !== region) return false;
    if (city && item.city && item.city.toLowerCase() !== city) return false;
    if (q && !item.name.toLowerCase().includes(q)) return false;
    return true;
  }).map((item) => item.name);

  const fromExtra = (options.extraNames ?? []).filter((name) => {
    if (!name.trim()) return false;
    if (q && !name.toLowerCase().includes(q)) return false;
    return true;
  });

  return Array.from(new Set([...fromExtra, ...fromSeed])).sort((a, b) => a.localeCompare(b));
}

function filterNamedSeeds(
  seeds: readonly string[],
  query: string,
  extraNames: string[] = [],
): string[] {
  const q = query.trim().toLowerCase();
  const fromSeed = seeds.filter((name) => !q || name.toLowerCase().includes(q));
  const fromExtra = extraNames.filter((name) => {
    if (!name.trim()) return false;
    if (q && !name.toLowerCase().includes(q)) return false;
    return true;
  });
  return Array.from(new Set([...fromExtra, ...fromSeed])).sort((a, b) => a.localeCompare(b));
}

export function filterEducationDepartments(query: string, extraNames: string[] = []): string[] {
  return filterNamedSeeds(EDUCATION_DEPARTMENT_SEEDS, query, extraNames);
}

export function filterEducationSpecializations(query: string, extraNames: string[] = []): string[] {
  return filterNamedSeeds(EDUCATION_SPECIALIZATION_SEEDS, query, extraNames);
}

/** @deprecated Use filterEducationSpecializations */
export function filterEducationMajors(query: string, extraNames: string[] = []): string[] {
  return filterEducationSpecializations(query, extraNames);
}
