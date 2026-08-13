---
title: Civizen Pilot Framework
status: draft
version: 0.1
canonical: true
last_reviewed: 2026-08-12
---

# Civizen Pilot Framework

**Status: Working Pilot Framework**

**Working Draft 0.1**

This document is a **working pilot framework** and an authoritative project reference. It describes proposed pilot types, maturity levels, permission ladders, workspaces, and a future Pilot Portfolio. It does **not** assert that those processes, maturity workflows, workspaces, or portfolio records already exist as operational product features.

Proposed pilot mechanisms remain **proposed** until they are established through valid programs, agreements, and applicable law.

## Institutional hierarchy

This Framework is **subordinate to** the [Civizen Institutional Blueprint](./institutional-blueprint.md). It must operate consistently with the [Civizen Governance Framework](./governance-framework.md) and the [Stakeholder & Partnership Framework](./stakeholder-partnership-framework.md). The institutional family must not be merged.

| Document | Role |
| --- | --- |
| [**Institutional Blueprint**](./institutional-blueprint.md) | What the Civizen institutional system is. |
| [**Governance Framework**](./governance-framework.md) | How authority is distributed. |
| [**Stakeholder & Partnership Framework**](./stakeholder-partnership-framework.md) | Who Civizen works with and how relationships are structured. |
| **Pilot Framework** (this document) | What Civizen tests and implements with those participants, how pilots operate, and how evidence is evaluated. |
| [**Founder Transition & Succession Framework**](./founder-transition-succession-framework.md) | How founder authority evolves (functional self-sufficiency; not automatic access removal). |
| [**Contributor Framework**](./contributor-framework.md) | Contribution Record design. |
| [**Areas, Domains & Participation Framework**](./areas-domains-participation-framework.md) | Shared Area / Domain / Initiative classification. |

## Participant model

A Civizen participant may need to be understood through multiple dimensions:

**Person → Field/Domain → Organization/Affiliation → Pilot → Role**

The application should eventually be able to understand what fields a person works in, which organizations they are affiliated with, which pilots they participate in, which role they hold in each pilot, and what information and actions are relevant to those responsibilities.

This chain is a **conceptual product model**. It is not implemented as a unified data model in the current application. Existing skills, experience/company fields, business-account linkage, score domains, and roles are related fragments, not a substitute for this chain.

## 1. Purpose

The Civizen Pilot Framework defines how Civizen should design, assemble, authorize, operate, evaluate, and scale pilot programs.

It establishes:

- what qualifies as a Civizen pilot;
- how pilot opportunities are selected;
- how partners are matched to pilots;
- how participants are assigned;
- how access to developing areas is controlled;
- how contributions are recorded;
- how evidence is collected;
- how success and failure are evaluated;
- how governance applies during pilots;
- how funding and implementation responsibilities are structured;
- and how a successful pilot may progress toward broader implementation.

This Framework sits beneath:

1. the [**Institutional Blueprint**](./institutional-blueprint.md);
2. the [**Governance Framework**](./governance-framework.md);
3. the [**Stakeholder & Partnership Framework**](./stakeholder-partnership-framework.md).

The Stakeholder & Partnership Framework defines **who Civizen may work with and how those relationships are structured**.

The Pilot Framework defines **what Civizen tests with those partners and how the work should be conducted and evaluated**.

---

## 2. What Is a Civizen Pilot?

A Civizen pilot is a limited, structured implementation designed to test one or more Civizen systems in a real or sufficiently realistic environment.

A pilot should normally test a defined hypothesis, capability, process, institutional arrangement, technology, governance mechanism, service model, or combination of these.

A pilot is not merely:

- a presentation;
- an endorsement;
- an announcement;
- a partnership memorandum;
- a demonstration without evaluation;
- or a general commitment to collaborate.

A pilot should produce evidence.

---

## 3. Purpose of Piloting

Civizen pilots should help answer questions such as:

- Does the proposed system solve the intended problem?
- Can people use it effectively?
- Do institutions have sufficient capacity to operate it?
- Does the governance model function as intended?
- Does the technology work reliably?
- Are incentives producing the desired behavior?
- Are there unintended consequences?
- Can the system operate lawfully?
- Is the cost justified by the outcome?
- Can the model be replicated or scaled?

Pilots should reduce uncertainty before large-scale implementation.

---

## 4. Pilot Principles

