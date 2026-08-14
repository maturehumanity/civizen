/**
 * Purpose-built Agreement document templates.
 * Visible copy is type-specific; structured fields stay mapped underneath.
 * Template language is a working draft — not legal advice.
 */

import {
  addCalendarYears,
  compactEmploymentTerms,
  compactLeaseTerms,
  compactSalePurchaseTerms,
  formatAgreementDate,
  isContributionLaunchSource,
  isCustomAgreementCreateType,
  localIsoDate,
  partyNameLooksLikeOrganization,
  suggestedPartyReference,
  type AgreementContent,
  type AgreementLaunchContext,
  type AgreementPartyKind,
  type AgreementType,
  type EmploymentTerms,
  type LeaseTerms,
  type PartyPersonOrOrg,
  type SalePurchaseTerms,
  type SelectedAgreementParty,
} from '@/lib/agreements-model';
import { agreementHtmlToPlainText } from '@/lib/agreements-html';

export type AgreementTokenKind = 'text' | 'date' | 'multiline' | 'party';

export type AgreementTemplateToken = {
  id: string;
  kind: AgreementTokenKind;
  placeholder: string;
  ariaLabel?: string;
  partyRole?: string;
};

export type AgreementTemplateRun = string | AgreementTemplateToken;

export type AgreementTemplateParagraph = {
  id: string;
  runs: AgreementTemplateRun[];
};

export type AgreementTemplateSection = {
  id: string;
  title?: string;
  paragraphs: AgreementTemplateParagraph[];
  optional?: boolean;
  addLabelKey?: string;
};

export type AgreementChoiceOption = {
  id: string;
  label: string;
};

export type AgreementEndConditionId =
  | 'specific_date'
  | 'until_completed'
  | 'ongoing'
  | 'until_terminated';

export const AGREEMENT_END_CONDITIONS_ALL: AgreementEndConditionId[] = [
  'specific_date',
  'until_completed',
  'ongoing',
  'until_terminated',
];

export type AgreementDocumentTemplate = {
  type: AgreementType;
  documentHeading: string;
  headingOptions: AgreementChoiceOption[];
  defaultHeadingId: string;
  defaultRoles: Record<string, string>;
  rolesByHeading?: Record<string, Record<string, string>>;
  rolePairs?: Array<readonly [string, string]>;
  roleOptions: Record<string, string[]>;
  endConditions?: AgreementEndConditionId[];
  essential: AgreementTemplateSection[];
  optional: AgreementTemplateSection[];
  allowCustomSections?: boolean;
};

export type AgreementRequiredGap = {
  tokenId: string;
  messageKey: string;
};

export type PartySlotState = {
  query: string;
  selected: SelectedAgreementParty | null;
  classification: PartyPersonOrOrg | null;
};

export type AgreementDocumentState = {
  values: Record<string, string>;
  parties: Record<string, PartySlotState>;
  visibleOptional: string[];
  extraSections: { id: string; title: string; body: string }[];
  partyReference: string;
  partyReferenceManual: boolean;
  partyReferenceAuto: string;
  documentHeading: string;
  headingOptionId: string;
  partyRoles: Record<string, string>;
  paragraphWording: Record<string, string>;
  sectionTitles: Record<string, string>;
};

export type CompiledAgreementParty = {
  kind: AgreementPartyKind | string;
  displayName: string;
  profileId?: string;
  role: string;
  signatoryProfileId?: string;
};

const PARTY_ROLE_LABELS: Record<string, string> = {
  employer: 'Employer',
  employee: 'Employee',
  seller: 'Seller',
  buyer: 'Buyer',
  lessor: 'Landlord',
  lessee: 'Tenant',
  party_a: 'Party',
  party_b: 'Party',
  disclosing: 'Disclosing party',
  receiving: 'Receiving party',
  funder: 'Funder',
  recipient: 'Recipient',
};

const PARTY_PLACEHOLDERS: Record<string, { placeholder: string; ariaLabel: string }> = {
  employer: { placeholder: 'Select or enter employer', ariaLabel: 'Select or enter employer' },
  employee: { placeholder: 'Select or enter employee', ariaLabel: 'Select or enter employee' },
  seller: { placeholder: 'Select or enter seller', ariaLabel: 'Select or enter seller' },
  buyer: { placeholder: 'Select or enter buyer', ariaLabel: 'Select or enter buyer' },
  lessor: { placeholder: 'Select or enter landlord', ariaLabel: 'Select or enter landlord' },
  lessee: { placeholder: 'Select or enter tenant', ariaLabel: 'Select or enter tenant' },
  party_a: { placeholder: 'Select or enter party', ariaLabel: 'Select or enter party' },
  party_b: { placeholder: 'Select or enter party', ariaLabel: 'Select or enter party' },
  funder: { placeholder: 'Select or enter funder', ariaLabel: 'Select or enter funder' },
  recipient: { placeholder: 'Select or enter recipient', ariaLabel: 'Select or enter recipient' },
  disclosing: { placeholder: 'Select or enter disclosing party', ariaLabel: 'Select or enter disclosing party' },
  receiving: { placeholder: 'Select or enter receiving party', ariaLabel: 'Select or enter receiving party' },
};

const GENERIC_ROLES = { party_a: 'Party', party_b: 'Party' };
const GENERIC_ROLE_OPTIONS = {
  party_a: ['Party', 'Client', 'Partner', 'Collaborator', 'Principal'],
  party_b: ['Party', 'Service Provider', 'Partner', 'Collaborator', 'Contributor'],
};

function complementRole(pairs: Array<readonly [string, string]> | undefined, label: string) {
  const pair = pairs?.find((item) => item[0] === label || item[1] === label);
  if (!pair) return undefined;
  return pair[0] === label ? pair[1] : pair[0];
}

function counterpartPartyId(roles: Record<string, string>, partyId: string) {
  const ids = Object.keys(roles);
  if (ids.length !== 2) return undefined;
  return ids.find((id) => id !== partyId);
}

export function applyPartyRole(
  template: AgreementDocumentTemplate,
  state: AgreementDocumentState,
  partyId: string,
  label: string,
): AgreementDocumentState {
  const partyRoles = { ...state.partyRoles, [partyId]: label };
  const otherId = counterpartPartyId(template.defaultRoles, partyId);
  const complement = complementRole(template.rolePairs, label);
  if (otherId && complement) {
    const previous = state.partyRoles[partyId];
    const otherCurrent = state.partyRoles[otherId];
    const previousComplement = complementRole(template.rolePairs, previous);
    if (otherCurrent === label || otherCurrent === previousComplement) {
      partyRoles[otherId] = complement;
    }
  }
  return { ...state, partyRoles };
}

