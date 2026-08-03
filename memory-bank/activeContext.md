# Active context

## Current focus

**Profile Experience Present duration (2026-08-03):** Duration picker is From / To. Selecting From defaults To to **Present** (shown as “May 2002 – Present”); To can still be any month/year. Legacy single-point entries migrate to start + Present. LANGUAGE_PACK_VERSION 105.

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

**Score dial Explorer + education flush (2026-08-02):** Unscored profiles display **Explorer** (not “Not yet scored”) on Score overview / Home; dial shows battery-style **0%** on a slightly thicker ring. Education panel flushes save on close and refreshes score inputs — certificate is not required for a preliminary Learning score. Spec Test 1 updated in `docs/civizen_score_tiers_implementation.md`. **Testing v0.1.88**.

**Civizen Score tiers (2026-08-02):** Public tier system is Explorer · Builder · Contributor · Catalyst · Steward (not Stage: Building). Higher tiers require Performance/Contributions floors, confidence, and verified activity. Low scores use developmental colors (not red). Spec: `docs/civizen_score_tiers_implementation.md`. Module: `src/lib/civizen-score-tiers.ts` (rules v1.0.0). LANGUAGE_PACK_VERSION 94.

**Civizen Score reorganization (2026-08-02):** Home score card and `/profile` Score page use five score categories — Learning, Experience, Skills, Performance, Contributions — instead of an endorsement-only overall score. Missing scores show **Not yet scored** (never silent zeros). Confidence and stage are separate from the number. Domains/pillars live under **Activity by Domain**; endorsements under **Evidence & Validation**. Core model: `src/lib/civizen-score.ts` (`civizen-score-v1`). Spec: `docs/civizen_score_page_reorganization.md`. LANGUAGE_PACK_VERSION 93.

**Live + Testing v0.1.75 (2026-08-02):** Build 77 (`20260802-v0.1.75`) promoted to Live/Production (same APK bytes as Testing). New approved Civizen brand mark / launcher icons, Solutions Discuss/Solve, theme-toggle hover polish, Funding admin tab packing. Default Live channel previously stayed on v0.1.49, so devices on Live saw no update prompt for Testing-only builds.

**Settings Funding tabs (2026-08-02):** Funding admin section tabs pack tightly (`gap-0.5`, content-sized list) and scroll horizontally when they overflow; active tab scrolls into view. Page clips horizontal overflow; tab strip uses `overflow-y-hidden` so a secondary vertical scrollbar gutter does not appear.

**Settings Funding admin (2026-08-02):** Settings lists a single **Funding** admin row (`/settings/admin/funding`). Interest · Ledger · Audit · Compliance · Contributors use compact underline tabs (horizontally scrollable when they overflow; scrollbar hidden). Legacy `/settings/admin/funding-*` paths redirect. LANGUAGE_PACK_VERSION 87.

**Settings App channel (2026-08-02):** Removed the standalone App channel settings row. Authorized testers (`updates.test`) switch Live/Test via a flask icon beside Application version — hover opens the menu on fine pointers; click opens/toggles; selecting Live or Test applies the channel. Hint text lives in the popover footer.

**Profile dial Education card (2026-08-02):** Sentence is “Degree in Field focusing on Specialization from Institution, completed in Year in City[, State], Country.” Province hidden for smaller countries. Dropdowns highlight selected row (no checkmarks). Unverified/certificate icons before autosave. LANGUAGE_PACK_VERSION 92. **Testing v0.1.83**.

**Profile pillar dial (2026-08-02):** Dial layout locked: icon upper-left / name centered / score upper-right (equal corner inset). Credential disclaimer on Profile is a compact **info icon** beside the score (hover = summary, click = `/about/world-citizenship`). Score-page dial segments now use **score categories** (Learning → Skills → Performance → Contributions → Experience clockwise); domain labels moved to Activity by Domain.

**Theme toggle hover (2026-08-02):** Color mode control (public header + Settings) uses Popover like language select: hover opens Light/Dark/System; hover flips sun/moon to the opposite mode; click on the icon applies the opposite mode. `ThemeStorageSync` hydrates once only so it cannot revert theme changes.

**Governance Solutions Discuss/Solve (2026-08-02):** `/governance/solutions` supports **Discuss** (default: public thread + AI participation) and **Solve** (categorize → route to civic authority taxonomy → seek certified professional). Catalog: 37 jurisdiction-agnostic authorities in `solution-authorities.ts`. Copy updated on Governance landing. LANGUAGE_PACK_VERSION 82.

**Home Post composer (2026-08-02):** Placeholder is name-free (“What’s on your mind?”) because Welcome already greets the user; empty state uses `SlowRunningText` with `onlyWhenOverflow` on narrow widths. LANGUAGE_PACK_VERSION 81.

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

**Institutional correction (prior):** Public tree lacks the institutional source package and superseded archives (private copies retained). Funding calculator/distribution UI removed; distribution and Luma-transfer RPCs blocked. Member ID / world-citizenship / Luma Option A / Terms `2026-07-30-institutional-v2` affirmative re-consent remain. Restricted operational materials stay out of the public tree (ops in access-controlled store). Canonical public institutional policy remains under `docs/02-moderated/policies/institutional/` with in-app index `/documents`. Do not republish hostnames, keys, ports, usernames, or production server paths in public docs. Re-clone any old local checkouts.

