// /home/nneessen/projects/commissionTracker/src/hooks/policies/useCreatePolicy.ts

import { useState } from 'react';
import { Policy, NewPolicyForm } from '../../types';
import { policyService, CreatePolicyData } from '../../services';

export interface UseCreatePolicyResult {
  createPolicy: (form: NewPolicyForm) => Promise<Policy | null>;
  isCreating: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook for creating new policies with validation
 * Follows React 19.1 best practices - no useCallback or useMemo needed
 */
export function useCreatePolicy(): UseCreatePolicyResult {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPolicy = async (formData: NewPolicyForm): Promise<Policy | null> => {
    setIsCreating(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.clientName || !formData.clientState || !formData.carrierId) {
        setError('Missing required fields');
        setIsCreating(false);
        return null;
      }

      // Validate dates
      const effectiveDate = new Date(formData.effectiveDate);
      let expirationDate: Date | undefined;
      if (formData.expirationDate) {
        expirationDate = new Date(formData.expirationDate);
      } else if (formData.termLength) {
        // Create new date from effective date and add term length
        expirationDate = new Date(formData.effectiveDate);
        expirationDate.setFullYear(expirationDate.getFullYear() + formData.termLength);
      }

      if (isNaN(effectiveDate.getTime())) {
        setError('Invalid effective date');
        setIsCreating(false);
        return null;
      }

      if (expirationDate && effectiveDate >= expirationDate) {
        setError('Effective date must be before expiration date');
        setIsCreating(false);
        return null;
      }

      // Prepare data for service
      const policyData: CreatePolicyData = {
        policyNumber: formData.policyNumber,
        client: {
          name: formData.clientName,
          age: formData.clientAge,
          firstName: formData.clientName?.split(' ')[0] || '',
          lastName: formData.clientName?.split(' ').slice(1).join(' ') || '',
          email: formData.clientEmail,
          phone: formData.clientPhone,
          state: formData.clientState,
        },
        carrierId: formData.carrierId,
        product: formData.product,
        effectiveDate,
        termLength: formData.termLength,
        expirationDate,
        annualPremium: formData.annualPremium ?? 0,
        paymentFrequency: formData.paymentFrequency,
        commissionPercentage: formData.commissionPercentage,
        notes: formData.notes,
      };

      // Create policy via service
      const newPolicy = await policyService.create(policyData);
      setIsCreating(false);
      return newPolicy;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create policy';
      setError(errorMessage);
      setIsCreating(false);
      return null;
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    createPolicy,
    isCreating,
    error,
    clearError
  };
}