import { useState } from 'react';
import { dataMigrationService, MigrationResult } from '../../utils/dataMigration';

export interface UseMigrationResult {
  migrate: () => Promise<MigrationResult>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  clearLocalStorage: () => void;
  checkDatabaseEmpty: () => Promise<boolean>;
}

export function useMigration(): UseMigrationResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const migrate = async (): Promise<MigrationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await dataMigrationService.migrateFromLocalStorage();

      if (!result.success && result.errors.length > 0) {
        setError(result.errors.join('; '));
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Migration failed';
      setError(errorMessage);

      return {
        success: false,
        message: errorMessage,
        details: {
          policies: 0,
          commissions: 0,
          expenses: 0,
          carriers: 0,
          constants: 0,
        },
        errors: [errorMessage],
      };
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  const clearLocalStorage = () => {
    dataMigrationService.clearLocalStorageData();
  };

  const checkDatabaseEmpty = async (): Promise<boolean> => {
    return dataMigrationService.checkDatabaseEmpty();
  };

  return {
    migrate,
    isLoading,
    error,
    clearError,
    clearLocalStorage,
    checkDatabaseEmpty,
  };
}