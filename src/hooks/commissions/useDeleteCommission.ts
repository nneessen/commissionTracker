// src/hooks/commissions/useDeleteCommission.ts
import { useState } from 'react';
import { Commission } from '../../types/commission.types';
import { useLocalStorageState } from '../base/useLocalStorageState';

const COMMISSIONS_STORAGE_KEY = 'commissions';

export interface UseDeleteCommissionResult {
  deleteCommission: (id: string) => boolean;
  deleteMultipleCommissions: (ids: string[]) => number;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
}

export function useDeleteCommission(): UseDeleteCommissionResult {
  const [commissions, setCommissions] = useLocalStorageState<Commission[]>(COMMISSIONS_STORAGE_KEY, []);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteCommission = (id: string): boolean => {
    setIsDeleting(true);
    setError(null);

    try {
      const exists = commissions.some(c => c.id === id);

      if (!exists) {
        throw new Error('Commission not found');
      }

      setCommissions(prev => prev.filter(commission => commission.id !== id));

      setIsDeleting(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete commission';
      setError(errorMessage);
      setIsDeleting(false);
      return false;
    }
  };

  const deleteMultipleCommissions = (ids: string[]): number => {
    setIsDeleting(true);
    setError(null);

    try {
      const idsSet = new Set(ids);
      let deletedCount = 0;

      setCommissions(prev => {
        const newCommissions = prev.filter(commission => {
          const shouldDelete = idsSet.has(commission.id);
          if (shouldDelete) deletedCount++;
          return !shouldDelete;
        });
        return newCommissions;
      });

      if (deletedCount === 0) {
        setError('No commissions found to delete');
      }

      setIsDeleting(false);
      return deletedCount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete commissions';
      setError(errorMessage);
      setIsDeleting(false);
      return 0;
    }
  };

  const clearError = () => setError(null);

  return {
    deleteCommission,
    deleteMultipleCommissions,
    isDeleting,
    error,
    clearError,
  };
}