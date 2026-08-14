import { describe, expect, it } from 'vitest';

import { fingerprintAgreementVersion, canonicalJson } from '@/lib/agreements-fingerprint';
import {
  AGREEMENT_PRIMARY_VIEWS,
  AGREEMENT_TRANSITIONS,
  AGREEMENT_WORKSPACE_BUCKETS,
  agreementListBucket,
  agreementMatchesLifecycleFilter,
  agreementWorkspaceCardAction,
  agreementsCreatePath,
  agreementCreateExtraSections,
  allRequiredSignaturesComplete,
  assertAgreementTransition,
  canTransitionAgreementStatus,
  defaultAgreementTypeForSource,
  formatAgreementReference,
  agreementNumberFromReference,
  agreementReferenceFromNumber,
  sanitizeAgreementReferenceInput,
  addCalendarYears,
  formatAgreementDate,
  isContributionLaunchSource,
  localIsoDate,
  partyReferenceStem,
  suggestedPartyReference,
  isCivizenAgreementReference,
  isEditableStatus,
  marketTypeFromTemplateKey,
  nextAgreementAction,
  normalizeAgreementCreateType,
  normalizeAgreementStatus,
  otherPartyNames,
  parseAgreementLaunchContext,
  relatedEntityHref,
  relatedEntityTypeForSource,
  resolveDirectoryPartyMatch,
  resolveEnteredParty,
  shouldAutoActivate,
  visibleAgreementCreateTypes,
  filterAgreementCreateMenuTypes,
  signingProgressLabel,
  starterContentForType,
} from '@/lib/agreements-model';
import { buildExecutedAgreementPdf, executedAgreementFilename } from '@/lib/agreements-pdf';

describe('agreements lifecycle', () => {
  it('allows draft → review → proposed → signing → signed → active', () => {
    expect(canTransitionAgreementStatus('draft', 'in_review')).toBe(true);
    expect(canTransitionAgreementStatus('in_review', 'proposed')).toBe(true);
    expect(canTransitionAgreementStatus('proposed', 'partially_signed')).toBe(true);
    expect(canTransitionAgreementStatus('partially_signed', 'signed')).toBe(true);
    expect(canTransitionAgreementStatus('signed', 'active')).toBe(true);
    expect(canTransitionAgreementStatus('active', 'completed')).toBe(true);
    expect(canTransitionAgreementStatus('active', 'terminated')).toBe(true);
  });

  it('rejects arbitrary jumps and edits after execution', () => {
    expect(canTransitionAgreementStatus('draft', 'active')).toBe(false);
    expect(canTransitionAgreementStatus('signed', 'draft')).toBe(false);
    expect(canTransitionAgreementStatus('active', 'proposed')).toBe(false);
    expect(isEditableStatus('signed')).toBe(false);
    expect(isEditableStatus('active')).toBe(false);
    expect(() => assertAgreementTransition('signed', 'draft')).toThrow(/Invalid agreement status/);
  });

  it('maps Market statuses without losing meaning', () => {
    expect(normalizeAgreementStatus('pending_counterparty')).toBe('partially_signed');
    expect(normalizeAgreementStatus('cancelled')).toBe('withdrawn');
    expect(marketTypeFromTemplateKey('service')).toBe('market_service');
  });

  it('activates immediately when there is no future effective date', () => {
    expect(shouldAutoActivate({ status: 'signed', effectiveAt: null })).toBe(true);
    expect(shouldAutoActivate({
      status: 'signed',
      effectiveAt: '2099-01-01T00:00:00.000Z',
      now: new Date('2026-08-13T00:00:00.000Z'),
    })).toBe(false);
  });

  it('keeps every collaboration status in the transition table', () => {
    expect(Object.keys(AGREEMENT_TRANSITIONS).sort()).toEqual([
      'active',
      'completed',
      'declined',
      'draft',
      'expired',
      'in_review',
      'partially_signed',
      'proposed',
      'signed',
      'terminated',
      'withdrawn',
    ]);
  });
});

