import type { ContributionOpportunity } from '@/lib/opportunities';

import { canUsePreferencesForOpportunityMatching, opportunityPayloadMustOmitPrivateWork } from './shareable';
import type { WorkFitAlignment, WorkShareablePreferences } from './types';

export type OpportunityFitResult = {
  opportunityId: string;
  alignment: WorkFitAlignment;
  why: string[];
  explore: string[];
};

function haystack(opportunity: ContributionOpportunity): string {
  return [opportunity.title, opportunity.summary, opportunity.description, ...(opportunity.requiredSkills ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function alignmentForScore(score: number): WorkFitAlignment {
  if (score >= 4) return 'strong_alignment';
  if (score >= 2) return 'some_alignment';
  if (score >= 1) return 'worth_exploring';
  return 'limited_alignment';
}

/**
 * Conservative client-side fit. Never send Work Joy, diagnosis, or notes to publishers.
 */
export function fitOpportunity(
  opportunity: ContributionOpportunity,
  shareable: WorkShareablePreferences,
  skills: string[] = [],
): OpportunityFitResult {
  const leaked = opportunityPayloadMustOmitPrivateWork(opportunity as unknown as Record<string, unknown>);
  if (leaked.length) {
    throw new Error(`Private Work Fulfillment fields must not enter opportunity matching: ${leaked.join(', ')}`);
  }

  const text = haystack(opportunity);
  const why: string[] = [];
  const explore: string[] = [];
  let score = 0;

  if (!canUsePreferencesForOpportunityMatching(shareable.approved)) {
    return {
      opportunityId: opportunity.id,
      alignment: 'worth_exploring',
      why: ['Matching uses only skills and public listing details until you approve shareable work preferences.'],
      explore: [],
    };
  }

  for (const activity of shareable.activitiesSought) {
    if (activity && text.includes(activity.toLowerCase())) {
      score += 2;
      why.push(`This listing mentions ${activity}, which you marked as a preferred activity.`);
    }
  }

  for (const role of shareable.roleTypesSought) {
    if (role && text.includes(role.toLowerCase())) {
      score += 1;
      why.push(`The role type is close to ${role}.`);
    }
  }

  const skillHits = skills.filter((skill) =>
    opportunity.requiredSkills.some((required) => required.toLowerCase() === skill.toLowerCase()),
  );
  if (skillHits.length) {
    score += skillHits.length;
    why.push(`Your profile already lists ${skillHits.slice(0, 3).join(', ')}.`);
  } else if (opportunity.requiredSkills.length) {
    explore.push('You may still need to demonstrate some of the listed skills.');
  }

  if (shareable.locationMode === 'remote' && opportunity.isRemote) {
    score += 1;
    why.push('The listing is remote, matching your location preference.');
  } else if (shareable.locationMode === 'onsite' && !opportunity.isRemote && opportunity.locationText) {
    explore.push('This listing may require being on-site.');
  }

  if (!why.length) explore.push('Alignment is limited from the details available. Treat this as something to look at, not a match score.');

  return {
    opportunityId: opportunity.id,
    alignment: alignmentForScore(score),
    why: why.slice(0, 4),
    explore: explore.slice(0, 3),
  };
}
