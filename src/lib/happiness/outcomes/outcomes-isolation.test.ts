import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SOURCES = [
  'src/lib/happiness/outcomes/api.ts',
  'src/lib/happiness/outcomes/compare.ts',
  'src/lib/happiness/outcomes/civi.ts',
  'src/pages/wellbeing/HumanOutcomeReview.tsx',
  'src/pages/wellbeing/HumanOutcomeLinks.tsx',
];

const PRIVATE = /happiness_checkins|fulfillment_plans|work_joy_entries|happiness_assessment|collect_wellbeing_structured_signals|generateWellbeingAggregateSnapshot/;

describe('human outcome isolation', () => {
  it('consumes snapshots only and never private Happiness tables', () => {
    for (const file of SOURCES) {
      expect(readFileSync(file, 'utf8')).not.toMatch(PRIVATE);
    }
    const sql = readFileSync('supabase/migrations/20260815250000_human_outcome_reviews_phase5.sql', 'utf8');
    expect(sql).not.toMatch(/FROM public\.happiness_checkins/);
    expect(sql).not.toMatch(/FROM public\.fulfillment_plans/);
    expect(sql).not.toMatch(/FROM public\.work_joy_entries/);
    expect(sql).toMatch(/wellbeing_aggregate_can_view_scope/);
    expect(sql).toMatch(/Sequence is not causality/);
    expect(sql).not.toMatch(/SECURITY DEFINER/);
  });

  it('keeps Score, Jobs, Profile, Home, and Search free of private outcome evidence', () => {
    const files = [
      'src/pages/Home.tsx',
      'src/pages/Profile.tsx',
      'src/lib/civizen-score.ts',
      'src/lib/civizen-score-model.ts',
      'src/lib/search-contents.ts',
      'src/components/market/MarketJobsInterestForm.tsx',
      'src/lib/happiness/fulfillment/jobs-bridge.ts',
    ];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(/human_outcome_review_evidence|listScopeSnapshotRecords|compareHumanOutcomeEvidence/);
    }
    expect(readFileSync('src/lib/search-contents.ts', 'utf8')).not.toMatch(/wellbeing_aggregate_snapshots/);
  });
});
