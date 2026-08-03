# How to test Civizen funding (interest → ledger → compliance → distribution)

This checklist covers the shipped funding stack through Phase 6 scaffolding.
**Run this once at the end** after the full planned build — you do not need to re-test after each phase.

## Prerequisites

- Founder (or admin with `settings.manage` / `role.assign`) logged in for admin screens
- Dev app at `http://localhost:8080` (or live site if you are validating production)
- Do **not** treat ledger entries as a live securities offering or donation checkout
- Software ledger ≠ legal books; no live KYC/payment processor is wired yet

## A. Public interest paths

1. Open `/fund` — hub with five pathways
2. Open `/fund/support` — submit a donation interest (name + email; amount optional)
3. Open `/fund/invest` — submit investor interest (must check risk disclosure)
4. Open `/fund/institutional` — submit an institutional inquiry
5. Confirm success message appears (no payment is taken)

## B. Convert inquiry → ledger

1. Sign in as founder/admin
2. Settings → **Funding interest**
3. Find your inquiry → **Add to ledger**
   - If no amount was indicated, enter one first
4. Confirm status becomes **Contacted** and “Already converted” appears
5. Settings → **Funding ledger** — see a **pledged** commitment linked to that inquiry

## C. Mark received + lane filters

1. On Funding ledger, set filters (lane / status) and confirm the list updates
2. Change the commitment status to **Received**
3. Confirm:
   - Received totals by lane update
   - For investor lane, an investor position is created (visible via later calculator / distribution)
4. Settings → **Funding audit log** — see `interest_converted` and `commitment_status_changed`

## D. Publish transparency

1. Funding ledger → **Publish totals**
2. Open `/fund/transparency` (logged out is fine)
3. Confirm live USD aggregates appear for received lanes
4. Funding ledger → **Unpublish**
5. Refresh `/fund/transparency` — back to “not published” placeholders

## E. Manual commitment entry

1. Funding ledger → **Record commitment**
2. Create a donation or grant (grant needs restriction code/text)
3. Save as pledged, then mark received
4. Export CSV and open the file

## F. Calculator

1. Settings → **Funding calculator**
2. Keep defaults (or use Constitution example) and confirm investor pool = 10% of LSP

## G. Compliance queue + payment receipts (Phase 5 scaffolding)

1. Settings → **Funding compliance** (or Funding ledger → **Compliance**)
2. Open a compliance case (e.g. KYC or sanctions) linked to a funder/commitment
3. Set status to **Blocked**
4. On Funding ledger, try to mark that commitment **Received** — expect failure / blocked message
5. Return to compliance → set case to **Cleared**
6. Mark commitment received again — should succeed
7. Record a **payment receipt** (manual/wire) for that commitment
   - Optionally check “Also mark commitment as received”
8. Confirm receipt appears in the list and audit log shows `compliance_case_upserted` / `payment_receipt_recorded`

## H. Contributors + distribution periods (Phase 6 scaffolding)

1. Settings → **Funding contributors**
2. Add a contributor profile
3. Add a verified contribution with points (e.g. 100)
4. Settings → **Funding distribution**
5. Create a period (label + date range + LSP amount; keep share caps)
6. Confirm calculated pools: investor 10%, founder 1%, contributor/servicing/mission residual
7. **Approve & generate payouts**
8. **View payouts** — expect investor/contributor proportional rows plus founder, servicing, mission
9. Audit log should show `distribution_period_created` and `distribution_period_approved`

## I. End-to-end sanity (optional single pass)

1. Public invest interest → convert → compliance clear → receipt → mark received
2. Contributor points recorded
3. Create + approve a small LSP period
4. Publish transparency briefly, then unpublish
5. Export interest + ledger CSVs

## Agent / CI smoke (already run in-session when possible)

```bash
# Phase 3–4 ledger + transparency
bash scripts/db/apply-remote-migration.sh scripts/db/test-funding-ledger-smoke.sql

# Phase 5–6 compliance + distribution objects
bash scripts/db/apply-remote-migration.sh scripts/db/test-funding-compliance-distribution-smoke.sql

# Public RPC + route HTTP checks (dev server must be up)
# Prefer: export VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... (do not blindly source .env.local if passwords break the shell)
node scripts/test-funding-public-surfaces.mjs

# Unit tests
npx vitest run src/lib/funding

# Front-end gate after UI work
npm run verify:post-dev
```

## Known non-goals (not bugs)

- No card/wire/crypto checkout yet (live rails gated on Phase 0 legal)
- No external KYC/AML provider integration yet (manual cases only)
- Approving a distribution period creates payout **records**, not bank transfers
- USDT acceptance remains disabled by policy until counsel decides
- Software ledger ≠ audited legal books
