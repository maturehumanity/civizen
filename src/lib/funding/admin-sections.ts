export const FUNDING_ADMIN_SECTIONS = [
  'interest',
  'ledger',
  'audit',
  'compliance',
  'contributors',
] as const;

export type FundingAdminSection = (typeof FUNDING_ADMIN_SECTIONS)[number];

export const FUNDING_ADMIN_DEFAULT_SECTION: FundingAdminSection = 'interest';

export const FUNDING_ADMIN_BASE_PATH = '/settings/admin/funding';

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

export function fundingAdminPath(section: FundingAdminSection = FUNDING_ADMIN_DEFAULT_SECTION): string {
  if (section === FUNDING_ADMIN_DEFAULT_SECTION) return FUNDING_ADMIN_BASE_PATH;
  return `${FUNDING_ADMIN_BASE_PATH}?section=${section}`;
}

export function parseFundingAdminSection(value: string | null | undefined): FundingAdminSection {
  return isFundingAdminSection(value) ? value : FUNDING_ADMIN_DEFAULT_SECTION;
}

export function fundingAdminSectionFromLegacyPath(pathname: string): FundingAdminSection | null {
  return LEGACY_PATH_TO_SECTION[pathname] ?? null;
}
