import { Suspense, lazy, type ReactNode } from 'react';
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

type AppTopChromeProps = {
  /** Optional control(s) rendered immediately before the Search icon. */
  beforeSearch?: ReactNode;
};

/**
 * Floating app chrome: Search + Profile (top-right).
 * Page back lives on the title row via `AppPageHeader` — not here — to avoid an extra chrome line.
 */
export function AppTopChrome({ beforeSearch }: AppTopChromeProps) {
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
  );
}
