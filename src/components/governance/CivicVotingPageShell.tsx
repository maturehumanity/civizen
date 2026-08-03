import type { ReactNode } from 'react';

import { AppLayout } from '@/components/layout/AppLayout';
import { PublicPageFooter } from '@/components/public/PublicPageFooter';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import type { PublicSectionTrailItem } from '@/components/public/PublicSectionTrail';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

type CivicVotingPageShellProps = {
  children: ReactNode;
  /** Extra crumbs after Governance (e.g. Elections, election title). */
  sectionTrail?: readonly PublicSectionTrailItem[];
};

/**
 * Logged-in members keep the app shell; visitors get the public page shell.
 */
export function CivicVotingPageShell({ children, sectionTrail = [] }: CivicVotingPageShellProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (user) {
    return <AppLayout>{children}</AppLayout>;
  }

  const governanceLabel = t('civicVoting.publicLanding.title');
  const trail: PublicSectionTrailItem[] =
    sectionTrail.length > 0
      ? [{ label: governanceLabel, href: '/governance' }, ...sectionTrail]
      : [{ label: governanceLabel }];

  return (
    <PublicPageShell
      contentClassName="px-3 pb-16 sm:px-6"
      maxWidthClass="max-w-3xl"
      sectionTrail={trail}
    >
      <div className="mx-auto max-w-3xl space-y-4">
        {children}
        <div className="px-1 pb-4">
          <PublicPageFooter />
        </div>
      </div>
    </PublicPageShell>
  );
}

type CivicVotingPageHeadingProps = {
  title: ReactNode;
  icon?: ReactNode;
  className?: string;
};

/** Page title row under the section trail (no duplicate back button). */
export function CivicVotingPageHeading({ title, icon, className }: CivicVotingPageHeadingProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      {icon ? <div className="shrink-0">{icon}</div> : null}
      <h1 className="min-w-0 flex-1 font-display text-xl font-bold text-foreground">{title}</h1>
    </div>
  );
}
