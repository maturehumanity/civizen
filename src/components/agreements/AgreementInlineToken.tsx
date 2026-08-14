import type { KeyboardEvent } from 'react';

import { cn } from '@/lib/utils';

type AgreementFitInputProps = {
  id: string;
  value: string;
  placeholder: string;
  ariaLabel?: string;
  testId: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
};

/** Inline input that is only as wide as its value or placeholder. */
export function AgreementFitInput({
  id,
  value,
  placeholder,
  ariaLabel,
  testId,
  onChange,
  onBlur,
  onKeyDown,
  autoFocus,
}: AgreementFitInputProps) {
  const empty = value.length === 0;
  const fitText = empty ? placeholder : value;

  return (
    <span
      className={cn(
        'inline-grid max-w-full align-baseline items-baseline border-b border-dashed',
        empty ? 'border-primary/70' : 'border-foreground/40',
      )}
    >
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 whitespace-pre font-medium leading-[inherit]"
      >
        {fitText || '\u00a0'}
      </span>
      <input
        id={id}
        data-testid={testId}
        aria-label={ariaLabel || placeholder}
        value={value}
        placeholder={placeholder}
        size={1}
        autoComplete="off"
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={cn(
          'col-start-1 row-start-1 m-0 h-auto min-h-0 w-full min-w-0 appearance-none border-0 bg-transparent p-0 font-medium leading-[inherit] outline-none [field-sizing:content] focus:outline-none',
          empty ? 'text-primary placeholder:text-primary/70' : 'text-foreground',
        )}
      />
    </span>
  );
}

type AgreementInlineTokenProps = {
  id: string;
  value: string;
  placeholder: string;
  ariaLabel?: string;
  kind?: 'text' | 'date' | 'multiline';
  onChange: (value: string) => void;
};

export function AgreementInlineToken({
  id,
  value,
  placeholder,
  ariaLabel,
  kind = 'text',
  onChange,
}: AgreementInlineTokenProps) {
  const empty = !value.trim();
  const shared = cn(
    'border-0 border-b border-dashed bg-transparent font-medium leading-[inherit] focus:border-solid focus:outline-none',
    empty ? 'border-primary/70 text-primary placeholder:text-primary/70' : 'border-foreground/40 text-foreground',
  );

  if (kind === 'multiline') {
    return (
      <textarea
        id={`agreement-token-${id}`}
        aria-label={ariaLabel || placeholder}
        data-testid={`agreement-token-${id}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className={cn(
          shared,
          'mt-1 block min-h-[3.25rem] w-full resize-y px-0 font-normal leading-relaxed',
        )}
      />
    );
  }

  return (
    <AgreementFitInput
      id={`agreement-token-${id}`}
      testId={`agreement-token-${id}`}
      value={value}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      onChange={onChange}
    />
  );
}
