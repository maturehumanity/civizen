---
title: Civizen Areas, Domains & Participation Framework
status: draft
version: 0.1
canonical: true
last_reviewed: 2026-08-12
---

# Civizen Areas, Domains & Participation Framework

**Status: Working Areas, Domains & Participation Framework**

**Working Draft 0.1**

This document is a **working institutional design** for Civizen's shared Area / Domain / Topic / Initiative / Role taxonomy. It does **not** assert that a unified database model, Areas & Pilots Catalog, or taxonomy-governance UI already exist. A minimal public `/areas` V1 landing is implemented separately and is not this Catalog.

Do not collapse Area, Domain, Topic/Specialization, Initiative/Program/Pilot, and Role into one category field. Do not automatically elevate Technology, AI, Economics, Law, or Research into new foundational pillars.

Health, Education, Culture, Responsibility, and Environment are Civizen's **current foundational Area model**, originating from the *Mature Humanity* framework. They are **not** permanently immutable. See [Shared Classification & Model Evolution Architecture](../03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md).

This Framework is **not** published as a primary `/documents` page. A future public Areas experience should be derived from it.

## Institutional hierarchy

This Framework is **subordinate to** the [Civizen Institutional Blueprint](./institutional-blueprint.md). It provides semantic support for the [Pilot Framework](./pilot-framework.md), [Contributor Framework](./contributor-framework.md), [Stakeholder & Partnership Framework](./stakeholder-partnership-framework.md), and [Governance Framework](./governance-framework.md). These documents must not be merged.

| Document | Role |
| --- | --- |
| [**Institutional Blueprint**](./institutional-blueprint.md) | What the Civizen institutional system is. |
| [**Governance Framework**](./governance-framework.md) | How authority is distributed. |
| [**Stakeholder & Partnership Framework**](./stakeholder-partnership-framework.md) | Who Civizen works with. |
| [**Pilot Framework**](./pilot-framework.md) | What Civizen tests with those participants. |
| [**Founder Transition & Succession Framework**](./founder-transition-succession-framework.md) | How founder authority evolves. |
| [**Contributor Framework**](./contributor-framework.md) | How contribution is recorded and recognized. |
| **Areas, Domains & Participation Framework** (this document) | Shared classification for Areas, Domains, Topics, Initiatives, and Roles. |

## Shared semantic model

| Term | Meaning |
| --- | --- |
| **Area** | Broad sphere of human life / civilization-level concern. **Current Foundational Area Model:** Health, Education, Culture, Responsibility, Environment (evolvable; historical continuity required). |
| **Domain** | Professional, scientific, technical, institutional, or functional field. Cross-cutting unless philosophy establishes otherwise. |
| **Topic / Specialization** | Narrower subject. |
| **Initiative / Program / Pilot** | Actual organized work. Initiative = broader undertaking; Program = ongoing organized body of work; Pilot = bounded test; Project = defined deliverable-based work. |
| **Role** | What a participant does. |

**Responsibility** is the foundational Area. It may be displayed as **Responsibility & Governance** where that improves understanding.

## 1. Purpose

The Civizen Areas, Domains & Participation Framework defines the shared classification system through which Civizen organizes:

- areas of human activity;
- professional and subject domains;
- pilots and initiatives;
- institutional capabilities;
- user expertise and work interests;
- contribution opportunities;
- governance responsibilities;
- working groups;
- tasks;
- research;
- and personalized information access.

Its purpose is to prevent each Civizen subsystem from inventing a separate and incompatible taxonomy.

The same underlying Areas and Domains should progressively support:

**People → Organizations → Pilots → Contributions → Opportunities → Governance → Knowledge**

while allowing each subsystem to use the level of detail it actually needs.

---

## 2. Why a Shared Model Is Necessary

Civizen already contains or proposes multiple classification systems, including:

- the five foundational Civizen pillars;
- Study domains;
- activity domains;
- skills;
- experience areas;
- governance role domains;
- pilot categories;
- partnership domains;
- contribution domains;
- professional fields;
- and future Areas & Pilots.

These systems describe related concepts but are not necessarily identical.

Without a shared model, Civizen risks creating situations where:

- a user identifies as working in Education but cannot discover Education pilots;
- a university is classified as an Education partner but cannot be matched to Education opportunities;
- contribution is recorded under one taxonomy while governance eligibility uses another;
- Study content uses different categories from professional expertise;
- or the same concept appears under multiple incompatible names.

This Framework establishes the common semantic layer.

---

## 3. Core Principle

Civizen should distinguish between:

**Area**  
A broad sphere of human life, need, responsibility, or civilization-level activity.

**Domain**  
A more specific professional, scientific, technical, institutional, or functional field within or across Areas.

**Topic / Specialization**  
A narrower subject within a Domain.

**Initiative / Program / Pilot**  
Actual work being undertaken within one or more Areas and Domains.

**Role**  
What a person or institution does within that work.

These concepts should not be collapsed into one universal category field.

---

## 4. Current Foundational Area Model

Civizen's **current foundational Area model**, originating from the *Mature Humanity* framework, is:

1. **Health**
2. **Education**
3. **Culture**
4. **Responsibility**
5. **Environment**

These represent broad dimensions of a mature civilization and should remain recognizable across Civizen **until a better structure is legitimately adopted**.

They are **not** a permanently immutable ontology and **not** permanently canonical.

Civizen may later improve this top-level taxonomy when:

- research;
- pilots;
- contributor experience;
- institutional experience;
- evidence;
- better reasoning;
- or legitimate governance

demonstrates a better structure.

Future evolution may include renaming, reordering, splitting, merging, adding, removing, or reclassifying Areas or Domains.

Historical continuity must be preserved. Records should remain interpretable under the model that existed when they were created.

See [Shared Classification & Model Evolution Architecture](../03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md). Product `PILLARS`, score behavior, schemas, and stored values are **not** changed by this Framework.

**Current product note (do not migrate in this documentation task):** `src/lib/constants.ts` `PILLARS` currently uses `education_skills`, `culture_ethics`, `responsibility_reliability`, `environment_community` (short name Community), and `economy_contribution`. That product set is **not** identical to this current foundational Area model (Health is absent; Economy is a pillar; Environment is labeled Community). Score categories (Learning, Experience, Skills, Performance, Contributions) are a third five-way split — the **current Score model**, also evolvable. Neither the Area model nor live `PILLARS` automatically wins; later architecture should be capable of evaluating and migrating **both**. Do not map Community → Environment or Economy → Health merely for compatibility.

They are not intended to contain every professional specialization directly.

---

## 5. Responsibility as an Area

The Responsibility Area includes systems through which individuals and institutions accept responsibility for shared life.

It may encompass domains such as:

- governance;
- civic participation;
- law;
- justice;
- ethics;
- public administration;
- accountability;
- institutional design;
- rights and responsibilities;
- conflict resolution;
- community coordination;
- and public decision-making.

Where user-facing clarity requires it, Civizen may display this Area as:

**Responsibility & Governance**

while preserving **Responsibility** as the foundational concept.

---

## 6. Cross-Cutting Domains

Some fields do not belong exclusively to one foundational Area.

Examples include:

- Technology
- Artificial Intelligence
- Economics
- Work and Employment
- Finance
- Law
- Public Policy
- Research
- Data
- Infrastructure
- Communications
- Design
- Security
- Logistics
- Community Development

These should normally function as **cross-cutting Domains** rather than requiring Civizen to create a separate foundational Area for every profession.

For example:

**Artificial Intelligence** may contribute to:

- Health;
- Education;
- Culture;
- Responsibility;
- Environment.

Likewise, Economics may affect every Area.

---

## 7. Area and Domain Relationship

A Domain may belong to:

- one primary Area;
- several Areas;
- or all Areas.

Examples:

**Medicine**  
Primary Area: Health

**Educational Technology**  
Areas: Education + Technology-related cross-cutting domain

**Environmental Law**  
Areas: Environment + Responsibility  
Domains: Law + Environmental Policy

**AI for Public Governance**  
Area: Responsibility  
Domains: AI + Governance + Public Policy

The system should support many-to-many relationships.

---

## 8. Domain Hierarchy

Domains should support hierarchical organization where useful.

Example:

**Health**
→ Medicine  
→ Public Health  
→ Mental Health  
→ Nutrition  
→ Healthcare Systems  
→ Medical Research

Within Medicine:

→ Cardiology  
→ Neurology  
→ Pediatrics  
→ Oncology  
→ etc.

Civizen should not require the entire hierarchy to be defined before the system becomes useful.

The taxonomy should grow with actual needs.

---

## 9. Extensible Taxonomy

The Area system should remain stable enough to provide continuity.

The Domain system should remain extensible.

New Domains may emerge because of:

- scientific development;
- new technologies;
- new professions;
- pilot requirements;
- institutional partnerships;
- community needs;
- or better understanding of existing fields.

Adding a Domain should not require redesigning the entire Civizen architecture.

---

## 10. Canonical Domain Identity

Each Domain should eventually have a stable machine-readable identity independent of its display name.

Conceptually, a Domain may include:

- unique identifier;
- canonical name;
- display name;
- description;
- parent Domain;
- related Areas;
- aliases;
- status;
- localization;
- and relevant metadata.

This allows terminology to improve without breaking historical records.

No schema implementation is required by this Framework.

---

## 11. User Field / Domain Profile

Civizen users should eventually be able to identify the Areas and Domains in which they:

- currently work;
- have professional experience;
- have expertise;
- study;
- conduct research;
- contribute;
- want to contribute;
- or have an active interest.

These relationships should not all mean the same thing.

For example:

**Works in:** Public Health  
**Expertise:** Epidemiology  
**Studying:** AI  
**Contributes to:** Education  
**Interested in:** Environment

Civizen should preserve these distinctions where they matter.

**Current profile (gaps; do not schema-migrate here):** users can record free-text skills (`profile_skills_entries`), experience entries with areas/positions/company names (`profile_experience_entries`), education/institutions, and profession-credential requests. There is **no** structured assignment of work field vs expertise vs study vs research vs contribution field vs Area interest matching this section. Selecting a skill or experience area is not verified expertise. Study domains are a learning catalog, not a user field assignment.

---

## 12. Primary and Additional Domains

A user may identify:

- one or more primary Domains;
- additional Domains;
- specializations;
- and Areas of contribution interest.

Civizen should not assume that a person has only one profession or field.

---

## 13. Evidence of Expertise

Selecting a Domain does not automatically establish expertise.

Civizen should distinguish between:

- self-identified interest;
- work field;
- demonstrated experience;
- verified skill;
- professional credential;
- institutional role;
- and validated expertise.

This distinction becomes particularly important for:

- expert review;
- governance;
- health;
- safety;
- law;
- scientific standards;
- and high-impact decision-making.

---

## 14. Organization Domains

Organizations should also be associated with Areas and Domains.

An organization may have many.

For example, a comprehensive university may participate in:

- Health;
- Education;
- Technology;
- Economics;
- Governance;
- Environment;
- Culture;
- and Research.

A specialized organization may have only one or two relevant Domains.

Institutional classification should therefore reflect actual capability rather than organizational label alone.

---

## 15. User Affiliation and Domain Context

A user's Domain may sometimes be connected to a particular affiliation.

For example:

**Person:** User  
**Organization:** University A  
**Relationship:** Researcher  
**Domain:** Public Health

The same person may separately have:

**Organization:** Civizen  
**Relationship:** Volunteer Contributor  
**Domain:** Governance Technology

This enables Civizen to understand context rather than assuming one global occupational identity.

---

## 16. Pilots and Areas

Every pilot should be associated with at least one Area.

A pilot may span several Areas.

Example:

**Healthy School Environment Pilot**

Areas:

- Health
- Education
- Environment

Domains:

- Nutrition
- School Administration
- Public Health
- Environmental Health

This allows pilots to appear in multiple relevant discovery paths without being duplicated.

---

## 17. Pilot Domains

Pilots should also identify the Domains necessary to operate them.

These may include:

- subject matter;
- professional expertise;
- technology;
- research;
- implementation;
- evaluation;
- governance;
- and funding expertise.

This enables partner and contributor matching.

---

## 18. Area Pages

Civizen should eventually maintain public pages for major Areas.

An Area page may contain:

- purpose;
- current challenges;
- relevant Civizen principles;
- Domains;
- active initiatives;
- proposed pilots;
- research;
- standards;
- working groups;
- contribution opportunities;
- partner opportunities;
- and validated results.

The public experience should help users understand not only what Civizen believes, but what Civizen is actually working on.

---

## 19. Areas & Pilots Catalog

Civizen should eventually provide a public **Areas & Initiatives** experience (working product name may still say Areas & Pilots Catalog).

The public product specification is [Public Areas & Initiatives V1](../03-platform/areas-and-initiatives/public-areas-initiatives-v1.md). A minimal public `/areas` landing is implemented; the Areas & Pilots Catalog is **not** built. Public UX follows **Simple by default. Detailed by choice.**

The basic structure should be:

**Area**  
→ **Initiative / Pilot**  
→ **Status**  
→ **Objectives**  
→ **Needs**  
→ **Partnership Roles**  
→ **Contribution Roles**

Example:

**Education**

**Shared Learning Standards Pilot**  
Status: Seeking Partners

Needs:

- Academic Partner
- Research Partner
- Education Authority
- Technology Partner
- Funding Partner
- Evaluator

Individual opportunities:

- Curriculum Expert
- Researcher
- Data Analyst
- Developer
- Educator

---

## 20. Catalog Audiences

The same underlying catalog should serve different audiences.

### Public Visitors

See publicly available Areas, initiatives, objectives, and progress.

### Potential Institutional Partners

See:

- partnership needs;
- institutional roles;
- pilot requirements;
- geography;
- funding needs;
- implementation needs;
- and partnership entry points.

### Contributors

See:

- open work;
- skills needed;
- professional opportunities;
- volunteer opportunities;
- research;
- tasks;
- and contribution roles.

### Existing Pilot Participants

See additional relevant working materials according to permissions.

The system should personalize the experience without creating disconnected catalogs.

---

## 21. Initiative vs Pilot

Not every Area activity should necessarily be called a Pilot.

Civizen should distinguish:

**Initiative**  
A broader undertaking intended to solve or develop something.

**Program**  
An organized ongoing body of work.

**Pilot**  
A bounded implementation designed to test something.

**Project**  
A defined body of work with deliverables.

A Pilot may exist inside an Initiative or Program.

The public catalog may therefore eventually be broader than merely a "Pilot list."

A useful public concept may be:

**Areas & Initiatives**

with pilot status shown within individual initiatives.

However, **Areas & Pilots Catalog** may remain the working product name while the structure develops.

---

## 22. Initiative Status

Potential initiative statuses may include:

- Concept
- Proposed
- Research
- Prototype
- Seeking Contributors
- Seeking Partners
- Seeking Funding
- Pilot Ready
- Active Pilot
- Evaluation
- Validated
- Scaling
- Active Program
- Paused
- Completed
- Discontinued

Not every item must pass through every status.

Status should describe reality rather than marketing.

---

## 23. Partner Discovery

Institutional partners should be able to browse Areas and identify where their capabilities are relevant.

For example:

**University**

Filters:

- Education
- Health
- Research
- AI

The system may surface pilots requiring:

- faculty;
- research;
- student participation;
- evaluation;
- facilities;
- or funding.

A partner should not have to understand the entire Civizen institutional architecture before discovering a practical way to participate.

---

## 24. Contributor Discovery

Individuals should be able to browse contribution opportunities by:

- Area;
- Domain;
- skill;
- role;
- location;
- organization;
- pilot;
- remote/on-site availability;
- paid/unpaid status;
- and access eligibility.

Eventually, Civizen may proactively recommend opportunities.

---

## 25. Personalized Relevance

A signed-in user should not need to see every unfinished Civizen activity.

Relevant content may be prioritized based on:

- selected Areas;
- work Domains;
- skills;
- experience;
- affiliations;
- pilot membership;
- current roles;
- contribution history;
- location;
- and permissions.

This implements the broader Civizen principle:

**Need + Role + Relevance + Responsibility + Authorization**

---

## 26. Visibility and Discovery Are Different

A user may be able to discover that an initiative exists without receiving access to its internal working materials.

For example:

A public visitor may see:

**Health Identity Pilot — In Development**

