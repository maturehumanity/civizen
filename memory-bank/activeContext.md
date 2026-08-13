# Active context

## Current focus

**Live + Testing v0.1.179 (2026-08-13):** Build 181 (`20260813-v0.1.179`) published to Testing and Live. Includes Phase 1 contribution pilots, Score V2, development outcome capture, Challenge export crash fix, and Home Score V2 `demonstratedProjects` guard.

**Historical reconstruction (2026-08-13):** Coherent historical development outcomes are reconstructed from git + journal provenance + surviving implementation (`src/lib/civizen-historical-reconstruction.ts`). Chat/git journal rows remain excluded as independent contributions. Reconstruction confidence is stored separately from contribution evidence confidence. No Score V2 formula change and no score-target restoration. Spec: `docs/04-operations/dev/historical-development-reconstruction.md`. LANGUAGE_PACK_VERSION 154. Concurrent Slice 2/3/4 / Phase 1 pilot work preserved.

**Development contribution capture (2026-08-13):** Live pipeline so a completed development outcome (`outcomeRootId` + artifacts + passing tests) can become one system-verified contribution root via `recordDevelopmentOutcome` → `development_stories` → `profile_contribution_events` → Score V2 on read. Chat/git journal stays excluded. Owner profile ring shows a provisional estimate without presenting it as established. LANGUAGE_PACK_VERSION 154. No Score V2 formula change. Concurrent Slice 2/3/4 / Phase 1 pilot work preserved.

**Development-evidence integrity (2026-08-13):** Contribution unit is a meaningful outcome, not a message/commit. `created_features.length > 0` is no longer verification. Chat/git backfill stays stored as journal/provenance; only traceable implemented/tested/published outcomes mint `development_story` score events. System verification does not require a second human; independent review strengthens the same root. No Score V2 formula change. LANGUAGE_PACK_VERSION 153. Concurrent Slice 2/3/4 / Phase 1 pilot work preserved.

**Phase 1 Pilot QA / readiness (2026-08-13):** Hub simplified: Opportunities, Community Challenges, Learning Commons, My Contributions. Tasks/Projects placeholders removed (redirect to live primitives). Challenge detail export crash fixed. Education-to-Contribution Program seeded. LANGUAGE_PACK_VERSION 152. Operating model: `docs/04-operations/dev/phase-1-pilot-operating-model.md`.

**Slice 4 Shared Knowledge / Learning Commons (2026-08-13):** `/contribute/knowledge` is live. Knowledge Space → Resource → Gap → Opportunity or Challenge → result Resource/Solution Record. Distinct from Study, `content_items`, and Governance Solutions. Programs use `contribution_programs` kind `shared_knowledge`. LANGUAGE_PACK_VERSION 149.

**Civizen Score V2 (2026-08-13):** Architecture review of the existing engine (`SCORE_CALCULATION_VERSION = 'civizen-score-v2.0'`). Public `overall.score` is established only; `provisionalEstimate` averages observed categories and is not shown as a mature Civizen Score. Duplicate evidence roots collapse without extra volume (no 0.25 duplicate weight). Experience keeps duration primary; unique projects add shrunk bounded support (cap 12, prior center 0). Stable skill IDs preferred; lowercase-name matching remains an explicit temporary fallback. LANGUAGE_PACK_VERSION 150. Concurrent Slice 2/3/4 contribution work preserved.

**Civizen Score V2 (2026-08-13, earlier):** Architecture correction in the existing score engine (`src/lib/civizen-score-model.ts`, `SCORE_CALCULATION_VERSION = 'civizen-score-v2.0'`). Activity evaluation is separate from accumulated reputation. Verification no longer multiplies Impact/Quality. Evidence & Validation counts unique underlying roots. Category reputation uses bounded weights + small-sample shrinkage (prior 50 / strength 6; empty → unknown). Confidence is independent of score magnitude (one activity cannot reach Moderate). Coverage and tier readiness are first-class. Declared vs demonstrated skills merge without double-counting; Experience duration stays primary with bounded project support. No parallel score UI. LANGUAGE_PACK_VERSION 148. Concurrent Slice 2/3/4 contribution work preserved.

**Slice 3 Community Problem-Solving Lab (2026-08-13):** `/contribute/challenges` is live. Distinct from Governance Solutions. Flow Challenge → Proposal (`challenge_proposals`) → coordinator selection → implementation Project → Contribution Opportunities (`community_implementation`) → outcome → Solution Record. Programs use `contribution_programs`. Completing requires implementation outcome, not merely a selected proposal. Solution Records can be shared into a Knowledge Space in Slice 4. LANGUAGE_PACK_VERSION 147.

**Slice 2 Contribution Evaluation (2026-08-13):** Optional post-verification evaluation at `/contribute/professional`. Dimensions are selected per opportunity. Verification lifecycle unchanged. Only quality, impact, and collaboration may update derived Performance estimates. LANGUAGE_PACK_VERSION 145.

**Slice 1 Education-to-Contribution (2026-08-13):** `/contribute/professional` is live. Organizer review shows applicant identity via `list_opportunity_applicant_identities` (no copied profile fields). Local RLS harness is skipped without loopback Supabase credentials. LANGUAGE_PACK_VERSION 144.

**Public Areas V1 implemented (2026-08-13):** Read-only `/areas` and `/areas/:slug`. Area list from `listCurrentAreas()` (`foundational_areas.v1`). Curated systems/initiatives in `src/lib/areas/public-areas-content.ts`. Not in bottom nav. Discovery: public footer, Contribute, Governance landing. Partner → `/fund/institutional?area=`. Contribute → `/contribute`. `PILLARS` unchanged. Spec implementation note: `docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md`. LANGUAGE_PACK_VERSION 142.

**Public Areas & Initiatives V1 spec indexed (2026-08-13):** `docs/03-platform/areas-and-initiatives/public-areas-initiatives-v1.md` — working product spec (not `/documents`). Principle **Simple by default. Detailed by choice.** recorded in IA standards §2 and AGENTS persistent directives. Areas = where help is needed; Contribute = how I want to help; Partners = how an organization can work with Civizen.

**Shared classification registry V1 (2026-08-13):** persisted `classification_sets` / `nodes` / `aliases` / `relationships`. Seeded `foundational_areas.v1` (Health · Education · Culture · Responsibility · Environment) and `product_pillars.v1` (live PILLARS ids, distinct; no Community→Environment or Economy→Health mapping). Library `src/lib/classification/` — public Areas V1 is the first consumer for Areas only. `PILLARS` remain controlling. Spec: `docs/03-platform/model-evolution/shared-classification-registry-v1.md`.

**Shared Classification & Model Evolution Architecture added (2026-08-12):** `docs/03-platform/model-evolution/shared-classification-and-model-evolution-architecture.md` — working product architecture (not institutional item 8; not `/documents`). Doctrine: preserve purpose, not assumptions; stable evolution. Current Score model and live `PILLARS` stay as-is.

**Contributor Framework indexed (2026-08-12):** `docs/institutional/contributor-framework.md` — Working Contributor Framework (Contribution Record design). Item 6. Not `/documents`. Public `/contribute/policy` remains adopted. Doc `21` clarified as compensation planning.

**Areas, Domains & Participation Framework added (2026-08-12):** `docs/institutional/areas-domains-participation-framework.md` — shared Area/Domain/Topic/Initiative/Role taxonomy. Item 7. **Current foundational Area model** = Health, Education, Culture, Responsibility, Environment (from *Mature Humanity*; evolvable, not permanently immutable). Minimal public `/areas` V1 is a separate read-only landing. Product `PILLARS` remain unchanged.

**Founder transition clarified (2026-08-12):** functional self-sufficiency, not development percentage and not official-use designation alone. Official use increases controls; it does not automatically remove founder access. Preferred sequence: founder supervision → capability built → parallel/verified operation → demonstrated self-sufficiency → founder steps back. Founder permissions unchanged.

**Founder Transition & Succession Framework added (2026-08-12):** `docs/institutional/founder-transition-succession-framework.md` — specialized Working Framework (F0 current conceptual stage; public availability ≠ official deployment; economic rights ≠ governance rights). Not a public `/documents` page. Indexed fifth after Blueprint, Governance, Stakeholder & Partnership, and Pilot Frameworks. Does **not** change founder bootstrap/full access.

**Pilot Framework added (2026-08-12):** `docs/institutional/pilot-framework.md` — subordinate Working Pilot Framework (what Civizen tests with participants; domain vs type taxonomy; P0–P6 conceptual maturity; Person → Field → Organization → Pilot → Role; Need + Role + Relevance + Responsibility + Authorization). Not a public `/documents` page. Indexed fourth after Blueprint, Governance Framework, and Stakeholder & Partnership Framework. Existing concrete pilot/validation plans remain operational children. Future **Areas & Pilots Catalog** recorded under Pilot Portfolio (§40), not built.

