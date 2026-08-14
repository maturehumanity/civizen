/** Contributor function from evidenced roles, not from artifact file type. */

import type { DevelopmentContributionFunction } from '@/lib/civizen-development-significance';
import type { DevelopmentContributionRole } from '@/lib/civizen-development-evidence';

const ROLE_PRIORITY: Array<{ role: DevelopmentContributionRole; fn: DevelopmentContributionFunction }> = [
  { role: 'system_architect', fn: 'system_architecture' },
  { role: 'product_architect', fn: 'product_architecture' },
  { role: 'governance_design', fn: 'governance_design' },
  { role: 'product_direction', fn: 'product_architecture' },
  { role: 'requirements', fn: 'product_architecture' },
  { role: 'ux_design', fn: 'product_architecture' },
  { role: 'design', fn: 'product_architecture' },
  { role: 'research', fn: 'model_evolution' },
  { role: 'founder', fn: 'product_architecture' },
  { role: 'documentation', fn: 'documentation' },
  { role: 'implementation', fn: 'implementation' },
];

const KNOWN_FUNCTIONS = new Set<DevelopmentContributionFunction>([
  'system_architecture',
  'product_architecture',
  'governance_design',
  'model_evolution',
  'implementation',
  'documentation',
]);

export function asContributionFunction(value?: string | null): DevelopmentContributionFunction | null {
  return value && KNOWN_FUNCTIONS.has(value as DevelopmentContributionFunction)
    ? (value as DevelopmentContributionFunction)
    : null;
}

export function parseContributionRoles(value: unknown): DevelopmentContributionRole[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(ROLE_PRIORITY.map((item) => item.role));
  allowed.add('review');
  allowed.add('problem_identification');
  allowed.add('coordination');
  allowed.add('ux_design');
  allowed.add('quality_assurance');
  allowed.add('validation');
  return [...new Set(value.filter((item): item is DevelopmentContributionRole =>
    typeof item === 'string' && allowed.has(item as DevelopmentContributionRole),
  ))];
}

/**
 * Primary contributor function from evidenced roles.
 * Assisted implementation does not classify the human as Implementation.
 */
export function contributorFunctionFromRoles(
  roles: DevelopmentContributionRole[],
  options?: { implementationAssisted?: boolean | null },
): DevelopmentContributionFunction | null {
  const assisted = options?.implementationAssisted === true;
  for (const item of ROLE_PRIORITY) {
    if (!roles.includes(item.role)) continue;
    if (item.role === 'implementation' && assisted) continue;
    if (item.role === 'implementation' && roles.some((role) =>
      role === 'system_architect' || role === 'product_architect' || role === 'requirements' ||
      role === 'product_direction' || role === 'design' || role === 'ux_design' || role === 'governance_design',
    )) continue;
    return item.fn;
  }
  return null;
}

export function resolveContributorFunction(args: {
  roles?: unknown;
  implementationAssisted?: boolean | null;
  explicitFunction?: string | null;
  artifactFunction?: DevelopmentContributionFunction | null;
}): DevelopmentContributionFunction {
  const roles = parseContributionRoles(args.roles);
  const fromRoles = contributorFunctionFromRoles(roles, {
    implementationAssisted: args.implementationAssisted,
  });
  if (fromRoles) return fromRoles;
  return asContributionFunction(args.explicitFunction)
    ?? args.artifactFunction
    ?? 'unknown';
}
