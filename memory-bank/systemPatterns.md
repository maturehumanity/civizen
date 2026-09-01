# System patterns

## Form fields

- **Component:** `OutlinedField` (`src/components/ui/outlined-field.tsx`)
- **Look:** rounded outline, label on the **upper-left border** (fieldset legend)
- **Known identity:** signed-in profile values are used silently; fields appear only when missing
- **Rules:** `.cursor/rules/form-fields.mdc`, `docs/04-operations/dev/AGENTS.md` §3

## Happiness & Fulfillment

- **Routes:** `/happiness` (My Happiness), `/happiness/check-in`, `/happiness/review`, `/happiness/improve`, `/happiness/work`, `/happiness/privacy`, `/wellbeing-insights` (authorized aggregate viewers only)
- **Entry:** Profile menu (not bottom nav)
- **Spec:** `docs/03-platform/happiness-and-fulfillment/happiness-human-fulfillment-v1.md`
- **Model:** `src/lib/happiness/` (`happiness-level-v1`) — five public levels; Fulfillment Plans under Improve (`src/lib/happiness/fulfillment/`)
- **Subunit:** `src/lib/work-fulfillment/` — Work Fulfillment workspace; employment seeking uses Marketplace Jobs
- **Privacy:** owner-only RLS for individual records; optional aggregate participation is a separate table; privileged generation is `service_role` collect → trusted TS engine → persist without rewrite; Wellbeing Insights call `get_wellbeing_aggregate` / stored snapshots only; Human Outcome Reviews compare those snapshots only (no private Happiness joins); never feeds Civizen Score; Jobs prefill uses approved shareable prefs only
- **Home shortcut:** latest `happiness_state_snapshots.overall_level` only — not the full Happiness workspace

## Market

- **Route:** `/market` is public. Default section is Jobs.
- **Public Jobs:** guests can post looking-for-work or job openings and browse Available work / Available workers. Contact details stay locked until sign-in. Spec: `docs/04-operations/dev/market-jobs-public.md`.
- **Member Market:** listings, Sell, Saved, Agreements, prototype credits.
- **Spec:** `docs/04-operations/dev/nav-secondary-carousel.md` for the arc; Jobs form in `MarketJobsInterestForm`.

## Secondary navigation (arc)

- **Component:** `NavSecondaryCarousel` (+ geometry module)
- **Spec:** `docs/04-operations/dev/nav-secondary-carousel.md`
- **Context:** `PageSecondaryNavContext` — pages register config via `usePageSecondaryNav`
- **Shell:** `MobileNav` renders arc or strip; FAB when `config.fab` set
- **Pages:** Home (text tabs), Study, Market (icon+label loop)

## Matter collaboration

- **Routes:** `/contribute/matters`, `/contribute/matters/new`, `/contribute/matters/:matterId`
- **Lane:** Contribute > Questions, Issues & Ideas
- **Spec:** `docs/04-operations/dev/matter-collaboration.md`
- **Model:** generic Matter (`src/lib/matters.ts`); Action Requirements carry who/what/when; comments never complete actions
- **Actors:** person or organization via `profiles` + `linked_accounts` (no separate organizations table)
- **Timing:** configurable `matter_timing_policies`; timeouts run only in `process_matter_action_timeouts` (pg_cron or `scripts/db/run-matter-timeout-tick.sh`); list reads are display-only
- **Improvements:** `/contribute/improvements` → Matter create as Suggestion to Civizen

## Agent workflow

- Project rules: `docs/04-operations/dev/AGENTS.md`
- Cursor rules: `.cursor/rules/civizen-project.mdc`
- Post-dev gate: `npm run verify:post-dev`
