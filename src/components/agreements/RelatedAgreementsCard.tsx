import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { listAgreementsForEntity, type RelatedAgreementSummary } from '@/lib/agreements-api';
import { agreementsCreatePath, type AgreementLaunchContext } from '@/lib/agreements-model';

type RelatedAgreementsCardProps = {
  entityType: string;
  entityId: string;
  entityTitle: string;
  launch?: Partial<AgreementLaunchContext>;
};

function statusLabel(status: string, t: (key: string) => string) {
  const key = `agreements.status.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

export function RelatedAgreementsCard({
  entityType,
  entityId,
  entityTitle,
  launch,
}: RelatedAgreementsCardProps) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<RelatedAgreementSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listAgreementsForEntity(entityType, entityId));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  const createPath = agreementsCreatePath({
    source: launch?.source || entityType,
    relatedId: entityId,
    relatedTitle: launch?.relatedTitle || entityTitle,
    agreementType: launch?.agreementType,
    partyName: launch?.partyName,
    partyKind: launch?.partyKind,
    partyProfileId: launch?.partyProfileId,
    position: launch?.position,
    workLocation: launch?.workLocation,
    compensation: launch?.compensation,
    payFrequency: launch?.payFrequency,
    employmentSelfRole: launch?.employmentSelfRole,
    product: launch?.product,
    quantity: launch?.quantity,
    unitPrice: launch?.unitPrice,
    totalPrice: launch?.totalPrice,
    currency: launch?.currency,
    sellerName: launch?.sellerName,
    buyerName: launch?.buyerName,
    customType: launch?.customType,
  });

  return (
    <Card className="space-y-3 rounded-2xl border-border/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <FileSignature className="h-4 w-4 text-primary" aria-hidden />
            {t('agreements.relatedTitle')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t('agreements.relatedHint')}</p>
        </div>
        <Button type="button" size="sm" variant="outline" asChild>
          <Link to={createPath}>{t('agreements.createAction')}</Link>
        </Button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('agreements.relatedEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link to={`/agreements/${row.id}`} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-medium text-foreground">{row.title}</span>
                <Badge variant="secondary">{statusLabel(row.status, t)}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
