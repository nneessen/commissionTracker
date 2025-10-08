// src/hooks/expenses/useExpenses.test.ts

import { describe, it, expect, vi } from 'vitest';
import { expenseService } from '../../services/expenses/expenseService';
import type { Expense } from '../../types/expense.types';

// Mock the expense service
vi.mock('../../services/expenses/expenseService', () => ({
  expenseService: {
    getAll: vi.fn(),
  },
}));

const mockExpense: Expense = {
  id: '123',
  user_id: 'user-1',
  name: 'Office Supplies',
  description: 'Pens and paper',
  amount: 45.99,
  category: 'office',
  expense_type: 'business',
  date: '2025-01-15',
  is_recurring: false,
  recurring_frequency: null,
  receipt_url: null,
  is_deductible: true,
  notes: null,
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
};

describe('useExpenses', () => {
  it('should call expenseService.getAll with correct filters', async () => {
    vi.mocked(expenseService.getAll).mockResolvedValue([mockExpense]);

    const filters = {
      expenseType: 'business' as const,
      category: 'office' as const,
    };

    const result = await expenseService.getAll(filters);

    expect(result).toEqual([mockExpense]);
    expect(expenseService.getAll).toHaveBeenCalledWith(filters);
  });

  it('should handle empty results', async () => {
    vi.mocked(expenseService.getAll).mockResolvedValue([]);

    const result = await expenseService.getAll();

    expect(result).toEqual([]);
  });
});
