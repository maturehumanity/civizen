# Public transparency ledger policy v0.1

**Status:** Current Draft — subject to legal and institutional review.  
**Related:** Public reporting in [`funding-and-financial-integrity.md`](../../02-policies/institutional/funding-and-financial-integrity.md)  
**Counsel review:** Not started

## Purpose

Define what Civizen may publish about funding and uses of funds, and what must stay private.

Civizen has **not** adopted fixed public allocation formulas for investors, contributors, founders, or similar private pools. Do not publish percentage pools of that kind.

## May be public (summary form)

- Totals by funding class or lane (e.g. donations, grants, sponsorships, commercial revenue, investment capital if ever lawfully received)
- Material restrictions (categories, without sensitive detail)
- Program and operating uses at aggregate level
- Audit or independent-review status and links to annual reports when available
- Major institutional funders where disclosure is lawful and appropriate
- Corrections to prior public reports

## Must not be published as current policy

- Fixed investor / contributor / founder / servicing / mission **percentage pool formulas**
- Promised returns or allocation guarantees
- Individual private funder identities without opt-in or legal requirement

## Protected (not public without legal basis or consent)

- Personal identities of private funders (unless opt-in)
- Bank and wallet details
- Tax identifiers and tax filings
- Government IDs and KYC packets
- Private contracts and term sheets
- Sensitive compliance, sanctions, or investigation records
- Security and custody operational details

## Rules

1. Prefer aggregates and anonymized series over individual rows.
2. Donor/investor public display requires explicit preference or legal requirement.
3. Restricted-fund disclosures must not reveal protected personal data.
4. Software transparency does not replace audited financial statements.
5. Payments or distributions, if any, arise only from lawful written arrangements, approved budgets, applicable restrictions, and authoritative accounting — not from a public fixed formula.

## Product behavior

- `/fund/transparency` shows published aggregates by class/lane, or placeholders when unpublished / empty
- Admin publish controls gate live totals
- Prototype tools that compute historical LSP pool splits must not feed public transparency copy

## Open questions

- Default donor wall: off vs opt-in?
- Cadence: monthly vs quarterly public refresh?
- Who approves first live publish?