### 4.1 Evidence Before Scale

Civizen should avoid expanding systems simply because they are attractive conceptually.

Major expansion should be supported by evidence.

### 4.2 Small Enough to Learn, Large Enough to Matter

A pilot should be limited enough to manage and evaluate but substantial enough to produce meaningful evidence.

### 4.3 Real Participants Where Appropriate

Where safe, lawful, and practical, Civizen should test systems with real participants rather than relying entirely on simulations.

### 4.4 No Universal Pilot

Civizen should not assume that one pilot design can serve every partner or every domain.

Different partners have different:

- capabilities;
- populations;
- jurisdictions;
- infrastructure;
- funding;
- research capacity;
- and strategic interests.

Civizen should maintain multiple pilot models.

### 4.5 Multi-Stakeholder Collaboration

Where useful, pilots should combine complementary institutions rather than depend on one organization to perform every role.

### 4.6 Transparent Learning

A pilot should be allowed to fail.

Failure should produce useful knowledge rather than pressure to conceal negative results.

### 4.7 Participant Protection

No pilot should prioritize experimentation over participant safety, rights, privacy, or informed participation.

---

## 5. Pilot Categories

Civizen pilots may operate in many domains.

Initial categories may include:

- Education
- Health
- Culture
- Responsibility / Governance
- Environment
- Employment and Work
- Skills and Professional Development
- Contribution Systems
- Community Coordination
- Civic Participation
- Voting and Elections
- Identity and Trust
- Artificial Intelligence
- Technology Infrastructure
- Economic Systems
- Financial Systems
- Public Services
- Research
- Institutional Collaboration
- Local Community Systems
- Environmental Management

These categories should remain extensible.

One pilot may span several domains.

Domain/category classification and **pilot type** (§6) answer different questions and must not be collapsed into one field. Domain describes **what field** the pilot concerns. Type describes **what kind of experiment or implementation** it is.

---

## 6. Pilot Types

Pilots may also be classified by what they primarily test. This type field is independent of the domain/category field in §5.

### 6.1 Concept Validation Pilot

Tests whether an idea is useful and understandable.

### 6.2 Product Pilot

Tests an application feature or system.

### 6.3 Service Pilot

Tests delivery of a Civizen-supported service.

### 6.4 Institutional Pilot

Tests cooperation between Civizen and one or more institutions.

### 6.5 Governance Pilot

Tests participation, proposal, voting, delegation, council, review, or other governance mechanisms.

Current application civic voting (`/governance/voting`) and governance proposals (`/governance`) are **one possible Governance Pilot / governance mechanism**, not the entirety of Civizen governance. See [`civic-voting-system-design-v0.1.md`](../01-governance/participation/civic-voting-system-design-v0.1.md) and the [Governance Framework](./governance-framework.md).

### 6.6 Research Pilot

Tests hypotheses or methodologies.

### 6.7 Community Pilot

Tests Civizen systems in a defined local population.

### 6.8 Public-Sector Pilot

Tests Civizen systems with government or public institutions.

### 6.9 Economic Pilot

Tests incentives, compensation, exchange, funding, contribution, or economic mechanisms.

### 6.10 Infrastructure Pilot

Tests technical or institutional infrastructure needed for wider deployment.

### 6.11 Integrated Pilot

Tests several Civizen systems together.

---

## 7. Pilot Maturity Levels

Pilots should progress through maturity levels rather than immediately moving from idea to large-scale deployment.

A provisional sequence is:

### P0 — Concept

The idea is defined but not yet operationally tested.

### P1 — Prototype

The system works in a limited test environment.

### P2 — Controlled Pilot

A small number of real or representative participants test the system under controlled conditions.

### P3 — Institutional Pilot

The system is operated with one or more real partner institutions.

### P4 — Multi-Stakeholder Pilot

Several complementary institutions and participant groups operate the system together.

### P5 — Expansion Pilot

The system is tested across a larger population, geography, or institutional network.

### P6 — Validated Model

Evidence supports broader adoption or replication.

These levels are not automatic certifications.

Progression should depend on evidence.

This P0–P6 sequence is **conceptual**. It is not an application workflow. Existing related stage models include civic-election sample vs live rows, budget `draft → under_review → approved`, document status vocabulary, and community/program readiness — none of which is this maturity ladder.

---

## 8. Pilot Selection

Civizen should prioritize pilots that provide strong learning value and strategic importance.