**Stakeholder & Partnership Framework added (2026-08-12):** `docs/institutional/stakeholder-partnership-framework.md` — subordinate Working Stakeholder & Partnership Framework (who Civizen engages; multi-dimensional classification; partnership roles/modules; Contribution Record; future Stakeholder Map). Consolidates Stakeholder Map / Partnership Strategy / Framework / Packages. Not a public `/documents` page. Indexed third after Blueprint and Governance Framework.

**Institutional Blueprint added (2026-08-12):** Working institutional architecture at `docs/institutional/institutional-blueprint.md`. **Governance Framework added (2026-08-12):** `docs/institutional/governance-framework.md` — subordinate Working Governance Framework (how authority is distributed; seven decision classes; Contribution Record may support eligibility, not voting power). Indexed under Institutional Architecture. Not published as a primary public `/documents` page.

**Web login/signup lockout fix (2026-08-11):** Session could succeed while `profiles` fetch failed/hung; `TermsReconsentGate` waited forever on Loading, and `AuthRedirect` bounced `/login` + `/signup` to `/` — Login/Sign up looked dead. Root cause since Terms re-consent **2026-07-30**; more visible after **2026-08-03** auth no longer gated on profile. Fix: `profileLoadFailed` + 10s timeout recovery (Retry / Sign out); Login/SignUp submit try/finally. LANGUAGE_PACK_VERSION 141.

**Validation Budget v0.3 Recommended applied (2026-08-11):** Owner selected Recommended Validation Program from decision pack `33`. New app draft **Civizen Pre-Major-Build Validation Program v0.3** — exact Base **$634,400,000.00** (~$634M); same-scope Low/High ~**$552.4M / $833.2M**. Direct **$489.5M** + contingency **$78.3M** + safe-pause **$66.6M**. 13 groups / 53 lines (WS-15 $18M; VAL-EX16 $12M quote-dependent; WS-22 $11.5M corrected travel). Draft/unapproved/unpublished; committed/actual 0; public flags false. v0.1 ($446M) and v0.2 ($530.2M) preserved as superseded/historical; primary selector excludes superseded. Constrained ~$374M / Expanded ~$1.03B documented as **different scopes**. Tranches in Program plan/docs (T1 ~$132M; provisional escrow floor $60M) — not a Budget table dashboard. Economics model **0.1.6** restricted-validation = exact v0.3 Base; FPP **$14.7M** / eligible **$1,470M** unchanged; founder accrued only. Receiving-entity path unresolved — do not accept funds. LANGUAGE_PACK **140**.

**Scope/priority/tranche decision pack (2026-08-11):** Doc `33` + CSV — Recommended case **selected and applied** as Validation Budget v0.3. Separates Constrained / Recommended / Expanded scope from same-scope unit-cost L/B/H. Corrects WS-22 travel math.

**Line-adequacy audit v0.2 (2026-08-11):** Doc `32` + CSV — analysis only. Adequacy stress ~$662M superseded as recommended Base by doc `33` after travel-math correction.

**Live + Testing v0.1.176 (2026-08-11):** Build 178 (`20260811-v0.1.176`) published to Testing and Live. Includes bottom-nav hide-on-scroll, Funding Economics page, Validation Budget v0.2 draft model/docs, and capital/participation planning pack.

**Validation Budget v0.2 coverage adds (historical, 2026-08-11):** Exact Base **$530,200,000.00** — superseded as working draft by v0.3; retained historically. Prior **$524M** and **$446M** also retained. FPP **$14.7M** / eligible **$1,470M** unchanged through v0.3.

**Bottom nav hide-on-scroll (2026-08-11):** `MobileNav` uses `useShowOnScrollUp` — hide bottom bar (+ FAB) on scroll down, show on scroll up so long pages gain viewport on mobile. Secondary arc/strip closes while hidden; Market `persistCarousel` restores on scroll up. Spec: `nav-secondary-carousel.md` § Behavior.

**Coverage audit doc 29 (2026-08-11):** Read-only validation + five-year coverage audit. Separates (1) health system domain (2) workforce benefits OpEx EX-02 (3) insurance system domain (4) program insurance OpEx EX-16. WS-12 $32M kept intact; ten named sub-lines proposed with `15` indicative ranges (unmapped). No UI/DB/amount/approval changes. Matrix CSV companion. Next free was 29.

**Participation policy pack (2026-08-11, rev 0.1.2):** Docs `26`–`28` — CoA taxonomy; **Founder Participation Pool = 1% of Eligible External Monetary Receipts** (once). Reconciled base FPP **$14.7M** on **$1,470M** eligible vehicle equity-like capital; profit **10/10/80**. Private-capital L/B/H columns are eligibility cases **within** the ~$37.5B base ecosystem scenario (not ecosystem L/B/H). 

**Funding → Economics page (2026-08-11, model v0.1.3):** Read-only planning UI at `?section=economics`. Selected commercial scenario/horizon drives summary, waterfall, pools, and illustrations. Primary eligible base = deficit-recovered cumulative cash ($3,043.4M base/15y); floored annual sum ($3,527.5M) is alternate only. Policy $310M example collapsed. Investor default $100M / V-ENT capacity $500M FPP-eligible. DEV harness `/dev/economics-visual`. LANGUAGE_PACK_VERSION 137.

**Home post composer — process root cause + gates (2026-08-11):** Working `<textarea>` was replaced on **2026-08-03** (Testing **v0.1.128**, commit `737086f`) with floated `contentEditable` for wraparound aesthetics; click→focus→type was never gated, so empty-field taps died until reported. Product fix shipped in **v0.1.175**. Prevention now in-tree: AGENTS §3 **Input-control replacement gate**, AGENTS correction naming `737086f`, Playwright **`verify:home-post-composer`** inside `verify:post-dev`, cursor rule pointer, Vitest helpers.

**Investable-vehicle redesign (2026-08-11):** Docs `23`–`25` — ring-fenced commercial/OPS/JUR/DISC vehicles; FY2025 platform benchmarks; lawful ad/discovery upside; revised post-contract 10%/10% waterfall; readiness gaps. Doc `20` equity unattractiveness (~0.3× MOIC no TV) preserved. Doc `22` marked **internal — investability redesign required** (not external). Vehicle-assigned private capital ~$0.9/$2.8/$6.4B. **No** app finance/payout/offer changes.

**Live ships bug fixes immediately (2026-08-11):** Standing rule updated — confirmed bug-fix releases must promote to Live/Production in the same session (not Testing-only). Live promoted to **v0.1.174** (build 176) so default Android clients get the update prompt.

**Capital stack / ROI scenario pack (2026-08-11):** Docs `20`–`22` — provisional capital-stack, revenue, investor-return, and contributor-compensation model. Privately investable 5y range ~$0.9B / ~$2.8B / ~$6.3B (not full ~$37.5B). Payout base = eligible distributable commercial CF; tested 5/5, 10/10, 15/15 pools (unapproved). CSV + meta hold calculations. **No** app finance records, payout systems, or investment offers. README + due-diligence index updated.

**Testing v0.1.174 (2026-08-11):** Build 176 (`20260811-v0.1.174`) published to Testing + live web. Includes project finance workspace, validation budget UI, Program plan, funding docs, Program Readiness UX. Production remains on prior soak build until Testing is clear.

**Draft Budget v0.1 retirement (2026-08-11):** Safety-checked remote demo (`90a496d2-…`, zeros only, no allocations/commitments/receipts/fees/publications). Hard-deleted via `scripts/db/retire-demo-draft-budget-v01.sql` with audit `budget.demonstration_retired`. Validation intact (`0ef850e3-…`, planned_minor 44600000000). Ordinary selector excludes `is_demonstration`; default = validation. Ordinary seed path refuses recreate; local-only under `scripts/db/local-dev-only/`. Client seed gated (`force` / `VITE_ALLOW_DEMO_BUDGET_SEED`). LANGUAGE_PACK_VERSION 135.

**Budget structure toolbar (2026-08-11):** Single folder icon toggles expand/collapse all (hover Expand/Collapse); `+` icon for Add group (hover label). Removed By group / All line items toggle — nested hierarchy only. LANGUAGE_PACK_VERSION 134.

**Budget hierarchy styling (2026-08-11):** Expense-group rows use semibold name/totals and stronger background; line items use normal weight, deeper indent, muted WS-id + period, quieter child background — styling only. LANGUAGE_PACK_VERSION 134.

**Timeframe UI cleanup (2026-08-11):** Compact expense-table toolbar (no standalone Period row). Period selector removed — canonical model has no periodized amounts, so month-window filters were not honest financial controls; duration shown as `18–24 months` metadata badge. Month 25 was a CSV off-by-one on WS-13/WS-23 (`start=2` + `duration=24`); doc 14 table is M2–M24 — corrected `duration_months` to 23 (amounts unchanged). LANGUAGE_PACK_VERSION 134.

