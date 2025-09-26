// /home/nneessen/projects/commissionTracker/src/hooks/policies/useCreatePolicy.ts

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Policy, NewPolicyForm } from '../../types';
import { useLocalStorageState } from '../base/useLocalStorageState';

const STORAGE_KEY = 'policies';

export interface UseCreatePolicyResult {
  createPolicy: (form: NewPolicyForm) => Policy | null;
  isCreating: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook for creating new policies with validation
 * Follows React 19.1 best practices - no useCallback or useMemo needed
 */
export function useCreatePolicy(): UseCreatePolicyResult {
  const [policies, setPolicies] = useLocalStorageState<Policy[]>(STORAGE_KEY, []);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPolicy = (formData: NewPolicyForm): Policy | null => {
    setIsCreating(true);
    setError(null);

    try {
      // Validate policy number uniqueness
      const isDuplicate = policies.some(p => p.policyNumber === formData.policyNumber);
      if (isDuplicate) {
        setError(`Policy number ${formData.policyNumber} already exists`);
        setIsCreating(false);
        return null;
      }

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

      // Create the new policy
      const newPolicy: Policy = {
        id: uuidv4(),
        policyNumber: formData.policyNumber,
        status: formData.status,
        client: {
          name: formData.clientName,
          state: formData.clientState,
          age: formData.clientAge,
          email: formData.clientEmail,
          phone: formData.clientPhone,
        },
        carrierId: formData.carrierId,
        product: formData.product,
        effectiveDate: new Date(formData.effectiveDate),
        termLength: formData.termLength,
        expirationDate,
        annualPremium: formData.annualPremium ?? 0,
        paymentFrequency: formData.paymentFrequency,
        commissionPercentage: formData.commissionPercentage,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: formData.notes,
      };

      // Add to policies array
      setPolicies(prev => [...prev, newPolicy]);

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