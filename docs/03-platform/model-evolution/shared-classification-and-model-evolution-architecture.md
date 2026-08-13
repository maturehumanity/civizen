---
title: Civizen Shared Classification & Model Evolution Architecture
status: draft
version: 0.1
canonical: true
last_reviewed: 2026-08-12
---

# Civizen Shared Classification & Model Evolution Architecture

**Status: Working Product Architecture**

**Working Draft 0.1**

This is a **platform architecture** document. It is **not** institutional reading-path item 8 and is **not** published as a primary `/documents` page.

It does **not** assert that a Model Registry, generic versioning engine, shadow/candidate-model calculations, taxonomy-governance UI, or unified Area/Domain database already exist. Do not encode the stability hierarchy into product permissions from this document.

**Related:** [Areas, Domains & Participation Framework](../../institutional/areas-domains-participation-framework.md) · [Contributor Framework](../../institutional/contributor-framework.md) · [Governance Framework](../../institutional/governance-framework.md) · [Pilot Framework](../../institutional/pilot-framework.md) · [Founder Transition & Succession Framework](../../institutional/founder-transition-succession-framework.md) · [Score page spec](../scoring-and-reputation/civizen-score-page-reorganization.md) · [Score tiers](../scoring-and-reputation/civizen-score-tiers-implementation.md) · [Environment lifecycle](../../04-operations/dev/ENVIRONMENT_LIFECYCLE.md)

## 1. Purpose

Civizen is intended to evolve.

Many of its present concepts originate in *Mature Humanity*, early Civizen design work, prototype implementation, and the current understanding of how the system should operate.

Those concepts provide a starting point.

They should not become permanent constraints merely because they were defined first.

This architecture establishes how Civizen can improve major conceptual models while preserving:

- historical continuity;
- data integrity;
- institutional accountability;
- understandable transitions;
- backward compatibility where necessary;
- and the ability to explain why the system changed.

The central principle is:

> **Civizen should preserve its purpose without permanently preserving every assumption used to pursue that purpose.**

---

# 2. Mature Humanity and Civizen

*Mature Humanity* is a foundational intellectual source for Civizen.

Civizen is a system developed from that foundation.

The relationship should not be interpreted as:

**Book defines specification → Civizen permanently implements specification**

Instead:

**Mature Humanity provides initial vision and hypotheses**  
→ **Civizen develops them into systems**  
→ **research, implementation, pilots, participation, and evidence test them**  
→ **better models emerge where appropriate**  
→ **Civizen improves**  
→ **future editions of Mature Humanity may themselves incorporate what Civizen has learned**

The relationship is therefore evolutionary and reciprocal.

---

# 3. Purpose vs Design

Civizen should distinguish several levels of stability.

## Level 1 — Foundational Purpose

Examples include Civizen's pursuit of:

- peaceful coexistence;
- human dignity;
- meaningful participation;
- shared prosperity;
- sustainability;
- responsible use of knowledge and technology;
- cooperation;
- and increasingly mature human systems.

Changes at this level should be rare and require extraordinary scrutiny.

---

## Level 2 — Foundational Principles

Examples may include:

- non-discrimination;
- distributed authority;
- transparency;
- evidence-informed decision-making;
- protection against institutional capture;
- human accountability for AI;
- meaningful contribution;
- and respect for cultural diversity.

These should be highly stable but not conceptually beyond all possible improvement.

---

## Level 3 — Institutional Models

Examples include:

- governance architecture;
- partnership models;
- contributor systems;
- economic structures;
- institutional roles;
- decision classifications;
- founder transition mechanisms.

These should evolve when better institutional arrangements are identified.

---

## Level 4 — System Models

Examples include:

- Area taxonomy;
- Domain taxonomy;
- Civizen Score model;
- contribution model;
- reputation model;
- eligibility model;
- pilot maturity model;
- role classification;
- participation model;
- matching model.

These should be deliberately designed for evolution.

---

## Level 5 — Product Implementation

Examples include:

- UI;
- navigation;
- database structures;
- algorithms;
- workflows;
- thresholds;
- filters;
- recommendation systems;
- colors;
- labels;
- screen layouts.

These should evolve continuously when better implementations become available.

---

# 4. No Early Design Becomes Permanent by Default

The existence of a concept in:

- the book;
- an early specification;
- an institutional draft;
- the codebase;
- a database enum;
- a prototype;
- or an early production system

does not itself make that concept permanently correct.

Every model should remain distinguishable from the purpose it was designed to serve.

