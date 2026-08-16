import { useCallback, useEffect, useState } from 'react';

import { loadHappinessWorkspace, type HappinessLoadResult } from '@/lib/happiness/api';
import { emptyHappinessView } from '@/lib/happiness/model';
import { DEFAULT_HAPPINESS_PRIVACY } from '@/lib/happiness/privacy';

const emptyResult = (profileId: string): HappinessLoadResult => ({
  view: emptyHappinessView(),
  privacy: {
    profileId,
    ...DEFAULT_HAPPINESS_PRIVACY,
    updatedAt: new Date().toISOString(),
  },
  checkIns: [],
  pulses: [],
  reviews: [],
  causes: [],
  actions: [],
  outcomes: [],
  selections: [],
  backendMissing: false,
});

export function useHappinessWorkspace(profileId: string | null | undefined) {
  const [result, setResult] = useState<HappinessLoadResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!profileId) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await loadHappinessWorkspace(profileId);
      setResult(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load Happiness.');
      setResult(emptyResult(profileId));
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { result, loading, error, reload };
}
