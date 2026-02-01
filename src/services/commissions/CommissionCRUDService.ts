// src/services/commissions/CommissionCRUDService.ts
// Handles basic CRUD operations for commissions

import { Commission } from "../../types/commission.types";
import { CommissionRepository } from "./CommissionRepository";
import { logger } from "../base/logger";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
  getErrorMessage,
} from "../../errors/ServiceErrors";
import { withRetry } from "../../utils/retry";
import {
  workflowEventEmitter,
  WORKFLOW_EVENTS,
} from "../events/workflowEventEmitter";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * DB row type - uses Record<string, unknown> to handle joined/computed fields
 * The actual runtime data includes fields from JOINs and views beyond base schema
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows have dynamic fields from joins/views
type CommissionRow = Record<string, any>;

export interface CreateCommissionData {
  policyId?: string;
  userId?: string;
  client: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  carrierId: string;
  productId?: string; // Specific product ID for accurate comp_guide lookup
  product: string;
  termLength?: number; // Term length for term_life products (affects commission rate)
  type: string;
  status: string;
  calculationBasis: string;
  annualPremium: number;
  monthlyPremium?: number;

  // ADVANCE (upfront payment)
  amount?: number; // Canonical field name for commission amount
  advanceAmount?: number; // @deprecated Use 'amount' instead
  advanceMonths?: number;

  // CAPPED ADVANCE (when carrier has advance cap)
  originalAdvance?: number | null;
  overageAmount?: number | null;
  overageStartMonth?: number | null;

  // EARNING TRACKING
  monthsPaid?: number;
  earnedAmount?: number;
  unearnedAmount?: number;
  lastPaymentDate?: Date;

  // COMMISSION RATE
  commissionRate?: number;
  contractCompLevel?: number;
  isAutoCalculated?: boolean;

  // Dates
  expectedDate?: Date;
  actualDate?: Date;
  monthEarned?: number;
  yearEarned?: number;
  notes?: string;
}

export interface UpdateCommissionData extends Partial<CreateCommissionData> {
  id: string;
}

export interface CommissionFilters {
  status?: string;
  type?: string;
  carrierId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  product?: string;
  calculationBasis?: string;
}

class CommissionCRUDService {
  private repository: CommissionRepository;

  constructor() {
    this.repository = new CommissionRepository();
  }

  private handleError(
    error: unknown,
    context: string,
    entityId?: string,
  ): never {
    const message = getErrorMessage(error);
    logger.error(
      `CommissionCRUDService.${context}`,
      error instanceof Error ? error : new Error(String(error)),
    );

    // Re-throw if already a structured error
    if (
      error instanceof NotFoundError ||
      error instanceof DatabaseError ||
      error instanceof ValidationError
    ) {
      throw error;
    }

    // Wrap in appropriate error type
    throw new DatabaseError(
      context,
      error instanceof Error ? error : new Error(message),
      { entityId },
    );
  }

  async getAll(): Promise<Commission[]> {
    try {
      return await withRetry(
        async () => {
          // CommissionRepository already transforms the data in its findAll method
          return await this.repository.findAll();
        },
        { maxAttempts: 2 },
      );
    } catch (error) {
      throw this.handleError(error, "getAll");
    }
  }

