// src/hooks/commissions/useUpdateCommission.ts
import { useState } from 'react';
import { Commission } from '../../types/commission.types';
import { useLocalStorageState } from '../base/useLocalStorageState';
import { useCarriers } from '../useCarriers';

const COMMISSIONS_STORAGE_KEY = 'commissions';

export interface UseUpdateCommissionResult {
  updateCommission: (id: string, updates: Partial<Omit<Commission, 'id' | 'createdAt'>>) => boolean;
  isUpdating: boolean;
  error: string | null;
  clearError: () => void;
}

export function useUpdateCommission(): UseUpdateCommissionResult {
  const [commissions, setCommissions] = useLocalStorageState<Commission[]>(COMMISSIONS_STORAGE_KEY, []);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getCarrierById } = useCarriers();

  const updateCommission = (
    id: string,
    updates: Partial<Omit<Commission, 'id' | 'createdAt'>>
  ): boolean => {
    setIsUpdating(true);
    setError(null);

    try {
      const commissionIndex = commissions.findIndex(c => c.id === id);

      if (commissionIndex === -1) {
        throw new Error('Commission not found');
      }

      const currentCommission = commissions[commissionIndex];

      // If carrier or product is being updated, recalculate commission amount
      let updatedData = { ...updates };

      if (updates.carrierId || updates.product || updates.annualPremium !== undefined) {
        const carrierId = updates.carrierId || currentCommission.carrierId;
        const product = updates.product || currentCommission.product;
        const annualPremium = updates.annualPremium ?? currentCommission.annualPremium;

        const carrier = getCarrierById(carrierId);
        if (!carrier) {
          throw new Error('Carrier not found');
        }

        const commissionRate = carrier.commissionRates[product];
        if (commissionRate === undefined) {
          throw new Error(`No commission rate found for product ${product}`);
        }

        updatedData = {
          ...updatedData,
          commissionRate,
          commissionAmount: annualPremium * commissionRate,
        };
      }

      // Update commission
      setCommissions(prev => prev.map(comm =>
        comm.id === id
          ? { ...comm, ...updatedData, updatedAt: new Date() }
          : comm
      ));

      setIsUpdating(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update commission';
      setError(errorMessage);
      setIsUpdating(false);
      return false;
    }
  };

  const clearError = () => setError(null);

  return {
    updateCommission,
    isUpdating,
    error,
    clearError,
  };
}