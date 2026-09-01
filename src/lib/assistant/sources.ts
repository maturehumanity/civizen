export const KNOWLEDGE_FORMAT = 1;

export const SOURCE_PRIORITY = {
  identityCanonical: 1,
  runtimeStructured: 2,
  featureRegistry: 3,
  schemaPermissions: 4,
  cheatSheet: 5,
  canonicalDocs: 6,
  otherCurrentDocs: 7,
  historicalPlanning: 8,
} as const;

export type IndexedSource = {
  path: string;
  priority: (typeof SOURCE_PRIORITY)[keyof typeof SOURCE_PRIORITY];
  /** Override document status when front matter is missing or misleading. */
  status?: 'implemented' | 'experimental' | 'in_development' | 'proposed' | 'deprecated' | 'historical';
};

/** Explicit allowlist. Never add secrets, env files, user data, or node_modules. */
export const INDEXED_SOURCES: IndexedSource[] = [
  { path: 'docs/assistant/civizen-identity.md', priority: SOURCE_PRIORITY.identityCanonical, status: 'implemented' },
  { path: 'docs/assistant/civizen-assistant-cheatsheet.md', priority: SOURCE_PRIORITY.cheatSheet, status: 'implemented' },
  { path: 'docs/assistant/README.md', priority: SOURCE_PRIORITY.cheatSheet, status: 'implemented' },
  { path: 'docs/04-operations/dev/agreements.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/04-operations/dev/contribute-page.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/04-operations/dev/matter-collaboration.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/04-operations/dev/phase-1-pilot-operating-model.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/02-policies/governance/civizen-community-governance-charter.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/02-policies/institutional/funding-and-financial-integrity.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/02-policies/institutional/current-legal-status-notice.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/02-policies/institutional/international-partnerships-and-chapters.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/02-policies/institutional/world-citizenship-and-civic-status-notice.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/00-foundation/recognized-planetary-citizenship-pathway.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/00-foundation/the-civizen-charter.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/00-foundation/philosophy-of-mature-humanity.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/00-foundation/why-civizen-exists-page-brief.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/04-operations/contributor-processes/content-status-retrieval-rules.md', priority: SOURCE_PRIORITY.canonicalDocs, status: 'implemented' },
  { path: 'docs/institutional/governance-framework.md', priority: SOURCE_PRIORITY.otherCurrentDocs, status: 'proposed' },
  { path: 'docs/institutional/institutional-blueprint.md', priority: SOURCE_PRIORITY.otherCurrentDocs, status: 'proposed' },
  { path: 'docs/institutional/stakeholder-partnership-framework.md', priority: SOURCE_PRIORITY.otherCurrentDocs, status: 'proposed' },
  { path: 'docs/institutional/pilot-framework.md', priority: SOURCE_PRIORITY.otherCurrentDocs, status: 'proposed' },
  { path: 'docs/institutional/contributor-framework.md', priority: SOURCE_PRIORITY.otherCurrentDocs, status: 'proposed' },
  { path: 'docs/institutional/areas-domains-participation-framework.md', priority: SOURCE_PRIORITY.otherCurrentDocs, status: 'proposed' },
  {
    path: 'docs/01-governance/funding-and-monetary/civizen-constitutional-tokenomics-governance.md',
    priority: SOURCE_PRIORITY.historicalPlanning,
    status: 'historical',
  },
  {
    path: 'docs/01-governance/constitution/civizen-constitution-v0.1.md',
    priority: SOURCE_PRIORITY.historicalPlanning,
    status: 'historical',
  },
];

export const INDEX_DENY_SUBSTRINGS = [
  'node_modules',
  '/dist/',
  '.env',
  'credentials',
  'secrets',
  '/archive/',
  'private_messages',
];
