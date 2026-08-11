# Funding, Sustainability, and Financial Transparency Decisions

Status: implementation baseline; expected to evolve through funding and delivery.

## Product decisions

### Funding strategy

- Support simultaneous funding channels rather than a government-first sequence.
- Channels may include governments, international institutions, grants, philanthropy, private capital, contributors, and later system-generated revenue.
- Keep participation open to any willing government or institution; do not design the first version around one country or exclusive launch partner.
- Treat public and private funding as potentially complementary, subject to each source's restrictions and Civizen's mission protections.

### Sustainability

- Sustainability is a product requirement from the beginning, not a later fundraising concern.
- The system must be able to record how development, operations, auditing, public-interest functions, and commercial functions are funded.
- The first version records funding models and actual flows. It does not implement investment returns, contributor compensation, a global marketplace, taxation, or automated revenue distribution.

### Budget integration

- The project budget must be manageable inside Civizen and evolve through versions.
- Use expense groups and line items, with planned, committed, and actual amounts kept distinct.
- Record funding allocations to budget items without assuming that a pledge is cash received.
- Allow a deliberately approved public view for funders and interested parties. Private notes, personal data, access credentials, bank details, and sensitive negotiations must never appear there.
- Preserve change history and the identity of the actor responsible for material changes.

### Transaction-fee policy

- An ordinary person acting in a personal capacity must not be charged a Civizen transaction fee for purchases, payments, or transfers, including family transfers.
- Necessary payment-processing and auditing costs are borne by participating legal entities.
- Fees must be cost-recovery only: tied to documented processing and auditing costs, not an arbitrary percentage or profit center.
- Store the applied policy, liable party, cost basis, calculation, and any adjustment for every assessed fee.
- Do not silently shift a legal entity's fee to an individual through the Civizen interface.
- The first release records and calculates these costs; connection to real payment rails is outside scope unless already available in the codebase.

### Funding-source ledger

- The first Source Ledger begins with potential and actual project funders.
- It must track prospects, contact progress, current status, requested amounts, commitments, received funds, restrictions, evidence, and budget allocations.
- A prospect, commitment, receipt, and allocation are different records or states and must not be conflated.
- Historical outreach and financial events must remain auditable.

## Shared product rules

- Use the project's existing authentication, authorization, storage, audit, currency, and UI conventions where they exist.
- Apply least-privilege access. Public visibility must always be an explicit publishing action.
- Store monetary values as integer minor units plus ISO 4217 currency code; never use binary floating-point values.
- Do not add blockchain, cryptocurrency, token issuance, payment custody, banking, tax automation, or a new identity system for this scope.
- Do not claim legal, accounting, tax, investment, or regulatory compliance merely because fields or workflows exist.
- Prefer a usable CRUD workflow, clear validation, audit history, and export over speculative architecture.

## Explicitly deferred

- contributor equity, tokens, dividends, or return calculations;
- automated contributor compensation;
- real-money collection, custody, settlement, refunds, or chargebacks;
- automated taxation and government reporting;
- procurement, grant-contract, and securities-law workflows;
- exchange-rate conversion and consolidated multi-currency accounting;
- economy-wide goods and services exchange; and
- AI-only access to personal or institutional records beyond the project's established privacy model.

