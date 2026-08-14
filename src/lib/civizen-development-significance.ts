/** Deterministic development-outcome significance. Unknown when signals are insufficient. */

import { resolveContributorFunction } from '@/lib/civizen-contributor-function';

export type DevelopmentStructuralSignificance = 'high' | 'moderate' | 'localized' | 'unknown';
export type DevelopmentScope = 'platform' | 'subsystem' | 'local' | 'unknown';
export type DevelopmentContributionFunction =
  | 'system_architecture'
  | 'product_architecture'
  | 'governance_design'
  | 'model_evolution'
  | 'implementation'
  | 'documentation'
  | 'unknown';

export type DevelopmentSignificance = {
  contributionFunction: DevelopmentContributionFunction;
  artifactFunction: DevelopmentContributionFunction;
  structuralSignificance: DevelopmentStructuralSignificance;
  scope: DevelopmentScope;
  subsystems: string[];
  complexity: 'unknown';
  realizedImpact: 'unknown';
  qualityEvidence: 'tests_passed' | 'unknown';
};

const SUBSYSTEMS: Array<{ id: string; pattern: RegExp; structural: DevelopmentStructuralSignificance; fn: DevelopmentContributionFunction }> = [
  { id: 'score', pattern: /civizen-score|score-model|score-maturity|score-tiers/, structural: 'high', fn: 'system_architecture' },
  { id: 'contributions', pattern: /civizen-contribution|development-evidence|development-capture/, structural: 'high', fn: 'system_architecture' },
  { id: 'schema', pattern: /supabase\/migrations/, structural: 'high', fn: 'model_evolution' },
  { id: 'governance', pattern: /governance|institutional/, structural: 'high', fn: 'governance_design' },
  { id: 'classification', pattern: /classification|areas-and-initiatives/, structural: 'high', fn: 'model_evolution' },
  { id: 'nav', pattern: /nav-secondary|NavSecondary/, structural: 'moderate', fn: 'product_architecture' },
  { id: 'agreements', pattern: /agreements|AgreementCreate/, structural: 'moderate', fn: 'product_architecture' },
  { id: 'i18n', pattern: /i18n\.(base|runtime)/, structural: 'localized', fn: 'documentation' },
  { id: 'ui', pattern: /src\/(pages|components)\//, structural: 'localized', fn: 'implementation' },
];

export function subsystemsForPaths(paths: string[]): string[] {
  return [...new Set(SUBSYSTEMS.filter((item) => paths.some((path) => item.pattern.test(path))).map((item) => item.id))];
}

const TITLE_HINTS: Array<{ pattern: RegExp; structural: DevelopmentStructuralSignificance; fn: DevelopmentContributionFunction; id: string }> = [
  { id: 'score', pattern: /\b(score|dial|reputation|maturity|tier)\b/i, structural: 'high', fn: 'system_architecture' },
  { id: 'governance', pattern: /\b(governance|institutional|charter)\b/i, structural: 'high', fn: 'governance_design' },
  { id: 'classification', pattern: /\b(areas?|classification|initiative)\b/i, structural: 'high', fn: 'model_evolution' },
  { id: 'nav', pattern: /\b(carousel|bottom nav|nav chrome)\b/i, structural: 'moderate', fn: 'product_architecture' },
  { id: 'agreements', pattern: /\b(agreements? capability|document-first|party roles?)\b/i, structural: 'moderate', fn: 'product_architecture' },
  { id: 'schema', pattern: /\b(migration|schema|registry)\b/i, structural: 'high', fn: 'model_evolution' },
];

export function evaluateDevelopmentSignificance(args: {
  affectedPaths?: string[] | null;
  testsPassed?: boolean | null;
  contributionFunction?: string | null;
  title?: string | null;
  roles?: unknown;
  implementationAssisted?: boolean | null;
}): DevelopmentSignificance {
  const paths = (args.affectedPaths ?? []).filter((path) => path.trim().length > 0);
  const title = args.title ?? '';
  const matched = SUBSYSTEMS.filter((item) => paths.some((path) => item.pattern.test(path)));
  const titleHit = TITLE_HINTS.filter((item) => item.pattern.test(title));
  const subsystems = [...new Set([...subsystemsForPaths(paths), ...titleHit.map((item) => item.id)])];
  const structural = matched.some((item) => item.structural === 'high') || titleHit.some((item) => item.structural === 'high')
    ? 'high'
    : matched.some((item) => item.structural === 'moderate') || titleHit.some((item) => item.structural === 'moderate')
      ? 'moderate'
      : paths.length > 0 || title.trim().length > 0
        ? 'localized'
        : 'unknown';
  const scope: DevelopmentScope =
    subsystems.length >= 3 || matched.some((item) => item.id === 'schema' || item.id === 'score')
      ? 'platform'
      : subsystems.length > 0
        ? 'subsystem'
        : paths.length > 0
          ? 'local'
          : 'unknown';
  const artifactFunction: DevelopmentContributionFunction =
    matched[0]?.fn ?? titleHit[0]?.fn ?? (paths.length > 0 || title.trim() ? 'implementation' : 'unknown');
  const contributionFunction = resolveContributorFunction({
    roles: args.roles,
    implementationAssisted: args.implementationAssisted,
    explicitFunction: args.contributionFunction,
    artifactFunction,
  });
  return {
    contributionFunction,
    artifactFunction,
    structuralSignificance: structural,
    scope,
    subsystems,
    complexity: 'unknown',
    realizedImpact: 'unknown',
    qualityEvidence: args.testsPassed === true ? 'tests_passed' : 'unknown',
  };
}