**Financial hierarchy framing (2026-08-11):** Validation budget classified as subprogram (18–24 mo, ~$446M) inside five-year first-wave pathway (~$30–50B / ~$37.5B base) — not Civizen’s complete implementation budget. Program plan primary heading is five-year plan; Budget selector = ordinary non-demonstration budgets (default validation). No $37.5B master ledger row. Schema needs for a future multi-entity five-year master budget documented in funding IA. LANGUAGE_PACK_VERSION 133.

**Period presentation (2026-08-11):** Validation budget shows 18–24 month duration + Period filter (timing-overlap only; full-program planned amounts — no fabricated period cash). Timing column renamed Period; group rows show combined month ranges. Program plan five-year card has Planning period selector (Five-year total / Year 1–5) from canonical annual cashflow. Missing data: validation model has no periodized planned amounts by month window or tranche. LANGUAGE_PACK_VERSION 132.

**Funding Budget upper layout (2026-08-11):** Settings → Funding → Budget compact header — dropdown selector (Active / Demonstration optgroups), status badges, totals strip, primary workflow action + overflow (CSV, New budget, secondary), creation forms hidden until requested, hierarchy immediately below. Funding subtitle shortened; legacy tools only via finance.admin overflow (`?legacy=1` preserved). Presentation only — no finance record/schema/permission/calculation changes. LANGUAGE_PACK_VERSION 131.

**Validation Program draft budget (2026-08-10):** Seeded `Civizen Pre-Major-Build Validation Program v0.1` from doc `14` CSV base scenario — exact planned **$446,000,000.00** (44,600,000,000 minor), 12 groups, 25 lines (WS-01…WS-25), committed/actual 0, draft/unapproved/unpublished, `publish_flag=false`. Preferred / default selection in Settings → Funding → Budget. Idempotent SQL `scripts/db/seed-validation-budget-v01.sql` + TS model/seed. Low/high remain Program Plan only. (Obsolete Draft Budget v0.1 later retired — see 2026-08-11 entry.) LANGUAGE_PACK_VERSION 130.

**Program plan + Budget nesting + phase Timing TBD (2026-08-10):** Settings → Funding adds read-only **Program plan** (`?section=program-plan`) from generated `program-plan-summary-v0.1.json` (Months 1–24 validation + Years 1–5 first wave; long-range behind advanced disclosure). Budget default unchanged; nested expandable expense groups use a **wide hierarchical table** (≥720px panel) and stacked cards only when narrow; timing shows concise **TBD**. Docs `13`/`16`–`19`/`06`/IA updated. Demo budget amounts/approval/public page unchanged. LANGUAGE_PACK_VERSION 129.

**Funding inquiry-readiness package (2026-08-10):** Docs `16`–`19` provisionally approved. `17` §5 records owner decisions D1–D11: validation ask (~$446M base, ~$202–898M range); long-horizon figures as ecosystem hypotheses; `16` for controlled sharing after final review; prospect categories for research (not commitments); receiving entity/fiscal path **unresolved (D6)**; independent assurance mandatory; demo budget stays zeros. No financial records, budget publication, or funding commitments recorded.

**Budget visibility + Program Readiness UX (2026-08-10):** Remote DB confirmed `Civizen Draft Budget v0.1` (draft, demonstration, USD, 9 groups, 22 lines, amounts 0, unpublished). Funding Budget empty/access/load states + demo badges. Governance Program Readiness refactored to summary→list→one detail form; APIs/permissions/rules unchanged. Browser screenshots unavailable.

**Funding IA standards + workspace nav (2026-08-10):** Universal IA standards under `docs/03-platform/product-design/`; Funding Overview section + mobile section picker + Sources work-panel progressive disclosure; funding-and-budget README reindexed. Budget remains default. No finance schema/record changes (demo budget still 0).

**Pre-major-build validation program (2026-08-10):** `14-pre-major-build-validation-program-v0.1.md` + workstreams CSV + `15` panel/study briefs + external concept summary. Bottom-up validation budget ~$202M / ~$446M / ~$898M (18–24 mo); supersedes `11` §7.3 $0.25–0.50B as working total. Inventory and long-horizon costs treated as hypotheses. App DB unchanged (amounts 0).

**System inventory + long-horizon costs (2026-08-10):** `12` (467 systems) and `13` (10y/20y ranges) — structured hypotheses pending validation in `14`. Document `11` is five-year **first-wave** only (~$37.5B), not worldwide completion.

**Profile menu scroll lock (2026-08-10):** Opening Profile no longer scroll-chains to the page behind on mobile/narrow viewports. `UserPageMenu` locks `document.body` while open and uses a max-height `overflow-y-auto` + `overscroll-contain` panel as the scroll target.

**Program financial model v0.1 (2026-08-10):** `docs/04-operations/funding-and-budget/11-program-financial-model-and-funding-responsibility-v0.1.md` + `11-program-financial-model-v0.1.csv` — cost centers, funding responsibility, sector domains, release gates. Bottom-up base ~$37.5B/5y **first wave**; core primary ~$4.8B; core must raise ~$8.2B. App DB unchanged (amounts 0).

**Five-year ecosystem cost reconciliation v0.1 (2026-08-10):** `10-five-year-ecosystem-cost-reconciliation-v0.1.md` — ~$35B midpoint framing; detailed model in `11`.

**Civilization-scale program framework v0.1 (2026-08-10):** `09` remains authority for capability map and launch gates; ecosystem dollar totals preliminary and deferred to `10`.

**Budget realism audit v0.1 (2026-08-10):** `08-budget-realism-and-scope-audit-v0.1.md` — historical prototype honesty audit; superseded for civilization-scale capitalization by `09`.

**Budget estimate scenarios v0.1 (2026-08-10):** `docs/04-operations/funding-and-budget/07-budget-estimate-scenarios-v0.1.md` — low/base/high USD proposal (base cash ~$226k incl. 15% contingency). Superseded for decision-making by realism audit Cases A/B/C; kept for history.

**Draft Budget v0.1 planning skeleton (2026-08-10):** `docs/04-operations/funding-and-budget/06-initial-working-budget-v0.1.md` — nine expense groups, phase definitions. Originally seeded as draft + `is_demonstration=true` + zero minor units; **retired from ordinary remote use** (see 2026-08-11 entry). Explicit local-only seed under `scripts/db/local-dev-only/`.

**Project finance workspace v1 (2026-08-10):** Settings → Funding Budget/Sources; public `/fund/project-finance`. Fine-grained `finance.view|edit|approve|publish|admin` with legacy compat; legacy ledger tabs quarantined behind `?legacy=1`. LANGUAGE_PACK_VERSION 125.

**Documentation IA restructure (2026-08-10):** `docs/` reorganized by purpose (`00-foundation` … `05-research`, plus `proposals/` and `archive/`). Canonical philosophy: `docs/00-foundation/philosophy-of-mature-humanity.md`. Public institutional policies: `docs/02-policies/institutional/`. Pathway: `docs/00-foundation/recognized-planetary-citizenship-pathway.md`. Inventory: `docs/archive/implementation-history/docs-ia-migration-inventory-2026-08-10.md`. Uncommitted Market Jobs form edits left untouched.

**Funding strategy docs (2026-08-10):** Added practical funding guidance under `docs/01-governance/funding-and-monetary/` without selecting a financing model: `funding-and-sustainability-plan.md`, `funding-options.md`, `funding-readiness-roadmap.md`. README separates strategy / current policies / conditional frameworks. Cleanup pass: restored grant-restricted policy as Current Draft; demoted LSP/calculator/distribution docs to Historical / prototype; transparency policy no longer implies fixed pools; crypto remains Conditional/Future · Disabled; open-legal-questions kept short. No application code changes.

**Market Jobs sentence form polish + Production (2026-08-04):** Logged-in users no longer see Worker/Employer tabs (mode from personal vs `biz_*` account). Job-type token cycles seed labels until hover/select; multi-select shows “Baker or Barista” style lists with checks in the dropdown. Location shows city/region plus matching country flag (`RoundCountryFlag`), also beside Full name. Also ships Permissions drag-scroll, ProtectedRoute profile-load gate, and AppPageHeader alignment. **Production v0.1.172** (build 174).

**Market Jobs sentence form (2026-08-04):** Jobs replaces StudySpecialists with a progressive sentence form (job type + location tokens, then contact + More details). Marketplace title hover shows the transactional specialist description. Submissions persist to `market_job_interests`. LANGUAGE_PACK_VERSION 123. **Testing v0.1.171** (build 173).

**Permissions folder vs function labels (2026-08-04):** Section folders use small uppercase primary tracking; nested page folders use muted tracking; permission rows use normal-weight body text with indent. Continues scroll/refresh work from **Testing v0.1.171**. **Testing v0.1.172** (build 174).

