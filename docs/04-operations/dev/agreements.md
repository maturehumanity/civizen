---
title: Civizen Agreements
status: current
version: 0.1
canonical: true
last_reviewed: 2026-08-13
---

# Civizen Agreements

Platform-level capability for creating, reviewing, signing, and retaining agreements between Civizen parties. **Simple by default. Advanced by need. Always.** (Agent policy: [`AGENTS.md`](./AGENTS.md).)

## Information architecture

```text
Marketplace / relevant Civizen activity → Agreement → /agreements workspace
```

- Marketplace remains an important entry point (`Start agreement` on listings, Jobs, header shortcut).
- Agreements is **not** a Marketplace-only feature.
- `/agreements` is the canonical working area.
- Contextual starts (opportunity, challenge/pilot, implementation project, knowledge space, contribution, funding, jobs, public initiative, `/partners`) open `/agreements/new` with known parties and related activity prefilled.

## Workspace

`/agreements` is **simple by default**. Mobile default:

Needs action · Active · All

Additional lifecycle filters (Draft, In review, Awaiting signatures, Completed, Terminated, Declined/withdrawn) stay behind **Filter** on All. Search appears on All once records exist.

Empty first-use is compact: **No agreements yet**, short purpose copy, and no extra Create button. A compact `+` sits immediately beside the Agreements title in every state (accessible name **Create agreement**). Hover or click/tap opens a type menu with search. **More agreement types…** is the last item in that same menu and reveals specialized types there. Unmatched search offers **+ Create “{name}”** for a custom type. Selecting a supported type opens that type’s actual Agreement template. Amendments are created from an executed agreement, not from this menu.

## New agreement

Supported types open as readable purpose-built Agreement documents (Employment, Sale / Purchase, Service / Contribution, Partnership, and the other governed types each have their own wording). Required facts are inline placeholders — parties, dates, position, price, and similar values are edited inside the document. Visible placeholders stay short so they fit the sentence (**Party**, **Employer**, **position**); accessible names keep the longer search/enter instruction. Structured data is stored underneath for search, lifecycle, signatures, and related activity.

The page header is **Agreement #** plus an auto-assigned number the user can edit, then **on**. The document heading names the kind (for example **Employment**, **Sale / Purchase**, **Lease**, or **Service(s) Provision**). That heading looks like ordinary title text. Hover shows only the other relevant wordings (not the current one). Click or tap the heading to rename it in place — there is no **Rename** row. On touch, press and hold to see the alternatives. Service / Contribution defaults to **Service(s) Provision**, with **Contribution(s)** on the hover menu. Lease offers **Residential lease**, **Commercial lease**, **Car lease**, **Vehicle lease**, **Equipment lease**, **Office lease**, and **Property rental**.

The opening sentence names who is which party, for example **Armen (the Client)** and **Civizen (the Service Provider)**. Role words look like the surrounding sentence; hover shows the other roles that belong in that agreement, and click or tap renames the role in place. Switching Service(s) Provision to Contribution(s) updates default roles to Recipient / Contributor when those roles were still the defaults.

Do not ask for Agreement type again on a separate form. Optional clauses are added from a quiet **Add terms** list. The primary action is **Create agreement** (the record still enters Draft).

Custom / unsupported names (for example **+ Create “Distribution Agreement”**) open a flexible readable skeleton: parties, purpose/subject, responsibilities/terms, effective period, additional terms. The custom name is stored on that Agreement (`custom` + `customTypeName`) and is not added to the global type registry.

When create starts from the title `+` menu or a Civizen activity, known parties and related facts are already in the document.

Default types in the `+` menu: General · Partnership / Collaboration · Employment Agreement · Service / Contribution · Sale / Purchase · Lease · Funding / Sponsorship, then **More agreement types…** as the last item in the same dropdown.

Specialized types (MOU, Pilot, Program, Data / Research, NDA) appear in that same menu after **More agreement types…** is selected, when searched, or when already prefilled from a Civizen activity. Amendments are created from an executed agreement, not from this flow.

**Employment Agreement** is a first-class type, distinct from Service / Contribution. Jobs / hiring launches prefill employer or employee (depending on who started), position, location, and known pay, and link the Agreement to the job relationship.

**Service / Contribution Agreement** covers independent services, consulting, contribution, volunteering, and project work. It does not establish employment.

**Sale / Purchase Agreement** is for negotiated commercial terms (equipment, procurement, bulk, custom goods, high-value, staged delivery, payment schedule, warranty/acceptance). Ordinary Marketplace purchases remain Order + Marketplace terms and must not auto-create this agreement. If a Sale / Purchase Agreement is started from a listing or order, prefill buyer, seller, product, quantity, price, currency, and the related listing/order. Orders and Agreements stay separate, linkable objects.

**Lease Agreement** is a first-class type for renting property or items. The document heading defaults to **Lease**; hover offers **Residential lease**, **Commercial lease**, **Car lease**, **Vehicle lease**, **Equipment lease**, **Office lease**, and **Property rental**. Click or tap the heading to rename it. Property-style kinds default to Landlord / Tenant; Car, Vehicle, and Equipment default to Lessor / Lessee.

Party values are searchable/editable inside the document. A unique Civizen directory match is bound automatically (including kind). Similarly named directory matches are chosen from the suggestion list. Person vs organization is asked only when the typed name is not in the directory and cannot be inferred.

Template language is a working draft. Do not present it as attorney-approved, jurisdiction-specific, or guaranteed enforceable.

## Domain

Identity and lifecycle live on the existing `agreements` table (including Market listing agreements as types `market_*`). Versions, parties, signatories, signatures, attachments, relationships, and audit events are child tables.

Native electronic signing requires explicit consent and a typed name. Paper / external execution is recorded separately and is not silently treated as a native signature.

Do not describe fingerprints as PKI digital signatures. Do not claim legal certification or enforceability.

## Related specs

- Contribute hub: [`contribute-page.md`](./contribute-page.md)
- Phase 1 pilots: [`phase-1-pilot-operating-model.md`](./phase-1-pilot-operating-model.md)
- Partnerships (institutional): [`../../institutional/stakeholder-partnership-framework.md`](../../institutional/stakeholder-partnership-framework.md)
- Pilots (institutional): [`../../institutional/pilot-framework.md`](../../institutional/pilot-framework.md)