but only assigned participants may see:

- internal documents;
- unresolved design questions;
- partner discussions;
- restricted data;
- or implementation tools.

This distinction allows Civizen to remain transparent without exposing inappropriate internal material.

---

## 27. Development Areas

Civizen may maintain Areas and initiatives that are publicly known but whose internal development sections remain visible only to:

- assigned contributors;
- relevant professionals;
- partners;
- pilot participants;
- reviewers;
- and authorized stewards.

As systems mature, visibility may expand.

---

## 28. Working Groups

Areas and Domains may have Working Groups.

Examples:

**Education → Learning Standards Working Group**

**Health → Healthcare Access Working Group**

**Responsibility → Governance Technology Working Group**

Working Groups may include:

- contributors;
- experts;
- institutional representatives;
- researchers;
- affected communities;
- and Civizen stewards.

Participation should be role- and relevance-based.

---

## 29. Expert Councils

Expert Councils should also use the shared Domain taxonomy.

For example:

**Health Council**

may include relevant Domains such as:

- Medicine;
- Public Health;
- Nutrition;
- Health Systems;
- Mental Health.

Council qualification should require more than selecting a Domain on a profile.

Relevant evidence and governance rules remain necessary.

---

## 30. Governance Proposals

Governance proposals should be capable of identifying:

- relevant Area;
- Domains;
- affected populations;
- affected organizations;
- and required expert review.

This can help Civizen route proposals through appropriate governance processes.

---

## 31. Contribution Records

Contribution Records should reference the same Area/Domain identities where relevant.

This enables Civizen to understand:

- where someone contributed;
- what expertise they demonstrated;
- which Areas benefited;
- which initiatives they worked on;
- and where they may be useful next.

---

## 32. Civizen Score

Area and Domain classifications may help contextualize Civizen Score activity.

For example:

A contributor may have substantial verified activity in:

**Technology → Software Engineering**

without implying equivalent expertise in:

**Health → Medicine**

Civizen should avoid treating a global score as universal professional competence.

---

## 33. Study

Study materials should progressively map into the shared Area/Domain taxonomy where practical.

This would allow Civizen to connect:

**Learn → Demonstrate Skill → Contribute → Build Experience → Assume Responsibility**

within a common field context.

Study should not be forced into inappropriate categories merely for taxonomy consistency.

---

## 34. Skills

Skills are not Domains.

For example:

**Domain:** Software Engineering

Possible Skills:

- TypeScript
- Database Design
- System Architecture
- Testing

Likewise:

**Domain:** Public Health

Possible Skills:

- Epidemiological Analysis
- Program Evaluation
- Health Communication

Skills may apply across multiple Domains.

---

## 35. Experience

Experience records may reference Domains.

Existing free-text position and company information should not necessarily be removed.

Structured Domain association can complement existing experience records.

---

## 36. Roles

Roles describe responsibility, not subject matter.

Example:

**Domain:** Education

**Role:** Researcher

or:

**Domain:** Education

**Role:** Pilot Lead

The same Role can appear in many Domains.

---

## 37. Taxonomy Governance

The shared taxonomy should itself be governed.

Changes may include:

- adding Domains;
- merging duplicates;
- renaming Domains;
- changing hierarchy;
- assigning aliases;
- deprecating outdated terminology;
- splitting or replacing concepts;
- or, with greater scrutiny, evolving the current foundational Area model.

Ordinary Domain taxonomy maintenance should not require constitutional governance.

Material changes affecting Civizen's current foundational Areas should receive stronger review.

Proportional governance (see [Governance Framework](./governance-framework.md) decision classes and [Model Evolution Architecture](../03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md)):

- low-impact label/alias changes;
- moderate Domain/model changes;
- high-impact score, eligibility, or economic model changes;
- foundational-purpose changes.

Do not implement taxonomy-governance UI from this Framework.

Historical records must remain interpretable under the model in force when they were created.

---

## 38. Domain Stewardship

Mature Domains may have responsible stewards or working groups.

Their tasks may include:

- maintaining terminology;
- reviewing classifications;
- identifying missing subdomains;
- linking research;
- organizing pilots;
- and helping route expertise.

Domain stewardship should not imply ownership of the Domain.

