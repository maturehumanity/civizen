import type { ReactNode } from 'react';

import { PublicPageHeader } from '@/components/public/PublicPageHeader';
import type { PublicSectionTrailItem } from '@/components/public/PublicSectionTrail';
import { cn } from '@/lib/utils';

type PublicPageShellProps = {
  children: ReactNode;
  contentClassName?: string;
  maxWidthClass?: string;
  /** Section path on the header’s second line (replaces logo-adjacent labels). */
  sectionTrail?: readonly PublicSectionTrailItem[];
};

export function PublicPageShell({
  children,
  contentClassName,
  maxWidthClass = 'max-w-3xl',
  sectionTrail,
}: PublicPageShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicPageHeader maxWidthClass={maxWidthClass} sectionTrail={sectionTrail} />
      <div className={cn('flex-1', contentClassName)}>{children}</div>
    </div>
  );
}
