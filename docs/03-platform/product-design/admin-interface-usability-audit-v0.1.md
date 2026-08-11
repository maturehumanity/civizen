---
title: Admin interface usability audit v0.1
status: audit
version: 0.1
date: 2026-08-10
related:
  - information-architecture-and-content-standards.md
canonical: false
---

# Admin interface usability audit v0.1

**Scope:** Identify the long-page / mixed-workflow pattern visible in Settings/Admin (including directory attestation and autonomous probe controls).  
**This pass does not redesign those pages.** One low-risk local copy improvement is allowed on the directory attestation card.

## Pattern (evidence)

Directory attestation / mirror production controls place publish directory, record attestation, technical hashes, signer keys, and related lists on one continuous administrative surface. Labels lean implementation-native with weak task sequencing and little prerequisite text when actions are disabled.

This matches the broader Civizen risk: unrelated workflows sharing one scroll, unclear technical labels, and mobile length.

## Findings (prioritized)

| Priority | Area | Issue | Recommended remediation | Status |
| ---: | --- | --- | --- | --- |
| P0 | Governance Program Readiness | Full “Record decision” form repeated for every World/jurisdiction row | Summary → filterable list → one selected detail form | **Addressed (2026-08-10)** |
| P0 | Funding Budget empty/status clarity | Missing empty/access/load distinctions; demonstration status not obvious | Distinct empty states + demonstration badges | **Addressed (2026-08-10)** |
| P1 | Verifier mirror / directory attestation | Unrelated publish vs attest flows adjacent; technical labels | Split into sequenced cards; plain-language titles; disabled reasons | Partial: short description + disabled hint only |
| P1 | Autonomous probe controls (same family) | Dense technical fields; weak grouping | Separate run probe from interpret results; advanced metadata collapsed | Deferred |
| P2 | Governance Admin page length | Program Readiness fixed; other cards still long continuous page | Apply same summary→detail pattern to remaining cards | Remaining |
| P2 | Disabled actions generally | Often no prerequisite text | Shared disabled-reason pattern | Partial on readiness form |
| P3 | Mobile overlap with persistent chrome | Risk on long admin forms | Audit padding per page | Partial `pb` on Funding Budget + Program Readiness |

## Program Readiness (before → after)

**Before:** `GovernanceProgramReadinessCard` mapped every review to a full `GovernanceProgramReadinessScopeCard`, each with its own decision Select, notes, and Save — an excessively long mobile page.

**After:** World summary chip metrics → jurisdiction summary counts → searchable/filterable compact list → **one** selected-detail panel with the existing decision options, validation/disabled messaging, and `onRecordDecision` persistence path unchanged.

**Preserved:** decision enum set, hook/API inserts, RLS/permissions (`role.assign` | `settings.manage`), anchor `#stewardship-program-readiness`, no activation terminology in user-facing copy.

## Representative improvement applied (low risk)

**File:** `GovernancePublicAuditVerifierMirrorDirectoryCard.tsx`  
**Change:** Add a short plain-language description under Record directory attestation and a prerequisite hint when Save is disabled.  
**Does not:** change RPC behavior, permissions, layout shell, or move publish/attest into separate routes.

## Explicit non-goals this pass

- Rebuild verifier-mirror production UI  
- Redesign global Settings navigation  
- Change governance permissions or database behavior  
- Change finance schemas or seed/reseed demonstration amounts  
