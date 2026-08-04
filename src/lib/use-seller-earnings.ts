import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import type { AgreementRow } from '@/lib/agreements';
import { isMissingAgreementsBackend } from '@/lib/agreements-backend';
import {
  filterSellerEarningsRows,
  summarizeSellerEarnings,
  type SellerEarningsFilter,
  type SellerEarningsSummary,
} from '@/lib/seller-earnings';

export function useSellerEarnings(profileId: string | undefined) {
  const [rows, setRows] = useState<AgreementRow[]>([]);
  const [loading, setLoading] = useState(Boolean(profileId));
  const [error, setError] = useState<string | null>(null);
  const [backendMissing, setBackendMissing] = useState(false);
  const [filter, setFilter] = useState<SellerEarningsFilter>('all');

  const refetch = useCallback(async () => {
    if (!profileId) {
      setRows([]);
      setLoading(false);
      setError(null);
      setBackendMissing(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: qError } = await supabase
      .from('agreements')
      .select('*')
      .eq('seller_profile_id', profileId)
      .order('created_at', { ascending: false });

    if (qError) {
      if (isMissingAgreementsBackend(qError)) {
        setBackendMissing(true);
        setError(null);
      } else {
        setBackendMissing(false);
        setError(qError.message);
      }
      setRows([]);
      setLoading(false);
      return;
    }

    setBackendMissing(false);
    setRows((data ?? []) as AgreementRow[]);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const summary: SellerEarningsSummary = useMemo(() => summarizeSellerEarnings(rows), [rows]);
  const filteredRows = useMemo(() => filterSellerEarningsRows(rows, filter), [rows, filter]);

  return {
    rows,
    filteredRows,
    summary,
    filter,
    setFilter,
    loading,
    error,
    backendMissing,
    refetch,
  };
}
