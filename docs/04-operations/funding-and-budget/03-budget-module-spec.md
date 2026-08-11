# Budget Module: First-Version Specification

## Goal

Maintain a clear, versioned Civizen project budget that can be operated internally and selectively published for funder review.

## Minimum records

### Budget

- ID, name, purpose, base/display currency, version, lifecycle status
- effective period
- internal notes
- created/updated metadata
- approval and publication metadata

Lifecycle: `draft -> under_review -> approved -> superseded`. Publication is a separate state so approval does not automatically expose data.

### Expense group

- ID, budget ID, name, description, display order

Examples may include product development, security and auditing, legal and compliance, operations, outreach, research, infrastructure, and contingency. These are examples, not mandatory fixed categories.

### Budget line item

- ID, group ID, title, description
- planned amount, committed amount, actual amount
- currency, period or milestone
- responsible owner or team
- funding restriction/tag, if any
- public description and publish flag
- status and audit metadata

### Budget revision

- budget/version reference
- changed fields with before/after values
- reason
- actor and timestamp
- approval reference when required

## Calculations

- Group totals and budget totals must be derived from line items.
- Remaining planned budget = planned minus actual, displayed separately from uncommitted budget.
- Uncommitted budget = planned minus committed.
- Do not sum different currencies into one total without an explicit conversion method; the first version may show separate currency totals.
- Allocated funding, received funding, commitments, and expenses must remain distinct.

## Internal workflow

- Create a draft budget and groups.
- Add, edit, reorder, archive, or restore line items subject to permissions.
- Submit a version for review and approve or return it with a reason.
- Create a new revision from an approved version without rewriting history.
- Compare the current version with the prior approved version.
- Export the authorized view using an existing project format, preferably CSV and/or JSON.

## Public view

The public view may show approved totals, groups, published line items, funding received in approved aggregate form, allocation progress, version, and last publication date.

It must exclude internal notes, contact details, bank/payment data, private evidence, negotiation history, unpublished sources or amounts, actor identifiers not intended for publication, and security metadata.

## Acceptance checklist

- [ ] Draft edits do not modify the last approved version.
- [ ] Totals are calculated from minor-unit values without floating-point drift.
- [ ] Planned, committed, and actual values are visibly distinct.
- [ ] Multi-currency totals are not silently combined.
- [ ] Every approved revision records actor, time, reason, and changed values.
- [ ] Approval does not automatically publish the budget.
- [ ] Public output is generated from an allowlist of publishable fields.
- [ ] An unauthorized user cannot view or mutate internal budget data.
- [ ] Exported totals match on-screen totals.

