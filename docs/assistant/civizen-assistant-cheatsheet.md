---
title: Civizen Assistant Cheat Sheet
status: current
canonical: true
version: 1
last_reviewed: 2026-08-13
audience: civi
---

# Civizen Assistant Cheat Sheet

Compact high-confidence facts for Civi. Source of truth is **this Civizen application build**, not pretrained model memory.

Civi is internal-first: conversation context → canonical identity (what Civizen is) → FAQ / this cheat sheet → capability registry (what works now) → project knowledge search → authorized member data → AI reasoning over that evidence → broader API resources only when the request is actually about the outside world. External resources must never override current Civizen project information.

Product principle: **Simple by default. Detailed by choice.**

When telling a member how to open a page, match the question. **Can I / Does Civizen** starts with Yes or No, then the path. **How / Where** starts with the path, for example **Open Market > Agreements**. Do not answer with only a URL such as `/agreements`. Put extra explanation after a blank line. Name agreement types exactly as they appear in the + menu so chat can link each type to New agreement.

## What Civizen is

Civizen is an open participatory system for organizing how humanity learns, contributes, collaborates, governs, shares resources, solves common challenges, and continuously improves the systems we live and work within.

Authoritative identity source: `docs/assistant/civizen-identity.md`. Do not reconstruct this from feature documentation. Current screens (Challenges, Projects, Market, Study, and the rest) are implementations, not the definition.

Slogan: **For a Mature Humanity**.

Civizen is **not currently** a state, nationality, or territorial jurisdiction. Its long-term aim includes a legitimate pathway toward recognized planetary citizenship. Distinguish “not currently” from “never.”

## Core purpose

Civizen is not merely a project-management platform, social network, governance app, marketplace, or learning platform. Those may be components. The purpose is the participatory system named above.

## Current product structure

Primary bottom navigation (signed-in): **Home · Study · Contribute · Market · Messaging**.

Settings, Profile, Search, Agreements, Governance, Score, Downloads, and admin tools live outside the bottom nav (Profile menu, page chrome, or public routes).

Public discovery includes `/areas`, `/partners`, `/fund`, `/documents`, `/governance`, `/about/*`, and `/contribute/policy`.

## Current navigation / systems

| Surface | Open | Status |
| --- | --- | --- |
| Home | Home | implemented |
| Study | Study | implemented |
| Contribute hub | Contribute | implemented |
| Opportunities | Contribute > Opportunities | implemented |
| Community Challenges | Contribute > Community Challenges | implemented |
| Learning Commons | Contribute > Learning Commons | implemented |
| My Contributions | Contribute > My Contributions | implemented |
| Suggest Improvements | Contribute > Suggest Improvements | in_development (placeholder) |
| Market | Market | implemented |
| Agreements | Market > Agreements | implemented |
| Messaging | Messaging | implemented |
| Profile / Score | Profile | implemented |
| Areas | Areas (Contribute, Home > Governance, or public footer) | implemented (read-only V1) |
| Governance landing | Home > Governance | implemented |
| Civic voting | Home > Governance > Civic voting | implemented |
| Governance workspace | Home > Governance workspace | implemented |
| Governance Solutions | Home > Governance > Governance Solutions | implemented |
| Community Governance Charter | Home > Governance > Community Governance Charter | implemented (interim public policy) |
| Partners | Contribute > Organization Partnership | implemented (public notice; not a CRM) |
| Funding inquiries | Contribute > Financial Support | implemented (inquiries only) |

`/contribute/tasks` redirects to Opportunities. `/contribute/projects` redirects to Community Challenges.

## Areas

Current foundational Areas (evolvable): **Health · Education · Culture · Responsibility · Environment**.

Public `/areas` and `/areas/:slug` are read-only. Areas answer *where help is needed*. Contribute answers *how I want to help*. Partners answers *how an organization can work with Civizen*.

Product pillars (`PILLARS`) are a separate live product taxonomy. Do not treat them as the Area model.

## Initiatives

Public Area pages list curated related **systems** (existing product surfaces) and genuine **initiatives** (organized work toward an outcome). There is no full initiative schema or matching engine in this build. A future Areas & Pilots Catalog is recorded in institutional docs and is **not built**.

## Contribution model

`/contribute` asks: **How would you like to contribute today?**

Ways: Volunteer (`/fund/contribute`) · Opportunities · Financial Support (`/fund`) · Organization Partnership (`/partners`).

Community: Community Challenges.

Knowledge: Learning Commons · Suggest Improvements (not open yet).

Your Impact: My Contributions.

A **Program** (`contribution_programs`) is the container. Publisher is a profile (personal or linked business account). There is no separate organizations table in this phase.

An **Opportunity** is the work primitive. A **Contribution** is a participation (`opportunity_participations`). Score events are derived.

Phase 1 pilots (live): Education-to-Contribution, Community Problem-Solving Lab, Shared Knowledge / Learning Commons.

## Opportunities

