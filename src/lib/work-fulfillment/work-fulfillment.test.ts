import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { deriveHappinessView } from '@/lib/happiness/model';
import { wellbeingFieldsForbiddenInOpportunityMatching } from '@/lib/happiness/integrations';
import { partitionAssessmentDimensions } from '@/lib/work-fulfillment/assessment';
import { diagnoseWorkSources, occupationMayFitWhileTasksNeedWork, suggestedLadderStep } from '@/lib/work-fulfillment/diagnosis';
import { demoWorkAssessment, demoWorkJoyHistory } from '@/lib/work-fulfillment/demo';
import { suggestAdjacentRoles } from '@/lib/work-fulfillment/explorations';
import { deriveWorkJoyPatterns, workJoyHasSufficientHistory, WORK_JOY_PATTERN_MIN_ENTRIES, WORK_JOY_PATTERN_MODEL } from '@/lib/work-fulfillment/joy-patterns';
import { joyEntriesForContext, latestAssessmentForContext, primaryWorkContext } from '@/lib/work-fulfillment/scope';
import { firstWorkInterventionStep, mustNotAutoRecommendCareerChange, WORK_INTERVENTION_LADDER } from '@/lib/work-fulfillment/ladder';
import { fitOpportunity } from '@/lib/work-fulfillment/opportunity-fit';
import { suggestWorkImprovements, workSuggestionMustNotBeQuitJob } from '@/lib/work-fulfillment/recommendations';
import { privateWorkFieldsForbiddenInOpportunityMatching, opportunityPayloadMustOmitPrivateWork } from '@/lib/work-fulfillment/shareable';
import { WORK_FULFILLMENT_PHASE, WORK_JOY_FEELINGS, WORK_TYPES, emptyShareablePreferences } from '@/lib/work-fulfillment/types';
import type { ContributionOpportunity } from '@/lib/opportunities';

function listing(overrides: Partial<ContributionOpportunity> = {}): ContributionOpportunity {
  return {
    id: 'opp-1',
    publisherProfileId: 'pub-1',
    title: 'Mentoring cohort facilitator',
    summary: 'Help people learn by teaching and mentoring.',
    description: 'Remote teaching and mentoring.',
    status: 'open',
    opportunityKind: 'education_to_contribution',
    areaNodeId: null,
    requiredSkills: ['Communication'],
    optionalSkills: [],
    locationText: null,
    isRemote: true,
    estimatedEffort: null,
    applicationDeadline: null,
    workStartsAt: null,
    workEndsAt: null,
    compensationStatus: 'learning',
    expectedOutcome: null,
    evidenceRequirements: null,
    evaluationCriteria: null,
    evaluationDimensions: [],
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    ...overrides,
  };
}

