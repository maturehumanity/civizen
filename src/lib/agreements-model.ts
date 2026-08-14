/**
 * Civizen Agreements domain.
 * Identity/lifecycle live on `agreements`; content lives on versions.
 * Market listing agreements remain one type on the same records.
 */

export const AGREEMENT_STATUSES = [
  'draft',
  'in_review',
  'proposed',
  'partially_signed',
  'signed',
  'active',
  'completed',
  'terminated',
  'declined',
  'withdrawn',
  'expired',
  'pending_counterparty',
  'cancelled',
] as const;

export type AgreementStatus = (typeof AGREEMENT_STATUSES)[number];

export const COLLABORATION_STATUSES = [
  'draft',
  'in_review',
  'proposed',
  'partially_signed',
  'signed',
  'active',
  'completed',
  'terminated',
  'declined',
  'withdrawn',
  'expired',
] as const;

export type CollaborationStatus = (typeof COLLABORATION_STATUSES)[number];

export const AGREEMENT_TYPES = [
  'general',
  'mou',
  'partnership',
  'pilot',
  'program',
  'funding',
  'employment',
  'service_contribution',
  'sale_purchase',
  'lease',
  'data_research',
  'nda',
  'amendment',
  'other',
  'custom',
  'market_core',
  'market_product',
  'market_service',
] as const;

export type AgreementType = (typeof AGREEMENT_TYPES)[number];

export const MARKET_AGREEMENT_TYPES = ['market_core', 'market_product', 'market_service'] as const;
export type MarketAgreementType = (typeof MARKET_AGREEMENT_TYPES)[number];

export const PARTY_KINDS = [
  'civizen_organization',
  'civizen_individual',
  'external_organization',
  'external_individual',
] as const;

export type AgreementPartyKind = (typeof PARTY_KINDS)[number];

export const SIGNATORY_KINDS = ['required', 'optional'] as const;
export type SignatoryKind = (typeof SIGNATORY_KINDS)[number];

export const EXECUTION_METHODS = ['native_electronic', 'paper', 'external_electronic', 'other'] as const;
export type ExecutionMethod = (typeof EXECUTION_METHODS)[number];

export const RELATED_ENTITY_TYPES = [
  'program',
  'challenge',
  'opportunity',
  'project',
  'contribution',
  'market_listing',
  'agreement',
  'knowledge_space',
  'funding_budget',
  'job_interest',
  'market_order',
] as const;

export type RelatedEntityType = (typeof RELATED_ENTITY_TYPES)[number];

/** Contextual launch sources, including names that are not yet first-class tables. */
export const AGREEMENT_LAUNCH_SOURCES = [
  ...RELATED_ENTITY_TYPES,
  'partnership',
  'initiative',
  'pilot',
  'job',
  'funding',
] as const;

export type AgreementLaunchSource = (typeof AGREEMENT_LAUNCH_SOURCES)[number];

export const AGREEMENT_EVENT_TYPES = [
  'created',
  'edited',
  'version_created',
  'party_added',
  'party_removed',
  'signatory_assigned',
  'review_requested',
  'change_requested',
  'proposed',
  'version_locked',
  'signer_invited',
  'viewed_for_signing',
  'signature_completed',
  'signature_declined',
  'proposal_withdrawn',
  'signing_superseded',
  'fully_signed',
  'activated',
  'final_pdf_generated',
  'external_execution_recorded',
  'amendment_created',
  'completed',
  'terminated',
  'relationship_added',
] as const;

export type AgreementEventType = (typeof AGREEMENT_EVENT_TYPES)[number];

export const PARTICIPANT_ROLES = ['editor', 'reviewer', 'signatory', 'viewer'] as const;
export type AgreementParticipantRole = (typeof PARTICIPANT_ROLES)[number];

const STATUS_SET = new Set<string>(AGREEMENT_STATUSES);
const TYPE_SET = new Set<string>(AGREEMENT_TYPES);
const PARTY_KIND_SET = new Set<string>(PARTY_KINDS);
const RELATED_SET = new Set<string>(RELATED_ENTITY_TYPES);

export function isAgreementStatus(value: unknown): value is AgreementStatus {
  return typeof value === 'string' && STATUS_SET.has(value);
}

export function isAgreementType(value: unknown): value is AgreementType {
  return typeof value === 'string' && TYPE_SET.has(value);
}

export function isAgreementPartyKind(value: unknown): value is AgreementPartyKind {
  return typeof value === 'string' && PARTY_KIND_SET.has(value);
}

export function isRelatedEntityType(value: unknown): value is RelatedEntityType {
  return typeof value === 'string' && RELATED_SET.has(value);
}

export function isMarketAgreementType(value: string | null | undefined): boolean {
  return value === 'market_core' || value === 'market_product' || value === 'market_service';
}

export function marketTypeFromTemplateKey(templateKey: string | null | undefined): MarketAgreementType {
  if (templateKey === 'service') return 'market_service';
  if (templateKey === 'core') return 'market_core';
  return 'market_product';
}

