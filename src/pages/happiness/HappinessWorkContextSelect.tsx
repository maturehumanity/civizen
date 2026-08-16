import type { WorkContext } from '@/lib/work-fulfillment/types';

import { HappinessChoiceButton } from './HappinessShell';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function WorkContextSelect({
  t,
  legendKey,
  contexts,
  value,
  onChange,
}: {
  t: Translate;
  legendKey: string;
  contexts: WorkContext[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  const current = contexts.filter((context) => context.status === 'current');
  if (current.length < 2) return null;
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{t(legendKey)}</legend>
      {current.map((context) => (
        <HappinessChoiceButton key={context.id} selected={value === context.id} onClick={() => onChange(context.id)}>
          {context.roleTitle}
          {context.isPrimary ? ` · ${t('happiness.work.primaryShort')}` : ''}
          {` · ${t(`happiness.work.types.${context.workType}`)}`}
        </HappinessChoiceButton>
      ))}
    </fieldset>
  );
}
