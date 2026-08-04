import { Suspense, lazy } from 'react';
import { Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useShowOnScrollUp } from '@/hooks/useShowOnScrollUp';
import { cn } from '@/lib/utils';

const UserPageMenu = lazy(() =>
  import('@/components/layout/UserPageMenu').then((module) => ({ default: module.UserPageMenu })),
);

/**
 * App-wide chrome: Search + Profile menu on authenticated AppLayout pages.
 * Hides on scroll down; reappears on scroll up (same pattern as public headers).
 */
export function AppTopChrome() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { visible, scrolled } = useShowOnScrollUp();

  if (!user || !profile?.id) {
    return null;
  }

  const searchActive = location.pathname === '/search' || location.pathname.startsWith('/search/');

  return (
    <div
      data-testid="app-top-chrome"
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-end pt-[max(0.5rem,var(--safe-area-top))] transition-transform duration-300 ease-out motion-reduce:transition-none',
        visible ? 'translate-y-0' : '-translate-y-full',
        scrolled ? 'bg-gradient-to-b from-background/90 via-background/40 to-transparent' : 'bg-transparent',
      )}
    >
      <div className="pointer-events-auto flex items-center gap-2 px-4 pb-3 pt-2">
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
  );
}
