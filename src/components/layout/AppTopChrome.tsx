import { Suspense, lazy, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useShowOnScrollUp } from '@/hooks/useShowOnScrollUp';
import {
  canPopAppHistory,
  getAppBackFallback,
  shouldShowAppBack,
} from '@/lib/app-back-navigation';
import { cn } from '@/lib/utils';

const UserPageMenu = lazy(() =>
  import('@/components/layout/UserPageMenu').then((module) => ({ default: module.UserPageMenu })),
);

type AppTopChromeProps = {
  /** Optional control(s) rendered immediately before the Search icon. */
  beforeSearch?: ReactNode;
};

/**
 * App-wide chrome: Back (when not on a bottom-nav hub) · Search · Profile.
 * Hides on scroll down; reappears on scroll up (same pattern as public headers).
 */
export function AppTopChrome({ beforeSearch }: AppTopChromeProps) {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { visible, scrolled } = useShowOnScrollUp();
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const showBack = shouldShowAppBack(location.pathname);
  const searchActive = location.pathname === '/search' || location.pathname.startsWith('/search/');

  useLayoutEffect(() => {
    const node = headerRef.current;
    if (!node) {
      setHeaderHeight(0);
      return;
    }

    const syncHeight = () => setHeaderHeight(node.offsetHeight);
    syncHeight();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncHeight) : null;
    resizeObserver?.observe(node);
    window.addEventListener('resize', syncHeight);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, [showBack, Boolean(beforeSearch), Boolean(user && profile?.id)]);

  if (!user || !profile?.id) {
    return null;
  }

  const handleBack = () => {
    if (canPopAppHistory()) {
      navigate(-1);
      return;
    }
    navigate(getAppBackFallback(location.pathname));
  };

  return (
    <>
      <div
        ref={headerRef}
        data-testid="app-top-chrome"
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-40 pt-[max(0.5rem,var(--safe-area-top))] transition-transform duration-300 ease-out motion-reduce:transition-none',
          visible ? 'translate-y-0' : '-translate-y-full',
          scrolled
            ? 'border-b border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80'
            : 'bg-transparent',
        )}
      >
        <div className="flex w-full items-center justify-between gap-2 px-4 pb-3 pt-2">
          <div className="pointer-events-auto flex min-w-10 items-center">
            {showBack ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-full border border-border/60 bg-card/60"
                onClick={handleBack}
                aria-label={t('common.back')}
                data-testid="app-top-chrome-back"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : null}
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            {beforeSearch}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={cn(
                'h-10 w-10 rounded-full border border-border/60 bg-card/60',
                searchActive && 'border-primary/30 bg-primary/10 text-primary',
              )}
              onClick={() => navigate('/search')}
              aria-label={t('common.search')}
              data-testid="app-top-chrome-search"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Suspense fallback={<div className="h-10 w-10 rounded-full border border-border/60 bg-card/60" />}>
              <UserPageMenu />
            </Suspense>
          </div>
        </div>
      </div>
      <div aria-hidden className="shrink-0" style={{ height: headerHeight }} />
    </>
  );
}
