// src/services/expenses/expenseTemplateService.ts

import { BaseService, type ServiceResponse } from "../base/BaseService";
import { ExpenseTemplateRepository } from "./ExpenseTemplateRepository";
import { supabase } from "../base/supabase";
import type {
  ExpenseTemplate,
  ExpenseType,
  RecurringFrequency,
  CreateExpenseTemplateData,
  UpdateExpenseTemplateData,
  CreateExpenseData,
} from "@/types/expense.types";

// Valid values for expense_type enum
const VALID_EXPENSE_TYPES: ExpenseType[] = ["personal", "business"];

// Valid values for recurring_frequency enum
const VALID_RECURRING_FREQUENCIES: RecurringFrequency[] = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semiannually",
  "annually",
];

/**
 * Service for expense template business logic
 * Extends BaseService for standard CRUD operations
 *
 * Note: We use 'any' for the BaseService generic parameters because
 * ExpenseTemplateRepository has different internal types (camelCase entities)
 * than what the service exposes (snake_case ExpenseTemplate types).
 * All CRUD methods are overridden to use the repository's Raw methods.
 */
export class ExpenseTemplateService extends BaseService<
  ExpenseTemplate,
  CreateExpenseTemplateData,
  UpdateExpenseTemplateData
> {
  // Store repository with correct type for internal use
  private _repository: ExpenseTemplateRepository;

  constructor(repository: ExpenseTemplateRepository) {
    // Cast to any to bypass type incompatibility with BaseRepository
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super(repository as any);
    this._repository = repository;
  }

  /**
   * Initialize validation rules
   * Note: These rules are used for both create and update operations.
   * For updates, use validateForUpdate() which skips undefined fields.
   */
  protected initializeValidationRules(): void {
    this.validationRules = [
      // template_name - required on create, valid if provided on update
      {
        field: "template_name",
        validate: (value) => {
          if (value === undefined || value === null) return false;
          if (typeof value !== "string") return false;
          return value.trim().length > 0 && value.trim().length <= 100;
        },
        message: "Template name is required and must be 100 characters or less",
      },
      // amount - required on create, valid if provided on update
      {
        field: "amount",
        validate: (value) => {
          if (value === undefined || value === null) return false;
          const num = Number(value);
          if (isNaN(num)) return false;
          return num > 0;
        },
        message: "Amount is required and must be a positive number",
      },
      // category - required on create, valid if provided on update
      {
        field: "category",
        validate: (value) => {
          if (value === undefined || value === null) return false;
          if (typeof value !== "string") return false;
          return value.trim().length > 0;
        },
        message: "Category is required",
      },
      // expense_type - required on create, valid if provided on update
      {
        field: "expense_type",
        validate: (value) => {
          if (value === undefined || value === null) return false;
          return VALID_EXPENSE_TYPES.includes(value as ExpenseType);
        },
        message: `Expense type is required. Must be one of: ${VALID_EXPENSE_TYPES.join(", ")}`,
      },
      // is_tax_deductible - optional, boolean
      {
        field: "is_tax_deductible",
        validate: (value) => {
          if (value === undefined || value === null) return true; // Optional
          return typeof value === "boolean";
        },
        message: "is_tax_deductible must be a boolean value",
      },
      // recurring_frequency - optional, valid enum if provided
      {
        field: "recurring_frequency",
        validate: (value) => {
          if (value === undefined || value === null) return true; // Optional
          return VALID_RECURRING_FREQUENCIES.includes(
            value as RecurringFrequency,
          );
        },
        message: `Invalid recurring frequency. Must be one of: ${VALID_RECURRING_FREQUENCIES.join(", ")}`,
      },
      // description - optional, string, max 500 chars
      {
        field: "description",
        validate: (value) => {
          if (value === undefined || value === null) return true; // Optional
          if (typeof value !== "string") return false;
          return value.length <= 500;
        },
        message: "Description must be 500 characters or less",
      },
      // notes - optional, string, max 1000 chars
      {
        field: "notes",
        validate: (value) => {
          if (value === undefined || value === null) return true; // Optional
          if (typeof value !== "string") return false;
          return value.length <= 1000;
        },
        message: "Notes must be 1000 characters or less",
      },
    ];
  }

  /**
   * Validate data for update operations.
   * Only validates fields that are present (not undefined).
   * This allows partial updates without requiring all fields.
   */
  private validateForUpdate(
    data: Record<string, unknown>,
  ): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];

    for (const rule of this.validationRules) {
      const value = data[rule.field];

      // Skip validation for undefined fields (not provided in update)
      if (value === undefined) {
        continue;
      }

      // Validate the field if it was provided
      if (!rule.validate(value)) {
        errors.push({ field: rule.field, message: rule.message });
      }
    }

    return errors;
  }

  /**
   * Helper method to normalize errors
   */
  private normalizeError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }

  /**
   * Override create to add user_id from authenticated user
   */
  async create(
    data: CreateExpenseTemplateData,
  ): Promise<ServiceResponse<ExpenseTemplate>> {
    try {
      // Validate data
      const errors = this.validate(data as unknown as Record<string, unknown>);
      if (errors.length > 0) {
        return {
          success: false,
          error: new Error(errors.map((e) => e.message).join(", ")),
        };
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: new Error("User not authenticated"),
        };
      }

      // Use the repository's createRaw for snake_case handling
      const template = await this._repository.createRaw({
        template_name: data.template_name,
        amount: data.amount,
        category: data.category,
        expense_type: data.expense_type,
        user_id: user.id,
        description: data.description ?? null,
        is_tax_deductible: data.is_tax_deductible ?? false,
        recurring_frequency: data.recurring_frequency ?? null,
        notes: data.notes ?? null,
      });

      // Verify template was created
      if (!template) {
        return {
          success: false,
          error: new Error("Failed to create expense template"),
        };
      }

      return { success: true, data: template };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  /**
   * Override getAll to use findAllRaw for snake_case compatibility
   */
  async getAll(): Promise<ServiceResponse<ExpenseTemplate[]>> {
    try {
      const templates = await this._repository.findAllRaw();
      return { success: true, data: templates };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  /**
   * Override getById to use findByIdRaw for snake_case compatibility
   */
  async getById(id: string): Promise<ServiceResponse<ExpenseTemplate>> {
    try {
      const template = await this._repository.findByIdRaw(id);

      if (!template) {
        return {
          success: false,
          error: new Error("Expense template not found"),
        };
      }

      return { success: true, data: template };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  /**
   * Override update to use updateRaw for snake_case compatibility
   */
  async update(
    id: string,
    updates: UpdateExpenseTemplateData,
  ): Promise<ServiceResponse<ExpenseTemplate>> {
    try {
      // Validate only the fields being updated (partial validation)
      const errors = this.validateForUpdate(
        updates as unknown as Record<string, unknown>,
      );
      if (errors.length > 0) {
        return {
          success: false,
          error: new Error(errors.map((e) => e.message).join(", ")),
        };
      }

      const template = await this._repository.updateRaw(id, updates);

      // Verify template was updated
      if (!template) {
        return {
          success: false,
          error: new Error("Expense template not found or update failed"),
        };
      }

      return { success: true, data: template };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  /**
   * Override delete to use _repository directly
   * This ensures we use the correctly-typed repository instance
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      // Verify template exists before attempting delete
      const existing = await this._repository.findByIdRaw(id);
      if (!existing) {
        return {
          success: false,
          error: new Error("Expense template not found"),
        };
      }

      await this._repository.delete(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  // ============================================================================
  // BUSINESS LOGIC METHODS
  // ============================================================================

  /**
   * Convert template to CreateExpenseData (for pre-filling form)
   * User will provide the date
   */
  templateToExpenseData(
    template: ExpenseTemplate,
  ): Omit<CreateExpenseData, "date"> {
    return {
      name: template.template_name,
      description: template.description,
      amount: template.amount,
      category: template.category,
      expense_type: template.expense_type,
      is_recurring: Boolean(template.recurring_frequency),
      recurring_frequency: template.recurring_frequency,
      is_tax_deductible: template.is_tax_deductible,
      notes: template.notes,
    };
  }

  /**
   * Get templates grouped by frequency
   */
  async getGroupedByFrequency(): Promise<
    ServiceResponse<Record<string, ExpenseTemplate[]>>
  > {
    try {
      const result = await this.getAll();
      if (!result.success || !result.data) {
        return {
          success: false,
          error: result.error || new Error("Failed to fetch templates"),
        };
      }

      const templates = result.data;

      const grouped: Record<string, ExpenseTemplate[]> = {
        "No Frequency": [],
        Daily: [],
        Weekly: [],
        "Bi-Weekly": [],
        Monthly: [],
        Quarterly: [],
        "Semi-Annually": [],
        Annually: [],
      };

      templates.forEach((template) => {
        if (!template.recurring_frequency) {
          grouped["No Frequency"].push(template);
        } else {
          const key =
            template.recurring_frequency.charAt(0).toUpperCase() +
            template.recurring_frequency.slice(1).replace("_", "-");
          if (grouped[key]) {
            grouped[key].push(template);
          }
        }
      });

      // Remove empty groups
      Object.keys(grouped).forEach((key) => {
        if (grouped[key].length === 0) {
          delete grouped[key];
        }
      });

      return { success: true, data: grouped };
    } catch (error) {
      return {
        success: false,
        error: this.normalizeError(error),
      };
    }
  }

  // ============================================================================
  // INHERITED FROM BaseService (available but may need testing due to any cast):
  // ============================================================================
  // - createMany(items: CreateExpenseTemplateData[]): Promise<ServiceResponse<ExpenseTemplate[]>>
  // - getPaginated(page, pageSize, filters?, orderBy?, orderDirection?): Promise<ServiceResponse<ListResponse<ExpenseTemplate>>>
  // - exists(id: string): Promise<boolean>
  // - count(filters?): Promise<number>
  //
  // Note: These inherited methods use the any-casted repository. If used,
  // verify they work correctly with the ExpenseTemplateRepository's type structure.
}

// Singleton instance
const expenseTemplateRepository = new ExpenseTemplateRepository();
export const expenseTemplateService = new ExpenseTemplateService(
  expenseTemplateRepository,
);

// Export class for testing
export { ExpenseTemplateService as ExpenseTemplateServiceClass };
