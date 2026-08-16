const AUTH_ONLY_PATHS = new Set(['/login', '/signup', '/onboarding', '/forgot-password', '/reset-password']);

type LocationLike = {
  pathname?: string;
  search?: string;
};

function isSafeInternalPath(pathname: string): boolean {
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('://')) {
    return false;
  }
  const path = pathname.split('?')[0]?.replace(/\/+$/, '') || '/';
  return !AUTH_ONLY_PATHS.has(path);
}

/** After sign-in, return to the page that sent the visitor to login when it is a safe in-app path. */
export function resolveAuthReturnPath(state: unknown, fallback = '/'): string {
  const from = (state as { from?: LocationLike } | null | undefined)?.from;
  const pathname = from?.pathname?.trim() ?? '';
  if (!pathname || !isSafeInternalPath(pathname)) {
    return fallback;
  }
  const search = from?.search && from.search.startsWith('?') ? from.search : '';
  return `${pathname}${search}`;
}
