import { Link, Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { agreementsCreatePath } from '@/lib/agreements-model';
import { getInstitutionalDocByPath } from '@/lib/institutional-docs';
import { InstitutionalDocumentPage } from '@/pages/institutional/InstitutionalDocumentPage';

function PartnersAgreementLaunch({ title }: { title: string }) {
  const { t } = useLanguage();
  return (
    <Card className="space-y-3 border-border/70 bg-card/95 p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{t('agreements.relatedHint')}</p>
      <Button type="button" variant="outline" asChild>
        <Link
          to={agreementsCreatePath({
            source: 'partnership',
            relatedTitle: title,
            agreementType: 'partnership',
          })}
        >
          {t('agreements.createAction')}
        </Link>
      </Button>
    </Card>
  );
}

/** Renders the institutional document that matches the current public route. */
export default function InstitutionalDocRoute() {
  const { pathname } = useLocation();
  const doc = getInstitutionalDocByPath(pathname);
  if (!doc) {
    return <Navigate to="/documents" replace />;
  }
  return (
    <InstitutionalDocumentPage
      doc={doc}
      actions={pathname === '/partners' ? <PartnersAgreementLaunch title={doc.title} /> : null}
    />
  );
}

/** Convenience re-export for typed links in the documents index. */
export function InstitutionalDocLink({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}
