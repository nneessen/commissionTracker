// src/hooks/commissions/useCommission.ts
import { useState, useEffect } from 'react';
import { Commission } from '../../types/commission.types';
import { commissionService } from '../../services';

export interface UseCommissionResult {
  commission: Commission | null;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  refresh: () => void;
}

export function useCommission(id: string): UseCommissionResult {
  const [commission, setCommission] = useState<Commission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadCommission = async () => {
      if (!id) {
        setCommission(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await commissionService.getById(id);
        setCommission(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load commission');
        console.error('Error loading commission:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCommission();
  }, [id, refreshKey]);

  const clearError = () => setError(null);
  const refresh = () => setRefreshKey(key => key + 1);

  return {
    commission,
    isLoading,
    error,
    clearError,
    refresh,
  };
}