import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { PRIVATE_FIELDS_FORBIDDEN_IN_JOBS } from '@/lib/happiness/fulfillment/jobs-bridge';
import { HAPPINESS_AGGREGATE_PARTICIPATION_DEFAULT, HAPPINESS_PROHIBITED_USES } from '@/lib/happiness/privacy';
import { mayUseAggregateOnSurface, WELLBEING_AGGREGATE_FORBIDDEN_SURFACES, WELLBEING_AGGREGATE_JOBS_FORBIDDEN } from './isolation';

describe('wellbeing aggregate cross-surface isolation', () => {
  it('forbids ranking, Score, Jobs, Profile, Search, Civi raw records, and governance coupling', () => {
    for (const surface of WELLBEING_AGGREGATE_FORBIDDEN_SURFACES) {
      expect(mayUseAggregateOnSurface(surface)).toBe(false);
    }
    expect(HAPPINESS_PROHIBITED_USES).toEqual(expect.arrayContaining(['civizen_score', 'employment_ranking', 'disciplinary_decisions']));
    expect(WELLBEING_AGGREGATE_JOBS_FORBIDDEN).toEqual(
      expect.arrayContaining(['employer_candidate_ranking', 'aggregate_participation_as_signal']),
    );
    expect(PRIVATE_FIELDS_FORBIDDEN_IN_JOBS).toEqual(expect.arrayContaining(['aggregateParticipation', 'wellbeingAggregate', 'workJoy']));
    expect(HAPPINESS_AGGREGATE_PARTICIPATION_DEFAULT).toBe(false);
  });

  it('keeps Score, Jobs matching, search, and Home free of aggregate wellbeing reads', () => {
    const files = [
      'src/lib/civizen-score.ts',
      'src/lib/civizen-score-model.ts',
      'src/lib/search-contents.ts',
      'src/pages/Home.tsx',
      'src/pages/Profile.tsx',
      'src/components/market/MarketJobsInterestForm.tsx',
    ];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/getWellbeingAggregate|wellbeing_aggregate_snapshots|aggregateParticipation|generateWellbeingAggregateSnapshot|collect_wellbeing_structured_signals/);
    }
  });

  it('keeps the SQL boundary from selecting private Happiness tables', () => {
    const sql = readFileSync('supabase/migrations/20260815200000_wellbeing_aggregate_phase4a.sql', 'utf8');
    expect(sql).toMatch(/get_wellbeing_aggregate/);
    expect(sql).toMatch(/must never SELECT happiness_checkins/);
    expect(sql).not.toMatch(/FROM public\.happiness_checkins/);
    expect(sql).not.toMatch(/FROM public\.fulfillment_plans/);
    expect(sql).not.toMatch(/FROM public\.work_joy_entries/);
    expect(sql).toMatch(/Must not contain member IDs/);
    expect(sql).toMatch(/Must not auto-create Community Challenges/);
    expect(readFileSync('src/pages/happiness/HappinessPrivacy.tsx', 'utf8')).not.toMatch(
      /generateWellbeingAggregateSnapshot|collect_wellbeing_structured_signals/,
    );
  });
});