Selection criteria may include:

- relevance to Civizen's mission;
- urgency of the problem;
- potential social benefit;
- feasibility;
- cost;
- partner readiness;
- participant availability;
- research value;
- measurable outcomes;
- implementation capacity;
- ability to generate transferable knowledge;
- scalability;
- risk;
- legal feasibility;
- technical readiness;
- and funding availability.

Prestige should not substitute for usefulness.

---

## 9. Pilot Definition

Every substantial pilot should have a defined Pilot Charter or equivalent record.

It should identify, as appropriate:

- pilot name;
- problem;
- objective;
- hypothesis;
- scope;
- domain;
- geography;
- target participants;
- participating partners;
- pilot lead;
- duration;
- technology involved;
- governance model;
- funding;
- roles;
- risks;
- safeguards;
- metrics;
- data requirements;
- contribution-recording method;
- evaluation process;
- and scaling criteria.

---

## 10. Pilot Coalition

A pilot may involve a coalition of complementary roles.

A typical structure may include:

**Civizen Pilot Lead**  
+ **Implementation Partner**  
+ **Academic / Research Partner**  
+ **Government or Public Partner**  
+ **Community / Participant Partner**  
+ **Technology Partner**  
+ **Funding Partner**  
+ **Independent Evaluation Partner**

Not every pilot requires all of these roles.

One institution may perform multiple roles.

---

## 11. Pilot Leadership

Every pilot should have clear responsibility.

A Pilot Lead should be accountable for:

- coordination;
- scope;
- schedule;
- implementation;
- documentation;
- issue escalation;
- contribution records;
- and reporting.

Pilot leadership should not imply unlimited governance authority.

Major decisions remain subject to the applicable governance process.

---

## 12. Participant Field and Domain Assignment

Civizen should eventually allow users to identify the fields or domains in which they:

- work;
- contribute;
- conduct research;
- provide professional expertise;
- participate in pilots;
- or wish to help develop Civizen.

Examples may include:

- Health
- Education
- Culture
- Governance
- Environment
- Technology
- AI
- Economics
- Law
- Research
- Employment
- Community Development

Users may belong to multiple fields.

Field assignment should support:

- relevant pilot discovery;
- task assignment;
- access to development materials;
- appropriate proposal visibility;
- expert review eligibility;
- working-group participation;
- relevant notifications;
- and contribution attribution.

Field affiliation should not automatically grant unrestricted editing or decision authority.

These field examples are **not exhaustive**. Existing related fragments in the product include Study domains, score **Activity by Domain**, profile skills, and experience areas. They do not yet constitute this Framework's field-assignment model. See [`civizen-score-page-reorganization.md`](../03-platform/scoring-and-reputation/civizen-score-page-reorganization.md), [`role-domains-and-maturity-thresholds-v0.1.md`](../01-governance/roles-and-permissions/role-domains-and-maturity-thresholds-v0.1.md) (governance stewardship domains, not occupational field assignment), and [`05-research/README.md`](../05-research/README.md).

---

## 13. Institutional Affiliation

Users should also be able to associate themselves with organizations they:

- work for;
- represent;
- collaborate with;
- study at;
- volunteer with;
- or participate through during a Civizen partnership.

Civizen may extend its existing workplace/company relationship model to support institutional participation.

A user may have:

- a primary employer;
- one or more professional affiliations;
- a pilot-specific partner affiliation;
- academic affiliation;
- government affiliation;
- nonprofit affiliation;
- or independent contributor status.

Institutional affiliation should be verifiable where required.

The current application supports personal profiles, **business accounts** (`linked_accounts` with `relationship_type = business`, typically `biz_*` usernames), and experience **company** names on profile experience entries. That company/employer relationship is a starting point that may later be generalized to university, government, nonprofit, institutional partner, pilot partner, or professional-association affiliation. It is **not** yet a general affiliation or pilot-membership model. Do not treat a business profile as automatic partnership or governance authority.

---

## 14. User Role Within a Pilot

Pilot participation should identify the user's actual role.

Examples include:

- Pilot Lead
- Researcher
- Developer
- Subject-Matter Expert
- Reviewer
- Participant
- Community Representative
- Institutional Representative
- Evaluator
- Data Analyst
- Program Manager
- Policy Specialist
- Designer
- Educator
- Healthcare Professional
- Technical Administrator
- Volunteer

