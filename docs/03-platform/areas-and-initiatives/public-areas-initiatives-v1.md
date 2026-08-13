---
title: Civizen Public Areas & Initiatives V1
status: draft
version: 0.1
canonical: true
last_reviewed: 2026-08-13
---

# Civizen Public Areas & Initiatives V1

**Status: Working Product Specification**

**Working Draft 0.1**

This is a **platform product specification**. It is **not** institutional reading-path item 8 and is **not** published as a primary `/documents` page.

A **minimal public read-only V1** now exists at `/areas` and `/areas/:slug`. It does **not** include an `/initiatives` catalog, partner matching, contribution matching, initiative schema, or taxonomy editors. Do not expand those from this document without a separate implementation task. Live `PILLARS` remain controlling. Do not migrate product pillars.

See **Implementation note (V1)** at the end of this document.

**Related:** [Areas, Domains & Participation Framework](../../institutional/areas-domains-participation-framework.md) · [Pilot Framework](../../institutional/pilot-framework.md) · [Stakeholder & Partnership Framework](../../institutional/stakeholder-partnership-framework.md) · [Contributor Framework](../../institutional/contributor-framework.md) · [Model Evolution Architecture](../model-evolution/shared-classification-and-model-evolution-architecture.md) · [Classification Registry V1](../model-evolution/shared-classification-registry-v1.md) · [Contribute page](../../04-operations/dev/contribute-page.md) · [Information architecture and content standards](../product-design/information-architecture-and-content-standards.md) · public [`international-partnerships-and-chapters.md`](../../02-policies/institutional/international-partnerships-and-chapters.md) (`/partners`)

## Core Principle

> **Simple by default. Detailed by choice.**

People should be able to understand what Civizen is working on, where help is needed, and how they can participate without first reading extensive institutional, governance, technical, or legal documentation.

Detailed information should remain available for those who need or want it.

---

# 1. Purpose

The Areas & Initiatives experience should provide a simple public answer to four questions:

1. **What is Civizen working on?**
2. **Why does it matter?**
3. **What is already happening or being proposed?**
4. **How can I or my organization participate?**

It should become one of Civizen's primary public participation and partnership entry points.

---

# 2. Public Structure

The first public structure should remain simple:

**Areas**  
→ **Initiatives / Pilots**  
→ **What is needed**  
→ **Partner or Contribute**

Detailed methodology, governance, research, metrics, institutional architecture, and technical documentation should be available progressively rather than shown by default.

---

# 3. Areas Landing Page

Recommended route:

`/areas`

The page should provide:

- a short explanation of Areas;
- a list of current Areas;
- visible active/proposed initiative counts where useful;
- a simple way to enter each Area.

The page should not contain extensive framework text.

Example:

## Health

Improving the systems that support human health and wellbeing.

**3 initiatives**

[Explore Health]

---

## Education

Improving how people learn, develop skills, and share knowledge.

**4 initiatives**

[Explore Education]

---

The exact Area model may evolve over time.

The public page should therefore derive Areas from structured data rather than permanently hard-coding today's classifications where practical.

---

# 4. Area Detail Page

Recommended route pattern:

`/areas/:area`

An Area page should contain approximately:

### Area introduction

One short paragraph describing the purpose of the Area.

### Current work

Cards for relevant:

- initiatives;
- pilots;
- programs;
- projects where appropriate.

### What we need

Simple summary of currently needed:

- partners;
- contributors;
- expertise;
- funding;
- technology;
- research;
- implementation support.

### Participate

Clear calls to action.

Possible actions:

- **Partner with Civizen**
- **Contribute**
- **Explore initiatives**

### Learn More

Optional links to deeper:

- philosophy;
- research;
- governance;
- institutional documentation;
- pilot methodology.

Deep reference material should not dominate the initial page.

---

# 5. Initiative

An **Initiative** should be the primary public-facing work object.

It is broad enough to contain:

- research;
- projects;
- pilots;
- working groups;
- development;
- and eventual programs.

The public does not need to understand the internal distinction between every project type before engaging.

Where useful, the initiative can show whether a specific Pilot exists within it.

---

# 6. Initiative Card

Each public initiative card should be understandable in seconds.

Recommended fields:

### Title

Clear human-readable name.

### Short purpose

One or two sentences.

### Area

Relevant Area or Areas.

### Status

One simple current status.

### Needs

A short list of what is currently required.

