import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

import { cn } from '@/lib/utils';

type CivizenBrandIconProps = {
  className?: string;
  /** Prefer filled app tile (favicon-style). Default is transparent mark for chrome. */
  variant?: 'mark' | 'tile';
};

/**
 * Theme-aware Civizen mark — converted from the approved primary logo / icon art.
 * Light & dark PNGs keep transparent backgrounds for header chrome.
 */
export function CivizenBrandIcon({ className, variant = 'mark' }: CivizenBrandIconProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  const src =
    variant === 'tile'
      ? isDark
        ? '/brand/civizen-icon-full.svg'
        : '/brand/civizen-icon-light.svg'
      : isDark
        ? '/brand/civizen-mark-dark-256.png'
        : '/brand/civizen-mark-256.png';

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={cn('shrink-0 object-contain', className)}
    />
  );
}
