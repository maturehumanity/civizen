/**
 * Curated public Areas V1 content.
 *
 * Area names and slugs come from the classification registry
 * (`listCurrentAreas()`). This file is the single source for public blurbs,
 * related systems, and genuine initiatives. Replace later with a structured
 * Initiative model — do not scatter copies across components.
 *
 * Systems are existing product surfaces. Initiatives are organized work toward
 * an outcome. Do not classify every route as an initiative.
 *
 * Do not list unpublished internal work (validation budgets, funding programs,
 * working frameworks) here.
 */

export const PUBLIC_AREA_STATUSES = [
  'proposed',
  'in_development',
  'active',
  'seeking_partners',
  'seeking_contributors',
  'seeking_funding',
  'evaluation',
  'validated',
  'paused',
  'completed',
] as const;

export type PublicAreaStatus = (typeof PUBLIC_AREA_STATUSES)[number];

export type PublicRelatedSystem = {
  id: string;
  title: string;
  purpose: string;
  href: string;
};

export type PublicInitiative = {
  id: string;
  title: string;
  purpose: string;
  href: string;
  status: PublicAreaStatus;
  actionLabel?: string;
  needs?: readonly string[];
};

export type PublicAreaCuration = {
  /** One-sentence public description. Not registry/methodology copy. */
  summary: string;
  /** Optional longer copy, shown only behind progressive disclosure. */
  deeper?: string;
  systems: readonly PublicRelatedSystem[];
  initiatives: readonly PublicInitiative[];
  learnMore: readonly { href: string; label: string }[];
};

/** Internal work that must never appear on public Area pages. */
export const UNPUBLISHED_INTERNAL_WORK_IDS = [
  'validation-budget',
  'validation-program',
  'pre-major-build-validation',
  'founder-participation-pool',
  'funding-economics',
] as const;

/**
 * Public statuses that require an explicit public-outreach decision.
 * V1 does not use Seeking Funding.
 */
export const PUBLIC_FUNDING_OUTREACH_STATUSES: readonly PublicAreaStatus[] = ['seeking_funding'];

export const PUBLIC_AREA_CURATION: Record<string, PublicAreaCuration> = {
  health: {
    summary: 'Improving the systems that support human health and wellbeing.',
    deeper:
      'Civizen cares about health as a shared human concern. Public initiatives in this Area will appear here when they are ready to share.',
    systems: [],
    initiatives: [],
    learnMore: [
      { href: '/why-this-exists', label: 'Why this exists' },
      { href: '/documents', label: 'Public documents' },
    ],
  },
  education: {
    summary: 'Improving how people learn, develop skills, and share knowledge.',
    deeper:
      'Study is Civizen’s current learning surface. It is a tool people can use today, not a separate Education initiative.',
    systems: [
      {
        id: 'study',
        title: 'Study',
        purpose: 'Read civic, legal, and learning materials inside Civizen.',
        href: '/study',
      },
    ],
    initiatives: [],
    learnMore: [
      { href: '/study', label: 'Open Study' },
      { href: '/why-this-exists', label: 'Why this exists' },
    ],
  },
  culture: {
    summary: 'Strengthening the values, arts, and shared meaning that help people live well together.',
    deeper:
      'Culture is part of Civizen’s current Area model. Public initiatives in this Area will appear here when they are ready to share.',
    systems: [],
    initiatives: [],
    learnMore: [
      { href: '/why-this-exists', label: 'Why this exists' },
      { href: '/documents', label: 'Public documents' },
    ],
  },
  responsibility: {
    summary: 'Helping people and institutions take responsibility for shared decisions.',
    deeper:
      'Governance tools already exist in Civizen. They are listed as current systems. Governance Solutions is early experimental work, not a finished program.',
    systems: [
      {
        id: 'civic-voting',
        title: 'Civic Voting',
        purpose: 'Browse public election information in the Civizen network.',
        href: '/governance/voting',
      },
      {
        id: 'governance',
        title: 'Governance',
        purpose: 'Open Civizen’s public governance entry point.',
        href: '/governance',
      },
      {
        id: 'contribute',
        title: 'Contribute',
        purpose: 'Choose how you want to help.',
        href: '/contribute',
      },
    ],
    initiatives: [
      {
        id: 'governance-solutions',
        title: 'Governance Solutions',
        purpose: 'An experimental workspace for discussing problems with people and AI. Sign-in required.',
        href: '/governance/solutions',
        status: 'in_development',
        actionLabel: 'Open',
        needs: ['People to try it', 'Thoughtful feedback'],
      },
    ],
    learnMore: [
      { href: '/governance', label: 'Governance' },
      { href: '/contribute/policy', label: 'Contributor policy' },
      { href: '/partners', label: 'Partnerships' },
    ],
  },
  environment: {
    summary: 'Caring for the living world we all depend on.',
    deeper:
      'Environment is part of Civizen’s current Area model. Public initiatives in this Area will appear here when they are ready to share.',
    systems: [],
    initiatives: [],
    learnMore: [
      { href: '/why-this-exists', label: 'Why this exists' },
      { href: '/documents', label: 'Public documents' },
    ],
  },
};

export const DEFAULT_CONTRIBUTE_HREF = '/contribute';
export const INSTITUTIONAL_INQUIRY_PATH = '/fund/institutional';

export function institutionalPartnerHref(args: {
  areaSlug: string;
  initiativeId?: string;
}): string {
  const params = new URLSearchParams();
  params.set('area', args.areaSlug);
  if (args.initiativeId) params.set('initiative', args.initiativeId);
  return `${INSTITUTIONAL_INQUIRY_PATH}?${params.toString()}`;
}

export function buildPartnerInquiryPrefill(areaName: string, initiativeTitle?: string): string {
  if (initiativeTitle) {
    return `I am inquiring about partnership related to ${initiativeTitle} (${areaName}).`;
  }
  return `I am inquiring about partnership related to ${areaName}.`;
}
