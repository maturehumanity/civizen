import { useEffect, useState } from 'react';

import type { HappinessLevel } from '@/lib/happiness/types';
import { loadHappinessShortcutLevel } from '@/lib/happiness/workspace';

/** Home Score-card icon. Loads the latest snapshot level only. */
export function useHappinessShortcutLevel(profileId: string | null | undefined) {
  const [level, setLevel] = useState<HappinessLevel | null>(null);
  const [loading, setLoading] = useState(Boolean(profileId));

  useEffect(() => {
    if (!profileId) {
      setLevel(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadHappinessShortcutLevel(profileId)
      .then((next) => {
        if (!cancelled) setLevel(next);
      })
      .catch(() => {
        if (!cancelled) setLevel(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return { level, loading };
}
