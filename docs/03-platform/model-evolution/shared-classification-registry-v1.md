---
title: Shared Classification Registry V1
status: draft
version: 0.1
canonical: true
last_reviewed: 2026-08-13
---

# Shared Classification Registry V1

**Status: Working Product Architecture (implementation)**

This document describes the **minimum persisted classification foundation** shipped for Civizen Areas and Domains. It is **not** a general-purpose Model Registry for Score, Governance, or Economics. It is **not** published to `/documents`.

Parent doctrine: [Shared Classification & Model Evolution Architecture](./shared-classification-and-model-evolution-architecture.md). Institutional parent: [Areas, Domains & Participation Framework](../../institutional/areas-domains-participation-framework.md).

**Civizen preserves purpose, not assumptions.** Neither the five current Areas nor live product `PILLARS` are permanently frozen.

Existing product behavior remains unchanged. `src/lib/constants.ts` `PILLARS` remains controlling for Profile, Score Activity-by-Domain coloring, EndorseFlow, Settings/Pillars, and related UI until a separate migration is explicitly requested.

---

## 1. Design rationale

V1 persists two **distinct** classification families so later work can evolve either without pretending they are the same ontology:

| Family | Set id | Role |
| --- | --- | --- |
| `foundational_areas` | `foundational_areas.v1` | **Current Foundational Area Model** (Mature Humanity-derived) |
| `product_pillars` | `product_pillars.v1` | Mirror of live product `PILLARS` identifiers |

No Domain catalog is seeded. `parent_of` is supported so Domains can be added later from real Civizen needs.

A future public Areas landing ([Public Areas & Initiatives V1](../areas-and-initiatives/public-areas-initiatives-v1.md)) derives the Area list, slugs (`code`), and display labels from `foundational_areas.v1`. Initiative cards, needs, and public blurbs are curated separately (`src/lib/areas/public-areas-content.ts`). Do **not** use `product_pillars.v1` as the public Area list. Do **not** migrate Profile, Score, EndorseFlow, Settings/Pillars, Study, or Governance taxonomy to this registry.

Score categories (Learning, Skills, Experience, Performance, Contributions) are **not** in this registry. Future Score “Activity by Domain” may reference classification nodes; that is documentation-only for now. Score snapshot/version persistence is a separate task.

---

## 2. Schema

Four tables in `public`:

### `classification_sets`

A versioned classification set (family + version).

| Column | Purpose |
| --- | --- |
| `id` | Stable set id (`foundational_areas.v1`) |
| `family_key` | Model family |
| `version_key` | Version within the family (`v1`) |
| `status` | `draft` · `current` · `superseded` · `historical` · `experimental` |
| `is_current` | At most one current set per family (partial unique index) |
| `effective_from` / `effective_to` | Optional validity window |
| `predecessor_id` / `successor_id` | Adjacent versions |
| `methodology_doc_ref` | Document that explains the set |
| `change_rationale` | Why this version exists |

### `classification_nodes`

A node in a set. **`id` is the version-specific record. `concept_key` is the stable concept identity** (survives display-name changes).

| Column | Purpose |
| --- | --- |
| `id` | Stable machine id (`foundational_areas.v1.health`) |
| `set_id` | Owning set |
| `concept_key` | Stable concept (`area.health`, `pillar.education_skills`) |
| `node_type` | `area` · `domain` · `topic` · `pillar` |
| `code` | Code unique within the set (`health`, `education_skills`) |
| `display_name` / `short_name` / `description` | Current labels |
| `status` | `current` · `deprecated` · `superseded` |
| `replaced_by_node_id` | Optional successor node |

Unique: `(set_id, concept_key)`, `(set_id, code)`.

### `classification_aliases`

Alternative labels. **Never use an alias to equate non-equivalent concepts.**

Kinds: `display` · `search` · `localization`.

V1 seed: Responsibility Area display alias **Responsibility & Governance**.

### `classification_relationships`

Typed links between nodes. V1 relationship types:

| Type | V1 use |
| --- | --- |
| `parent_of` | Area → Domain (none seeded) |
| `related_to` | Explicit non-equivalent relatedness |
| `overlaps_with` | Explicit overlap without equivalence |
| `replaced_by` / `supersedes` | Historical succession |
| `split_into` / `merged_into` | Future split/merge mappings |

V1 seeds **zero** Area↔Pillar relationships. Community ≠ Environment. Economy ≠ Health. Uncertain overlaps are left unmapped.

Reads are public (`anon` + `authenticated` SELECT). Writes are not granted to the app role (service role / migration only). No classification admin UI.

---

## 3. Seeded models

### Foundational Area Model v1 (`foundational_areas.v1`)

| concept_key | code | Display |
| --- | --- | --- |
| `area.health` | health | Health |
| `area.education` | education | Education |
| `area.culture` | culture | Culture |
| `area.responsibility` | responsibility | Responsibility |
| `area.environment` | environment | Environment |

### Live product PILLARS v1 (`product_pillars.v1`)

| concept_key | code | Short name |
| --- | --- | --- |
| `pillar.education_skills` | education_skills | Education |
| `pillar.culture_ethics` | culture_ethics | Culture |
| `pillar.responsibility_reliability` | responsibility_reliability | Responsibility |
| `pillar.environment_community` | environment_community | **Community** |
| `pillar.economy_contribution` | economy_contribution | **Economy** |

These codes match `PILLARS` in `src/lib/constants.ts` and `pillar_type`. They do **not** replace that constant.

---

## 4. Application service

`src/lib/classification/` — in-memory catalog aligned with the SQL seed.

Existing screens must **not** import this module yet. Query helpers:

- `listCurrentAreas()`
- `listCurrentProductPillarNodes()`
- `getNodeById` / `getNodeByConceptKey`
- `listDomainsForArea` / `listChildren` (`parent_of`)
- `listRelationships` / `listAliases`
- `resolveDisplay`

`PRODUCT_PILLARS_REMAIN_CONTROLLING` documents that UI stays on `PILLARS`.

---

## 5. Migration compatibility

- No change to `endorsements.pillar` / `pillar_type`
- No change to profile, score, study, governance role domains
- No change to `/settings/pillars` `localStorage` customizations
- No Pilot Portfolio, Stakeholder Map, or user Domain assignment. Public `/areas` V1 is a separate read-only landing.

---

## 6. Adding a future classification version safely

1. Insert a new `classification_sets` row (`family_key` same, new `version_key`, `is_current = false`).
2. Insert nodes for the new set. Reuse `concept_key` when the concept continues; mint a new `concept_key` when it does not.
3. Record `replaced_by` / `split_into` / `merged_into` from old nodes to new nodes. Do **not** delete the old set.
4. Set `predecessor_id` / `successor_id` and `effective_from` / `effective_to`.
5. Flip `is_current` in one transaction (old `false`, new `true`; old `status = superseded`).
6. Keep historical records pointing at the node/set ids that existed when they were created.
7. Do not silently alias Community to Environment or Economy to Health to make migration easier.

---

## 7. Intentionally deferred

- User work / expertise / contribution-interest fields
- Institutional affiliation Domains
- Partner capabilities / Stakeholder Map
- Pilot Portfolio / public Areas catalog (V1 `/areas` landing is separate and curated)
- Broad professional Domain catalog
- Score snapshot persistence
- Wiring existing product UI (Profile, Score, Pillars, Study, Governance) to this registry
- General Model Registry for Score / governance / economics
