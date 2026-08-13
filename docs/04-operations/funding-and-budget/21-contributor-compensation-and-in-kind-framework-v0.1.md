---
title: Contributor Compensation and In-Kind Planning v0.1
status: scenario-framework
version: 0.1
date: 2026-08-11
currency: USD
audience: owner-internal
related:
  - 20-capital-stack-revenue-and-roi-model-v0.1.md
  - 20-capital-stack-and-roi-model-v0.1.csv
  - 22-private-investor-economics-brief-v0.1.md
  - 27-founder-investor-and-contributor-participation-policy-v0.1.md
  - 26-comprehensive-financial-classification-and-chart-of-accounts-v0.1.md
canonical: false
---
# Contributor compensation and in-kind planning v0.1

> **Not the canonical Contributor Framework.** Institutional Contribution Record design is [`docs/institutional/contributor-framework.md`](../../institutional/contributor-framework.md). This file is **compensation planning** only. Public/legal floor: [`contributor-participation-and-recognition.md`](../../02-policies/institutional/contributor-participation-and-recognition.md).

> **Participation policy status (2026-08-11, rev 0.1.1):** Founder Participation Pool = **1% of Eligible External Monetary Receipts**, assessed once at first receipt (`founder_allocation_assessed`). Eligible distributable commercial profit (after costs and after founder receipt allocation): **10% Investor / 10% Contributor / 80% Ecosystem**. Dual Founder Funding + Founder Profit pools and the **10/10/1/79** profit pie are **superseded**. Spec: `27` (+ CSV); entity/legal: `28`. CoA: `26`. Unapproved; no app units/payouts.

**Status:** Planning framework for discussion. **Not** an approved compensation policy, equity plan, securities arrangement, or automatic claim on proceeds.  
**Aligns with:** institutional contributor participation policy (no automatic employment/equity/revenue rights) and funding integrity (compensation only under written programs).  
**App / DB:** **Unchanged.** No contributor units, payout engines, or legacy capital-ledger revival.

---

## 1. Answer first

Contributors are paid through **ordinary employment, contracts, grants, milestones, and recognition** — not through a public fixed percentage of all Civizen income. A modeled **contributor participation pool** (tested at 5%/10%/15% of **eligible distributable commercial cash flow** only) is a **scenario hypothesis** for the commercial layer after the payout waterfall in `20`. In-kind work is **tracked at fair value**, reported separately from cash, and **does not** automatically create equity, investor status, governance power, or a claim on restricted funds.

---

## 2. Contributor types and compensation modes

| Type | Typical cash modes | Possible non-cash / participation | Notes |
| --- | --- | --- | --- |
| Employees | Salary, benefits | Optional commercial-entity equity **where lawful** under written plan | Ordinary employment law |
| Contractors / independents | Contract / milestone | Attribution; rarely deferred milestone holdbacks | SOW required |
| Founders | Salary/contract if engaged | **Founder Participation Pool** = 1% of eligible external receipts once (`27`); not a second profit cut; not civic authority | Historical “no fixed public founder %” phrasing superseded by receipt-based FPP |
| Volunteers | Generally unpaid | Attribution, credentials, expense reimbursement if approved | No auto-compensation |
| Open-source contributors | Bounties / retainers if funded | Attribution, maintainer status | License + DCO/CLA as applicable |
| Infrastructure contributors | Contract or operator pay | Reimbursement; operator equity in **operator** vehicles only | Not foundation equity |
| Educational institutions | Grants, sponsored research, overhead | Attribution, publication rights | MoU / IP terms |
| Research institutions | Grants / contracts | Same | Preserve research independence |
| Civil-society orgs | Grants / subawards | Pass-through under restricted-fund rules | Not investor status |
| Government / institutional secondees | Home-employer pay or secondment agreement | In-kind valuation on ledger | No Civizen equity from secondment alone |

**Modeled commercial participation (hypothesis only):** if a contributor pool exists, it draws from **eligible distributable commercial CF** after mandatory costs/reserves/debt/reinvestment — same base as investors in `20`. It is **not** a claim on grants, taxes, or citizen fee cost-recovery.

---

## 3. Fair-value in-kind ledger method

Record every material in-kind contribution with:

| Field | Requirement |
| --- | --- |
| Hours or deliverables | Timesheet or acceptance record |
| Market-rate evidence | Benchmark rate card / quote / published scale |
| Valuation | Hours × approved rate **or** deliverable fair value |
| Approval | Independent of self-award (second approver) |
| Restrictions | Cash vs recognition-only; geographic/tax limits |
| Vesting / milestones | If any deferred recognition — written schedule |
| IP treatment | Assignment, license, or retained rights — explicit |
| Expiration / cancellation | Unused recognition does not become equity by silence |
| Payout eligibility | Only if a written program says so |
| Tax / legal review | Before any cash conversion |
| Anti-inflation controls | Cap rates; reject self-awarded or circular valuations |

**Rules:** report in-kind **separately** from cash; never mingle with restricted grant ledgers; never treat in-kind as automatic securities; critical-path roles must remain **cash-budgeted** (`20` stress: in-kind unavailable).

---

## 4. Pool interaction with waterfall (scenario)

If owner later adopts a pool (unapproved today):

1. Employee/contractor **ordinary pay** is paid **before** any participation pool (waterfall step 4 in `20`).
2. Contributor pool (5/10/15% tests) applies only to **remaining eligible distributable commercial CF**.
3. Under stress, pools **step down, accrue, or suspend** with investor pools.
4. Educational and civil-society grants stay on **grant** instruments — not converted into pool claims.

---

## 5. Provisional owner decisions (not approved)

| Topic | Provisional position |
| --- | --- |
| Valuation method | Fair-value ledger above |
| Founder treatment | Written employment/contract only; no fixed public % |
| Educational institutions | Grants/overhead/sponsored research + attribution |
| Auto-equity from contribution | **Prohibited** |
| Legacy contributor-reward % formulas | Historical / unapproved — do not revive |

---

## 6. Gaps

Counsel on employment/IP/tax by jurisdiction; rate-card governance; whether any commercial equity plan is lawful/desired; administration of any future pool without reviving disabled distribution RPCs.
