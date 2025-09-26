// src/hooks/commissions/useCommission.ts
import { useState, useEffect } from 'react';
import { Commission } from '../../types/commission.types';
import { useLocalStorageState } from '../base/useLocalStorageState';

const COMMISSIONS_STORAGE_KEY = 'commissions';

export interface UseCommissionResult {
  commission: Commission | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCommission(id: string): UseCommissionResult {
  const [commissions] = useLocalStorageState<Commission[]>(COMMISSIONS_STORAGE_KEY, []);
  const [commission, setCommission] = useState<Commission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const found = commissions.find(c => c.id === id);

    if (found) {
      // Parse dates
      const parsedCommission = {
        ...found,
        expectedDate: found.expectedDate ? new Date(found.expectedDate) : undefined,
        actualDate: found.actualDate ? new Date(found.actualDate) : undefined,
        paidDate: found.paidDate ? new Date(found.paidDate) : undefined,
        createdAt: new Date(found.createdAt),
        updatedAt: found.updatedAt ? new Date(found.updatedAt) : undefined,
      };
      setCommission(parsedCommission);
    } else {
      setCommission(null);
      setError('Commission not found');
    }

    setIsLoading(false);
  }, [id, commissions, refreshKey]);

  const refresh = () => setRefreshKey(key => key + 1);

  return {
    commission,
    isLoading,
    error,
    refresh,
  };
}