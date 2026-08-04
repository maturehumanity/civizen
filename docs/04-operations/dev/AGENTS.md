# AGENTS Notes

This file stores project-specific notes for future AI agent work.

## 0. Mandatory context loading (every session, every UI task)

Before planning or editing, agents **must read**:

1. `memory-bank/activeContext.md`
2. This file (`docs/04-operations/dev/AGENTS.md`)
3. When work touches secondary nav, Market bottom menu, or `NavSecondaryCarousel`:
   **`docs/04-operations/dev/nav-secondary-carousel.md`** (canonical UX + geometry)
4. When work touches onboarding, identity, citizenship, governance, elections, legal status, partnerships, or public mission copy:
   **`docs/02-moderated/policies/foundation/recognized-planetary-citizenship-pathway.md`** (controlling long-term pathway)

Cursor enforces the same list via `.cursor/rules/civizen-project.mdc` (`alwaysApply: true`).

After substantive changes, update the spec and `memory-bank/activeContext.md` in the same session.

Run `npm run verify:agent-context` to confirm these files and cross-links exist.

## Production operations

Civizen uses managed application infrastructure and controlled deployment procedures. Production access, provider configuration, database migration access, recovery procedures, secrets management, host topology, and deployment runbooks are maintained in an access-controlled operations store.

Public repository documentation covers local development, testing, and general release requirements only. It does not authorize or describe production access.

When restricted ops configuration is available to the agent, perform production steps (migrations, deploys, live verification) privately without publishing details. Do not hand those steps back to the user as a default closing instruction unless access is definitively unavailable after a direct attempt.

## 1. Front Card Layout Preservation

- Treat the user-approved `/settings/profile` World Citizen front card layout as a fixed baseline unless the user explicitly asks to restructure it.
- Do not move existing front-card elements between layers, parent groups, or rows while implementing a small feature.
- For category-related work, only change the category-related element itself and the minimum supporting storage/admin wiring required.
- Before changing anything on the front card, inspect the current JSX and preserve:
  - parent-child relationships used by Build mode
  - existing `data-build-key` targets
  - existing spacing/alignment of non-category elements
- If a requested feature could affect layout structure, stop and isolate the change behind the smallest possible insertion point instead of refactoring the card.
- After any front-card change, verify that:
  - `ID Number`, `Given Name`, `Surname`, `Place of Birth`, `Date of Birth`, `Sex`, `Card Expires`, `Member Since`, and footer arrows remain in their existing visual structure
  - no duplicate or hidden replacement build targets were introduced
  - Build mode still maps the same visible element to the same intended layer

## 2. Repository File Hygiene

- Do not create new top-level or unrelated files in the repository unless they are clearly necessary for the requested task.
- Do not create stray tool/agent folders or files such as `.codex` inside the project unless there is a clear, user-requested purpose for them.
- Before creating any new file, prefer:
  - reusing an existing project file
  - placing notes/docs in `docs/04-operations/dev/` instead of the repo root
  - keeping temporary or tool-specific artifacts out of the project tree whenever possible
- If a new file is genuinely needed, choose the narrowest, most appropriate location and keep its purpose directly tied to the user’s request.

## 3. Persistent User Directives

