import { Link } from 'react-router-dom';

import { CivizenBrandIcon } from '@/components/brand/CivizenBrandIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

type PublicHomeLogoProps = {
  className?: string;
  /** Root section name beside the mark when the trail is deep / overflowing. */
  sectionLabel?: string;
  sectionHref?: string;
};

/** Top-left Civizen mark; returns to the public landing page. */
export function PublicHomeLogo({ className, sectionLabel, sectionHref }: PublicHomeLogoProps) {
  const { t } = useLanguage();
  const label = sectionLabel?.trim() || '';

  return (
    <div className={cn('flex min-w-0 max-w-[min(100%,14rem)] items-center gap-2 sm:max-w-[18rem]', className)}>
      <Link
        to="/"
        aria-label={`${t('common.appName')} — ${t('common.home')}`}
        className="inline-flex shrink-0 items-center rounded-xl outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <CivizenBrandIcon className="h-9 w-9 sm:h-10 sm:w-10" />
      </Link>
      {label ? (
        sectionHref ? (
          <Link
            to={sectionHref}
            className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80 sm:text-base"
          >
            {label}
          </Link>
        ) : (
          <span className="min-w-0 truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
            {label}
          </span>
        )
      ) : null}
    </div>
  );
}