**Market header UX (2026-08-04):** All Market header icons show names on hover (Filters · Products · Services · Agreements · Prototype credits · Search · Profile). Prototype credits hover also shows the Luma notice (banner removed). Search icon toggles the listing search bar (Study-style). `/market` restores the last section unless For you has unseen listings. Spec: `nav-secondary-carousel.md`. **Testing v0.1.170** (build 172).

**Market Jobs default + Services icon (2026-08-04):** `/market` defaults to **Jobs** (specialists lane with content) instead of empty For you. Products/Services header toggle uses Package + Handshake with on-hover tooltips. Spec: `nav-secondary-carousel.md`. **Testing v0.1.169** (build 171).

**Profile avatar header sizing (2026-08-04):** `UserPageMenu` supports `size="sm"` (32px) and defaults to `md` (40px, matches AppTopChrome Search). Messaging/Market use `sm`. Messaging inbox filter row uses `items-center` + `overflow-y-hidden` (and hidden horizontal scrollbar chrome) so a tall avatar cannot create a vertical header scrollbar. **Testing v0.1.168** (build 170).

**Permissions header + matrix scroll (2026-08-04):** Permissions uses `AppLayout hideTopChrome` so Back · Permissions › · Search · Profile share one `items-center` header row. Matrix scroll parent uses `min-w-0` + `overflow-x-auto` (flex default `min-width: auto` was blocking horizontal swipe); canvas is `width: max(100%, calc(...))` so roles expand on wide screens and scroll on narrow.

**Messaging header chrome overlap (2026-08-04):** Same as Market — floating AppTopChrome Search + Profile duplicated Messaging’s inbox Search. Messaging uses `AppLayout hideTopChrome`; Profile lives in the ChatBar page header (inbox + thread). **Testing v0.1.167** (build 169).

**Search Contents + no All tab (2026-08-04):** Search filters are People · Companies · Products · Services · Contents. No All chip — with nothing selected, every category is searched. Contents covers app pages, features, Study, Law, institutional docs, and Contribute lanes. Legacy `?tab=all` maps to search-everything. LANGUAGE_PACK_VERSION 122. **Testing v0.1.165** (build 167).

**Market header chrome overlap (2026-08-04):** Floating AppTopChrome Search + Profile sat on top of Market’s Agreements and Prototype credits shortcuts. Market now uses `AppLayout hideTopChrome` and keeps Search + Profile in the page header (with Agreements · Credits). **Testing v0.1.165** (build 167).

**Hide Endorse from Profile menu (2026-08-04):** Endorse remains on Search results and profile pages; Profile menu no longer lists it (`PROFILE_MENU_EXCLUDED_PAGE_IDS`). **Testing v0.1.164** (build 166).

**Public language flag (2026-08-04):** `PublicLanguageSelect` is flag-only — removed the redundant `ChevronDown` beside the flag (hover/click still opens the list). **Testing v0.1.163** (build 165).

**Funding interest autofill (2026-08-04):** Logged-in users get Full name / Email / Country pre-filled on `FundingInterestForm` (Support, Invest, Institutional, Contribute) from auth profile/session; edits are not overwritten. Inquiries land in Settings → Funding → Interest (`funding_interest_inquiries`). Standing rule in AGENTS.md: known-field autofill.

**Same-line page Back (2026-08-04):** `AppPageHeader` is app-wide: Back chevron on the same line as the title. Covers Fund (`FundPageShell` hub + lanes), settings/admin, Edit Profile, Governance/Law/Features/Terms, Endorse, Contribute lanes, Agreements, Documents, Why This Exists, Market taxonomy, and related AppLayout pages. Public shells use `padForChrome={false}`. Hubs (Home/Study/Contribute/Market/Messaging) omit Back. Optional `onBack` for in-flow steps (EndorseFlow). **Testing v0.1.162** (build 164).

**Contribute hub redesign Phase 1 (2026-08-04):** `/contribute` is no longer profile/messaging/score/endorse shortcuts. It is the participation gateway (“How would you like to contribute today?”) with sections Ways · Community · Knowledge · Your Impact. Volunteer → `/fund/contribute`, Financial → `/fund`, Organization → `/partners`; other lanes use `/contribute/:laneId` placeholders. Spec: `docs/04-operations/dev/contribute-page.md`. Endorsement stays on Search + profiles. LANGUAGE_PACK_VERSION 120. **Testing v0.1.156** (build 158).

**Post-push CI watch (2026-08-04):** Agents must run `npm run verify:ci` after every GitHub push (`scripts/verify-ci.mjs` waits for the `CI` workflow on `HEAD`). Encoded in AGENTS.md §10 and `.cursor/rules/civizen-project.mdc`.

**CI Download/Onboarding Auth mocks (2026-08-04):** All main pushes after Profile menu chrome failed Vitest: `PublicPageToolbar` calls `useAuth`, but Download/Onboarding tests had no AuthContext mock. Fixed with logged-out mocks. Yesterday’s green CI was the `npm audit` fix — this was a separate same-day regression.

**Permissions scroll + Home kick (2026-08-04):** Role columns use `minmax(4.75rem, 1fr)` so they expand on wide screens and keep a horizontal min-width for swipe-scroll on narrow screens. Empty/failed `current_app_permissions` no longer clears founder/admin access (ProtectedRoute also keeps founder/system). **Testing v0.1.166** (build 168).

**Permissions dense columns (2026-08-04):** Feature labels sit in a tight sticky first column next to role checkboxes. Role columns swipe/scroll horizontally on small screens; scrollbars stay hidden. **Testing v0.1.161** (build 163).

**Permissions full-bleed matrix (2026-08-04):** Permissions matrix fills the viewport below the title (no `72vh` inset card); vertical/horizontal scrollbars are hidden while scrolling still works. **Testing v0.1.160** (build 162).

**Permissions expand-all title chevron (2026-08-04):** Title reads `Permissions >`. Main folders stay visible (folded). Title `>` expands/collapses all groups; clicking a folder name still toggles that folder only. **Testing v0.1.158** (build 160).

**App-wide chrome back (2026-08-04, superseded):** Briefly lived in `AppTopChrome` with a height spacer; rejected for wasted vertical space. Replaced by same-line `AppPageHeader` Back + title (see Current focus).

**Endorse vs credentials icons (2026-08-04):** Endorse uses Lucide `ThumbsUp`; Professional credentials keeps `Award`, so Profile menu / Contribute / Settings no longer share the same medal icon. **Testing v0.1.152** (build 154).

**Search companies ownership + endorse (2026-08-04):** People no longer lists business profiles. Companies show a tappable “Run by [name]” owner row and Endorse. Directory uses `search_civizen_directory` RPC so owner fields work for all signed-in users despite `linked_accounts` RLS. LANGUAGE_PACK_VERSION 119. **Testing v0.1.151** (build 153).

**UsersAdmin overview polish (2026-08-04):** Level hover label is “User Level”; stats cards fit in one row without a visible scrollbar; header is chevron-only Back beside the Users title. LANGUAGE_PACK_VERSION 118. **Testing v0.1.150** (build 152).

**UsersAdmin level under avatar (2026-08-04):** Experience level (Entry/Junior/…) sits under the photo/logo on the same left column; hover/click opens a level menu like the role pill. **Testing v0.1.149** (build 151).

**UsersAdmin add-user chrome (2026-08-04):** Create user is a `+` icon in AppTopChrome immediately before Search (not a text button beside the title). **Testing v0.1.148** (build 150).

**UsersAdmin username on avatar hover (2026-08-04):** Mobile user cards hide `@username` from the card body; hovering the photo/logo shows it. Status pills stay on one scrollable row so cards remain 3 lines. **Testing v0.1.147** (build 149).

**Score Details formation note (2026-08-04):** Home Score Details icon tooltip now shows “View Score Details” plus a second line: rating system is still in formation and may not reflect the correct or actual rating. LANGUAGE_PACK_VERSION 117. **Testing v0.1.146** (build 148).

**Search typing one-letter bug (2026-08-04):** `/search` could only accept one character because `UnifiedSearchBlock` re-applied stale URL `q` into local state on every `query` change. URL→state sync now runs only when `searchParams` change; local→URL writes skip no-op updates. Regression test: `UnifiedSearchBlock.test.tsx`. **Testing v0.1.145** (build 147).

**UsersAdmin cards denser (2026-08-04):** Mobile user cards capped at 3 lines — (1) photo/logo + name + settings/verify/login, (2) @handle · level · activity, (3) status pills where the role pill is also the hover/click role menu (removed duplicate role Select). Personal accounts and linked business orgs are grouped; org cards show the organization name. Verification shows status (check/X) in the action group; click toggles verification. **Testing v0.1.144** (build 146).

**Profile menu + main nav chrome (2026-08-04):** Bottom nav is Home · Study · Contribute · Market · Messaging (Settings removed from nav; stays in Profile menu). Profile menu hides main-nav duplicates plus Search, Download, Edit Profile, and Contribute. Edit Profile is a pencil on personal/business account rows. Download Civizen is public-only (toolbar when logged out). App-wide Search + Profile chrome on AppLayout (hide on scroll down / show on scroll up). LANGUAGE_PACK_VERSION 116. **Testing v0.1.143** (build 145).

