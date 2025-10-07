// src/services/expenses/expenseService.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { expenseService } from './expenseService';
import { supabase } from '../base/supabase';
import type { CreateExpenseData, Expense } from '../../types/expense.types';

// Mock Supabase
vi.mock('../base/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  TABLES: {
    EXPENSES: 'expenses',
  },
}));

describe('ExpenseService', () => {
  const mockExpenseDBRecord = {
    id: '123',
    user_id: 'user-1',
    agent_id: null,
    name: 'Office Supplies',
    description: 'Pens and paper',
    amount: '45.99',
    category: 'office' as const,
    expense_type: 'business' as const,
    expense_date: '2025-01-15',
    receipt_url: null,
    is_deductible: true,
    notes: null,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };

  const mockExpense: Expense = {
    id: '123',
    user_id: 'user-1',
    agent_id: null,
    name: 'Office Supplies',
    description: 'Pens and paper',
    amount: 45.99,
    category: 'office',
    expense_type: 'business',
    expense_date: '2025-01-15',
    receipt_url: null,
    is_deductible: true,
    notes: null,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all expenses successfully', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [mockExpenseDBRecord],
            error: null,
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await expenseService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject(mockExpense);
      expect(mockFrom).toHaveBeenCalledWith('expenses');
    });

    it('should filter by expense type', async () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue(mockQuery),
        }),
      });

      mockQuery.eq.mockResolvedValue({
        data: [mockExpenseDBRecord],
        error: null,
      });

      (supabase.from as any) = mockFrom;

      await expenseService.getAll({ expenseType: 'business' });

      expect(mockQuery.eq).toHaveBeenCalledWith('expense_type', 'business');
    });

    it('should handle errors', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      await expect(expenseService.getAll()).rejects.toThrow(
        'Failed to fetch expenses: Database error'
      );
    });
  });

  describe('create', () => {
    it('should create expense successfully', async () => {
      const newExpenseData: CreateExpenseData = {
        name: 'Office Supplies',
        description: 'Pens and paper',
        amount: 45.99,
        category: 'office',
        expense_type: 'business',
        expense_date: '2025-01-15',
        is_deductible: true,
      };

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockExpenseDBRecord,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await expenseService.create(newExpenseData);

      expect(result).toMatchObject(mockExpense);
    });

    it('should handle creation errors', async () => {
      const newExpenseData: CreateExpenseData = {
        name: 'Office Supplies',
        description: 'Pens and paper',
        amount: 45.99,
        category: 'office',
        expense_type: 'business',
        expense_date: '2025-01-15',
      };

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      await expect(expenseService.create(newExpenseData)).rejects.toThrow(
        'Failed to create expense: Insert failed'
      );
    });
  });

  describe('update', () => {
    it('should update expense successfully', async () => {
      const updates = { amount: 50.00 };

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockExpenseDBRecord, amount: '50.00' },
                error: null,
              }),
            }),
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      const result = await expenseService.update('123', updates);

      expect(result.amount).toBe(50.00);
    });
  });

  describe('delete', () => {
    it('should delete expense successfully', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      await expect(expenseService.delete('123')).resolves.not.toThrow();
    });

    it('should handle deletion errors', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Delete failed' },
          }),
        }),
      });
      (supabase.from as any) = mockFrom;

      await expect(expenseService.delete('123')).rejects.toThrow(
        'Failed to delete expense: Delete failed'
      );
    });
  });

  describe('getTotals', () => {
    it('should calculate totals correctly', async () => {
      const mockExpenses = [
        { amount: '100.00', expense_type: 'business', is_deductible: true },
        { amount: '50.00', expense_type: 'personal', is_deductible: false },
        { amount: '75.00', expense_type: 'business', is_deductible: true },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: mockExpenses,
          error: null,
        }),
      });
      (supabase.from as any) = mockFrom;

      // Mock getByDateRange for monthly calculation
      vi.spyOn(expenseService, 'getByDateRange').mockResolvedValue([mockExpense]);

      const result = await expenseService.getTotals();

      expect(result.total).toBe(225);
      expect(result.business).toBe(175);
      expect(result.personal).toBe(50);
      expect(result.deductible).toBe(175);
    });
  });
});
