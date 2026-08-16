import { Heart, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, type ReactNode } from 'react';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { SlowRunningText } from '@/components/ui/slow-running-text';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export function HappinessPrivateHint() {
  const { t } = useLanguage();
  const hint = t('happiness.privateHint');
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      aria-label={hint}
      aria-expanded={open}
      data-happiness-private-hint=""
      className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/20"
      onClick={() => setOpen((current) => !current)}
      onBlur={() => setOpen(false)}
    >
      <Lock className="h-4 w-4" aria-hidden />
      <span
        data-happiness-private-tooltip=""
        aria-hidden
        className={cn(
          'pointer-events-none absolute right-0 top-full z-50 mt-1 w-max max-w-[12rem] rounded-md border bg-popover px-2 py-1 text-left text-xs leading-snug text-popover-foreground shadow-sm',
          open
            ? 'block'
            : 'hidden [@media(hover:hover)]:group-hover:block [@media(hover:hover)]:group-focus-visible:block',
        )}
      >
        {hint}
      </span>
    </button>
  );
}

export function HappinessShell({
  children,
  subtitle,
  actions,
  fallbackPath = '/happiness',
  titleKey = 'happiness.navTitle',
  privateHint = false,
}: {
  children: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  fallbackPath?: string;
  titleKey?: string;
  privateHint?: boolean;
}) {
  const { t } = useLanguage();
  const titleText = t(titleKey);
  return (
    <AppLayout>
      <div
        className="mx-auto flex w-full max-w-lg flex-col gap-4 overflow-x-clip px-4 py-6"
        data-build-key={titleKey === 'happiness.navTitle' ? 'happinessPage' : undefined}
        data-build-label={titleKey === 'happiness.navTitle' ? 'Happiness and Fulfillment' : undefined}
      >
        <AppPageHeader
          title={<SlowRunningText text={titleText} onlyWhenOverflow className="min-w-0 flex-1" />}
          subtitle={subtitle}
          fallbackPath={fallbackPath}
          titleAccessory={privateHint ? <HappinessPrivateHint /> : undefined}
          leading={
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Heart className="h-6 w-6" aria-hidden />
            </div>
          }
          actions={actions}
        />
        {children}
      </div>
    </AppLayout>
  );
}

export function HappinessChoiceButton({
  selected,
  onClick,
  children,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
        selected
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-border/70 bg-card text-foreground hover:border-border',
        disabled && 'opacity-60',
      )}
    >
      {children}
    </button>
  );
}

export function HappinessQuietLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
      {children}
    </Link>
  );
}