**Profile menu Accounts add control (2026-08-04):** `UserPageMenu` Accounts `+` is always clickable (opens create-business dialog); hover label “Add business account”; bottom add row removed. **Testing v0.1.142** (build 144).

**Profile Earnings page (2026-08-03 / 2026-08-04):** `/earnings` in the Home avatar menu shows seller product/service activity from agreements (signed = sold; pending listed separately). Illustrative Lumen totals only — settlement not active. Notice describes earnings from work, services, and products (no registration/banking roadmap language). Filters use a single-line scrollable underline tab strip (not pills). Home removed from that menu (bottom nav covers it); `pageRegistry.home` icon aligned to Lucide `Home`. LANGUAGE_PACK_VERSION 115. **Testing v0.1.140** (build 142).

**App load performance (2026-08-03):** Home and shared bootstrap were stacking full-screen gates (i18n → auth profile/E2EE → Home sequential fetch including full contribution sync), so sparse pages felt ~5s empty. Fixed: prefetch i18n base with App chunk (no language shell gate); Auth clears loading on session and publishes profile before messaging E2EE; Home/Profile paint from parallel queries + ledger read while contribution sync runs in background with 90s TTL; Stories seed/list deferred until Stories tab. **Testing v0.1.136** (build 138); Live/Production remains on prior soak build. Deploy also caps site backups (≤2) and prunes old testing APKs so the VPS does not fill mid-publish.

**Account switcher UI (2026-08-03):** Removed the non-working header **Switch back** button from `UserPageMenu`. Account switching stays on each non-current account card via **Switch**. **Testing v0.1.135** (build 137).

**UsersAdmin emergency-access reload loop (2026-08-03):** `loadData` depended on `emergencyAccessOpsPolicy` while also `set`ting it, so the page stayed on Loading and re-toasted “Could not load emergency access event summary.” Fixed with a policy ref + stable callback deps; event_summary now returns a zero row on empty lookback. Migration applied. **Testing v0.1.134** (build 136).

**CI + page smoke coverage (2026-08-03):** Continuous GitHub CI fails were from `npm audit` (not Vitest). Added `scripts/audit-ci.mjs` (SPA-irrelevant RSC allowlist), upgraded `react-router-dom` to 7.18.2, and added page import/render smoke + UsersAdmin component tests so missing imports (`Select`, `manageableRoles`) fail in CI. **Testing v0.1.133** (build 135); Live/Production remains on prior soak build. Standing rule in `AGENTS.md`: always add/update Vitest for every module/page created or modified in the same session.

**Home post views (2026-08-03):** Feed post name line shows an Eye icon on the far right; hover reveals unique visitors and total views. Table `post_views` + RPC `record_post_view` (authors do not inflate their own counts; 15-minute revisit cooldown). LANGUAGE_PACK_VERSION 111.

**Admin Users startup crash (2026-08-03):** `/settings/admin/users` hit sequential ReferenceErrors after a partial split: missing `Select` import, then missing `manageableRoles` import for Create User. Both restored. Boot-recovery / cache reset signs out (expected). **Testing v0.1.130** (build 132); Live/Production remains on prior soak build.

**Testing v0.1.128 (2026-08-03):** Build 130 (`20260803-v0.1.128`). Live/Production remains on prior soak build. Composer wraps under avatar with curved shape-outside.

**Home composer wraparound (2026-08-03):** Long drafts use a single bordered field with floated avatar + circular shape-outside so lines wrap under the photo (full width from ~line 3) with a soft curve.

**Testing v0.1.127 (2026-08-03):** Build 129 (`20260803-v0.1.127`). Live/Production remains on prior soak build. Composer remeasures so full draft text stays visible.

**Home composer clip fix (2026-08-03):** Draft field remeasures height after width settles (rAF + width ResizeObserver) so restored/long drafts wrap fully instead of clipping under overflow.

**Testing v0.1.126 (2026-08-03):** Build 128 (`20260803-v0.1.126`). Live/Production remains on prior soak build. Composer field full-width while drafting; actions below.

**Home composer width fix (2026-08-03):** With draft text, the field uses full width and Cancel/Post sit below — buttons no longer squeeze the textarea into a narrow column.

**Testing v0.1.125 (2026-08-03):** Build 127 (`20260803-v0.1.125`). Live/Production remains on prior soak build. Empty composer: Post same row; placeholder vertically centered.

**Home composer empty-state align (2026-08-03):** Empty field keeps single-line height so Post stays on the same row; placeholder marquee is flex-centered in the field.

**Testing v0.1.124 (2026-08-03):** Build 126 (`20260803-v0.1.124`). Live/Production remains on prior soak build. Denser Home: score details icon, compact Governance, composer under Governance.

**Home layout denser (2026-08-03):** Score details is an icon beside `/ 100` (hover label). Governance is one row (icon + title/description). Post composer sits under Governance.

**Testing v0.1.123 (2026-08-03):** Build 125 (`20260803-v0.1.123`). Live/Production remains on prior soak build. Home post composer autosaves drafts; Cancel discards; Post publishes.

**Home post draft autosave (2026-08-03):** Composer text autosaves per user in localStorage (debounced + flush on blur/hide). Restores on return. Cancel clears draft; Post clears after publish.

**Testing v0.1.122 (2026-08-03):** Build 124 (`20260803-v0.1.122`). Live/Production remains on prior soak build. Home score card: no Confidence line; points-to-next on dial/tier hover.

**Home score card declutter (2026-08-03):** Removed always-visible “Confidence: …” from Home. “N points to {tier}” shows only on hover of the dial or tier label (e.g. Builder).

**Testing v0.1.121 (2026-08-03):** Build 123 (`20260803-v0.1.121`). Live/Production remains on prior soak build. Home feed post body aligns with avatar left edge.

**Home post body full-bleed (2026-08-03):** Feed post body/actions start at the avatar’s left edge (not indented under the name). Header stays avatar + name/time on one row.

**Testing v0.1.120 (2026-08-03):** Build 122 (`20260803-v0.1.120`). Live/Production remains on prior soak build. Home Post composer grows with draft length (no 160px clip).

**Home Post composer auto-grow (2026-08-03):** Draft textarea grows with content (removed 160px height cap) so long messages stay fully visible while composing.

**Testing v0.1.119 (2026-08-03):** Build 121 (`20260803-v0.1.119`). Live/Production remains on prior soak build. Includes org Social accounts + Publish to….

**Org social publish (2026-08-03):** Official `@civizen` account can connect LinkedIn / Facebook / X under Settings → Social accounts, then use Home **Publish to…** (Share icon, next to Comment) after a Civizen post exists. Not simultaneous. LinkedIn company page `143053953`. LANGUAGE_PACK_VERSION 110.

**Home Post composer placeholder (2026-08-03):** Composer empty state is now “Share an idea, update, or opportunity...” (was “What’s on your mind?”). LANGUAGE_PACK_VERSION 109.

**Testing v0.1.118 (2026-08-03):** Build 120 (`20260803-v0.1.118`). Live/Production remains on **v0.1.106** until soak. Includes Home post composer placeholder copy.

**Learning trainings panel (2026-08-03):** Selecting Learning opens Education plus a Trainings sentence card (“I have attended training on [cycling multi-select]”). Trainings persist in `profile_training_entries` and add a secondary Learning boost (degree remains primary). `SCORE_CALCULATION_VERSION` → `civizen-score-v1.2`. LANGUAGE_PACK_VERSION 108.

**Learning level-aware scoring (2026-08-03):** Learning is no longer count-only. Highest education level drives the preliminary score (`EDUCATION_LEVEL_BASE_SCORE`); custom labels like **5-Year Diploma Degree** normalize to master’s (68). Verification and extra credentials still boost. Wired through Profile / Home / UserProfile (`education_level` select). `SCORE_CALCULATION_VERSION` → `civizen-score-v1.1`. **Testing v0.1.115** (build 117).

**Experience duration scoring (2026-08-03):** Experience is scored primarily from cumulative months (union of intervals, diminishing returns), not entry count. Extra roles add only a small breadth bonus so 2×3-year jobs outrank 3×6-month hops. Spec-aligned: years alone do not run away. **Testing v0.1.114**.

**Experience field hover + Present default (2026-08-03):** Positions cycle pauses when hovering/opening any sentence token (areas, positions, duration, companies). Duration To is pre-filled as Present (“from – Present”). LANGUAGE_PACK_VERSION 107. **Testing v0.1.113** (build 115).

**Experience edit on hover (2026-08-03):** Committed experience rows show Edit/Delete only on hover (always visible on touch). Edit loads the entry into the sentence builder; saving replaces it in place. LANGUAGE_PACK_VERSION 106. **Testing v0.1.112** (build 114).

