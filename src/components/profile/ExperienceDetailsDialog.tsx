import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2, X } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatEnglishList } from '@/lib/profile-skills';
import {
  emptyExperienceDraft,
  experienceEntryComplete,
  experienceYearOptions,
  filterExperienceOptions,
  formatDurationRange,
  formatExperienceLine,
  monthYearKey,
  newExperienceDraftId,
  normalizeDurationKeys,
  normalizeNameList,
  parseExperienceEntries,
  PROFILE_EXPERIENCE_AREA_SEEDS,
  PROFILE_EXPERIENCE_COMPANY_SEEDS,
  PROFILE_EXPERIENCE_MONTH_LABELS,
  PROFILE_EXPERIENCE_POSITION_SEEDS,
  serializeExperienceEntries,
  type ExperienceEntry,
} from '@/lib/profile-experience';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ExperienceDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  onSaved?: () => void;
};

type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type DraftState = {
  areas: string[];
  positions: string[];
  companies: string[];
  durationKeys: string[];
};

const AUTOSAVE_MS = 650;
const COMMIT_MS = 400;
const YEAR_OPTIONS = experienceYearOptions(60);

function canHoverOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function selectedOptionClass(selected: boolean): string {
  return cn(
    selected &&
      'bg-primary/20 text-foreground data-[selected=true]:bg-primary/30 data-[selected=true]:text-foreground',
  );
}

function emptyDraft(): DraftState {
  return emptyExperienceDraft() as DraftState;
}

type SentenceTokenProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
  empty: boolean;
  children: ReactNode;
  panel: ReactNode;
  contentClassName?: string;
};

function SentenceToken({
  open,
  onOpenChange,
  ariaLabel,
  empty,
  children,
  panel,
  contentClassName,
}: SentenceTokenProps) {
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    onOpenChange(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => onOpenChange(false), 160);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        clearCloseTimer();
        onOpenChange(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn(
            'ml-0.5 mr-0.5 inline-flex max-w-[min(22rem,calc(100vw-6rem))] items-center rounded-sm border-b border-dashed border-primary/55 px-0.5 text-left font-medium text-primary transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            empty && 'text-muted-foreground',
          )}
          onMouseEnter={() => {
            if (canHoverOpen()) openMenu();
          }}
          onMouseLeave={() => {
            if (canHoverOpen()) scheduleClose();
          }}
        >
          <span className="whitespace-normal">{children}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className={cn('w-[min(18rem,calc(100vw-2rem))] p-0', contentClassName)}
        onMouseEnter={() => {
          if (canHoverOpen()) openMenu();
        }}
        onMouseLeave={() => {
          if (canHoverOpen()) scheduleClose();
        }}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}

type MonthYearPickerProps = {
  selectedKeys: string[];
  onToggle: (year: number, month: number) => void;
};

