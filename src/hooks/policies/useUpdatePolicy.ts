// /home/nneessen/projects/commissionTracker/src/hooks/policies/useUpdatePolicy.ts

import { useState } from 'react';
import { Policy, PolicyStatus, NewPolicyForm } from '../../types';
import { useLocalStorageState } from '../base/useLocalStorageState';

const STORAGE_KEY = 'policies';

export interface UseUpdatePolicyResult {
  updatePolicy: (id: string, updates: Partial<Policy> | NewPolicyForm) => boolean;
  updatePolicyStatus: (id: string, status: PolicyStatus) => boolean;
  isUpdating: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook for updating existing policies
 * Follows React 19.1 best practices - no useCallback or useMemo needed
 */
export function useUpdatePolicy(): UseUpdatePolicyResult {
  const [policies, setPolicies] = useLocalStorageState<Policy[]>(STORAGE_KEY, []);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePolicy = (id: string, updates: Partial<Policy> | NewPolicyForm): boolean => {
    setIsUpdating(true);
    setError(null);

    try {
      // Check if policy exists
      const policyExists = policies.some(p => p.id === id);
      if (!policyExists) {
        setError(`Policy with ID ${id} not found`);
        setIsUpdating(false);
        return false;
      }

      // If updates is NewPolicyForm, check for duplicate policy numbers
      if ('clientName' in updates) {
        const formData = updates as NewPolicyForm;
        const isDuplicate = policies.some(p =>
          p.policyNumber === formData.policyNumber && p.id !== id
        );

        if (isDuplicate) {
          setError(`Policy number ${formData.policyNumber} already exists`);
          setIsUpdating(false);
          return false;
        }

        // Transform NewPolicyForm to Policy updates
        setPolicies(prev => prev.map(policy => {
          if (policy.id !== id) return policy;

          const effectiveDate = new Date(formData.effectiveDate);
          const expirationDate = formData.expirationDate
            ? new Date(formData.expirationDate)
            : formData.termLength
            ? new Date(new Date(formData.effectiveDate).setFullYear(
                new Date(formData.effectiveDate).getFullYear() + formData.termLength
              ))
            : undefined;

          return {
            ...policy,
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
            effectiveDate,
            termLength: formData.termLength,
            expirationDate,
            annualPremium: formData.annualPremium ?? policy.annualPremium,
            paymentFrequency: formData.paymentFrequency,
            commissionPercentage: formData.commissionPercentage,
            notes: formData.notes,
            updatedAt: new Date(),
          };
        }));
      } else {
        // Handle partial Policy updates
        setPolicies(prev => prev.map(policy => {
          if (policy.id !== id) return policy;

          return {
            ...policy,
            ...updates,
            id, // Ensure ID cannot be changed
            updatedAt: new Date()
          };
        }));
      }

      setIsUpdating(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update policy';
      setError(errorMessage);
      setIsUpdating(false);
      return false;
    }
  };

  const updatePolicyStatus = (id: string, status: PolicyStatus): boolean => {
    return updatePolicy(id, { status });
  };

  const clearError = () => {
    setError(null);
  };

  return {
    updatePolicy,
    updatePolicyStatus,
    isUpdating,
    error,
    clearError
  };
}