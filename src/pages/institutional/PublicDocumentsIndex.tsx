import { Link } from 'react-router-dom';
import { Library } from 'lucide-react';
import { motion } from 'framer-motion';

import { PublicPageFooter } from '@/components/public/PublicPageFooter';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  DOCUMENTS_INDEX_SECTIONS,
  docsForSection,
  type InstitutionalDocSection,
} from '@/lib/institutional-docs';
import { cn } from '@/lib/utils';

function reviewStatusBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'superseded') return 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200';
  if (normalized === 'archived') return 'border-muted-foreground/40 bg-muted text-muted-foreground';
  if (normalized === 'interim') return 'border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200';
  return 'border-border bg-muted/40 text-foreground';
}

export default function PublicDocumentsIndex() {
  const { t } = useLanguage();
  usePageMeta({
    title: t('institutionalDocs.pageTitle'),
    description: t('institutionalDocs.indexDescription'),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <AppPageHeader
            title={t('institutionalDocs.indexTitle')}
            subtitle={t('institutionalDocs.indexDescription')}
            padForChrome={false}
            fallbackPath="/"
            leading={
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Library className="h-6 w-6" aria-hidden />
              </div>
            }
          />
        </motion.header>

        <p className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
          {t('institutionalDocs.controllingNote')}
        </p>

        <div className="space-y-5">
          {DOCUMENTS_INDEX_SECTIONS.map((section, index) => {
            const docs = docsForSection(section);
            if (docs.length === 0) return null;
            return (
              <motion.section
                key={section}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 + index * 0.03 }}
                className="space-y-2"
              >
                <h2 className="text-lg font-semibold text-foreground">
                  {t(`institutionalDocs.sections.${section as InstitutionalDocSection}`)}
                </h2>
                <div className="grid gap-2">
                  {docs.map((doc) => {
                    const statusLabelKey = `institutionalDocs.status.${doc.reviewStatus}`;
                    const statusLabel = t(statusLabelKey);
                    const resolvedStatusLabel =
                      statusLabel === statusLabelKey ? doc.reviewStatus : statusLabel;

                    return (
                      <Link key={doc.id} to={doc.path} className="block">
                        <Card className="border-border/70 bg-card/95 transition-colors hover:border-border">
                          <CardContent className="flex items-center justify-between gap-3 p-4">
                            <div className="min-w-0 space-y-2">
                              <p className="font-medium text-foreground">{doc.title}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'rounded-full capitalize',
                                    reviewStatusBadgeClass(doc.reviewStatus),
                                  )}
                                >
                                  {resolvedStatusLabel}
                                </Badge>
                                <span className="text-xs text-muted-foreground">v{doc.version}</span>
                                {doc.professionalReviewRequired ? (
                                  <span className="text-xs text-muted-foreground">
                                    · {t('institutionalDocs.professionalReviewRequired')}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <span className="shrink-0 text-sm text-primary">Open</span>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </motion.section>
            );
          })}
        </div>

        <PublicPageFooter />
      </div>
    </div>
  );
}