describe('agreements identity and signing progress', () => {
  it('formats a human-readable reference that is not a primary key', () => {
    expect(formatAgreementReference(2026, 1)).toBe('AGR-2026-0001');
    expect(agreementNumberFromReference('AGR-2026-0001')).toBe('1');
    expect(agreementReferenceFromNumber('12', 2026)).toBe('AGR-2026-0012');
    expect(agreementReferenceFromNumber('AGR-2026-0001')).toBe('AGR-2026-0001');
    expect(agreementReferenceFromNumber('mou-2026-12')).toBe('MOU-2026-12');
    expect(sanitizeAgreementReferenceInput('#agr-2026-0001!')).toBe('AGR-2026-0001');
  });

  it('defaults a party reference from person initials or an organization abbreviation', () => {
    expect(partyReferenceStem('Alex Rivera', 'person')).toBe('AR');
    expect(partyReferenceStem('Cedar River University', 'organization')).toBe('CRU');
    expect(partyReferenceStem('USC', 'organization')).toBe('USC');
    expect(suggestedPartyReference('Cedar River University')).toBe('CRU');
    expect(isCivizenAgreementReference('AGR-2026-0001')).toBe(true);
    expect(isCivizenAgreementReference('USC-2026-04')).toBe(false);
  });

  it('uses a calendar-year increment and a Feb 29 fallback', () => {
    expect(addCalendarYears('2026-08-13', 1)).toBe('2027-08-13');
    expect(addCalendarYears('2024-02-29', 1)).toBe('2025-02-28');
    expect(addCalendarYears('2024-02-29', 4)).toBe('2028-02-29');
    expect(formatAgreementDate('2026-08-13')).toBe('Aug 13, 2026');
    expect(localIsoDate(new Date(2026, 7, 13))).toBe('2026-08-13');
    expect(isContributionLaunchSource('opportunity')).toBe(true);
    expect(isContributionLaunchSource('market_listing')).toBe(false);
  });

  it('shows party-level signing progress', () => {
    const label = signingProgressLabel([
      { partyId: 'a', displayName: 'Civizen', requiredTotal: 1, requiredSigned: 1 },
      { partyId: 'b', displayName: 'University Partner', requiredTotal: 1, requiredSigned: 0 },
    ]);
    expect(label).toContain('Civizen ✓');
    expect(label).toContain('University Partner Pending');
    expect(allRequiredSignaturesComplete([
      { partyId: 'a', displayName: 'Civizen', requiredTotal: 1, requiredSigned: 1 },
      { partyId: 'b', displayName: 'University Partner', requiredTotal: 1, requiredSigned: 0 },
    ])).toBe(false);
  });

  it('asks the assigned signer to sign and otherwise shows the next stage', () => {
    expect(nextAgreementAction({
      status: 'proposed',
      canEdit: false,
      canReview: false,
      canSign: true,
      needsMySignature: true,
      isLockedVersion: true,
      executed: false,
    })).toBe('sign');
    expect(nextAgreementAction({
      status: 'draft',
      canEdit: true,
      canReview: false,
      canSign: false,
      needsMySignature: false,
      isLockedVersion: false,
      executed: false,
    })).toBe('continue_draft');
  });

  it('links related activity to existing Civizen routes', () => {
    expect(relatedEntityHref('opportunity', 'opp-1')).toBe('/contribute/professional/opp-1');
    expect(relatedEntityHref('challenge', 'ch-1')).toBe('/contribute/challenges/ch-1');
    expect(relatedEntityHref('agreement', 'agr-1')).toBe('/agreements/agr-1');
    expect(relatedEntityHref('partnership')).toBe('/partners');
    expect(relatedEntityHref('job')).toBe('/market');
  });

  it('provides starter sections without legal clause text', () => {
    const content = starterContentForType('pilot', 'A fictional university pilot');
    expect(content.sections.some((section) => section.title === 'Purpose of the pilot')).toBe(true);
    expect(content.sections.every((section) => section.body === '')).toBe(true);
  });
});

