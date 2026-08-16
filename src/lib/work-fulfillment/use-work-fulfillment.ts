import { useCallback, useEffect, useRef, useState } from 'react';

import { loadWorkFulfillmentWorkspace, type WorkFulfillmentLoadResult } from './workspace';

export function useWorkFulfillmentWorkspace(profileId: string | null | undefined) {
  const [result, setResult] = useState<WorkFulfillmentLoadResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const reload = useCallback(async () => {
    if (!profileId) {
      setResult(null);
      setLoading(false);
      hasLoadedRef.current = false;
      return;
    }
    if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    try {
      setResult(await loadWorkFulfillmentWorkspace(profileId));
      hasLoadedRef.current = true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load Work Fulfillment.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { result, loading, error, reload };
}
