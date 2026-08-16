import { useEffect, useRef, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  CIVI_AVATAR_OPTIONS,
  getCiviAvatarOption,
  getCiviAvatarUrl,
  setCiviAvatarId,
  useCiviAvatarId,
  type CiviAvatarId,
} from '@/lib/civi-avatar';
import { CIVI_ASSISTANT_DISPLAY_NAME } from '@/lib/messaging-constants';
import { cn } from '@/lib/utils';

function canHoverOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

type CiviAvatarProps = {
  className?: string;
  picker?: boolean;
};

export function CiviAvatar({ className, picker = true }: CiviAvatarProps) {
  const { t } = useLanguage();
  const selectedId = useCiviAvatarId();
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);
  const openedByHold = useRef(false);
  const alternatives = CIVI_AVATAR_OPTIONS.filter((option) => option.id !== selectedId);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    };
  }, []);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    if (!alternatives.length) return;
    clearCloseTimer();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 160);
  };

  const clearPressTimer = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const optionLabel = (id: CiviAvatarId) => {
    const option = getCiviAvatarOption(id);
    const translated = t(`chatBar.private.civiAvatar.${id}`);
    return translated === `chatBar.private.civiAvatar.${id}` ? option.label : translated;
  };

  const selectOption = (id: CiviAvatarId) => {
    setCiviAvatarId(id);
    clearCloseTimer();
    setOpen(false);
  };

  const mark = (
    <Avatar className={cn('h-9 w-9', className)}>
      <AvatarImage src={getCiviAvatarUrl(selectedId)} alt="" />
      <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
        {CIVI_ASSISTANT_DISPLAY_NAME.charAt(0)}
      </AvatarFallback>
    </Avatar>
  );

  if (!picker || alternatives.length === 0) {
    return mark;
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        clearCloseTimer();
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="civi-avatar"
          data-civi-avatar={selectedId}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t('chatBar.private.civiAvatar.switch', { name: optionLabel(selectedId) })}
          className="relative shrink-0 rounded-full"
          onClick={(event) => {
            event.stopPropagation();
            if (openedByHold.current) {
              openedByHold.current = false;
              return;
            }
            if (canHoverOpen()) return;
            setOpen((current) => !current);
          }}
          onMouseEnter={() => {
            if (canHoverOpen()) openMenu();
          }}
          onMouseLeave={() => {
            if (canHoverOpen()) scheduleClose();
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            if (canHoverOpen()) {
              event.preventDefault();
              return;
            }
            if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
            openedByHold.current = false;
            clearPressTimer();
            pressTimer.current = window.setTimeout(() => {
              openedByHold.current = true;
              openMenu();
            }, 420);
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            clearPressTimer();
          }}
          onPointerCancel={clearPressTimer}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && alternatives.length) {
              event.preventDefault();
              openMenu();
            }
          }}
        >
          {mark}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="center"
        sideOffset={6}
        className="flex w-auto gap-1 rounded-full p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseEnter={() => {
          if (canHoverOpen()) openMenu();
        }}
        onMouseLeave={() => {
          if (canHoverOpen()) scheduleClose();
        }}
      >
        <ul role="listbox" aria-label={t('chatBar.private.civiAvatar.options')} className="flex items-center gap-1">
          {alternatives.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                aria-label={t('chatBar.private.civiAvatar.use', { name: optionLabel(option.id) })}
                title={optionLabel(option.id)}
                className="h-8 w-8 overflow-hidden rounded-full ring-offset-background transition hover:ring-2 hover:ring-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={(event) => {
                  event.stopPropagation();
                  selectOption(option.id);
                }}
              >
                <img src={getCiviAvatarUrl(option.id)} alt="" className="h-full w-full" />
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

type CiviInboxRowProps = {
  label: string;
  selected?: boolean;
  onOpen: () => void;
};

export function CiviInboxRow({ label, selected = false, onOpen }: CiviInboxRowProps) {
  return (
    <div
      className={cn(
        'flex w-full items-stretch gap-2 border-b border-border px-2 hover:bg-muted/50',
        selected && 'bg-primary/15 ring-2 ring-inset ring-primary/40',
      )}
    >
      <div className="flex items-center py-2">
        <CiviAvatar className="h-9 w-9" />
      </div>
      <button type="button" className="min-w-0 flex-1 py-2 text-left" onClick={onOpen}>
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
      </button>
    </div>
  );
}

export function CiviAssistantHeading({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <span className={cn('inline-flex max-w-full flex-wrap items-center gap-x-1', className)}>
      <span className="truncate">{t('chatBar.private.civiPublic.titleBefore')}</span>
      <span className="inline-flex h-5 items-center rounded-md bg-primary px-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
        {t('chatBar.private.civiPublic.aiBadge')}
      </span>
      <span className="truncate">{t('chatBar.private.civiPublic.titleAfter')}</span>
    </span>
  );
}
