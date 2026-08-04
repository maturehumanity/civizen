import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  canPopAppHistory,
  getAppBackFallback,
  shouldShowAppBack,
} from '@/lib/app-back-navigation';
import { cn } from '@/lib/utils';

/** Clears the floating Search + Profile controls on the first content row. */
export const APP_PAGE_HEADER_CHROME_PAD = 'pr-[5.75rem]';

type AppPageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Defaults to `shouldShowAppBack(pathname)`. */
  showBack?: boolean;
  /** Overrides section fallback when history cannot pop. */
  fallbackPath?: string;
  /** Optional icon or mark between back and title. */
  leading?: ReactNode;
  /** Trailing controls on the title row (kept left of chrome pad). */
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
};

/**
 * Compact page header: optional Back chevron on the same line as the title.
 * Prefer this over a separate chrome back row that consumes vertical space.
 */
export function AppPageHeader({
  title,
  subtitle,
  showBack,
  fallbackPath,
  leading,
  actions,
  className,
  titleClassName,
}: AppPageHeaderProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const backVisible = showBack ?? shouldShowAppBack(location.pathname);

  const handleBack = () => {
    if (canPopAppHistory()) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath ?? getAppBackFallback(location.pathname));
  };

  return (
    <div className={cn('flex items-start gap-1', APP_PAGE_HEADER_CHROME_PAD, className)}>
      {backVisible ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="mt-0.5 h-10 w-10 shrink-0"
          onClick={handleBack}
          aria-label={t('common.back')}
          data-testid="app-page-header-back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      ) : null}
      {leading ? <div className="mt-0.5 shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <h1
          className={cn(
            'text-2xl font-display font-bold leading-tight text-foreground',
            titleClassName,
          )}
          data-testid="app-page-header-title"
        >
          {title}
        </h1>
        {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