describe('agreement version fingerprint', () => {
  it('changes when content changes and stays stable for the same snapshot', async () => {
    const base = {
      agreementId: 'agr-1',
      versionNumber: 2,
      title: 'Pilot Collaboration Agreement',
      agreementType: 'pilot',
      content: starterContentForType('pilot', 'Pilot with a fictional university partner'),
      parties: [{ name: 'Civizen' }, { name: 'Cedar River University' }],
      signatories: [{ party: 'Civizen', required: true }],
      attachments: [],
    };
    const first = await fingerprintAgreementVersion(base);
    const second = await fingerprintAgreementVersion(base);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toBe(second);
    const changed = await fingerprintAgreementVersion({
      ...base,
      content: {
        ...base.content,
        sections: base.content.sections.map((section) => (
          section.id === 'scope' ? { ...section, body: 'Narrowed scope' } : section
        )),
      },
    });
    expect(changed).not.toBe(first);
  });

  it('sorts keys so object insertion order cannot change the fingerprint', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });
});

describe('executed agreement PDF', () => {
  it('emits a downloadable PDF for the executed record', () => {
    const bytes = buildExecutedAgreementPdf({
      referenceCode: 'AGR-2026-0001',
      partyReference: 'CRU-2026-04',
      title: 'Pilot Collaboration Agreement',
      agreementTypeLabel: 'Pilot / Collaboration Agreement',
      versionNumber: 2,
      fingerprint: 'a'.repeat(64),
      statusLabel: 'Active',
      parties: [{ displayName: 'Civizen' }, { displayName: 'Cedar River University' }],
      content: starterContentForType('pilot', 'Fictional demo only'),
      signatures: [
        {
          signerName: 'Alex Rivera',
          partyName: 'Civizen',
          capacity: 'Authorized representative',
          signedAt: '2026-08-13T18:00:00.000Z',
          method: 'native_electronic',
        },
      ],
    });
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('AGR-2026-0001');
    expect(text).toContain('Party reference: CRU-2026-04');
    expect(text).toContain('Integrity fingerprint');
    expect(text).not.toContain('legally certified');
    expect(executedAgreementFilename('AGR-2026-0001', 2)).toBe('AGR-2026-0001-v2.pdf');
  });
});

