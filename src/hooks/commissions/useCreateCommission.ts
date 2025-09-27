// src/hooks/commissions/useCreateCommission.ts
import { useState } from 'react';
import { Commission, NewCommissionForm } from '../../types/commission.types';
import { commissionService } from '../../services';
import { useCarriers } from '../useCarriers';

export interface UseCreateCommissionResult {
  createCommission: (formData: NewCommissionForm) => Promise<Commission | null>;
  isCreating: boolean;
  error: string | null;
  clearError: () => void;
}

export function useCreateCommission(): UseCreateCommissionResult {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getCarrierById } = useCarriers();

  const createCommission = async (formData: NewCommissionForm): Promise<Commission | null> => {
    setIsCreating(true);
    setError(null);

    try {
      // Validate carrier exists
      const carrier = getCarrierById(formData.carrierId);
      if (!carrier) {
        throw new Error('Carrier not found');
      }

      // TODO: Update commission rate lookup to use new product/commission rate structure
      const commissionRate = 0.1; // Temporary default rate - needs to be updated for new architecture

      // Calculate commission amount
      const commissionAmount = formData.annualPremium * commissionRate;

      // Create commission data
      const commissionData = {
        policyId: formData.policyId,
        client: {
          firstName: formData.clientName?.split(' ')[0] || '',
          lastName: formData.clientName?.split(' ').slice(1).join(' ') || '',
          email: '',
          phone: '',
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
      };

      // Create via service
      const newCommission = await commissionService.create(commissionData);
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