/** Map Market's older statuses onto the collaboration vocabulary. */
export function normalizeAgreementStatus(status: string | null | undefined): CollaborationStatus | AgreementStatus {
  if (status === 'pending_counterparty') return 'partially_signed';
  if (status === 'cancelled') return 'withdrawn';
  if (isAgreementStatus(status)) return status;
  return 'draft';
}

export function isTerminalStatus(status: string): boolean {
  const normalized = normalizeAgreementStatus(status);
  return (
    normalized === 'completed'
    || normalized === 'terminated'
    || normalized === 'declined'
    || normalized === 'withdrawn'
    || normalized === 'expired'
  );
}

export function isEditableStatus(status: string): boolean {
  const normalized = normalizeAgreementStatus(status);
  return normalized === 'draft';
}

export function isSigningStatus(status: string): boolean {
  const normalized = normalizeAgreementStatus(status);
  return normalized === 'proposed' || normalized === 'partially_signed';
}

export function isExecutedStatus(status: string): boolean {
  const normalized = normalizeAgreementStatus(status);
  return (
    normalized === 'signed'
    || normalized === 'active'
    || normalized === 'completed'
    || normalized === 'terminated'
  );
}

/**
 * Valid collaboration transitions. Market listing RPCs keep their own
 * draft → pending_counterparty → signed | cancelled path.
 */
export const AGREEMENT_TRANSITIONS: Record<CollaborationStatus, readonly CollaborationStatus[]> = {
  draft: ['in_review', 'proposed', 'withdrawn'],
  in_review: ['draft', 'proposed', 'declined', 'withdrawn'],
  proposed: ['partially_signed', 'signed', 'declined', 'withdrawn', 'expired'],
  partially_signed: ['signed', 'withdrawn', 'expired'],
  signed: ['active', 'terminated'],
  active: ['completed', 'terminated'],
  completed: [],
  terminated: [],
  declined: [],
  withdrawn: ['draft'],
  expired: ['draft'],
};

export function canTransitionAgreementStatus(
  from: string,
  to: string,
): boolean {
  const source = normalizeAgreementStatus(from);
  const target = normalizeAgreementStatus(to);
  if (source === target) return true;
  if (!(source in AGREEMENT_TRANSITIONS) || !(target in AGREEMENT_TRANSITIONS)) {
    return false;
  }
  return AGREEMENT_TRANSITIONS[source as CollaborationStatus].includes(target as CollaborationStatus);
}

export function assertAgreementTransition(from: string, to: string): void {
  if (!canTransitionAgreementStatus(from, to)) {
    throw new Error(`Invalid agreement status transition: ${from} → ${to}`);
  }
}

export function shouldAutoActivate(params: {
  status: string;
  effectiveAt: string | null | undefined;
  now?: Date;
}): boolean {
  if (normalizeAgreementStatus(params.status) !== 'signed') return false;
  if (!params.effectiveAt) return true;
  const now = params.now ?? new Date();
  return new Date(params.effectiveAt).getTime() <= now.getTime();
}

export type AgreementSection = {
  id: string;
  title: string;
  body: string;
};

export type AgreementStructuredTerms = {
  purpose?: string | null;
  rolesResponsibilities?: string | null;
  term?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  renewal?: string | null;
  financialTerms?: string | null;
  confidentiality?: string | null;
  intellectualProperty?: string | null;
  dataPrivacy?: string | null;
  termination?: string | null;
  salePurchase?: SalePurchaseTerms | null;
  employment?: EmploymentTerms | null;
  lease?: LeaseTerms | null;
  customTypeName?: string | null;
  documentHeading?: string | null;
  headingOptionId?: string | null;
  partyRoles?: Record<string, string> | null;
  referenceNumber?: string | null;
};

export type SalePurchaseTerms = {
  seller?: string | null;
  buyer?: string | null;
  goodsDescription?: string | null;
  quantity?: string | null;
  unitPrice?: string | null;
  totalPrice?: string | null;
  currency?: string | null;
  paymentTerms?: string | null;
  depositOrInstallments?: string | null;
  deliveryMethod?: string | null;
  deliverySchedule?: string | null;
  deliveryLocation?: string | null;
  inspectionAcceptance?: string | null;
  warranty?: string | null;
  returnsRefunds?: string | null;
  titleTransfer?: string | null;
  riskOfLoss?: string | null;
  taxesFees?: string | null;
  attachmentsNote?: string | null;
  additionalTerms?: string | null;
};

export type LeaseTerms = {
  lessor?: string | null;
  lessee?: string | null;
  premises?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  rent?: string | null;
  rentFrequency?: string | null;
  currency?: string | null;
  deposit?: string | null;
  permittedUse?: string | null;
  maintenance?: string | null;
  insurance?: string | null;
  termination?: string | null;
};

export type EmploymentTerms = {
  employer?: string | null;
  employee?: string | null;
  position?: string | null;
  duties?: string | null;
  startAt?: string | null;
  workLocation?: string | null;
  employmentStatus?: string | null;
  compensation?: string | null;
  payFrequency?: string | null;
  schedule?: string | null;
  benefits?: string | null;
  probation?: string | null;
  expenses?: string | null;
  confidentiality?: string | null;
  intellectualProperty?: string | null;
  policies?: string | null;
  termination?: string | null;
};