---

## 39. Localization

Area and Domain labels should support multiple languages.

The canonical identity should remain stable even where localized names differ.

This is particularly important for international expansion.

---

## 40. Aliases and Terminology

Professional terminology varies across countries and institutions.

Civizen should support aliases.

For example:

- Human Resources
- HR
- People Operations

may relate to the same or closely related Domain.

Aliases should improve discovery without unnecessarily duplicating Domains.

---

## 41. Historical Stability

If a Domain is renamed or reorganized, historical Contribution Records, pilots, and affiliations should remain understandable.

The system should avoid destroying historical meaning through taxonomy changes.

---

## 42. Open Classification

Civizen should not attempt to define every possible human field centrally from the beginning.

Users and institutions should eventually be able to suggest:

- new Domains;
- improved classifications;
- aliases;
- or relationships.

Changes should be reviewed rather than automatically accepted.

---

## 43. Search and Discovery

The shared taxonomy should strengthen search.

A search for:

**Climate**

may surface:

- Environment Area;
- Climate Science Domain;
- environmental pilots;
- relevant experts;
- research;
- organizations;
- tasks;
- and contribution opportunities

according to visibility permissions.

---

## 44. Organizations and Matching

The Stakeholder Map should use the same Area and Domain identities.

This enables matching such as:

**Pilot requires:**  
Public Health + Data Science + Municipal Government

Potential partners can then be identified from actual recorded capabilities.

---

## 45. Pilot Matching

The Pilot Portfolio should use the same taxonomy.

A pilot may specify:

**Areas:** Education + Responsibility

**Required Domains:**  
Education Policy  
Software Engineering  
Impact Evaluation  
Public Administration

The Stakeholder Map can then identify organizations with matching capabilities.

Contributor profiles can identify individuals with relevant experience.

---

## 46. Matching Is Advisory

Automated matching should assist selection.

It should not automatically appoint:

- partners;
- experts;
- leaders;
- reviewers;
- or governance participants.

Human and institutional judgment remains necessary.

---

## 47. Public Area Ownership

No institution, country, company, or individual owns a Civizen Area.

A partner may lead work in an Area or Domain under a defined role.

That must not create permanent exclusive authority over that part of Civizen.

---

## 48. Area Sponsorship

An institution may fund work in an Area.

Funding should be transparently identified.

Sponsorship should not allow the sponsor to redefine the Area or control unrelated work.

---

## 49. Data Model Principle

The future application architecture should avoid creating duplicate hard-coded Area lists independently in:

- Study;
- Governance;
- Score;
- Pilots;
- Partnerships;
- Contributions;
- Search;
- and Profiles.

Where practical, these systems should reference shared canonical Area/Domain identities.

**V1 implementation (infrastructure only):** persisted registry tables and `src/lib/classification/` exist. See [Shared Classification Registry V1](../03-platform/model-evolution/shared-classification-registry-v1.md). Existing product `PILLARS` remain controlling. This Framework does not migrate screens to the registry.

The eventual taxonomy implementation should support:

- stable identities where useful;
- taxonomy versions where materially needed;
- aliases;
- deprecation;
- replacement;
- split/merge mappings;
- and historical interpretation.

Do not over-engineer versioning before a first shared identity table exists. Do not create that database architecture from this Framework.

This does not mean every subsystem must immediately use identical UI.

---

## 50. Migration Principle

Existing taxonomies should not be abruptly replaced.

Civizen should first:

1. inventory existing classification systems;
2. identify overlap;
3. establish canonical concepts;
4. map existing values;
5. preserve historical data;
6. migrate incrementally;
7. and eliminate duplication only when safe.

---

## 51. Product Architecture

A mature Civizen product may eventually expose shared entities such as:

**Area**

**Domain**

**Initiative**

**Pilot**

**Organization**

**Person**

**Role**

**Contribution**

**Opportunity**

with relationships connecting them.

The precise database architecture should be designed separately.

---

## 52. Example Relationship

A future relationship might conceptually look like:

**Person**  
→ works in **Public Health**  
→ affiliated with **University X**  
→ participates in **Healthy Communities Pilot**  
→ as **Researcher**  
→ performs **Impact Evaluation**  
→ creates a verified **Contribution Record**

