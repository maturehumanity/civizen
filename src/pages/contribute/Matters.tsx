import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquareWarning, Plus } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  MATTER_QUEUES,
  type MatterListRow,
  type MatterQueue,
} from '@/lib/matters';
import { listMatters } from '@/lib/matters-api';
import { listOwnedLinkedProfileIds } from '@/lib/opportunities-api';

const QUEUE_PARAM: Record<string, MatterQueue> = {
  needs_action: 'needs_action',
  mine: 'mine',
  participating: 'participating',
  organization: 'organization',
};

function MatterCard({
  row,
  typeLabel,
  statusLabel,
}: {
  row: MatterListRow;
  typeLabel: string;
  statusLabel: string;
}) {
  return (
    <Card className="border-border/70 bg-card/95 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground">{row.matter.title}</h3>
        <Badge variant="outline" className="shrink-0 rounded-full">
          {statusLabel}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{typeLabel}</p>
      {row.ball ? (
        <div className="mt-3 rounded-lg bg-primary/5 px-3 py-2">
          <p className="text-sm font-medium text-foreground">{row.ball.headline}</p>
          <p className="text-sm text-muted-foreground">{row.ball.detail}</p>
          {row.ball.dueLine ? (
            <p className="mt-1 text-xs text-muted-foreground">{row.ball.dueLine}</p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export default function Matters() {
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const profileId = profile?.id ?? '';
  const queue = QUEUE_PARAM[searchParams.get('view') || ''] ?? 'needs_action';

  const [rows, setRows] = useState<MatterListRow[]>([]);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queues = useMemo(() => {
    const items: MatterQueue[] = ['needs_action', 'mine', 'participating'];
    if (linkedIds.length > 0) items.push('organization');
    return items;
  }, [linkedIds.length]);

  const load = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const linked = await listOwnedLinkedProfileIds(profileId);
      setLinkedIds(linked);
      const list = await listMatters(queue, profileId, linked);
      setRows(list);
    } catch {
      setError(tRef.current('contribute.matters.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [profileId, queue]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppLayout>
      <div className="space-y-6 px-4 py-6">
        <AppPageHeader
          title={t('contribute.lanes.matters.title')}
          subtitle={t('contribute.lanes.matters.description')}
          fallbackPath="/contribute"
          leading={
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <MessageSquareWarning className="h-7 w-7 text-primary" />
            </div>
          }
          titleAccessory={
            profileId ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full"
                aria-label={t('contribute.matters.create')}
                onClick={() => navigate('/contribute/matters/new')}
              >
                <Plus className="h-4 w-4" />
              </Button>
            ) : null
          }
        />

        <div className="flex flex-wrap gap-2">
          {queues.filter((item) => MATTER_QUEUES.includes(item)).map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={queue === item ? 'default' : 'outline'}
              onClick={() => setSearchParams(item === 'needs_action' ? {} : { view: item })}
            >
              {t(`contribute.matters.queues.${item}`)}
            </Button>
          ))}
        </div>

        {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!loading && rows.length === 0 ? (
          <Card className="border-border/70 bg-card/95 p-5 text-sm text-muted-foreground">
            {t(`contribute.matters.empty.${queue}`)}
          </Card>
        ) : (
          <div className="grid gap-3">
            {rows.map((row) => (
              <Link key={row.matter.id} to={`/contribute/matters/${row.matter.id}`}>
                <MatterCard
                  row={row}
                  typeLabel={t(`contribute.matters.types.${row.matter.matterType}`)}
                  statusLabel={t(`contribute.matters.status.${row.derivedStatus}`)}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