### Actions

- **Explore**
- **Partner**
- **Contribute**

Do not place extensive technical or governance information directly on the card.

---

# 7. Initiative Status

Keep the public status vocabulary small.

Recommended V1 statuses:

- **Proposed**
- **In Development**
- **Seeking Contributors**
- **Seeking Partners**
- **Seeking Funding**
- **Pilot Ready**
- **Active**
- **Evaluation**
- **Validated**
- **Paused**
- **Completed**

An initiative may technically satisfy several conditions at once, but the public UI should emphasize the most useful current status.

Additional needs can appear separately.

---

# 8. Initiative Detail Page

Recommended route pattern:

`/initiatives/:initiative`

The default view should answer:

### What are we trying to solve?

Short explanation.

### What are we building or testing?

Short explanation.

### Current status

Clearly visible.

### What do we need?

Examples:

- university partner;
- government partner;
- research partner;
- developer;
- educator;
- health professional;
- evaluator;
- funding;
- infrastructure.

### Who can participate?

Simple description of relevant people and institutions.

### Participate

Primary actions:

- **Partner with us**
- **Contribute**
- **Support this initiative**

Only show actions that actually apply.

---

# 9. Detailed Information

Below the simple overview, users may choose to open deeper sections such as:

- Pilot Details
- Research
- Methodology
- Metrics
- Governance
- Partners
- Funding
- Progress
- Documents
- Technical Information

These should normally be collapsed, secondary, linked, or otherwise lower in visual priority.

This implements:

> **Simple by default. Detailed by choice.**

---

# 10. Partner Experience

A potential partner should not need to understand the full Civizen partnership framework first.

The expected journey should be:

**Browse Area**  
→ **Find Initiative**  
→ **See what capabilities are needed**  
→ **Choose Partner with us**

The partnership flow can then ask:

- organization;
- contact;
- relevant capability;
- Area/initiative;
- possible role;
- message.

If an existing institutional inquiry flow can support this, reuse it rather than creating another disconnected form.

---

# 11. Partnership Needs

Initiatives may display partnership needs such as:

- Academic Partner
- Research Partner
- Government Partner
- Public Institution
- Technology Partner
- Implementation Partner
- Community Partner
- Evaluation Partner
- Funding Partner
- Infrastructure Partner
- Scaling Partner

Keep the visible list relevant to the initiative.

Do not show the entire partnership taxonomy on every page.

---

# 12. Individual Contributor Experience

The individual journey should be equally simple:

**Browse Area**  
→ **Find Initiative**  
→ **See what help is needed**  
→ **Contribute**

Potential contribution needs may include:

- Developer
- Researcher
- Designer
- Educator
- Health Professional
- Writer
- Data Analyst
- Project Coordinator
- Community Organizer
- Reviewer
- Volunteer
- Subject-Matter Expert

Only relevant roles should be displayed.

---

# 13. Integration With Contribute

The Areas & Initiatives experience should not replace `/contribute`.

They should connect.

### Areas / Initiatives

answers:

> **Where does Civizen need help?**

### Contribute

answers:

> **How would I like to help?**

Both should lead into the same underlying contribution opportunities where possible.

Example:

`/contribute` → Professional Skills  
→ relevant initiatives

or:

Area → Initiative → Developer needed  
→ relevant contribution flow

Avoid building separate opportunity systems for each route.

---

# 14. Integration With Partners

The public `/partners` page may continue serving current institutional/legal partnership information.

Areas & Initiatives should provide the practical discovery layer.

Conceptually:

### Partners

How institutional participation works.

### Areas & Initiatives

Where institutional participation is currently needed.

They should cross-link without becoming duplicates.

---

# 15. Areas May Evolve

The current Area model should not be presented as eternally fixed.

Public wording should avoid unnecessary claims such as:

> Civizen permanently consists of exactly five Areas.

Instead, communicate the current structure naturally.

If Civizen later adopts a better model, the public experience should be capable of evolving without breaking historical initiatives.

---

# 16. Public vs Restricted Information

Public users should be able to discover appropriate initiatives even when the internal work is restricted.

Example:

**Civic Identity Initiative**  
Status: In Development  
Needs: Identity Security Experts

Public users may see the overview.

Authorized participants may additionally see:

- internal working documents;
- unresolved proposals;
- security details;
- private partner discussions;
- restricted pilot data.

Discovery and internal access must remain separate.

