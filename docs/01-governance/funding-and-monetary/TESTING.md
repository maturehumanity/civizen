# How to test Civizen funding

**Status:** Current Draft ops checklist for **interest / ledger / compliance scaffolding**.  
Not authorization to accept capital. Not authorization of fixed investor/contributor/founder payout formulas.

Prefer: [`funding-and-sustainability-plan.md`](./funding-and-sustainability-plan.md) · [`funding-and-financial-integrity.md`](../../02-policies/institutional/funding-and-financial-integrity.md)

---

## Prerequisites

- Founder (or admin with `settings.manage` / `role.assign`) logged in for admin screens
- Dev app at `http://localhost:8080` (or live site if validating production)
- Do **not** treat ledger entries as a live securities offering or donation/grant checkout
- Software ledger ≠ legal books; no live KYC/payment processor is wired yet
- USDT / digital-asset acceptance remains **Disabled**

---

## Current tests (inquiry and classification scaffolding)

### A. Public interest paths

1. Open `/fund` — hub with pathways
2. Open `/fund/support` — submit a donation interest (name + email; amount optional)
3. Open `/fund/invest` — submit investor interest (acknowledge non-offering / risk language)
4. Open `/fund/institutional` — submit an institutional inquiry
5. Confirm success message appears (no payment is taken)

### B. Convert inquiry → ledger

1. Sign in as founder/admin
2. Settings → **Funding interest**
3. Find your inquiry → **Add to ledger** (enter amount first if missing)
4. Confirm status becomes **Contacted** and “Already converted” appears
5. Settings → **Funding ledger** — see a **pledged** commitment linked to that inquiry

### C. Mark received + lane filters

1. On Funding ledger, set filters (lane / status) and confirm the list updates
2. Change the commitment status to **Received**
3. Confirm received totals by lane update
4. Settings → **Funding audit log** — see `interest_converted` and `commitment_status_changed`

Note: An “investor position” row, if created by scaffolding when an investor-lane commitment is marked received, is a **classification record only**. It does not create investor rights or authorize pool payouts.

### D. Publish transparency

1. Funding ledger → **Publish totals**
2. Open `/fund/transparency` (logged out is fine)
3. Confirm live USD aggregates appear for received lanes (by class/lane — not fixed pool formulas)
4. Funding ledger → **Unpublish**
5. Refresh `/fund/transparency` — back to “not published” placeholders

### E. Manual commitment entry

1. Funding ledger → **Record commitment**
2. Create a donation or grant (grant needs restriction code/text)
3. Save as pledged, then mark received
4. Export CSV and open the file

### F. Compliance queue + payment receipts (manual scaffolding)

1. Settings → **Funding compliance** (or Funding ledger → **Compliance**)
2. Open a compliance case (e.g. KYC or sanctions) linked to a funder/commitment
3. Set status to **Blocked**
4. On Funding ledger, try to mark that commitment **Received** — expect failure / blocked message
5. Return to compliance → set case to **Cleared**
6. Mark commitment received again — should succeed
7. Record a **payment receipt** (manual/wire) for that commitment
8. Confirm receipt appears and audit log shows related events

Receipt recording in admin tools does **not** mean public checkout or live rails are enabled.

---

## Historical / prototype tests (not current policy)

The following exercises prototype UIs that may still exist in the product. They encode **retired** LSP percentage-pool assumptions. Running them validates scaffolding only. Results are **not** Civizen financing policy and must not be published as allocation terms.

### H1. Funding calculator (prototype)

1. If a **Funding calculator** admin surface still exists, open it
2. Confirm it is treated as an internal prototype tool
3. Do **not** treat any default investor/founder pool percentage of a retired proceeds field as adopted policy

> Note (2026-08-10): current Funding admin sections are interest · ledger · audit · compliance · contributors. A standalone calculator route may already be gone; related math/i18n may still exist in code.

### H2. Contributors + distribution periods (prototype)

1. Settings → **Funding contributors** (still present)
2. Related library/RPC scaffolding may still create or display distribution-period / pool fields
3. Do **not** treat investor/founder/contributor/servicing/mission pool splits as authorized allocations
4. Any approve-payouts action creates software records only — not bank transfers and not policy adoption

### H3. Optional prototype end-to-end

1. Public invest interest → convert → compliance clear → receipt → mark received
2. Optional: prototype contributor points + prototype distribution period
3. Publish transparency briefly, then unpublish
4. Export interest + ledger CSVs

---

## Agent / CI smoke (when relevant)

```bash
bash scripts/db/apply-remote-migration.sh scripts/db/test-funding-ledger-smoke.sql
bash scripts/db/apply-remote-migration.sh scripts/db/test-funding-compliance-distribution-smoke.sql
node scripts/test-funding-public-surfaces.mjs
npx vitest run src/lib/funding
```

Distribution-related smoke scripts may exercise prototype objects. Passing them does not authorize fixed public distribution formulas.

---

## Known non-goals (not bugs)

- No card/wire/crypto checkout (live rails gated; crypto **Disabled**)
- No external KYC/AML provider integration yet (manual cases only)
- Prototype distribution approvals ≠ bank transfers and ≠ adopted pool policy
- Software ledger ≠ audited legal books
