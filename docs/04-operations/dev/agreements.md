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

Supported types open as readable purpose-built Agreement documents (Employment, Sale / Purchase, Service / Contribution, Partnership, and the other governed types each have their own wording). Required facts are inline placeholders — parties, dates, position, price, and similar values are edited inside the document. Visible placeholders name the action needed (**Select or enter party**, **Describe the service or contribution**, **Select start date**) and use the fill-in color (teal) until a value is entered. Structured data is stored underneath for search, lifecycle, signatures, and related activity.

The page header is **Agreement on**. Hover or click/tap that wording to open the same type menu as the Agreements `+` (search, common types, **More agreement types…**). Choosing a type switches this draft. The document heading names the kind (for example **Employment**, **Sale / Purchase**, **Lease**, or **Service Provision**) and sits on the left of that line. An optional user/organization reference sits on the right of the same line, muted and editable (**Your reference**). It defaults to the service provider’s initials or the organization’s abbreviation (for example **AR** or **CRU**) when that name is known, and parties can change it or leave it blank — **USC-2026-04** and **PO-1187** are valid custom numbers. It is not the Civizen Agreement ID. A Civizen reference (**AGR-2026-0001**) is assigned when the first party signature arrives (native or recorded external execution). It is immutable and appears in small type in the lower-right corner of the agreement — not on the creation screen. That heading looks like ordinary title text. Hover shows only the other relevant wordings (not the current one). Click or tap the heading to rename it in place — there is no **Rename** row. On touch, press and hold to see the alternatives. Service / Contribution defaults to **Service Provision**, with **Contribution** on the hover menu. Lease offers **Residential lease**, **Commercial lease**, **Car lease**, **Vehicle lease**, **Equipment lease**, **Office lease**, and **Property rental**.

The opening sentence names who is which party. A service relationship defaults to **Client** and **Service Provider**. A contribution relationship (including launches from an opportunity) defaults to **Organization / Project** and **Contributor**. Role labels such as *the Client* or *the Service Provider* are italic in the Agreement prose so the party name stays visually primary. Hover shows the other roles that belong in that agreement, including **Service Provider** on the Client side. Click or tap renames the role in place; italics stay after editing. Choosing **Service Provider** for yourself sets the other party to **Client** when that role was still the paired default. Switching Service Provision to Contribution updates default roles to Organization / Project / Contributor when those roles were still the defaults.

The term reads as one ending condition: **This agreement is effective from Aug 13, 2026 until Aug 13, 2027.** Dates look like the surrounding sentence. Hover or tap a date to open a compact calendar and change it. The calendar stays fully inside the visible screen (it shifts left or opens above the date when needed). New drafts prefill today’s local calendar date and the same date one calendar year later (Feb 29 falls back to Feb 28). The ending can be a specific date, until completed, ongoing, or until terminated — only options that fit the Agreement type. Those choices render as natural Agreement language; the document never shows an end date and **Until completed** as competing values.

Click any sentence or paragraph to rewrite it in place. Scope, responsibilities, names, and other fields continue in the sentence: a word that fits the remaining line stays there, then the field wraps at word boundaries. Enter starts a new line in long fields. A compact formatting bar appears while a long field is focused. Hover or tap an icon that has options (font, color, size, list, alignment) to pick from the list — fonts include common document faces; sizes are 12, 14, 16, 18, and 24; alignment includes justify. Bold, italic, and underline stay one-tap toggles. Tap also opens those menus, so hover is not required. Empty required placeholders stay the fill-in color. Tokens stay interactive until that paragraph is rewritten. Section headings are also click-to-edit.

Do not ask for Agreement type again on a separate form. Optional clauses are added from a quiet **Add terms** list; adding one inserts that section into the document and removes it from the list. A discreet **Remove** returns it. **Create agreement** stays on the document and highlights the first missing required fact (other party, subject/scope, start date, and other essential type-specific information — not optional terms). The primary action is **Create agreement** (the record still enters Draft).

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
