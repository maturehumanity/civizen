import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';

import { PublicLanguageSelect } from '@/components/public/PublicLanguageSelect';
import { PublicThemeToggle } from '@/components/public/PublicThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const UserPageMenu = lazy(() =>
  import('@/components/layout/UserPageMenu').then((module) => ({ default: module.UserPageMenu })),
);

type PublicPageToolbarProps = {
  className?: string;
};

export function PublicPageToolbar({ className }: PublicPageToolbarProps) {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const showDownload = !user;
  const showProfileMenu = Boolean(user && profile?.id);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showDownload ? (
        <Link
          to="/download"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent/70"
          data-testid="public-download-civizen"
        >
          <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="max-w-[9.5rem] truncate sm:max-w-none">{t('features.pages.downloads')}</span>
        </Link>
      ) : null}
      <PublicLanguageSelect />
      <PublicThemeToggle />
      {showProfileMenu ? (
        <Suspense fallback={<div className="h-10 w-10 rounded-full border border-border/60 bg-card/60" />}>
          <UserPageMenu />
        </Suspense>
      ) : null}
    </div>
  );
}