Live under **Contribute > Opportunities**. Education-to-Contribution Program.

Flow: discover → apply → organizer accept/decline → do the work → submit evidence → evaluator verifies → optional evaluation → completed contribution.

Opportunity kinds: `education_to_contribution` (professional lane), `community_implementation` (inside a Challenge Project), `knowledge_gap` (from a Knowledge Gap).

Older names such as “professional listings” or “open tasks” mean Opportunities.

## Community Challenges

Live under **Contribute > Community Challenges**. Distinct from Governance Solutions.

Flow: Challenge → Proposal → coordinator selection (not public voting) → Implementation Project → Contribution Opportunities → outcome → Solution Record.

Signed-in members can create a challenge from **Create** on Contribute > Community Challenges. Coordinators manage the challenge they publish. Completing requires implementation outcome, not merely a selected proposal.

## Projects

Implementation **Projects** live **inside** Challenges. There is no separate community-projects or tasks board.

## Knowledge Spaces

Live at `/contribute/knowledge` as **Learning Commons**. Distinct from Study, content library items, and Governance Solutions.

A Knowledge Space is a shared collection (title, purpose, optional Area, coordinator, Program, status). Resources live inside a space.

## Knowledge Gaps

Gaps name what is missing, weak, outdated, unresolved, or still needs practical development. Coordinators can turn an actionable gap into an Opportunity or a Community Challenge.

## Solution Records

Created when a Community Challenge completes with a recorded outcome. A coordinator can share a Solution Record into a Knowledge Space as a Resource. Not the same as Governance Solutions.

## Programs

`contribution_programs` kinds: `education_to_contribution`, `community_problem_solving`, `shared_knowledge`.

## Study

`/study` is the learning hub (constitution/charter materials, laws, civic domains). Distinct from Learning Commons. Law library is `/law`.

## Market

`/market` has sections including Jobs, For you, Local, Sell, Products, and Services. Members can list products/services and start agreements. Ordinary purchases are Order + Marketplace terms — they do **not** auto-create a Sale / Purchase Agreement.

Luma amounts on listings are **illustrative prototype credits**, not checkout or settlement. There is no sold-via-Luma buy button.

## Agreements

`/agreements` is the platform workspace (not Market-only). Create with **+** beside the title. Common types: General · Partnership / Collaboration · **Employment** · Service / Contribution · Sale / Purchase · **Lease** · Funding / Sponsorship, then **More agreement types…** (MOU, Pilot, Program, Data / Research, NDA). Unmatched search offers **+ Create “{name}”** as a custom type for that record only.

Supported types open a purpose-built agreement document with inline facts. The page header is **Agreement on**. Hover or tap that wording for the same type menu as the list `+`. An optional user/organization reference sits on the right of the type heading (defaults to service-provider initials or an organization abbreviation; parties can edit it or leave it blank). A Civizen **AGR-YYYY-NNNN** is assigned when the first signature arrives and appears in small type at the lower right — not on create. Hover the heading for other wordings (**Service Provision** / **Contribution** for Service / Contribution); click it to rename. Service relationships use Client / Service Provider; contribution relationships use Organization / Project / Contributor. Role labels such as *the Client* are italic in the prose. New drafts prefill today’s start date and the same calendar date one year later, shown as sentence text (**Aug 13, 2026**); hover or tap a date to change it. The ending is one condition (a date, until completed, ongoing, or until terminated). Click a sentence to rewrite it. Names and long fields continue in the sentence and wrap at words, so a first name that fits stays on that line. Enter starts a new line in long fields; a compact formatting bar appears while editing those. Hover or tap font, color, size, list, or alignment to pick an option (sizes 12–24, including justify); bold, italic, and underline toggle directly. Required placeholders name the action needed. **Create agreement** highlights the first missing required fact in the document. Custom names open a flexible skeleton. Jobs / hiring prefills Employment. Employment is distinct from Service / Contribution. Lease heading kinds include Residential, Commercial, Car, Vehicle, Equipment, Office, and Property rental.

Propose, then sign in Civizen (typed name + explicit consent) or record paper/external execution. Native signing is an in-app electronic signature record, not a certified PKI digital signature or a claim of legal enforceability.

## Governance

Public landing `/governance`. Member proposal hub `/governance/workspace`. Civic voting `/governance/voting` (elections catalog; public browsing).

Current public community instrument: **Civizen Community Governance Charter** (`/governance/charter`). It is **not** the legal constitution of a government or company.

The older **Civizen Constitution v0.1** is **superseded** by that Charter.

Working institutional design (not adopted public policy, not fully implemented as product authority): Institutional Blueprint and Governance Framework under `docs/institutional/`.

## Governance Solutions

`/governance/solutions` — post a Problem; Discuss (public thread + AI participation) or Solve (categorize and route). Catalog of civic authorities. **Distinct from** Community Challenge Solution Records.

## Voting

