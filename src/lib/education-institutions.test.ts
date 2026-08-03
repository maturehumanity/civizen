import { describe, expect, it } from 'vitest';

import {
  EDUCATION_LEVEL_BASE_SCORE,
  highestEducationLevel,
  normalizeEducationLevel,
} from '@/lib/education-institutions';

describe('normalizeEducationLevel', () => {
  it('keeps built-in keys', () => {
    expect(normalizeEducationLevel('master')).toBe('master');
    expect(normalizeEducationLevel('bachelor')).toBe('bachelor');
    expect(normalizeEducationLevel('certificate')).toBe('certificate');
  });

  it('maps 5-year diploma / specialist programs to master', () => {
    expect(normalizeEducationLevel('5-Year Diploma Degree')).toBe('master');
    expect(normalizeEducationLevel('Five-year specialist degree')).toBe('master');
    expect(normalizeEducationLevel('Specialist Degree')).toBe('master');
  });

  it('maps common degree phrases', () => {
    expect(normalizeEducationLevel('Ph.D.')).toBe('doctorate');
    expect(normalizeEducationLevel('MBA')).toBe('master');
    expect(normalizeEducationLevel('Bachelor of Science')).toBe('bachelor');
    expect(normalizeEducationLevel('High School Diploma')).toBe('high_school');
    expect(normalizeEducationLevel('Professional Certificate')).toBe('certificate');
  });

  it('picks the highest attainment across entries', () => {
    expect(highestEducationLevel(['high_school', '5-Year Diploma Degree', 'certificate'])).toBe(
      'master',
    );
    expect(EDUCATION_LEVEL_BASE_SCORE.master).toBe(68);
  });
});