export const SALE_PURCHASE_DETAIL_SECTIONS = [
  {
    id: 'products_price',
    titleKey: 'agreements.salePurchase.sectionProducts',
    fields: ['goodsDescription', 'quantity', 'unitPrice', 'totalPrice', 'currency'] as const,
  },
  {
    id: 'payment',
    titleKey: 'agreements.salePurchase.sectionPayment',
    fields: ['paymentTerms', 'depositOrInstallments'] as const,
  },
  {
    id: 'delivery',
    titleKey: 'agreements.salePurchase.sectionDelivery',
    fields: ['deliveryMethod', 'deliverySchedule', 'deliveryLocation'] as const,
  },
  {
    id: 'terms',
    titleKey: 'agreements.salePurchase.sectionTerms',
    fields: [
      'inspectionAcceptance',
      'warranty',
      'returnsRefunds',
      'titleTransfer',
      'riskOfLoss',
      'taxesFees',
      'additionalTerms',
    ] as const,
  },
] as const;

export type AgreementContent = {
  purpose?: string | null;
  structured?: AgreementStructuredTerms;
  sections: AgreementSection[];
};

export type AgreementTypeDefinition = {
  id: AgreementType;
  labelKey: string;
  starterSections: { id: string; title: string }[];
};

/** Starter outlines only — not legally approved contract language. */
export const AGREEMENT_TYPE_DEFINITIONS: AgreementTypeDefinition[] = [
  {
    id: 'general',
    labelKey: 'agreements.types.general',
    starterSections: [
      { id: 'purpose', title: 'Purpose' },
      { id: 'responsibilities', title: 'Roles and responsibilities' },
      { id: 'term', title: 'Term' },
      { id: 'other', title: 'Other terms' },
    ],
  },
  {
    id: 'mou',
    labelKey: 'agreements.types.mou',
    starterSections: [
      { id: 'purpose', title: 'Purpose' },
      { id: 'understanding', title: 'Shared understanding' },
      { id: 'responsibilities', title: 'Roles and responsibilities' },
      { id: 'term', title: 'Term' },
    ],
  },
  {
    id: 'partnership',
    labelKey: 'agreements.types.partnership',
    starterSections: [
      { id: 'purpose', title: 'Purpose' },
      { id: 'collaboration', title: 'Collaboration' },
      { id: 'responsibilities', title: 'Roles and responsibilities' },
      { id: 'term', title: 'Term' },
    ],
  },
  {
    id: 'pilot',
    labelKey: 'agreements.types.pilot',
    starterSections: [
      { id: 'purpose', title: 'Purpose of the pilot' },
      { id: 'scope', title: 'Scope' },
      { id: 'responsibilities', title: 'Roles and responsibilities' },
      { id: 'term', title: 'Term' },
      { id: 'evaluation', title: 'Evaluation' },
    ],
  },
  {
    id: 'program',
    labelKey: 'agreements.types.program',
    starterSections: [
      { id: 'purpose', title: 'Purpose' },
      { id: 'program', title: 'Program' },
      { id: 'responsibilities', title: 'Roles and responsibilities' },
      { id: 'term', title: 'Term' },
    ],
  },
  {
    id: 'funding',
    labelKey: 'agreements.types.funding',
    starterSections: [
      { id: 'purpose', title: 'Purpose' },
      { id: 'support', title: 'Support' },
      { id: 'use', title: 'Use of support' },
      { id: 'term', title: 'Term' },
    ],
  },
  {
    id: 'employment',
    labelKey: 'agreements.types.employment',
    starterSections: [
      { id: 'purpose', title: 'Employment' },
      { id: 'responsibilities', title: 'Responsibilities' },
      { id: 'compensation', title: 'Compensation' },
      { id: 'term', title: 'Term' },
    ],
  },
  {
    id: 'service_contribution',
    labelKey: 'agreements.types.service_contribution',
    starterSections: [
      { id: 'purpose', title: 'Purpose' },
      { id: 'contribution', title: 'Contribution' },
      { id: 'responsibilities', title: 'Roles and responsibilities' },
      { id: 'term', title: 'Term' },
    ],
  },
  {
    id: 'sale_purchase',
    labelKey: 'agreements.types.sale_purchase',
    starterSections: [
      { id: 'purpose', title: 'Purpose' },
      { id: 'products_price', title: 'Products & Price' },
      { id: 'payment', title: 'Payment' },
      { id: 'delivery', title: 'Delivery' },
      { id: 'terms', title: 'Terms' },
    ],
  },
  {
    id: 'lease',
    labelKey: 'agreements.types.lease',
    starterSections: [
      { id: 'purpose', title: 'Property or item' },
      { id: 'rent', title: 'Rent' },
      { id: 'term', title: 'Term' },
      { id: 'use', title: 'Use' },
    ],
  },
  {
    id: 'data_research',
    labelKey: 'agreements.types.data_research',
    starterSections: [
      { id: 'purpose', title: 'Purpose' },
      { id: 'data', title: 'Data and research' },
      { id: 'privacy', title: 'Privacy' },
      { id: 'term', title: 'Term' },
    ],
  },
  {
    id: 'nda',
    labelKey: 'agreements.types.nda',
    starterSections: [
      { id: 'purpose', title: 'Purpose' },
      { id: 'confidentiality', title: 'Confidentiality' },
      { id: 'term', title: 'Term' },
    ],
  },
  {
    id: 'amendment',
    labelKey: 'agreements.types.amendment',
    starterSections: [
      { id: 'original', title: 'Original agreement' },
      { id: 'changes', title: 'Changes' },
      { id: 'effect', title: 'Effect' },
    ],
  },
  {
    id: 'other',
    labelKey: 'agreements.types.other',
    starterSections: [
      { id: 'purpose', title: 'Purpose' },
      { id: 'terms', title: 'Terms' },
    ],
  },
  {
    id: 'custom',
    labelKey: 'agreements.types.custom',
    starterSections: [
      { id: 'purpose', title: 'Purpose / Subject' },
      { id: 'responsibilities', title: 'Responsibilities / Terms' },
      { id: 'term', title: 'Effective period' },
      { id: 'other', title: 'Additional terms' },
    ],
  },
];

