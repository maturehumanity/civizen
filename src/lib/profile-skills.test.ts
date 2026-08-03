import {
  countDeclaredSkills,
  filterProfileSkills,
  formatEnglishList,
  isKnownSoftSkill,
  normalizeSkillNames,
  partitionLegacySkillNames,
  resolveSkillKind,
} from '@/lib/profile-skills';
import { getSkillDescription } from '@/lib/profile-skill-descriptions';

describe('formatEnglishList', () => {
  it('formats zero, one, two, and many items', () => {
    expect(formatEnglishList([])).toBe('');
    expect(formatEnglishList(['JavaScript'])).toBe('JavaScript');
    expect(formatEnglishList(['JavaScript', 'React'])).toBe('JavaScript and React');
    expect(formatEnglishList(['JavaScript', 'React', 'Python'])).toBe(
      'JavaScript, React, and Python',
    );
  });
});

describe('partitionLegacySkillNames', () => {
  it('routes known soft skills and defaults unknown to hard', () => {
    expect(partitionLegacySkillNames(['JavaScript', 'Leadership', 'Custom Tool'])).toEqual({
      hard: ['JavaScript', 'Custom Tool'],
      soft: ['Leadership'],
    });
    expect(isKnownSoftSkill('Mentoring')).toBe(true);
  });
});

describe('filterProfileSkills', () => {
  it('filters by kind and prefers selected skills', () => {
    const result = filterProfileSkills('java', 'hard', ['React', 'JavaScript'], ['Leadership']);
    expect(result[0]).toBe('JavaScript');
    expect(result.every((name) => name.toLowerCase().includes('java'))).toBe(true);
  });

  it('surfaces driving and pilot specialty skills from search', () => {
    const driving = filterProfileSkills('driving', 'hard');
    expect(driving.some((name) => /driving \(car/i.test(name))).toBe(true);
    expect(driving.some((name) => /cdl/i.test(name))).toBe(true);
    expect(driving.some((name) => /bus driving/i.test(name))).toBe(true);

    const pilot = filterProfileSkills('pilot', 'hard');
    expect(pilot.some((name) => /airplane, private/i.test(name))).toBe(true);
    expect(pilot.some((name) => /helicopter/i.test(name))).toBe(true);
    expect(pilot.some((name) => /drone/i.test(name))).toBe(true);
  });

  it('surfaces AI skills for short AI query without false substring hits', () => {
    const hard = filterProfileSkills('AI', 'hard');
    expect(hard).toEqual(expect.arrayContaining(['Artificial intelligence (AI)', 'Prompt engineering', 'Machine learning']));
    expect(hard).not.toContain('Email marketing');
    expect(hard.some((name) => name.startsWith('Air'))).toBe(false);
    expect(filterProfileSkills('AI', 'soft')).toContain('AI literacy');
  });

  it('matches skills by description text', () => {
    const result = filterProfileSkills('shared goals', 'soft');
    expect(result).toContain('Collaboration');
  });
});

describe('countDeclaredSkills', () => {
  it('counts unique hard and soft names', () => {
    expect(countDeclaredSkills(['JavaScript', 'React'], ['Leadership'])).toBe(3);
    expect(countDeclaredSkills(normalizeSkillNames(['A', 'a']), [])).toBe(1);
  });
});

describe('getSkillDescription', () => {
  it('returns plain-language descriptions for catalog skills', () => {
    expect(getSkillDescription('Collaboration')).toMatch(/shared goals/i);
    expect(getSkillDescription('Driving (car / light vehicle)')).toMatch(/vehicle|safely/i);
  });
});

describe('resolveSkillKind', () => {
  it('routes known soft skills and defaults unknown to hard', () => {
    expect(resolveSkillKind('Leadership')).toBe('soft');
    expect(resolveSkillKind('JavaScript')).toBe('hard');
    expect(resolveSkillKind('Custom Widget Craft')).toBe('hard');
  });
});
