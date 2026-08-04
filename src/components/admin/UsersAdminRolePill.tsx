import { useEffect, useRef, useState } from 'react';
import type { AppRole } from '@/lib/access-control';
import { manageableRoles, roleBadgeClassName } from '@/lib/users-admin';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function canHoverOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

type UsersAdminRolePillProps = {
  disabled?: boolean;
  role: AppRole;
  t: (key: string) => string;
  onRoleChange: (nextRole: AppRole) => void;
};

/** Role badge that opens a role menu on hover (fine pointers) or click (touch). */
export function UsersAdminRolePill({ disabled, role, t, onRoleChange }: UsersAdminRolePillProps) {
  const [open, setOpen] = useState(false);
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
    if (disabled) return;
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
        if (disabled) {
          setOpen(false);
          return;
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
            roleBadgeClassName[role],
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:opacity-90',
          )}
          aria-label={t(`admin.roles.${role}`)}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={(event) => {
            event.stopPropagation();
            if (disabled) return;
            if (!canHoverOpen()) setOpen((current) => !current);
          }}
          onMouseEnter={() => {
            if (canHoverOpen()) openMenu();
          }}
          onMouseLeave={() => {
            if (canHoverOpen()) scheduleClose();
          }}
        >
          {t(`admin.roles.${role}`)}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-44 p-1"
        onClick={(event) => event.stopPropagation()}
        onMouseEnter={() => {
          if (canHoverOpen()) openMenu();
        }}
        onMouseLeave={() => {
          if (canHoverOpen()) scheduleClose();
        }}
      >
        <div role="menu" className="flex flex-col gap-0.5">
          {manageableRoles.map((nextRole) => (
            <button
              key={nextRole}
              type="button"
              role="menuitem"
              className={cn(
                'rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent',
                nextRole === role && 'bg-accent/70 font-medium',
              )}
              onClick={(event) => {
                event.stopPropagation();
                if (nextRole === role) {
                  setOpen(false);
                  return;
                }
                onRoleChange(nextRole);
                setOpen(false);
              }}
            >
              {t(`admin.roles.${nextRole}`)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
