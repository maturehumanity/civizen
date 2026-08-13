import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PILLARS } from '@/lib/constants';
import {
  CLASSIFICATION_FAMILY_KEYS,
  CLASSIFICATION_SEED,
  ClassificationRegistryError,
  FOUNDATIONAL_AREA_SET_ID,
  PRODUCT_PILLARS_REMAIN_CONTROLLING,
  PRODUCT_PILLAR_SET_ID,
  getCurrentSet,
  getNodeByConceptKey,
  getNodeById,
  listAliases,
  listChildren,
  listCurrentAreas,
  listCurrentProductPillarNodes,
  listDomainsForArea,
  listFalseEquivalenceViolations,
  listNodes,
  listRelationships,
  resolveDisplay,
  validateClassificationCatalog,
  withCatalogOverlay,
} from '@/lib/classification';

const MIGRATION_PATH = resolve(
  process.cwd(),
  'supabase/migrations/20260813000000_shared_classification_registry.sql',
);

describe('shared classification registry', () => {
  it('retrieves the current foundational Area model', () => {
    const set = getCurrentSet(CLASSIFICATION_FAMILY_KEYS.foundationalAreas);
    expect(set?.id).toBe(FOUNDATIONAL_AREA_SET_ID);
    expect(set?.isCurrent).toBe(true);
    expect(listCurrentAreas().map((node) => node.shortName)).toEqual([
      'Health',
      'Education',
      'Culture',
      'Responsibility',
      'Environment',
    ]);
    expect(listCurrentAreas().every((node) => node.nodeType === 'area')).toBe(true);
    expect(listCurrentAreas().every((node) => node.conceptKey.startsWith('area.'))).toBe(true);
  });

  it('represents live product PILLARS as a separate classification set', () => {
    const set = getCurrentSet(CLASSIFICATION_FAMILY_KEYS.productPillars);
    expect(set?.id).toBe(PRODUCT_PILLAR_SET_ID);
    expect(set?.id).not.toBe(FOUNDATIONAL_AREA_SET_ID);
    expect(listCurrentProductPillarNodes().map((node) => node.code)).toEqual([
      'education_skills',
      'culture_ethics',
      'responsibility_reliability',
      'environment_community',
      'economy_contribution',
    ]);
    expect(listCurrentProductPillarNodes().every((node) => node.nodeType === 'pillar')).toBe(true);
    expect(PRODUCT_PILLARS_REMAIN_CONTROLLING).toBe(true);
  });

  it('prevents duplicate stable identities', () => {
    expect(() =>
      withCatalogOverlay({
        nodes: [
          {
            id: 'duplicate-id-test',
            setId: FOUNDATIONAL_AREA_SET_ID,
            conceptKey: 'area.health',
            nodeType: 'area',
            code: 'health-dup',
            displayName: 'Dup',
            shortName: 'Dup',
            description: '',
            status: 'current',
            sortOrder: 99,
            replacedByNodeId: null,
          },
        ],
      }),
    ).toThrow(ClassificationRegistryError);

    expect(() => validateClassificationCatalog(CLASSIFICATION_SEED)).not.toThrow();
  });

  it('retrieves historical/deprecated records when requested', () => {
    const catalog = withCatalogOverlay({
      nodes: [
        {
          id: `${FOUNDATIONAL_AREA_SET_ID}.health-legacy-label`,
          setId: FOUNDATIONAL_AREA_SET_ID,
          conceptKey: 'area.health.legacy_label',
          nodeType: 'area',
          code: 'health_legacy',
          displayName: 'Public Health (legacy label)',
          shortName: 'Public Health',
          description: 'Deprecated label retained for historical interpretation.',
          status: 'deprecated',
          sortOrder: 90,
          replacedByNodeId: `${FOUNDATIONAL_AREA_SET_ID}.health`,
        },
      ],
    });

    expect(listCurrentAreas(catalog).map((node) => node.code)).not.toContain('health_legacy');
    const historical = listNodes({
      setId: FOUNDATIONAL_AREA_SET_ID,
      includeNonCurrent: true,
      catalog,
    });
    const deprecated = historical.find((node) => node.code === 'health_legacy');
    expect(deprecated?.status).toBe('deprecated');
    expect(deprecated?.replacedByNodeId).toBe(`${FOUNDATIONAL_AREA_SET_ID}.health`);
    expect(getNodeById(`${FOUNDATIONAL_AREA_SET_ID}.health-legacy-label`, catalog)?.displayName).toBe(
      'Public Health (legacy label)',
    );
  });

  it('does not map Community → Environment or Economy → Health', () => {
    expect(listFalseEquivalenceViolations()).toEqual([]);
    expect(CLASSIFICATION_SEED.relationships).toEqual([]);

    const community = getNodeByConceptKey('pillar.environment_community');
    const environment = getNodeByConceptKey('area.environment');
    const economy = getNodeByConceptKey('pillar.economy_contribution');
    const health = getNodeByConceptKey('area.health');

    expect(community?.shortName).toBe('Community');
    expect(environment?.shortName).toBe('Environment');
    expect(economy?.shortName).toBe('Economy');
    expect(health?.shortName).toBe('Health');
    expect(community?.conceptKey).not.toBe(environment?.conceptKey);
    expect(economy?.conceptKey).not.toBe(health?.conceptKey);

    expect(listAliases(environment!.id).map((alias) => alias.alias)).not.toContain('Community');
    expect(listAliases(health!.id).map((alias) => alias.alias)).not.toContain('Economy');
    expect(listRelationships(community!.id)).toEqual([]);
    expect(listRelationships(economy!.id)).toEqual([]);
  });

  it('resolves display metadata including Responsibility display alias', () => {
    const responsibility = getNodeByConceptKey('area.responsibility');
    expect(responsibility).toBeDefined();
    const display = resolveDisplay(responsibility!);
    expect(display.displayName).toBe('Responsibility');
    expect(display.aliases).toContain('Responsibility & Governance');
  });

  it('lists no Domains for Areas until a catalog is seeded', () => {
    const health = getNodeByConceptKey('area.health');
    expect(listDomainsForArea(health!.id)).toEqual([]);
    expect(listChildren(health!.id)).toEqual([]);
  });

  it('keeps SQL seed aligned with the in-memory catalog keys', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');
    for (const node of CLASSIFICATION_SEED.nodes) {
      expect(sql).toContain(node.id);
      expect(sql).toContain(node.conceptKey);
    }
    expect(sql).toContain('Responsibility & Governance');
    expect(sql).toContain('No Area↔Pillar relationships');
  });
});

