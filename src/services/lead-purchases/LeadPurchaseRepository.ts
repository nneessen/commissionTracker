// src/services/lead-purchases/LeadPurchaseRepository.ts
import { BaseRepository } from "../base/BaseRepository";
import type {
  LeadPurchase,
  CreateLeadPurchaseData,
  UpdateLeadPurchaseData,
  LeadPurchaseStats,
  VendorStats,
  LeadPurchaseFilters,
} from "@/types/lead-purchase.types";
import {
  transformLeadPurchaseFromDB,
  transformLeadPurchaseToDB,
  transformLeadVendorFromDB,
} from "@/types/lead-purchase.types";

export class LeadPurchaseRepository extends BaseRepository<
  LeadPurchase,
  CreateLeadPurchaseData,
  UpdateLeadPurchaseData
> {
  constructor() {
    super("lead_purchases");
  }

  protected transformFromDB(dbRecord: Record<string, unknown>): LeadPurchase {
    const purchase = transformLeadPurchaseFromDB(
      dbRecord as Parameters<typeof transformLeadPurchaseFromDB>[0],
    );

    // Handle joined vendor data if present
    if (dbRecord.lead_vendors && typeof dbRecord.lead_vendors === "object") {
      purchase.vendor = transformLeadVendorFromDB(
        dbRecord.lead_vendors as Parameters<
          typeof transformLeadVendorFromDB
        >[0],
      );
    }

    return purchase;
  }

  protected transformToDB(
    data: CreateLeadPurchaseData | UpdateLeadPurchaseData,
  ): Record<string, unknown> {
    return transformLeadPurchaseToDB(data) as Record<string, unknown>;
  }

  /**
   * Find all purchases for the current user with optional filters
   */
  async findAllWithFilters(
    filters?: LeadPurchaseFilters,
  ): Promise<LeadPurchase[]> {
    let query = this.client
      .from(this.tableName)
      .select(
        `
        *,
        lead_vendors (*)
      `,
      )
      .order("purchase_date", { ascending: false });

    if (filters?.vendorId) {
      query = query.eq("vendor_id", filters.vendorId);
    }

    if (filters?.startDate) {
      query = query.gte("purchase_date", filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte("purchase_date", filters.endDate);
    }

    if (filters?.leadFreshness) {
      query = query.eq("lead_freshness", filters.leadFreshness);
    }

    const { data, error } = await query;

    if (error) {
      throw this.handleError(error, "findAllWithFilters");
    }

    return data?.map((row) => this.transformFromDB(row)) || [];
  }

  /**
   * Find a single purchase by ID with vendor data
   */
  async findByIdWithVendor(id: string): Promise<LeadPurchase | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(
        `
        *,
        lead_vendors (*)
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw this.handleError(error, "findByIdWithVendor");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Find purchases linked to a specific expense
   */
  async findByExpenseId(expenseId: string): Promise<LeadPurchase | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(
        `
        *,
        lead_vendors (*)
      `,
      )
      .eq("expense_id", expenseId)
      .maybeSingle();

    if (error) {
      throw this.handleError(error, "findByExpenseId");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Get overall stats for the current user
   */
  async getStats(
    startDate?: string,
    endDate?: string,
  ): Promise<LeadPurchaseStats> {
    const { data, error } = await this.client.rpc("get_lead_purchase_stats", {
      p_user_id: null, // Will default to current user
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      throw this.handleError(error, "getStats");
    }

    const row = data?.[0];
    return {
      totalPurchases: Number(row?.total_purchases || 0),
      totalLeads: Number(row?.total_leads || 0),
      totalSpent: Number(row?.total_spent || 0),
      totalPolicies: Number(row?.total_policies || 0),
      totalCommission: Number(row?.total_commission || 0),
      avgCostPerLead: Number(row?.avg_cost_per_lead || 0),
      avgRoi: Number(row?.avg_roi || 0),
      conversionRate: Number(row?.conversion_rate || 0),
    };
  }

  /**
   * Get stats grouped by vendor
   */
  async getStatsByVendor(
    startDate?: string,
    endDate?: string,
  ): Promise<VendorStats[]> {
    const { data, error } = await this.client.rpc("get_lead_stats_by_vendor", {
      p_user_id: null, // Will default to current user
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      throw this.handleError(error, "getStatsByVendor");
    }

    return (
      data?.map((row: Record<string, unknown>) => ({
        vendorId: String(row.vendor_id),
        vendorName: String(row.vendor_name),
        totalPurchases: Number(row.total_purchases || 0),
        totalLeads: Number(row.total_leads || 0),
        totalSpent: Number(row.total_spent || 0),
        totalPolicies: Number(row.total_policies || 0),
        totalCommission: Number(row.total_commission || 0),
        avgCostPerLead: Number(row.avg_cost_per_lead || 0),
        avgRoi: Number(row.avg_roi || 0),
        conversionRate: Number(row.conversion_rate || 0),
      })) || []
    );
  }

  /**
   * Link a purchase to an expense
   */
  async linkToExpense(
    purchaseId: string,
    expenseId: string,
  ): Promise<LeadPurchase> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ expense_id: expenseId })
      .eq("id", purchaseId)
      .select(
        `
        *,
        lead_vendors (*)
      `,
      )
      .single();

    if (error) {
      throw this.handleError(error, "linkToExpense");
    }

    return this.transformFromDB(data);
  }

  /**
   * Unlink a purchase from an expense
   */
  async unlinkFromExpense(purchaseId: string): Promise<LeadPurchase> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ expense_id: null })
      .eq("id", purchaseId)
      .select(
        `
        *,
        lead_vendors (*)
      `,
      )
      .single();

    if (error) {
      throw this.handleError(error, "unlinkFromExpense");
    }

    return this.transformFromDB(data);
  }
}
