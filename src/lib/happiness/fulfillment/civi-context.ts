import { DOMAIN_LABEL_KEYS } from '@/lib/happiness/domains';
import type { HappinessAction } from '@/lib/happiness/types';
import type { FulfillmentPlan, FulfillmentPlanFactor } from './types';

export type FulfillmentCiviBrief = {
  text: string;
  memberText: string;
  inventedActions: boolean;
  diagnoses: boolean;
};

const DIAGNOSTIC = /\b(you need to|the solution is|i know why|diagnos(?:e|is) (?:depression|anxiety)|you have depression)\b/i;

export function buildFulfillmentCiviBrief(input: {
  plan: FulfillmentPlan;
  factors: FulfillmentPlanFactor[];
  actions: Pick<HappinessAction, 'title' | 'dismissed'>[];
  helpedNotes?: string[];
  domainLabel?: string;
}): FulfillmentCiviBrief {
  const domain = input.domainLabel ?? DOMAIN_LABEL_KEYS[input.plan.domainKey];
  const confirmed = input.factors.filter((row) => row.certaintyType === 'member_confirmed').map((row) => row.factorKey);
  const observed = input.factors.filter((row) => row.certaintyType === 'observed_pattern').map((row) => row.factorKey);
  const hypotheses = input.factors.filter((row) => row.certaintyType === 'hypothesis').map((row) => row.factorKey);
  const actionTitles = input.actions.filter((row) => !row.dismissed).map((row) => row.title);
  const lines = [
    `Fulfillment Plan (member-owned, private). Domain: ${domain}.`,
    'What you said:',
    input.plan.desiredOutcome ? `Better would look like: ${input.plan.desiredOutcome}` : 'You have not described what better would look like yet.',
    confirmed.length ? `Confirmed factors: ${confirmed.join(', ')}.` : 'You have not confirmed contributing factors yet.',
    'What Civizen observed:',
    observed.length ? `Recorded patterns (not confirmed causes): ${observed.join(', ')}.` : 'No observed patterns are recorded for this plan.',
    'Suggestions (not facts):',
    hypotheses.length ? `Possible factors to explore: ${hypotheses.join(', ')}.` : 'No hypothetical factors are recorded.',
    actionTitles.length ? `Recorded actions: ${actionTitles.join('; ')}.` : 'No actions have been recorded on this plan yet. Do not invent prior actions.',
    input.helpedNotes?.length ? `You previously said this helped: ${input.helpedNotes.join('; ')}.` : null,
  ].filter(Boolean) as string[];
  const memberText = lines.join('\n');
  const text = `${memberText}\nDo not diagnose. Do not invent causes. Do not treat suggestions as facts. Do not claim a Happiness Level is mental-health status.`;
  return {
    text,
    memberText,
    inventedActions: false,
    diagnoses: DIAGNOSTIC.test(text),
  };
}

export function civiMustNotInventActions(brief: FulfillmentCiviBrief, knownTitles: string[]): boolean {
  if (knownTitles.length === 0) return !/recorded actions:/i.test(brief.text);
  return knownTitles.every((title) => brief.text.includes(title));
}
