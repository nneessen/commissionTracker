// src/hooks/expenses/useConstants.ts
import { logger } from '../../services/base/logger';
import { useState, useEffect } from 'react';
import { Constants } from '../../types/expense.types';
import { constantsService } from '../../services';

const DEFAULT_CONSTANTS: Constants = {
  avgAP: 15000,
  commissionRate: 0.2,
  target1: 4000,
  target2: 6500,
};

export interface UseConstantsResult {
  constants: Constants;
  updateConstant: (field: keyof Constants, value: number) => Promise<boolean>;
  resetConstants: () => Promise<boolean>;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  clearError: () => void;
  refresh: () => void;
}

export function useConstants(): UseConstantsResult {
  const [constants, setConstants] = useState<Constants>(DEFAULT_CONSTANTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load constants from database
  useEffect(() => {
    const loadConstants = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await constantsService.getAll();
        setConstants(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load constants');
        logger.error('Error loading constants', err instanceof Error ? err : String(err), 'Migration');
      } finally {
        setIsLoading(false);
      }
    };

    loadConstants();
  }, [refreshKey]);

  const updateConstant = async (field: keyof Constants, value: number): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    try {
      // Validate value
      if (value < 0) {
        throw new Error(`${field} cannot be negative`);
      }

      if (field === 'commissionRate' && (value < 0 || value > 1)) {
        throw new Error('Commission rate must be between 0 and 1');
      }

      await constantsService.setValue(field, value);

      // Update local state
      setConstants(prev => ({
        ...prev,
        [field]: value,
      }));

      setIsUpdating(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update constant';
      setError(errorMessage);
      setIsUpdating(false);
      return false;
    }
  };

  const resetConstants = async (): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    try {
      const updatedConstants = await constantsService.updateMultiple(Object.entries(DEFAULT_CONSTANTS).map(([key, value]) => ({ key, value })));
      setConstants(updatedConstants);
      setIsUpdating(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset constants';
      setError(errorMessage);
      setIsUpdating(false);
      return false;
    }
  };

  const clearError = () => setError(null);
  const refresh = () => setRefreshKey(key => key + 1);

  return {
    constants,
    updateConstant,
    resetConstants,
    isLoading,
    isUpdating,
    error,
    clearError,
    refresh,
  };
}