Civizen should ask:

> Does this model still serve its intended purpose better than available alternatives?

If not, the model should be capable of improvement.

---

# 5. Stability Does Not Mean Rigidity

Civizen should avoid two opposite failures.

## Excessive Rigidity

A system becomes unable to improve because existing terminology, schemas, or early philosophy have been treated as immutable.

## Excessive Instability

A system changes so frequently or casually that participants cannot rely on it.

Civizen should instead pursue:

**stable evolution**

Changes should be:

- deliberate;
- evidence-informed;
- documented;
- appropriately governed;
- reversible where practical;
- and understandable to affected participants.

---

# 6. Model Versioning

Important conceptual models should be versionable.

Examples may include:

- taxonomy model;
- Civizen Score model;
- contribution model;
- governance model;
- eligibility model;
- reputation model;
- economic model;
- pilot model;
- institutional participation model.

Conceptually:

**Score Model v1**

may later become:

**Score Model v2**

without pretending that historical v1 scores were calculated using v2 rules.

---

# 7. Model Identity

A model should eventually be distinguishable by:

- model type;
- model version;
- effective period;
- status;
- governance approval where required;
- change rationale;
- predecessor;
- successor;
- and compatibility information.

Not every UI feature needs model versioning.

Versioning should focus on models whose changes materially alter meaning.

---

# 8. Taxonomy Evolution

The current five-Area model originating in *Mature Humanity* is:

- Health
- Education
- Culture
- Responsibility
- Environment

This should be treated as Civizen's **current foundational Area model**, not an immutable ontology.

Future evidence may justify:

- renaming an Area;
- splitting an Area;
- combining Areas;
- introducing another top-level Area;
- moving a former Area into a Domain;
- reorganizing Domains;
- or adopting a substantially improved taxonomy.

The current model remains the starting point unless and until a better one is legitimately adopted.

---

# 9. Existing Product Taxonomy

The current live product also contains historical `PILLARS` concepts that do not exactly match the current foundational Area model.

Neither system should automatically be declared permanently correct.

Instead, both should be evaluated against Civizen's evolving needs.

Existing data and behavior must remain interpretable during any transition.

---

# 10. Taxonomy Versions

A mature architecture may support conceptual versions such as:

**Area Model v1**

followed later by:

**Area Model v2**

if top-level classification materially changes.

Historical records should retain the model under which they were created.

---

# 11. Domain Evolution

Domains should be more flexible than top-level Areas.

Domains may:

- be added;
- renamed;
- reorganized;
- merged;
- split;
- aliased;
- localized;
- deprecated;
- or replaced.

Stable identifiers and historical relationships should allow past records to remain understandable.

---

# 12. Classification Relationships

When classifications change, Civizen may need relationships such as:

- renamed to;
- replaced by;
- merged into;
- split into;
- parent of;
- child of;
- related to;
- historical equivalent;
- approximate mapping.

Not every transition should be represented as an alias.

---

# 13. No False Equivalence

A new concept should not be mapped to an older concept merely to make migration easier.

For example:

**Community** should not automatically become **Environment**.

**Economy** should not automatically become **Health**.

If concepts are different, Civizen should preserve that difference and migrate their actual functions appropriately.

---

# 14. Score Model Evolution

The current Civizen Score uses dimensions including:

- Learning;
- Skills;
- Experience;
- Performance;
- Contributions.

This is Civizen's current score architecture.

It should not be treated as mathematically final.

Future evidence may demonstrate that:

- weighting should change;
- categories should change;
- new dimensions are needed;
- some dimensions should be divided;
- some should be combined;
- domain-specific scores are more useful;
- or an entirely different reputation architecture works better.

The architecture should support improvement without corrupting historical meaning.

---

# 15. Historical Score Integrity

If Score Model v2 differs materially from Score Model v1, Civizen should not simply recalculate historical values silently and pretend nothing changed.

Possible approaches may include:

- preserve historical score;
- display current score under the current model;
- record model version;
- provide recalculated comparison where useful;
- explain major methodology changes.

The appropriate approach depends on the nature of the change.

---

# 16. Contribution Model Evolution

Contribution measurement should evolve as Civizen accumulates real evidence.

The initial priority should be:

1. record contribution;
2. preserve evidence;
3. validate;
4. understand outcomes;
5. learn from real data;
6. improve measurement.

Civizen should avoid prematurely creating a universal mathematical contribution formula.

---

# 17. Governance Model Evolution