const TYPE_DEFINITION_MAP = new Map(AGREEMENT_TYPE_DEFINITIONS.map((item) => [item.id, item]));

/** Shown in the default + creation menu. Unsupported names use `custom` via search. */
export const AGREEMENT_CREATE_DEFAULT_TYPES = [
  'general',
  'partnership',
  'employment',
  'service_contribution',
  'sale_purchase',
  'lease',
  'funding',
] as const;

/** Specialized types, shown after More types or when already prefilled. */
export const AGREEMENT_CREATE_MORE_TYPES = [
  'mou',
  'pilot',
  'program',
  'data_research',
  'nda',
] as const;

export function isAgreementCreateDefaultType(value: string | null | undefined): boolean {
  return Boolean(value && (AGREEMENT_CREATE_DEFAULT_TYPES as readonly string[]).includes(value));
}

export function isAgreementCreateMoreType(value: string | null | undefined): boolean {
  return Boolean(value && (AGREEMENT_CREATE_MORE_TYPES as readonly string[]).includes(value));
}

export function isCustomAgreementCreateType(value: string | null | undefined): boolean {
  return value === 'custom' || value === 'other';
}

export function normalizeAgreementCreateType(type: string | null | undefined): AgreementType {
  if (type === 'amendment' || type === 'market_core' || type === 'market_product' || type === 'market_service') {
    return 'general';
  }
  if (type === 'other') return 'custom';
  if (isAgreementType(type)) return type;
  return 'general';
}

export function visibleAgreementCreateTypes(args: {
  currentType?: string | null;
  showMore?: boolean;
}): AgreementType[] {
  const current = normalizeAgreementCreateType(args.currentType);
  const seen = new Set<AgreementType>();
  const list: AgreementType[] = [];
  for (const id of AGREEMENT_CREATE_DEFAULT_TYPES) {
    seen.add(id);
    list.push(id);
  }
  if (args.showMore) {
    for (const id of AGREEMENT_CREATE_MORE_TYPES) {
      if (seen.has(id)) continue;
      seen.add(id);
      list.push(id);
    }
  } else if (isAgreementCreateMoreType(current) && !seen.has(current)) {
    list.push(current);
  }
  return list;
}

export function compactSalePurchaseTerms(terms: SalePurchaseTerms | null | undefined): SalePurchaseTerms | undefined {
  if (!terms) return undefined;
  const compact: SalePurchaseTerms = {};
  let any = false;
  for (const [key, value] of Object.entries(terms) as Array<[keyof SalePurchaseTerms, string | null | undefined]>) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    compact[key] = trimmed;
    any = true;
  }
  return any ? compact : undefined;
}

export function compactLeaseTerms(terms: LeaseTerms | null | undefined): LeaseTerms | undefined {
  if (!terms) return undefined;
  const compact: LeaseTerms = {};
  let any = false;
  for (const [key, value] of Object.entries(terms) as Array<[keyof LeaseTerms, string | null | undefined]>) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    compact[key] = trimmed;
    any = true;
  }
  return any ? compact : undefined;
}

export function compactEmploymentTerms(terms: EmploymentTerms | null | undefined): EmploymentTerms | undefined {
  if (!terms) return undefined;
  const compact: EmploymentTerms = {};
  let any = false;
  for (const [key, value] of Object.entries(terms) as Array<[keyof EmploymentTerms, string | null | undefined]>) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    compact[key] = trimmed;
    any = true;
  }
  return any ? compact : undefined;
}

