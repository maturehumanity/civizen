import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  agreementCreateMenuLabelKey,
  agreementTypeDefinition,
  agreementsCreatePath,
  filterAgreementCreateMenuTypes,
  type AgreementType,
} from '@/lib/agreements-model';
import { cn } from '@/lib/utils';

function canHoverOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function typeLabel(type: AgreementType, t: (key: string) => string) {
  const shortKey = agreementCreateMenuLabelKey(type);
  const short = t(shortKey);
  if (short !== shortKey) return short;
  return t(agreementTypeDefinition(type)?.labelKey || `agreements.types.${type}`);
}

export function AgreementCreateMenu() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [query, setQuery] = useState('');
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
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 160);
  };

  const closeMenu = () => {
    clearCloseTimer();
    setOpen(false);
    setShowMore(false);
    setQuery('');
  };

  const chooseType = (type: AgreementType, customType?: string) => {
    closeMenu();
    navigate(agreementsCreatePath({ agreementType: type, customType }));
  };

  const filtered = useMemo(
    () => filterAgreementCreateMenuTypes({
      query,
      showMore,
      labelFor: (type) => typeLabel(type, t),
    }),
    [query, showMore, t],
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        clearCloseTimer();
        setOpen(next);
        if (!next) {
          setShowMore(false);
          setQuery('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0 text-primary hover:bg-primary/10"
          aria-label={t('agreements.createAction')}
          aria-expanded={open}
          aria-haspopup="menu"
          title={t('agreements.createAction')}
          data-testid="agreements-create"
          onMouseEnter={() => {
            if (canHoverOpen()) openMenu();
          }}
          onMouseLeave={() => {
            if (canHoverOpen()) scheduleClose();
          }}
          onPointerDown={(event) => {
            event.preventDefault();
          }}
          onClick={(event) => {
            event.preventDefault();
            if (canHoverOpen()) {
              openMenu();
              return;
            }
            setOpen((current) => !current);
          }}
        >
          <Plus className="h-5 w-5" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[min(20rem,calc(100vw-2rem))] p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={() => {
          if (canHoverOpen()) openMenu();
        }}
        onMouseLeave={() => {
          if (canHoverOpen()) scheduleClose();
        }}
      >
        <div className="px-1 pb-1 pt-0.5">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('agreements.searchTypesPlaceholder')}
            aria-label={t('agreements.searchTypesPlaceholder')}
            data-testid="agreements-type-search"
            className="h-8 text-sm"
            onMouseDown={(event) => event.stopPropagation()}
          />
        </div>
        <div role="menu" aria-label={t('agreements.createAction')} className="flex flex-col">
          {filtered.types.map((type) => (
            <button
              key={type}
              type="button"
              role="menuitem"
              className={cn(
                'rounded-md px-2.5 py-2 text-left text-sm outline-none transition-colors',
                'text-foreground hover:bg-accent hover:text-accent-foreground',
              )}
              onClick={() => chooseType(type)}
            >
              {typeLabel(type, t)}
            </button>
          ))}
          {filtered.canAddCustom ? (
            <button
              type="button"
              role="menuitem"
              className="rounded-md px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
              data-testid="agreements-add-type"
              onClick={() => chooseType('custom', query.trim())}
            >
              {t('agreements.createCustomType', { name: query.trim() })}
            </button>
          ) : null}
          {filtered.showMoreItem ? (
            <button
              type="button"
              role="menuitem"
              className="rounded-md px-2.5 py-2 text-left text-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
              data-testid="agreements-more-types"
              onClick={() => setShowMore(true)}
            >
              {t('agreements.moreAgreementTypes')}
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
