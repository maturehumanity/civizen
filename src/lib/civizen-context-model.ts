/** Civizen context: declared, demonstrated, current-focus, historical. Not a score bonus. */

import type { ContributionEvent } from '@/lib/civizen-contributions';
import { evaluateContributionLifecycle } from '@/lib/civizen-contribution-lifecycle';

export const CIVIZEN_CONTEXT_VERSION = 'civizen-context-v1';
export const CURRENT_FOCUS_DAYS = 90;

const SENSITIVE = /\b(race|ethnicity|religion|faith|health condition|disability status|sexual orientation|sexuality|political party|political ideology|partisan)\b/i;

export type DeclaredContext = {
  interests: string[];
  goals: string[];
  priorities: string[];
  contributionInterests: string[];
};

export type DemonstratedContext = {
  skills: string[];
  functions: string[];
  domains: string[];
  projects: string[];
};

export type CurrentFocus = {
  functions: string[];
  domains: string[];
  skills: string[];
  themes: string[];
};

export type CivizenContextView = {
  modelVersion: string;
  declared: DeclaredContext;
  demonstrated: DemonstratedContext;
  currentFocus: CurrentFocus;
  historical: DemonstratedContext;
  provenance: Array<{ field: string; source: 'declared' | 'demonstrated' | 'recent_activity' }>;
  scoringBonusApplied: false;
  sensitiveInferences: [];
};

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim();
    if (!key || SENSITIVE.test(key)) continue;
    const norm = key.toLowerCase();
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(key);
  }
  return out;
}

export function stripsSensitiveContext(value: string): boolean {
  return SENSITIVE.test(value);
}

export function buildCivizenContext(args: {
  events: ContributionEvent[];
  declared?: Partial<DeclaredContext>;
  nowMs?: number;
}): CivizenContextView {
  const now = args.nowMs ?? Date.now();
  const recentCutoff = now - CURRENT_FOCUS_DAYS * 86_400_000;
  const declared: DeclaredContext = {
    interests: unique(args.declared?.interests ?? []),
    goals: unique(args.declared?.goals ?? []),
    priorities: unique(args.declared?.priorities ?? []),
    contributionInterests: unique(args.declared?.contributionInterests ?? []),
  };
  const historicalSkills: string[] = [];
  const historicalFunctions: string[] = [];
  const historicalDomains: string[] = [];
  const historicalProjects: string[] = [];
  const recentSkills: string[] = [];
  const recentFunctions: string[] = [];
  const recentDomains: string[] = [];
  const recentThemes: string[] = [];

  for (const event of args.events) {
    const view = evaluateContributionLifecycle(event);
    const recent = Date.parse(event.occurredAt) >= recentCutoff;
    historicalFunctions.push(view.contributionFunction);
    if (view.domain) historicalDomains.push(view.domain);
    historicalSkills.push(...view.supports.skills);
    if (event.title) historicalProjects.push(event.title);
    if (recent) {
      recentFunctions.push(view.contributionFunction);
      if (view.domain) recentDomains.push(view.domain);
      recentSkills.push(...view.supports.skills);
      recentThemes.push(view.contributionFunction);
    }
  }

  const demonstrated: DemonstratedContext = {
    skills: unique(historicalSkills),
    functions: unique(historicalFunctions.filter((item) => item !== 'unknown')),
    domains: unique(historicalDomains),
    projects: unique(historicalProjects).slice(0, 12),
  };

  return {
    modelVersion: CIVIZEN_CONTEXT_VERSION,
    declared,
    demonstrated,
    currentFocus: {
      functions: unique(recentFunctions.filter((item) => item !== 'unknown')),
      domains: unique(recentDomains),
      skills: unique(recentSkills),
      themes: unique(recentThemes.filter((item) => item !== 'unknown')),
    },
    historical: demonstrated,
    provenance: [
      ...declared.interests.map(() => ({ field: 'interests', source: 'declared' as const })),
      ...demonstrated.skills.map(() => ({ field: 'skills', source: 'demonstrated' as const })),
      ...demonstrated.functions.map(() => ({ field: 'functions', source: 'demonstrated' as const })),
    ],
    scoringBonusApplied: false,
    sensitiveInferences: [],
  };
}

export function contextDoesNotAlterReputation(
  withDeclared: number | null,
  withoutDeclared: number | null,
): boolean {
  return withDeclared === withoutDeclared;
}