export const AGREEMENT_TYPE_SEARCH_ALIASES: Partial<Record<AgreementType, string[]>> = {
  partnership: ['partnership', 'collaboration', 'partner'],
  employment: ['employment', 'employee', 'employer', 'job', 'hiring', 'work agreement'],
  service_contribution: ['service', 'contribution', 'consulting', 'contractor', 'volunteer', 'freelance', 'independent'],
  sale_purchase: ['sale', 'purchase', 'sales', 'buy', 'sell', 'procurement', 'goods'],
  lease: ['lease', 'rent', 'rental', 'tenancy', 'landlord', 'tenant', 'lessor', 'lessee', 'hire', 'car', 'vehicle', 'auto', 'apartment', 'housing', 'office'],
  funding: ['funding', 'sponsorship', 'sponsor', 'grant'],
  mou: ['mou', 'memorandum', 'understanding'],
  pilot: ['pilot'],
  program: ['program'],
  data_research: ['data', 'research'],
  nda: ['nda', 'confidentiality', 'non-disclosure', 'nondisclosure', 'non disclosure'],
};

function typeMatchesCreateQuery(type: AgreementType, query: string, labelFor: (type: AgreementType) => string): boolean {
  const label = labelFor(type).toLowerCase();
  if (label.includes(query)) return true;
  return (AGREEMENT_TYPE_SEARCH_ALIASES[type] ?? []).some((alias) => {
    if (alias === query) return true;
    if (query.length >= 3 && alias.startsWith(query)) return true;
    if (alias.length >= 3 && query.includes(alias)) return true;
    return false;
  });
}

export function filterAgreementCreateMenuTypes(args: {
  query: string;
  showMore: boolean;
  labelFor: (type: AgreementType) => string;
}): { types: AgreementType[]; showMoreItem: boolean; canAddCustom: boolean } {
  const query = args.query.trim().toLowerCase();
  const pool: AgreementType[] = query || args.showMore
    ? [...AGREEMENT_CREATE_DEFAULT_TYPES, ...AGREEMENT_CREATE_MORE_TYPES]
    : [...AGREEMENT_CREATE_DEFAULT_TYPES];
  const seen = new Set<AgreementType>();
  const unique = pool.filter((type) => {
    if (seen.has(type)) return false;
    seen.add(type);
    return true;
  });
  if (!query) {
    return { types: unique, showMoreItem: !args.showMore, canAddCustom: false };
  }
  const types = unique.filter((type) => typeMatchesCreateQuery(type, query, args.labelFor));
  return { types, showMoreItem: false, canAddCustom: types.length === 0 && query.length >= 2 };
}

export function agreementCreateMenuLabelKey(type: AgreementType): string {
  if (type === 'sale_purchase') return 'agreements.typesShort.sale_purchase';
  if (type === 'lease') return 'agreements.typesShort.lease';
  return agreementTypeDefinition(type)?.labelKey || `agreements.types.${type}`;
}

/** Starter outline sections after Purpose — shown behind More details on create. */
export function agreementCreateExtraSections(type: AgreementType): { id: string; title: string }[] {
  return (agreementTypeDefinition(type)?.starterSections ?? []).filter((section) => section.id !== 'purpose');
}

export function applyAgreementCreateSectionBodies(
  content: AgreementContent,
  bodies: Record<string, string>,
): AgreementContent {
  return {
    ...content,
    sections: content.sections.map((section) => ({
      ...section,
      body: section.id === 'purpose'
        ? (content.purpose ?? '').trim()
        : (bodies[section.id] ?? section.body).trim(),
    })),
  };
}

const ORGANIZATION_NAME_HINT =
  /\b(university|college|institute|foundation|hospital|ministry|ltd|llc|inc|corp|gmbh|plc|organization|organisation|company|school|association|council|department|agency)\b/i;

export type PartyPersonOrOrg = 'person' | 'organization';

export type SelectedAgreementParty = {
  profileId: string;
  displayName: string;
  civizenKind: 'individual' | 'organization';
};

export type EnteredPartyResolution = {
  kind: AgreementPartyKind;
  displayName: string;
  profileId?: string;
  needsClassification: boolean;
};

function looksLikePersonName(name: string): boolean {
  const words = name.trim().split(/\s+/);
  return words.length >= 2 && /^[\p{L}][\p{L} .'-]*$/u.test(name) && !ORGANIZATION_NAME_HINT.test(name);
}

export type DirectoryPartyCandidate = {
  profileId: string;
  displayName: string;
  subtitle?: string;
  civizenKind: 'individual' | 'organization';
};

export type DirectoryPartyMatch =
  | { status: 'unique'; party: DirectoryPartyCandidate }
  | { status: 'choose'; parties: DirectoryPartyCandidate[] }
  | { status: 'none' };

function partyNameMatchesQuery(query: string, party: DirectoryPartyCandidate): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;
  return party.displayName.trim().toLowerCase() === needle
    || party.subtitle?.trim().toLowerCase() === needle;
}

