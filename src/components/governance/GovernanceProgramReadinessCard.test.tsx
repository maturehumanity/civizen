import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GovernanceProgramReadinessCard } from '@/components/governance/GovernanceProgramReadinessCard';
import type { ActivationThresholdReviewRow } from '@/lib/governance-activation-review';

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const sampleReview = {
  id: 'review-1',
  scope_type: 'world',
  country_code: '',
  jurisdiction_label: 'World',
  status: 'pending_review',
  threshold_percent: 50,
  target_population: 8_000_000_000,
  eligible_verified_citizens_count: 42,
  verified_citizens_count: 50,
  metadata: {},
  updated_at: '2026-07-30T12:00:00.000Z',
  declaration_notes: null,
  declared_at: null,
  declared_by: null,
  opened_at: '2026-01-01T00:00:00.000Z',
  opened_by: null,
  reviewed_at: null,
  reviewed_by: null,
  review_notes: null,
  created_at: '2026-01-01T00:00:00.000Z',
} as ActivationThresholdReviewRow;

describe('GovernanceProgramReadinessCard admin output', () => {
  it('renders without activation terminology or target population', () => {
    const { container } = render(
      <GovernanceProgramReadinessCard
        reviews={[sampleReview]}
        latestEvidenceByReviewId={{}}
        latestDecisionByReviewId={{}}
        loading={false}
        backendUnavailable={false}
        recordingDecisionReviewId={null}
        formatTimestamp={(value) => value ?? 'n/a'}
        onRecordDecision={() => {}}
      />,
    );

    const text = container.textContent?.toLowerCase() ?? '';
    expect(text).toContain('program readiness');
    expect(text).not.toMatch(/activation/);
    expect(text).not.toMatch(/target population/);
    expect(text).not.toMatch(/demographic/);
    expect(container.querySelector('#stewardship-program-readiness')).not.toBeNull();
  });
});
