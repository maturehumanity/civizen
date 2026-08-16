import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { wellbeingFieldsForbiddenInOpportunityMatching } from '@/lib/happiness/integrations';
import { buildFulfillmentCiviBrief, civiMustNotInventActions } from '@/lib/happiness/fulfillment/civi-context';
import { recommendForPlan, shouldSuppressRecommendation } from '@/lib/happiness/fulfillment/engine';
import { jobsPrefillOmitsPrivateSource, marketJobsPrefillFromShareable, PRIVATE_FIELDS_FORBIDDEN_IN_JOBS } from '@/lib/happiness/fulfillment/jobs-bridge';
import { FULFILLMENT_INTERVENTIONS, supportOptionsForDomain } from '@/lib/happiness/fulfillment/library';
import { FULFILLMENT_PROHIBITED_SURFACES, mustNotDiagnoseHealth, mustNotExposeNumericJobFitScore, fulfillmentPlanMustStayPrivate } from '@/lib/happiness/fulfillment/privacy';
import { domainImprovedSincePlan, nextStepAfterOutcome, qualitativeStateFromSignals } from '@/lib/happiness/fulfillment/progress';
import { FULFILLMENT_PLAN_STATUSES } from '@/lib/happiness/fulfillment/types';
import { emptyShareablePreferences } from '@/lib/work-fulfillment/types';
import { parseWorkFitJobsQuery } from '@/lib/market-jobs-work-fit-prefill';