/** Unique directory hit binds automatically. Similarly named hits need a choice. Missing hits may need person/org. */
export function resolveDirectoryPartyMatch(
  query: string,
  rows: DirectoryPartyCandidate[],
): DirectoryPartyMatch {
  if (query.trim().length < 2 || rows.length === 0) return { status: 'none' };
  const exact = rows.filter((row) => partyNameMatchesQuery(query, row));
  if (exact.length === 1) return { status: 'unique', party: exact[0] };
  if (exact.length > 1) return { status: 'choose', parties: exact };
  return { status: 'choose', parties: rows };
}

export function resolveEnteredParty(input: {
  query: string;
  selected?: SelectedAgreementParty | null;
  classification?: PartyPersonOrOrg | null;
}): EnteredPartyResolution {
  if (input.selected) {
    return {
      kind: input.selected.civizenKind === 'organization' ? 'civizen_organization' : 'civizen_individual',
      displayName: input.selected.displayName.trim(),
      profileId: input.selected.profileId,
      needsClassification: false,
    };
  }
  const displayName = input.query.trim();
  if (!displayName) {
    return { kind: 'external_organization', displayName: '', needsClassification: false };
  }
  if (input.classification === 'person') {
    return { kind: 'external_individual', displayName, needsClassification: false };
  }
  if (input.classification === 'organization') {
    return { kind: 'external_organization', displayName, needsClassification: false };
  }
  if (ORGANIZATION_NAME_HINT.test(displayName)) {
    return { kind: 'external_organization', displayName, needsClassification: false };
  }
  if (looksLikePersonName(displayName)) {
    return { kind: 'external_individual', displayName, needsClassification: false };
  }
  return { kind: 'external_organization', displayName, needsClassification: true };
}

export function agreementTypeDefinition(type: AgreementType): AgreementTypeDefinition | undefined {
  return TYPE_DEFINITION_MAP.get(type);
}

export function starterContentForType(type: AgreementType, purpose?: string | null): AgreementContent {
  const definition = agreementTypeDefinition(type);
  const sections = (definition?.starterSections ?? [{ id: 'purpose', title: 'Purpose' }]).map((section) => ({
    id: section.id,
    title: section.title,
    body: '',
  }));
  return {
    purpose: purpose ?? '',
    structured: {
      purpose: purpose ?? '',
      ...(type === 'sale_purchase' ? { salePurchase: {} } : {}),
      ...(type === 'employment' ? { employment: {} } : {}),
      ...(type === 'lease' ? { lease: {} } : {}),
    },
    sections,
  };
}

export function relatedEntityHref(entityType: string, entityId?: string | null): string | null {
  switch (entityType) {
    case 'opportunity':
      return entityId ? `/contribute/professional/${entityId}` : '/contribute/professional';
    case 'challenge':
      return entityId ? `/contribute/challenges/${entityId}` : '/contribute/challenges';
    case 'knowledge_space':
      return entityId ? `/contribute/knowledge/${entityId}` : '/contribute/knowledge';
    case 'agreement':
      return entityId ? `/agreements/${entityId}` : '/agreements';
    case 'market_listing':
    case 'job':
    case 'job_interest':
    case 'market_order':
      return '/market';
    case 'program':
    case 'project':
    case 'pilot':
      return '/contribute/challenges';
    case 'contribution':
      return '/profile/contributions';
    case 'funding_budget':
    case 'funding':
      return '/fund';
    case 'partnership':
      return '/partners';
    case 'initiative':
      return '/areas';
    default:
      return null;
  }
}

export function salePurchaseTermsFromLaunch(context: AgreementLaunchContext, actorName?: string | null): SalePurchaseTerms {
  return {
    seller: context.sellerName || (context.source === 'market_listing' || context.source === 'market_order' ? context.partyName : undefined) || null,
    buyer: context.buyerName || actorName || null,
    goodsDescription: context.product || context.relatedTitle || null,
    quantity: context.quantity || null,
    unitPrice: context.unitPrice || null,
    totalPrice: context.totalPrice || null,
    currency: context.currency || null,
  };
}

export type AgreementLaunchContext = {
  source?: AgreementLaunchSource | RelatedEntityType | string;
  relatedId?: string;
  relatedTitle?: string;
  agreementType?: AgreementType | string;
  customType?: string;
  partyName?: string;
  partyKind?: AgreementPartyKind | string;
  partyProfileId?: string;
  product?: string;
  quantity?: string;
  unitPrice?: string;
  totalPrice?: string;
  currency?: string;
  sellerName?: string;
  buyerName?: string;
  orderId?: string;
  position?: string;
  workLocation?: string;
  compensation?: string;
  payFrequency?: string;
  employmentStatus?: string;
  employmentSelfRole?: 'employer' | 'employee';
};

export function defaultAgreementTypeForSource(source: string | null | undefined): AgreementType {
  switch (source) {
    case 'pilot':
      return 'pilot';
    case 'program':
      return 'program';
    case 'partnership':
      return 'partnership';
    case 'opportunity':
    case 'contribution':
    case 'market_listing':
      return 'service_contribution';
    case 'job':
    case 'job_interest':
      return 'employment';
    case 'market_order':
      return 'sale_purchase';
    case 'funding':
    case 'funding_budget':
      return 'funding';
    case 'challenge':
    case 'project':
      return 'general';
    case 'knowledge_space':
      return 'data_research';
    case 'initiative':
      return 'program';
    default:
      return 'general';
  }
}

