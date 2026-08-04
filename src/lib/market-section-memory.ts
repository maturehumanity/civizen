import {
  isMarketSectionId,
  MARKET_CAROUSEL_SECTION_IDS,
  parseMarketSectionParam,
  type MarketPrimaryTabId,
  type MarketSectionId,
} from '@/lib/market-categories';

const LAST_SECTION_KEY = 'civizen.market.lastSection.v1';
const FOR_YOU_SEEN_AT_KEY = 'civizen.market.forYouSeenAt.v1';

/** Fallback when nothing is remembered and For you has no unseen items. */
export const MARKET_FALLBACK_SECTION: MarketPrimaryTabId = 'jobs';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readLastMarketSection(): MarketSectionId | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(LAST_SECTION_KEY);
    if (!raw || !isMarketSectionId(raw)) return null;
    if (!MARKET_CAROUSEL_SECTION_IDS.includes(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function writeLastMarketSection(section: MarketSectionId): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(LAST_SECTION_KEY, section);
  } catch {
    // ignore quota / private mode
  }
}

export function readForYouSeenAt(): string | null {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(FOR_YOU_SEEN_AT_KEY);
  } catch {
    return null;
  }
}

export function writeForYouSeenAt(isoTimestamp: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(FOR_YOU_SEEN_AT_KEY, isoTimestamp);
  } catch {
    // ignore
  }
}

/** True when For you has published listings the user has not yet acknowledged. */
export function forYouHasUnseenListings(
  listings: Array<{ created_at: string }>,
  seenAtIso: string | null = readForYouSeenAt(),
): boolean {
  if (listings.length === 0) return false;
  if (!seenAtIso) return true;
  const seenMs = Date.parse(seenAtIso);
  if (!Number.isFinite(seenMs)) return true;
  return listings.some((listing) => {
    const createdMs = Date.parse(listing.created_at);
    return Number.isFinite(createdMs) && createdMs > seenMs;
  });
}

/**
 * Resolve which Market section to show.
 * Explicit `?section=` wins; otherwise restore last section, unless For you has unseen items.
 */
export function resolveMarketSection(options: {
  sectionParam: string | null;
  listings?: Array<{ created_at: string }>;
  listingsReady?: boolean;
}): MarketSectionId {
  const fromUrl = parseMarketSectionParam(options.sectionParam);
  if (fromUrl && MARKET_CAROUSEL_SECTION_IDS.includes(fromUrl)) {
    return fromUrl;
  }

  if (options.listingsReady && options.listings && forYouHasUnseenListings(options.listings)) {
    return 'for-you';
  }

  const remembered = readLastMarketSection();
  if (remembered) return remembered;
  return MARKET_FALLBACK_SECTION;
}
