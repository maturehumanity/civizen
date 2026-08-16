import type { HappinessDomainId, HappinessLevel } from '@/lib/happiness/types';
import type { EligibleObservation } from './types';

const LEVELS: HappinessLevel[] = ['struggling', 'unsettled', 'balanced', 'flourishing', 'thriving'];

export function syntheticObservations(input: {
  participating: number;
  relevant: number;
  inScope?: number;
  domain?: HappinessDomainId;
  levels?: HappinessLevel[];
  factorCategory?: string;
  interventionType?: string;
  helped?: EligibleObservation['helped'];
  withdrawn?: number;
  privateNote?: string;
}): EligibleObservation[] {
  const inScope = input.inScope ?? Math.max(input.participating, input.relevant);
  const rows: EligibleObservation[] = [];
  for (let i = 0; i < inScope; i += 1) {
    const participating = i < input.participating && i >= (input.withdrawn ?? 0);
    const inPeriod = i < input.relevant;
    rows.push({
      memberKey: `member-${i}`,
      participating,
      inScope: true,
      inPeriod,
      domain: input.domain ?? 'time_life_balance',
      level: (input.levels ?? LEVELS)[i % (input.levels ?? LEVELS).length],
      factorCategory: input.factorCategory,
      interventionType: input.interventionType,
      helped: input.helped,
      privateNote: input.privateNote,
    });
  }
  return rows;
}

export function tinyCellObservations(count = 30): EligibleObservation[] {
  return Array.from({ length: count }, (_, i) => ({
    memberKey: `member-${i}`,
    participating: true,
    inScope: true,
    inPeriod: true,
    domain: 'time_life_balance' as const,
    level: (i < 26 ? 'flourishing' : i < 28 ? 'balanced' : i === 28 ? 'struggling' : 'thriving') as HappinessLevel,
    privateNote: i === 0 ? 'I am exhausted after night shifts at Site B' : undefined,
  }));
}

export const DEMO_SCOPE = {
  id: 'scope-org-1',
  kind: 'organization' as const,
  enabled: true,
  viewerProfileIds: ['viewer-1'],
  label: 'Demo organization',
};

export const DEMO_QUERY = {
  scopeId: 'scope-org-1',
  topic: 'domain_state' as const,
  timeBucket: 'quarter' as const,
  periodStart: '2026-04-01',
  domain: 'time_life_balance' as const,
};

export const DEMO_REQUESTER = {
  profileId: 'viewer-1',
  canViewScope: true,
};
