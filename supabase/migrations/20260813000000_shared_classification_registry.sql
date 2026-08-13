-- Shared classification registry (V1).
-- Evolvable Areas / Domains foundation. Does not replace product PILLARS,
-- Score categories, Study domains, endorsements, or UI.

CREATE TABLE IF NOT EXISTS public.classification_sets (
  id text PRIMARY KEY,
  family_key text NOT NULL,
  version_key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'current'
    CHECK (status IN ('draft', 'current', 'superseded', 'historical', 'experimental')),
  is_current boolean NOT NULL DEFAULT false,
  effective_from timestamptz,
  effective_to timestamptz,
  predecessor_id text REFERENCES public.classification_sets(id) ON DELETE SET NULL,
  successor_id text REFERENCES public.classification_sets(id) ON DELETE SET NULL,
  methodology_doc_ref text,
  change_rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_key, version_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS classification_sets_one_current_per_family
  ON public.classification_sets (family_key)
  WHERE is_current;

CREATE TABLE IF NOT EXISTS public.classification_nodes (
  id text PRIMARY KEY,
  set_id text NOT NULL REFERENCES public.classification_sets(id) ON DELETE CASCADE,
  concept_key text NOT NULL,
  node_type text NOT NULL
    CHECK (node_type IN ('area', 'domain', 'topic', 'pillar')),
  code text NOT NULL,
  display_name text NOT NULL,
  short_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'current'
    CHECK (status IN ('current', 'deprecated', 'superseded')),
  sort_order integer NOT NULL DEFAULT 0,
  replaced_by_node_id text REFERENCES public.classification_nodes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (set_id, concept_key),
  UNIQUE (set_id, code)
);

CREATE INDEX IF NOT EXISTS classification_nodes_set_type_idx
  ON public.classification_nodes (set_id, node_type, sort_order);

CREATE INDEX IF NOT EXISTS classification_nodes_concept_key_idx
  ON public.classification_nodes (concept_key);

CREATE TABLE IF NOT EXISTS public.classification_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id text NOT NULL REFERENCES public.classification_nodes(id) ON DELETE CASCADE,
  alias text NOT NULL,
  locale text NOT NULL DEFAULT 'und',
  kind text NOT NULL DEFAULT 'display'
    CHECK (kind IN ('display', 'search', 'localization')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (node_id, alias, locale)
);

CREATE TABLE IF NOT EXISTS public.classification_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id text NOT NULL REFERENCES public.classification_nodes(id) ON DELETE CASCADE,
  to_node_id text NOT NULL REFERENCES public.classification_nodes(id) ON DELETE CASCADE,
  relationship_type text NOT NULL
    CHECK (relationship_type IN (
      'parent_of',
      'related_to',
      'overlaps_with',
      'replaced_by',
      'supersedes',
      'split_into',
      'merged_into'
    )),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_node_id, to_node_id, relationship_type),
  CONSTRAINT classification_relationships_no_self CHECK (from_node_id <> to_node_id)
);

CREATE INDEX IF NOT EXISTS classification_relationships_from_idx
  ON public.classification_relationships (from_node_id, relationship_type);

CREATE INDEX IF NOT EXISTS classification_relationships_to_idx
  ON public.classification_relationships (to_node_id, relationship_type);

ALTER TABLE public.classification_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Classification sets are readable" ON public.classification_sets;
CREATE POLICY "Classification sets are readable"
  ON public.classification_sets
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Classification nodes are readable" ON public.classification_nodes;
CREATE POLICY "Classification nodes are readable"
  ON public.classification_nodes
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Classification aliases are readable" ON public.classification_aliases;
CREATE POLICY "Classification aliases are readable"
  ON public.classification_aliases
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Classification relationships are readable" ON public.classification_relationships;
CREATE POLICY "Classification relationships are readable"
  ON public.classification_relationships
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.classification_sets TO anon, authenticated;
GRANT SELECT ON public.classification_nodes TO anon, authenticated;
GRANT SELECT ON public.classification_aliases TO anon, authenticated;
GRANT SELECT ON public.classification_relationships TO anon, authenticated;