function MonthYearPicker({ selectedKeys, onToggle }: MonthYearPickerProps) {
  const { t } = useLanguage();
  const selectedSet = useMemo(() => new Set(normalizeDurationKeys(selectedKeys)), [selectedKeys]);
  const [focusYear, setFocusYear] = useState(
    () => YEAR_OPTIONS[0] ?? new Date().getFullYear(),
  );
  const [focusMonth, setFocusMonth] = useState(() => new Date().getMonth() + 1);

  const focusKey = monthYearKey(focusYear, focusMonth);
  const focusSelected = selectedSet.has(focusKey);

  return (
    <div className="p-2">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="text-xs text-muted-foreground">{t('profile.experienceDetails.durationHint')}</p>
        <button
          type="button"
          className={cn(
            'rounded-md px-2 py-1 text-xs font-medium transition-colors',
            focusSelected
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-foreground hover:bg-muted/80',
          )}
          onClick={() => onToggle(focusYear, focusMonth)}
        >
          {focusSelected
            ? t('profile.experienceDetails.durationRemove')
            : t('profile.experienceDetails.durationAdd')}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-muted/30 p-1">
        <ScrollArea className="h-44">
          <div className="flex flex-col gap-0.5 p-1" role="listbox" aria-label={t('profile.experienceDetails.month')}>
            {PROFILE_EXPERIENCE_MONTH_LABELS.map((label, index) => {
              const month = index + 1;
              const active = focusMonth === month;
              return (
                <button
                  key={label}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    active
                      ? 'bg-background font-semibold text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                  )}
                  onClick={() => setFocusMonth(month)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </ScrollArea>
        <ScrollArea className="h-44">
          <div className="flex flex-col gap-0.5 p-1" role="listbox" aria-label={t('profile.experienceDetails.year')}>
            {YEAR_OPTIONS.map((year) => {
              const active = focusYear === year;
              return (
                <button
                  key={year}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    active
                      ? 'bg-background font-semibold text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
                  )}
                  onClick={() => setFocusYear(year)}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      {selectedKeys.length > 0 ? (
        <p className="mt-2 px-1 text-xs text-muted-foreground">
          {t('profile.experienceDetails.durationSelected', {
            value: formatDurationRange(selectedKeys),
          })}
        </p>
      ) : null}
    </div>
  );
}

export function ExperienceDetailsDialog({
  open,
  onOpenChange,
  profileId,
  onSaved,
}: ExperienceDetailsDialogProps) {
  const { t } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const lastSavedRef = useRef('');
  const entryIdRef = useRef<string | null>(null);
  const entriesRef = useRef<ExperienceEntry[]>([]);
  const draftRef = useRef<DraftState>(emptyDraft());
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const [entries, setEntries] = useState<ExperienceEntry[]>([]);
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [entryId, setEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [areasOpen, setAreasOpen] = useState(false);
  const [positionsOpen, setPositionsOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [companiesOpen, setCompaniesOpen] = useState(false);
  const [areasQuery, setAreasQuery] = useState('');
  const [positionsQuery, setPositionsQuery] = useState('');
  const [companiesQuery, setCompaniesQuery] = useState('');

  entryIdRef.current = entryId;
  entriesRef.current = entries;
  draftRef.current = draft;

  const formKey = serializeExperienceEntries(entries);
  const areaSuggestions = useMemo(
    () => filterExperienceOptions(areasQuery, PROFILE_EXPERIENCE_AREA_SEEDS, draft.areas),
    [areasQuery, draft.areas],
  );
  const positionSuggestions = useMemo(
    () =>
      filterExperienceOptions(positionsQuery, PROFILE_EXPERIENCE_POSITION_SEEDS, draft.positions),
    [positionsQuery, draft.positions],
  );
  const companySuggestions = useMemo(
    () =>
      filterExperienceOptions(companiesQuery, PROFILE_EXPERIENCE_COMPANY_SEEDS, draft.companies),
    [companiesQuery, draft.companies],
  );

  const areasQueryTrimmed = areasQuery.trim();
  const positionsQueryTrimmed = positionsQuery.trim();
  const companiesQueryTrimmed = companiesQuery.trim();
  const showAddArea =
    areasQueryTrimmed.length > 0 &&
    !areaSuggestions.some((name) => name.toLowerCase() === areasQueryTrimmed.toLowerCase()) &&
    !draft.areas.some((name) => name.toLowerCase() === areasQueryTrimmed.toLowerCase());
  const showAddPosition =
    positionsQueryTrimmed.length > 0 &&
    !positionSuggestions.some(
      (name) => name.toLowerCase() === positionsQueryTrimmed.toLowerCase(),
    ) &&
    !draft.positions.some((name) => name.toLowerCase() === positionsQueryTrimmed.toLowerCase());
  const showAddCompany =
    companiesQueryTrimmed.length > 0 &&
    !companySuggestions.some(
      (name) => name.toLowerCase() === companiesQueryTrimmed.toLowerCase(),
    ) &&
    !draft.companies.some((name) => name.toLowerCase() === companiesQueryTrimmed.toLowerCase());

  useEffect(() => {
    if (!open) return;
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [open]);

  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      setAutosaveStatus('idle');
      setAreasOpen(false);
      setPositionsOpen(false);
      setDurationOpen(false);
      setCompaniesOpen(false);
      setAreasQuery('');
      setPositionsQuery('');
      setCompaniesQuery('');
      return;
    }
    if (!profileId) return;

    let cancelled = false;
    const load = async () => {
      hydratedRef.current = false;
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('profile_experience_entries')
        .select('id, experiences')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        toast.error(t('profile.experienceDetails.loadFailed'));
        setLoading(false);
        return;
      }

      const nextEntries = parseExperienceEntries(data?.experiences);
      setEntryId(typeof data?.id === 'string' ? data.id : null);
      setEntries(nextEntries);
      setDraft(emptyDraft());
      lastSavedRef.current = serializeExperienceEntries(nextEntries);
      setLoading(false);
      hydratedRef.current = true;
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, profileId, t]);

  const persistEntries = async (
    nextEntries: ExperienceEntry[],
    options?: { force?: boolean },
  ): Promise<boolean> => {
    const serialized = serializeExperienceEntries(nextEntries);
    if (!options?.force && serialized === lastSavedRef.current) return true;

    setAutosaveStatus('saving');
    const payload = {
      profile_id: profileId,
      experiences: nextEntries.map((entry) => ({
        id: entry.id,
        areas: normalizeNameList(entry.areas),
        positions: normalizeNameList(entry.positions),
        companies: normalizeNameList(entry.companies),
        durationKeys: normalizeDurationKeys(entry.durationKeys),
      })),
      updated_at: new Date().toISOString(),
    };
    const currentId = entryIdRef.current;
    const { data, error } = currentId
      ? await (supabase as any)
          .from('profile_experience_entries')
          .update(payload)
          .eq('id', currentId)
          .select('id')
          .maybeSingle()
      : await (supabase as any)
          .from('profile_experience_entries')
          .upsert(payload, { onConflict: 'profile_id' })
          .select('id')
          .maybeSingle();

    if (error) {
      console.error(error);
      setAutosaveStatus('error');
      toast.error(t('profile.experienceDetails.saveFailed'));
      return false;
    }

    if (data?.id && typeof data.id === 'string') {
      setEntryId(data.id);
      entryIdRef.current = data.id;
    }
    lastSavedRef.current = serialized;
    setAutosaveStatus('saved');
    onSavedRef.current?.();
    return true;
  };

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!open) return;
    const timer = window.setTimeout(() => {
      void persistEntries(entriesRef.current);
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- persist on formKey only
  }, [formKey, open]);

  // Commit a complete draft into the experience list, then reset the sentence builder.
  useEffect(() => {
    if (!hydratedRef.current || !open) return;
    if (!experienceEntryComplete(draft)) return;
    const timer = window.setTimeout(() => {
      const committed: ExperienceEntry = {
        id: newExperienceDraftId(),
        areas: normalizeNameList(draftRef.current.areas),
        positions: normalizeNameList(draftRef.current.positions),
        companies: normalizeNameList(draftRef.current.companies),
        durationKeys: normalizeDurationKeys(draftRef.current.durationKeys),
      };
      if (!experienceEntryComplete(committed)) return;
      setEntries((current) => [...current, committed]);
      setDraft(emptyDraft());
      setAreasOpen(false);
      setPositionsOpen(false);
      setDurationOpen(false);
      setCompaniesOpen(false);
      setAreasQuery('');
      setPositionsQuery('');
      setCompaniesQuery('');
    }, COMMIT_MS);
    return () => window.clearTimeout(timer);
  }, [
    open,
    draft.areas,
    draft.positions,
    draft.companies,
    draft.durationKeys,
  ]);

  const flushAndClose = async () => {
    // If draft is complete at close, fold it in before save.
    let next = entriesRef.current;
    if (experienceEntryComplete(draftRef.current)) {
      const committed: ExperienceEntry = {
        id: newExperienceDraftId(),
        areas: normalizeNameList(draftRef.current.areas),
        positions: normalizeNameList(draftRef.current.positions),
        companies: normalizeNameList(draftRef.current.companies),
        durationKeys: normalizeDurationKeys(draftRef.current.durationKeys),
      };
      next = [...next, committed];
      setEntries(next);
      setDraft(emptyDraft());
    }
    await persistEntries(next, { force: true });
    onOpenChange(false);
  };

  const toggleName = (
    field: 'areas' | 'positions' | 'companies',
    name: string,
  ) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDraft((current) => {
      const list = current[field];
      const exists = list.some((item) => item.toLowerCase() === trimmed.toLowerCase());
      const nextList = exists
        ? list.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())
        : normalizeNameList([...list, trimmed]);
      return { ...current, [field]: nextList };
    });
  };

  const addCustomName = (
    field: 'areas' | 'positions' | 'companies',
    name: string,
    clearQuery: () => void,
  ) => {
    toggleName(field, name);
    clearQuery();
  };

  const toggleDuration = (year: number, month: number) => {
    const key = monthYearKey(year, month);
    setDraft((current) => {
      const exists = current.durationKeys.includes(key);
      const next = exists
        ? current.durationKeys.filter((item) => item !== key)
        : normalizeDurationKeys([...current.durationKeys, key]);
      return { ...current, durationKeys: next };
    });
  };

  const removeEntry = (id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  };

  if (!open) return null;

  const autosaveIcon =
    autosaveStatus === 'saving' ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
    ) : autosaveStatus === 'error' ? (
      <AlertCircle className="h-3.5 w-3.5 text-destructive" aria-hidden />
    ) : (
      <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
    );

  const autosaveLabel =
    autosaveStatus === 'saving'
      ? t('profile.experienceDetails.autoSaving')
      : autosaveStatus === 'error'
        ? t('profile.experienceDetails.saveFailed')
        : t('profile.experienceDetails.autoSaved');

  const areasEmpty = draft.areas.length === 0;
  const positionsEmpty = draft.positions.length === 0;
  const durationEmpty = draft.durationKeys.length === 0;
  const companiesEmpty = draft.companies.length === 0;
  const useBullets = entries.length > 1;

  return (
    <Card
      ref={cardRef}
      className="relative mt-3 w-full max-w-md overflow-visible border-border/80 shadow-soft"
    >
      <div className="pointer-events-none absolute left-3 top-0 z-10 -translate-y-1/2">
        <span className="bg-card px-1.5 font-display text-[11px] font-semibold tracking-wide text-muted-foreground">
          {t('profile.experienceDetails.title')}
        </span>
      </div>
      <div className="absolute right-3 top-0 z-10 flex -translate-y-1/2 items-center gap-1.5">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card shadow-soft"
          title={autosaveLabel}
          aria-label={autosaveLabel}
          role="status"
        >
          {autosaveIcon}
        </span>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-card shadow-soft transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('common.close')}
          onClick={() => void flushAndClose()}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <CardContent className="px-4 pb-4 pt-5">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {entries.length > 0 ? (
              <>
                <p className="text-sm leading-relaxed text-foreground">
                  {t('profile.experienceDetails.sentenceLead')}:
                </p>
                {useBullets ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
                    {entries.map((entry) => (
                      <li key={entry.id} className="relative pr-6">
                        <span>{formatExperienceLine(entry)}</span>
                        <button
                          type="button"
                          className="absolute right-0 top-0 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive"
                          aria-label={t('profile.experienceDetails.removeExperience')}
                          onClick={() => removeEntry(entry.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="relative pr-6 text-sm leading-relaxed text-foreground">
                    <span>{formatExperienceLine(entries[0])}.</span>
                    <button
                      type="button"
                      className="absolute right-0 top-0 inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive"
                      aria-label={t('profile.experienceDetails.removeExperience')}
                      onClick={() => removeEntry(entries[0].id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                )}
                <p className="text-xs font-medium text-muted-foreground">
                  {t('profile.experienceDetails.addAnother')}
                </p>
              </>
            ) : null}

            <p className="text-sm leading-relaxed text-foreground">
              {entries.length === 0 ? <>{t('profile.experienceDetails.sentenceLead')}{' '}</> : null}
              <SentenceToken
                open={areasOpen}
                onOpenChange={setAreasOpen}
                ariaLabel={t('profile.experienceDetails.areas')}
                empty={areasEmpty}
                panel={
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t('profile.experienceDetails.areasSearch')}
                      value={areasQuery}
                      onValueChange={setAreasQuery}
                    />
                    <CommandList>
                      <CommandEmpty>{t('profile.experienceDetails.areasEmpty')}</CommandEmpty>
                      <CommandGroup>
                        {showAddArea ? (
                          <CommandItem
                            value={`add-area-${areasQueryTrimmed}`}
                            onSelect={() =>
                              addCustomName('areas', areasQueryTrimmed, () => setAreasQuery(''))
                            }
                          >
                            <Plus className="mr-2 h-4 w-4 shrink-0 text-primary" />
                            {t('profile.experienceDetails.addArea', { name: areasQueryTrimmed })}
                          </CommandItem>
                        ) : null}
                        {areaSuggestions.map((name) => {
                          const selected = draft.areas.some(
                            (item) => item.toLowerCase() === name.toLowerCase(),
                          );
                          return (
                            <CommandItem
                              key={name}
                              value={name}
                              className={selectedOptionClass(selected)}
                              onSelect={() => {
                                toggleName('areas', name);
                                requestAnimationFrame(() => setAreasOpen(true));
                              }}
                            >
                              {name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                }
              >
                {areasEmpty
                  ? t('profile.experienceDetails.areasPlaceholder')
                  : formatEnglishList(draft.areas)}
              </SentenceToken>{' '}
              {t('profile.experienceDetails.sentenceAtPosition')}{' '}
              <SentenceToken
                open={positionsOpen}
                onOpenChange={setPositionsOpen}
                ariaLabel={t('profile.experienceDetails.positions')}
                empty={positionsEmpty}
                panel={
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t('profile.experienceDetails.positionsSearch')}
                      value={positionsQuery}
                      onValueChange={setPositionsQuery}
                    />
                    <CommandList>
                      <CommandEmpty>{t('profile.experienceDetails.positionsEmpty')}</CommandEmpty>
                      <CommandGroup>
                        {showAddPosition ? (
                          <CommandItem
                            value={`add-position-${positionsQueryTrimmed}`}
                            onSelect={() =>
                              addCustomName('positions', positionsQueryTrimmed, () =>
                                setPositionsQuery(''),
                              )
                            }
                          >
                            <Plus className="mr-2 h-4 w-4 shrink-0 text-primary" />
                            {t('profile.experienceDetails.addPosition', {
                              name: positionsQueryTrimmed,
                            })}
                          </CommandItem>
                        ) : null}
                        {positionSuggestions.map((name) => {
                          const selected = draft.positions.some(
                            (item) => item.toLowerCase() === name.toLowerCase(),
                          );
                          return (
                            <CommandItem
                              key={name}
                              value={name}
                              className={selectedOptionClass(selected)}
                              onSelect={() => {
                                toggleName('positions', name);
                                requestAnimationFrame(() => setPositionsOpen(true));
                              }}
                            >
                              {name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                }
              >
                {positionsEmpty
                  ? t('profile.experienceDetails.positionsPlaceholder')
                  : formatEnglishList(draft.positions)}
              </SentenceToken>{' '}
              {t('profile.experienceDetails.sentenceDuration')}{' '}
              <SentenceToken
                open={durationOpen}
                onOpenChange={setDurationOpen}
                ariaLabel={t('profile.experienceDetails.duration')}
                empty={durationEmpty}
                contentClassName="w-[min(20rem,calc(100vw-2rem))]"
                panel={
                  <MonthYearPicker
                    selectedKeys={draft.durationKeys}
                    onToggle={toggleDuration}
                  />
                }
              >
                {durationEmpty
                  ? t('profile.experienceDetails.durationPlaceholder')
                  : formatDurationRange(draft.durationKeys)}
              </SentenceToken>{' '}
              {t('profile.experienceDetails.sentenceWith')}{' '}
              <SentenceToken
                open={companiesOpen}
                onOpenChange={setCompaniesOpen}
                ariaLabel={t('profile.experienceDetails.companies')}
                empty={companiesEmpty}
                panel={
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t('profile.experienceDetails.companiesSearch')}
                      value={companiesQuery}
                      onValueChange={setCompaniesQuery}
                    />
                    <CommandList>
                      <CommandEmpty>{t('profile.experienceDetails.companiesEmpty')}</CommandEmpty>
                      <CommandGroup>
                        {showAddCompany ? (
                          <CommandItem
                            value={`add-company-${companiesQueryTrimmed}`}
                            onSelect={() =>
                              addCustomName('companies', companiesQueryTrimmed, () =>
                                setCompaniesQuery(''),
                              )
                            }
                          >
                            <Plus className="mr-2 h-4 w-4 shrink-0 text-primary" />
                            {t('profile.experienceDetails.addCompany', {
                              name: companiesQueryTrimmed,
                            })}
                          </CommandItem>
                        ) : null}
                        {companySuggestions.map((name) => {
                          const selected = draft.companies.some(
                            (item) => item.toLowerCase() === name.toLowerCase(),
                          );
                          return (
                            <CommandItem
                              key={name}
                              value={name}
                              className={selectedOptionClass(selected)}
                              onSelect={() => {
                                toggleName('companies', name);
                                requestAnimationFrame(() => setCompaniesOpen(true));
                              }}
                            >
                              {name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                }
              >
                {companiesEmpty
                  ? t('profile.experienceDetails.companiesPlaceholder')
                  : formatEnglishList(draft.companies)}
              </SentenceToken>
              .
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