- **Project-purpose preservation rule:** Legal and institutional disclaimers must accurately describe Civizen's current status, but must never erase, renounce, or permanently confine its long-term mission to unite people as citizens of humanity and develop a legitimate pathway toward recognized planetary citizenship. Always distinguish “not currently” from “never.”
- Do not ask the user to do work the agent can do itself (run commands, read or edit repo files, search the tree, run tests, inspect local config under the workspace). Only ask when something is genuinely impossible from here (for example passphrase entry on their TTY, secrets only they hold, or actions inside an account or UI only they control)—and then say briefly why.
- **Install and configuration default:** When a feature needs an install or environment setup (database extensions, migration apply, `.env` keys the agent can write, or production work the agent can reach via restricted ops configuration), **perform it in-session**. Do **not** hand those steps back to the user unless blocked after a direct attempt—then state the blocker and what was already tried. When restricted ops configuration is available, perform production steps privately without publishing details.
- Founder authority bootstrap rule: until the user explicitly says otherwise, keep `founder` as full-access across app and admin settings (including users/roles/permissions/governance/modules). Do not reduce founder access as part of decentralization refactors unless the user explicitly requests that transition in the same session.
- **Delegation stop rule:** Never end a turn with “you should apply the migration” (or similar) when the agent can run the project’s non-interactive migration path with restricted ops configuration available. Capture the outcome in-session, and only involve the developer if that path fails after a direct attempt. Do not publish hostnames, keys, or paths in the public repo.
- When the user gives recursive or standing instructions using phrases such as `Always`, `Never`, `make sure`, `don't`, `keep`, `preserve`, or similar strong directive language, treat them as persistent project rules, not one-off comments.
- Capture those instructions in context and continue following them across later requests unless the user explicitly changes or cancels them.
- Before making a change, check whether it conflicts with any previously stated standing instruction from the user.
- If a new request appears to conflict with an older standing instruction, pause and resolve that conflict narrowly instead of silently overriding the older rule.
- Especially preserve standing instructions about:
  - layout stability
  - keeping specific screens or components as the baseline
  - avoiding unrelated files or side effects
  - limiting scope to the exact requested area
- Never make unrequested changes. If a requested feature needs adjacent adjustments, keep them minimal and directly necessary, and say so clearly.
- **Clarifying questions only when ambiguous:** Do not use optional phrasing such as “If you want” or “Let me know if you’d like” when the user’s message already implies or requires a specific follow-up. In that case, either do the aligned work in the same turn or state plainly what you did and why. Ask a direct question only when intent is genuinely unclear or when you must choose among mutually exclusive options that were not specified.
- **Concurrent page ownership:** When the user is actively developing **Market** (market routes under `src/pages/` and closely related market components) or **Messaging** (`/messaging` and messaging pages/components), **avoid** unsolicited edits in those areas unless the task explicitly requires them. Prefer governance work in `src/lib/governance-*`, governance and admin settings pages, `Home.tsx` only when the change is clearly outside market/messaging, migrations, and `docs/04-operations/dev/`. If a change must touch shared layout or the router, keep the diff minimal and expect possible merge coordination with the user’s branch.
- Never use code-like or translation-key-like text on user-facing screens. Replace it with short, human-friendly labels that clearly describe the element.
- When the user asks for **continuous decentralization work** (for example “keep moving on” or equivalent), **chain the next bounded slice after each progress report** without waiting for another prompt—**prefer the same assistant reply** when the next slice is still small and unblocked—until you need product or technical clarification, hit a hard environment limit, or the user changes direction.
- When the session topic is **Civizen decentralization** (verifier mirror / federation rollout, roadmap §14–§17, or related governance ops), end each assistant report with **two** progress figures: **(1) Overall decentralization** — use `docs/04-operations/dev/verifier-federation/rollout-plan-v0.1.md` §9 row **Roadmap §17** (full product decentralization success condition; currently **~30–38%**). **(2) Active component** — the §9 table row that matches the work in that turn (for example **Roadmap §14 slice ~66–73%** for minimized-trusted-backend / federation exchange items, or **~100%** for the verifier-federation rollout plan §4 **implementation** row when that artifact is the scope; **§10 field rehearsal** remains a separate non-percentage gate). If both apply, state both component figures briefly. §9 percentages are **not calculated**; update the doc when a substantive milestone warrants it; **do not** bump figures for copy-only or cosmetic-only changes.
- Never place one visible element on top of another unless overlap is part of the element's intended design or the user explicitly asks for it.
- Make sure all user-visible assets and editable elements on every page are explicitly registered in Build mode and Layers, labeled in user-friendly language, and nested in the correct parent order so they can be selected and edited reliably.
- In Build mode, clicking a visible asset should select it without triggering its normal app interaction first, and the current selection should be shown in both the Build panel and the Layers panel.
- When an element is selected in Build mode, make sure the Layers tree auto-expands the relevant parent chain and visibly highlights and scrolls to that selected item.
- When tightening Build mode / Layers coverage on a page, audit earlier existing elements on that same page too, not just newly added elements, so older text/value nodes do not get left behind as group-only targets.
- Do not wait for the user to name missed sub-elements one by one. When a composite field is touched, audit and register its obvious inner parts in the same pass.
- Proactively enforce all standing instructions and notes in this file on future work. Do not wait for the user to repeat them when they clearly apply.
- When the user asks to **`update the application`**, follow a **testing-first continuity policy**:
  - Keep **Production** on the last known-good build.
  - Publish the **newly built version to Testing**.
  - Only move a Testing build to Production after there are no reported blockers for that Testing release.
  - Goal: users must always have a stable fallback build available.
