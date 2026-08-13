import { listCurrentAreas, type ClassificationNode } from '@/lib/classification';
import {
  DEFAULT_CONTRIBUTE_HREF,
  PUBLIC_AREA_CURATION,
  PUBLIC_FUNDING_OUTREACH_STATUSES,
  UNPUBLISHED_INTERNAL_WORK_IDS,
  type PublicAreaCuration,
  type PublicInitiative,
  type PublicRelatedSystem,
  institutionalPartnerHref,
} from '@/lib/areas/public-areas-content';

export {
  DEFAULT_CONTRIBUTE_HREF,
  INSTITUTIONAL_INQUIRY_PATH,
  PUBLIC_AREA_CURATION,
  PUBLIC_AREA_STATUSES,
  PUBLIC_FUNDING_OUTREACH_STATUSES,
  UNPUBLISHED_INTERNAL_WORK_IDS,
  buildPartnerInquiryPrefill,
  institutionalPartnerHref,
} from '@/lib/areas/public-areas-content';
export type {
  PublicAreaCuration,
  PublicAreaStatus,
  PublicInitiative,
  PublicRelatedSystem,
} from '@/lib/areas/public-areas-content';

const GENERIC_SUMMARY = 'See what Civizen is working on in this Area.';

export type PublicAreaCard = {
  slug: string;
  name: string;
  summary: string;
  href: string;
};

export type PublicAreaPage = {
  slug: string;
  name: string;
  summary: string;
  deeper?: string;
  systems: readonly PublicRelatedSystem[];
  initiatives: readonly PublicInitiative[];
  contributeHref: string;
  partnerHref: string;
  learnMore: readonly { href: string; label: string }[];
};

function curationFor(slug: string): PublicAreaCuration | undefined {
  return PUBLIC_AREA_CURATION[slug];
}

export function areaHref(slug: string): string {
  return `/areas/${slug}`;
}

export function listPublicAreaCards(
  areas: ClassificationNode[] = listCurrentAreas(),
): PublicAreaCard[] {
  return areas.map((node) => {
    const slug = node.code;
    const curated = curationFor(slug);
    return {
      slug,
      name: node.shortName,
      summary: curated?.summary ?? GENERIC_SUMMARY,
      href: areaHref(slug),
    };
  });
}

export function getPublicAreaPage(
  slug: string,
  areas: ClassificationNode[] = listCurrentAreas(),
): PublicAreaPage | undefined {
  const node = areas.find((area) => area.code === slug);
  if (!node) return undefined;
  const curated = curationFor(slug);
  return {
    slug: node.code,
    name: node.shortName,
    summary: curated?.summary ?? GENERIC_SUMMARY,
    deeper: curated?.deeper,
    systems: curated?.systems ?? [],
    initiatives: curated?.initiatives ?? [],
    contributeHref: DEFAULT_CONTRIBUTE_HREF,
    partnerHref: institutionalPartnerHref({ areaSlug: node.code }),
    learnMore: curated?.learnMore ?? [],
  };
}

export function getPublicInitiative(
  page: PublicAreaPage,
  initiativeId: string,
): PublicInitiative | undefined {
  return page.initiatives.find((item) => item.id === initiativeId);
}

export function initiativePartnerHref(areaSlug: string, initiativeId: string): string {
  return institutionalPartnerHref({ areaSlug, initiativeId });
}

export function listPublicInitiativeIds(): string[] {
  return Object.values(PUBLIC_AREA_CURATION).flatMap((entry) =>
    entry.initiatives.map((item) => item.id),
  );
}

export function listPublicSystemIds(): string[] {
  return Object.values(PUBLIC_AREA_CURATION).flatMap((entry) => entry.systems.map((item) => item.id));
}

export function usesPublicFundingOutreachStatus(): boolean {
  return Object.values(PUBLIC_AREA_CURATION).some((entry) =>
    entry.initiatives.some((item) =>
      (PUBLIC_FUNDING_OUTREACH_STATUSES as readonly string[]).includes(item.status),
    ),
  );
}

export function exposesUnpublishedInternalWork(): boolean {
  const publishedIds = new Set([...listPublicInitiativeIds(), ...listPublicSystemIds()]);
  return UNPUBLISHED_INTERNAL_WORK_IDS.some((id) => publishedIds.has(id));
}