**Experience positions preview cycle (2026-08-03):** Empty positions token cycles through catalog titles (Analyst, Director, …) instead of the word “positions”; pauses on hover/focus/open so the user can select. **Testing v0.1.111** (build 113).

**Profile Experience Present duration (2026-08-03):** Duration picker is From / To. Selecting From defaults To to **Present** (shown as “May 2002 – Present”); To can still be any month/year. Legacy single-point entries migrate to start + Present. LANGUAGE_PACK_VERSION 105. **Testing v0.1.110** (build 112).

**Percent ring fix (2026-08-03):** Multi-colored tier-band track + split dashed progress made the ring look distorted and like progress sat in the wrong tiers. Restored one muted track, one continuous progress stroke, and slim tier separators only. **Testing v0.1.109**.

**Dial photo/progress core (2026-08-02):** Modest ~11% larger photo + percent ring (`dialRingSize` 176, photo 8.5rem). `RING_INNER` raised 108→118 to reclaim gutter; factor band height stays mostly intact for Contributions / Performance labels. **Testing v0.1.108**.

**Dial size for mobile labels (2026-08-02):** Score dial uses `max-w-lg` (same content width as Score categories) with a tighter SVG viewBox so the ring fills more of the square. Slightly larger name type + floor so Contributions / Performance stay readable; page `px-4` keeps a side margin. **Testing v0.1.107**.

**Live + Testing v0.1.106 (2026-08-02):** Build 108 (`20260802-v0.1.106`) published to both channels (explicit PROD ship). Includes Performance scoring, Contributions fairness, AI skills catalog, dial tier-ring readability, and sole-author Git attribution guards.

**Git attribution (2026-08-02):** All commit authors remapped to `maturehumanity` only (stripped Cursor co-authors; rewrote Lovable/gpt-engineer bot authors). Forced `origin/main`. Stats contributors = sole owner; `/contributors` list can lag GitHub cache. Guards: cli-config attribution off, `prepare-commit-msg` hook, `.cursor/rules/no-cursor-git-attribution.mdc`.

**Performance scoring v1 (2026-08-03):** Performance is a ratings layer on Contributions activities. System ratings derive from contribution capacity/impact/collaboration (verified + platform-direct weighted higher). Peer ratings in `profile_performance_ratings` (any member except self, one per event). Own Performance panel is read-only; other profiles can rate. Module: `src/lib/civizen-performance.ts`. Panel: `PerformanceDetailsPanel`. LANGUAGE_PACK_VERSION 104.

**Dial tier ring readability (2026-08-02):** Progress fill is split across the five unequal tier bands with hairline gaps + knockout separators so all sections stay visible when the ring is full (Builder teal no longer hides the 30% mark). Percent sits at the true tip (full 360°); upright from 45°–275° clockwise from top, tangent on the top wedge. **Testing v0.1.104**.

**AI skills catalog (2026-08-02):** Added AI / ML hard skills (e.g. Artificial intelligence (AI), Prompt engineering, LLMs, Generative AI) plus soft AI literacy. Short “AI” search uses token matching so Email/Air no longer false-hit.

**Unified Skills picker (2026-08-02):** One Skills sentence token opens a dual-column Hard | Soft list (stacked on narrow widths). Selecting a catalog skill auto-places it in the matching sentence list; custom add offers Hard or Soft. LANGUAGE_PACK_VERSION 103.

**Skill hover descriptions (2026-08-02):** Skills picker rows reveal a short plain-language description when hovered or keyboard-highlighted (`data-selected`). Descriptions live in `profile-skill-descriptions.ts`; search also matches description text.

**Contributions fairness fix (2026-08-02):** Armen’s 42.6 / Activities 4 came only from chat-mirrored `content_items`. Real platform work lives in `development_stories` (513 for @armen) and was not collected. Now: collect/score development stories, skip private_messages/messages content mirrors, impact-weighted quantity + sustained boost, grouped ledger UI. LANGUAGE_PACK_VERSION 102.

**Contributions activity scoring (2026-08-02):** Pipeline D+C — collect in-app civic activity into `profile_contribution_events`, estimate capacity/impact/collaboration/beneficiaries, score Contributions (anti-gaming diminishing quantity + impact), and show an activity ledger on dial/card select (`ContributionsDetailsPanel`). Sources: law, funding records, solutions, governance, posts/comments, content_items. Migration backfills history. Module: `src/lib/civizen-contributions.ts`. LANGUAGE_PACK_VERSION 101.

**Profile Experience sentence (2026-08-02):** Selecting Experience on the Score dial/cards opens a Learning-style sentence panel: “My experience includes the following [areas] at the position of [positions] for the duration of [month–year range] with [companies].” Completing all four tokens commits an entry under the lead-in (bulleted when more than one). Apple-style month/year dual picker; duration displays as a range when multiple points are selected. Autosaves to `profile_experience_entries`. Feeds preliminary Experience score. LANGUAGE_PACK_VERSION 100. **Testing v0.1.97** (build 99).

**Expanded Skills catalog (2026-08-02):** Hard/soft seed lists broadened (driving variants, pilot specialties, trades, healthcare, languages, civic practice, IT, etc.). Typing “Driving” or “Pilot” surfaces specialty rows; custom add remains available. LANGUAGE_PACK_VERSION 99.

**Profile Skills hard/soft + scoring (2026-08-02):** Skills sentence is “I possess the following hard skills: […] and soft skills: […].” Declared skills now feed a preliminary Skills category score (same diminishing curve as Learning). Root cause of missing rating: `buildScoreFromProfileActivity` only wired education → Learning. LANGUAGE_PACK_VERSION 99.

**Profile Skills sentence (2026-08-02):** Selecting Skills on the Score dial/cards opens a Learning-style sentence panel: “I possess the [multi-select Skills] skills.” Selected skills fill the token with English list formatting (commas + “and”). Autosaves to `profile_skills_entries`. LANGUAGE_PACK_VERSION 98.

**Score cards collapse + Progress bottom (2026-08-02):** Score category cards show a single line (name + score) until selected on the dial or tapped; tap again collapses. Progress to Builder moved to the bottom of the Score page. **Testing v0.1.93** (build 95).

**Profile identity + tier colors (2026-08-02):** Score page puts bio (inline editable on click/hover pencil) then name · @username with verified check (replaces world-citizenship info icon; check removed from photo corner). Name sits under the bio so the tier stays the hero. Tier palette: Explorer `#7B8AA1` · Builder `#2BA8A0` · Contributor `#3B82F6` · Catalyst `#8B5CF6` · Steward `#D9A441` (`TIER_COLORS`). LANGUAGE_PACK_VERSION 97. **Testing v0.1.92** (build 94).

**Dial progress % on arc (2026-08-02):** Percent is plain SVG text on the filled progress stroke, rotated to the arc tangent — no pill/badge/background. Prior mistake was treating it like a floating chip. **Testing v0.1.91** (build 93).

**Dial progress ring % (2026-08-02):** Ring was too thin and % sat under the photo (SVG label on the wrong radial band). Ring is now a thick battery-style track; percent pill rides the tip of the filled arc inside the stroke. `common.yes` / `common.no` added so tier requirements don’t show raw keys. LANGUAGE_PACK_VERSION 96. **Testing v0.1.90** (build 92).

**Dial photo camera + ring % (2026-08-02):** Hover/focus on the dial photo shows a centered camera overlay (full icon, not clipped at the corner). Score percent sits inside the bottom of the circular progress ring (battery-style), not under the photo. **Testing v0.1.89** (build 91).

**Score page header + dial hint (2026-08-02):** Score overview shows **tier name** on line 1 and compact **Civizen Score · 8.4** (smaller) with info icon on line 2. Stage, confidence, points to next tier, /100 score, and last updated live in the score info hover. Dial rotate hint sits **inside** the bottom-left ring corner (toward the dial), not outside. LANGUAGE_PACK_VERSION 95. **Testing v0.1.88**.

**Score dial Explorer + education flush (2026-08-02):** Unscored profiles display **Explorer** (not “Not yet scored”) on Score overview / Home; dial shows battery-style **0%** on a slightly thicker ring. Education panel flushes save on close and refreshes score inputs — certificate is not required for a preliminary Learning score. Spec Test 1 updated in `docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md`. **Testing v0.1.88**.

**Civizen Score tiers (2026-08-02):** Public tier system is Explorer · Builder · Contributor · Catalyst · Steward (not Stage: Building). Higher tiers require Performance/Contributions floors, confidence, and verified activity. Low scores use developmental colors (not red). Spec: `docs/03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md`. Module: `src/lib/civizen-score-tiers.ts` (rules v1.0.0). LANGUAGE_PACK_VERSION 94.