- `npm run update:application` defaults to the Testing channel. Do not use `CIVIZEN_UPDATE_CHANNEL=release` or `CIVIZEN_UPDATE_CHANNEL=both` unless the user explicitly approves a Production promotion or emergency release.
- Treat `docs/04-operations/dev/ENVIRONMENT_LIFECYCLE.md` as the canonical release/data-isolation policy.
- Standard release sequence for continuity:
  1. If the current Testing build has no reported bugs, promote that exact tested build to Production with `npm run promote:android-testing-to-release`.
  2. Bump release metadata (`npm run release:bump -- patch` unless instructed otherwise).
  3. Build and publish the new **Testing** build (`CIVIZEN_UPDATE_CHANNEL=testing npm run update:application`).
  4. Rebuild `dist/` if needed so the release payload contains the latest manifests/download links.
  5. **Same-session production publish:** when restricted ops configuration is available, publish via the project’s controlled deployment procedures privately (do not publish how).
  6. Verify live `/updates/android-testing.json` and `/updates/android-release.json` (or `.js`) match expected versions/channels.
- **Stop condition:** do not report “application updated” until production publish + live endpoint verification are complete, unless production access is definitively unavailable (state that explicitly).
- Do not commit or push APK binaries to GitHub for this project. APKs should exist only as local build artifacts on this machine and as deployed download files on production.
- For Study/Constitution UI changes, preserve all existing user-visible labels/structure unless the user explicitly asks to modify that exact element. Do not remove, rename, or restyle article/sub-article labels when the request is about behavior only (for example open/close interactions).
- When the user asks to update/publish the application for testing, always perform a real release bump first (new `APP_VERSION`, `ANDROID_VERSION_CODE`, and `APP_RELEASE_ID`) before running the update/deploy flow, so installed clients can detect and prompt for the new update.
- **Tests with every module/page change:** Whenever you **create or modify** a `src/pages/**` route/page, a user-facing component (especially under `src/components/`), or a non-trivial `src/lib/**` module, **in the same session** add or update Vitest coverage before calling the work done:
  - **Pages / admin UI:** at minimum a mount/smoke render (or an entry in `src/pages/page-smoke.test.tsx` critical-render set) that would catch missing imports and `ReferenceError`s; prefer co-located `*.test.tsx` for behavior that matters.
  - **Lib modules:** unit tests for exported helpers/rules used by UI or RPC boundaries; do not treat helper-only tests as enough when the real risk is page JSX.
  - **Modify path:** update existing tests when behavior changes; do not leave stale assertions.
  - **Stop condition:** do not report a feature/fix complete if new or changed modules/pages lack corresponding test updates, unless the change is docs-only or an explicit user waiver in that session.
  - Run the new/updated tests (`npm test` or a focused `vitest run …`) in addition to `npm run verify:post-dev` when UI changed.

## 4. Application Versioning

- The app release source of truth lives in `src/lib/app-release.ts`.
- Keep these three values aligned for every release:
  - `APP_VERSION`
  - `ANDROID_VERSION_CODE`
  - `APP_RELEASE_ID`
- `android/app/build.gradle` reads its Android `versionName` and `versionCode` directly from `src/lib/app-release.ts`.
- The mobile app update prompt reads the live script manifest at `/updates/android.js` on `https://civizen.world`.
- Keep `/updates/android.json` as the human-readable mirror for verification and debugging.
- `scripts/update-application.sh` is responsible for:
  - building the web app
  - removing `dist/downloads` before Android asset sync (website APK files must not be embedded inside the mobile APK)
  - syncing Capacitor Android assets
  - building the APK with `./gradlew clean assembleDebug` to avoid stale packaged assets
  - publishing both the legacy and versioned APK filenames
  - regenerating `public/updates/android.json`
  - regenerating `public/updates/android.js`
