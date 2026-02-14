// src/services/lead-purchases/LeadPurchaseRepository.ts
import { BaseRepository } from "../base/BaseRepository";
import type {
  LeadPurchase,
  CreateLeadPurchaseData,
  UpdateLeadPurchaseData,
  LeadPurchaseStats,
  VendorStats,
  VendorStatsAggregate,
  VendorAdminOverview,
  VendorUserBreakdown,
  VendorPolicyTimelineRecord,
  VendorHeatMetrics,
  LeadPurchaseFilters,
  LeadPackRow,
  LeadRecentPolicy,
  PackHeatMetrics,
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
   * Override create to inject user_id from current authenticated user
   */
  async create(data: CreateLeadPurchaseData): Promise<LeadPurchase> {
    // Get current user for user_id
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Transform data and add user_id
    const dbData = {
      ...this.transformToDB(data),
      user_id: user.id,
    };

    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(dbData)
      .select(`*, lead_vendors (*)`)
      .single();

    if (error) {
      throw this.handleError(error, "create");
    }

    return this.transformFromDB(result);
  }

  /**
   * Find all purchases for the current user with optional filters
   * Always filters by current user's user_id for data isolation
   */
  async findAllWithFilters(
    filters?: LeadPurchaseFilters,
  ): Promise<LeadPurchase[]> {
    // Get current user for user_id filtering
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    let query = this.client
      .from(this.tableName)
      .select(
        `
        *,
        lead_vendors (*)
      `,
      )
      .eq("user_id", user.id) // Always filter by current user
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
   * Get stats grouped by vendor - aggregated across ALL users in the IMO
   */
  async getStatsByVendorImoAggregate(
    startDate?: string,
    endDate?: string,
  ): Promise<VendorStatsAggregate[]> {
    const { data, error } = await this.client.rpc(
      "get_lead_stats_by_vendor_imo_aggregate",
      {
        p_imo_id: null, // Will default to current user's IMO
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      },
    );

    if (error) {
      throw this.handleError(error, "getStatsByVendorImoAggregate");
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
        uniqueUsers: Number(row.unique_users || 0),
      })) || []
    );
  }

  /**
   * Get vendor admin overview - all vendors with full stats + fresh/aged breakdown
   */
  async getVendorAdminOverview(
    startDate?: string,
    endDate?: string,
  ): Promise<VendorAdminOverview[]> {
    const { data, error } = await this.client.rpc(
      "get_lead_vendor_admin_overview",
      {
        p_imo_id: null,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      },
    );

    if (error) {
      throw this.handleError(error, "getVendorAdminOverview");
    }

    return (
      data?.map((row: Record<string, unknown>) => ({
        vendorId: String(row.vendor_id),
        vendorName: String(row.vendor_name),
        contactName: row.contact_name ? String(row.contact_name) : null,
        contactEmail: row.contact_email ? String(row.contact_email) : null,
        contactPhone: row.contact_phone ? String(row.contact_phone) : null,
        website: row.website ? String(row.website) : null,
        notes: row.notes ? String(row.notes) : null,
        createdAt: String(row.created_at),
        lastPurchaseDate: row.last_purchase_date
          ? String(row.last_purchase_date)
          : null,
        totalPurchases: Number(row.total_purchases || 0),
        totalLeads: Number(row.total_leads || 0),
        totalSpent: Number(row.total_spent || 0),
        totalPolicies: Number(row.total_policies || 0),
        totalCommission: Number(row.total_commission || 0),
        avgCostPerLead: Number(row.avg_cost_per_lead || 0),
        avgRoi: Number(row.avg_roi || 0),
        conversionRate: Number(row.conversion_rate || 0),
        uniqueUsers: Number(row.unique_users || 0),
        freshLeads: Number(row.fresh_leads || 0),
        agedLeads: Number(row.aged_leads || 0),
        freshSpent: Number(row.fresh_spent || 0),
        agedSpent: Number(row.aged_spent || 0),
        totalPremium: Number(row.total_premium || 0),
      })) || []
    );
  }

  /**
   * Get per-user breakdown for a specific vendor
   */
  async getVendorUserBreakdown(
    vendorId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<VendorUserBreakdown[]> {
    const { data, error } = await this.client.rpc(
      "get_lead_vendor_user_breakdown",
      {
        p_vendor_id: vendorId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      },
    );

    if (error) {
      throw this.handleError(error, "getVendorUserBreakdown");
    }

    return (
      data?.map((row: Record<string, unknown>) => ({
        userId: String(row.user_id),
        userName: String(row.user_name || "Unknown"),
        lastPurchaseDate: row.last_purchase_date
          ? String(row.last_purchase_date)
          : null,
        totalPurchases: Number(row.total_purchases || 0),
        totalLeads: Number(row.total_leads || 0),
        totalSpent: Number(row.total_spent || 0),
        totalPolicies: Number(row.total_policies || 0),
        totalCommission: Number(row.total_commission || 0),
        avgCostPerLead: Number(row.avg_cost_per_lead || 0),
        avgRoi: Number(row.avg_roi || 0),
        conversionRate: Number(row.conversion_rate || 0),
        freshLeads: Number(row.fresh_leads || 0),
        agedLeads: Number(row.aged_leads || 0),
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

  /**
   * Get individual policy records for a vendor+agent combination
   */
  async getVendorPolicyTimeline(
    vendorId: string,
    userId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<VendorPolicyTimelineRecord[]> {
    const { data, error } = await this.client.rpc(
      "get_lead_vendor_policy_timeline",
      {
        p_vendor_id: vendorId,
        p_user_id: userId || null,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      },
    );

    if (error) {
      throw this.handleError(error, "getVendorPolicyTimeline");
    }

    return (
      data?.map((row: Record<string, unknown>) => ({
        policyId: String(row.policy_id),
        policyNumber: row.policy_number ? String(row.policy_number) : null,
        clientName: String(row.client_name || "Unknown"),
        product: String(row.product || ""),
        submitDate: String(row.submit_date),
        effectiveDate: String(row.effective_date),
        annualPremium: Number(row.annual_premium || 0),
        status: String(row.status || ""),
        agentId: String(row.agent_id),
        agentName: String(row.agent_name || "Unknown"),
      })) || []
    );
  }

  /**
   * Get pack-level list for admin tables (V2)
   */
  async getLeadPackList(
    freshness?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<LeadPackRow[]> {
    const { data, error } = await this.client.rpc("get_lead_pack_list", {
      p_imo_id: null,
      p_freshness: freshness || null,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      throw this.handleError(error, "getLeadPackList");
    }

    return (
      data?.map((row: Record<string, unknown>) => {
        const leadCount = Number(row.lead_count || 0);
        const policiesSold = Number(row.policies_sold || 0);
        return {
          packId: String(row.pack_id),
          purchaseName: row.purchase_name ? String(row.purchase_name) : null,
          vendorId: String(row.vendor_id),
          vendorName: String(row.vendor_name),
          agentId: String(row.agent_id),
          agentName: String(row.agent_name || "Unknown"),
          purchaseDate: String(row.purchase_date),
          leadFreshness: String(row.lead_freshness),
          leadCount,
          totalCost: Number(row.total_cost || 0),
          costPerLead: Number(row.cost_per_lead || 0),
          policiesSold,
          conversionRate: leadCount > 0 ? (policiesSold / leadCount) * 100 : 0,
          commissionEarned: Number(row.commission_earned || 0),
          roiPercentage: Number(row.roi_percentage || 0),
          totalPremium: Number(row.total_premium || 0),
        };
      }) || []
    );
  }

  /**
   * Get recent policies from lead packs (V2)
   */
  async getLeadRecentPolicies(limit?: number): Promise<LeadRecentPolicy[]> {
    const { data, error } = await this.client.rpc("get_lead_recent_policies", {
      p_imo_id: null,
      p_limit: limit || 100,
    });

    if (error) {
      throw this.handleError(error, "getLeadRecentPolicies");
    }

    return (
      data?.map((row: Record<string, unknown>) => ({
        policyId: String(row.policy_id),
        effectiveDate: row.effective_date ? String(row.effective_date) : null,
        submitDate: row.submit_date ? String(row.submit_date) : null,
        policyNumber: row.policy_number ? String(row.policy_number) : null,
        clientName: String(row.client_name || "Unknown"),
        product: String(row.product || ""),
        annualPremium: Number(row.annual_premium || 0),
        agentId: String(row.agent_id),
        agentName: String(row.agent_name || "Unknown"),
        vendorId: String(row.vendor_id),
        vendorName: String(row.vendor_name),
        packId: String(row.pack_id),
        packName: row.pack_name ? String(row.pack_name) : null,
        leadFreshness: String(row.lead_freshness),
        status: String(row.status || ""),
      })) || []
    );
  }

  /**
   * Get per-pack heat metrics for V2 heat score computation
   */
  async getPackHeatMetrics(): Promise<PackHeatMetrics[]> {
    const { data, error } = await this.client.rpc(
      "get_lead_pack_heat_metrics",
      { p_imo_id: null },
    );

    if (error) {
      throw this.handleError(error, "getPackHeatMetrics");
    }

    return (
      data?.map((row: Record<string, unknown>) => ({
        packId: String(row.pack_id),
        vendorId: String(row.vendor_id),
        totalPremium: Number(row.total_premium || 0),
        totalCost: Number(row.total_cost || 0),
        leadCount: Number(row.lead_count || 0),
        policiesSold: Number(row.policies_sold || 0),
        commissionEarned: Number(row.commission_earned || 0),
        daysSincePurchase: Number(row.days_since_purchase || 0),
        daysSinceLastSale: Number(row.days_since_last_sale ?? 999),
        salesLast30d: Number(row.sales_last_30d || 0),
      })) || []
    );
  }

  /**
   * Get per-vendor heat metrics for heat score computation
   */
  async getVendorHeatMetrics(): Promise<VendorHeatMetrics[]> {
    const { data, error } = await this.client.rpc(
      "get_lead_vendor_heat_metrics",
    );

    if (error) {
      throw this.handleError(error, "getVendorHeatMetrics");
    }

    return (
      data?.map((row: Record<string, unknown>) => ({
        vendorId: String(row.vendor_id),
        medianDaysToFirstSale: Number(row.median_days_to_first_sale ?? -1),
        avgDaysToFirstSale: Number(row.avg_days_to_first_sale ?? -1),
        packsWithSales: Number(row.packs_with_sales || 0),
        avgDaysBetweenSales: Number(row.avg_days_between_sales ?? -1),
        agentsPurchased30d: Number(row.agents_purchased_30d || 0),
        agentsWithSales30d: Number(row.agents_with_sales_30d || 0),
        avgPoliciesPerPack: Number(row.avg_policies_per_pack || 0),
        daysSinceLastSale: Number(row.days_since_last_sale ?? 999),
        salesLast30d: Number(row.sales_last_30d || 0),
        salesLast90d: Number(row.sales_last_90d || 0),
        totalPacks90d: Number(row.total_packs_90d || 0),
        totalLeads90d: Number(row.total_leads_90d || 0),
        totalPoliciesAllTime: Number(row.total_policies_all_time || 0),
      })) || []
    );
  }
}
