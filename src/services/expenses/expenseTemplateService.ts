// src/services/expenses/expenseTemplateService.ts

import { supabase } from '../base/supabase';
import type {
  ExpenseTemplate,
  CreateExpenseTemplateData,
  UpdateExpenseTemplateData,
  CreateExpenseData,
} from '../../types/expense.types';

class ExpenseTemplateService {
  private readonly TABLE = 'expense_templates';

  /**
   * Get all templates for the current user
   */
  async getAll(): Promise<ExpenseTemplate[]> {
    const { data, error } = await supabase
      .from(this.TABLE)
      .select('*')
      .order('recurring_frequency', { ascending: true })
      .order('template_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch expense templates: ${error.message}`);
    }

    return (data || []) as ExpenseTemplate[];
  }

  /**
   * Get a single template by ID
   */
  async getById(id: string): Promise<ExpenseTemplate> {
    const { data, error} = await supabase
      .from(this.TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch expense template: ${error.message}`);
    }

    if (!data) {
      throw new Error('Expense template not found');
    }

    return data as ExpenseTemplate;
  }

  /**
   * Create a new expense template
   */
  async create(templateData: CreateExpenseTemplateData): Promise<ExpenseTemplate> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from(this.TABLE)
      .insert({
        ...templateData,
        user_id: user.id,
        is_tax_deductible: templateData.is_tax_deductible || false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create expense template: ${error.message}`);
    }

    return data as ExpenseTemplate;
  }

  /**
   * Update an existing expense template
   */
  async update(id: string, updates: UpdateExpenseTemplateData): Promise<ExpenseTemplate> {
    const { data, error } = await supabase
      .from(this.TABLE)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update expense template: ${error.message}`);
    }

    return data as ExpenseTemplate;
  }

  /**
   * Delete an expense template
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete expense template: ${error.message}`);
    }
  }

  /**
   * Convert template to CreateExpenseData (for pre-filling form)
   * User will provide the date
   */
  templateToExpenseData(template: ExpenseTemplate): Omit<CreateExpenseData, 'date'> {
    return {
      name: template.template_name,
      description: template.description,
      amount: template.amount,
      category: template.category,
      expense_type: template.expense_type,
      is_recurring: Boolean(template.recurring_frequency), // If has frequency, mark as recurring
      recurring_frequency: template.recurring_frequency,
      is_tax_deductible: template.is_tax_deductible,
      notes: template.notes,
    };
  }

  /**
   * Get templates grouped by frequency
   */
  async getGroupedByFrequency(): Promise<Record<string, ExpenseTemplate[]>> {
    const templates = await this.getAll();

    const grouped: Record<string, ExpenseTemplate[]> = {
      'No Frequency': [],
      'Daily': [],
      'Weekly': [],
      'Bi-Weekly': [],
      'Monthly': [],
      'Quarterly': [],
      'Semi-Annually': [],
      'Annually': [],
    };

    templates.forEach(template => {
      if (!template.recurring_frequency) {
        grouped['No Frequency'].push(template);
      } else {
        const key = template.recurring_frequency.charAt(0).toUpperCase() +
                    template.recurring_frequency.slice(1).replace('_', '-');
        if (grouped[key]) {
          grouped[key].push(template);
        }
      }
    });

    // Remove empty groups
    Object.keys(grouped).forEach(key => {
      if (grouped[key].length === 0) {
        delete grouped[key];
      }
    });

    return grouped;
  }
}

export const expenseTemplateService = new ExpenseTemplateService();
