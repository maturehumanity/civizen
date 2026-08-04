# Contribute Page

**Project:** Civizen  
**Route:** `/contribute`  
**Version:** 2.0  
**Status:** Phase 1 implemented — hub + placeholders; live opportunity boards are Phase 2+

Canonical product/UX note for agents. Source draft: `docs/tmp/contribute_page`.

## Objective

`/contribute` is the primary hub where individuals and organizations contribute to Civizen and the Mature Humanity mission. It answers:

> **"How would you like to contribute today?"**

It is a gateway — not a duplicate of Profile, Messaging, Score, or endorsement flows. Endorsement stays on Search people results and user profiles.

## Phase 1 layout

### Ways to Contribute

| Lane | Destination |
|------|-------------|
| Volunteer | `/fund/contribute` |
| Professional Skills | `/contribute/professional` (placeholder) |
| Financial Support | `/fund` (inquiry hub only) |
| Organization Partnership | `/partners` |

### Community

| Lane | Destination |
|------|-------------|
| Community Projects | `/contribute/projects` |
| Open Tasks | `/contribute/tasks` |
| Monthly Challenges | `/contribute/challenges` |

### Knowledge

| Lane | Destination |
|------|-------------|
| Share Knowledge | `/contribute/knowledge` |
| Suggest Improvements | `/contribute/improvements` |

### Your Impact

| Lane | Destination |
|------|-------------|
| Impact summary | `/contribute/impact` (+ link to `/profile`) |

Financial copy remains inquiry-only (no checkout, tax-deductibility, or fixed returns).

## Implementation map

- Hub: `src/pages/Contribute.tsx`
- Lane registry: `src/lib/contribute-lanes.ts`
- Placeholder page: `src/pages/ContributeLane.tsx`
- Copy: `contribute.*` in `src/lib/i18n.base.ts`

## Roadmap

- **Phase 1 (current):** Hub structure; cards → existing surfaces or placeholders
- **Phase 2:** Volunteer/professional opportunities, open task board, community projects, knowledge submission
- **Phase 3:** Funding portal, org dashboard, grants, scholarships, global initiatives
- **Phase 4:** Deep Trust Profile / Contribution Score / achievements / governance integration

## Guiding principle

Contribute is the engine of participation: connect people, organizations, and institutions with meaningful opportunities. Every contribution of time, expertise, funding, knowledge, or leadership should be discoverable from this hub.