-- Current foundational Area model (Mature Humanity-derived). Not immutable.
INSERT INTO public.classification_sets (
  id, family_key, version_key, name, description, status, is_current,
  effective_from, methodology_doc_ref, change_rationale
) VALUES (
  'foundational_areas.v1',
  'foundational_areas',
  'v1',
  'Current Foundational Area Model v1',
  'Civizen current foundational Area model originating from Mature Humanity: Health, Education, Culture, Responsibility, Environment. Evolvable; not permanently frozen.',
  'current',
  true,
  '2026-08-13T00:00:00Z',
  'docs/institutional/areas-domains-participation-framework.md',
  'Seed current Area model as a versioned classification set.'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  is_current = EXCLUDED.is_current,
  methodology_doc_ref = EXCLUDED.methodology_doc_ref,
  change_rationale = EXCLUDED.change_rationale,
  updated_at = now();

INSERT INTO public.classification_nodes (
  id, set_id, concept_key, node_type, code, display_name, short_name, description, status, sort_order
) VALUES
  ('foundational_areas.v1.health', 'foundational_areas.v1', 'area.health', 'area', 'health', 'Health', 'Health', 'Broad sphere of human health and wellbeing.', 'current', 1),
  ('foundational_areas.v1.education', 'foundational_areas.v1', 'area.education', 'area', 'education', 'Education', 'Education', 'Broad sphere of learning and knowledge.', 'current', 2),
  ('foundational_areas.v1.culture', 'foundational_areas.v1', 'area.culture', 'area', 'culture', 'Culture', 'Culture', 'Broad sphere of culture, values, and shared meaning.', 'current', 3),
  ('foundational_areas.v1.responsibility', 'foundational_areas.v1', 'area.responsibility', 'area', 'responsibility', 'Responsibility', 'Responsibility', 'Broad sphere of responsibility, including governance where displayed as Responsibility & Governance.', 'current', 4),
  ('foundational_areas.v1.environment', 'foundational_areas.v1', 'area.environment', 'area', 'environment', 'Environment', 'Environment', 'Broad sphere of the living world and environmental stewardship.', 'current', 5)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  short_name = EXCLUDED.short_name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO public.classification_aliases (node_id, alias, locale, kind)
VALUES (
  'foundational_areas.v1.responsibility',
  'Responsibility & Governance',
  'en',
  'display'
)
ON CONFLICT (node_id, alias, locale) DO NOTHING;

-- Live product PILLARS as a separate current product classification set.
-- Not equivalent to the foundational Area model. Do not map Community→Environment or Economy→Health.
INSERT INTO public.classification_sets (
  id, family_key, version_key, name, description, status, is_current,
  effective_from, methodology_doc_ref, change_rationale
) VALUES (
  'product_pillars.v1',
  'product_pillars',
  'v1',
  'Live product PILLARS v1',
  'Current live product pillar identifiers from src/lib/constants.ts. Controlling for existing UI until a deliberate migration. Distinct from the foundational Area model.',
  'current',
  true,
  '2026-08-13T00:00:00Z',
  'src/lib/constants.ts',
  'Mirror live PILLARS as a classification set without replacing the product constant.'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  is_current = EXCLUDED.is_current,
  methodology_doc_ref = EXCLUDED.methodology_doc_ref,
  change_rationale = EXCLUDED.change_rationale,
  updated_at = now();

INSERT INTO public.classification_nodes (
  id, set_id, concept_key, node_type, code, display_name, short_name, description, status, sort_order
) VALUES
  ('product_pillars.v1.education_skills', 'product_pillars.v1', 'pillar.education_skills', 'pillar', 'education_skills', 'Education & Skills', 'Education', 'Knowledge, learning, and professional competencies', 'current', 1),
  ('product_pillars.v1.culture_ethics', 'product_pillars.v1', 'pillar.culture_ethics', 'pillar', 'culture_ethics', 'Culture & Ethics', 'Culture', 'Values, integrity, and ethical behavior', 'current', 2),
  ('product_pillars.v1.responsibility_reliability', 'product_pillars.v1', 'pillar.responsibility_reliability', 'pillar', 'responsibility_reliability', 'Responsibility & Reliability', 'Responsibility', 'Dependability, accountability, and follow-through', 'current', 3),
  ('product_pillars.v1.environment_community', 'product_pillars.v1', 'pillar.environment_community', 'pillar', 'environment_community', 'Environment & Community', 'Community', 'Social impact and community engagement', 'current', 4),
  ('product_pillars.v1.economy_contribution', 'product_pillars.v1', 'pillar.economy_contribution', 'pillar', 'economy_contribution', 'Economy & Contribution', 'Economy', 'Economic value and professional contribution', 'current', 5)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  short_name = EXCLUDED.short_name,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- No Area↔Pillar relationships. Uncertain overlaps are left unmapped on purpose.
