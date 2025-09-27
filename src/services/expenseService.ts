import { supabase, TABLES } from './supabase';
import { ExpenseItem, ExpenseCategory } from '../types/expense.types';

export interface CreateExpenseData {
  name: string;
  amount: number;
  category: ExpenseCategory;
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {
  id: string;
}

class ExpenseService {
  async getAll(): Promise<ExpenseItem[]> {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getById(id: string): Promise<ExpenseItem | null> {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch expense: ${error.message}`);
    }

    return data ? this.transformFromDB(data) : null;
  }

  async create(expenseData: CreateExpenseData): Promise<ExpenseItem> {
    const dbData = this.transformToDB(expenseData);

    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .insert([dbData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create expense: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async update(id: string, updates: Partial<CreateExpenseData>): Promise<ExpenseItem> {
    const dbData = this.transformToDB(updates, true);

    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .update(dbData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update expense: ${error.message}`);
    }

    return this.transformFromDB(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.EXPENSES)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete expense: ${error.message}`);
    }
  }

  async getByCategory(category: ExpenseCategory): Promise<ExpenseItem[]> {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch expenses by category: ${error.message}`);
    }

    return data?.map(this.transformFromDB) || [];
  }

  async getTotalByCategory(): Promise<Record<ExpenseCategory, number>> {
    const { data, error } = await supabase
      .from(TABLES.EXPENSES)
      .select('category, amount');

    if (error) {
      throw new Error(`Failed to fetch expense totals: ${error.message}`);
    }

    const totals: Record<string, number> = {};

    data?.forEach((expense) => {
      const category = expense.category;
      const amount = parseFloat(expense.amount);
      totals[category] = (totals[category] || 0) + amount;
    });

    return totals as Record<ExpenseCategory, number>;
  }

  private transformFromDB(dbRecord: any): ExpenseItem {
    return {
      id: dbRecord.id,
      name: dbRecord.name,
      amount: parseFloat(dbRecord.amount),
      category: dbRecord.category,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: dbRecord.updated_at ? new Date(dbRecord.updated_at) : undefined,
    };
  }

  private transformToDB(data: Partial<CreateExpenseData>, isUpdate = false): any {
    const dbData: any = {};

    if (data.name !== undefined) dbData.name = data.name;
    if (data.amount !== undefined) dbData.amount = data.amount;
    if (data.category !== undefined) dbData.category = data.category;

    return dbData;
  }
}

export const expenseService = new ExpenseService();