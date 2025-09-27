// src/hooks/expenses/useDeleteExpense.ts
import { useState } from 'react';
import { expenseService } from '../../services';

export interface UseDeleteExpenseResult {
  deleteExpense: (id: string) => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
}

export function useDeleteExpense(): UseDeleteExpenseResult {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteExpense = async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      await expenseService.delete(id);
      setIsDeleting(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete expense';
      setError(errorMessage);
      setIsDeleting(false);
      return false;
    }
  };

  const clearError = () => setError(null);

  return {
    deleteExpense,
    isDeleting,
    error,
    clearError,
  };
}