export function relatedEntityTypeForSource(source: string | null | undefined): RelatedEntityType | null {
  if (source && RELATED_SET.has(source)) return source as RelatedEntityType;
  if (source === 'job') return 'job_interest';
  if (source === 'funding') return 'funding_budget';
  if (source === 'pilot') return 'challenge';
  if (source === 'order') return 'market_order';
  return null;
}

export function agreementsCreatePath(context?: AgreementLaunchContext | null): string {
  if (!context) return '/agreements/new';
  const params = new URLSearchParams();
  if (context.source) params.set('from', context.source);
  if (context.relatedId) params.set('relatedId', context.relatedId);
  if (context.relatedTitle) params.set('relatedTitle', context.relatedTitle);
  if (context.agreementType) params.set('type', context.agreementType);
  if (context.partyName) params.set('partyName', context.partyName);
  if (context.partyKind) params.set('partyKind', context.partyKind);
  if (context.partyProfileId) params.set('partyProfileId', context.partyProfileId);
  if (context.customType) params.set('customType', context.customType);
  if (context.product) params.set('product', context.product);
  if (context.quantity) params.set('quantity', context.quantity);
  if (context.unitPrice) params.set('unitPrice', context.unitPrice);
  if (context.totalPrice) params.set('totalPrice', context.totalPrice);
  if (context.currency) params.set('currency', context.currency);
  if (context.sellerName) params.set('sellerName', context.sellerName);
  if (context.buyerName) params.set('buyerName', context.buyerName);
  if (context.orderId) params.set('orderId', context.orderId);
  if (context.position) params.set('position', context.position);
  if (context.workLocation) params.set('workLocation', context.workLocation);
  if (context.compensation) params.set('compensation', context.compensation);
  if (context.payFrequency) params.set('payFrequency', context.payFrequency);
  if (context.employmentStatus) params.set('employmentStatus', context.employmentStatus);
  if (context.employmentSelfRole) params.set('employmentSelfRole', context.employmentSelfRole);
  const query = params.toString();
  return query ? `/agreements/new?${query}` : '/agreements/new';
}

export function parseAgreementLaunchContext(search: string): AgreementLaunchContext {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  const source = params.get('from') || undefined;
  const relatedId = params.get('relatedId') || undefined;
  const relatedTitle = params.get('relatedTitle') || undefined;
  const agreementType = params.get('type') || (source ? defaultAgreementTypeForSource(source) : undefined);
  return {
    source,
    relatedId,
    relatedTitle,
    agreementType,
    partyName: params.get('partyName') || undefined,
    partyKind: params.get('partyKind') || undefined,
    partyProfileId: params.get('partyProfileId') || undefined,
    customType: params.get('customType') || undefined,
    product: params.get('product') || undefined,
    quantity: params.get('quantity') || undefined,
    unitPrice: params.get('unitPrice') || undefined,
    totalPrice: params.get('totalPrice') || undefined,
    currency: params.get('currency') || undefined,
    sellerName: params.get('sellerName') || undefined,
    buyerName: params.get('buyerName') || undefined,
    orderId: params.get('orderId') || undefined,
    position: params.get('position') || undefined,
    workLocation: params.get('workLocation') || undefined,
    compensation: params.get('compensation') || undefined,
    payFrequency: params.get('payFrequency') || undefined,
    employmentStatus: params.get('employmentStatus') || undefined,
    employmentSelfRole: params.get('employmentSelfRole') === 'employee' ? 'employee' : params.get('employmentSelfRole') === 'employer' ? 'employer' : undefined,
  };
}

export type SigningProgressParty = {
  partyId: string;
  displayName: string;
  requiredTotal: number;
  requiredSigned: number;
  optionalSigned?: number;
};

export function signingProgressLabel(parties: SigningProgressParty[]): string {
  return parties
    .map((party) => {
      const done = party.requiredTotal > 0 && party.requiredSigned >= party.requiredTotal;
      if (done) return `${party.displayName} ✓`;
      if (party.requiredSigned > 0) {
        return `${party.displayName} ${party.requiredSigned}/${party.requiredTotal}`;
      }
      return `${party.displayName} Pending`;
    })
    .join('   ');
}

export function allRequiredSignaturesComplete(parties: SigningProgressParty[]): boolean {
  return parties.length > 0 && parties.every((party) => party.requiredTotal > 0 && party.requiredSigned >= party.requiredTotal);
}

export const AGREEMENT_WORKSPACE_BUCKETS = [
  'needs_action',
  'draft',
  'in_review',
  'awaiting_signatures',
  'active',
  'completed',
] as const;

export type AgreementListBucket = (typeof AGREEMENT_WORKSPACE_BUCKETS)[number];

/** Default workspace tabs. Additional lifecycle filters stay behind All / Filter. */
export const AGREEMENT_PRIMARY_VIEWS = ['needs_action', 'active', 'all'] as const;
export type AgreementPrimaryView = (typeof AGREEMENT_PRIMARY_VIEWS)[number];