const ISSUER_ROLE_LABELS = new Set([
  'Organization / Project',
  'Service Provider',
  'Contributor',
  'Employer',
  'Seller',
  'Landlord',
  'Lessor',
  'Funder',
  'Disclosing party',
  'Contractor',
  'Consultant',
]);

function partySlotKind(slot: PartySlotState): PartyPersonOrOrg | null {
  if (slot.classification) return slot.classification;
  if (slot.selected?.civizenKind === 'organization') return 'organization';
  if (slot.selected?.civizenKind === 'individual') return 'person';
  return null;
}

function partySlotName(slot: PartySlotState): string {
  return slot.selected?.displayName || slot.query.trim();
}

export function issuerPartySlotId(state: AgreementDocumentState): string | undefined {
  const byRole = Object.entries(state.partyRoles).find(([, role]) => ISSUER_ROLE_LABELS.has(role));
  if (byRole) return byRole[0];
  const organization = Object.entries(state.parties).find(([, slot]) => {
    const name = partySlotName(slot);
    if (!name) return false;
    return partyNameLooksLikeOrganization(name, partySlotKind(slot));
  });
  return organization?.[0];
}

export function suggestedPartyReferenceFromDocument(state: AgreementDocumentState): string {
  const id = issuerPartySlotId(state);
  if (!id) return '';
  const slot = state.parties[id];
  if (!slot) return '';
  const name = partySlotName(slot);
  if (!name) return '';
  return suggestedPartyReference(name, partySlotKind(slot));
}

export function syncPartyReference(state: AgreementDocumentState): AgreementDocumentState {
  if (state.partyReferenceManual) return state;
  const suggestion = suggestedPartyReferenceFromDocument(state);
  if (state.partyReference === suggestion && state.partyReferenceAuto === suggestion) return state;
  return { ...state, partyReference: suggestion, partyReferenceAuto: suggestion };
}

function headingMeta(options: AgreementChoiceOption[], defaultRoles: Record<string, string>, roleOptions: Record<string, string[]>, extra?: {
  rolesByHeading?: Record<string, Record<string, string>>;
  rolePairs?: Array<readonly [string, string]>;
  endConditions?: AgreementEndConditionId[];
}) {
  const defaultHeadingId = options[0]?.id || 'custom';
  return {
    documentHeading: options[0]?.label || 'Agreement',
    headingOptions: options,
    defaultHeadingId,
    defaultRoles,
    roleOptions,
    ...extra,
  };
}

function partyRoleLabel(state: AgreementDocumentState, partyId: string, fallback = 'Party') {
  return state.partyRoles[partyId] || fallback;
}

export function applyDocumentHeading(
  template: AgreementDocumentTemplate,
  state: AgreementDocumentState,
  label: string,
  optionId?: string,
): AgreementDocumentState {
  const headingOptionId = optionId || template.headingOptions.find((item) => item.label === label)?.id || 'custom';
  const previousDefaults = template.rolesByHeading?.[state.headingOptionId] || template.defaultRoles;
  const nextDefaults = template.rolesByHeading?.[headingOptionId];
  const partyRoles = { ...state.partyRoles };
  if (nextDefaults) {
    for (const [id, role] of Object.entries(nextDefaults)) {
      if (!partyRoles[id] || partyRoles[id] === previousDefaults[id]) {
        partyRoles[id] = role;
      }
    }
  }
  return {
    ...state,
    documentHeading: label.trim() || template.documentHeading,
    headingOptionId,
    partyRoles,
  };
}

function token(id: string, placeholder: string, kind: AgreementTokenKind = 'text', ariaLabel?: string): AgreementTemplateToken {
  return { id, kind, placeholder, ariaLabel };
}

function party(id: string): AgreementTemplateToken {
  const named = PARTY_PLACEHOLDERS[id] || { placeholder: 'Select or enter party', ariaLabel: 'Select or enter party' };
  return { id, kind: 'party', placeholder: named.placeholder, ariaLabel: named.ariaLabel, partyRole: id };
}

function termRuns(lead: string): AgreementTemplateRun[] {
  return [
    lead,
    token('startAt', 'Select start date', 'date', 'Select start date'),
    token('endAt', 'Select end date', 'date', 'Select end date'),
    '.',
  ];
}

function paragraph(id: string, runs: AgreementTemplateRun[]): AgreementTemplateParagraph {
  return { id, runs };
}

function section(
  id: string,
  title: string | undefined,
  paragraphs: AgreementTemplateParagraph[],
  extra?: { optional?: boolean; addLabelKey?: string },
): AgreementTemplateSection {
  return { id, title, paragraphs, ...extra };
}

const COMMON_OPTIONAL: AgreementTemplateSection[] = [
  section('confidentiality', 'Confidentiality', [
    paragraph('confidentiality', [
      'The parties will treat confidential information as described here: ',
      token('confidentiality', 'Confidentiality terms', 'multiline'),
      '.',
    ]),
  ], { optional: true, addLabelKey: 'agreements.add.confidentiality' }),
  section('intellectual_property', 'Intellectual property', [
    paragraph('ip', [
      'Intellectual property is addressed as follows: ',
      token('intellectualProperty', 'Intellectual property terms', 'multiline'),
      '.',
    ]),
  ], { optional: true, addLabelKey: 'agreements.add.intellectualProperty' }),
  section('data_privacy', 'Data / privacy', [
    paragraph('privacy', [
      'Data and privacy terms: ',
      token('dataPrivacy', 'Data or privacy terms', 'multiline'),
      '.',
    ]),
  ], { optional: true, addLabelKey: 'agreements.add.dataPrivacy' }),
  section('termination', 'Termination', [
    paragraph('termination', [
      'This agreement may end as follows: ',
      token('termination', 'Termination terms', 'multiline'),
      '.',
    ]),
  ], { optional: true, addLabelKey: 'agreements.add.termination' }),
];

const OPENING = 'This agreement is entered into between ';