**Civizen Score reorganization (2026-08-02):** Home score card and `/profile` Score page use five score categories — Learning, Experience, Skills, Performance, Contributions — instead of an endorsement-only overall score. Missing scores show **Not yet scored** (never silent zeros). Confidence and stage are separate from the number. Domains/pillars live under **Activity by Domain**; endorsements under **Evidence & Validation**. Core model: `src/lib/civizen-score.ts` (`civizen-score-v1`). Spec: `docs/03-platform/scoring-and-reputation/civizen-score-page-reorganization.md`. LANGUAGE_PACK_VERSION 93.

**Live + Testing v0.1.75 (2026-08-02):** Build 77 (`20260802-v0.1.75`) promoted to Live/Production (same APK bytes as Testing). New approved Civizen brand mark / launcher icons, Solutions Discuss/Solve, theme-toggle hover polish, Funding admin tab packing. Default Live channel previously stayed on v0.1.49, so devices on Live saw no update prompt for Testing-only builds.

**Settings Funding tabs (2026-08-02):** Funding admin section tabs pack tightly (`gap-0.5`, content-sized list) and scroll horizontally when they overflow; active tab scrolls into view. Page clips horizontal overflow; tab strip uses `overflow-y-hidden` so a secondary vertical scrollbar gutter does not appear.

**Settings Funding admin (2026-08-02):** Settings lists a single **Funding** admin row (`/settings/admin/funding`). Interest · Ledger · Audit · Compliance · Contributors use compact underline tabs (horizontally scrollable when they overflow; scrollbar hidden). Legacy `/settings/admin/funding-*` paths redirect. LANGUAGE_PACK_VERSION 87.

**Settings App channel (2026-08-02):** Removed the standalone App channel settings row. Authorized testers (`updates.test`) switch Live/Test via a flask icon beside Application version — hover opens the menu on fine pointers; click opens/toggles; selecting Live or Test applies the channel. Hint text lives in the popover footer.

**Profile dial Education card (2026-08-02):** Sentence is “Degree in Field focusing on Specialization from Institution, completed in Year in City[, State], Country.” Province hidden for smaller countries. Dropdowns highlight selected row (no checkmarks). Unverified/certificate icons before autosave. LANGUAGE_PACK_VERSION 92. **Testing v0.1.83**.

**Profile pillar dial (2026-08-02):** Dial layout locked: icon upper-left / name centered / score upper-right (equal corner inset). Credential disclaimer on Profile is a compact **info icon** beside the score (hover = summary, click = `/about/world-citizenship`). Score-page dial segments now use **score categories** (Learning → Skills → Performance → Contributions → Experience clockwise); domain labels moved to Activity by Domain.

**Theme toggle hover (2026-08-02):** Color mode control (public header + Settings) uses Popover like language select: hover opens Light/Dark/System; hover flips sun/moon to the opposite mode; click on the icon applies the opposite mode. `ThemeStorageSync` hydrates once only so it cannot revert theme changes.

**Governance Solutions Discuss/Solve (2026-08-02):** `/governance/solutions` supports **Discuss** (default: public thread + AI participation) and **Solve** (categorize → route to civic authority taxonomy → seek certified professional). Catalog: 37 jurisdiction-agnostic authorities in `solution-authorities.ts`. Copy updated on Governance landing. LANGUAGE_PACK_VERSION 82.

**Home Post composer (2026-08-02 / 2026-08-03):** Placeholder is name-free (“Share an idea, update, or opportunity...”) because Welcome already greets the user; empty state uses `SlowRunningText` with `onlyWhenOverflow` on narrow widths. LANGUAGE_PACK_VERSION 109.

**Civizen logo (2026-08-02):** Replaced hand-drawn mark with assets converted from the approved Primary logo + icon-only PNGs (`docs/04-operations/dev/brand-source/`). `scripts/convert-brand-logos.mjs` knocks out paper white, builds light/dark transparent marks + app tiles + SVG wrappers. Header uses `CivizenBrandIcon` → `civizen-mark-256.png` / `civizen-mark-dark-256.png`. Slogan unchanged: **For a Mature Humanity**.

**Governance Solutions council (2026-08-02):** Member surface `/governance/solutions` — post a Problem; `solutions-agent-council` runs ChatGPT → Gemini → Claude until consensus or split. Migration applied; edge function deployed. Ops: `docs/04-operations/dev/solutions-council.md` (set `ANTHROPIC_API_KEY` for Claude). Links from Governance landing + Settings. LANGUAGE_PACK_VERSION 80.

**Public auth brand lockup (2026-08-02):** `PublicAuthHeader` keeps the mark on the same row as the title (Civizen); slogan sits under the title, indented past the icon.

**Public sticky header auto-hide (2026-08-02):** Public chrome (`PublicPageHeader` via shell + onboarding) is fixed at the top (logo + language + theme; no account icon). Hides on scroll down, reappears on scroll up; elevates with blur/border after leaving the top. Safe-area padding lives on the header; page shells no longer double-apply `safe-top`. Single-segment trails (e.g. Login “Civizen”) sit beside the logo on the same row; multi-segment trails still use row 2 with overflow root-lift.

**Public section trail (2026-08-02):** Path uses ` > ` spacing. Full path stays on the second line when it fits; if it overflows, the root section lifts beside the logo and the remaining crumbs stay on line 2 (scrollable, last crumb fully visible, leading `…` when needed).

**Civic voting chrome (2026-08-02):** Section label beside the logo shows at all widths (truncates). Visitor back control is a `<` chevron inline before the page title (no separate “Back to …” button row).

**Onboarding hero + harm card (2026-08-02):** Hero card no longer duplicates the Civizen mark (public header logo is enough). Harm card uses a fieldset legend for “Harm we work to end”; Integrity is Fraud · Lies · Irresponsibility; items are inline comma-separated text. LANGUAGE_PACK_VERSION 78.

**Governance nav clarity (2026-08-02):** `/governance` = public Governance landing; `/governance/voting` = Elections catalog (chrome label stays “Governance”; in-page title remains Civic voting / Elections). Back control is “Back to Governance”. Landing product/system-map Governance cards link to `/governance`. LANGUAGE_PACK_VERSION 77.

**Public chrome polish (2026-08-02):** Language menu opens on hover (fine pointers) and click; selected row is highlighted without a left checkmark. Public header shows the section name beside the logo from `sm` up. Footer legal disclaimer paragraph moved off every page — full notice stays on `/about/legal-status`; footer keeps the Legal status link. **Testing v0.1.53** (build 55, `20260802-v0.1.53`).

**Public home logo + Node LTS (2026-08-02):** Public pages show the Civizen mark top-left linking to `/` (`PublicHomeLogo` / `PublicPageHeader`). Language/theme stay top-right. Node pinned to **24.18.1** (latest LTS Krypton) via `.nvmrc` + `engines`; local nvm default and production `/usr/local` runtime updated. Ubuntu apt `nodejs` 18 may still exist as `/usr/bin/node` without sudo removal — shells should prefer nvm/`~/bin`. **Testing v0.1.52** (build 54, `20260802-v0.1.52`); Live/Production Android remains on prior release until soak.

**Public language select flags (2026-08-02):** Closed control shows a round country flag (not the language name); dropdown rows keep labels and add the matching round flag on the left. Globe icon beside the control removed (it was a language affordance, not a home logo). Helper: `getLanguageFlagCountryCode` in `i18n.runtime.ts`. **Testing v0.1.51** (build 53, `20260802-v0.1.51`); Live/Production remains on prior release until soak.

**Purpose-alignment correction v0.5 (2026-08-01):** Coordinated docs + public-copy pass distinguishing Civizen’s **current** voluntary, non-governmental stage from its **long-term** aim to unite people as citizens of humanity and build a legitimate pathway toward recognized planetary citizenship. Pathway: `/about/planetary-citizenship-pathway`. Terms `2026-08-01-purpose-alignment-v1` (re-consent). LANGUAGE_PACK_VERSION 70. Standing rule: distinguish “not currently” from “never.” Public language remains interim and subject to professional legal/institutional review.

**Profile location + civic voting Global (2026-08-01):** Profile city/region, device geolocation, searchable geo catalogs, Global contest filter, and sample global steward election. **Testing v0.1.50** (build 52, `20260801-v0.1.50`); **Live/Production remains on v0.1.49** (build 51) until soak. LANGUAGE_PACK_VERSION 76.

**World Citizenship notice (2026-07-31):** `/about/world-citizenship` rewritten so long-term purpose (uniting people; democratic/institutional/technological/legal foundations for a broadly adopted, legitimately recognized planetary citizenship that could one day become official and potentially complement national citizenship) comes before a shorter Present Legal Status disclaimer. Removes “community activation”; clarifies current status is voluntary/non-governmental without implying the recognition goal is abandoned. Short/credential/readiness i18n notices aligned.

**Biometric sign-in (2026-07-31):** Android Capacitor `BiometricAuth` plugin unlocks an EncryptedSharedPreferences-stored Supabase session via BiometricPrompt. Enable under Settings → Privacy; Login shows “Sign in with biometrics” when a vault session exists. Web/stub reports unavailable. Native: `BiometricAuthPlugin.java`; JS: `src/lib/biometric-auth-plugin.ts`, `src/lib/biometric-sign-in.ts`. **Testing v0.1.48** (build 50) published; Live/Production remains on v0.1.47 until soak.

