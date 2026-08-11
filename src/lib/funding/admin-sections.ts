/** Ordinary operational Funding tabs. Budget remains the default landing section. */
export const FUNDING_ADMIN_PRIMARY_SECTIONS = [
  'budget',
  'program-plan',
  'economics',
  'overview',
  'sources',
  'interest',
] as const;

/**
 * Legacy capital-ledger / distribution scaffolding.
 * Quarantined from ordinary navigation; accessible only with ?legacy=1.
 */
export const FUNDING_ADMIN_LEGACY_SECTIONS = [
  'ledger',
  'audit',
  'compliance',
  'contributors',
] as const;

export const FUNDING_ADMIN_SECTIONS = [
  ...FUNDING_ADMIN_PRIMARY_SECTIONS,
  ...FUNDING_ADMIN_LEGACY_SECTIONS,
] as const;

export type FundingAdminSection = (typeof FUNDING_ADMIN_SECTIONS)[number];
export type FundingAdminPrimarySection = (typeof FUNDING_ADMIN_PRIMARY_SECTIONS)[number];
export type FundingAdminLegacySection = (typeof FUNDING_ADMIN_LEGACY_SECTIONS)[number];

/** Default landing remains Budget (not Overview). */
export const FUNDING_ADMIN_DEFAULT_SECTION: FundingAdminSection = 'budget';

export const FUNDING_ADMIN_BASE_PATH = '/settings/admin/funding';

/** Source detail progressive-disclosure panels (one task family at a time). */
export const FUNDING_SOURCE_WORK_PANELS = [
  'outreach',
  'commitments',
  'receipts',
  'allocations',
  'fees',
] as const;

export type FundingSourceWorkPanel = (typeof FUNDING_SOURCE_WORK_PANELS)[number];

export const FUNDING_SOURCE_WORK_PANEL_DEFAULT: FundingSourceWorkPanel = 'outreach';

const LEGACY_PATH_TO_SECTION: Record<string, FundingAdminSection> = {
  '/settings/admin/funding-interest': 'interest',
  '/settings/admin/funding-ledger': 'ledger',
  '/settings/admin/funding-audit': 'audit',
  '/settings/admin/funding-compliance': 'compliance',
  '/settings/admin/funding-contributors': 'contributors',
};

export function isFundingAdminSection(value: string | null | undefined): value is FundingAdminSection {
  return FUNDING_ADMIN_SECTIONS.includes(value as FundingAdminSection);
}

export function isFundingAdminLegacySection(
  value: string | null | undefined,
): value is FundingAdminLegacySection {
  return FUNDING_ADMIN_LEGACY_SECTIONS.includes(value as FundingAdminLegacySection);
}

export function isFundingSourceWorkPanel(
  value: string | null | undefined,
): value is FundingSourceWorkPanel {
  return FUNDING_SOURCE_WORK_PANELS.includes(value as FundingSourceWorkPanel);
}

export function fundingAdminPath(
  section: FundingAdminSection = FUNDING_ADMIN_DEFAULT_SECTION,
  options?: { legacy?: boolean },
): string {
  const params = new URLSearchParams();
  if (section !== FUNDING_ADMIN_DEFAULT_SECTION) params.set('section', section);
  if (options?.legacy || isFundingAdminLegacySection(section)) params.set('legacy', '1');
  const qs = params.toString();
  return qs ? `${FUNDING_ADMIN_BASE_PATH}?${qs}` : FUNDING_ADMIN_BASE_PATH;
}

export function parseFundingAdminSection(value: string | null | undefined): FundingAdminSection {
  return isFundingAdminSection(value) ? value : FUNDING_ADMIN_DEFAULT_SECTION;
}

export function parseFundingSourceWorkPanel(value: string | null | undefined): FundingSourceWorkPanel {
  return isFundingSourceWorkPanel(value) ? value : FUNDING_SOURCE_WORK_PANEL_DEFAULT;
}

/**
 * Resolve visible section. Legacy sections require ?legacy=1; otherwise fall back to Budget.
 */
export function resolveFundingAdminSection(args: {
  sectionParam: string | null | undefined;
  legacyParam: string | null | undefined;
}): { section: FundingAdminSection; legacyMode: boolean; redirectedFromLegacy: boolean } {
  const legacyMode = args.legacyParam === '1' || args.legacyParam === 'true';
  const requested = parseFundingAdminSection(args.sectionParam);
  if (isFundingAdminLegacySection(requested) && !legacyMode) {
    return { section: FUNDING_ADMIN_DEFAULT_SECTION, legacyMode: false, redirectedFromLegacy: true };
  }
  return {
    section: requested,
    legacyMode: legacyMode || isFundingAdminLegacySection(requested),
    redirectedFromLegacy: false,
  };
}

export function fundingAdminSectionFromLegacyPath(pathname: string): FundingAdminSection | null {
  return LEGACY_PATH_TO_SECTION[pathname] ?? null;
}

export function visibleFundingAdminSections(legacyMode: boolean): FundingAdminSection[] {
  return legacyMode ? [...FUNDING_ADMIN_SECTIONS] : [...FUNDING_ADMIN_PRIMARY_SECTIONS];
}
