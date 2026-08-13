import { CLASSIFICATION_SEED } from '@/lib/classification/seed';
import type {
  ClassificationAlias,
  ClassificationCatalog,
  ClassificationDisplay,
  ClassificationNode,
  ClassificationNodeStatus,
  ClassificationNodeType,
  ClassificationRelationship,
  ClassificationRelationshipType,
  ClassificationSet,
} from '@/lib/classification/types';
import { CLASSIFICATION_FAMILY_KEYS } from '@/lib/classification/types';

export {
  CLASSIFICATION_FAMILY_KEYS,
  CLASSIFICATION_NODE_TYPES,
  CLASSIFICATION_RELATIONSHIP_TYPES,
} from '@/lib/classification/types';
export type {
  ClassificationAlias,
  ClassificationCatalog,
  ClassificationDisplay,
  ClassificationNode,
  ClassificationRelationship,
  ClassificationSet,
} from '@/lib/classification/types';
export { CLASSIFICATION_SEED, FOUNDATIONAL_AREA_SET_ID, PRODUCT_PILLAR_SET_ID } from '@/lib/classification/seed';

/**
 * Existing product UI must keep using `PILLARS` in src/lib/constants.ts
 * until a separate, deliberate migration. Public Areas V1 may read
 * `listCurrentAreas()` only. This registry is not a Score/Pillars source.
 */
export const PRODUCT_PILLARS_REMAIN_CONTROLLING = true;

export class ClassificationRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClassificationRegistryError';
  }
}

function cloneCatalog(catalog: ClassificationCatalog): ClassificationCatalog {
  return {
    sets: catalog.sets.map((set) => ({ ...set })),
    nodes: catalog.nodes.map((node) => ({ ...node })),
    aliases: catalog.aliases.map((alias) => ({ ...alias })),
    relationships: catalog.relationships.map((rel) => ({ ...rel })),
  };
}

export function validateClassificationCatalog(catalog: ClassificationCatalog): void {
  const setIds = new Set<string>();
  const currentByFamily = new Map<string, string>();
  for (const set of catalog.sets) {
    if (setIds.has(set.id)) {
      throw new ClassificationRegistryError(`Duplicate classification set id: ${set.id}`);
    }
    setIds.add(set.id);
    if (set.isCurrent) {
      const existing = currentByFamily.get(set.familyKey);
      if (existing) {
        throw new ClassificationRegistryError(
          `Family ${set.familyKey} has more than one current set (${existing}, ${set.id})`,
        );
      }
      currentByFamily.set(set.familyKey, set.id);
    }
  }

  const nodeIds = new Set<string>();
  const conceptBySet = new Map<string, Set<string>>();
  const codeBySet = new Map<string, Set<string>>();
  for (const node of catalog.nodes) {
    if (nodeIds.has(node.id)) {
      throw new ClassificationRegistryError(`Duplicate classification node id: ${node.id}`);
    }
    nodeIds.add(node.id);
    if (!setIds.has(node.setId)) {
      throw new ClassificationRegistryError(`Node ${node.id} references unknown set ${node.setId}`);
    }
    const concepts = conceptBySet.get(node.setId) ?? new Set<string>();
    if (concepts.has(node.conceptKey)) {
      throw new ClassificationRegistryError(
        `Duplicate concept_key ${node.conceptKey} in set ${node.setId}`,
      );
    }
    concepts.add(node.conceptKey);
    conceptBySet.set(node.setId, concepts);

    const codes = codeBySet.get(node.setId) ?? new Set<string>();
    if (codes.has(node.code)) {
      throw new ClassificationRegistryError(`Duplicate code ${node.code} in set ${node.setId}`);
    }
    codes.add(node.code);
    codeBySet.set(node.setId, codes);
  }

  for (const node of catalog.nodes) {
    if (node.replacedByNodeId && !nodeIds.has(node.replacedByNodeId)) {
      throw new ClassificationRegistryError(
        `Node ${node.id} replaced_by unknown node ${node.replacedByNodeId}`,
      );
    }
  }

  for (const alias of catalog.aliases) {
    if (!nodeIds.has(alias.nodeId)) {
      throw new ClassificationRegistryError(`Alias ${alias.id} references unknown node ${alias.nodeId}`);
    }
  }

  for (const rel of catalog.relationships) {
    if (!nodeIds.has(rel.fromNodeId) || !nodeIds.has(rel.toNodeId)) {
      throw new ClassificationRegistryError(
        `Relationship ${rel.id} references unknown node (${rel.fromNodeId} → ${rel.toNodeId})`,
      );
    }
    if (rel.fromNodeId === rel.toNodeId) {
      throw new ClassificationRegistryError(`Relationship ${rel.id} cannot be self-referential`);
    }
  }
}