Civizen governance mechanisms should also be capable of improvement.

Examples may include future changes to:

- decision classes;
- voting mechanisms;
- delegation;
- representation;
- council structures;
- expert review;
- appeals;
- eligibility;
- or approval thresholds.

Governance evolution itself must follow legitimate governance.

---

# 18. Economic Model Evolution

Civizen's funding and economic architecture may evolve considerably depending on:

- funding sources;
- institutional participation;
- commercial activity;
- public-sector support;
- contribution patterns;
- operating costs;
- and the eventual economic role of Civizen.

Early projections or allocation models should not be treated as immutable economic law.

Binding commitments must, however, remain respected.

---

# 19. Pilot Model Evolution

Pilot classifications, maturity levels, evaluation standards, and scaling criteria should improve as Civizen gains operational experience.

A pilot framework exists to support learning.

It should therefore be capable of learning itself.

---

# 20. Model Status

Models may conceptually have statuses such as:

- Experimental
- Working
- Proposed
- Under Review
- Adopted
- Deprecated
- Superseded
- Historical

The precise implementation may differ by model type.

---

# 21. Experimental Models

Civizen should be able to test alternative models before adopting them globally.

For example:

- a revised scoring model;
- a new governance workflow;
- a new taxonomy;
- a contribution-weighting approach;
- or a different recommendation model

may first operate in:

- simulation;
- test environments;
- limited cohorts;
- pilots;
- or parallel evaluation.

---

# 22. Parallel Models

Where appropriate, Civizen may run:

**Current model**

and:

**Candidate model**

in parallel.

This can help determine whether the candidate actually performs better before migration.

Parallel operation should be particularly useful for high-impact systems.

---

# 23. Evaluation

A proposed model change should be evaluated according to relevant criteria.

These may include:

- accuracy;
- fairness;
- usability;
- outcomes;
- resilience;
- complexity;
- explainability;
- cost;
- participation;
- bias;
- abuse resistance;
- privacy;
- institutional impact;
- scalability;
- and unintended consequences.

Not every change requires all criteria.

---

# 24. Evidence for Change

Model evolution may be informed by:

- user experience;
- contributor feedback;
- pilot evidence;
- scientific research;
- institutional experience;
- expert analysis;
- audits;
- failures;
- disputes;
- simulations;
- technological changes;
- social change;
- and new knowledge.

Change should not require proof that the old model was entirely wrong.

A materially better model can justify improvement.

---

# 25. Change Rationale

Meaningful model changes should preserve a rationale.

Civizen should be able to explain:

- what changed;
- why;
- what evidence supported the change;
- who authorized it;
- what previous model it replaces;
- and what effects are expected.

This improves institutional memory.

---

# 26. Historical Continuity

Historical records should remain interpretable under the model that existed when they were created.

This may require preserving:

- version identifiers;
- original classifications;
- original scoring rules;
- historical labels;
- effective dates;
- or migration mappings.

Historical continuity should not prevent improvement.

---

# 27. Migration

Model changes should use deliberate migration.

A general migration process may include:

1. identify problem;
2. design candidate;
3. evaluate candidate;
4. define compatibility;
5. test;
6. approve where required;
7. introduce new model;
8. migrate appropriate active uses;
9. preserve historical interpretation;
10. deprecate old model;
11. evaluate results.

---

# 28. Reversibility

Where practical, important model changes should remain reversible during early deployment.

A candidate model that produces worse outcomes should be capable of rollback or redesign.

Not every institutional change can be technically reversed, but reversibility should be considered.

---

# 29. Governance Intensity Should Match Impact

Not every model change should require the same approval process.

For example:

### Low Impact

- label improvement;
- alias;
- display ordering;
- minor taxonomy correction.

### Moderate Impact

- Domain restructuring;
- recommendation methodology;
- pilot classification changes.

### High Impact

- score methodology;
- governance eligibility;
- compensation qualification;
- major top-level Area restructuring.

### Foundational Impact

- changes materially affecting Civizen's core purpose or protected principles.

Governance requirements should increase with impact.

---

# 30. Founder Role During Model Formation

During Civizen's formative stage, the founder may initiate, revise, or replace models extensively because the system remains under active design.

As individual systems become functionally self-sufficient, model evolution should increasingly operate through the relevant institutional governance processes.

This transition should occur part by part.

---

# 31. AI and Model Evolution

AI may assist Civizen by:

- analyzing outcomes;
- identifying inconsistencies;
- proposing model improvements;
- simulating alternatives;
- detecting bias;
- comparing versions;
- and identifying unintended consequences.

