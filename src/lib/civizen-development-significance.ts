/** Deterministic development-outcome significance. Unknown when signals are insufficient. */

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
  { id: 'i18n', pattern: /i18n\.(base|runtime)/, structural: 'localized', fn: 'documentation' },
  { id: 'ui', pattern: /src\/(pages|components)\//, structural: 'localized', fn: 'implementation' },
];

export function subsystemsForPaths(paths: string[]): string[] {
  return [...new Set(SUBSYSTEMS.filter((item) => paths.some((path) => item.pattern.test(path))).map((item) => item.id))];
}

export function evaluateDevelopmentSignificance(args: {
  affectedPaths?: string[] | null;
  testsPassed?: boolean | null;
  contributionFunction?: string | null;
}): DevelopmentSignificance {
  const paths = (args.affectedPaths ?? []).filter((path) => path.trim().length > 0);
  const matched = SUBSYSTEMS.filter((item) => paths.some((path) => item.pattern.test(path)));
  const subsystems = subsystemsForPaths(paths);
  const structural = matched.some((item) => item.structural === 'high')
    ? 'high'
    : matched.some((item) => item.structural === 'moderate')
      ? 'moderate'
      : paths.length > 0
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
  const explicit = args.contributionFunction;
  const contributionFunction: DevelopmentContributionFunction =
    explicit === 'system_architecture' || explicit === 'product_architecture' ||
    explicit === 'governance_design' || explicit === 'model_evolution' ||
    explicit === 'implementation' || explicit === 'documentation'
      ? explicit
      : matched[0]?.fn ?? (paths.length > 0 ? 'implementation' : 'unknown');
  return {
    contributionFunction,
    structuralSignificance: structural,
    scope,
    subsystems,
    complexity: 'unknown',
    realizedImpact: 'unknown',
    qualityEvidence: args.testsPassed === true ? 'tests_passed' : 'unknown',
  };
}
