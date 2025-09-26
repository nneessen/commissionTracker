// /home/nneessen/projects/commissionTracker/src/hooks/policies/useDeletePolicy.ts

import { useState } from 'react';
import { Policy } from '../../types';
import { useLocalStorageState } from '../base/useLocalStorageState';

const STORAGE_KEY = 'policies';

export interface UseDeletePolicyResult {
  deletePolicy: (id: string) => boolean;
  deletePolicies: (ids: string[]) => boolean;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook for deleting policies
 * Follows React 19.1 best practices - no useCallback or useMemo needed
 */
export function useDeletePolicy(): UseDeletePolicyResult {
  const [policies, setPolicies] = useLocalStorageState<Policy[]>(STORAGE_KEY, []);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deletePolicy = (id: string): boolean => {
    setIsDeleting(true);
    setError(null);

    try {
      const policyExists = policies.some(p => p.id === id);

      if (!policyExists) {
        setError(`Policy with ID ${id} not found`);
        setIsDeleting(false);
        return false;
      }

      setPolicies(prev => prev.filter(policy => policy.id !== id));
      setIsDeleting(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete policy';
      setError(errorMessage);
      setIsDeleting(false);
      return false;
    }
  };

  const deletePolicies = (ids: string[]): boolean => {
    setIsDeleting(true);
    setError(null);

    try {
      const existingIds = new Set(policies.map(p => p.id));
      const invalidIds = ids.filter(id => !existingIds.has(id));

      if (invalidIds.length > 0) {
        setError(`Policies not found: ${invalidIds.join(', ')}`);
        setIsDeleting(false);
        return false;
      }

      const idsToDelete = new Set(ids);
      setPolicies(prev => prev.filter(policy => !idsToDelete.has(policy.id)));

      setIsDeleting(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete policies';
      setError(errorMessage);
      setIsDeleting(false);
      return false;
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    deletePolicy,
    deletePolicies,
    isDeleting,
    error,
    clearError
  };
}