AI should not independently redefine Civizen's foundational purpose or adopt high-impact models.

---

# 32. Open-Source Evolution

Open-source development supports Civizen's evolutionary philosophy.

It allows:

- inspection;
- criticism;
- experimentation;
- alternative proposals;
- community contribution;
- and transparent improvement.

Open source does not mean every proposed change automatically becomes authoritative.

Adoption remains subject to appropriate processes.

---

# 33. Forks and Experimentation

Alternative implementations or experimental branches may reveal better approaches.

Civizen should be willing to learn from:

- forks;
- research implementations;
- pilot variants;
- external contributors;
- partner systems;
- and independent experiments.

The objective should be improvement rather than protection of design ego.

---

# 34. Institutional Memory

When Civizen changes direction, it should preserve enough history to understand:

- what was previously believed;
- why it was believed;
- what evidence changed;
- what alternative was adopted;
- and what happened afterward.

This turns mistakes into institutional knowledge.

---

# 35. Admitting Error

Civizen should be capable of explicitly recognizing when:

- a model was incorrect;
- an assumption was incomplete;
- a policy produced unintended consequences;
- an implementation failed;
- or a better solution became available.

Correcting an error should be treated as system maturity, not institutional failure.

---

# 36. No Founder Infallibility

The founder's initial ideas, like all Civizen models, should remain open to evidence and improvement.

Founder stewardship protects purpose and continuity during formation.

It does not establish founder infallibility.

---

# 37. No Institutional Infallibility

Likewise:

- boards;
- councils;
- experts;
- governments;
- majorities;
- institutions;
- contributors;
- and AI

can all be wrong.

Civizen's architecture should make correction possible.

---

# 38. Book Evolution

Future editions of *Mature Humanity* may incorporate learning produced through Civizen.

The book should therefore be understood as part of an evolving body of thought rather than an immutable constitutional source.

Historical editions should remain historically identifiable.

---

# 39. Documentation Evolution

Working institutional and platform documents should use clear version/status information.

When a document is superseded:

- the replacement should be identifiable;
- historical references should remain understandable;
- obsolete guidance should not remain presented as current.

---

# 40. Source-of-Truth Discipline

Evolution does not justify multiple competing current sources of truth.

For each subject Civizen should identify:

- current source;
- proposed replacement;
- historical source;
- implementation specification.

A candidate model should not silently become authoritative merely because code implementing it exists.

---

# 41. Product Schema Principle

Future schemas should prefer references to model identities over deeply hard-coded assumptions where model evolution is reasonably foreseeable.

However, Civizen should not over-engineer every early feature.

Architecture should balance:

- flexibility;
- simplicity;
- actual current needs;
- migration cost;
- and expected rate of change.

---

# 42. Minimum Viable Versioning

Civizen does not initially need a complex universal model-versioning engine.

The first implementation may simply establish:

- clear canonical current model definitions;
- explicit status/version metadata;
- historical preservation;
- migration discipline;
- and architecture that does not assume current models can never change.

More sophisticated infrastructure can be introduced when justified.

---

# 43. Model Registry Concept

A future **Model Registry** may eventually provide an institutional record of major Civizen models.

Examples:

- Area Taxonomy
- Score Model
- Contribution Model
- Governance Decision Model
- Pilot Maturity Model
- Eligibility Model

The Registry may record:

- current version;
- status;
- predecessor;
- effective date;
- documentation;
- change rationale;
- responsible governance body.

This remains a future concept.

---

# 44. Areas and Domains Product Architecture

The shared Areas and Domains architecture should be built under this evolution principle.

Its first implementation should represent Civizen's current understanding without assuming that today's top-level structure is permanent.

The architecture should therefore support later:

- renaming;
- reclassification;
- splitting;
- merging;
- deprecation;
- mapping;
- and replacement.

---

# 45. Relationship to Score Architecture

Score implementation should similarly avoid assuming that today's five score dimensions can never change.

Current product behavior remains valid until intentionally replaced.

Evolution must preserve user history and explain material methodology changes.

---

# 46. Relationship to Institutional Frameworks

Institutional working documents describe Civizen's current best design.

They are not claims that future Civizen generations may never discover better structures.

Working frameworks should therefore be understood as:

**current authoritative design direction**

rather than:

**permanent truth**.

Adopted and legally binding instruments require appropriate amendment processes.

---

# 47. Evolution and Commitments