The Pilot itself may belong to:

**Health + Environment**

and require:

**Public Health + Environmental Science + Data Analysis**

This common semantic structure enables Civizen's subsystems to work together.

---

## 53. Areas & Pilots as a Partnership Surface

The public Areas & Pilots experience should become one of Civizen's main institutional-partnership entry points.

Instead of approaching an institution only with:

> Partner with Civizen.

Civizen can say:

> Here are the areas we are developing. Here are the initiatives that need partners. Here are the capabilities currently needed. Choose where your institution can contribute.

This makes partnership development concrete and scalable.

---

## 54. Areas & Pilots as a Contribution Surface

The same architecture should enable an individual to see:

> Here are the areas Civizen is working on. Here are the problems and pilots where your skills may help.

The system should increasingly connect people with meaningful work rather than merely display project information.

---

## 55. Public Transparency

Where appropriate, Area pages should show:

- what Civizen is working on;
- what remains undeveloped;
- what is being tested;
- who is participating;
- what evidence exists;
- what help is needed;
- and what progress has been made.

Civizen should be comfortable showing unfinished work as unfinished.

---

## 56. Relationship to the Institutional Blueprint

The Institutional Blueprint defines the institutions through which Civizen operates.

This Framework provides the shared classification system through which institutional work can be organized.

See [Institutional Blueprint](./institutional-blueprint.md).

---

## 57. Relationship to the Governance Framework

The Governance Framework determines authority.

Areas and Domains help determine relevance and expertise.

Being associated with a Domain does not itself grant governance authority.

See [Governance Framework](./governance-framework.md).

---

## 58. Relationship to Stakeholder & Partnership Framework

The Stakeholder Map should classify institutional capabilities using this shared taxonomy.

This enables reliable partner-to-pilot matching.

See [Stakeholder & Partnership Framework](./stakeholder-partnership-framework.md).

---

## 59. Relationship to Pilot Framework

The Pilot Framework defines how pilots operate.

This Framework defines how pilots are classified and discovered across Areas and Domains.

See [Pilot Framework](./pilot-framework.md). The Areas & Pilots Catalog remains a future discovery surface, not a current product. Public product spec: [Public Areas & Initiatives V1](../03-platform/areas-and-initiatives/public-areas-initiatives-v1.md) (minimal `/areas` V1 landing exists; Catalog is not built).

---

## 60. Relationship to Contributor Framework

The Contributor Framework defines how meaningful contribution is recorded.

This Framework provides the Area and Domain context in which contribution occurred.

See [Contributor Framework](./contributor-framework.md).

---

## 61. Relationship to Founder Transition

Domain-level transition from founder supervision should eventually be capable of referencing the same shared Domains or operational components.

Founder transition should remain based on functional self-sufficiency, not merely taxonomy or development percentage.

See [Founder Transition & Succession Framework](./founder-transition-succession-framework.md). Do not reduce founder bootstrap access from this Framework.

---

## 62. Relationship to Mature Humanity

*Mature Humanity* is a foundational intellectual source and parent vision of Civizen. It is **not** an immutable software or institutional specification.

The current foundational Area model originates there. Civizen may improve beyond individual structures proposed in the book when evidence and legitimate governance support a better design.

The intended loop is:

**Book → informs Civizen → Civizen tests and learns → models improve → future book editions may incorporate learning**

Do not weaken Civizen's overall purpose when a particular taxonomy or score model evolves.

---

## 63. Relationship to Shared Classification & Model Evolution Architecture

How major conceptual models evolve — including this Area model, the Score model, and contribution measurement — is described in the [Shared Classification & Model Evolution Architecture](../03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md) (working product architecture; not institutional reading-path item 8).

---

## 64. Framework Objective

The goal is to allow Civizen to understand:

> **What are we working on?**

> **Who knows about it?**

> **Which organizations can help?**

> **Which pilots are active?**

> **What work is needed?**

> **Who is contributing?**

> **Who should see or interact with this work?**

> **What should this person or institution work on next?**

A shared Areas and Domains model should become the connective tissue between Civizen's knowledge, people, institutions, governance, contribution, and implementation systems.