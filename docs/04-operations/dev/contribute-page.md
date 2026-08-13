# Contribute Page

**Project:** Civizen  
**Route:** `/contribute`  
**Version:** 2.1  
**Status:** Phase 1 hub live; Slice 1 Education-to-Contribution live at `/contribute/professional`

Canonical product/UX note for agents. Source draft: `docs/tmp/contribute_page`.

## Objective

`/contribute` is the primary hub where individuals and organizations contribute to Civizen and the Mature Humanity mission. It answers:

> **"How would you like to contribute today?"**

A future **Areas & Initiatives** surface answers a different question — **where** Civizen needs help — and should connect here rather than replace this hub. Spec: [`docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md`](../../03-platform/areas-and-initiatives/public-areas-initiatives-v1.md). Public UX follows **Simple by default. Detailed by choice.** ([IA standards](../../03-platform/product-design/information-architecture-and-content-standards.md) §2). Minimal public `/areas` V1 is implemented (read-only). Do not redesign `/contribute` from the Areas spec.

It is a gateway — not a duplicate of Profile, Messaging, Score, or endorsement flows. Endorsement stays on Search people results and user profiles.

## Phase 1 layout

### Ways to Contribute

| Lane | Destination |
|------|-------------|
| Volunteer | `/fund/contribute` |
| Professional Skills | `/contribute/professional` (Slice 1 Education-to-Contribution) |
| Financial Support | `/fund` (inquiry hub only) |
| Organization Partnership | `/partners` |

Organization Partnership currently opens the public **International Partnerships and Chapters** notice. The working institutional parent for partnerships is [`docs/institutional/stakeholder-partnership-framework.md`](../../institutional/stakeholder-partnership-framework.md). Concrete programs and experiments sit under the [`Pilot Framework`](../../institutional/pilot-framework.md). Contribution Record *design* is the [`Contributor Framework`](../../institutional/contributor-framework.md); public `/contribute/policy` remains adopted contributor policy. Shared Area/Domain taxonomy is the [`Areas, Domains & Participation Framework`](../../institutional/areas-domains-participation-framework.md). A future public **Areas & Initiatives** experience is specified in [`public-areas-initiatives-v1.md`](../../03-platform/areas-and-initiatives/public-areas-initiatives-v1.md) (minimal `/areas` V1 is read-only; not `/documents`). How those models may later evolve: [`Shared Classification & Model Evolution Architecture`](../../03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md). A future **Areas & Pilots Catalog** is recorded under the Pilot Framework (Pilot Portfolio §40) and is not built yet. Do not treat `/partners` as a partner CRM, Stakeholder Map, or Pilot Portfolio.

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
- Slice 1 Education-to-Contribution: `src/pages/contribute/ProfessionalOpportunities.tsx`, `OpportunityDetail.tsx`, `OpportunityForm.tsx`
- Domain + RPC wrappers: `src/lib/opportunities.ts`, `src/lib/opportunities-api.ts`
- Schema: `supabase/migrations/20260813010000_education_to_contribution_opportunities.sql`, `20260813020000_opportunity_applicant_identities.sql`
- Copy: `contribute.*` in `src/lib/i18n.base.ts`

## Slice 1 (Education-to-Contribution)

Live at `/contribute/professional`. Flow: discover open opportunity → essential details → apply → organizer accept/decline → participant works → submit evidence (description + URL/reference) → evaluator reviews → completed + verified → derived `profile_contribution_events` row (`source_table = opportunity_participations`). Publisher is a `profiles` row (personal or business via `linked_accounts`). No organizations table, payments, file upload, LMS, or Pilot Portfolio.

Progressive disclosure: cards show title, short purpose, a few skills, effort/location, and status or next action. Requirements, criteria, evidence detail, and administration stay behind detail views.

Verified work may appear as skill evidence and demonstrated experience. It does not overwrite declared skills, education, credentials, or employment history.

Organizer review shows each applicant’s existing profile identity (`full_name`, `username`, avatar, link to `/user/:profileId`) through RPC `list_opportunity_applicant_identities`. Identity is not copied onto participation rows, and `profiles` RLS is unchanged. Optional quality and impact scores (0–100) are behind evaluation “More details” and pass through `evaluate_opportunity_work`.

**Authorization verification:** Automated RLS tests against a local Supabase database are in `src/lib/opportunities-auth.integration.test.ts`. They stay skipped unless `CIVIZEN_OPPORTUNITY_AUTH_TEST=1` and loopback `CIVIZEN_LOCAL_SUPABASE_*` credentials are set. This environment has no Civizen local Supabase (app URL is remote; another project occupies local 54321). Manual SQL for the same cases: `scripts/db/local-dev-only/verify-education-to-contribution-auth.sql` (transaction + `ROLLBACK`; not for the remote application database).

## Roadmap

- **Phase 1 (current):** Hub structure; cards → existing surfaces or placeholders
- **Slice 1 (current):** Education-to-Contribution at `/contribute/professional`
- **Later slices:** other pilot models, open task board, community projects, knowledge submission — do not broaden Slice 1 here
- **Phase 3:** Funding portal, org dashboard, grants, scholarships, global initiatives
- **Phase 4:** Deep Trust Profile / Contribution Score / achievements / governance integration

## Guiding principle

Contribute is the engine of participation: connect people, organizations, and institutions with meaningful opportunities. Every contribution of time, expertise, funding, knowledge, or leadership should be discoverable from this hub.
