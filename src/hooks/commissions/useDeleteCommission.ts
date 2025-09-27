// src/hooks/commissions/useDeleteCommission.ts
import { useState } from 'react';
import { commissionService } from '../../services';

export interface UseDeleteCommissionResult {
  deleteCommission: (id: string) => Promise<boolean>;
  deleteMultipleCommissions: (ids: string[]) => Promise<number>;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
}

export function useDeleteCommission(): UseDeleteCommissionResult {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteCommission = async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      await commissionService.delete(id);
      setIsDeleting(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete commission';
      setError(errorMessage);
      setIsDeleting(false);
      return false;
    }
  };

  const deleteMultipleCommissions = async (ids: string[]): Promise<number> => {
    setIsDeleting(true);
    setError(null);

    try {
      let deletedCount = 0;

      for (const id of ids) {
        try {
          await commissionService.delete(id);
          deletedCount++;
        } catch (err) {
          console.error(`Failed to delete commission ${id}:`, err);
        }
      }

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