Civic elections and contests at `/governance/voting`. Community proposals/votes exist in the governance workspace under Charter rules. Token ownership or wealth alone does not create voting authority. Voting may be advisory or binding only within a delegated scope.

Who can create proposals: eligible participants through the platform’s proposal surfaces (`/governance/workspace`, `/governance/new`). Exact eligibility follows published platform rules and role permissions.

## Messaging

`/messaging` — person-to-person chat, including a pinned chat with **Civi**. Device-based keys support E2EE when both participants have keys. Civi is the in-app assistant, not a generic web chatbot.

Person-to-person threads: **Hide chat** removes it from your inbox only; the other person keeps the conversation. **Disappearing messages** is a shared setting both people see and applies to new messages after it is turned on. You can **edit** or **unsend** your own message for one minute (edited messages stay marked Edited). Civi chats can be **cleared** entirely; that does not apply to person-to-person history. Searching for people can use phone contacts (with permission) and **Invite** if they are not on Civizen yet.

## Profiles

Profiles include identity, bio, education, experience, skills, endorsements, and Score. Business/organization presence uses **linked accounts** on a profile (no separate organizations table in Phase 1). Search directory: People · Companies · Products · Services · Contents.

## Score

Civizen Score V2 (`civizen-score-v2.0`) on Home and `/profile`. Categories: Learning, Experience, Skills, Performance, Contributions. Public overall score is **established** activity only; a provisional estimate is not presented as a mature Score. Tiers: Explorer · Builder · Contributor · Catalyst · Steward. The rating system is still in formation.

## Roles and permissions

App roles include guest, member, citizen, verified_member, certified, moderator, market_manager, admin, founder, and system.

Founder currently has full bootstrap access. Permissions are feature-scoped (including `agreements.create` and `agreements.sign_org`). Guest is read-mostly.

Coordinators/publishers are profiles that publish Programs, Opportunities, Challenges, or Knowledge Spaces (personal or linked organization account).

## Organizations / publishers / coordinators

Organization participation today: linked business accounts, public `/partners` notice, publisher profiles on contribution Programs. Not a partner CRM, Stakeholder Map, or Pilot Portfolio.

## Partnerships

`/partners` is the public International Partnerships and Chapters notice. Institutional partnership inquiries: `/fund/institutional`. Working design lives in the Stakeholder & Partnership Framework (proposed/working, not a live CRM).

## Funding

`/fund` collects **inquiries and interest only**. It does not process investments, issue securities, promise returns, or create a binding investment agreement.

Current public policy: **Funding and Financial Integrity**. No fixed public distribution formula. Luma is not money.

The document **Civizen Constitutional Tokenomics + Governance Model** is **historical / superseded / not adopted**. Do not describe it as current policy or as an implemented monetary system.

## Current pilots

Phase 1 (implemented): Education-to-Contribution, Community Challenges, Learning Commons. Seeded demo programs exist for those lanes.

Institutional Pilot Framework is working design for how Civizen may later classify pilots. It is **not** a second in-app Pilot Portfolio.

## Relevant constitutional architecture

Current public community governance text: Community Governance Charter.

Superseded: Civizen Constitution v0.1.

Long-term pathway (current public description, not present legal status): recognized planetary citizenship pathway at `/about/planetary-citizenship-pathway`. Present legal status remains voluntary and non-governmental.

Working (not adopted as public constitution): Institutional Blueprint, Governance Framework.

## Relevant tokenomics / governance architecture

No adopted tokenomics constitution. Crypto/token mechanisms are conditional/future and disabled as money. Prototype credits (Luma) are demonstration-only, non-transferable, non-redeemable, and confer no governance rights.

## Terminology

Use current UI names: Opportunities, Community Challenges, Learning Commons, Knowledge Spaces, Knowledge Gaps, Solution Records, My Contributions, Agreements, Prototype credits, Community Governance Charter, Areas.

## Commonly confused concepts

| Confused | Current meaning |
| --- | --- |
| Social network | Civizen is a civic participation platform, not a hobby/meetup network |
| Government / legal citizenship | Not currently; voluntary civic identity |
| Constitution v0.1 | Superseded by the Community Governance Charter |
| Tokenomics model | Historical / not adopted |
| Governance Solutions vs Challenge Solution Records | Different systems |
| Study vs Learning Commons | Study = learning hub; Learning Commons = shared contribution knowledge |
| Tasks / professional listings | Opportunities |
| Community projects board | Projects inside Challenges |
| Luma / wallet | Prototype credits; not money; transfers disabled |
| Sale/Purchase Agreement vs Market order | Negotiated agreement vs ordinary listing order |
| Employment vs Service / Contribution | Employment is a job relationship; Service / Contribution is independent/consulting/volunteer work |
| Areas vs product pillars | Separate taxonomies |
| `/partners` vs partnership CRM | Public notice only |

## FAQ

See the machine-readable FAQ in `src/lib/assistant/catalog.ts`. Answers must stay aligned with this cheat sheet and the live routes above.
