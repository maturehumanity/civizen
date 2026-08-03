import {
  DURATION_PRESENT,
  cumulativeExperienceMonths,
  durationFromLegacyKeys,
  durationMonthsForEntry,
  experienceEntryComplete,
  filterExperienceOptions,
  formatDurationRange,
  formatExperienceLine,
  monthYearKey,
  normalizeDurationEnd,
  normalizeDurationStart,
  normalizeNameList,
  parseExperienceEntries,
  parseMonthYearKey,
  PROFILE_EXPERIENCE_AREA_SEEDS,
} from '@/lib/profile-experience';

describe('formatDurationRange', () => {
  it('formats from → Present', () => {
    expect(formatDurationRange('2021-05', DURATION_PRESENT)).toBe('May 2021 – Present');
  });

  it('formats from → to range', () => {
    expect(formatDurationRange('2021-05', '2023-06')).toBe('May 2021 – June 2023');
  });

  it('formats identical start and end as a single month', () => {
    expect(formatDurationRange('2021-05', '2021-05')).toBe('May 2021');
  });

  it('returns empty without a start', () => {
    expect(formatDurationRange('', DURATION_PRESENT)).toBe('');
    expect(formatDurationRange('nope', DURATION_PRESENT)).toBe('');
  });
});

describe('durationFromLegacyKeys', () => {
  it('maps a single point to start + Present', () => {
    expect(durationFromLegacyKeys(['2021-05'])).toEqual({
      durationStart: '2021-05',
      durationEnd: DURATION_PRESENT,
    });
  });

  it('maps multiple points to min–max', () => {
    expect(durationFromLegacyKeys(['2023-06', '2021-05', '2022-01'])).toEqual({
      durationStart: '2021-05',
      durationEnd: '2023-06',
    });
  });
});

describe('experienceEntryComplete', () => {
  it('requires areas, positions, duration, and companies', () => {
    expect(
      experienceEntryComplete({
        areas: ['Professional work'],
        positions: ['Engineer'],
        companies: ['Google'],
        durationStart: '2021-05',
        durationEnd: DURATION_PRESENT,
      }),
    ).toBe(true);
    expect(
      experienceEntryComplete({
        areas: ['Professional work'],
        positions: [],
        companies: ['Google'],
        durationStart: '2021-05',
        durationEnd: DURATION_PRESENT,
      }),
    ).toBe(false);
  });
});

describe('formatExperienceLine', () => {
  it('builds the experience clause with Present', () => {
    expect(
      formatExperienceLine({
        areas: ['Professional work', 'Leadership'],
        positions: ['Engineer'],
        companies: ['Google'],
        durationStart: '2021-05',
        durationEnd: DURATION_PRESENT,
      }),
    ).toBe(
      'Professional work and Leadership at the position of Engineer for the duration of May 2021 – Present with Google',
    );
  });
});

describe('normalize helpers', () => {
  it('normalizes start/end and names', () => {
    expect(normalizeNameList([' Google ', 'google', 'Apple'])).toEqual(['Google', 'Apple']);
    expect(normalizeDurationStart('2021-05')).toBe('2021-05');
    expect(normalizeDurationEnd('present')).toBe(DURATION_PRESENT);
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
  it('accepts start/end rows and migrates legacy durationKeys', () => {
    const parsed = parseExperienceEntries([
      {
        id: 'a',
        areas: ['Professional work'],
        positions: ['Engineer'],
        companies: ['Google'],
        durationStart: '2021-05',
        durationEnd: DURATION_PRESENT,
      },
      {
        id: 'legacy',
        areas: ['Leadership'],
        positions: ['Manager'],
        companies: ['Apple'],
        durationKeys: ['2020-01'],
      },
      {
        id: 'b',
        areas: ['Leadership'],
        positions: [],
        companies: ['Apple'],
        durationStart: '2020-01',
        durationEnd: DURATION_PRESENT,
      },
    ]);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe('a');
    expect(parsed[1]).toMatchObject({
      id: 'legacy',
      durationStart: '2020-01',
      durationEnd: DURATION_PRESENT,
    });
  });
});

describe('experience duration months', () => {
  it('counts inclusive months for a closed range', () => {
    expect(
      durationMonthsForEntry({ durationStart: '2020-01', durationEnd: '2020-06' }),
    ).toBe(6);
  });

  it('unions overlapping intervals for cumulative months', () => {
    const asOf = new Date(2024, 5, 1); // June 2024
    const months = cumulativeExperienceMonths(
      [
        { durationStart: '2020-01', durationEnd: '2022-12' },
        { durationStart: '2022-06', durationEnd: '2023-06' },
      ],
      asOf,
    );
    // Jan 2020 – Jun 2023 inclusive = 42 months (overlap not double-counted)
    expect(months).toBe(42);
  });

  it('treats Present as asOf month', () => {
    const asOf = new Date(2025, 7, 1); // August 2025
    expect(
      durationMonthsForEntry(
        { durationStart: '2025-01', durationEnd: DURATION_PRESENT },
        asOf,
      ),
    ).toBe(8);
  });
});
