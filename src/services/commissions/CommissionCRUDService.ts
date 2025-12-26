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
  product: string;
  type: string;
  status: string;
  calculationBasis: string;
  annualPremium: number;
  monthlyPremium?: number;

  // ADVANCE (upfront payment)
  advanceAmount?: number;
  advanceMonths?: number;

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
      const dbData = this.transformToDB(data);
      const created = await this.repository.create(dbData);
      const commission = this.transformFromDB(created);

      // Emit commission earned event if this is an earned commission
      if (
        commission.status === "earned" ||
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

      const dbData = this.transformToDB(data, true);
      const updated = await this.repository.update(id, dbData);
      const commission = this.transformFromDB(updated);

      return commission;
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

      // Validate commission status is 'earned'
      if (commission.status !== "earned") {
        throw new ValidationError(
          `Cannot mark commission as paid. Current status is ${commission.status}, must be earned.`,
          [
            {
              field: "status",
              message: `Current status is ${commission.status}, must be earned`,
              value: commission.status,
            },
          ],
        );
      }

      // Get the linked policy to validate it's active
      if (commission.policyId) {
        const { data: policy, error: policyError } = await (
          this.repository as any
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
        this.repository as any
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- filtering on raw DB records
          (c) => (c as any).carrier_id === filters.carrierId,
        );
      }

      if (filters.userId) {
        commissions = commissions.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- filtering on raw DB records
          (c) => (c as any).user_id === filters.userId,
        );
      }

      if (filters.product) {
        commissions = commissions.filter((c) =>
          c.product.toLowerCase().includes(filters.product!.toLowerCase()),
        );
      }

      if (filters.calculationBasis) {
        commissions = commissions.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- filtering on raw DB records
          (c) => (c as any).calculation_basis === filters.calculationBasis,
        );
      }

      if (filters.startDate) {
        commissions = commissions.filter((c) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- filtering on raw DB records
          const commDate = (c as any).expected_date
            ? new Date((c as any).expected_date)
            : null;
          return commDate && commDate >= filters.startDate!;
        });
      }

      if (filters.endDate) {
        commissions = commissions.filter((c) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- filtering on raw DB records
          const commDate = (c as any).expected_date
            ? new Date((c as any).expected_date)
            : null;
          return commDate && commDate <= filters.endDate!;
        });
      }

      if (filters.minAmount !== undefined) {
        commissions = commissions.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- filtering on raw DB records
          (c) => parseFloat((c as any).commission_amount) >= filters.minAmount!,
        );
      }

      if (filters.maxAmount !== undefined) {
        commissions = commissions.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- filtering on raw DB records
          (c) => parseFloat((c as any).commission_amount) <= filters.maxAmount!,
        );
      }

      return commissions.map(this.transformFromDB);
    } catch (error) {
      throw this.handleError(error, "getFiltered");
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB record has dynamic schema
  private transformFromDB(dbRecord: any): Commission {
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

  private transformToDB(
    data: Partial<CreateCommissionData>,
    isUpdate = false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB transformation requires flexible return type
  ): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB transformation requires flexible object
    const dbData: any = {};

    if (data.policyId !== undefined) dbData.policy_id = data.policyId;
    if (data.userId !== undefined) dbData.user_id = data.userId;
    if (data.type !== undefined) dbData.type = data.type;
    if (data.status !== undefined) dbData.status = data.status;

    // ADVANCE - Note: DB column is 'amount', not 'advance_amount'
    if (data.advanceAmount !== undefined) dbData.amount = data.advanceAmount;
    if (data.advanceMonths !== undefined)
      dbData.advance_months = data.advanceMonths;

    // EARNING TRACKING
    if (data.monthsPaid !== undefined) dbData.months_paid = data.monthsPaid;
    if (data.earnedAmount !== undefined)
      dbData.earned_amount = data.earnedAmount;
    if (data.unearnedAmount !== undefined)
      dbData.unearned_amount = data.unearnedAmount;
    if (data.lastPaymentDate !== undefined)
      dbData.last_payment_date = data.lastPaymentDate;

    if (data.notes !== undefined) dbData.notes = data.notes;

    // NOTE: The following fields are in CreateCommissionData but NOT in the
    // commissions table. They're used for calculation but not stored:
    // - client, carrierId, product, calculationBasis, annualPremium,
    //   monthlyPremium, commissionRate, contractCompLevel, isAutoCalculated,
    //   expectedDate, actualDate, monthEarned, yearEarned

    if (!isUpdate) {
      dbData.created_at = new Date().toISOString();
    }
    dbData.updated_at = new Date().toISOString();

    return dbData;
  }
}

export const commissionCRUDService = new CommissionCRUDService();
