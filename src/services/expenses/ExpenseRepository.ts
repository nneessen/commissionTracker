// src/services/expenses/ExpenseRepository.ts
import { BaseRepository } from '../base/BaseRepository';
import { TABLES } from '../base/supabase';
import { Expense, CreateExpenseData, UpdateExpenseData } from '../../types/expense.types';

export class ExpenseRepository extends BaseRepository<Expense, CreateExpenseData, UpdateExpenseData> {
  constructor() {
    super(TABLES.EXPENSES);
  }

  async findByCategory(category: string): Promise<Expense[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) {
        throw this.handleError(error, 'findByCategory');
      }

      return data?.map(this.transformFromDB) || [];
    } catch (error) {
      throw this.wrapError(error, 'findByCategory');
    }
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw this.handleError(error, 'findByDateRange');
      }

      return data?.map(this.transformFromDB) || [];
    } catch (error) {
      throw this.wrapError(error, 'findByDateRange');
    }
  }

  async getTotalByCategory(category: string): Promise<number> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select('amount')
        .eq('category', category);

      if (error) {
        throw this.handleError(error, 'getTotalByCategory');
      }

      return data?.reduce((total, expense) => total + parseFloat(expense.amount || '0'), 0) || 0;
    } catch (error) {
      throw this.wrapError(error, 'getTotalByCategory');
    }
  }

  async getMonthlyTotals(year: number, month: number): Promise<{
    totalExpenses: number;
    categoryBreakdown: Record<string, number>;
    businessExpenses: number;
    personalExpenses: number;
  }> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const { data, error } = await this.client
        .from(this.tableName)
        .select('amount, category, expense_type')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        throw this.handleError(error, 'getMonthlyTotals');
      }

      const expenses = data || [];
      const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);

      const categoryBreakdown: Record<string, number> = {};
      let businessExpenses = 0;
      let personalExpenses = 0;

      expenses.forEach(expense => {
        const amount = parseFloat(expense.amount || '0');
        const category = expense.category || 'other';

        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + amount;

        if (expense.expense_type === 'business') {
          businessExpenses += amount;
        } else {
          personalExpenses += amount;
        }
      });

      return {
        totalExpenses,
        categoryBreakdown,
        businessExpenses,
        personalExpenses
      };
    } catch (error) {
      throw this.wrapError(error, 'getMonthlyTotals');
    }
  }

  protected transformFromDB(dbRecord: any): Expense {
    return {
      id: dbRecord.id,
      name: dbRecord.name,
      amount: parseFloat(dbRecord.amount || '0'),
      category: dbRecord.category,
      expenseType: dbRecord.expense_type || 'personal',
      description: dbRecord.description,
      isDeductible: dbRecord.is_deductible || false,
      receiptUrl: dbRecord.receipt_url,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at),
      created_at: new Date(dbRecord.created_at),
      updated_at: new Date(dbRecord.updated_at),
    };
  }

  protected transformToDB(data: any, isUpdate = false): any {
    const dbData: any = {};

    if (data.name !== undefined) dbData.name = data.name;
    if (data.amount !== undefined) dbData.amount = data.amount;
    if (data.category !== undefined) dbData.category = data.category;
    if (data.expenseType !== undefined) dbData.expense_type = data.expenseType;
    if (data.description !== undefined) dbData.description = data.description;
    if (data.isDeductible !== undefined) dbData.is_deductible = data.isDeductible;
    if (data.receiptUrl !== undefined) dbData.receipt_url = data.receiptUrl;

    return dbData;
  }
}