describe('fulfillment plans', () => {
  it('supports exploring through stopped without treating stop as failure', () => {
    expect(FULFILLMENT_PLAN_STATUSES).toEqual(['exploring', 'active', 'paused', 'completed', 'stopped']);
  });

  it('keeps factor certainty types distinct in recommendation why', () => {
    const recs = recommendForPlan({
      domain: 'time_life_balance',
      causeGroup: 'time',
      factorTags: ['overwork'],
      factorCertainty: { overwork: 'member_confirmed' },
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(3);
    expect(recs[0]?.why.some((item) => item.kind === 'member_confirmed' || item.kind === 'smallest_step')).toBe(true);
    expect(JSON.stringify(recs)).not.toMatch(/job fit score|67%|fulfillment score/i);
  });

  it('suppresses Not relevant recommendations', () => {
    const hidden = recommendForPlan({
      domain: 'time_life_balance',
      suppressedKeys: ['time-one-evening'],
      feedback: [{ interventionKey: 'time-one-evening', feedback: 'not_relevant' }],
    });
    expect(hidden.some((row) => row.key === 'time-one-evening')).toBe(false);
    expect(shouldSuppressRecommendation([{ interventionKey: 'time-one-evening', feedback: 'not_relevant' }], 'time-one-evening')).toBe(true);
  });

  it('does not permanently suppress Not now or Tried before', () => {
    const later = recommendForPlan({
      domain: 'time_life_balance',
      feedback: [
        { interventionKey: 'time-one-evening', feedback: 'not_now' },
        { interventionKey: 'time-commute-system', feedback: 'tried_before' },
      ],
    });
    expect(later.some((row) => row.key === 'time-one-evening')).toBe(true);
    expect(later.some((row) => row.key === 'time-commute-system')).toBe(true);
    expect(shouldSuppressRecommendation([{ interventionKey: 'time-one-evening', feedback: 'not_now' }], 'time-one-evening')).toBe(false);
  });

  it('hides Save for later from the default list but can include it when asked', () => {
    const hidden = recommendForPlan({
      domain: 'time_life_balance',
      feedback: [{ interventionKey: 'time-one-evening', feedback: 'saved_later' }],
    });
    expect(hidden.some((row) => row.key === 'time-one-evening')).toBe(false);
    const shown = recommendForPlan({
      domain: 'time_life_balance',
      feedback: [{ interventionKey: 'time-one-evening', feedback: 'saved_later' }],
      includeSavedLater: true,
    });
    expect(shown.some((row) => row.key === 'time-one-evening')).toBe(true);
  });

  it('does not blindly promote a previously unhelpful intervention', () => {
    const recs = recommendForPlan({
      domain: 'time_life_balance',
      previouslyUnhelpful: ['time-one-evening'],
    });
    expect(recs[0]?.key).not.toBe('time-one-evening');
  });

  it('boosts previously helpful interventions with cautious why copy', () => {
    const recs = recommendForPlan({
      domain: 'meaning_purpose',
      previouslyHelped: [{ interventionKey: 'purpose-contribute', helped: 'a_lot' }],
    });
    const boosted = recs.find((row) => row.key === 'purpose-contribute');
    expect(boosted?.why.some((item) => item.kind === 'previously_helped')).toBe(true);
  });

  it('delegates work domain to Work Fulfillment and can point employment to Jobs', () => {
    const recs = recommendForPlan({ domain: 'work_fulfillment', seekingEmployment: true });
    expect(recs[0]?.intervention.relatedPath).toBe('/happiness/work');
    expect(recs.some((row) => row.intervention.relatedPath === '/market?section=jobs')).toBe(true);
    expect(recs.find((row) => row.intervention.type === 'employment_jobs')?.why.some((item) => item.kind === 'jobs_not_contribute')).toBe(
      true,
    );
  });

  it('derives qualitative progress without a percent complete', () => {
    expect(qualitativeStateFromSignals({ planStatus: 'exploring', actionStatuses: [], helped: [] })).toBe('exploring');
    expect(qualitativeStateFromSignals({ planStatus: 'active', actionStatuses: ['in_progress'], helped: [] })).toBe('trying');
    expect(qualitativeStateFromSignals({ planStatus: 'active', actionStatuses: ['completed'], helped: ['a_lot'] })).toBe('seeing_improvement');
    expect(qualitativeStateFromSignals({ planStatus: 'paused', actionStatuses: [], helped: [] })).toBe('paused');
    expect(qualitativeStateFromSignals({ planStatus: 'stopped', actionStatuses: ['completed'], helped: ['a_lot'] })).toBe('stopped');
    expect(nextStepAfterOutcome('not_at_all')).toBe('try_something_else');
    expect(
      domainImprovedSincePlan({
        domain: 'time_life_balance',
        startedAt: '2026-08-01T00:00:00Z',
        snapshots: [
          { computedAt: '2026-07-01T00:00:00Z', domainLevels: { time_life_balance: 'unsettled' } },
          { computedAt: '2026-08-10T00:00:00Z', domainLevels: { time_life_balance: 'balanced' } },
        ],
      }),
    ).toBe(true);
  });

  it('offers Study from a non-work autonomy plan and a governance path for system issues', () => {
    const recs = recommendForPlan({ domain: 'autonomy_freedom' });
    expect(recs.some((row) => row.intervention.relatedPath === '/study')).toBe(true);
    expect(supportOptionsForDomain('time_life_balance').some((row) => row.path === '/governance/solutions')).toBe(true);
    expect(FULFILLMENT_INTERVENTIONS.some((row) => row.key === 'purpose-contribute' && row.relatedPath === '/contribute')).toBe(true);
  });
});

describe('marketplace jobs bridge', () => {
  it('carries only approved shareable preferences and omits private source data', () => {
    const prefs = emptyShareablePreferences('p1');
    prefs.approved = true;
    prefs.roleTypesSought = ['facilitation'];
    prefs.locationMode = 'remote';
    prefs.scheduleNote = 'evenings';
    const prefill = marketJobsPrefillFromShareable(prefs);
    expect(prefill.path).toContain('section=jobs');
    expect(prefill.path).toContain('from=work-fit');
    expect(prefill.jobTypes).toContain('facilitation');
    expect(jobsPrefillOmitsPrivateSource(prefill, { workJoy: 'manager conflict left me drained', diagnosis: 'poor leadership' })).toBe(true);
    expect(PRIVATE_FIELDS_FORBIDDEN_IN_JOBS).toContain('workJoy');
    expect(parseWorkFitJobsQuery(prefill.path.split('?')[1] ?? '')).toEqual({
      jobTypes: ['facilitation'],
      notes: expect.stringContaining('remote'),
    });
    expect(marketJobsPrefillFromShareable({ ...prefs, approved: false }).jobTypes).toEqual([]);
  });
});

describe('civi plan grounding', () => {
  it('summarizes member-confirmed factors and does not invent actions or diagnose', () => {
    const brief = buildFulfillmentCiviBrief({
      plan: {
        id: 'plan-1',
        profileId: 'p1',
        domainKey: 'time_life_balance',
        title: 'Time',
        concern: 'evenings',
        desiredOutcome: 'two free evenings',
        status: 'active',
        reminderPref: 'none',
        followUpAt: null,
        workInterventionId: null,
        createdAt: '2026-08-15T00:00:00Z',
        updatedAt: '2026-08-15T00:00:00Z',
        completedAt: null,
      },
      factors: [
        { id: 'f1', planId: 'plan-1', factorKey: 'overwork', certaintyType: 'member_confirmed', sourceType: 'member', note: null, createdAt: '' },
        { id: 'f2', planId: 'plan-1', factorKey: 'commute', certaintyType: 'hypothesis', sourceType: 'civi', note: null, createdAt: '' },
      ],
      actions: [],
    });
    expect(brief.text).toMatch(/What you said/);
    expect(brief.text).toMatch(/What Civizen observed/);
    expect(brief.text).toMatch(/Suggestions \(not facts\)/);
    expect(brief.text).toMatch(/Do not invent prior actions/);
    expect(brief.memberText).not.toMatch(/Do not diagnose/);
    expect(brief.text).toMatch(/Do not invent causes/);
    expect(brief.diagnoses).toBe(false);
    expect(civiMustNotInventActions(brief, [])).toBe(true);
    expect(mustNotDiagnoseHealth()).toBe(true);
  });
});

describe('privacy isolation', () => {
  it('keeps plans private and off Score', () => {
    expect(fulfillmentPlanMustStayPrivate()).toBe(true);
    expect(mustNotExposeNumericJobFitScore()).toBe(true);
    expect(wellbeingFieldsForbiddenInOpportunityMatching()).toEqual(expect.arrayContaining(['fulfillment_plans', 'work_joy_entries']));
    expect(FULFILLMENT_PROHIBITED_SURFACES).toEqual(expect.arrayContaining(['profile', 'score', 'search', 'marketplace_jobs', 'assistant_general_knowledge']));
    const api = readFileSync('src/lib/happiness/fulfillment/api.ts', 'utf8');
    expect(api).toMatch(/export async function deleteFulfillmentPlan/);
    expect(api).not.toMatch(/work_contexts|work_joy_entries|happiness_checkins/);
    const score = readFileSync('src/lib/civizen-score.ts', 'utf8');
    expect(score).not.toMatch(/fulfillment_plans|from ['"]@\/lib\/happiness\/fulfillment/);
  });

  it('keeps interventions in the library rather than page components', () => {
    expect(FULFILLMENT_INTERVENTIONS.length).toBeGreaterThan(8);
    const improve = readFileSync('src/pages/happiness/HappinessImprove.tsx', 'utf8');
    expect(improve).toMatch(/recommendForPlan/);
    expect(improve).not.toMatch(/Move somewhere else/);
  });
});
