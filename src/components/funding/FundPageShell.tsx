import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { PublicPageFooter } from '@/components/public/PublicPageFooter';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { onboardingSectionTitleClass } from '@/components/public/onboarding-styles';
import { usePageMeta } from '@/hooks/usePageMeta';
import { cn } from '@/lib/utils';

type FundPageShellProps = {
  title: string;
  description: string;
  pageTitle: string;
  pageDescription: string;
  children: ReactNode;
  /**
   * When true, always show Back (lane pages → hub).
   * When false, use default `shouldShowAppBack` so the hub still gets Back when
   * opened from Contribute / elsewhere (history pop or `/` fallback).
   */
  showBackToHub?: boolean;
};

export function FundPageShell({
  title,
  description,
  pageTitle,
  pageDescription,
  children,
  showBackToHub = true,
}: FundPageShellProps) {
  usePageMeta({
    title: pageTitle,
    description: pageDescription,
  });

  return (
    <PublicPageShell
      contentClassName="px-6 pb-12 pt-2 sm:px-8"
      maxWidthClass="max-w-3xl"
      sectionTrail={[{ label: title }]}
    >
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-3xl space-y-8"
      >
        <header className="space-y-4 border-b border-border/40 pb-6">
          <AppPageHeader
            title={title}
            subtitle={description}
            showBack={showBackToHub ? true : undefined}
            fallbackPath={showBackToHub ? '/fund' : '/'}
            padForChrome={false}
            titleClassName={cn(onboardingSectionTitleClass, 'text-3xl sm:text-4xl')}
          />
        </header>

        {children}

        <PublicPageFooter />
      </motion.article>
    </PublicPageShell>
  );
}
