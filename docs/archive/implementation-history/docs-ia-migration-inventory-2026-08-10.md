# Documentation IA migration inventory (2026-08-10)

## Safety preflight

- Uncommitted work preserved: `src/components/market/MarketJobsInterestForm.tsx` (not touched).
- Untracked sources included: `docs/00-foundation/philosophy-of-mature-humanity.md`, `docs/tmp/contribute_page`.
- Branch: `main`, up to date with `origin/main` at migration start.

## Status vocabulary

`draft` · `under-review` · `accepted` · `current` · `superseded` · `historical` · `unknown`

## Philosophy reconciliation

| Current | Dest | Notes |
| --- | --- | --- |
| `phylosopy_of_mature_humanity.md` (untracked, 2026-08-10, v1.0) | `00-foundation/philosophy-of-mature-humanity.md` | Canonical living philosophy |
| `philosophy_of_the_mature_humanity.md` (tracked, v0.1) | `archive/superseded/philosophy-of-mature-humanity-v0.1.md` | Superseded shorter draft |

## Moves

| Current path | Destination | Classification | Status | Ambiguity |
| --- | --- | --- | --- | --- |
| `02-moderated/policies/foundation/the-civizen-charter.md` | `00-foundation/the-civizen-charter.md` | canonical | current |  |
| `02-moderated/policies/foundation/recognized-planetary-citizenship-pathway.md` | `00-foundation/recognized-planetary-citizenship-pathway.md` | canonical | current | Also functions as controlling policy; filed under foundation by purpose. |
| `civizen_why_this_exists_page_brief.md` | `00-foundation/why-civizen-exists-page-brief.md` | development note | current | Product page brief supporting /why-this-exists. |
| `02-moderated/legal/civizen_constitution_v0_1.md` | `01-governance/constitution/civizen-constitution-v0.1.md` | governance model | draft |  |
| `03-governance/advisory-high-council-model-v0.1.md` | `01-governance/institutions/advisory-high-council-model-v0.1.md` | governance model | draft |  |
| `03-governance/specialist-network-framework-v0.1.md` | `01-governance/institutions/specialist-network-framework-v0.1.md` | governance model | draft |  |
| `03-governance/content-collaboration-model.md` | `01-governance/institutions/content-collaboration-model.md` | governance model | draft |  |
| `03-governance/citizen-status-model-v0.1.md` | `01-governance/participation/citizen-status-model-v0.1.md` | governance model | draft |  |
| `03-governance/civic-voting-system-design-v0.1.md` | `01-governance/participation/civic-voting-system-design-v0.1.md` | technical specification | draft | Design spec spanning governance + platform. |
| `03-governance/community-readiness-and-program-availability-framework.md` | `01-governance/participation/community-readiness-and-program-availability-framework.md` | governance model | current |  |
| `03-governance/governance-permission-model-v0.1.md` | `01-governance/roles-and-permissions/governance-permission-model-v0.1.md` | governance model | draft |  |
| `03-governance/role-domains-and-maturity-thresholds-v0.1.md` | `01-governance/roles-and-permissions/role-domains-and-maturity-thresholds-v0.1.md` | governance model | draft |  |
| `03-governance/country-activation-framework-v0.1.md` | `01-governance/country-activation/country-activation-framework-v0.1.md` | governance model | draft |  |
| `03-governance/civizen-constitutional-tokenomics-governance.md` | `01-governance/funding-and-monetary/civizen-constitutional-tokenomics-governance.md` | governance model | superseded | Superseded for public policy by institutional notices; retained as model study. |
| `03-governance/funding/README.md` | `01-governance/funding-and-monetary/README.md` | governance model | superseded | Exploratory funding pack; not current public policy. |
| `03-governance/funding/TESTING.md` | `01-governance/funding-and-monetary/TESTING.md` | development note | historical |  |
| `03-governance/funding/conflict-of-interest-policy-v0.1.md` | `01-governance/funding-and-monetary/conflict-of-interest-policy-v0.1.md` | policy | superseded |  |
| `03-governance/funding/contributor-reward-policy-v0.1.md` | `01-governance/funding-and-monetary/contributor-reward-policy-v0.1.md` | policy | superseded |  |
| `03-governance/funding/crypto-usdt-treasury-policy-v0.1.md` | `01-governance/funding-and-monetary/crypto-usdt-treasury-policy-v0.1.md` | policy | superseded |  |
| `03-governance/funding/donation-acceptance-policy-v0.1.md` | `01-governance/funding-and-monetary/donation-acceptance-policy-v0.1.md` | policy | superseded |  |
| `03-governance/funding/founder-stewardship-reserve-clause-v0.1.md` | `01-governance/funding-and-monetary/founder-stewardship-reserve-clause-v0.1.md` | policy | superseded |  |
| `03-governance/funding/funding-constitution-v0.1.md` | `01-governance/funding-and-monetary/funding-constitution-v0.1.md` | policy | superseded |  |
| `03-governance/funding/grant-restricted-funds-policy-v0.1.md` | `01-governance/funding-and-monetary/grant-restricted-funds-policy-v0.1.md` | policy | superseded |  |
| `03-governance/funding/implementation-roadmap-v0.1.md` | `01-governance/funding-and-monetary/implementation-roadmap-v0.1.md` | development note | historical |  |
| `03-governance/funding/investor-revenue-participation-terms-v0.1.md` | `01-governance/funding-and-monetary/investor-revenue-participation-terms-v0.1.md` | policy | superseded |  |
| `03-governance/funding/kyc-aml-sanctions-policy-outline-v0.1.md` | `01-governance/funding-and-monetary/kyc-aml-sanctions-policy-outline-v0.1.md` | policy | draft |  |
| `03-governance/funding/open-legal-questions.md` | `01-governance/funding-and-monetary/open-legal-questions.md` | research | draft |  |
| `03-governance/funding/public-transparency-ledger-policy-v0.1.md` | `01-governance/funding-and-monetary/public-transparency-ledger-policy-v0.1.md` | policy | superseded |  |
| `03-governance/funding/risk-disclosure-v0.1.md` | `01-governance/funding-and-monetary/risk-disclosure-v0.1.md` | policy | superseded |  |
| `03-governance/funding/sponsorship-policy-v0.1.md` | `01-governance/funding-and-monetary/sponsorship-policy-v0.1.md` | policy | superseded |  |
| `03-governance/funding/supporting-documents-index.md` | `01-governance/funding-and-monetary/supporting-documents-index.md` | governance model | superseded |  |
| `03-governance/founder-role-charter-v0.2.md` | `archive/superseded/founder-role-charter-v0.2.md` | historical record | superseded |  |
| `02-moderated/policies/citizenship_and_verification_policy_v0_1.md` | `02-policies/citizenship-and-verification/citizenship-and-verification-policy-v0.1.md` | policy | draft |  |
| `02-moderated/policies/governance/civizen-community-governance-charter.md` | `02-policies/governance/civizen-community-governance-charter.md` | policy | current |  |
| `02-moderated/policies/institutional/ai-advisory-and-human-authority.md` | `02-policies/institutional/ai-advisory-and-human-authority.md` | policy | current |  |
| `02-moderated/policies/institutional/contributor-participation-and-recognition.md` | `02-policies/institutional/contributor-participation-and-recognition.md` | policy | current |  |
| `02-moderated/policies/institutional/current-legal-status-notice.md` | `02-policies/institutional/current-legal-status-notice.md` | policy | current |  |
| `02-moderated/policies/institutional/funding-and-financial-integrity.md` | `02-policies/institutional/funding-and-financial-integrity.md` | policy | current |  |
| `02-moderated/policies/institutional/governance-and-human-oversight.md` | `02-policies/institutional/governance-and-human-oversight.md` | policy | current |  |
| `02-moderated/policies/institutional/institutional-identity-and-relationship.md` | `02-policies/institutional/institutional-identity-and-relationship.md` | policy | current |  |
| `02-moderated/policies/institutional/international-partnerships-and-chapters.md` | `02-policies/institutional/international-partnerships-and-chapters.md` | policy | current |  |
| `02-moderated/policies/institutional/investor-interest-non-offering-notice.md` | `02-policies/institutional/investor-interest-non-offering-notice.md` | policy | current |  |
| `02-moderated/policies/institutional/mission-and-independence-charter.md` | `02-policies/institutional/mission-and-independence-charter.md` | policy | current |  |
| `02-moderated/policies/institutional/open-source-ip-brand-stewardship.md` | `02-policies/institutional/open-source-ip-brand-stewardship.md` | policy | current |  |
| `02-moderated/policies/institutional/transparency-and-accountability-standard.md` | `02-policies/institutional/transparency-and-accountability-standard.md` | policy | current |  |
| `02-moderated/policies/institutional/world-citizenship-and-civic-status-notice.md` | `02-policies/institutional/world-citizenship-and-civic-status-notice.md` | policy | current |  |
| `02-moderated/policies/institutional/README.md` | `02-policies/institutional/README.md` | policy | current |  |
| `02-moderated/policies/monetary/civizen_luma_monetary_policy_and_ai_agent_spec.md` | `02-policies/monetary/civizen-luma-monetary-policy-and-ai-agent-spec.md` | policy | superseded | Prototype-credits era; retained for Study baseline. |
| `02-moderated/legal/civizen_terms_of_use.md` | `02-policies/legal/civizen-terms-of-use.md` | policy | draft |  |
| `SOVEREIGN_CIVIZEN_ARCHITECTURE.md` | `03-platform/architecture/sovereign-civizen-architecture.md` | technical specification | historical | Still useful architecture reference; not day-to-day ops. |
| `03-governance/decentralized-transition-architecture.md` | `03-platform/decentralization/decentralized-transition-architecture.md` | technical specification | current |  |
| `GOVERNANCE_INTEGRATION_GUIDE.md` | `03-platform/civic-participation/governance-integration-guide.md` | technical specification | historical | Ambiguous: integration guide vs archive; kept under platform with historical status. |
| `civizen_score_page_reorganization.md` | `03-platform/scoring-and-reputation/civizen-score-page-reorganization.md` | technical specification | current |  |
| `civizen_score_tiers_implementation.md` | `03-platform/scoring-and-reputation/civizen-score-tiers-implementation.md` | technical specification | current |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/00_front_matter.md` | `05-research/academic/constitutional-studies/universal-constitution/00_front_matter.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/01_preamble.md` | `05-research/academic/constitutional-studies/universal-constitution/01_preamble.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/02_article_i_foundational_principles.md` | `05-research/academic/constitutional-studies/universal-constitution/02_article_i_foundational_principles.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/03_article_ii_fundamental_rights.md` | `05-research/academic/constitutional-studies/universal-constitution/03_article_ii_fundamental_rights.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/04_article_iii_civic_duties.md` | `05-research/academic/constitutional-studies/universal-constitution/04_article_iii_civic_duties.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/05_article_iv_constitutional_governance.md` | `05-research/academic/constitutional-studies/universal-constitution/05_article_iv_constitutional_governance.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/06_article_v_rule_of_law_and_justice.md` | `05-research/academic/constitutional-studies/universal-constitution/06_article_v_rule_of_law_and_justice.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/07_article_vi_economic_order_and_public_value.md` | `05-research/academic/constitutional-studies/universal-constitution/07_article_vi_economic_order_and_public_value.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/08_article_vii_technology_data_and_ai.md` | `05-research/academic/constitutional-studies/universal-constitution/08_article_vii_technology_data_and_ai.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/09_article_viii_environment_and_intergenerational_stewardship.md` | `05-research/academic/constitutional-studies/universal-constitution/09_article_viii_environment_and_intergenerational_stewardship.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/10_article_ix_peace_security_and_emergency_powers.md` | `05-research/academic/constitutional-studies/universal-constitution/10_article_ix_peace_security_and_emergency_powers.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/11_article_x_constitutional_institutions.md` | `05-research/academic/constitutional-studies/universal-constitution/11_article_x_constitutional_institutions.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/12_article_xi_amendment_and_constitutional_protection.md` | `05-research/academic/constitutional-studies/universal-constitution/12_article_xi_amendment_and_constitutional_protection.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/13_article_xii_ratification_and_transition.md` | `05-research/academic/constitutional-studies/universal-constitution/13_article_xii_ratification_and_transition.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/14_drafting_notes_for_next_iteration.md` | `05-research/academic/constitutional-studies/universal-constitution/14_drafting_notes_for_next_iteration.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/README.md` | `05-research/academic/constitutional-studies/universal-constitution/README.md` | research | draft |  |
| `02-moderated/academic-materials/constitutional-studies/universal-constitution/universal_constitution.md` | `05-research/academic/constitutional-studies/universal-constitution/universal_constitution.md` | research | draft |  |
| `02-moderated/academic-materials/README.md` | `05-research/academic/README.md` | research | unknown |  |
| `02-moderated/professional-materials/README.md` | `05-research/professional/README.md` | research | unknown |  |
| `study/README.md` | `05-research/studies/README.md` | research | unknown |  |
| `00-intake/templates/content-frontmatter.md` | `04-operations/contributor-processes/content-frontmatter-template.md` | development note | current |  |
| `00-intake/README.md` | `archive/superseded/moderation-filing/00-intake-README.md` | historical record | superseded | Old moderation-lane filing guide. |
| `01-unmoderated/README.md` | `archive/superseded/moderation-filing/01-unmoderated-README.md` | historical record | superseded |  |
| `01-unmoderated/intercommunication/README.md` | `archive/superseded/moderation-filing/01-unmoderated-intercommunication-README.md` | historical record | superseded |  |
| `01-unmoderated/leisure-reading/README.md` | `archive/superseded/moderation-filing/01-unmoderated-leisure-reading-README.md` | historical record | superseded |  |
| `02-moderated/README.md` | `archive/superseded/moderation-filing/02-moderated-README.md` | historical record | superseded |  |
| `02-moderated/legal/README.md` | `archive/superseded/moderation-filing/02-moderated-legal-README.md` | historical record | superseded |  |
| `02-moderated/policies/README.md` | `archive/superseded/moderation-filing/02-moderated-policies-README.md` | historical record | superseded |  |
| `02-moderated/policies/foundation/README.md` | `archive/superseded/moderation-filing/02-moderated-policies-foundation-README.md` | historical record | superseded |  |
| `02-moderated/policies/governance/README.md` | `archive/superseded/moderation-filing/02-moderated-policies-governance-README.md` | historical record | superseded |  |
| `03-governance/README.md` | `archive/superseded/moderation-filing/03-governance-README.md` | historical record | superseded |  |
| `04-operations/dev/content-status-retrieval-rules.md` | `04-operations/contributor-processes/content-status-retrieval-rules.md` | development note | current |  |
| `DECENTRALIZATION_COMPLETE.md` | `archive/implementation-history/decentralization-complete.md` | historical record | historical |  |
| `decentralization_tracking_issue.md` | `archive/implementation-history/decentralization-tracking-issue.md` | historical record | historical |  |
| `PHASE2_P2P_INTEGRATION_GUIDE.md` | `archive/completed-phases/phase2-p2p-integration-guide.md` | historical record | historical |  |
| `PHASE3_PROTOCOL_GOVERNANCE_GUIDE.md` | `archive/completed-phases/phase3-protocol-governance-guide.md` | historical record | historical |  |
| `PHASE4_STAGED_PROMOTION_WORKFLOW.md` | `archive/completed-phases/phase4-staged-promotion-workflow.md` | historical record | historical |  |
| `SOVEREIGN_CIVIZEN_VERIFICATION_REPORT.md` | `archive/implementation-history/sovereign-civizen-verification-report.md` | historical record | historical |  |
| `ISSUE_GOVERNANCE_UX.md` | `archive/implementation-history/issue-governance-ux.md` | historical record | historical |  |
| `PR_DECENTRALIZATION_SCHEMA.md` | `archive/implementation-history/pr-decentralization-schema.md` | historical record | historical |  |
| `PR_GOVERNANCE_UI.md` | `archive/implementation-history/pr-governance-ui.md` | historical record | historical |  |
| `dev/initial_funding_policy_discussion` | `archive/superseded/initial-funding-policy-discussion.md` | historical record | superseded | Was already a redirect stub. |
| `tmp/contribute_page` | `proposals/drafts/contribute-page-redesign-v2.md` | proposal | draft | Untracked design draft; formalized under proposals. |

## Unmoved (already correctly placed)

| Path | Notes |
| --- | --- |
| `README.md` | Remains under purpose-based operations tree |
| `04-operations/README.md` | Remains under purpose-based operations tree |
| `04-operations/dev/AGENTS.md` | Remains under purpose-based operations tree |
| `04-operations/dev/CIVIZEN_REBRAND.md` | Remains under purpose-based operations tree |
| `04-operations/dev/ENGINEERING_STANDARDS.md` | Remains under purpose-based operations tree |
| `04-operations/dev/ENVIRONMENT_LIFECYCLE.md` | Remains under purpose-based operations tree |
| `04-operations/dev/OTA_UPDATES_PLAN.md` | Remains under purpose-based operations tree |
| `04-operations/dev/RELEASING.md` | Remains under purpose-based operations tree |
| `04-operations/dev/REMOTE_DB_ACCESS.md` | Remains under purpose-based operations tree |
| `04-operations/dev/assets/android-download-qr.png` | Remains under purpose-based operations tree |
| `04-operations/dev/brand-source/civizen-icon-source.png` | Remains under purpose-based operations tree |
| `04-operations/dev/brand-source/civizen-lockup-source.png` | Remains under purpose-based operations tree |
| `04-operations/dev/brand-source/master-mark-dark.png` | Remains under purpose-based operations tree |
| `04-operations/dev/brand-source/master-mark.png` | Remains under purpose-based operations tree |
| `04-operations/dev/civizen.xml` | Remains under purpose-based operations tree |
| `04-operations/dev/civizen_Production_SVG_Specification.xml` | Remains under purpose-based operations tree |
| `04-operations/dev/contribute-page.md` | Remains under purpose-based operations tree |
| `04-operations/dev/engineering-standards-baseline.json` | Remains under purpose-based operations tree |
| `04-operations/dev/engineering-standards-remediation.md` | Remains under purpose-based operations tree |
| `04-operations/dev/governance-implementation-larger-chunks-v0.1.md` | Remains under purpose-based operations tree |
| `04-operations/dev/governance-implementation-roadmap-v0.1.md` | Remains under purpose-based operations tree |
| `04-operations/dev/nav-secondary-carousel.md` | Remains under purpose-based operations tree |
| `04-operations/dev/social-accounts-crosspost.md` | Remains under purpose-based operations tree |
| `04-operations/dev/solutions-council.md` | Remains under purpose-based operations tree |
| `04-operations/dev/ssh-and-vps/CIVIZEN_WORLD_DNS_AND_SSL.md` | Remains under purpose-based operations tree |
| `04-operations/dev/ssh-and-vps/README.md` | Remains under purpose-based operations tree |
| `04-operations/dev/ssh-and-vps/SSH_SHELL_AND_CURSOR.md` | Remains under purpose-based operations tree |
| `04-operations/dev/ssh-and-vps/VPS_CURSOR_AGENT_SSH.md` | Remains under purpose-based operations tree |
| `04-operations/dev/ssh-and-vps/nginx-civizen-spa-asset-cache.conf` | Remains under purpose-based operations tree |
| `04-operations/dev/verifier-federation/operator-signer-rotation-runbook-v0.1.md` | Remains under purpose-based operations tree |
| `04-operations/dev/verifier-federation/rollout-plan-v0.1.md` | Remains under purpose-based operations tree |

## Redirect cleanup (same session)

Investigated repository, app imports, tests, automation, and `.github/CODEOWNERS` for consumers of legacy redirect paths.

| Finding | Action |
| --- | --- |
| App/`src` imports already used canonical paths | No stubs required |
| No docs site / published docs URL configuration found | No stubs required |
| `.github/CODEOWNERS` listed `docs/03-governance/` | Updated to purpose-based paths (`00-foundation` … `05-research`) |
| Precautionary redirect dirs/files only | Removed |

Removed: `docs/00-intake/`, `docs/01-unmoderated/`, `docs/02-moderated/`, `docs/03-governance/`, `docs/dev/`, `docs/study/`, and loose top-level redirect stubs (`philosophy_*`, `phylosopy_*`, score briefs, `DECENTRALIZATION_COMPLETE.md`, `SOVEREIGN_CIVIZEN_ARCHITECTURE.md`, and the `04-operations/dev/content-status-retrieval-rules.md` stub).

**Redirects retained:** none.