A person may hold several roles where appropriate.

---

## 15. Information Visibility

Civizen should follow a principle of **relevant visibility**.

Users should primarily see:

- information relevant to their role;
- information relevant to their domain;
- information relevant to their pilot;
- information they are authorized to review;
- information they may reasonably need to contribute;
- and public information available to everyone.

Sections under active development do not necessarily need to be visible to all Civizen users.

This helps avoid:

- unnecessary complexity;
- premature exposure of unfinished work;
- accidental modification;
- disclosure of sensitive material;
- and information overload.

---

## 16. Permission Levels

Visibility and interaction should be distinct.

A user may be permitted to:

1. **Discover**
2. **View**
3. **Comment**
4. **Suggest**
5. **Contribute**
6. **Edit**
7. **Review**
8. **Approve**
9. **Administer**

These permissions may depend on:

- role;
- domain;
- pilot membership;
- expertise;
- institutional affiliation;
- governance eligibility;
- contribution history;
- legal restrictions;
- and data sensitivity.

Civizen should avoid a single global permission level wherever more precise access is appropriate.

This nine-step ladder is a **conceptual** model. The current application uses role-based app permissions plus founder/admin bootstrap access. Visibility is not the same as edit authority. See [`governance-permission-model-v0.1.md`](../01-governance/roles-and-permissions/governance-permission-model-v0.1.md) and [`roles-and-permissions/`](../01-governance/roles-and-permissions/).

---

## 17. Relevant-Access Principle

Civizen should attempt to show people the information they may reasonably need rather than exposing every internal system to every user.

Access should follow:

**Need + Role + Relevance + Responsibility + Authorization**

rather than simply:

**High score = full access**

A Civizen score may contribute to eligibility or trust decisions, but should not become the only mechanism determining access.

A single Civizen score should not automatically determine all visibility or access. Score may remain one eligibility signal where appropriate. Current governance-eligibility drafts that use a minimum score as an **entry gate** are eligibility rules, not a substitute for **Need + Role + Relevance + Responsibility + Authorization**. See [`citizen-status-model-v0.1.md`](../01-governance/participation/citizen-status-model-v0.1.md).

---

## 18. Development Visibility

Features, policies, systems, and pilot sections that are still being developed may remain limited to:

- assigned contributors;
- relevant experts;
- partner representatives;
- pilot teams;
- reviewers;
- and authorized Civizen staff or stewards.

As work matures, visibility may expand.

A provisional lifecycle may include:

**Internal Draft → Working Group → Pilot Participants → Public Review → Adopted / Public**

Not every item requires every stage.

This lifecycle is **conceptual**. Do not force current content into it yet. Related existing states include: funding-budget `draft → under_review → approved` with separate `publish_flag`; contribution/content draft vs published; civic-election sample vs live rows; Testing vs Live app channels; `updates.test` gated features; document status vocabulary (`draft`, `current`, `superseded`). See [`03-budget-module-spec.md`](../04-operations/funding-and-budget/03-budget-module-spec.md) and [`content-status-retrieval-rules.md`](../04-operations/contributor-processes/content-status-retrieval-rules.md).

---

## 19. Pilot Matching

Potential partners and users should be matched to pilots based on relevant characteristics.

For institutions, these may include:

- domain;
- geography;
- infrastructure;
- population;
- research capacity;
- funding;
- implementation capability;
- technology;
- regulatory role;
- and strategic interest.

For individuals, these may include:

- field;
- skills;
- experience;
- professional role;
- institutional affiliation;
- past contributions;
- availability;
- and relevant eligibility.

Matching should assist human selection rather than automatically determine participation.

---

## 20. Pilot Recruitment

Participants may enter pilots through:

- open application;
- institutional nomination;
- invitation;
- professional qualification;
- contributor matching;
- geographic eligibility;
- community selection;
- random selection where scientifically appropriate;
- or other defined methods.

Selection procedures should be documented.

---

## 21. Pilot Governance

Each pilot should identify which decisions are:

- operational;
- technical;
- professional/scientific;
- program-level;
- economic;
- governance-related;
- or constitutional.

The Civizen Governance Framework should determine how those decisions are handled.

A pilot should not create an isolated governance system inconsistent with Civizen's broader governance principles.

---

## 22. Pilot Proposals

New pilots may be proposed by:

- Civizen;
- contributors;
- institutions;
- governments;
- research organizations;
- communities;
- expert councils;
- or other eligible participants.

A proposal should normally explain:

- the problem;
- proposed solution;
- expected participants;
- required partners;
- resources;
- risks;
- expected outcomes;
- and why a pilot is justified.

---

## 23. Pilot Approval

Approval requirements should depend on:

- cost;
- risk;
- participant impact;
- legal exposure;
- data sensitivity;
- domain;
- scale;
- funding source;
- and institutional commitments.

A small software usability pilot should not require the same approval pathway as a health or public-sector pilot.

---

## 24. Ethics and Participant Protection

Pilots involving people should consider:

- informed participation;
- privacy;
- safety;
- discrimination;
- accessibility;
- vulnerable populations;
- data protection;
- withdrawal rights;
- conflicts;
- and unintended harm.

Research involving human subjects may require formal ethics or institutional review depending on the nature of the activity and applicable law.

---

## 25. Pilot Data

Pilots should collect only the data reasonably necessary for:

- operation;
- evaluation;
- safety;
- research;
- accountability;
- and improvement.

Pilot documents should identify:

- data collected;
- purpose;
- access;
- retention;
- security;
- ownership/control;
- partner access;
- and whether data may be reused.

---

## 26. Contribution Records

Pilot work should feed Civizen's Contribution Record.

Pilot-specific records should preserve, at minimum: the **pilot**, **role**, **paid or unpaid status**, and attribution to both institutions and individuals where appropriate.

The canonical Record design is the [Contributor Framework](./contributor-framework.md) (principle in the [Institutional Blueprint](./institutional-blueprint.md) §13.2). Do not implement automatic compensation or contribution scoring from this Framework.

---

## 27. Paid and Additional Contribution

Pilot records should distinguish:

- normal paid work;
- contracted deliverables;
- institutional work obligations;
- voluntary contribution;
- donated resources;
- and extraordinary contribution beyond paid scope.

A person's regular professional responsibility should not automatically be treated as additional uncompensated contribution.

Meaningful additional contribution may be recorded separately.

---

## 28. Pilot Funding

Pilot funding may come from:

- grants;
- public funding;
- foundations;
- universities;
- institutional partners;
- donations;
- program sponsors;
- Civizen;
- commercial entities;
- or other appropriate sources.

See [`04-operations/funding-and-budget/README.md`](../04-operations/funding-and-budget/README.md) and the planning program [`14-pre-major-build-validation-program-v0.1.md`](../04-operations/funding-and-budget/14-pre-major-build-validation-program-v0.1.md). That validation program is a funding/validation workstream, not a Pilot Portfolio.

Funding agreements should define:

- permitted use;
- reporting;
- ownership or licensing;
- restrictions;
- conflicts;
- and whether unused funds must be returned.

Funding does not create automatic Civizen-wide governance authority.

---

## 29. Pilot Budget

Each substantial pilot should maintain an appropriate budget.

Budget categories may include:

- personnel;
- technology;
- research;
- participant support;
- infrastructure;
- travel;
- professional services;
- evaluation;
- legal/compliance;
- communications;
- equipment;
- data;
- contingency;
- and administration.

Costs should be evaluated against outcomes.

---

## 30. Success Metrics

A pilot should define success before results are known.

Metrics may include:

- participation;
- adoption;
- user satisfaction;
- completion;
- learning outcomes;
- health outcomes;
- economic impact;
- efficiency;
- time savings;
- cost reduction;
- accessibility;
- trust;
- safety;
- reliability;
- contribution;
- institutional adoption;
- environmental impact;
- governance quality;
- and other domain-specific outcomes.

---

## 31. Baselines and Comparison

Where possible, Civizen should compare pilot outcomes against:

- pre-pilot baselines;
- existing systems;
- control or comparison groups;
- prior institutional performance;
- or other reasonable benchmarks.

Pilots should avoid claiming success merely because participants completed the program.

---

## 32. Qualitative Evidence

Not all useful evidence is numeric.

Pilots should also consider:

- participant interviews;
- expert assessment;
- case studies;
- implementation observations;
- complaints;
- unintended effects;
- institutional feedback;
- and community responses.

---

## 33. Failure Criteria

Pilots should define conditions that may justify:

- modification;
- suspension;
- redesign;
- or termination.

Examples include:

- safety concerns;
- severe participant harm;
- legal incompatibility;
- unmanageable cost;
- low adoption;
- poor outcomes;
- security failure;
- data misuse;
- or inability to implement reliably.

Stopping a failed pilot should be treated as responsible governance.

---

## 34. Monitoring

Active pilots should maintain appropriate monitoring.

This may include:

- progress;
- milestones;
- budget;
- participation;
- incidents;
- outcomes;
- contribution records;
- partner performance;
- risk;
- and deviations from scope.

Monitoring should be proportional to the pilot.

---

## 35. Pilot Evaluation

A pilot should conclude with an evaluation.

The evaluation should address:

- what was attempted;
- what happened;
- results;
- limitations;
- costs;
- participant experience;
- failures;
- unexpected outcomes;
- partner performance;
- technical issues;
- governance lessons;
- and recommended next steps.

Important pilots should preferably include independent evaluation.

---

## 36. Pilot Outcomes

A completed pilot may result in:

### Validate

Evidence supports continuation or expansion.

### Validate With Changes

The concept works but requires modification.

### Continue Testing

Evidence is insufficient.

### Redesign

Important assumptions were incorrect.

### Suspend

Conditions do not currently support continuation.

### Terminate

Evidence indicates the model should not continue.

These outcomes should be documented.

---

## 37. Scaling Criteria

A pilot should not scale automatically.

Possible scaling requirements include:

- successful outcomes;
- participant acceptance;
- acceptable cost;
- legal feasibility;
- technical reliability;
- institutional capacity;
- sustainable funding;
- acceptable risk;
- documented operating procedures;
- and evidence that results can reasonably transfer to a larger environment.

---

## 38. Replication

Before large-scale deployment, Civizen should consider whether successful results can be reproduced:

- with another institution;
- in another population;
- in another geography;
- or under different operational conditions.

Replication helps distinguish a robust system from a one-time success.

---

## 39. Multi-Pilot Strategy

Civizen Phase 1 does not need to consist of one universal pilot.

It may involve several pilots operating in parallel.

For example:

- Education
- Governance
- Contribution / Work
- Community
- Technology
- Environment

Parallel pilots may share infrastructure and partners where useful.

---

## 40. Pilot Portfolio

Civizen should eventually maintain a Pilot Portfolio containing:

- proposed pilots;
- pilots seeking partners;
- pilots seeking funding;
- approved pilots;
- active pilots;
- completed pilots;
- validated pilots;
- paused pilots;
- and discontinued pilots.

This may later become an operational application feature.

The Pilot Portfolio is **not yet implemented** as an application schema or UI. Existing related records (validation program budgets, civic elections, governance proposals, funding inquiries) are **not** a Pilot Portfolio. Do not invent named pilots in product ledgers from this documentation update.

### Areas & Pilots Catalog (future product direction)

Civizen should eventually provide a public **Areas & Pilots Catalog** through which individuals and institutional partners can browse:

**Area → Initiative / Pilot → Status → Needs → Partnership Roles → Individual Contribution Roles**

Example statuses might eventually include: Proposed, Prototype, Seeking Partners, Seeking Funding, Pilot Ready, Active, Evaluation, Validated.

Partners should be able to discover which Civizen areas and pilots fit their capabilities. Individuals should eventually receive a personalized version based on field/domain, skills, affiliation, pilot membership, role, relevance, and permissions.

This Catalog would be a **discovery surface over the Pilot Portfolio**, not a competing parent framework. Semantic support is the [Areas, Domains & Participation Framework](./areas-domains-participation-framework.md). The public product specification is [Public Areas & Initiatives V1](../03-platform/areas-and-initiatives/public-areas-initiatives-v1.md) (**Initiative** as the public-facing work object; a Pilot may sit inside an Initiative). Do not build the UI or schema from this note. Related: §§41–42 below and the [Stakeholder & Partnership Framework](./stakeholder-partnership-framework.md) (who could participate).

---

## 41. Pilot Discovery for Partners

Partners should be able to identify pilot opportunities relevant to their:

- fields;
- geography;
- institutional capabilities;
- strategic interests;
- available resources;
- and populations.

This allows partnership outreach to focus on concrete opportunities.

---

## 42. Pilot Discovery for Individuals

Individuals should eventually be able to discover pilots relevant to:

- their field;
- skills;
- experience;
- location;
- organization;
- interests;
- and contribution opportunities.

Visibility should respect authorization and development-stage restrictions.

