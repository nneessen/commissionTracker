// /home/nneessen/projects/commissionTracker/src/hooks/policies/usePolicy.ts

import { useState, useEffect } from 'react';
import { Policy } from '../../types';
import { useLocalStorageState } from '../base/useLocalStorageState';

const STORAGE_KEY = 'policies';

export interface UsePolicyResult {
  policy: Policy | null;
  isLoading: boolean;
  error: string | null;
  exists: boolean;
  refresh: () => void;
}

/**
 * Hook for getting a single policy by ID
 * Follows React 19.1 best practices - no useCallback or useMemo needed
 */
export function usePolicy(id: string | undefined): UsePolicyResult {
  const [policies] = useLocalStorageState<Policy[]>(STORAGE_KEY, []);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    if (!id) {
      setPolicy(null);
      setIsLoading(false);
      return;
    }

    const foundPolicy = policies.find(p => p.id === id);

    if (!foundPolicy) {
      setPolicy(null);
      setError(`Policy with ID ${id} not found`);
      setIsLoading(false);
      return;
    }

    // Parse dates
    const parsedPolicy = {
      ...foundPolicy,
      effectiveDate: new Date(foundPolicy.effectiveDate),
      expirationDate: foundPolicy.expirationDate ? new Date(foundPolicy.expirationDate) : undefined,
      createdAt: new Date(foundPolicy.createdAt),
      updatedAt: foundPolicy.updatedAt ? new Date(foundPolicy.updatedAt) : new Date(foundPolicy.createdAt)
    };

    setPolicy(parsedPolicy);
    setIsLoading(false);
  }, [id, policies, refreshKey]);

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return {
    policy,
    isLoading,
    error,
    exists: policy !== null,
    refresh
  };
}