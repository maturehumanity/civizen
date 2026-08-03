# Public transparency ledger policy v0.1

**Status:** Stub / draft  
**Related:** Funding Constitution §15, §16  
**Counsel review:** Not started

## Purpose

Define what Civizen may publish about funding and allocations, and what must stay private.

## May be public (summary form)

- Totals by funding lane
- Investment capital received (aggregate)
- Donations and grants received (aggregate)
- Commercial revenue (aggregate, if disclosed)
- Pool allocations (investor, contributor, servicing, founder, mission)
- Contributor rewards distributed (aggregate)
- Audit status and annual report links
- Major restriction categories (without sensitive detail)

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

## Product behavior

- `/fund/transparency` shows category placeholders until ledger publish controls exist.
- Admin publish switches (Phase 4) gate live totals.

## Open questions

- Default donor wall: off vs opt-in?
- Cadence: monthly vs quarterly public refresh?
- Who approves first live publish?