export const AGREEMENT_LIFECYCLE_FILTERS = [
  'draft',
  'in_review',
  'awaiting_signatures',
  'completed',
  'terminated',
  'closed',
] as const;
export type AgreementLifecycleFilter = (typeof AGREEMENT_LIFECYCLE_FILTERS)[number];

export function isAgreementPrimaryView(value: string | null | undefined): value is AgreementPrimaryView {
  return value === 'needs_action' || value === 'active' || value === 'all';
}

export function isAgreementLifecycleFilter(value: string | null | undefined): value is AgreementLifecycleFilter {
  return Boolean(value && (AGREEMENT_LIFECYCLE_FILTERS as readonly string[]).includes(value));
}

export function agreementMatchesLifecycleFilter(status: string, filter: AgreementLifecycleFilter): boolean {
  const normalized = normalizeAgreementStatus(status);
  switch (filter) {
    case 'draft':
      return normalized === 'draft';
    case 'in_review':
      return normalized === 'in_review';
    case 'awaiting_signatures':
      return normalized === 'proposed' || normalized === 'partially_signed';
    case 'completed':
      return normalized === 'completed';
    case 'terminated':
      return normalized === 'terminated';
    case 'closed':
      return normalized === 'declined' || normalized === 'withdrawn' || normalized === 'expired';
    default:
      return false;
  }
}

export type AgreementWorkspaceCardAction = 'sign' | 'review' | 'continue_draft' | 'open';

export function agreementWorkspaceCardAction(params: {
  status: string;
  needsAction: boolean;
}): AgreementWorkspaceCardAction {
  const status = normalizeAgreementStatus(params.status);
  if (params.needsAction) {
    if (status === 'proposed' || status === 'partially_signed') return 'sign';
    if (status === 'in_review') return 'review';
    if (status === 'draft') return 'continue_draft';
    return 'review';
  }
  return 'open';
}

export function otherPartyNames(
  parties: { displayName: string }[],
  selfNames: Array<string | null | undefined> = [],
): string[] {
  const self = new Set(
    selfNames
      .map((name) => name?.trim().toLowerCase())
      .filter((name): name is string => Boolean(name)),
  );
  const names = parties.map((party) => party.displayName.trim()).filter(Boolean);
  const others = self.size > 0 ? names.filter((name) => !self.has(name.toLowerCase())) : names;
  return others.length > 0 ? others : names;
}

export function agreementListBucket(params: {
  status: string;
  needsAction?: boolean;
}): AgreementListBucket {
  if (params.needsAction) return 'needs_action';
  const status = normalizeAgreementStatus(params.status);
  if (status === 'draft' || status === 'withdrawn') return 'draft';
  if (status === 'in_review') return 'in_review';
  if (status === 'proposed' || status === 'partially_signed') return 'awaiting_signatures';
  if (status === 'signed' || status === 'active') return 'active';
  if (status === 'completed' || status === 'terminated' || status === 'declined' || status === 'expired') {
    return 'completed';
  }
  return 'draft';
}

export function nextAgreementAction(params: {
  status: string;
  canEdit: boolean;
  canReview: boolean;
  canSign: boolean;
  needsMySignature: boolean;
  isLockedVersion: boolean;
  executed: boolean;
}): string {
  const status = normalizeAgreementStatus(params.status);
  if (params.needsMySignature) return 'sign';
  if (status === 'draft' && params.canEdit) return 'continue_draft';
  if (status === 'in_review' && params.canReview) return 'review';
  if (status === 'proposed' || status === 'partially_signed') return 'await_signatures';
  if (status === 'signed') return 'await_activation';
  if (status === 'active' && params.canEdit) return 'manage_active';
  if (params.executed) return 'view_executed';
  return 'view';
}

export function formatAgreementReference(year: number, sequence: number): string {
  return `AGR-${year}-${String(sequence).padStart(4, '0')}`;
}

export function agreementNumberFromReference(code: string | null | undefined): string {
  const match = /^AGR-\d{4}-0*(\d+)$/i.exec((code || '').trim());
  if (match) return match[1];
  const digits = (code || '').trim();
  return digits || '1';
}

export function agreementReferenceFromNumber(
  number: string,
  year = new Date().getUTCFullYear(),
): string {
  const trimmed = number.trim();
  if (/^AGR-\d{4}-\d+$/i.test(trimmed)) return trimmed.toUpperCase();
  const sequence = Number.parseInt(trimmed.replace(/\D/g, ''), 10);
  if (Number.isFinite(sequence) && sequence > 0) return formatAgreementReference(year, sequence);
  return trimmed;
}

export function emptyStructuredTerms(): AgreementStructuredTerms {
  return {
    purpose: '',
    rolesResponsibilities: '',
    term: '',
    startAt: null,
    endAt: null,
    renewal: '',
    financialTerms: '',
    confidentiality: '',
    intellectualProperty: '',
    dataPrivacy: '',
    termination: '',
  };
}
