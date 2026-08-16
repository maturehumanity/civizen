import { describe, expect, it } from 'vitest';

import { deriveHappinessView } from '@/lib/happiness/model';
import { HAPPINESS_LEVEL_BOUNDS, levelFromInternal, overallLevelPhraseKey } from '@/lib/happiness/levels';
import { selectWeeklyPulseDomains } from '@/lib/happiness/domains';
import { HAPPINESS_DOMAINS, HAPPINESS_LEVELS, type HappinessCheckIn, type HappinessMonthlyReview } from '@/lib/happiness/types';
import { canShowGroupWellbeing, HAPPINESS_PROHIBITED_USES } from '@/lib/happiness/privacy';
import { recommendForArea } from '@/lib/happiness/recommendations';
import { wellbeingFieldsForbiddenInOpportunityMatching } from '@/lib/happiness/integrations';
import { firstWorkInterventionStep, mustNotAutoRecommendCareerChange, WORK_INTERVENTION_LADDER } from '@/lib/work-fulfillment/ladder';

function checkIn(overrides: Partial<HappinessCheckIn> & { feeling: HappinessCheckIn['feeling']; createdAt: string }): HappinessCheckIn {
  return {
    id: overrides.id ?? 'c1',
    profileId: 'p1',
    affectingMost: overrides.affectingMost ?? null,
    areas: overrides.areas ?? [],
    note: null,
    ...overrides,
  };
}

describe('happiness five-level model', () => {
  it('maps internal values to five public levels and never uses identity phrasing', () => {
    expect(levelFromInternal(HAPPINESS_LEVEL_BOUNDS.struggling.max)).toBe('struggling');
    expect(levelFromInternal(HAPPINESS_LEVEL_BOUNDS.unsettled.min)).toBe('unsettled');
    expect(levelFromInternal(50)).toBe('balanced');
    expect(levelFromInternal(70)).toBe('flourishing');
    expect(levelFromInternal(90)).toBe('thriving');
    for (const level of HAPPINESS_LEVELS) {
      expect(overallLevelPhraseKey(level)).toContain('levelPhrase');
      expect(overallLevelPhraseKey(level)).not.toMatch(/You are/);
    }
  });

  it('keeps distressed domains visible and caps overall when two areas are Struggling', () => {
    const now = new Date('2026-08-15T12:00:00Z');
    const review: HappinessMonthlyReview = {
      id: 'r1',
      profileId: 'p1',
      monthStart: '2026-08-01',
      wantsHelp: false,
      helpAreas: [],
      createdAt: '2026-08-14T12:00:00Z',
      domainAnswers: {
        life_satisfaction: 'flourishing',
        emotional_wellbeing: 'flourishing',
        meaning_purpose: 'flourishing',
        relationships_belonging: 'thriving',
        health_vitality: 'flourishing',
        autonomy_freedom: 'flourishing',
        security_stability: 'balanced',
        time_life_balance: 'struggling',
        environment_community: 'flourishing',
        work_fulfillment: 'struggling',
      },
    };
    const { view, internal } = deriveHappinessView({
      checkIns: [],
      pulses: [],
      reviews: [review],
      now,
    });
    expect(view.modelVersion).toBe('happiness-level-v1');
    expect(view.attentionDomains).toEqual(expect.arrayContaining(['work_fulfillment', 'time_life_balance']));
    expect(view.overallLevel === 'balanced' || view.overallLevel === 'flourishing').toBe(true);
    expect(view.overallLevel).not.toBe('thriving');
    expect(internal.overallInternal).not.toBeNull();
    expect(JSON.stringify(view)).not.toMatch(/overallInternal|happiness score|Happiness Score/i);
  });

  it('rotates weekly pulse domains toward stale coverage including all ten over time', () => {
    const first = selectWeeklyPulseDomains({});
    expect(first).toHaveLength(4);
    const second = selectWeeklyPulseDomains(
      Object.fromEntries(first.map((domain) => [domain, '2026-08-15'])) as Partial<Record<(typeof HAPPINESS_DOMAINS)[number], string>>,
    );
    expect(second.some((domain) => !first.includes(domain))).toBe(true);
  });
});

describe('happiness privacy and score isolation', () => {
  it('hides group wellbeing below the cohort floor and lists prohibited uses', () => {
    expect(canShowGroupWellbeing(8)).toBe(false);
    expect(canShowGroupWellbeing(25)).toBe(true);
    expect(HAPPINESS_PROHIBITED_USES).toContain('civizen_score');
    expect(HAPPINESS_PROHIBITED_USES).toContain('employment_ranking');
    expect(wellbeingFieldsForbiddenInOpportunityMatching()).toContain('overallLevel');
  });
});

describe('work fulfillment phase 2 preparation', () => {
  it('starts the intervention ladder at understand, not career change', () => {
    expect(firstWorkInterventionStep()).toBe('understand');
    expect(WORK_INTERVENTION_LADDER).toHaveLength(10);
    expect(mustNotAutoRecommendCareerChange()).toBe(true);
    const recs = recommendForArea({ domain: 'work_fulfillment' });
    expect(recs[0]?.relatedPath).toBe('/happiness/work');
  });
});

describe('check-in mapping', () => {
  it('turns a very difficult check-in into Struggling without exposing a number', () => {
    const { view } = deriveHappinessView({
      checkIns: [
        checkIn({ feeling: 'very_difficult', affectingMost: 'work', createdAt: '2026-08-15T10:00:00Z' }),
        checkIn({ id: 'c2', feeling: 'very_difficult', createdAt: '2026-08-14T10:00:00Z' }),
      ],
      pulses: [],
      reviews: [],
      now: new Date('2026-08-15T12:00:00Z'),
    });
    expect(view.overallLevel).toBe('struggling');
    expect(view.latestCheckIn?.feeling).toBe('very_difficult');
    expect(Object.keys(view)).not.toContain('score');
  });

  it('does not treat a supporting area as distress when today feels difficult', () => {
    const { view } = deriveHappinessView({
      checkIns: [
        checkIn({
          feeling: 'very_difficult',
          affectingMost: 'work',
          areas: [{ category: 'work', polarity: 'support' }],
          createdAt: '2026-08-15T10:00:00Z',
        }),
      ],
      pulses: [],
      reviews: [],
      now: new Date('2026-08-15T12:00:00Z'),
    });
    expect(view.domainLevels.emotional_wellbeing).toBe('struggling');
    expect(view.domainLevels.work_fulfillment).not.toBe('struggling');
  });

  it('does not copy today’s good feeling onto a work problem', () => {
    const { view } = deriveHappinessView({
      checkIns: [
        checkIn({
          feeling: 'good',
          affectingMost: 'work',
          areas: [{ category: 'work', polarity: 'problem' }],
          createdAt: '2026-08-15T10:00:00Z',
        }),
      ],
      pulses: [],
      reviews: [],
      now: new Date('2026-08-15T12:00:00Z'),
    });
    expect(view.latestCheckIn?.feeling).toBe('good');
    expect(view.domainLevels.emotional_wellbeing).toBe('flourishing');
    expect(view.domainLevels.work_fulfillment).not.toBe('flourishing');
    expect(view.domainLevels.work_fulfillment).not.toBe('thriving');
  });
});
