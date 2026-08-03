import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

import { PublicPageFooter } from '@/components/public/PublicPageFooter';
import { PublicPageShell } from '@/components/public/PublicPageShell';
import { onboardingSectionTitleClass } from '@/components/public/onboarding-styles';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { cn } from '@/lib/utils';

type FundPageShellProps = {
  title: string;
  description: string;
  pageTitle: string;
  pageDescription: string;
  children: ReactNode;
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
  const { t } = useLanguage();

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
          {showBackToHub ? (
            <Link
              to="/fund"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('fund.backToHub')}
            </Link>
          ) : null}
          <h1 className={cn(onboardingSectionTitleClass, 'text-3xl sm:text-4xl')}>{title}</h1>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">{description}</p>
        </header>

        {children}

        <PublicPageFooter />
      </motion.article>
    </PublicPageShell>
  );
}
