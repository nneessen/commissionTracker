// src/services/expenses/ExpenseTemplateRepository.ts

import { BaseRepository } from "../base/BaseRepository";
import type { Tables, TablesInsert, TablesUpdate } from "../../types/database.types";
import type { ExpenseTemplate, ExpenseType, RecurringFrequency } from "../../types/expense.types";

// Database types
type ExpenseTemplateRow = Tables<"expense_templates">;
type ExpenseTemplateInsert = TablesInsert<"expense_templates">;
type ExpenseTemplateUpdate = TablesUpdate<"expense_templates">;

// Entity type (matches ExpenseTemplate from expense.types.ts)
interface ExpenseTemplateEntity {
  id: string;
  userId: string;
  templateName: string;
  description: string | null;
  amount: number;
  category: string;
  expenseType: ExpenseType;
  isTaxDeductible: boolean;
  recurringFrequency: RecurringFrequency | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Create data type
export interface CreateExpenseTemplateInput {
  userId: string;
  templateName: string;
  description?: string | null;
  amount: number;
  category: string;
  expenseType: ExpenseType;
  isTaxDeductible?: boolean;
  recurringFrequency?: RecurringFrequency | null;
  notes?: string | null;
}

// Update data type
export interface UpdateExpenseTemplateInput {
  templateName?: string;
  description?: string | null;
  amount?: number;
  category?: string;
  expenseType?: ExpenseType;
  isTaxDeductible?: boolean;
  recurringFrequency?: RecurringFrequency | null;
  notes?: string | null;
}

/**
 * ExpenseTemplateRepository
 *
 * Data access layer for the expense_templates table.
 */
export class ExpenseTemplateRepository extends BaseRepository<
  ExpenseTemplateEntity,
  CreateExpenseTemplateInput,
  UpdateExpenseTemplateInput
> {
  constructor() {
    super("expense_templates");
  }

  /**
   * Transform database record (snake_case) to entity (camelCase)
   */
  protected transformFromDB(dbRecord: Record<string, unknown>): ExpenseTemplateEntity {
    const row = dbRecord as unknown as ExpenseTemplateRow;
    return {
      id: row.id,
      userId: row.user_id,
      templateName: row.template_name,
      description: row.description,
      amount: row.amount,
      category: row.category,
      expenseType: row.expense_type as ExpenseType,
      isTaxDeductible: row.is_tax_deductible,
      recurringFrequency: row.recurring_frequency as RecurringFrequency | null,
      notes: row.notes,
      createdAt: row.created_at || "",
      updatedAt: row.updated_at || "",
    };
  }

  /**
   * Transform entity (camelCase) to database record (snake_case)
   */
  protected transformToDB(
    data: CreateExpenseTemplateInput | UpdateExpenseTemplateInput,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if ("userId" in data && data.userId !== undefined) {
      result.user_id = data.userId;
    }
    if ("templateName" in data && data.templateName !== undefined) {
      result.template_name = data.templateName;
    }
    if (data.description !== undefined) result.description = data.description;
    if (data.amount !== undefined) result.amount = data.amount;
    if (data.category !== undefined) result.category = data.category;
    if ("expenseType" in data && data.expenseType !== undefined) {
      result.expense_type = data.expenseType;
    }
    if (data.isTaxDeductible !== undefined) {
      result.is_tax_deductible = data.isTaxDeductible;
    }
    if (data.recurringFrequency !== undefined) {
      result.recurring_frequency = data.recurringFrequency;
    }
    if (data.notes !== undefined) result.notes = data.notes;

    return result;
  }

  // ---------------------------------------------------------------------------
  // CUSTOM READ OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * Find all templates for a user
   */
  async findByUserId(userId: string): Promise<ExpenseTemplateEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .order("recurring_frequency", { ascending: true })
      .order("template_name", { ascending: true });

    if (error) {
      throw this.handleError(error, "findByUserId");
    }

    return data?.map((row) => this.transformFromDB(row)) || [];
  }

  /**
   * Get all templates (uses RLS to filter by user)
   */
  async findAllWithRLS(): Promise<ExpenseTemplateEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .order("recurring_frequency", { ascending: true })
      .order("template_name", { ascending: true });

    if (error) {
      throw this.handleError(error, "findAllWithRLS");
    }

    return data?.map((row) => this.transformFromDB(row)) || [];
  }

  // ---------------------------------------------------------------------------
  // RAW DATABASE ACCESS (for backward compatibility with snake_case)
  // ---------------------------------------------------------------------------

  /**
   * Get all templates as raw database records (snake_case)
   */
  async findAllRaw(): Promise<ExpenseTemplate[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .order("recurring_frequency", { ascending: true })
      .order("template_name", { ascending: true });

    if (error) {
      throw this.handleError(error, "findAllRaw");
    }

    return (data || []) as ExpenseTemplate[];
  }

  /**
   * Get a single template by ID as raw record
   */
  async findByIdRaw(id: string): Promise<ExpenseTemplate | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw this.handleError(error, "findByIdRaw");
    }

    return data as ExpenseTemplate;
  }

  /**
   * Create a template from raw snake_case data
   */
  async createRaw(
    data: Omit<ExpenseTemplateInsert, "id" | "created_at" | "updated_at">,
  ): Promise<ExpenseTemplate> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "createRaw");
    }

    return result as ExpenseTemplate;
  }

  /**
   * Update a template with raw snake_case data
   */
  async updateRaw(
    id: string,
    data: ExpenseTemplateUpdate,
  ): Promise<ExpenseTemplate> {
    const { data: result, error } = await this.client
      .from(this.tableName)
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "updateRaw");
    }

    return result as ExpenseTemplate;
  }
}

// Singleton instance
export const expenseTemplateRepository = new ExpenseTemplateRepository();