---

# 17. Signed-In Personalization

Personalization is not required for the first public version.

Later, signed-in users may receive prioritization based on:

- fields;
- skills;
- experience;
- affiliations;
- contribution interests;
- location;
- pilot participation;
- and permissions.

The public experience should still remain useful without signing in.

---

# 18. Initiative Data — Minimum V1

A future structured Initiative record should require only enough data to support real discovery.

Recommended minimum:

- title;
- slug;
- short description;
- Area(s);
- status;
- public visibility;
- needs;
- partner roles needed;
- contributor roles needed;
- primary action;
- optional detailed description.

Do not require every initiative to complete a large institutional form before it can be listed.

---

# 19. Optional Extended Data

When needed, an initiative may additionally have:

- Domains;
- geography;
- Pilot maturity;
- partners;
- funding need;
- budget;
- responsible lead;
- timeline;
- metrics;
- research;
- related documents;
- contribution opportunities;
- governance information;
- results.

These should be optional extensions.

---

# 20. Public Content Standard

Public descriptions should prefer:

- plain language;
- short paragraphs;
- clear outcomes;
- concrete needs;
- recognizable actions.

Avoid unnecessary:

- internal terminology;
- legal language;
- architecture vocabulary;
- acronyms;
- framework names.

When specialist terminology is needed, explain it.

---

# 21. Progressive Disclosure

The interface should follow this hierarchy:

### Level 1 — Understand

What is this?

### Level 2 — Participate

How can I help?

### Level 3 — Explore

What exactly is being done?

### Level 4 — Study

What research, methodology, governance, or evidence supports it?

### Level 5 — Reference

What are the full institutional, technical, legal, or implementation details?

Users should be able to stop at whichever level meets their needs.

---

# 22. Mobile Experience

Cards and Area pages should remain useful on mobile.

Prioritize:

- title;
- one-sentence purpose;
- status;
- needs;
- primary action.

Do not require extensive scrolling before users understand how they can participate.

---

# 23. Search and Filtering

V1 may begin with minimal filters.

Useful first filters may include:

- Area;
- status;
- looking for partners;
- looking for contributors.

Do not build a complex taxonomy filter interface prematurely.

---

# 24. Empty Areas

An Area may exist before it has an active initiative.

Do not fill empty Areas with invented work.

A simple state may say:

> **No public initiatives are currently listed in this Area.**

and optionally:

**Suggest an initiative**

if that pathway exists.

---

# 25. Transparency

Initiatives should accurately communicate their maturity.

Do not present:

- concepts as active pilots;
- prototypes as validated systems;
- discussions as partnerships;
- funding goals as committed funding.

Clear status helps establish credibility.

---

# 26. Existing Work

Where Civizen already has relevant:

- governance prototypes;
- voting experiments;
- contribution systems;
- Study work;
- research;
- validation programs;
- community projects;
- or other developments,

these may later become initiatives if they are suitable for public discovery.

Do not automatically publish every internal development item.

---

# 27. Initial Content Strategy

V1 should launch with a **small curated set** of meaningful initiatives.

Prefer a few initiatives that are:

- understandable;
- real;
- strategically relevant;
- and genuinely open to participation.

Do not create dozens of placeholder pilots merely to make the catalog appear large.

---

# 28. Partner Call to Action

Recommended public wording should remain practical.

Instead of:

> Become part of Civizen's multi-stakeholder institutional ecosystem.

prefer:

> **Could your organization help with this initiative?**

and then:

**Explore partnership**

The deeper partnership framework can remain available afterward.

---

# 29. Contributor Call to Action

Instead of:

> Enter the Civizen Contributor Framework.

prefer:

> **Want to help build this?**

and then:

**See contribution opportunities**

Again, institutional terminology should remain behind the experience rather than in front of it.

---

# 30. Relationship to Deep Documentation

The institutional documents remain authoritative internal/reference sources.

They should support the public experience without becoming mandatory reading.

The public interface may provide optional links such as:

- How partnerships work
- How contributions are recognized
- How Civizen governance works
- Pilot methodology
- Institutional architecture

These should be secondary.

---

# 31. Success Criteria

The V1 experience succeeds if a visitor can quickly understand:

- what Civizen is working on;
- where their interests fit;
- whether their organization could help;
- whether they personally could contribute;
- and what action to take next.

A visitor should not need to read Civizen's institutional documentation before answering those questions.