- APK size sanity check for releases:
  - verify the built APK does not contain `assets/public/downloads/*` entries
  - if APK size jumps unexpectedly (for example >2x from previous release), treat it as a packaging regression and inspect APK contents before publishing
- `scripts/release-bump.sh` updates the version source of truth in `src/lib/app-release.ts`, bumps the Android build number, and syncs `package.json` plus `package-lock.json`.
- The step-by-step human release guide lives in `docs/04-operations/dev/RELEASING.md`.
- After versioning changes, verify all three of these outputs together:
  - the APK filename linked on the live website
  - the live `/updates/android.json` manifest
  - the installed Android app's bundled version/build values
- Before saying the application is updated, verify the live site and live APK on `https://civizen.world`, not just local build output or GitHub.
- When publishing, update both the live web assets and the live Android APK served from the currently linked download path on the website.

## 5. Local Release Payload Guardrails

- Never publish a bloated `dist` archive when payload size is unexpectedly large.
- Before packaging a release payload, run a payload preflight and verify:
  - `du -sh dist` is in the expected range for the current release
  - `dist/downloads` contains only:
    - `civizen-debug.apk`
    - `civizen-debug-${APP_RELEASE_ID}.apk`
- If old versioned APK files are present in `public/downloads` or `dist/downloads`, prune them before publish.
- If the release archive is unexpectedly large (for example >50 MB for this project), stop and investigate instead of uploading.
- Do not repeatedly bundle historical APK archives inside new release payloads.

## 6. Agent Correction Notes

- When an agent discovers a repeated mistake or process gap, add a concrete prevention rule to this `AGENTS.md` file in the same session.
- Notes must include:
  - the failure pattern
  - the mandatory preflight/validation check
  - the stop condition that blocks repeating the same error
- Do not rely on memory alone for repeated-release safeguards; encode them as explicit written rules.
- **2026-04 correction — migration handoffs:** Failure pattern: closing with “apply this migration on production” without applying it when restricted ops configuration is available. Mandatory check: after adding or changing `supabase/migrations/*.sql`, apply via the project’s agent-accessible path when configured; confirm success or report the failure output. Stop condition: do not ask the developer to run production migration steps unless the agent environment truly cannot reach production after a direct attempt.
- **2026-04 correction — avoid unnecessary user command delegation:** Failure pattern: asking the user to run operational commands (migrations, backfills, verification queries) even though this environment can run them. Root cause: the agent assumed missing credentials/permissions too early and delegated before performing environment preflight checks. Mandatory preflight: before asking the user to run any command, the agent must check available local scripts, local env values, and restricted ops reachability when configured. Stop condition: do not delegate command execution to the user until at least one direct execution attempt has failed with explicit blocker output that cannot be resolved by the agent in-session.
- **2026-05 correction — arc UX vs scripts:** Failure pattern: declaring arc work done when `verify:arc-carousel-visible` passed with only 3 pills and steep ~70° rotation, while the approved mock shows a wide shallow arc with **Sell · For you · Local · Jobs**. Mandatory check: read `docs/04-operations/dev/nav-secondary-carousel.md` before edits; run `npm run verify:post-dev` (includes `verify:agent-context`); compare screenshot to spec. Stop condition: do not report arc complete unless layout script passes **390px ≥4-offset geometry** and visible script shows **Jobs** without >12% bbox overlap with **Local**.
- **2026-07 correction — Android update “download again” loop:** Failure pattern: missing `REQUEST_INSTALL_PACKAGES` / unknown-sources permission caused `ApkUpdater` to reject with “try again”, then JS fell back with `window.location.assign(apkUrl)` (navigating the WebView away) and permanently dismissed the prompt before install succeeded. Mandatory: treat `INSTALL_PERMISSION_REQUIRED` as a retryable in-app state (open settings, keep prompt, do not browser-fallback); only dismiss after installer launch or explicit Later; never replace the Capacitor document with the APK URL—use an external intent. Stop condition: do not ship update-flow changes that dismiss on permission failure or navigate the WebView to the APK.
- **2026-07 correction — update channel UX:** Failure pattern: shipping fixes only to Testing while default users (including operators on Live) see no prompt; public Test/Live switcher confuses everyone. Mandatory: default Live; gate Test with `updates.test`; promote soaked Testing builds to Live for general distribution; prefer in-app APK install over browser redirect on sideload builds.
- **2026-07 correction — messaging composer gated on list loading:** Failure pattern: Nela/thread textarea stays `disabled` because `composerDisabled` included `conversationsLoading`, and Nela ensure/`private_list_my_conversations` could hang without `finally`. Mandatory check: composer enablement depends only on selection / block / selection-mode — not inbox loading. Stop condition: do not ship messaging changes that disable typing while a conversation id is already selected.
- **2026-07 correction — institutional policy supersession:** Failure pattern: treating superseded Funding Constitution, tokenomics, Luma-as-currency, founder-reserve, or contributor-proceeds language as current policy for public copy or agent answers. Mandatory check: read `docs/02-moderated/policies/institutional/` and public routes under `/documents` (and related `/about/*`); do not treat exploratory or superseded materials as current policy unless the user asks for historical material. Stop condition: do not publish fixed investor/contributor/founder percentages, tax-deductibility claims, Luma-as-money, or SSN labels.
- **2026-07 correction — public ops hygiene:** Failure pattern: documenting production access, host topology, secrets, provider reconfiguration, recovery, or deploy internals in public docs. Mandatory check: keep those procedures in the access-controlled operations store only. Stop condition: do not add production HOW-to detail to public `AGENTS.md`, release notes, or SSH stubs.
- **2026-08 correction — missing page/UI tests:** Failure pattern: shipping page/component refactors (e.g. UsersAdmin split) with only `src/lib` helper tests; missing imports (`Select`, `manageableRoles`) passed CI until runtime boot crash. Mandatory check: for every new or modified page/module, add or update Vitest in the same session (page smoke/mount and/or co-located `*.test.tsx` / `*.test.ts`); keep high-risk admin routes in `src/pages/page-smoke.test.tsx` render-critical set when applicable. Stop condition: do not close a page/module change without running the new or updated tests successfully.

