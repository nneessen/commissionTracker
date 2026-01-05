// src/services/lead-purchases/LeadPurchaseService.ts
import { BaseService, type ServiceResponse } from "../base/BaseService";
import { LeadPurchaseRepository } from "./LeadPurchaseRepository";
import type {
  LeadPurchase,
  CreateLeadPurchaseData,
  UpdateLeadPurchaseData,
  LeadPurchaseStats,
  VendorStats,
  LeadPurchaseFilters,
} from "@/types/lead-purchase.types";

export class LeadPurchaseService extends BaseService<
  LeadPurchase,
  CreateLeadPurchaseData,
  UpdateLeadPurchaseData
> {
  declare protected repository: LeadPurchaseRepository;

  constructor(repository: LeadPurchaseRepository) {
    super(repository);
  }

  protected initializeValidationRules(): void {
    this.validationRules = [
      {
        field: "vendorId",
        validate: (value) => {
          return typeof value === "string" && value.length > 0;
        },
        message: "Vendor is required",
      },
      {
        field: "leadCount",
        validate: (value) => {
          const num = Number(value);
          return !isNaN(num) && num > 0 && Number.isInteger(num);
        },
        message: "Lead count must be a positive integer",
      },
      {
        field: "totalCost",
        validate: (value) => {
          const num = Number(value);
          return !isNaN(num) && num >= 0;
        },
        message: "Total cost must be a non-negative number",
      },
      {
        field: "purchaseDate",
        validate: (value) => {
          if (typeof value !== "string") return false;
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(value)) return false;
          const date = new Date(value);
          return !isNaN(date.getTime());
        },
        message: "Purchase date must be a valid date (YYYY-MM-DD)",
      },
      {
        field: "policiesSold",
        validate: (value) => {
          if (value === undefined || value === null) return true;
          const num = Number(value);
          return !isNaN(num) && num >= 0 && Number.isInteger(num);
        },
        message: "Policies sold must be a non-negative integer",
      },
      {
        field: "commissionEarned",
        validate: (value) => {
          if (value === undefined || value === null) return true;
          const num = Number(value);
          return !isNaN(num) && num >= 0;
        },
        message: "Commission earned must be a non-negative number",
      },
    ];
  }

  /**
   * Get all purchases with optional filters
   */
  async getAllWithFilters(
    filters?: LeadPurchaseFilters,
  ): Promise<ServiceResponse<LeadPurchase[]>> {
    try {
      const purchases = await this.repository.findAllWithFilters(filters);
      return { success: true, data: purchases };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get a single purchase by ID with vendor data
   */
  async getByIdWithVendor(id: string): Promise<ServiceResponse<LeadPurchase>> {
    try {
      const purchase = await this.repository.findByIdWithVendor(id);
      if (!purchase) {
        return {
          success: false,
          error: new Error("Lead purchase not found"),
        };
      }
      return { success: true, data: purchase };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get purchase linked to an expense
   */
  async getByExpenseId(
    expenseId: string,
  ): Promise<ServiceResponse<LeadPurchase | null>> {
    try {
      const purchase = await this.repository.findByExpenseId(expenseId);
      return { success: true, data: purchase };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get overall stats for the current user
   */
  async getStats(
    startDate?: string,
    endDate?: string,
  ): Promise<ServiceResponse<LeadPurchaseStats>> {
    try {
      const stats = await this.repository.getStats(startDate, endDate);
      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get stats grouped by vendor
   */
  async getStatsByVendor(
    startDate?: string,
    endDate?: string,
  ): Promise<ServiceResponse<VendorStats[]>> {
    try {
      const stats = await this.repository.getStatsByVendor(startDate, endDate);
      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Link a purchase to an expense
   */
  async linkToExpense(
    purchaseId: string,
    expenseId: string,
  ): Promise<ServiceResponse<LeadPurchase>> {
    try {
      const purchase = await this.repository.linkToExpense(
        purchaseId,
        expenseId,
      );
      return { success: true, data: purchase };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Unlink a purchase from an expense
   */
  async unlinkFromExpense(
    purchaseId: string,
  ): Promise<ServiceResponse<LeadPurchase>> {
    try {
      const purchase = await this.repository.unlinkFromExpense(purchaseId);
      return { success: true, data: purchase };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Update ROI tracking fields (policies sold, commission earned)
   */
  async updateRoi(
    id: string,
    policiesSold: number,
    commissionEarned: number,
  ): Promise<ServiceResponse<LeadPurchase>> {
    return this.update(id, {
      policiesSold,
      commissionEarned,
    });
  }
}

// Create singleton instance
const leadPurchaseRepository = new LeadPurchaseRepository();
export const leadPurchaseService = new LeadPurchaseService(
  leadPurchaseRepository,
);