---

## 43. Organization and User Relationships

The Civizen system should increasingly understand three related but distinct concepts:

**Who the person is**  
**What field or role they work in**  
**Which organization or partner they are participating through**

These relationships should support:

- access;
- collaboration;
- attribution;
- pilot assignment;
- governance eligibility;
- contribution records;
- communications;
- and institutional reporting.

This is the same participant chain: **Person → Field/Domain → Organization/Affiliation → Pilot → Role**. The current company/employer experience field and business-account link cover only fragments of Organization/Affiliation.

---

## 44. Workspaces

A mature Civizen pilot may have a dedicated workspace containing relevant:

- documents;
- tasks;
- proposals;
- discussions;
- metrics;
- partner information;
- decisions;
- participant lists;
- contribution records;
- and results.

Access should follow role and relevance.

Dedicated pilot workspaces are **not** a current product feature. Related existing surfaces include the Funding workspace ([`funding-workspace-information-architecture.md`](../03-platform/product-design/funding-workspace-information-architecture.md)), contribute placeholders ([`contribute-page.md`](../04-operations/dev/contribute-page.md)), and governance pages.

---

## 45. Public and Restricted Information

Pilot materials may be categorized as:

- Public
- Participant
- Partner
- Working Group
- Expert Review
- Confidential
- Administrative

The objective is not secrecy.

The objective is appropriate information access.

As materials mature, public visibility should generally increase where appropriate.

---

## 46. Communication

Pilot participants should have clear channels for:

- questions;
- collaboration;
- incident reporting;
- suggestions;
- concerns;
- disputes;
- and feedback.

Important issues should not depend entirely on informal communication.

---

## 47. Pilot Disputes

Pilot disputes may concern:

- responsibilities;
- contribution attribution;
- data;
- intellectual property;
- funding;
- participant treatment;
- partner performance;
- or governance.

Resolution should follow:

- the applicable agreement;
- Civizen governance procedures;
- institutional policies;
- and applicable law.

---

## 48. Pilot Documentation

Civizen should preserve sufficient institutional memory to understand why pilots succeeded or failed.

Important records should include:

- pilot charter;
- agreements;
- decisions;
- methodology;
- data definitions;
- outcomes;
- evaluation;
- changes;
- incidents;
- contribution records;
- and lessons learned.

---

## 49. Learning Across Pilots

Pilots should not remain isolated projects.

Civizen should progressively build shared knowledge about:

- what works;
- what fails;
- cost;
- governance;
- implementation;
- participation;
- technology;
- institutional collaboration;
- and scaling.

This knowledge should improve future pilots.

---

## 50. Relationship to the Stakeholder Map

The Stakeholder Map should help answer:

> Who could participate in this pilot?

The Pilot Portfolio should help answer:

> What could we build or test with this stakeholder?

The two systems should eventually operate together.

The Stakeholder Map is defined in the [Stakeholder & Partnership Framework](./stakeholder-partnership-framework.md). Neither the Map nor the Portfolio is implemented. There is currently no join between partnership/inquiry records and pilot/program records. Do not invent matching logic from this documentation update.

---

## 51. Relationship to Governance

Pilot governance must follow the Governance Framework.

A pilot may test new governance methods, but experimental mechanisms should be clearly identified as pilots rather than automatically becoming Civizen-wide governance rules.

Current civic elections and governance proposals are one possible **Governance Pilot / governance mechanism**, not the complete Civizen governance system. See the [Governance Framework](./governance-framework.md) and [`civic-voting-system-design-v0.1.md`](../01-governance/participation/civic-voting-system-design-v0.1.md).

---

## 52. Relationship to Contribution

Pilot participation should generate evidence for the Contribution Record.

Contribution records should not automatically determine:

- compensation;
- governance power;
- or status.

They provide evidence to systems that make those determinations according to adopted rules.

Pilot activity should feed the **Contribution Record** in the [Contributor Framework](./contributor-framework.md). This Framework does not implement automatic compensation or a scoring algorithm.

---

## 53. Relationship to Funding

Pilots should provide concrete funding opportunities.

Instead of seeking funding only for Civizen as an abstract whole, Civizen may seek support for specific:

- research;
- infrastructure;
- pilots;
- evaluation;
- participant populations;
- technology;
- or expansion.

This can make institutional collaboration and funding more actionable.