function employmentTemplate(): AgreementDocumentTemplate {
  return {
    type: 'employment',
    ...headingMeta(
      [{ id: 'employment', label: 'Employment' }],
      { employer: 'Employer', employee: 'Employee' },
      {
        employer: ['Employer', 'Employee', 'Company', 'Organization'],
        employee: ['Employee', 'Employer', 'Worker', 'Staff member'],
      },
      { rolePairs: [['Employer', 'Employee']] },
    ),
    essential: [
      section('opening', undefined, [
        paragraph('parties', [
          OPENING,
          party('employer'),
          ' and ',
          party('employee'),
          ' for the position of ',
          token('position', 'Enter the position', 'text', 'Enter the position'),
          '.',
        ]),
        paragraph('role', [
          'The Employee will perform the responsibilities described below.',
        ]),
        paragraph('start_location', [
          'The employment starts on ',
          token('startAt', 'Select start date', 'date', 'Select start date'),
          '. Work will take place ',
          token('workLocation', 'Enter the work location', 'text', 'Enter the work location'),
          '.',
        ]),
      ]),
      section('responsibilities', 'Responsibilities', [
        paragraph('duties', [
          token('duties', 'Describe the duties and responsibilities', 'multiline'),
        ]),
      ]),
      section('term', undefined, [
        paragraph('term', [
          'This agreement remains in effect until ended according to its terms.',
        ]),
      ]),
    ],
    optional: [
      section('compensation', 'Compensation', [
        paragraph('pay', [
          'The Employee will receive ',
          token('compensation', 'Compensation'),
          ', payable ',
          token('payFrequency', 'Payment frequency'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.compensation' }),
      section('benefits', 'Benefits', [
        paragraph('benefits', [
          'Benefits, where applicable: ',
          token('benefits', 'Benefits', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.benefits' }),
      section('confidentiality', 'Confidentiality', [
        paragraph('confidentiality', [
          'Confidential information will be handled as follows: ',
          token('confidentiality', 'Confidentiality terms', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.confidentiality' }),
      section('intellectual_property', 'Intellectual property', [
        paragraph('ip', [
          'Intellectual property created in the course of employment is addressed as follows: ',
          token('intellectualProperty', 'Intellectual property terms', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.intellectualProperty' }),
      section('additional_employment', 'Additional employment terms', [
        paragraph('status', [
          'Employment status or type: ',
          token('employmentStatus', 'Employment status or type'),
          '.',
        ]),
        paragraph('schedule', [
          'Working schedule: ',
          token('schedule', 'Working schedule'),
          '.',
        ]),
        paragraph('probation', [
          'Probationary period: ',
          token('probation', 'Probationary period'),
          '.',
        ]),
        paragraph('expenses', [
          'Expenses: ',
          token('expenses', 'Expense terms'),
          '.',
        ]),
        paragraph('policies', [
          'Policies or referenced documents: ',
          token('policies', 'Policies or referenced documents', 'multiline'),
          '.',
        ]),
        paragraph('termination', [
          'Termination terms: ',
          token('termination', 'Termination terms', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.additionalEmployment' }),
    ],
  };
}

function salePurchaseTemplate(): AgreementDocumentTemplate {
  return {
    type: 'sale_purchase',
    ...headingMeta(
      [
        { id: 'sale_purchase', label: 'Sale / Purchase' },
        { id: 'sale', label: 'Sale' },
        { id: 'purchase', label: 'Purchase' },
      ],
      { seller: 'Seller', buyer: 'Buyer' },
      {
        seller: ['Seller', 'Buyer', 'Vendor', 'Provider'],
        buyer: ['Buyer', 'Seller', 'Purchaser', 'Customer'],
      },
      { rolePairs: [['Seller', 'Buyer']] },
    ),
    essential: [
      section('opening', undefined, [
        paragraph('parties', [
          OPENING,
          party('seller'),
          ' and ',
          party('buyer'),
          '.',
        ]),
        paragraph('goods', [
          'The Seller agrees to sell, and the Buyer agrees to purchase, ',
          token('goods', 'Describe the goods', 'text', 'Describe the goods'),
          '.',
        ]),
        paragraph('price', [
          'Quantity: ',
          token('quantity', 'Quantity'),
          '. Price: ',
          token('price', 'Price'),
          '. Currency: ',
          token('currency', 'Currency'),
          '.',
        ]),
      ]),
    ],
    optional: [
      section('payment', 'Payment', [
        paragraph('payment', [
          'Payment terms: ',
          token('paymentTerms', 'Payment terms', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.payment' }),
      section('delivery', 'Delivery', [
        paragraph('delivery', [
          'Delivery: ',
          token('deliverySchedule', 'Delivery date or schedule'),
          ' by ',
          token('deliveryMethod', 'Delivery method'),
          ' to ',
          token('deliveryLocation', 'Delivery location'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.delivery' }),
      section('acceptance', 'Acceptance', [
        paragraph('acceptance', [
          'Inspection and acceptance: ',
          token('inspectionAcceptance', 'Inspection and acceptance terms', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.acceptance' }),
      section('warranty', 'Warranty', [
        paragraph('warranty', [
          'Warranty: ',
          token('warranty', 'Warranty terms', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.warranty' }),
      section('returns', 'Returns / refunds', [
        paragraph('returns', [
          'Returns and refunds: ',
          token('returnsRefunds', 'Returns and refunds', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.returns' }),
      section('title_risk', 'Title and risk', [
        paragraph('title', [
          'Title transfers: ',
          token('titleTransfer', 'Title transfer terms'),
          '. Risk of loss: ',
          token('riskOfLoss', 'Risk of loss terms'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.titleRisk' }),
      section('additional_commercial', 'Additional commercial terms', [
        paragraph('extra', [
          token('additionalTerms', 'Additional commercial terms', 'multiline'),
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.additionalTerms' }),
    ],
  };
}

function leaseTemplate(): AgreementDocumentTemplate {
  return {
    type: 'lease',
    ...headingMeta(
      [
        { id: 'lease', label: 'Lease' },
        { id: 'residential', label: 'Residential lease' },
        { id: 'commercial', label: 'Commercial lease' },
        { id: 'car', label: 'Car lease' },
        { id: 'vehicle', label: 'Vehicle lease' },
        { id: 'equipment', label: 'Equipment lease' },
        { id: 'office', label: 'Office lease' },
        { id: 'rental', label: 'Property rental' },
      ],
      { lessor: 'Landlord', lessee: 'Tenant' },
      {
        lessor: ['Landlord', 'Tenant', 'Lessor', 'Lessee', 'Owner', 'Property owner'],
        lessee: ['Tenant', 'Landlord', 'Lessee', 'Lessor', 'Renter', 'Occupant'],
      },
      {
        rolePairs: [
          ['Landlord', 'Tenant'],
          ['Lessor', 'Lessee'],
        ],
        rolesByHeading: {
          lease: { lessor: 'Landlord', lessee: 'Tenant' },
          residential: { lessor: 'Landlord', lessee: 'Tenant' },
          rental: { lessor: 'Landlord', lessee: 'Tenant' },
          commercial: { lessor: 'Landlord', lessee: 'Tenant' },
          office: { lessor: 'Landlord', lessee: 'Tenant' },
          car: { lessor: 'Lessor', lessee: 'Lessee' },
          vehicle: { lessor: 'Lessor', lessee: 'Lessee' },
          equipment: { lessor: 'Lessor', lessee: 'Lessee' },
        },
        endConditions: ['specific_date', 'until_terminated', 'ongoing'],
      },
    ),
    essential: [
      section('opening', undefined, [
        paragraph('parties', [
          OPENING,
          party('lessor'),
          ' and ',
          party('lessee'),
          '.',
        ]),
        paragraph('premises', [
          'This lease covers ',
          token('premises', 'Describe the property or item', 'text', 'Describe the property or item'),
          '.',
        ]),
        paragraph('term', termRuns('The lease starts on ')),
        paragraph('rent', [
          'Rent is ',
          token('rent', 'amount'),
          ', payable ',
          token('rentFrequency', 'frequency'),
          '. Currency: ',
          token('currency', 'Currency'),
          '.',
        ]),
      ]),
    ],
    optional: [
      section('deposit', 'Deposit', [
        paragraph('deposit', [
          'A deposit of ',
          token('deposit', 'deposit amount'),
          ' will be held as described here: ',
          token('depositTerms', 'Deposit terms', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.deposit' }),
      section('use', 'Use', [
        paragraph('use', [
          'Permitted use: ',
          token('permittedUse', 'Permitted use', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.use' }),
      section('maintenance', 'Maintenance', [
        paragraph('maintenance', [
          'Maintenance and repairs: ',
          token('maintenance', 'Maintenance terms', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.maintenance' }),
      section('insurance', 'Insurance', [
        paragraph('insurance', [
          'Insurance: ',
          token('insurance', 'Insurance terms', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.insurance' }),
      ...COMMON_OPTIONAL,
    ],
  };
}

function serviceContributionTemplate(): AgreementDocumentTemplate {
  return {
    type: 'service_contribution',
    ...headingMeta(
      [
        { id: 'service', label: 'Service Provision' },
        { id: 'contribution', label: 'Contribution' },
      ],
      { party_a: 'Client', party_b: 'Service Provider' },
      {
        party_a: ['Client', 'Service Provider', 'Organization / Project', 'Contributor', 'Recipient', 'Customer', 'Contractor', 'Principal', 'Consultant', 'Partner', 'Volunteer'],
        party_b: ['Service Provider', 'Client', 'Contributor', 'Organization / Project', 'Recipient', 'Contractor', 'Consultant', 'Volunteer', 'Customer', 'Principal', 'Partner'],
      },
      {
        rolePairs: [
          ['Client', 'Service Provider'],
          ['Organization / Project', 'Contributor'],
          ['Recipient', 'Contributor'],
          ['Customer', 'Contractor'],
          ['Principal', 'Consultant'],
        ],
        rolesByHeading: {
          service: { party_a: 'Client', party_b: 'Service Provider' },
          contribution: { party_a: 'Organization / Project', party_b: 'Contributor' },
        },
        endConditions: AGREEMENT_END_CONDITIONS_ALL,
      },
    ),
    essential: [
      section('opening', undefined, [
        paragraph('parties', [
          OPENING,
          party('party_a'),
          ' and ',
          party('party_b'),
          '.',
        ]),
        paragraph('not_employment', [
          'This agreement covers independent services, contribution, or project work. It does not establish employment.',
        ]),
        paragraph('scope', [
          'The service or contribution is: ',
          token('purpose', 'Describe the service or contribution', 'multiline'),
          '.',
        ]),
      ]),
      section('responsibilities', 'Responsibilities', [
        paragraph('responsibilities', [
          token('responsibilities', 'Describe responsibilities and terms', 'multiline'),
        ]),
      ]),
      section('term', undefined, [
        paragraph('term', termRuns('This agreement is effective from ')),
      ]),
    ],
    optional: [
      section('payment', 'Payment', [
        paragraph('payment', [
          'Payment or support terms: ',
          token('financialTerms', 'Payment terms', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.payment' }),
      ...COMMON_OPTIONAL.filter((item) => item.id !== 'data_privacy'),
    ],
  };
}

function partnershipTemplate(): AgreementDocumentTemplate {
  return {
    type: 'partnership',
    ...headingMeta(
      [
        { id: 'partnership', label: 'Partnership / Collaboration' },
        { id: 'partnership_only', label: 'Partnership' },
        { id: 'collaboration', label: 'Collaboration' },
      ],
      { party_a: 'Partner', party_b: 'Partner' },
      {
        party_a: ['Partner', 'Collaborator', 'Party', 'Client'],
        party_b: ['Partner', 'Collaborator', 'Party', 'Contributor'],
      },
    ),
    essential: [
      section('opening', undefined, [
        paragraph('parties', [
          OPENING,
          party('party_a'),
          ' and ',
          party('party_b'),
          '.',
        ]),
        paragraph('purpose', [
          'The parties agree to collaborate on: ',
          token('purpose', 'Describe the collaboration', 'multiline'),
          '.',
        ]),
      ]),
      section('responsibilities', 'Responsibilities', [
        paragraph('responsibilities', [
          token('responsibilities', 'Describe how the parties will work together', 'multiline'),
        ]),
      ]),
    ],
    optional: [
      section('governance', 'Coordination', [
        paragraph('governance', [
          'Coordination and decision-making: ',
          token('governance', 'How the parties will coordinate', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.coordination' }),
      ...COMMON_OPTIONAL,
    ],
  };
}

function generalLike(
  type: AgreementType,
  heading: string,
  _openingLead: string,
  purposePlaceholder: string,
  extraEssential: AgreementTemplateParagraph[] = [],
  optional: AgreementTemplateSection[] = COMMON_OPTIONAL,
): AgreementDocumentTemplate {
  return {
    type,
    ...headingMeta(
      [{ id: type, label: heading.replace(/\s+Agreement$/, '') || heading }],
      GENERIC_ROLES,
      GENERIC_ROLE_OPTIONS,
      { endConditions: AGREEMENT_END_CONDITIONS_ALL },
    ),
    essential: [
      section('opening', undefined, [
        paragraph('parties', [
          OPENING,
          party('party_a'),
          ' and ',
          party('party_b'),
          '.',
        ]),
        paragraph('purpose', [
          token('purpose', purposePlaceholder, 'multiline'),
        ]),
        ...extraEssential,
      ]),
      section('responsibilities', 'Responsibilities / Terms', [
        paragraph('responsibilities', [
          token('responsibilities', 'Describe responsibilities and terms', 'multiline'),
        ]),
      ]),
      section('term', 'Effective period', [
        paragraph('term', termRuns('This agreement is effective from ')),
      ]),
    ],
    optional,
    allowCustomSections: type === 'custom' || type === 'general',
  };
}

const TEMPLATES: Partial<Record<AgreementType, AgreementDocumentTemplate>> = {
  employment: employmentTemplate(),
  sale_purchase: salePurchaseTemplate(),
  lease: leaseTemplate(),
  service_contribution: serviceContributionTemplate(),
  partnership: partnershipTemplate(),
  general: generalLike(
    'general',
    'General Agreement',
    'This Agreement is entered into between ',
    'Describe the purpose of this agreement',
  ),
  funding: {
    type: 'funding',
    ...headingMeta(
      [
        { id: 'funding', label: 'Funding / Sponsorship' },
        { id: 'funding_only', label: 'Funding' },
        { id: 'sponsorship', label: 'Sponsorship' },
      ],
      { funder: 'Funder', recipient: 'Recipient' },
      {
        funder: ['Funder', 'Sponsor', 'Donor'],
        recipient: ['Recipient', 'Grantee', 'Beneficiary'],
      },
      { endConditions: ['specific_date', 'until_completed', 'until_terminated'] },
    ),
    essential: [
      section('opening', undefined, [
        paragraph('parties', [
          OPENING,
          party('funder'),
          ' and ',
          party('recipient'),
          '.',
        ]),
        paragraph('purpose', [
          'The support is for: ',
          token('purpose', 'Describe the funding or sponsorship', 'multiline'),
          '.',
        ]),
      ]),
      section('support', 'Support', [
        paragraph('support', [
          token('financialTerms', 'Describe the support being provided', 'multiline'),
        ]),
      ]),
      section('term', 'Effective period', [
        paragraph('term', termRuns('This agreement is effective from ')),
      ]),
    ],
    optional: COMMON_OPTIONAL,
  },
  mou: generalLike(
    'mou',
    'Memorandum of Understanding',
    'This Memorandum of Understanding is entered into between ',
    'Describe the shared understanding',
  ),
  pilot: {
    type: 'pilot',
    ...headingMeta(
      [
        { id: 'pilot', label: 'Pilot / Collaboration' },
        { id: 'pilot_only', label: 'Pilot' },
      ],
      GENERIC_ROLES,
      GENERIC_ROLE_OPTIONS,
    ),
    essential: [
      section('opening', undefined, [
        paragraph('parties', [
          OPENING,
          party('party_a'),
          ' and ',
          party('party_b'),
          '.',
        ]),
        paragraph('purpose', [
          'This pilot concerns: ',
          token('purpose', 'Describe the purpose of the pilot', 'multiline'),
          '.',
        ]),
        paragraph('scope', [
          'Scope: ',
          token('responsibilities', 'Describe the scope of the pilot', 'multiline'),
          '.',
        ]),
      ]),
    ],
    optional: [
      section('evaluation', 'Evaluation', [
        paragraph('evaluation', [
          'The pilot will be evaluated as follows: ',
          token('evaluation', 'How the pilot will be evaluated', 'multiline'),
          '.',
        ]),
      ], { optional: true, addLabelKey: 'agreements.add.evaluation' }),
      ...COMMON_OPTIONAL,
    ],
  },
  program: generalLike(
    'program',
    'Program Agreement',
    'This Program Agreement is entered into between ',
    'Describe the purpose of the program',
  ),
  data_research: generalLike(
    'data_research',
    'Data / Research Agreement',
    'This Data / Research Agreement is entered into between ',
    'Describe the data or research this agreement covers',
    [],
    COMMON_OPTIONAL,
  ),
  nda: {
    type: 'nda',
    ...headingMeta(
      [
        { id: 'nda', label: 'Confidentiality / NDA' },
        { id: 'confidentiality', label: 'Confidentiality' },
        { id: 'nda_only', label: 'NDA' },
      ],
      { disclosing: 'Disclosing party', receiving: 'Receiving party' },
      {
        disclosing: ['Disclosing party', 'Provider', 'Client'],
        receiving: ['Receiving party', 'Recipient', 'Contractor'],
      },
      { endConditions: ['specific_date', 'until_terminated', 'ongoing'] },
    ),
    essential: [
      section('opening', undefined, [
        paragraph('parties', [
          OPENING,
          party('disclosing'),
          ' and ',
          party('receiving'),
          '.',
        ]),
        paragraph('purpose', [
          'The confidential information is: ',
          token('purpose', 'Describe the information that needs protecting', 'multiline'),
          '.',
        ]),
      ]),
      section('confidentiality', 'Confidentiality', [
        paragraph('confidentiality', [
          token('confidentiality', 'Describe the confidentiality terms', 'multiline'),
        ]),
      ]),
      section('term', 'Effective period', [
        paragraph('term', termRuns('These confidentiality obligations are effective from ')),
      ]),
    ],
    optional: COMMON_OPTIONAL.filter((item) => item.id !== 'confidentiality'),
  },
  custom: generalLike(
    'custom',
    'Agreement',
    'This agreement is entered into between ',
    'Describe the purpose or subject',
  ),
  other: generalLike(
    'other',
    'Agreement',
    'This agreement is entered into between ',
    'Describe the purpose or subject',
  ),
};

export function agreementDocumentTemplate(
  type: AgreementType,
  customTypeName?: string | null,
): AgreementDocumentTemplate {
  const base = TEMPLATES[isCustomAgreementCreateType(type) ? 'custom' : type] || TEMPLATES.general!;
  if (isCustomAgreementCreateType(type) && customTypeName?.trim()) {
    const name = customTypeName.trim();
    return {
      ...base,
      documentHeading: name,
      headingOptions: [{ id: 'custom', label: name }, ...base.headingOptions.filter((item) => item.label !== name)],
      defaultHeadingId: 'custom',
      allowCustomSections: true,
    };
  }
  return base;
}

function emptyParty(): PartySlotState {
  return { query: '', selected: null, classification: null };
}

function partyFromKnown(args: {
  name?: string | null;
  profileId?: string | null;
  kind?: string | null;
}): PartySlotState {
  const name = args.name?.trim() || '';
  if (!name) return emptyParty();
  const civizenKind = args.kind === 'civizen_organization' || args.kind === 'external_organization'
    ? 'organization'
    : args.kind === 'civizen_individual' || args.kind === 'external_individual'
      ? 'individual'
      : null;
  return {
    query: name,
    selected: args.profileId && civizenKind
      ? { profileId: args.profileId, displayName: name, civizenKind }
      : null,
    classification: civizenKind === 'organization' ? 'organization' : civizenKind === 'individual' ? 'person' : null,
  };
}

function genericRelatedTitle(title?: string | null): boolean {
  const value = title?.trim().toLowerCase() || '';
  return !value || value === 'jobs' || value === 'job';
}

function essentialTemplateTokens(template: AgreementDocumentTemplate): AgreementTemplateToken[] {
  return template.essential.flatMap((section) => (
    section.paragraphs.flatMap((paragraphItem) => (
      paragraphItem.runs.filter((run): run is AgreementTemplateToken => typeof run !== 'string')
    ))
  ));
}

function templateHasToken(template: AgreementDocumentTemplate, id: string): boolean {
  return essentialTemplateTokens(template).some((item) => item.id === id)
    || template.optional.some((section) => section.paragraphs.some((paragraphItem) => (
      paragraphItem.runs.some((run) => typeof run !== 'string' && run.id === id)
    )));
}

export function agreementEndIsSpecific(state: AgreementDocumentState): boolean {
  const open = state.values.endOpen?.trim();
  return !open || open === 'specific_date';
}

export function agreementEndCondition(state: AgreementDocumentState): AgreementEndConditionId {
  const open = state.values.endOpen?.trim();
  if (open === 'until_completed' || open === 'ongoing' || open === 'until_terminated') return open;
  return 'specific_date';
}

function applyDefaultAgreementDates(template: AgreementDocumentTemplate, values: Record<string, string>) {
  const start = localIsoDate();
  if (templateHasToken(template, 'startAt') && !values.startAt?.trim()) {
    values.startAt = start;
  }
  if (templateHasToken(template, 'endAt')) {
    if (!values.endAt?.trim()) {
      values.endAt = addCalendarYears(values.startAt?.trim() || start, 1);
    }
    if (!values.endOpen?.trim()) values.endOpen = 'specific_date';
  }
}

function endConditionPlain(state: AgreementDocumentState): string {
  const condition = agreementEndCondition(state);
  if (condition === 'until_completed') return 'until completed';
  if (condition === 'ongoing') return 'on an ongoing basis';
  if (condition === 'until_terminated') return 'until terminated';
  const date = state.values.endAt?.trim();
  return date ? `until ${formatAgreementDate(date)}` : 'until Select end date';
}

export function seedAgreementDocumentState(args: {
  type: AgreementType;
  launch: AgreementLaunchContext;
  actor: { fullName?: string | null; profileId?: string | null };
}): AgreementDocumentState {
  const { type, launch, actor } = args;
  const actorName = actor.fullName?.trim() || '';
  const actorParty = partyFromKnown({
    name: actorName,
    profileId: actor.profileId,
    kind: 'civizen_individual',
  });
  const otherParty = partyFromKnown({
    name: launch.partyName,
    profileId: launch.partyProfileId,
    kind: launch.partyKind,
  });
  const parties: Record<string, PartySlotState> = {};
  const values: Record<string, string> = {};
  const visibleOptional: string[] = [];

  if (type === 'employment') {
    const selfIsEmployee = launch.employmentSelfRole === 'employee';
    parties.employer = selfIsEmployee ? otherParty : actorParty;
    parties.employee = selfIsEmployee ? actorParty : otherParty;
    const position = launch.position?.trim() || (!genericRelatedTitle(launch.relatedTitle) ? launch.relatedTitle?.trim() : '');
    if (position) values.position = position;
    if (launch.workLocation?.trim()) values.workLocation = launch.workLocation.trim();
    if (launch.compensation?.trim()) {
      values.compensation = launch.compensation.trim();
      visibleOptional.push('compensation');
    }
    if (launch.payFrequency?.trim()) values.payFrequency = launch.payFrequency.trim();
    if (launch.employmentStatus?.trim()) {
      values.employmentStatus = launch.employmentStatus.trim();
      visibleOptional.push('additional_employment');
    }
  } else if (type === 'sale_purchase') {
    const listingOtherIsSeller = launch.source === 'market_listing' || launch.source === 'market_order';
    parties.seller = partyFromKnown({
      name: launch.sellerName || (listingOtherIsSeller ? launch.partyName : actorName),
      profileId: listingOtherIsSeller ? launch.partyProfileId : actor.profileId,
      kind: listingOtherIsSeller ? launch.partyKind : 'civizen_individual',
    });
    parties.buyer = partyFromKnown({
      name: launch.buyerName || (listingOtherIsSeller ? actorName : launch.partyName),
      profileId: listingOtherIsSeller ? actor.profileId : launch.partyProfileId,
      kind: listingOtherIsSeller ? 'civizen_individual' : launch.partyKind,
    });
    const goods = launch.product?.trim() || (!genericRelatedTitle(launch.relatedTitle) ? launch.relatedTitle?.trim() : '');
    if (goods) values.goods = goods;
    if (launch.quantity?.trim()) values.quantity = launch.quantity.trim();
    if (launch.unitPrice?.trim() || launch.totalPrice?.trim()) {
      values.price = (launch.totalPrice || launch.unitPrice || '').trim();
    }
    if (launch.currency?.trim()) values.currency = launch.currency.trim();
  } else if (type === 'lease') {
    parties.lessor = actorParty;
    parties.lessee = otherParty;
    const premises = launch.product?.trim() || (!genericRelatedTitle(launch.relatedTitle) ? launch.relatedTitle?.trim() : '');
    if (premises) values.premises = premises;
    if (launch.currency?.trim()) values.currency = launch.currency.trim();
  } else if (type === 'funding') {
    parties.funder = actorParty;
    parties.recipient = otherParty;
  } else if (type === 'nda') {
    parties.disclosing = actorParty;
    parties.receiving = otherParty;
  } else {
    parties.party_a = actorParty;
    parties.party_b = otherParty;
  }

  if (launch.customType?.trim()) values.customTypeName = launch.customType.trim();
  const purpose = !genericRelatedTitle(launch.relatedTitle) ? launch.relatedTitle?.trim() : '';
  if (purpose && type !== 'employment' && type !== 'sale_purchase' && type !== 'lease') {
    values.purpose = purpose;
  }

  const template = agreementDocumentTemplate(type, launch.customType);
  let documentHeading = template.documentHeading;
  let headingOptionId = template.defaultHeadingId;
  let partyRoles = { ...template.defaultRoles };

  if (type === 'service_contribution' && isContributionLaunchSource(launch.source)) {
    documentHeading = 'Contribution';
    headingOptionId = 'contribution';
    partyRoles = { ...(template.rolesByHeading?.contribution || { party_a: 'Organization / Project', party_b: 'Contributor' }) };
    const otherName = partySlotName(otherParty);
    if (otherName && partyNameLooksLikeOrganization(otherName, partySlotKind(otherParty))) {
      parties.party_a = otherParty;
      parties.party_b = actorParty;
    }
  }

  applyDefaultAgreementDates(template, values);

  return syncPartyReference({
    values,
    parties,
    visibleOptional,
    extraSections: [],
    partyReference: '',
    partyReferenceManual: false,
    partyReferenceAuto: '',
    documentHeading,
    headingOptionId,
    partyRoles,
    paragraphWording: {},
    sectionTitles: {},
  });
}

export function tokenDisplayValue(
  tokenItem: AgreementTemplateToken,
  state: AgreementDocumentState,
): string {
  if (tokenItem.kind === 'party') {
    const slot = state.parties[tokenItem.id];
    return slot?.selected?.displayName || slot?.query.trim() || '';
  }
  return state.values[tokenItem.id]?.trim() || '';
}

function escapeAgreementHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderTemplateRun(run: AgreementTemplateRun, state: AgreementDocumentState): string {
  if (typeof run === 'string') return run;
  if (run.id === 'endAt') return endConditionPlain(state);
  const value = tokenDisplayValue(run, state);
  if (run.kind === 'party') {
    const role = partyRoleLabel(state, run.id, run.placeholder || 'Party');
    const name = value || run.placeholder;
    return `${escapeAgreementHtml(name)} (<em>the ${escapeAgreementHtml(role)}</em>)`;
  }
  if (run.kind === 'date' && value) return formatAgreementDate(value);
  return value || run.placeholder;
}

export function templateParagraphText(paragraph: AgreementTemplateParagraph, state: AgreementDocumentState): string {
  return paragraph.runs.map((run) => renderTemplateRun(run, state)).join('');
}

export function paragraphDisplayText(paragraph: AgreementTemplateParagraph, state: AgreementDocumentState): string {
  const override = state.paragraphWording?.[paragraph.id];
  return override == null ? templateParagraphText(paragraph, state) : override;
}

function plainMultiline(value?: string | null): string | null {
  return agreementHtmlToPlainText(value || '') || null;
}

export function visibleTemplateSections(template: AgreementDocumentTemplate, state: AgreementDocumentState): AgreementTemplateSection[] {
  const optionalIds = new Set(state.visibleOptional);
  return [
    ...template.essential,
    ...template.optional.filter((item) => optionalIds.has(item.id)),
  ];
}

export function compileAgreementDocument(args: {
  type: AgreementType;
  customTypeName?: string | null;
  template: AgreementDocumentTemplate;
  state: AgreementDocumentState;
  typeLabel: string;
}): {
  title: string;
  purpose: string;
  content: AgreementContent;
  startAt?: string | null;
  endAt?: string | null;
} {
  const { type, template, state, typeLabel } = args;
  const customTypeName = args.customTypeName?.trim() || state.values.customTypeName?.trim() || '';
  const sections = [
    ...visibleTemplateSections(template, state).map((item) => ({
      id: item.id,
      title: state.sectionTitles?.[item.id] || item.title || state.documentHeading || template.documentHeading,
      body: item.paragraphs
        .map((paragraphItem) => paragraphDisplayText(paragraphItem, state))
        .join('\n\n'),
    })),
    ...state.extraSections
      .filter((item) => item.title.trim() || agreementHtmlToPlainText(item.body))
      .map((item) => ({
        id: item.id,
        title: item.title.trim() || 'Additional terms',
        body: item.body.trim(),
      })),
  ];
  const purpose = plainMultiline(state.values.purpose)
    || plainMultiline(state.values.duties)
    || state.values.goods?.trim()
    || state.values.premises?.trim()
    || customTypeName
    || typeLabel;
  const title = agreementTitleFromDocument({
    typeLabel: customTypeName || state.documentHeading || typeLabel,
    state,
  });

  const employment = type === 'employment'
    ? compactEmploymentTerms({
      employer: tokenDisplayValue(party('employer'), state) || null,
      employee: tokenDisplayValue(party('employee'), state) || null,
      position: state.values.position || null,
      duties: plainMultiline(state.values.duties),
      startAt: state.values.startAt || null,
      workLocation: state.values.workLocation || null,
      employmentStatus: state.values.employmentStatus || null,
      compensation: state.values.compensation || null,
      payFrequency: state.values.payFrequency || null,
      schedule: state.values.schedule || null,
      benefits: plainMultiline(state.values.benefits),
      probation: state.values.probation || null,
      expenses: plainMultiline(state.values.expenses),
      confidentiality: plainMultiline(state.values.confidentiality),
      intellectualProperty: plainMultiline(state.values.intellectualProperty),
      policies: plainMultiline(state.values.policies),
      termination: plainMultiline(state.values.termination),
    } satisfies EmploymentTerms)
    : undefined;

  const salePurchase = type === 'sale_purchase'
    ? compactSalePurchaseTerms({
      seller: tokenDisplayValue(party('seller'), state) || null,
      buyer: tokenDisplayValue(party('buyer'), state) || null,
      goodsDescription: state.values.goods || null,
      quantity: state.values.quantity || null,
      unitPrice: state.values.price || null,
      totalPrice: state.values.price || null,
      currency: state.values.currency || null,
      paymentTerms: plainMultiline(state.values.paymentTerms),
      deliveryMethod: state.values.deliveryMethod || null,
      deliverySchedule: state.values.deliverySchedule || null,
      deliveryLocation: state.values.deliveryLocation || null,
      inspectionAcceptance: plainMultiline(state.values.inspectionAcceptance),
      warranty: plainMultiline(state.values.warranty),
      returnsRefunds: plainMultiline(state.values.returnsRefunds),
      titleTransfer: state.values.titleTransfer || null,
      riskOfLoss: state.values.riskOfLoss || null,
      additionalTerms: plainMultiline(state.values.additionalTerms),
    } satisfies SalePurchaseTerms)
    : undefined;

  const openEnded = !agreementEndIsSpecific(state);
  const lease = type === 'lease'
    ? compactLeaseTerms({
      lessor: tokenDisplayValue(party('lessor'), state) || null,
      lessee: tokenDisplayValue(party('lessee'), state) || null,
      premises: state.values.premises || null,
      startAt: state.values.startAt || null,
      endAt: openEnded ? null : (state.values.endAt || null),
      rent: state.values.rent || null,
      rentFrequency: state.values.rentFrequency || null,
      currency: state.values.currency || null,
      deposit: state.values.deposit || null,
      permittedUse: plainMultiline(state.values.permittedUse),
      maintenance: plainMultiline(state.values.maintenance),
      insurance: plainMultiline(state.values.insurance),
      termination: plainMultiline(state.values.termination),
    } satisfies LeaseTerms)
    : undefined;
  return {
    title,
    purpose,
    startAt: state.values.startAt?.trim() || null,
    endAt: openEnded ? null : (state.values.endAt?.trim() || null),
    content: {
      purpose,
      structured: {
        purpose,
        rolesResponsibilities: plainMultiline(state.values.responsibilities || state.values.duties),
        term: openEnded
          ? [state.values.startAt, endConditionPlain(state)].filter(Boolean).join(' – ')
          : [state.values.startAt, state.values.endAt].filter(Boolean).join(' – ') || null,
        startAt: state.values.startAt || null,
        endAt: openEnded ? null : (state.values.endAt || null),
        financialTerms: plainMultiline(state.values.financialTerms || state.values.compensation || state.values.rent),
        confidentiality: plainMultiline(state.values.confidentiality),
        intellectualProperty: plainMultiline(state.values.intellectualProperty),
        dataPrivacy: plainMultiline(state.values.dataPrivacy),
        termination: plainMultiline(state.values.termination),
        salePurchase,
        employment,
        lease,
        customTypeName: customTypeName || null,
        documentHeading: state.documentHeading || null,
        headingOptionId: state.headingOptionId || null,
        partyRoles: state.partyRoles,
        paragraphWording: Object.keys(state.paragraphWording || {}).length ? state.paragraphWording : null,
        sectionTitles: Object.keys(state.sectionTitles || {}).length ? state.sectionTitles : null,
        partyReference: state.partyReference || null,
        referenceNumber: state.partyReference || null,
      },
      sections,
    },
  };
}

export function agreementTitleFromDocument(args: {
  typeLabel: string;
  state: AgreementDocumentState;
}): string {
  const typeLabel = args.typeLabel.trim() || 'Agreement';
  const position = args.state.values.position?.trim();
  const goods = args.state.values.goods?.trim();
  const premises = args.state.values.premises?.trim();
  const other = ['employee', 'party_b', 'buyer', 'recipient', 'receiving', 'lessee']
    .map((id) => args.state.parties[id]?.selected?.displayName || args.state.parties[id]?.query.trim())
    .find(Boolean);
  if (position) return `${typeLabel} — ${position}`;
  if (goods) return `${typeLabel} — ${goods}`;
  if (premises) return `${typeLabel} — ${premises}`;
  if (other) return `${typeLabel} — ${other}`;
  return typeLabel;
}

export function compiledPartiesFromDocument(
  state: AgreementDocumentState,
  resolveParty: (slot: PartySlotState) => {
    kind: AgreementPartyKind | string;
    displayName: string;
    profileId?: string;
    needsClassification: boolean;
  } | null,
): { parties: CompiledAgreementParty[]; needsClassification: boolean } {
  const parties: CompiledAgreementParty[] = [];
  let needsClassification = false;
  for (const [id, slot] of Object.entries(state.parties)) {
    const resolved = resolveParty(slot);
    if (!resolved) continue;
    if (resolved.needsClassification) needsClassification = true;
    if (!resolved.displayName.trim()) continue;
    parties.push({
      kind: resolved.kind,
      displayName: resolved.displayName.trim(),
      profileId: resolved.profileId,
      role: state.partyRoles[id] || PARTY_ROLE_LABELS[id] || 'Party',
      signatoryProfileId: resolved.profileId,
    });
  }
  return { parties, needsClassification };
}

const VALIDATION_SKIP_IDS = new Set([
  'workLocation',
  'quantity',
  'price',
  'currency',
  'rent',
  'rentFrequency',
  'payFrequency',
  'compensation',
  'endOpen',
  'customTypeName',
]);

const GAP_MESSAGE_BY_TOKEN: Record<string, string> = {
  purpose: 'agreements.missing.scope',
  position: 'agreements.missing.position',
  goods: 'agreements.missing.goods',
  premises: 'agreements.missing.premises',
  responsibilities: 'agreements.missing.responsibilities',
  duties: 'agreements.missing.duties',
  startAt: 'agreements.missing.startDate',
  endAt: 'agreements.missing.endDate',
  confidentiality: 'agreements.missing.confidentiality',
  financialTerms: 'agreements.missing.support',
};

function tokenValueIsFilled(tokenItem: AgreementTemplateToken, state: AgreementDocumentState): boolean {
  if (tokenItem.kind === 'party') return Boolean(tokenDisplayValue(tokenItem, state));
  if (tokenItem.kind === 'multiline') return Boolean(plainMultiline(state.values[tokenItem.id]));
  return Boolean(state.values[tokenItem.id]?.trim());
}

export function requiredAgreementGaps(
  template: AgreementDocumentTemplate,
  state: AgreementDocumentState,
): AgreementRequiredGap[] {
  const gaps: AgreementRequiredGap[] = [];
  for (const tokenItem of essentialTemplateTokens(template)) {
    if (tokenItem.kind === 'party') {
      if (!tokenValueIsFilled(tokenItem, state)) {
        gaps.push({ tokenId: tokenItem.id, messageKey: 'agreements.missing.party' });
      }
      continue;
    }
    if (tokenItem.id === 'endAt') {
      if (agreementEndIsSpecific(state) && !state.values.endAt?.trim()) {
        gaps.push({ tokenId: 'endAt', messageKey: 'agreements.missing.endDate' });
      }
      continue;
    }
    if (VALIDATION_SKIP_IDS.has(tokenItem.id)) continue;
    if (!tokenValueIsFilled(tokenItem, state)) {
      gaps.push({
        tokenId: tokenItem.id,
        messageKey: GAP_MESSAGE_BY_TOKEN[tokenItem.id] || 'agreements.missing.scope',
      });
    }
  }
  return gaps;
}

export function unusedOptionalSections(
  template: AgreementDocumentTemplate,
  state: AgreementDocumentState,
): AgreementTemplateSection[] {
  const visible = new Set(state.visibleOptional);
  return template.optional.filter((item) => !visible.has(item.id));
}
