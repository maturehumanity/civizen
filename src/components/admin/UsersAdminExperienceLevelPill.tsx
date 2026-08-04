import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  type UserExperienceLevel,
  userExperienceLevelClassMap,
  userExperienceLevelIconMap,
  userExperienceLevelLabelMap,
  userExperienceLevels,
} from '@/lib/users-admin';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function canHoverOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

type UsersAdminExperienceLevelPillProps = {
  disabled?: boolean;
  level: UserExperienceLevel;
  saving?: boolean;
  t: (key: string) => string;
  onLevelChange: (nextLevel: UserExperienceLevel) => void;
};

/** Experience-level badge under the avatar; opens a level menu on hover or click. */
export function UsersAdminExperienceLevelPill({
  disabled,
  level,
  saving,
  t,
  onLevelChange,
}: UsersAdminExperienceLevelPillProps) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const LevelIcon = userExperienceLevelIconMap[level];

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
    if (disabled || saving) return;
    clearCloseTimer();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 160);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        clearCloseTimer();
        if (disabled || saving) {
          setOpen(false);
          return;
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || saving}
          className={cn(
            'inline-flex items-center justify-start gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors',
            userExperienceLevelClassMap[level],
            disabled || saving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:opacity-90',
          )}
          aria-label={userExperienceLevelLabelMap[level]}
          aria-expanded={open}
          aria-haspopup="menu"
          title={t('admin.users.levelCycleHint')}
          onClick={(event) => {
            event.stopPropagation();
            if (disabled || saving) return;
            if (!canHoverOpen()) setOpen((current) => !current);
          }}
          onMouseEnter={() => {
            if (canHoverOpen()) openMenu();
          }}
          onMouseLeave={() => {
            if (canHoverOpen()) scheduleClose();
          }}
        >
          {saving ? (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
          ) : (
            <LevelIcon className="h-3 w-3 shrink-0" />
          )}
          <span className="truncate">{userExperienceLevelLabelMap[level]}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-40 p-1"
        onClick={(event) => event.stopPropagation()}
        onMouseEnter={() => {
          if (canHoverOpen()) openMenu();
        }}
        onMouseLeave={() => {
          if (canHoverOpen()) scheduleClose();
        }}
      >
        <div role="menu" className="flex flex-col gap-0.5">
          {userExperienceLevels.map((nextLevel) => {
            const OptionIcon = userExperienceLevelIconMap[nextLevel];
            return (
              <button
                key={nextLevel}
                type="button"
                role="menuitem"
                className={cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent',
                  nextLevel === level && 'bg-accent/70 font-medium',
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  if (nextLevel === level) {
                    setOpen(false);
                    return;
                  }
                  onLevelChange(nextLevel);
                  setOpen(false);
                }}
              >
                <OptionIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {userExperienceLevelLabelMap[nextLevel]}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