describe('work fulfillment phase 2 model', () => {
  it('keeps five Work Joy observation states and no public numeric score', () => {
    expect(WORK_JOY_FEELINGS).toEqual(['draining', 'mostly_unpleasant', 'neutral', 'enjoyable', 'energizing']);
    expect(WORK_FULFILLMENT_PHASE).toBe(2);
    const json = JSON.stringify(demoWorkAssessment());
    expect(json).not.toMatch(/work fulfillment score|0\s*\/\s*100/i);
  });

  it('requires enough history before showing task patterns', () => {
    const few = demoWorkJoyHistory().slice(0, 2);
    expect(workJoyHasSufficientHistory(few)).toBe(false);
    expect(deriveWorkJoyPatterns(few)).toEqual([]);
    expect(demoWorkJoyHistory().length).toBeGreaterThanOrEqual(WORK_JOY_PATTERN_MIN_ENTRIES);
    const patterns = deriveWorkJoyPatterns(demoWorkJoyHistory());
    expect(patterns.some((pattern) => pattern.tag === 'teaching' && pattern.kind === 'fulfilling' && pattern.phraseKey === 'recentSuggestsHigher')).toBe(true);
    expect(patterns.some((pattern) => pattern.tag === 'routine_administration' && pattern.kind === 'draining' && pattern.phraseKey === 'worthExploring')).toBe(true);
    expect(WORK_JOY_PATTERN_MODEL).toBe('work-joy-pattern-v1');
  });

  it('keeps pattern thresholds centralized and does not conclude from one event', () => {
    const joySource = readFileSync('src/lib/work-fulfillment/joy-patterns.ts', 'utf8');
    const ui = readFileSync('src/pages/happiness/HappinessWorkJoy.tsx', 'utf8');
    expect(joySource).toMatch(/WORK_JOY_PATTERN_MIN_ENTRIES = 5/);
    expect(joySource).toMatch(/WORK_JOY_PATTERN_MODEL = 'work-joy-pattern-v1'/);
    expect(ui).not.toMatch(/MIN_ENTRIES\s*=/);
    expect(ui).toMatch(/workJoyHasSufficientHistory/);
    expect(deriveWorkJoyPatterns(demoWorkJoyHistory().slice(0, 1))).toEqual([]);
  });

  it('does not mix Work Joy patterns across unrelated work contexts', () => {
    const employed = demoWorkJoyHistory().map((entry) => ({ ...entry, id: `a-${entry.id}`, workContextId: 'employed' }));
    const volunteer = Array.from({ length: 5 }, (_, index) => ({
      ...employed[0]!,
      id: `b-${index}`,
      workContextId: 'volunteer',
      feeling: 'draining' as const,
      activity: 'admin',
      activityTags: ['routine_administration'],
    }));
    const mixed = [...employed, ...volunteer];
    const employedPatterns = deriveWorkJoyPatterns(joyEntriesForContext(mixed, 'employed'));
    const volunteerPatterns = deriveWorkJoyPatterns(joyEntriesForContext(mixed, 'volunteer'));
    expect(employedPatterns.some((pattern) => pattern.tag === 'teaching' && pattern.kind === 'fulfilling')).toBe(true);
    expect(volunteerPatterns.some((pattern) => pattern.tag === 'routine_administration' && pattern.kind === 'draining')).toBe(true);
    expect(volunteerPatterns.some((pattern) => pattern.tag === 'teaching')).toBe(false);
  });

  it('treats caregiver, volunteer, founder, and between-roles as ordinary work types', () => {
    expect(WORK_TYPES).toEqual(expect.arrayContaining(['caregiver', 'volunteer', 'founder', 'between_roles', 'self_employed']));
    const contexts = [
      { id: 'v', isPrimary: false, status: 'current' as const },
      { id: 'e', isPrimary: true, status: 'current' as const },
    ];
    expect(primaryWorkContext(contexts as never)?.id).toBe('e');
    expect(latestAssessmentForContext([demoWorkAssessment()], 'other')).toBeNull();
    expect(latestAssessmentForContext([demoWorkAssessment()], 'demo-context')?.id).toBe('demo-assessment');
  });

  it('diagnoses task mix and autonomy before occupation mismatch', () => {
    const hypotheses = diagnoseWorkSources({
      assessment: demoWorkAssessment(),
      joyEntries: demoWorkJoyHistory(),
    });
    expect(occupationMayFitWhileTasksNeedWork(hypotheses)).toBe(true);
    expect(hypotheses.map((item) => item.id)).toEqual(expect.arrayContaining(['task_mix_mismatch', 'insufficient_autonomy']));
    expect(hypotheses.map((item) => item.id)).not.toContain('occupation_mismatch');
    expect(suggestedLadderStep(hypotheses)).toBe('redesign_tasks');
    expect(mustNotAutoRecommendCareerChange()).toBe(true);
    expect(firstWorkInterventionStep()).toBe('understand');
    expect(WORK_INTERVENTION_LADDER).toHaveLength(10);
  });

  it('distinguishes team/leadership context from environment-only mismatch', () => {
    const assessment = demoWorkAssessment();
    assessment.dimensions.environment_social = 'struggling';
    assessment.dimensions.recognition_fairness = 'struggling';
    const hypotheses = diagnoseWorkSources({ assessment, joyEntries: [] });
    expect(hypotheses.map((item) => item.id)).toContain('team_management');
    expect(hypotheses.map((item) => item.id)).not.toContain('work_environment_mismatch');
  });

  it('improves current work first and persists not-relevant filtering', () => {
    const hypotheses = diagnoseWorkSources({
      assessment: demoWorkAssessment(),
      joyEntries: demoWorkJoyHistory(),
    });
    const suggestions = suggestWorkImprovements({ hypotheses });
    expect(workSuggestionMustNotBeQuitJob(suggestions)).toBe(true);
    expect(suggestions[0]?.id).not.toBe('explore-adjacent');
    const hidden = suggestWorkImprovements({ hypotheses, hiddenIds: [suggestions[0]!.id] });
    expect(hidden.some((item) => item.id === suggestions[0]?.id)).toBe(false);
  });

  it('partitions assessment without exposing a score', () => {
    const { goingWell, needsAttention } = partitionAssessmentDimensions(demoWorkAssessment());
    expect(goingWell).toEqual(expect.arrayContaining(['meaning_purpose', 'strength_utilization']));
    expect(needsAttention).toEqual(expect.arrayContaining(['task_enjoyment', 'autonomy']));
  });

  it('explains adjacent roles cautiously and links Contribute/Study', () => {
    const roles = suggestAdjacentRoles({
      patterns: deriveWorkJoyPatterns(demoWorkJoyHistory()),
      profile: null,
    });
    const teaching = roles.find((role) => role.id === 'learning_facilitator');
    expect(teaching?.contributePath).toBe('/contribute');
    expect(teaching?.studyPath).toBe('/study');
    expect(teaching?.why.join(' ')).toMatch(/enjoyment/i);
    expect(teaching?.explore.join(' ')).toMatch(/skills and contributions/i);
    expect(JSON.stringify(roles)).not.toMatch(/true calling|you should quit/i);
  });

  it('matches opportunities without private wellbeing fields', () => {
    expect(privateWorkFieldsForbiddenInOpportunityMatching()).toContain('work_joy_entries');
    expect(wellbeingFieldsForbiddenInOpportunityMatching()).toContain('work_joy_entries');
    const shareable = {
      ...emptyShareablePreferences('p1'),
      approved: true,
      activitiesSought: ['mentoring', 'teaching'],
      locationMode: 'remote' as const,
    };
    const fit = fitOpportunity(listing(), shareable, ['Communication']);
    expect(fit.alignment).toBe('strong_alignment');
    expect(opportunityPayloadMustOmitPrivateWork({ title: 'x' })).toEqual([]);
    expect(() =>
      fitOpportunity(listing({ title: 'x' } as ContributionOpportunity), shareable),
    ).not.toThrow();
    expect(() =>
      opportunityPayloadMustOmitPrivateWork({ work_joy_entries: [] }),
    ).not.toEqual([]);
    expect(opportunityPayloadMustOmitPrivateWork({ work_joy_entries: [] })).toContain('work_joy_entries');
  });

  it('does not let one Work Joy entry move overall Happiness', () => {
    const before = deriveHappinessView({ checkIns: [], pulses: [], reviews: [], now: new Date('2026-08-15T12:00:00Z') });
    const after = deriveHappinessView({
      checkIns: [],
      pulses: [],
      reviews: [],
      now: new Date('2026-08-15T12:00:00Z'),
      workAssessments: [],
    });
    expect(before.view.overallLevel).toBeNull();
    expect(after.view.overallLevel).toBeNull();
    const withAssessment = deriveHappinessView({
      checkIns: [],
      pulses: [],
      reviews: [],
      now: new Date('2026-08-15T12:00:00Z'),
      workAssessments: [{ dimensions: demoWorkAssessment().dimensions, createdAt: '2026-08-15T12:00:00Z' }],
    });
    expect(withAssessment.view.domainLevels.work_fulfillment).toBeTruthy();
    expect(JSON.stringify(withAssessment.view)).not.toMatch(/overallInternal|Happiness Score/i);
  });
});

describe('work fulfillment owner-only schema', () => {
  it('applies happiness_owns_profile to Phase 2 tables', () => {
    const sql = readFileSync('supabase/migrations/20260815150000_work_fulfillment_phase2.sql', 'utf8');
    for (const table of [
      'work_contexts',
      'work_assessments',
      'work_shareable_preferences',
      'work_recommendation_feedback',
      'work_interventions',
      'work_explorations',
      'work_trial_links',
      'work_transition_paths',
      'work_transition_followups',
    ]) {
      expect(sql).toContain(table);
    }
    expect(sql).toMatch(/happiness_owns_profile/);
    expect(sql).toMatch(/REVOKE ALL ON public\.%I FROM anon/);
    expect(sql).not.toMatch(/manager dashboard/);
  });

  it('adds a versionable intervention status without dropping owner-only tables', () => {
    const sql = readFileSync('supabase/migrations/20260815161000_work_intervention_status.sql', 'utf8');
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS status/);
    expect(sql).toMatch(/planned.*in_progress.*completed.*dismissed/s);
    expect(sql).not.toMatch(/DROP TABLE/i);
  });
});
