/**
 * Shared back-navigation rules for AppTopChrome.
 * Bottom-nav hubs rely on tab switching; every other AppLayout route gets a chrome back control.
 */

const MAIN_NAV_HUB_PATHS = new Set(['/', '/study', '/contribute', '/market', '/messaging']);

export function shouldShowAppBack(pathname: string): boolean {
  if (!pathname) return false;
  if (MAIN_NAV_HUB_PATHS.has(pathname)) return false;
  return true;
}

/** Fallback when there is no in-app history entry to pop. */
export function getAppBackFallback(pathname: string): string {
  if (pathname.startsWith('/settings/')) return '/settings';
  if (pathname.startsWith('/messaging/')) return '/messaging';
  if (pathname.startsWith('/study/')) return '/study';
  if (pathname.startsWith('/market/')) return '/market';
  if (pathname.startsWith('/governance/')) return '/governance';
  if (pathname.startsWith('/fund/')) return '/fund';
  if (pathname.startsWith('/contribute/') && pathname !== '/contribute/policy') {
    return '/contribute';
  }
  if (pathname.startsWith('/agreements/')) return '/agreements';
  if (pathname.startsWith('/u/')) return '/search';
  return '/';
}

export function canPopAppHistory(): boolean {
  const state = window.history.state as { idx?: number } | null;
  return typeof state?.idx === 'number' && state.idx > 0;
}
