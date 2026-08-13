/** Shared classification registry types (Areas / Domains foundation). */

export const CLASSIFICATION_FAMILY_KEYS = {
  foundationalAreas: 'foundational_areas',
  productPillars: 'product_pillars',
} as const;

export type ClassificationFamilyKey =
  (typeof CLASSIFICATION_FAMILY_KEYS)[keyof typeof CLASSIFICATION_FAMILY_KEYS];

export const CLASSIFICATION_SET_STATUSES = [
  'draft',
  'current',
  'superseded',
  'historical',
  'experimental',
] as const;

export type ClassificationSetStatus = (typeof CLASSIFICATION_SET_STATUSES)[number];

export const CLASSIFICATION_NODE_TYPES = ['area', 'domain', 'topic', 'pillar'] as const;

export type ClassificationNodeType = (typeof CLASSIFICATION_NODE_TYPES)[number];

export const CLASSIFICATION_NODE_STATUSES = ['current', 'deprecated', 'superseded'] as const;

export type ClassificationNodeStatus = (typeof CLASSIFICATION_NODE_STATUSES)[number];

export const CLASSIFICATION_RELATIONSHIP_TYPES = [
  'parent_of',
  'related_to',
  'overlaps_with',
  'replaced_by',
  'supersedes',
  'split_into',
  'merged_into',
] as const;

export type ClassificationRelationshipType = (typeof CLASSIFICATION_RELATIONSHIP_TYPES)[number];

export const CLASSIFICATION_ALIAS_KINDS = ['display', 'search', 'localization'] as const;

export type ClassificationAliasKind = (typeof CLASSIFICATION_ALIAS_KINDS)[number];

export type ClassificationSet = {
  id: string;
  familyKey: ClassificationFamilyKey | string;
  versionKey: string;
  name: string;
  description: string;
  status: ClassificationSetStatus;
  isCurrent: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  predecessorId: string | null;
  successorId: string | null;
  methodologyDocRef: string | null;
  changeRationale: string | null;
};

export type ClassificationNode = {
  id: string;
  setId: string;
  conceptKey: string;
  nodeType: ClassificationNodeType;
  code: string;
  displayName: string;
  shortName: string;
  description: string;
  status: ClassificationNodeStatus;
  sortOrder: number;
  replacedByNodeId: string | null;
};

export type ClassificationAlias = {
  id: string;
  nodeId: string;
  alias: string;
  locale: string;
  kind: ClassificationAliasKind;
};

export type ClassificationRelationship = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationshipType: ClassificationRelationshipType;
  note: string | null;
};

export type ClassificationCatalog = {
  sets: ClassificationSet[];
  nodes: ClassificationNode[];
  aliases: ClassificationAlias[];
  relationships: ClassificationRelationship[];
};

export type ClassificationDisplay = {
  nodeId: string;
  displayName: string;
  shortName: string;
  description: string;
  aliases: string[];
};
