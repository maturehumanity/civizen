import type { HappinessDomainId } from '@/lib/happiness/types';
import type { InsightProblemKind } from './types';

const COMMUNITY_FACTORS = new Set([
  'transportation',
  'commute',
  'housing',
  'public_safety',
  'environment',
  'access_to_services',
  'care_responsibilities',
]);

const INSTITUTIONAL_FACTORS = new Set([
  'workload',
  'schedule',
  'autonomy',
  'workplace_process',
  'program_structure',
  'recognition',
  'fairness',
  'growth',
]);

export function classifyProblemKind(input: {
  domain?: HappinessDomainId;
  factors?: string[];
  scopeKind?: string;
}): InsightProblemKind {
  const factors = (input.factors ?? []).map((value) => value.toLowerCase().replace(/\s+/g, '_'));
  if (factors.some((factor) => COMMUNITY_FACTORS.has(factor))) return 'community_system';
  if (factors.some((factor) => INSTITUTIONAL_FACTORS.has(factor))) return 'institutional_condition';
  if (input.domain === 'environment_community' && input.scopeKind === 'community') return 'community_system';
  if (input.domain === 'work_fulfillment' && input.scopeKind === 'organization') return 'institutional_condition';
  if (!factors.length) return 'unclear';
  return 'unclear';
}

export function factorLabel(factor: string): string {
  return factor
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
