import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const INSIGHT_SOURCES = [
  'src/lib/happiness/insights/api.ts',
  'src/lib/happiness/insights/present.ts',
  'src/lib/happiness/insights/handoff.ts',
  'src/lib/happiness/insights/civi.ts',
  'src/pages/wellbeing/WellbeingInsights.tsx',
];

const PRIVATE = /happiness_checkins|fulfillment_plans|work_joy_entries|happiness_assessment|generateWellbeingAggregateSnapshot|collect_wellbeing_structured_signals/;

describe('wellbeing insights isolation', () => {
  it('does not read private Happiness tables or privileged generation from the insight surface', () => {
    for (const file of INSIGHT_SOURCES) {
      expect(readFileSync(file, 'utf8')).not.toMatch(PRIVATE);
    }
    const sql = readFileSync('supabase/migrations/20260815230000_wellbeing_insights_phase4b.sql', 'utf8');
    expect(sql).not.toMatch(/FROM public\.happiness_checkins/);
    expect(sql).not.toMatch(/FROM public\.fulfillment_plans/);
    expect(sql).not.toMatch(/FROM public\.work_joy_entries/);
    expect(sql).toMatch(/wellbeing_aggregate_can_view_scope/);
    expect(readFileSync('supabase/migrations/20260815240000_wellbeing_aggregate_can_view_scope_definer.sql', 'utf8')).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/No automatic Challenge/);
  });

  it('keeps Profile, Score, Jobs, Home, and Search free of insight actions and snapshots', () => {
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
      expect(source).not.toMatch(/recordInsightAction|wellbeing_insight_actions|listScopeSnapshots|WellbeingInsights/);
    }
  });
});
