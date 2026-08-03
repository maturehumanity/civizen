import {
  experienceEntryComplete,
  filterExperienceOptions,
  formatDurationRange,
  formatExperienceLine,
  monthYearKey,
  normalizeDurationKeys,
  normalizeNameList,
  parseExperienceEntries,
  parseMonthYearKey,
  PROFILE_EXPERIENCE_AREA_SEEDS,
} from '@/lib/profile-experience';

describe('formatDurationRange', () => {
  it('formats a single month-year', () => {
    expect(formatDurationRange(['2021-05'])).toBe('May 2021');
  });

  it('formats multiple selections as a min–max range', () => {
    expect(formatDurationRange(['2023-06', '2021-05', '2022-01'])).toBe(
      'May 2021 – June 2023',
    );
  });

  it('returns empty for invalid keys', () => {
    expect(formatDurationRange([])).toBe('');
    expect(formatDurationRange(['nope'])).toBe('');
  });
});

describe('experienceEntryComplete', () => {
  it('requires areas, positions, duration, and companies', () => {
    expect(
      experienceEntryComplete({
        areas: ['Professional work'],
        positions: ['Engineer'],
        companies: ['Google'],
        durationKeys: ['2021-05'],
      }),
    ).toBe(true);
    expect(
      experienceEntryComplete({
        areas: ['Professional work'],
        positions: [],
        companies: ['Google'],
        durationKeys: ['2021-05'],
      }),
    ).toBe(false);
  });
});

describe('formatExperienceLine', () => {
  it('builds the experience clause', () => {
    expect(
      formatExperienceLine({
        areas: ['Professional work', 'Leadership'],
        positions: ['Engineer'],
        companies: ['Google'],
        durationKeys: ['2021-05', '2023-06'],
      }),
    ).toBe(
      'Professional work and Leadership at the position of Engineer for the duration of May 2021 – June 2023 with Google',
    );
  });
});

describe('normalize helpers', () => {
  it('dedupes names and duration keys', () => {
    expect(normalizeNameList([' Google ', 'google', 'Apple'])).toEqual(['Google', 'Apple']);
    expect(normalizeDurationKeys(['2021-05', '2021-05', '2022-01'])).toEqual([
      '2021-05',
      '2022-01',
    ]);
    expect(monthYearKey(2021, 5)).toBe('2021-05');
    expect(parseMonthYearKey('2021-05')).toEqual({ year: 2021, month: 5 });
  });
});

describe('filterExperienceOptions', () => {
  it('prefers selected and matches query', () => {
    const result = filterExperienceOptions(
      'lead',
      PROFILE_EXPERIENCE_AREA_SEEDS,
      ['Leadership'],
    );
    expect(result[0]).toBe('Leadership');
  });
});

describe('parseExperienceEntries', () => {
  it('accepts complete rows and skips incomplete', () => {
    const parsed = parseExperienceEntries([
      {
        id: 'a',
        areas: ['Professional work'],
        positions: ['Engineer'],
        companies: ['Google'],
        durationKeys: ['2021-05'],
      },
      {
        id: 'b',
        areas: ['Leadership'],
        positions: [],
        companies: ['Apple'],
        durationKeys: ['2020-01'],
      },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('a');
  });
});