validateClassificationCatalog(CLASSIFICATION_SEED);

export function getClassificationCatalog(
  catalog: ClassificationCatalog = CLASSIFICATION_SEED,
): ClassificationCatalog {
  return cloneCatalog(catalog);
}

export function getCurrentSet(
  familyKey: string,
  catalog: ClassificationCatalog = CLASSIFICATION_SEED,
): ClassificationSet | undefined {
  return catalog.sets.find((set) => set.familyKey === familyKey && set.isCurrent);
}

export function listCurrentAreas(
  catalog: ClassificationCatalog = CLASSIFICATION_SEED,
): ClassificationNode[] {
  const set = getCurrentSet(CLASSIFICATION_FAMILY_KEYS.foundationalAreas, catalog);
  if (!set) return [];
  return catalog.nodes
    .filter((node) => node.setId === set.id && node.nodeType === 'area' && node.status === 'current')
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function listCurrentProductPillarNodes(
  catalog: ClassificationCatalog = CLASSIFICATION_SEED,
): ClassificationNode[] {
  const set = getCurrentSet(CLASSIFICATION_FAMILY_KEYS.productPillars, catalog);
  if (!set) return [];
  return catalog.nodes
    .filter((node) => node.setId === set.id && node.nodeType === 'pillar' && node.status === 'current')
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function listNodes(args: {
  setId?: string;
  nodeType?: ClassificationNodeType;
  status?: ClassificationNodeStatus;
  includeNonCurrent?: boolean;
  catalog?: ClassificationCatalog;
}): ClassificationNode[] {
  const catalog = args.catalog ?? CLASSIFICATION_SEED;
  return catalog.nodes
    .filter((node) => {
      if (args.setId && node.setId !== args.setId) return false;
      if (args.nodeType && node.nodeType !== args.nodeType) return false;
      if (args.status) return node.status === args.status;
      if (!args.includeNonCurrent) return node.status === 'current';
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

export function getNodeById(
  nodeId: string,
  catalog: ClassificationCatalog = CLASSIFICATION_SEED,
): ClassificationNode | undefined {
  return catalog.nodes.find((node) => node.id === nodeId);
}

export function getNodeByConceptKey(
  conceptKey: string,
  args: { setId?: string; catalog?: ClassificationCatalog } = {},
): ClassificationNode | undefined {
  const catalog = args.catalog ?? CLASSIFICATION_SEED;
  return catalog.nodes.find((node) => {
    if (node.conceptKey !== conceptKey) return false;
    if (args.setId) return node.setId === args.setId;
    const set = catalog.sets.find((item) => item.id === node.setId);
    return set?.isCurrent === true;
  });
}

export function listAliases(
  nodeId: string,
  catalog: ClassificationCatalog = CLASSIFICATION_SEED,
): ClassificationAlias[] {
  return catalog.aliases.filter((alias) => alias.nodeId === nodeId);
}

export function listRelationships(
  nodeId: string,
  args: { type?: ClassificationRelationshipType; catalog?: ClassificationCatalog } = {},
): ClassificationRelationship[] {
  const catalog = args.catalog ?? CLASSIFICATION_SEED;
  return catalog.relationships.filter((rel) => {
    if (rel.fromNodeId !== nodeId && rel.toNodeId !== nodeId) return false;
    if (args.type) return rel.relationshipType === args.type;
    return true;
  });
}

export function listChildren(
  parentNodeId: string,
  catalog: ClassificationCatalog = CLASSIFICATION_SEED,
): ClassificationNode[] {
  const childIds = catalog.relationships
    .filter((rel) => rel.fromNodeId === parentNodeId && rel.relationshipType === 'parent_of')
    .map((rel) => rel.toNodeId);
  return catalog.nodes
    .filter((node) => childIds.includes(node.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function listDomainsForArea(
  areaNodeId: string,
  catalog: ClassificationCatalog = CLASSIFICATION_SEED,
): ClassificationNode[] {
  return listChildren(areaNodeId, catalog).filter((node) => node.nodeType === 'domain');
}

export function resolveDisplay(
  node: ClassificationNode,
  catalog: ClassificationCatalog = CLASSIFICATION_SEED,
): ClassificationDisplay {
  return {
    nodeId: node.id,
    displayName: node.displayName,
    shortName: node.shortName,
    description: node.description,
    aliases: listAliases(node.id, catalog).map((alias) => alias.alias),
  };
}

export function withCatalogOverlay(
  overlay: Partial<ClassificationCatalog>,
  base: ClassificationCatalog = CLASSIFICATION_SEED,
): ClassificationCatalog {
  const next = cloneCatalog(base);
  if (overlay.sets) next.sets.push(...overlay.sets);
  if (overlay.nodes) next.nodes.push(...overlay.nodes);
  if (overlay.aliases) next.aliases.push(...overlay.aliases);
  if (overlay.relationships) next.relationships.push(...overlay.relationships);
  validateClassificationCatalog(next);
  return next;
}

const FALSE_EQUIVALENCE_PAIRS: Array<[string, string]> = [
  ['pillar.environment_community', 'area.environment'],
  ['area.environment', 'pillar.environment_community'],
  ['pillar.economy_contribution', 'area.health'],
  ['area.health', 'pillar.economy_contribution'],
];

export function listFalseEquivalenceViolations(
  catalog: ClassificationCatalog = CLASSIFICATION_SEED,
): string[] {
  const violations: string[] = [];
  const nodeById = new Map(catalog.nodes.map((node) => [node.id, node]));

  for (const rel of catalog.relationships) {
    const from = nodeById.get(rel.fromNodeId);
    const to = nodeById.get(rel.toNodeId);
    if (!from || !to) continue;
    const pair = `${from.conceptKey}→${to.conceptKey}`;
    const forbidden = FALSE_EQUIVALENCE_PAIRS.some(
      ([left, right]) => from.conceptKey === left && to.conceptKey === right,
    );
    if (!forbidden) continue;
    if (
      rel.relationshipType === 'replaced_by' ||
      rel.relationshipType === 'supersedes' ||
      rel.relationshipType === 'merged_into' ||
      rel.relationshipType === 'split_into'
    ) {
      violations.push(`${rel.relationshipType}: ${pair}`);
    }
  }

  const environment = getNodeByConceptKey('area.environment', { catalog });
  if (environment) {
    const aliases = listAliases(environment.id, catalog).map((alias) => alias.alias.toLowerCase());
    if (aliases.includes('community')) {
      violations.push('alias: area.environment includes Community');
    }
  }

  const health = getNodeByConceptKey('area.health', { catalog });
  if (health) {
    const aliases = listAliases(health.id, catalog).map((alias) => alias.alias.toLowerCase());
    if (aliases.includes('economy')) {
      violations.push('alias: area.health includes Economy');
    }
  }

  return violations;
}