describe('agreements workspace IA', () => {
  it('uses the canonical working-area buckets', () => {
    expect(AGREEMENT_WORKSPACE_BUCKETS).toEqual([
      'needs_action',
      'draft',
      'in_review',
      'awaiting_signatures',
      'active',
      'completed',
    ]);
    expect(agreementListBucket({ status: 'pending_counterparty' })).toBe('awaiting_signatures');
    expect(agreementListBucket({ status: 'terminated' })).toBe('completed');
    expect(agreementListBucket({ status: 'draft', needsAction: true })).toBe('needs_action');
    expect(AGREEMENT_PRIMARY_VIEWS).toEqual(['needs_action', 'active', 'all']);
    expect(agreementMatchesLifecycleFilter('partially_signed', 'awaiting_signatures')).toBe(true);
    expect(agreementWorkspaceCardAction({ status: 'proposed', needsAction: true })).toBe('sign');
    expect(agreementWorkspaceCardAction({ status: 'active', needsAction: false })).toBe('open');
    expect(otherPartyNames(
      [{ displayName: 'You' }, { displayName: 'Cedar River University' }],
      ['You'],
    )).toEqual(['Cedar River University']);
  });

  it('prefills create from a Civizen activity instead of a blank form', () => {
    expect(defaultAgreementTypeForSource('pilot')).toBe('pilot');
    expect(defaultAgreementTypeForSource('program')).toBe('program');
    expect(defaultAgreementTypeForSource('opportunity')).toBe('service_contribution');
    expect(defaultAgreementTypeForSource('job')).toBe('employment');
    expect(relatedEntityTypeForSource('pilot')).toBe('challenge');
    const path = agreementsCreatePath({
      source: 'opportunity',
      relatedId: 'opp-1',
      relatedTitle: 'Education-to-Contribution internship',
      partyName: 'Cedar River University',
      partyKind: 'external_organization',
    });
    expect(path.startsWith('/agreements/new?')).toBe(true);
    const parsed = parseAgreementLaunchContext(path.split('?')[1] || '');
    expect(parsed.source).toBe('opportunity');
    expect(parsed.relatedId).toBe('opp-1');
    expect(parsed.relatedTitle).toBe('Education-to-Contribution internship');
    expect(parsed.agreementType).toBe('service_contribution');
    expect(parsed.partyName).toBe('Cedar River University');
  });

  it('keeps specialized create types behind More types and infers other-party kind', () => {
    expect(visibleAgreementCreateTypes({ showMore: false })).toEqual([
      'general',
      'partnership',
      'employment',
      'service_contribution',
      'sale_purchase',
      'lease',
      'funding',
    ]);
    expect(visibleAgreementCreateTypes({ currentType: 'pilot', showMore: false })).toContain('pilot');
    expect(visibleAgreementCreateTypes({ showMore: true })).toContain('nda');
    expect(visibleAgreementCreateTypes({ showMore: true })).not.toContain('amendment');
    expect(visibleAgreementCreateTypes({ showMore: true })).not.toContain('other');
    expect(visibleAgreementCreateTypes({ showMore: true })).not.toContain('custom');
    expect(normalizeAgreementCreateType('amendment')).toBe('general');
    expect(normalizeAgreementCreateType('other')).toBe('custom');
    expect(agreementsCreatePath({ agreementType: 'sale_purchase' })).toBe('/agreements/new?type=sale_purchase');
    expect(agreementCreateExtraSections('sale_purchase').map((section) => section.id)).toEqual([
      'products_price',
      'payment',
      'delivery',
      'terms',
    ]);
    expect(filterAgreementCreateMenuTypes({
      query: '',
      showMore: false,
      labelFor: (type) => type,
    }).types).toEqual(['general', 'partnership', 'employment', 'service_contribution', 'sale_purchase', 'lease', 'funding']);
    expect(filterAgreementCreateMenuTypes({
      query: 'purchase',
      showMore: false,
      labelFor: (type) => (type === 'sale_purchase' ? 'Sale / Purchase' : type),
    }).types).toEqual(['sale_purchase']);
    expect(filterAgreementCreateMenuTypes({
      query: 'Equipment lease',
      showMore: false,
      labelFor: (type) => (type === 'lease' ? 'Lease' : type),
    })).toMatchObject({ types: ['lease'], canAddCustom: false });
    expect(filterAgreementCreateMenuTypes({
      query: 'car',
      showMore: false,
      labelFor: (type) => (type === 'lease' ? 'Lease' : type),
    })).toMatchObject({ types: ['lease'], canAddCustom: false });
    expect(filterAgreementCreateMenuTypes({
      query: 'job',
      showMore: false,
      labelFor: (type) => (type === 'employment' ? 'Employment Agreement' : type),
    })).toMatchObject({ types: ['employment'], canAddCustom: false });
    expect(agreementCreateExtraSections('pilot').map((section) => section.id)).toEqual([
      'scope',
      'responsibilities',
      'term',
      'evaluation',
    ]);
    expect(resolveEnteredParty({ query: 'Cedar River University' })).toMatchObject({
      kind: 'external_organization',
      needsClassification: false,
    });
    expect(resolveEnteredParty({ query: 'Alex Rivera' })).toMatchObject({
      kind: 'external_individual',
      needsClassification: false,
    });
    expect(resolveEnteredParty({ query: 'Acme' }).needsClassification).toBe(true);
    expect(resolveEnteredParty({ query: 'Acme', classification: 'organization' }).kind).toBe('external_organization');
    expect(resolveDirectoryPartyMatch('Civizen', [
      { profileId: 'org-1', displayName: 'Civizen', subtitle: 'civizen', civizenKind: 'organization' },
    ])).toMatchObject({ status: 'unique', party: { profileId: 'org-1' } });
    expect(resolveDirectoryPartyMatch('Alex Rivera', [
      { profileId: 'p1', displayName: 'Alex Rivera', subtitle: 'alex', civizenKind: 'individual' },
      { profileId: 'p2', displayName: 'Alex Rivera', subtitle: 'alex.r', civizenKind: 'individual' },
    ]).status).toBe('choose');
    expect(resolveDirectoryPartyMatch('Acme', []).status).toBe('none');
  });
});

describe('pilot collaboration scenario (domain)', () => {
  it('keeps version 1 historical and requires a new version after a change request', () => {
    expect(canTransitionAgreementStatus('in_review', 'draft')).toBe(true);
    expect(canTransitionAgreementStatus('proposed', 'withdrawn')).toBe(true);
    expect(canTransitionAgreementStatus('partially_signed', 'withdrawn')).toBe(true);
    expect(isEditableStatus('proposed')).toBe(false);
  });
});
