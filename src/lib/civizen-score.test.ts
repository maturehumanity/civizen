import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SCORE_WEIGHTS,
  SCORE_CATEGORY_ORDER,
  SCORE_TEST_PROFILES,
  buildScoreFromProfileActivity,
  calculateCivizenScoreModel,
  computeWeightedOverall,
  diminishingQuantityScore,
  formatScoreOutOf100,
  formatScoreValue,
} from '@/lib/civizen-score';

describe('civizen score model', () => {
  it('keeps five categories with configurable default weights totaling 100%', () => {
    expect(SCORE_CATEGORY_ORDER).toEqual([
      'learning',
      'skills',
      'performance',
      'contributions',
      'experience',
    ]);
    const total = Object.values(DEFAULT_SCORE_WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('Profile A: new user is not scored with building stage and insufficient confidence', () => {
    const result = calculateCivizenScoreModel(SCORE_TEST_PROFILES.A_newUser());
    expect(result.overall.score).toBeNull();
    expect(formatScoreOutOf100(result.overall.score)).toBe('Not yet scored');
    expect(result.overall.stage).toBe('building');
    expect(result.overall.confidence).toBe('insufficient');
    expect(result.categories.every((c) => c.score === null)).toBe(true);
    expect(result.validation.endorsementCount).toBe(0);
  });

  it('Profile B: education-heavy leaves Performance and Contributions unscored (not zero)', () => {
    const result = calculateCivizenScoreModel(SCORE_TEST_PROFILES.B_educationHeavy());
    const byId = Object.fromEntries(result.categories.map((c) => [c.id, c]));
    expect(byId.learning.score).toBe(82);
    expect(byId.performance.score).toBeNull();
    expect(byId.contributions.score).toBeNull();
    expect(result.explanation.excludedCategories).toEqual(
      expect.arrayContaining(['performance', 'contributions']),
    );
    expect(result.overall.score).not.toBeNull();
    // Missing categories must not drag the overall down as zeros.
    const onlyScored = computeWeightedOverall({
      learning: 82,
      experience: 55,
      skills: 48,
      performance: null,
      contributions: null,
    });
    expect(result.overall.score).toBe(onlyScored.overall);
    expect(result.overall.score).toBeGreaterThan(50);
  });

  it('Profile C: active contributor has complete circle, high confidence, and history', () => {
    const result = calculateCivizenScoreModel(SCORE_TEST_PROFILES.C_activeContributor());
    expect(result.categories.every((c) => c.score != null)).toBe(true);
    expect(result.overall.score).not.toBeNull();
    expect(['high', 'very_high']).toContain(result.overall.confidence);
    expect(result.overall.stage).toMatch(/established/);
    expect(result.history.length).toBeGreaterThan(0);
    expect(result.validation.verifiedEvidenceCount).toBeGreaterThan(20);
  });

  it('Profile D: unverified experience stays low confidence with verification recommendations', () => {
    const result = calculateCivizenScoreModel(SCORE_TEST_PROFILES.D_unverifiedExperience());
    expect(result.overall.score).not.toBeNull();
    expect(result.overall.confidence).toBe('low');
    expect(result.nextSteps.some((s) => /verif|confirm|evidence/i.test(s.label))).toBe(true);
  });

  it('Profile E: high acceptance alone does not create a high Performance score', () => {
    const result = calculateCivizenScoreModel(SCORE_TEST_PROFILES.E_reliabilityProblem());
    const performance = result.categories.find((c) => c.id === 'performance')!;
    expect(performance.score).toBeLessThan(50);
    const engagement = performance.metrics.find((m) => m.id === 'engagement')!;
    const reliability = performance.metrics.find((m) => m.id === 'reliability')!;
    expect(engagement.value).toBeGreaterThan(80);
    expect(reliability.value).toBeLessThan(40);
    expect(performance.score).toBeLessThan(engagement.value!);
  });

  it('Profile F: high quantity with low impact uses diminishing returns', () => {
    const rawQuantity = diminishingQuantityScore(40, 12, 70);
    expect(rawQuantity).toBeLessThan(70);
    const result = calculateCivizenScoreModel(SCORE_TEST_PROFILES.F_highQuantityLowImpact());
    const contributions = result.categories.find((c) => c.id === 'contributions')!;
    expect(contributions.score).toBeLessThan(rawQuantity);
    expect(contributions.score).toBeLessThan(50);
    expect(contributions.confidence).toBe('low');
  });

  it('formats null scores without displaying 0.0', () => {
    expect(formatScoreValue(null)).toBe('—');
    expect(formatScoreValue(0)).toBe('0.0');
    expect(formatScoreOutOf100(null)).toBe('Not yet scored');
  });

  it('builds a preliminary Skills score from declared skill count', () => {
    const result = buildScoreFromProfileActivity({ skillCount: 1 });
    const skills = result.categories.find((c) => c.id === 'skills')!;
    expect(skills.score).toBeCloseTo(diminishingQuantityScore(1, 8, 55), 5);
    expect(skills.confidence).toBe('low');
    expect(skills.sourceCount).toBe(1);
  });

  it('scores Experience primarily from cumulative months, not entry count', () => {
    const shortHops = buildScoreFromProfileActivity({
      experienceCount: 3,
      experienceMonths: 18, // 3 × 6 months
    });
    const longerRoles = buildScoreFromProfileActivity({
      experienceCount: 2,
      experienceMonths: 72, // 2 × 3 years
    });
    const shortScore = shortHops.categories.find((c) => c.id === 'experience')!.score!;
    const longScore = longerRoles.categories.find((c) => c.id === 'experience')!.score!;
    expect(longScore).toBeGreaterThan(shortScore);

    const singleLong = buildScoreFromProfileActivity({
      experienceCount: 1,
      experienceMonths: 12 * 23,
    });
    const singleScore = singleLong.categories.find((c) => c.id === 'experience')!.score!;
    expect(singleScore).toBeGreaterThan(40);
    expect(singleScore).toBeCloseTo(diminishingQuantityScore(23, 15, 72), 5);
  });
});
