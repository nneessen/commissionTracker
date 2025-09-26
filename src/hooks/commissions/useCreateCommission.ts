// src/hooks/commissions/useCreateCommission.ts
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Commission, NewCommissionForm } from '../../types/commission.types';
import { useLocalStorageState } from '../base/useLocalStorageState';
import { useCarriers } from '../useCarriers';

const COMMISSIONS_STORAGE_KEY = 'commissions';

export interface UseCreateCommissionResult {
  createCommission: (formData: NewCommissionForm) => Commission | null;
  isCreating: boolean;
  error: string | null;
  clearError: () => void;
}

export function useCreateCommission(): UseCreateCommissionResult {
  const [commissions, setCommissions] = useLocalStorageState<Commission[]>(COMMISSIONS_STORAGE_KEY, []);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getCarrierById } = useCarriers();

  const createCommission = (formData: NewCommissionForm): Commission | null => {
    setIsCreating(true);
    setError(null);

    try {
      // Validate carrier exists
      const carrier = getCarrierById(formData.carrierId);
      if (!carrier) {
        throw new Error('Carrier not found');
      }

      // Get commission rate for the product
      const commissionRate = carrier.commissionRates[formData.product];
      if (commissionRate === undefined) {
        throw new Error(`No commission rate found for product ${formData.product}`);
      }

      // Calculate commission amount
      const commissionAmount = formData.annualPremium * commissionRate;

      // Create new commission
      const newCommission: Commission = {
        id: uuidv4(),
        policyId: formData.policyId,
        client: {
          name: formData.clientName,
          age: formData.clientAge,
          state: formData.clientState,
        },
        carrierId: formData.carrierId,
        product: formData.product,
        type: formData.type || 'first_year',
        status: formData.status || 'pending',
        calculationBasis: formData.calculationBasis || 'premium',
        annualPremium: formData.annualPremium,
        commissionAmount,
        commissionRate,
        expectedDate: formData.expectedDate ? new Date(formData.expectedDate) : new Date(),
        actualDate: formData.actualDate ? new Date(formData.actualDate) : undefined,
        paidDate: formData.paidDate ? new Date(formData.paidDate) : undefined,
        notes: formData.notes,
        createdAt: new Date(),
      };

      // Add to storage
      setCommissions(prev => [newCommission, ...prev]);

      setIsCreating(false);
      return newCommission;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create commission';
      setError(errorMessage);
      setIsCreating(false);
      return null;
    }
  };

  const clearError = () => setError(null);

  return {
    createCommission,
    isCreating,
    error,
    clearError,
  };
}