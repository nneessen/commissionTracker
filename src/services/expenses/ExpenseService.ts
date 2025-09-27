// src/services/expenses/ExpenseService.ts
import { BaseService, ValidationRule } from '../base/BaseService';
import { ExpenseRepository } from './ExpenseRepository';
import { Expense, CreateExpenseData, UpdateExpenseData } from '../../types/expense.types';

export class ExpenseService extends BaseService<Expense, CreateExpenseData, UpdateExpenseData> {
  private expenseRepository: ExpenseRepository;

  constructor() {
    const repository = new ExpenseRepository();
    super(repository);
    this.expenseRepository = repository;
  }

  async getByCategory(category: string) {
    try {
      const expenses = await this.expenseRepository.findByCategory(category);
      return { data: expenses, success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
  }

  async getByDateRange(startDate: Date, endDate: Date) {
    try {
      const expenses = await this.expenseRepository.findByDateRange(startDate, endDate);
      return { data: expenses, success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
  }

  async getTotalByCategory(category: string) {
    try {
      const total = await this.expenseRepository.getTotalByCategory(category);
      return { data: total, success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
  }

  async getMonthlyTotals(year: number, month: number) {
    try {
      const totals = await this.expenseRepository.getMonthlyTotals(year, month);
      return { data: totals, success: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error', success: false };
    }
  }

  protected validateCreate(data: CreateExpenseData): { isValid: boolean; errors: string[] } {
    const rules: ValidationRule[] = [
      { field: 'name', required: true, type: 'string', minLength: 1, maxLength: 255 },
      { field: 'amount', required: true, type: 'number', min: 0 },
      { field: 'category', required: true, type: 'string', minLength: 1, maxLength: 100 },
      {
        field: 'expenseType',
        custom: (value) => {
          const validTypes = ['business', 'personal'];
          return validTypes.includes(value) || `Expense type must be one of: ${validTypes.join(', ')}`;
        }
      }
    ];

    return this.validate(data, rules);
  }

  protected validateUpdate(data: UpdateExpenseData): { isValid: boolean; errors: string[] } {
    const rules: ValidationRule[] = [
      { field: 'name', type: 'string', minLength: 1, maxLength: 255 },
      { field: 'amount', type: 'number', min: 0 },
      { field: 'category', type: 'string', minLength: 1, maxLength: 100 },
      {
        field: 'expenseType',
        custom: (value) => {
          if (value === undefined) return true;
          const validTypes = ['business', 'personal'];
          return validTypes.includes(value) || `Expense type must be one of: ${validTypes.join(', ')}`;
        }
      }
    ];

    return this.validate(data, rules);
  }
}

export const expenseService = new ExpenseService();