  async getById(id: string): Promise<Commission | null> {
    if (!id) {
      throw new ValidationError("Invalid commission ID", [
        { field: "id", message: "ID is required", value: id },
      ]);
    }

    try {
      return await withRetry(
        async () => {
          const commission = await this.repository.findById(id);
          if (!commission) {
            throw new NotFoundError("Commission", id);
          }
          // Repository already transforms the data
          return commission;
        },
        { maxAttempts: 2 },
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw this.handleError(error, "getById", id);
    }
  }

  async getByPolicyId(policyId: string): Promise<Commission[]> {
    try {
      // Repository already transforms the data
      return await this.repository.findByPolicy(policyId);
    } catch (error) {
      throw this.handleError(error, "getByPolicyId");
    }
  }

  async getCommissionsByUser(userId: string): Promise<Commission[]> {
    try {
      // Repository already transforms the data
      return await this.repository.findByAgent(userId);
    } catch (error) {
      throw this.handleError(error, "getCommissionsByUser");
    }
  }

  async create(data: CreateCommissionData): Promise<Commission> {
    // Validate required fields
    const errors: Array<{ field: string; message: string; value?: unknown }> =
      [];

    if (!data.client) {
      errors.push({
        field: "client",
        message: "Client information is required",
      });
    }
    if (!data.carrierId) {
      errors.push({ field: "carrierId", message: "Carrier ID is required" });
    }
    if (!data.product) {
      errors.push({ field: "product", message: "Product is required" });
    }
    if (!data.annualPremium || data.annualPremium <= 0) {
      errors.push({
        field: "annualPremium",
        message: "Annual premium must be greater than 0",
        value: data.annualPremium,
      });
    }

    if (errors.length > 0) {
      throw new ValidationError("Invalid commission data", errors);
    }

    try {
      // NOTE: Do NOT call transformToDB or transformFromDB here!
      // The repository.create() calls its own transforms internally.
      // repository.create() returns a Commission object already transformed.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Repository handles both formats
      const commission = await this.repository.create(data as any);

      // Emit commission earned event if this is a paid commission
      if (
        commission.status === "paid" ||
        (commission.advanceAmount && commission.advanceAmount > 0)
      ) {
        await workflowEventEmitter.emit(WORKFLOW_EVENTS.COMMISSION_EARNED, {
          commissionId: commission.id,
          policyId: commission.policyId,
          agentId: commission.userId,
          amount: commission.advanceAmount || commission.amount,
          commissionType: commission.type,
          status: commission.status,
          carrierId: commission.carrierId,
          product: commission.product,
          earnedAt: new Date().toISOString(),
        });
      }

      return commission;
    } catch (error) {
      throw this.handleError(error, "create");
    }
  }

  async update(
    id: string,
    data: Partial<CreateCommissionData>,
  ): Promise<Commission> {
    if (!id) {
      throw new ValidationError("Invalid commission ID", [
        { field: "id", message: "ID is required" },
      ]);
    }

    try {
      // Verify commission exists first
      await this.getById(id);

      // NOTE: Do NOT call transformToDB or transformFromDB here!
      // The repository.update() calls its own transforms internally.
      // repository.update() returns a Commission object already transformed via
      // CommissionRepository.transformFromDB - calling this.transformFromDB again
      // would cause a double-transform bug (expecting DB field names on a Commission object)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Repository handles both formats
      const updated = await this.repository.update(id, data as any);

      return updated;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw this.handleError(error, "update", id);
    }
  }

  async delete(id: string): Promise<void> {
    if (!id) {
      throw new ValidationError("Invalid commission ID", [
        { field: "id", message: "ID is required" },
      ]);
    }

    try {
      // Verify commission exists first
      await this.getById(id);

      await this.repository.delete(id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw this.handleError(error, "delete", id);
    }
  }

  async markAsPaid(id: string, paymentDate?: Date): Promise<Commission> {
    if (!id) {
      throw new ValidationError("Invalid commission ID", [
        { field: "id", message: "ID is required" },
      ]);
    }

    try {
      // First, get the commission to validate status
      const commission = await this.getById(id);
      if (!commission) {
        throw new NotFoundError("Commission", id);
      }

      // Validate commission status is 'pending' (can be marked as paid)
      if (commission.status !== "pending") {
        throw new ValidationError(
          `Cannot mark commission as paid. Current status is ${commission.status}, must be pending.`,
          [
            {
              field: "status",
              message: `Current status is ${commission.status}, must be pending`,
              value: commission.status,
            },
          ],
        );
      }

      // Get the linked policy to validate it's active
      if (commission.policyId) {
        const { data: policy, error: policyError } = await (
          this.repository as unknown as { client: SupabaseClient }
        ).client
          .from("policies")
          .select("status")
          .eq("id", commission.policyId)
          .single();

        if (policyError) {
          throw new DatabaseError("markAsPaid", policyError);
        }

        if (policy.status !== "active") {
          throw new ValidationError(
            `Cannot mark commission as paid. Policy status is ${policy.status}, must be active.`,
            [
              {
                field: "policy.status",
                message: `Policy status is ${policy.status}, must be active`,
                value: policy.status,
              },
            ],
          );
        }
      }

      // Update the commission status to 'paid' and set payment_date
      const updateData = {
        status: "paid",
        payment_date: paymentDate || new Date(),
        updated_at: new Date(),
      };

      const { data: updated, error: updateError } = await (
        this.repository as unknown as { client: SupabaseClient }
      ).client
        .from("commissions")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        throw new DatabaseError("markAsPaid", updateError);
      }

      // Transform and return the updated commission
      const updatedCommission = this.transformFromDB(updated);

      // Emit commission paid event
      await workflowEventEmitter.emit(WORKFLOW_EVENTS.COMMISSION_PAID, {
        commissionId: updatedCommission.id,
        policyId: updatedCommission.policyId,
        agentId: updatedCommission.userId,
        amount: updatedCommission.amount,
        paidDate: updatedCommission.paidDate?.toISOString(),
        timestamp: new Date().toISOString(),
      });

      return updatedCommission;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw this.handleError(error, "markAsPaid", id);
    }
  }

  async getFiltered(filters: CommissionFilters): Promise<Commission[]> {
    try {
      let commissions = await this.repository.findAll();

      // Apply filters
      if (filters.status) {
        commissions = commissions.filter((c) => c.status === filters.status);
      }

      if (filters.type) {
        commissions = commissions.filter((c) => c.type === filters.type);
      }

      if (filters.carrierId) {
        commissions = commissions.filter(
          (c) =>
            (c as unknown as CommissionRow).carrier_id === filters.carrierId,
        );
      }

      if (filters.userId) {
        commissions = commissions.filter(
          (c) => (c as unknown as CommissionRow).user_id === filters.userId,
        );
      }

      if (filters.product) {
        commissions = commissions.filter((c) =>
          c.product.toLowerCase().includes(filters.product!.toLowerCase()),
        );
      }

      if (filters.calculationBasis) {
        commissions = commissions.filter(
          (c) =>
            (c as unknown as CommissionRow).calculation_basis ===
            filters.calculationBasis,
        );
      }

      if (filters.startDate) {
        commissions = commissions.filter((c) => {
          const row = c as unknown as CommissionRow;
          const commDate = row.expected_date
            ? new Date(row.expected_date)
            : null;
          return commDate && commDate >= filters.startDate!;
        });
      }

      if (filters.endDate) {
        commissions = commissions.filter((c) => {
          const row = c as unknown as CommissionRow;
          const commDate = row.expected_date
            ? new Date(row.expected_date)
            : null;
          return commDate && commDate <= filters.endDate!;
        });
      }

      if (filters.minAmount !== undefined) {
        commissions = commissions.filter((c) => {
          const row = c as unknown as CommissionRow;
          return parseFloat(String(row.amount || 0)) >= filters.minAmount!;
        });
      }

      if (filters.maxAmount !== undefined) {
        commissions = commissions.filter((c) => {
          const row = c as unknown as CommissionRow;
          return parseFloat(String(row.amount || 0)) <= filters.maxAmount!;
        });
      }

      return commissions.map(this.transformFromDB);
    } catch (error) {
      throw this.handleError(error, "getFiltered");
    }
  }

  private transformFromDB(dbRecord: CommissionRow): Commission {
    return {
      id: dbRecord.id,
      policyId: dbRecord.policy_id,
      userId: dbRecord.user_id,
      client: dbRecord.client,
      carrierId: dbRecord.carrier_id,
      product: dbRecord.product,
      type: dbRecord.type,
      status: dbRecord.status,
      calculationBasis: dbRecord.calculation_basis,
      annualPremium: parseFloat(dbRecord.annual_premium || 0),
      monthlyPremium: parseFloat(
        dbRecord.monthly_premium || dbRecord.annual_premium / 12 || 0,
      ),

      // ADVANCE (upfront payment) - Database field names
      amount: parseFloat(dbRecord.amount || 0), // Total commission amount (DB 'amount' field)
      rate: parseFloat(dbRecord.rate || 0), // Commission rate percentage (DB 'rate' field)
      advanceMonths: dbRecord.advance_months ?? 9,

      // DEPRECATED: Keep for backward compatibility
      advanceAmount: parseFloat(dbRecord.amount || 0), // Deprecated - use 'amount' instead

      // CAPPED ADVANCE (when carrier has advance cap)
      originalAdvance: dbRecord.original_advance
        ? parseFloat(dbRecord.original_advance)
        : null,
      overageAmount: dbRecord.overage_amount
        ? parseFloat(dbRecord.overage_amount)
        : null,
      overageStartMonth: dbRecord.overage_start_month ?? null,

      // EARNING TRACKING
      monthsPaid: dbRecord.months_paid || 0,
      earnedAmount: parseFloat(dbRecord.earned_amount || 0),
      unearnedAmount: parseFloat(dbRecord.unearned_amount || 0),
      lastPaymentDate: dbRecord.last_payment_date
        ? new Date(dbRecord.last_payment_date)
        : undefined,

      // COMMISSION RATE (for calculations)
      commissionRate: parseFloat(
        dbRecord.rate || dbRecord.commission_rate || 0,
      ),

      contractCompLevel: dbRecord.contract_comp_level,
      isAutoCalculated: dbRecord.is_auto_calculated || false,
      expectedDate: dbRecord.expected_date
        ? new Date(dbRecord.expected_date)
        : undefined,
      actualDate: dbRecord.actual_date
        ? new Date(dbRecord.actual_date)
        : undefined,
      paidDate: dbRecord.payment_date
        ? new Date(dbRecord.payment_date)
        : undefined,
      monthEarned: dbRecord.month_earned,
      yearEarned: dbRecord.year_earned,
      notes: dbRecord.notes,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: dbRecord.updated_at
        ? new Date(dbRecord.updated_at)
        : undefined,
    };
  }
}

export const commissionCRUDService = new CommissionCRUDService();
