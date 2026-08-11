# Prompt for the Civizen AI Implementation Agent

Implement the smallest production-credible first version of Civizen's project finance workspace.

## Authority and scope

Read these files before changing code:

- `01-decisions-and-scope.md`
- `03-budget-module-spec.md`
- `04-funding-source-ledger-spec.md`

Inspect the repository and follow its existing patterns. Do not introduce a new framework, service, ledger technology, payment rail, or identity system unless the current application already requires it. Preserve unrelated user changes.

## Required outcome

Deliver an integrated workspace in which authorized users can:

1. create and revise a project budget using groups and line items;
2. distinguish planned, committed, and actual expense values;
3. maintain funding prospects across public, institutional, philanthropic, private, contributor, and system-revenue categories;
4. log outreach and status history;
5. record commitments and receipts separately;
6. allocate received funding to budget line items without exceeding available funds unless an authorized override is recorded;
7. calculate cost-recovery transaction charges for legal entities while charging ordinary individuals zero; and
8. publish a sanitized, read-only budget and funding summary through an explicit approval action.

## Implementation constraints

- Reuse existing roles and permissions; if none exist, add only minimal roles such as finance editor, reviewer/approver, and public reader.
- Store amounts as minor-unit integers with currency codes.
- Make important state changes append-only or auditable. Corrections should leave history rather than erase it.
- Treat attachments as references using the application's existing file mechanism. Do not build document storage solely for this feature.
- Keep public and internal views separate at the query or service boundary, not only by hiding fields in the interface.
- Do not fabricate live funders, contacts, commitments, receipts, or budget amounts. Seed only clearly labeled demonstration data if the repository convention requires seeds.

## Work sequence

1. Map relevant existing models, routes/services, permissions, UI patterns, tests, and exports.
2. Write a short implementation note listing reused components, assumptions, and any migrations.
3. Implement the minimum data changes and business rules.
4. Implement internal budget and funding-ledger workflows.
5. Implement the sanitized public summary and explicit publish action.
6. Add automated tests for permissions, money calculations, state transitions, allocation limits, public-field exclusion, and fee liability.
7. Run the repository's normal validation and test commands.
8. Report changed files, migrations, tests run, deferred items, and any decision that still needs human approval.

## Definition of done

- Acceptance criteria in both module specifications pass.
- An individual transaction always produces zero user fee.
- A legal-entity fee has a documented cost basis and reproducible calculation.
- A funding prospect cannot appear as received cash without a receipt event.
- Public output contains only approved aggregate or specifically published data.
- Budget revisions and material ledger changes identify who changed what and when.
- No deferred architecture has been introduced.

