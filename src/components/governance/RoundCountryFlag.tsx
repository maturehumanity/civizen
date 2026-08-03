import { useEffect, useState } from 'react';

import { getCountryFlag, getCountryName } from '@/lib/countries';
import { cn } from '@/lib/utils';

type RoundCountryFlagProps = {
  countryCode: string;
  locale?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
};

function flagImageUrl(code: string): string {
  return `https://cdn.jsdelivr.net/gh/lipis/flag-icons@7.2.3/flags/1x1/${code.toLowerCase()}.svg`;
}

const SIZE_CLASS = {
  xs: 'h-3.5 w-3.5 text-[10px]',
  sm: 'h-4 w-4 text-xs',
  md: 'h-6 w-6 text-sm',
} as const;

/** Circular country flag with accessible country name. */
export function RoundCountryFlag({
  countryCode,
  locale = 'en',
  size = 'sm',
  className,
}: RoundCountryFlagProps) {
  const code = countryCode.trim().toUpperCase();
  const valid = /^[A-Z]{2}$/.test(code);
  const name = valid ? getCountryName(code, locale) : code || 'World';
  const sizeClass = SIZE_CLASS[size];
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [code]);

  if (!valid || imageFailed) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted leading-none ring-1 ring-border/60',
          sizeClass,
          className,
        )}
        title={name}
        aria-label={name}
      >
        <span className="block scale-110 leading-none" aria-hidden>
          {getCountryFlag(code)}
        </span>
      </span>
    );
  }

  return (
    <img
      key={code}
      src={flagImageUrl(code)}
      alt={name}
      title={name}
      loading="lazy"
      decoding="async"
      onError={() => setImageFailed(true)}
      className={cn(
        'inline-block shrink-0 rounded-full bg-muted object-cover ring-1 ring-border/60',
        sizeClass,
        className,
      )}
    />
  );
}
