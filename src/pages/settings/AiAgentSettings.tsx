import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Bot, Loader2, Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { listCiviInteractions } from '@/lib/assistant/civi-interactions';
import {
  canViewCiviAgentSettings,
  filterCiviInteractions,
  groupCiviInteractionsByDay,
  type CiviInteractionRow,
  type CiviInteractionSource,
} from '@/lib/assistant/interaction-log';

function sourceLabelKey(source: CiviInteractionSource): string {
  if (source === 'memory') return 'settings.aiAgentSourceMemory';
  if (source === 'model') return 'settings.aiAgentSourceModel';
  if (source === 'refusal') return 'settings.aiAgentSourceRefusal';
  return 'settings.aiAgentSourceKnowledge';
}

function actorLabel(row: CiviInteractionRow, t: (key: string) => string): string {
  if (row.audience === 'guest') return t('settings.aiAgentVisitor');
  return row.actorName || row.actorUsername || t('settings.aiAgentMember');
}

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDayDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AiAgentSettings() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [rows, setRows] = useState<CiviInteractionRow[]>([]);
  const [query, setQuery] = useState('');

  const allowed = canViewCiviAgentSettings(profile?.role);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        const next = await listCiviInteractions();
        if (!cancelled) setRows(next);
      } catch {
        if (!cancelled) {
          setRows([]);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  const filtered = useMemo(() => filterCiviInteractions(rows, query), [rows, query]);
  const groups = useMemo(() => groupCiviInteractionsByDay(filtered), [filtered]);

  if (profile && !allowed) {
    return <Navigate to="/settings" replace />;
  }

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6">
        <AppPageHeader
          title={t('settings.aiAgent')}
          subtitle={t('settings.aiAgentPageSubtitle')}
          fallbackPath="/settings"
          leading={
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Bot className="h-6 w-6" aria-hidden />
            </div>
          }
        />

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t('common.loading')}
          </div>
        ) : loadFailed ? (
          <p className="text-sm text-muted-foreground">{t('settings.aiAgentLoadFailed')}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings.aiAgentEmpty')}</p>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('settings.aiAgentSearchPlaceholder')}
                aria-label={t('settings.aiAgentSearchPlaceholder')}
                className="pl-9"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('settings.aiAgentSearchEmpty')}</p>
            ) : (
              groups.map((group) => (
                <section key={group.key} className="flex flex-col gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {group.labelKind === 'today'
                      ? t('settings.aiAgentToday')
                      : group.labelKind === 'yesterday'
                        ? t('settings.aiAgentYesterday')
                        : formatDayDate(group.date)}
                  </h2>
                  <Card className="overflow-hidden border-border/80 p-0">
                    <Accordion type="single" collapsible>
                      {group.rows.map((row) => (
                        <AccordionItem key={row.id} value={row.id} className="border-border/70 px-4">
                          <AccordionTrigger className="py-3 text-left hover:no-underline">
                            <span className="flex min-w-0 flex-1 flex-col gap-1 pr-3">
                              <span className="line-clamp-2 text-sm font-medium text-foreground">
                                {row.question}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {actorLabel(row, t)}
                                {' · '}
                                {t(sourceLabelKey(row.source))}
                                {row.remembered ? ` · ${t('settings.aiAgentRemembered')}` : ''}
                                {formatClock(row.createdAt) ? ` · ${formatClock(row.createdAt)}` : ''}
                              </span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-3 pb-1">
                              <div className="space-y-1">
                                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                  {t('settings.aiAgentQuestion')}
                                </p>
                                <p className="whitespace-pre-wrap text-sm text-foreground">{row.question}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                  {t('settings.aiAgentAnswer')}
                                </p>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                  {row.answer}
                                </p>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </Card>
                </section>
              ))
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