---

# 32. Design Objective

The Areas & Initiatives experience should embody Civizen's adopted principle:

> **Simple by default. Detailed by choice.**

Complexity belongs in the system where it is needed.

It should not be imposed on people before they need it.

---

# Appendix A — Repository alignment (2026-08-13)

Documentation-only at the time of writing. A later session implemented the minimal public V1 described in the **Implementation note** below.

**Product relationship:**

| Surface | Answers |
| --- | --- |
| Areas / Initiatives | Where does Civizen need help? |
| `/contribute` | How would I like to help? |
| `/partners` | How can an organization work with Civizen? |

**Internal vs public work objects:** Initiative is the preferred public-facing work concept. Internally keep Initiative / Program / Project / Pilot distinct. An Initiative may contain or reference a Pilot. Do not collapse repository objects into one schema yet.

**Classification registry:** `foundational_areas.v1` powers the public Area list via `listCurrentAreas()` (`code` slugs, short names). Initiative copy, related systems, and public blurbs live in curated content (`src/lib/areas/public-areas-content.ts`), not in the registry. Do **not** use `product_pillars.v1` as the public Area list.

**Simplest first Partner path:** Area or initiative **Partner with us** → `/fund/institutional` (`FundingInterestForm` lane `institutional`), with `?area=` and optional `?initiative=` prefilling the message. Keep `/partners` as the legal/how-partnership-works notice. Do not create a partner CRM.

**Simplest first Contribute path:** **Contribute** → `/contribute`. Do not build a universal opportunity engine or redesign `/contribute`.

**Navigation (provisional):** Areas is **not** in primary bottom nav (Home · Study · Contribute · Market · Messaging). Discovery: public footer, Contribute related link, Governance landing link. `/partners` inherits the public footer. This may evolve from usage.

**First implementation step:** completed as a read-only `/areas` landing driven by `listCurrentAreas()` plus hand-authored related-system and initiative cards. No matching engine, no new CRM, no PILLARS migration.

---

# Implementation note (V1 read-only, 2026-08-13)

Minimal public Areas V1 is implemented. Principle: **Simple by default. Detailed by choice.**

## Routes

| Route | Access | Page |
| --- | --- | --- |
| `/areas` | Public | `src/pages/Areas.tsx` |
| `/areas/:slug` | Public | `src/pages/AreaDetail.tsx` |

Slugs are Area `code` values from the current foundational registry: `health`, `education`, `culture`, `responsibility`, `environment`. Unknown slugs show a calm not-found state with a link back to `/areas`.

## Area data source

Current Area names, order, and slugs: `listCurrentAreas()` in `src/lib/classification/` (`foundational_areas.v1`).

Not used as the Area list: live product `PILLARS` (`src/lib/constants.ts`) and `product_pillars.v1`.

## Curated-content source

Single file: `src/lib/areas/public-areas-content.ts`  
Join helpers: `src/lib/areas/public-areas.ts`

Replace this later with a structured Initiative model. Do not scatter initiative definitions across components.

## Status handling

Human-readable labels via `areas.status.*` i18n. V1 uses **In Development** for Governance Solutions only. **Seeking Funding** is defined but unused — not approved for public funding outreach. Internal P0–P6 codes are not shown.

## Partner routing

**Partner with us** → `/fund/institutional?area=:slug` and, for an initiative, `&initiative=:id`. `FundingInterestForm` prefills the message when `lane === 'institutional'`. No new form or CRM.

## Contribute routing

**Contribute** → `/contribute` (existing hub; sign-in gated). No new contribution engine. No placeholder-lane deep links in V1.

## Public / restricted

Public: `/areas`, Area detail, related public systems (Governance, Civic Voting). Sign-in still required for Contribute, Study, and Governance Solutions. Working institutional frameworks, validation budgets, and unpublished funding work are not listed as initiatives.

## Navigation (provisional)

Not added to primary bottom nav.

Linked from:

- `PublicPageFooter` (also reaches `/partners` and other public pages)
- `/contribute` related link
- `/governance` landing
- Search Contents extra public surfaces

## Intentionally deferred

Initiative database schema · Pilot Portfolio · Stakeholder Map · partner/contributor matching · user Domain assignment · institutional affiliations · Area/taxonomy admin editors · Score / `PILLARS` / Study / Governance taxonomy migration · public working-framework viewer · `/initiatives/:slug` catalog · large filtering.