Civizen's ability to evolve does not permit it to disregard:

- contracts;
- legal obligations;
- participant rights;
- earned compensation;
- intellectual-property commitments;
- privacy commitments;
- or other binding responsibilities.

Evolution changes future architecture.

It does not erase legitimate obligations.

---

# 48. Evolution Objective

Civizen should continuously be able to ask:

> **What do we currently believe is the best way to achieve the purpose?**

> **What evidence supports that belief?**

> **What have we learned since this model was created?**

> **Is there now a better way?**

> **Can we improve without losing accountability or historical continuity?**

The success of Civizen should not be measured by how faithfully it preserves its earliest design.

It should be measured by how effectively it continues learning while remaining faithful to the purpose that caused it to exist.

---

# Appendix A — Current implementation notes (inspection, 2026-08-12)

This appendix records what the repository already has. It does **not** authorize schema, score, permission, or UI changes.

## A.1 Score methodology and versioning

| Item | Location | Versioning today |
| --- | --- | --- |
| Current Score model (Learning, Skills, Experience, Performance, Contributions) | `src/lib/civizen-score.ts`; spec [`civizen-score-page-reorganization.md`](../scoring-and-reputation/civizen-score-page-reorganization.md) | `SCORE_CALCULATION_VERSION = 'civizen-score-v1.2'` on in-memory responses |
| Tier rules | `src/lib/civizen-score-tiers.ts`; spec [`civizen-score-tiers-implementation.md`](../scoring-and-reputation/civizen-score-tiers-implementation.md) | `TIER_RULES_VERSION = '1.0.0'` on in-memory tier results |
| Score history | Optional `history[]` on the in-memory response; fixture data only | History items *can* carry `calculationVersion`; there is **no** persisted user score-snapshot table |
| Governance eligibility snapshots | `governance_eligibility_snapshots.calculation_version` (default `phase1-v1`) | Version field exists for **eligibility**, not for the displayed Civizen Score |

Displayed scores are **recomputed** from current profile activity with current code. Historical overall/category values are **not** stored with the methodology that produced them. If the Score model changes materially, past UI numbers cannot be reconstructed without keeping old code and equivalent inputs.

## A.2 Live product `PILLARS`

`src/lib/constants.ts`: `education_skills`, `culture_ethics`, `responsibility_reliability`, `environment_community` (short name **Community**), `economy_contribution` (short name **Economy**). Used on Profile, UserProfile, EndorseFlow, `/settings/pillars`, Score “Activity by Domain” coloring. Label customizations live in **browser `localStorage`**, not a versioned taxonomy. Do **not** map Community → Environment or Economy → Health for compatibility.

## A.3 Other versionable models (docs/code, not a Model Registry)

App release (`APP_VERSION`); budget drafts (v0.1/v0.2/v0.3); funding economics model versions; document YAML `status`/`version`; protocol-versioning prototype (`src/lib/protocol/protocol-versioning.ts`); contribution events without a contribution-model version; Pilot Framework P0–P6 (conceptual).

## A.4 Candidate-model testing surfaces (not implemented for models)

Testing vs Live channels ([`ENVIRONMENT_LIFECYCLE.md`](../../04-operations/dev/ENVIRONMENT_LIFECYCLE.md)); `updates.test`; budget `draft → under_review → approved` plus `publish_flag`; civic-election sample vs live rows; document status vocabulary. There is **no** `src/lib/feature-flags.ts` product module. These can later host controlled candidate-model tests; they do not do so now.

## A.5 Recommended minimum metadata (future; not schema)

For material model changes: `model_type`, `version`, `status`, `effective_from` / `effective_to`, `predecessor_id`, `successor_id`, `methodology_doc_ref`, `change_rationale`. Prefer this minimum over a universal ontology.

## A.6 V1 shared classification registry (2026-08-13)

Minimum persisted Area/Domain foundation is implemented. See [`shared-classification-registry-v1.md`](./shared-classification-registry-v1.md).

- Tables: `classification_sets`, `classification_nodes`, `classification_aliases`, `classification_relationships`
- Seeded families: `foundational_areas.v1` (Health · Education · Culture · Responsibility · Environment) and `product_pillars.v1` (live `PILLARS` ids)
- Application library: `src/lib/classification/` — **not** wired to existing screens
- Live `PILLARS` in `src/lib/constants.ts` remain controlling
- No Community → Environment or Economy → Health mapping
- Not a Model Registry for Score / governance / economics
- Score snapshot persistence remains a separate task