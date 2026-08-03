# Civizen Funding

> **Supersession notice:** Fixed investor share percentages, contributor or founder share pools, multibillion targets, and distribution formulas from earlier drafts are **not current policy** and are not published in this repository. Controlling public documents: [`funding-and-financial-integrity.md`](../../02-moderated/policies/institutional/funding-and-financial-integrity.md) and [`investor-interest-non-offering-notice.md`](../../02-moderated/policies/institutional/investor-interest-non-offering-notice.md). Browse all public institutional documents at `/documents`.

Canonical home for Civizen’s fundraising operations notes. Public economic promises must follow the institutional policies linked above.

> Draft operations reference — not legal, tax, accounting, securities, or financial advice. Accepting investment capital, donations, grants, crypto, or contributor payouts requires qualified professional review in the relevant jurisdictions.

## Start here (current)

| Document | Purpose |
|---|---|
| [`../../02-moderated/policies/institutional/funding-and-financial-integrity.md`](../../02-moderated/policies/institutional/funding-and-financial-integrity.md) | Public funding integrity statement |
| [`../../02-moderated/policies/institutional/investor-interest-non-offering-notice.md`](../../02-moderated/policies/institutional/investor-interest-non-offering-notice.md) | Investor page non-offering notice |
| [`implementation-roadmap-v0.1.md`](./implementation-roadmap-v0.1.md) | Build order notes (review against current public policy before acting) |
| [`supporting-documents-index.md`](./supporting-documents-index.md) | Supporting policy checklist |
| [`TESTING.md`](./TESTING.md) | Manual + smoke tests for the funding stack |

## Superseded stubs (not for publication or rights)

| Document | Status |
|---|---|
| [`funding-constitution-v0.1.md`](./funding-constitution-v0.1.md) | Superseded — not published |
| [`risk-disclosure-v0.1.md`](./risk-disclosure-v0.1.md) | Superseded — not published |
| [`founder-stewardship-reserve-clause-v0.1.md`](./founder-stewardship-reserve-clause-v0.1.md) | Superseded — not published |
| [`investor-revenue-participation-terms-v0.1.md`](./investor-revenue-participation-terms-v0.1.md) | Superseded — not published |

## Product surfaces (app)

| Route | Audience | Status |
|---|---|---|
| `/fund` | Public | Inquiry hub — no return percentages |
| `/fund/support` | Donors / supporters | Inquiry only — no tax-deductibility claim |
| `/fund/invest` | Prospective investors | Non-offering information request |
| `/fund/institutional` | Orgs / governments | Inquiry form |
| `/fund/contribute` | Contributors | Recognition policy — no fixed reward pool |
| `/fund/transparency` | Public | Verified receipts only; prototype label when none |
| `/documents` | Public | Institutional documents index |
| `/settings/admin/funding-*` | Admins | Neutral ledger, inquiry, compliance, and audit tools only |

## Hard rules for implementation

1. **Classify before use** — never mix funding lanes into one unrestricted pool.
2. **No in-app investment checkout** until a compliant offering structure exists.
3. **Interest forms only** for investor, donation, and institutional pathways at MVP.
4. **No fixed public distribution formula** — do not publish investor, contributor, or founder percentage pools.
5. **Restricted funds stay restricted**.
6. **Software ledger ≠ legal books** — accountants and counsel remain authoritative.
7. **Do not calculate or pay** retired percentage-based investor, contributor, or founder shares from application code.