**Public governance browsing (2026-07-31):** `/governance` is a public landing; `/governance/voting` (+ election detail/observe) are public. Member proposal hub moved to `/governance/workspace`. Anon SELECT on `civic_elections` / contests / candidates / voting_events. Home Governance card visible to all signed-in roles including guests; public footer links to Governance.

**Civic voting UI declutter (2026-07-31 / 2026-08-01):** Election detail shows title + candidates first; session tools folded. Hub: scrollbar-free centered soft-colored tier tabs; default tier = nearest deadline; compact 2-row cards; Elections header = count beside title + City/State/country-flag location filters.

**Profile current location (2026-08-01):** `profiles.city` + `profiles.region_code` (migration applied). Edit Profile has City / State + “Use device location” (GPS permission → BigDataCloud reverse geocode → city, region, country). Voting hub defaults filters from profile location; if missing, requests device location once and persists to profile. Android manifest includes fine/coarse location. LANGUAGE_PACK_VERSION 75.

**Civic voting Global filter (2026-08-01):** Country menu “All countries” replaced by **Global** (planet icon) for Civizen-wide contests (`scope_country_code = GLOBAL`). Sample global steward election seeded. Hub/detail pages use minimal `px-1` inset (not flush, not padded).

**Civic voting location catalogs (2026-08-01):** Country / state / city filters use full geo catalogs (`country-state-city`, lazy-loaded) merged with election-specific localities. Searchable menus; LANGUAGE_PACK_VERSION 76. Fixed startup crash: `Intl.DisplayNames` threw `invalid_argument` for `GLOBAL` scope on election cards — `getCountryName` now rejects non–alpha-2 codes safely.

**Remaining remediation v0.4 (2026-07-30 / 2026-07-31):** Application remediation for governance Program Readiness (no activation/demographic admin UI), residual funding/payment/transfer copy purge, clean verify gate (`npm ci` / lint / full Vitest / build / `verify:post-dev`), and release **v0.1.46** (build 48, `20260730-v0.1.46`). Engineering standards baseline reviewed and frozen with remediation doc. Canonical repository history is cleaned. **GitHub cached-object removal is pending Support** — full historical erasure is not verified. Do not claim full purge while SHA `4475df4d515e9ab7ed39f82de8ceb508638f9056` remains retrievable.

**P0-01 program readiness admin:** `/settings/admin/governance` shows Program Readiness only. Demographic ingest/feed adapters removed from the production route graph; dormant activation-demographic feed tooling lives under `research/governance-simulations/activation-demographic-feeds/` (not imported by the app). Decision labels map at the presentation boundary.

**P0-03 dead monetary copy:** Funding calculator/distribution and market buy/peerSend keys removed; agreement/prototype wording; LANGUAGE_PACK_VERSION 61.

**Institutional correction (prior):** Public tree lacks the institutional source package and superseded archives (private copies retained). Funding calculator/distribution UI removed; distribution and Luma-transfer RPCs blocked. Member ID / world-citizenship / Luma Option A / Terms `2026-07-30-institutional-v2` affirmative re-consent remain. Restricted operational materials stay out of the public tree (ops in access-controlled store). Canonical public institutional policy remains under `docs/02-policies/institutional/` with in-app index `/documents`. Do not republish hostnames, keys, ports, usernames, or production server paths in public docs. Re-clone any old local checkouts.

**P1-01 strict Luma prototype (2026-07-30):** Wallet UX renamed to Prototype credits (`/settings/prototype-credits`; `/settings/wallet` and `/settings/luma-wallet` redirect). PeerSendLumaDialog removed from production. Market Buy button removed; Start agreement / Contact only; illustrative credit amount copy. Issuance/policy engine moved to `research/economic-simulations/luma-monetary-model/` (non-operational); production uses `src/lib/prototype-credits.ts` helpers + controlling notice. GovernanceAdmin monetary policy save UI removed.

**P1-02 / P1-03 UI copy (2026-07-30):** Onboarding/public/fund/product i18n and README claims corrected (voluntary profile, non-governmental, Luma non-settling prototype, open-source orientation, staged auditability). Activation review statuses mapped at presentation boundary to readiness / program-availability labels; citizen hub no longer shows coverage % of residents.

**Public institutional UI wiring (2026-07-30):** `WorldCitizenshipStatusNotice` on Edit Profile (credential), social card, Profile, Governance hub header + activation readiness; institutional doc metadata (publication/effective/last updated, professional review, superseded/archived) on document pages and index badges; peer Luma transfer UI removed from production (`PeerSendLumaDialog` deleted); Terms acceptance version centralized in `src/lib/terms-version.ts` as `2026-07-30-institutional-v2`, with `TermsReconsentGate` on `ProtectedRoute` for version-aware affirmative re-consent.

**Public institutional surfaces:** Public Part III docs under `docs/02-policies/institutional/`; community charter under `policies/governance/`. Public app corrections: `/fund` inquiry copy without return percentages; `/fund/invest` non-offering notice; `/fund/transparency` without founder reserve / distribution engine; Terms/signup/footer legal-status + world-citizenship notices; SSN labels → Civizen Member ID; Luma described as prototype credits; LICENSE no longer claims MIT until verified. Public routes: `/documents`, `/about/*`, `/governance/about`, `/governance/charter`, `/transparency`, `/partners`, `/contribute/policy`.

**Stale chunk / startup crash after deploy (2026-07-24):** Fixed root cause of “Failed to fetch dynamically imported module” / “Civizen hit a startup issue” on `civizen.world` — missing hashed assets must return a real 404 (not SPA HTML); client auto-reloads once on chunk-load errors (`chunk-load-recovery`, `lazyWithChunkReload`); toaster/sonner are eager so they cannot fail as orphan lazy chunks. Deploy merge/asset-preservation procedures live in the access-controlled operations store.

**Levela leftovers in live data (2026-07-30):** User still saw Levela in profile menu, Nela chat, and Home — not from i18n source, but from DB: business account `biz_levela` / full_name `Levela`, linked `business_name_normalized=levela`, Home welcome post, and 6 Nela conversation messages. Scrubbed via `20260730220000_scrub_levela_user_visible_content.sql`.

**Why Civizen Exists page (2026-07-23):** `/why-this-exists` rewritten from `docs/00-foundation/why-civizen-exists-page-brief.md` — founder message structure, diversity reassurance section, three CTAs (signup / book / GitHub). Book URL is interim Amazon search via `MATURE_HUMANITY_BOOK_URL` in `src/lib/onboarding-links.ts` until a permanent store URL is configured.

**GitHub:** Canonical repo is [`maturehumanity/civizen`](https://github.com/maturehumanity/civizen). Legacy [`maturehumanity/levela`](https://github.com/maturehumanity/levela) is **archived** (README points here).

**Civizen rebrand (deep rename) — shipped to `https://civizen.world`.** Android identity is `com.civizen.app`. See `docs/04-operations/dev/CIVIZEN_REBRAND.md`.

**Slogan:** ship **For a Mature Humanity** (replaces Live Next Level). Future candidate parked: **Live as Civil Citizen**.

**Temporary host redirect:** `levela.yeremyan.net` → 301 → `civizen.world` (path-preserving). Remove the host later when old traffic dies down.

**Android update flow (2026-07-31):** Default Live; Test channel gated by `updates.test`. In-app APK install via `ApkUpdater`. Fixed “download again” loop: `INSTALL_PERMISSION_REQUIRED` keeps the prompt (no WebView navigate / no early dismiss). **v0.1.47** (build 49, `20260731-v0.1.47`) on Testing and Live.

**Funding readiness (Fund Civizen)** — Public inquiry surfaces updated per institutional policy. Canonical *public* policy: `docs/02-policies/institutional/`. Superseded exploratory funding materials are not current policy. Funding calculator/distribution UI removed.

Secondary UI focus remains **NavSecondaryCarousel / Market arc menu** — geometry must match `docs/04-operations/dev/nav-secondary-carousel.md`.

## Mandatory reads before UI work

1. `docs/04-operations/dev/AGENTS.md` (especially §0 and post-dev verification)
2. `docs/04-operations/dev/nav-secondary-carousel.md` when touching secondary nav or Market bottom carousel
3. `docs/04-operations/dev/contribute-page.md` when touching `/contribute` or contribution hub lanes
4. `memory-bank/systemPatterns.md` for component map
5. `docs/02-policies/institutional/README.md` (and funding integrity / legal status) when touching funding pages or institutional copy
6. `docs/00-foundation/recognized-planetary-citizenship-pathway.md` when touching onboarding, identity, citizenship, governance, elections, legal status, partnerships, or public mission copy

## Verification

After front-end changes: `npm run verify:post-dev`
