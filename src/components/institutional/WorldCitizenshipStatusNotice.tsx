import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

type WorldCitizenshipStatusNoticeProps = {
  className?: string;
  /** Prefer the shorter credential-adjacent wording on ID-like surfaces. */
  variant?: 'status' | 'credential' | 'readiness';
  /** Optional override for the learn-more link class (e.g. dark card themes). */
  linkClassName?: string;
  /**
   * `inline` — full paragraph (default).
   * `icon` — compact disclaimer control; hover shows the notice, click opens the full page.
   */
  presentation?: 'inline' | 'icon';
};

/**
 * Concise present-status notice for identity, credential, and governance surfaces. It must not be interpreted as a permanent limitation on Civizen's long-term planetary-citizenship mission.
 */
export function WorldCitizenshipStatusNotice({
  className,
  variant = 'status',
  linkClassName,
  presentation = 'inline',
}: WorldCitizenshipStatusNoticeProps) {
  const { t } = useLanguage();
  const body =
    variant === 'credential'
      ? t('worldCitizenshipNotice.credential')
      : variant === 'readiness'
        ? t('worldCitizenshipNotice.readiness')
        : t('worldCitizenshipNotice.short');
  const learnMore = t('worldCitizenshipNotice.learnMore');
  const fullNoticePath = '/about/world-citizenship';

  if (presentation === 'icon') {
    return (
      <HoverCard openDelay={180} closeDelay={120}>
        <HoverCardTrigger asChild>
          <Link
            to={fullNoticePath}
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card/80 text-primary shadow-soft transition-colors hover:bg-muted/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              className,
            )}
            aria-label={t('worldCitizenshipNotice.iconAria')}
            title={t('worldCitizenshipNotice.iconAria')}
          >
            <Info className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          </Link>
        </HoverCardTrigger>
        <HoverCardContent
          align="center"
          side="bottom"
          className="w-72 space-y-2 p-3 text-left text-xs leading-relaxed"
        >
          <p className="text-muted-foreground">{body}</p>
          <p className={cn('font-medium text-primary', linkClassName)}>{learnMore}</p>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <p className={cn('text-xs leading-relaxed text-muted-foreground', className)}>
      {body}{' '}
      <Link
        to={fullNoticePath}
        className={cn('text-primary underline-offset-2 hover:underline', linkClassName)}
      >
        {learnMore}
      </Link>
    </p>
  );
}
