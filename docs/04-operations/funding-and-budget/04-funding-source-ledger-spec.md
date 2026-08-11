# Funding-Source Ledger: First-Version Specification

## Goal

Track potential funders, engagement progress, commitments, received funds, restrictions, and budget allocations without treating prospects as money.

## Minimum records

### Funding source

- ID and display name
- category: government, multilateral/international institution, grant, philanthropy, private capital, contributor, system-generated revenue, or other
- jurisdiction/region and website, when relevant
- internal owner
- relationship status
- requested amount and currency, if applicable
- probability or priority as an optional planning field, never as cash
- public visibility fields
- created/updated metadata

Suggested relationship statuses: `identified`, `researching`, `contact_planned`, `contacted`, `engaged`, `application_or_proposal`, `due_diligence`, `decision_pending`, `committed`, `declined`, `paused`, `closed`.

### Contact/activity event

- source ID, event type, date/time
- summary, next action, next-action date
- actor
- private notes and evidence references

Events are historical records. Corrections append a correcting event or audited edit.

### Commitment

- source ID, amount, currency, date
- conditional/unconditional status
- conditions, restrictions, intended period
- evidence reference
- status: proposed, confirmed, amended, cancelled, fulfilled

### Receipt

- source and optional commitment reference
- amount, currency, received date
- external reference and evidence reference
- restriction/tag
- reversal or correction reference

A receipt is the only record that increases funds received.

### Allocation

- receipt ID, budget line-item ID
- allocated amount and currency
- date, actor, purpose/note
- reversal or correction reference

Do not allocate more than the receipt's unallocated balance unless a permission-controlled override records the reason.

### Processing/auditing cost assessment

- related transaction or receipt reference
- liable-party type and liable legal entity
- processor cost, audit cost, other allowed cost, currency
- calculation/rule version
- assessed amount, adjustment, reason, actor, timestamp

For a person acting personally, the assessed user fee must be zero. For a legal entity, the assessment must equal documented allowed costs after recorded adjustments; it must not include an undisclosed margin.

## Views

- Pipeline by category, status, owner, next action, and expected decision date.
- Funding summary separating requested, committed, received, allocated, and unallocated values.
- Source detail with chronological activity, commitments, receipts, allocations, restrictions, and evidence.
- Public summary containing only deliberately published source names/amounts or approved aggregates.

## Acceptance checklist

- [ ] Changing a relationship status to `committed` does not create a receipt.
- [ ] A confirmed commitment does not increase received funds.
- [ ] Receipt reversals preserve the original record and audit trail.
- [ ] Allocations reference received funds and valid budget line items.
- [ ] Over-allocation is blocked or requires an authorized, reasoned override.
- [ ] Requested, committed, received, allocated, and unallocated totals reconcile independently per currency.
- [ ] Individuals pay zero transaction fee in personal-capacity scenarios.
- [ ] Legal-entity charges are reproducible from documented processing and auditing costs.
- [ ] Public views exclude contacts, private notes, evidence, negotiations, and unpublished values.
- [ ] Status and activity history show actor and timestamp.

