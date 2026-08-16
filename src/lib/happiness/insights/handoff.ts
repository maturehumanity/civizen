import { snapshotHasPrivateLeak } from '@/lib/happiness/aggregate/engine';
import type { SystemicIssueCandidate, WellbeingAggregateResult } from '@/lib/happiness/aggregate/types';
import { INSIGHTS_COPY } from './copy';
import type { PresentedDomainInsight, WellbeingHandoff } from './types';

const FORBIDDEN = /member-|privateNote|profile_id|checkIns|workJoy|desiredOutcome|Site B/i;

export function wellbeingHandoffFromPattern(input: {
  candidate: SystemicIssueCandidate;
  insight?: PresentedDomainInsight | null;
  result?: WellbeingAggregateResult | null;
}): WellbeingHandoff {
  const summary = input.insight?.summary ?? input.candidate.summary;
  const handoff: WellbeingHandoff = {
    source: 'wellbeing_insights',
    title: `${input.candidate.domain.replace(/_/g, ' ')} pattern`.replace(/\b\w/g, (letter) => letter.toUpperCase()),
    problemStatement: `${summary}\n\n${INSIGHTS_COPY.noCausation}`,
    whyItMatters: INSIGHTS_COPY.evidenceNote,
    evidenceLinks: `Aggregate snapshot reference (${input.candidate.privacyPolicyVersion}, ${input.candidate.patternModelVersion}). Qualifying periods: ${input.candidate.evidencePeriods}.`,
    contextDetail: `${INSIGHTS_COPY.privacyHint} ${INSIGHTS_COPY.draftOnly}`,
    successCriteria: 'Further investigation using privacy-protected group insights and non-Happiness evidence.',
    autoPublish: false,
  };
  if (FORBIDDEN.test(JSON.stringify(handoff))) {
    throw new Error('wellbeing handoff must not include private member material');
  }
  if (input.result && snapshotHasPrivateLeak(input.result, [])) {
    throw new Error('wellbeing handoff source leaked private fields');
  }
  return handoff;
}

export const WELLBEING_HANDOFF_STORAGE_KEY = 'civizen-wellbeing-handoff';

export function storeWellbeingHandoff(handoff: WellbeingHandoff): void {
  sessionStorage.setItem(WELLBEING_HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
}

export function takeWellbeingHandoff(): WellbeingHandoff | null {
  const raw = sessionStorage.getItem(WELLBEING_HANDOFF_STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(WELLBEING_HANDOFF_STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as WellbeingHandoff;
    if (parsed.source !== 'wellbeing_insights' || parsed.autoPublish !== false) return null;
    if (FORBIDDEN.test(JSON.stringify(parsed))) return null;
    return parsed;
  } catch {
    return null;
  }
}