## 7. Post-development verification (mandatory after every fix or UI change)

Run this **full sequence** before telling the user a front-end task is done. Do not skip steps because a build passed.

When the change touched pages, components, or lib modules, also run the **new or updated Vitest files** for those modules (or `npm test`) before `verify:post-dev`. Helper-only lib tests are not a substitute for page mount/smoke coverage on UI entry points.

```bash
npm run verify:post-dev
```

That runs:

0. **`verify:agent-context`** — memory-bank, arc spec, and `.cursor/rules` exist; AGENTS cross-links present.
1. **`verify:dev-load`** — dev server up, `/market` reachable, critical Vite modules non-empty and exporting symbols.
2. **`verify:arc-carousel-layout`** — arc geometry at 360–480px: no stacked slots; ≥4 visible offsets on 390px Market layout; flank rotation in approved band; horizontal clearance.
3. **`verify:arc-carousel-visible`** — Playwright on `/market?section=for-you`: **Sell**, **For you**, **Local**, and **Jobs** visible (opacity &gt; 0.4); no bounding-box overlap; flank rotation checks.

If `verify:dev-load` fails with “empty or stale”:

- `rm -rf node_modules/.vite`
- restart dev on port **8080** (reuse existing task when possible)
- run `npm run verify:post-dev` again

Optional after scripts pass: open `http://localhost:8080/market` and compare to **`docs/04-operations/dev/nav-secondary-carousel.md`** and the approved reference screenshot (wide shallow arc, ≥4 pills).

### Arc carousel regression guards

- **Spec:** behavior and layout must match `docs/04-operations/dev/nav-secondary-carousel.md`, not only script thresholds.

- **Missing items:** do not cap `maxVisibleOffset` to ~`FOCUS_SLOT_SNAP` only. Visibility must allow at least center + one flank per side when the arc has capacity (`arcFlankCapacity`).
- **Overlapping items:** do not shrink `angleStep` with `Math.min(pitchRad, distributed)` to cram extra slots onto a phone arc — that produces ~40px gaps while pills are ~92px wide. Use **`arcPitchAngleStep`** (full pitch spacing) and hide offsets that do not fit.
- **Hidden flank items:** on a bottom-pivot arc, pitch spacing drops flank pills **below** the wheel track and behind the bottom nav (`z-40` &lt; nav `z-50`). Cap vertical drop with **`maxFlankDropPx`**, compute **`wheelHeight`** from placements, and keep carousel chrome at **`z-[56]`** (below FAB `z-[70]`).
- **Stacking:** do not clamp multiple offsets to the same `arcEndpointAngle`.