**P1-01 strict Luma prototype (2026-07-30):** Wallet UX renamed to Prototype credits (`/settings/prototype-credits`; `/settings/wallet` and `/settings/luma-wallet` redirect). PeerSendLumaDialog removed from production. Market Buy button removed; Start agreement / Contact only; illustrative credit amount copy. Issuance/policy engine moved to `research/economic-simulations/luma-monetary-model/` (non-operational); production uses `src/lib/prototype-credits.ts` helpers + controlling notice. GovernanceAdmin monetary policy save UI removed.

**P1-02 / P1-03 UI copy (2026-07-30):** Onboarding/public/fund/product i18n and README claims corrected (voluntary profile, non-governmental, Luma non-settling prototype, open-source orientation, staged auditability). Activation review statuses mapped at presentation boundary to readiness / program-availability labels; citizen hub no longer shows coverage % of residents.

**Public institutional UI wiring (2026-07-30):** `WorldCitizenshipStatusNotice` on Edit Profile (credential), social card, Profile, Governance hub header + activation readiness; institutional doc metadata (publication/effective/last updated, professional review, superseded/archived) on document pages and index badges; peer Luma transfer UI removed from production (`PeerSendLumaDialog` deleted); Terms acceptance version centralized in `src/lib/terms-version.ts` as `2026-07-30-institutional-v2`, with `TermsReconsentGate` on `ProtectedRoute` for version-aware affirmative re-consent.

**Public institutional surfaces:** Public Part III docs under `docs/02-moderated/policies/institutional/`; community charter under `policies/governance/`. Public app corrections: `/fund` inquiry copy without return percentages; `/fund/invest` non-offering notice; `/fund/transparency` without founder reserve / distribution engine; Terms/signup/footer legal-status + world-citizenship notices; SSN labels → Civizen Member ID; Luma described as prototype credits; LICENSE no longer claims MIT until verified. Public routes: `/documents`, `/about/*`, `/governance/about`, `/governance/charter`, `/transparency`, `/partners`, `/contribute/policy`.

**Stale chunk / startup crash after deploy (2026-07-24):** Fixed root cause of “Failed to fetch dynamically imported module” / “Civizen hit a startup issue” on `civizen.world` — missing hashed assets must return a real 404 (not SPA HTML); client auto-reloads once on chunk-load errors (`chunk-load-recovery`, `lazyWithChunkReload`); toaster/sonner are eager so they cannot fail as orphan lazy chunks. Deploy merge/asset-preservation procedures live in the access-controlled operations store.

**Levela leftovers in live data (2026-07-30):** User still saw Levela in profile menu, Nela chat, and Home — not from i18n source, but from DB: business account `biz_levela` / full_name `Levela`, linked `business_name_normalized=levela`, Home welcome post, and 6 Nela conversation messages. Scrubbed via `20260730220000_scrub_levela_user_visible_content.sql`.

**Why Civizen Exists page (2026-07-23):** `/why-this-exists` rewritten from `docs/civizen_why_this_exists_page_brief.md` — founder message structure, diversity reassurance section, three CTAs (signup / book / GitHub). Book URL is interim Amazon search via `MATURE_HUMANITY_BOOK_URL` in `src/lib/onboarding-links.ts` until a permanent store URL is configured.

**GitHub:** Canonical repo is [`maturehumanity/civizen`](https://github.com/maturehumanity/civizen). Legacy [`maturehumanity/levela`](https://github.com/maturehumanity/levela) is **archived** (README points here).

**Civizen rebrand (deep rename) — shipped to `https://civizen.world`.** Android identity is `com.civizen.app`. See `docs/04-operations/dev/CIVIZEN_REBRAND.md`.

**Slogan:** ship **For a Mature Humanity** (replaces Live Next Level). Future candidate parked: **Live as Civil Citizen**.

**Temporary host redirect:** `levela.yeremyan.net` → 301 → `civizen.world` (path-preserving). Remove the host later when old traffic dies down.

**Android update flow (2026-07-31):** Default Live; Test channel gated by `updates.test`. In-app APK install via `ApkUpdater`. Fixed “download again” loop: `INSTALL_PERMISSION_REQUIRED` keeps the prompt (no WebView navigate / no early dismiss). **v0.1.47** (build 49, `20260731-v0.1.47`) on Testing and Live.

**Funding readiness (Fund Civizen)** — Public inquiry surfaces updated per institutional policy. Canonical *public* policy: `docs/02-moderated/policies/institutional/`. Superseded exploratory funding materials are not current policy. Funding calculator/distribution UI removed.

Secondary UI focus remains **NavSecondaryCarousel / Market arc menu** — geometry must match `docs/04-operations/dev/nav-secondary-carousel.md`.

## Mandatory reads before UI work

1. `docs/04-operations/dev/AGENTS.md` (especially §0 and post-dev verification)
2. `docs/04-operations/dev/nav-secondary-carousel.md` when touching secondary nav or Market bottom carousel
3. `memory-bank/systemPatterns.md` for component map
4. `docs/02-moderated/policies/institutional/README.md` (and funding integrity / legal status) when touching funding pages or institutional copy
5. `docs/02-moderated/policies/foundation/recognized-planetary-citizenship-pathway.md` when touching onboarding, identity, citizenship, governance, elections, legal status, partnerships, or public mission copy

## Verification

After front-end changes: `npm run verify:post-dev`