Partner funding must not automatically grant governance rights. See the [Governance Framework](./governance-framework.md) §2.4 and the [Stakeholder & Partnership Framework](./stakeholder-partnership-framework.md). Planning indexes: [`funding-and-budget/README.md`](../04-operations/funding-and-budget/README.md) · [`funding-and-monetary/README.md`](../01-governance/funding-and-monetary/README.md).

---

## Related existing documents

This Framework is the parent institutional reference for pilots. Concrete existing plans remain operational children; they are not erased or replaced.

| Topic | File |
| --- | --- |
| Institutional Blueprint | [`institutional-blueprint.md`](./institutional-blueprint.md) |
| Governance Framework | [`governance-framework.md`](./governance-framework.md) |
| Stakeholder & Partnership Framework | [`stakeholder-partnership-framework.md`](./stakeholder-partnership-framework.md) |
| Community readiness / program availability | [`community-readiness-and-program-availability-framework.md`](../01-governance/participation/community-readiness-and-program-availability-framework.md) |
| Country activation (superseded for public language) | [`country-activation-framework-v0.1.md`](../01-governance/country-activation/country-activation-framework-v0.1.md) |
| Civic voting design (one possible Governance Pilot) | [`civic-voting-system-design-v0.1.md`](../01-governance/participation/civic-voting-system-design-v0.1.md) |
| Citizen status / eligibility | [`citizen-status-model-v0.1.md`](../01-governance/participation/citizen-status-model-v0.1.md) |
| Governance permission model | [`governance-permission-model-v0.1.md`](../01-governance/roles-and-permissions/governance-permission-model-v0.1.md) |
| Role domains (stewardship, not occupational fields) | [`role-domains-and-maturity-thresholds-v0.1.md`](../01-governance/roles-and-permissions/role-domains-and-maturity-thresholds-v0.1.md) |
| Governance implementation (historical) | [`governance-implementation-roadmap-v0.1.md`](../04-operations/dev/governance-implementation-roadmap-v0.1.md) |
| Pre-major-build validation program | [`14-pre-major-build-validation-program-v0.1.md`](../04-operations/funding-and-budget/14-pre-major-build-validation-program-v0.1.md) |
| Independent review / domain study briefs | [`15-independent-review-and-domain-study-briefs-v0.1.md`](../04-operations/funding-and-budget/15-independent-review-and-domain-study-briefs-v0.1.md) |
| Contributor Framework (Record design) | [`contributor-framework.md`](./contributor-framework.md) |
| Contributor recognition (public) | [`contributor-participation-and-recognition.md`](../02-policies/institutional/contributor-participation-and-recognition.md) |
| Areas, Domains & Participation Framework | [`areas-domains-participation-framework.md`](./areas-domains-participation-framework.md) |
| Public Areas & Initiatives V1 | [`public-areas-initiatives-v1.md`](../03-platform/areas-and-initiatives/public-areas-initiatives-v1.md) |
| Shared Classification & Model Evolution Architecture | [`shared-classification-and-model-evolution-architecture.md`](../03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md) |
| Contributor compensation planning | [`21-contributor-compensation-and-in-kind-framework-v0.1.md`](../04-operations/funding-and-budget/21-contributor-compensation-and-in-kind-framework-v0.1.md) |
| Contribute page | [`contribute-page.md`](../04-operations/dev/contribute-page.md) |
| Score / reputation | [`civizen-score-page-reorganization.md`](../03-platform/scoring-and-reputation/civizen-score-page-reorganization.md) |
| Research materials | [`05-research/README.md`](../05-research/README.md) |
| Public partnerships notice (`/partners`) | [`international-partnerships-and-chapters.md`](../02-policies/institutional/international-partnerships-and-chapters.md) |
| Founder Transition & Succession Framework | [`founder-transition-succession-framework.md`](./founder-transition-succession-framework.md) |
| Long-term pathway | [`recognized-planetary-citizenship-pathway.md`](../00-foundation/recognized-planetary-citizenship-pathway.md) |

This Working Pilot Framework is **canonical/internal project reference**. It is not added to public `/documents` navigation.

## 54. Pilot Objective

The purpose of a Civizen pilot is not to prove that Civizen was right.

The purpose is to discover what works.

A successful pilot may confirm a Civizen concept.

An equally valuable pilot may reveal that a concept must be redesigned.

Civizen should scale evidence, not assumptions.