### When to run verification (event-driven — no background loop)

Run `npm run verify:post-dev` **once** at these times only:

1. **After starting or restarting the dev server** on port 8080 (confirm the app loads before continuing UI work).
2. **After completing a front-end fix or UI change** — mandatory before telling the user the task is done (see §7 above).

Do **not** start a Cursor `/loop` or `while true; sleep …; echo AGENT_LOOP_TICK_*` background monitor unless the user explicitly asks for recurring checks. Periodic 10-minute loops spam the chat and are not the default workflow.

## 8. Local Dev Port Policy

- Default local development URL for this project is `http://localhost:8080`.
- **Node runtime:** use the version in `.nvmrc` (currently **24.18.1**, latest Node.js LTS “Krypton”). `package.json` `engines.node` must stay aligned (`>=24.18.1`). Prefer `nvm use` / `scripts/start-dev-server.sh` over Ubuntu’s apt `nodejs` package (often older). Do not run Capacitor or release builds on Node 18.
- Reuse port `8080` by default; do not open new Vite dev ports (such as `8081`, `8082`, etc.) for routine work.
- Before starting a new dev server, check whether an existing server is already running on `8080` and reuse it when available.
- Only use a different port when:
  - the user explicitly asks for another port, or
  - port `8080` is genuinely unavailable and cannot be freed quickly.
- If a fallback port is temporarily required, clearly state that reason and switch back to `8080` for normal workflows.
- After every implemented fix, verify the app is actually running before reporting completion:
  - ensure the dev server is up on `localhost:8080`
  - verify the relevant page URL responds (for example with `curl -I`)
  - do not declare the fix complete until runtime is confirmed

## 9. Profile Mismatch Triage

- Failure pattern: web and phone show different Edit Profile identity data (role/photo/place) even after app update.
- Mandatory check:
  - compare profile rows for all likely identities (for example current and legacy usernames) on `user_id`, `role`, `avatar_url`, `place_of_birth`, `country`, and `updated_at` when data access is available to the agent
  - confirm whether the user is actually on a different account rather than a stale bundle
- Root-cause guard:
  - if duplicate accounts exist for the same person, do not assume frontend rendering drift first; verify account-level data mismatch before changing UI layout code
- Stop condition:
  - do not ship another UI-only fix for profile-card mismatch until the relevant profile rows are verified against the reported username/account

## 10. Mandatory Post-Fix Release + Git Sync

- Failure pattern: a fix is confirmed locally, but release/update propagation and/or Git sync is left incomplete.
- Mandatory sequence after every confirmed fix (no user reminder required):
  - run app/runtime verification on `http://localhost:8080` for the changed flow
  - if the change affects distributed app behavior (web/mobile), run the full update pipeline and, when restricted ops configuration is available, publish privately without documenting production internals
  - when publishing mobile updates intended to be detected by installed clients, ensure release metadata is bumped first (`APP_VERSION`, `ANDROID_VERSION_CODE`, `APP_RELEASE_ID`)
  - commit all pending related changes in this repo (not just the last edited file)
  - push `main` to GitHub
  - verify live endpoints after publish (including both update channels when enabled)
- Stop condition:
  - do not report completion until publish + commit + push + live verification are all done
- Communication rule:
  - do not ask whether to perform commit/push/update once a fix is confirmed; execute this flow automatically

## 11. Testing Build Boot Safety

- Failure pattern: a newly installed Testing APK fails to start, leaving users stuck.
- Mandatory runtime safety requirements:
  - show an explicit startup failure notice when boot times out or the app crashes before boot is ready
  - provide a one-tap fallback path to install the stable Production APK from the live release manifest
  - preserve an immediate retry action (reload) in the same failure screen
- Release validation check:
  - confirm boot-failure fallback UI appears in failure scenarios and the stable-download action points to the Production manifest/APK
- Stop condition:
  - do not ship startup/bootstrap changes that remove or regress the fallback-to-stable path for Testing users
