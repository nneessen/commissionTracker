// src/hooks/expenses/useConstants.ts
import { useState } from 'react';
import { Constants } from '../../types/expense.types';
import { useLocalStorageState } from '../base/useLocalStorageState';

const CONSTANTS_STORAGE_KEY = 'constants';

const DEFAULT_CONSTANTS: Constants = {
  avgAP: 15000,
  commissionRate: 0.2,
  target1: 4000,
  target2: 6500,
};

export interface UseConstantsResult {
  constants: Constants;
  updateConstant: (field: keyof Constants, value: number) => void;
  resetConstants: () => void;
  isUpdating: boolean;
  error: string | null;
  clearError: () => void;
}

export function useConstants(): UseConstantsResult {
  const [constants, setConstants] = useLocalStorageState<Constants>(CONSTANTS_STORAGE_KEY, DEFAULT_CONSTANTS);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateConstant = (field: keyof Constants, value: number) => {
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

      setConstants(prev => ({
        ...prev,
        [field]: value,
      }));

      setIsUpdating(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update constant';
      setError(errorMessage);
      setIsUpdating(false);
    }
  };

  const resetConstants = () => {
    setConstants(DEFAULT_CONSTANTS);
  };

  const clearError = () => setError(null);

  return {
    constants,
    updateConstant,
    resetConstants,
    isUpdating,
    error,
    clearError,
  };
}