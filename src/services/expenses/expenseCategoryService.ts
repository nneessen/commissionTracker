// src/services/expenses/expenseCategoryService.ts

import { supabase } from '@/services/base/supabase';
import type {
  ExpenseCategoryModel,
  CreateExpenseCategoryData,
  UpdateExpenseCategoryData,
} from '@/types/expense.types';

/**
 * Database record shape for expense_categories
 */
interface ExpenseCategoryDBRecord {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Transform DB record to application ExpenseCategoryModel
 */
function transformDBRecord(record: ExpenseCategoryDBRecord): ExpenseCategoryModel {
  return {
    id: record.id,
    user_id: record.user_id,
    name: record.name,
    description: record.description,
    is_active: record.is_active,
    sort_order: record.sort_order,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

/**
 * Get all expense categories for the current user
 */
export async function getExpenseCategories(): Promise<ExpenseCategoryModel[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching expense categories:', error);
    throw new Error(`Failed to fetch expense categories: ${error.message}`);
  }

  return (data as ExpenseCategoryDBRecord[]).map(transformDBRecord);
}

/**
 * Get all expense categories including inactive ones
 */
export async function getAllExpenseCategories(): Promise<ExpenseCategoryModel[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching all expense categories:', error);
    throw new Error(`Failed to fetch all expense categories: ${error.message}`);
  }

  return (data as ExpenseCategoryDBRecord[]).map(transformDBRecord);
}

/**
 * Create a new expense category
 */
export async function createExpenseCategory(
  categoryData: CreateExpenseCategoryData
): Promise<ExpenseCategoryModel> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('expense_categories')
    .insert({
      user_id: user.id,
      name: categoryData.name,
      description: categoryData.description || null,
      is_active: categoryData.is_active ?? true,
      sort_order: categoryData.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating expense category:', error);
    throw new Error(`Failed to create expense category: ${error.message}`);
  }

  return transformDBRecord(data as ExpenseCategoryDBRecord);
}

/**
 * Update an existing expense category
 */
export async function updateExpenseCategory(
  id: string,
  updates: UpdateExpenseCategoryData
): Promise<ExpenseCategoryModel> {
  const { data, error } = await supabase
    .from('expense_categories')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating expense category:', error);
    throw new Error(`Failed to update expense category: ${error.message}`);
  }

  return transformDBRecord(data as ExpenseCategoryDBRecord);
}

/**
 * Delete an expense category (soft delete by setting is_active to false)
 */
export async function deleteExpenseCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('expense_categories')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error deleting expense category:', error);
    throw new Error(`Failed to delete expense category: ${error.message}`);
  }
}

/**
 * Reorder expense categories
 */
export async function reorderExpenseCategories(
  categoryIds: string[]
): Promise<void> {
  const updates = categoryIds.map((id, index) => ({
    id,
    sort_order: index,
    updated_at: new Date().toISOString(),
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('expense_categories')
      .update({ sort_order: update.sort_order, updated_at: update.updated_at })
      .eq('id', update.id);

    if (error) {
      console.error('Error reordering categories:', error);
      throw new Error(`Failed to reorder categories: ${error.message}`);
    }
  }
}