describe('existing PILLARS remain controlling', () => {
  it('does not change live PILLARS ids, short names, or colors', () => {
    expect(PILLARS.map((pillar) => pillar.id)).toEqual([
      'education_skills',
      'culture_ethics',
      'responsibility_reliability',
      'environment_community',
      'economy_contribution',
    ]);
    expect(PILLARS.find((pillar) => pillar.id === 'environment_community')?.shortName).toBe(
      'Community',
    );
    expect(PILLARS.find((pillar) => pillar.id === 'economy_contribution')?.shortName).toBe('Economy');
    expect(PILLARS.find((pillar) => pillar.id === 'environment_community')?.colorClass).toBe(
      'pillar-environment',
    );
    expect(PILLARS.find((pillar) => pillar.id === 'economy_contribution')?.colorClass).toBe(
      'pillar-economy',
    );
    expect(PILLARS.find((pillar) => pillar.id === 'education_skills')?.name).toBe('Education & Skills');
  });

  it('keeps product screens importing PILLARS from constants, not the registry', () => {
    const screens = [
      'src/pages/Profile.tsx',
      'src/pages/UserProfile.tsx',
      'src/pages/EndorseFlow.tsx',
      'src/pages/settings/Pillars.tsx',
      'src/components/score/ScorePageSections.tsx',
      'src/components/ui/PillarBadge.tsx',
    ];
    for (const relative of screens) {
      const source = readFileSync(resolve(process.cwd(), relative), 'utf8');
      expect(source).toMatch(/from ['"]@\/lib\/constants['"]/);
      expect(source).not.toMatch(/from ['"]@\/lib\/classification/);
    }
  });
});
