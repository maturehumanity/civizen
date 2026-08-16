import {
  HAPPINESS_DOMAINS,
  type HappinessDomainId,
} from './types';

export const DOMAIN_LABEL_KEYS: Record<HappinessDomainId, string> = {
  life_satisfaction: 'happiness.domains.life_satisfaction',
  emotional_wellbeing: 'happiness.domains.emotional_wellbeing',
  meaning_purpose: 'happiness.domains.meaning_purpose',
  relationships_belonging: 'happiness.domains.relationships_belonging',
  health_vitality: 'happiness.domains.health_vitality',
  autonomy_freedom: 'happiness.domains.autonomy_freedom',
  security_stability: 'happiness.domains.security_stability',
  time_life_balance: 'happiness.domains.time_life_balance',
  environment_community: 'happiness.domains.environment_community',
  work_fulfillment: 'happiness.domains.work_fulfillment',
};

export const DOMAIN_SHORT_KEYS: Record<HappinessDomainId, string> = {
  life_satisfaction: 'happiness.domainsShort.life_satisfaction',
  emotional_wellbeing: 'happiness.domainsShort.emotional_wellbeing',
  meaning_purpose: 'happiness.domainsShort.meaning_purpose',
  relationships_belonging: 'happiness.domainsShort.relationships_belonging',
  health_vitality: 'happiness.domainsShort.health_vitality',
  autonomy_freedom: 'happiness.domainsShort.autonomy_freedom',
  security_stability: 'happiness.domainsShort.security_stability',
  time_life_balance: 'happiness.domainsShort.time_life_balance',
  environment_community: 'happiness.domainsShort.environment_community',
  work_fulfillment: 'happiness.domainsShort.work_fulfillment',
};

export function isHappinessDomainId(value: string | null | undefined): value is HappinessDomainId {
  return Boolean(value && (HAPPINESS_DOMAINS as readonly string[]).includes(value));
}

export const AFFECTING_TO_DOMAIN: Record<string, HappinessDomainId> = {
  work: 'work_fulfillment',
  health: 'health_vitality',
  relationships: 'relationships_belonging',
  money_security: 'security_stability',
  family: 'relationships_belonging',
  time: 'time_life_balance',
  environment: 'environment_community',
  purpose: 'meaning_purpose',
};

export const AFFECTING_TO_CAUSE_GROUP: Record<string, string> = {
  work: 'work',
  health: 'health',
  relationships: 'relationships',
  money_security: 'security',
  family: 'relationships',
  time: 'time',
  environment: 'security',
  purpose: 'purpose',
  something_else: 'purpose',
};

/**
 * Weekly pulse: prefer stale / never-assessed domains so all ten get coverage.
 * Always include Work Fulfillment if it is among the four stalest (distinct subunit).
 */
export function selectWeeklyPulseDomains(
  lastAssessed: Partial<Record<HappinessDomainId, string | Date | null>>,
  now = new Date(),
  count = 4,
): HappinessDomainId[] {
  const nowMs = now.getTime();
  const ranked = [...HAPPINESS_DOMAINS].map((domain) => {
    const raw = lastAssessed[domain];
    const then = raw ? new Date(raw).getTime() : Number.NaN;
    const stale = Number.isFinite(then) ? nowMs - then : Number.POSITIVE_INFINITY;
    return { domain, stale };
  });
  ranked.sort((a, b) => b.stale - a.stale || HAPPINESS_DOMAINS.indexOf(a.domain) - HAPPINESS_DOMAINS.indexOf(b.domain));
  return ranked.slice(0, count).map((row) => row.domain);
}

export function isoWeekStart(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

export function isoMonthStart(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}
