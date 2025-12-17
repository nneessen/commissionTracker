// src/services/reports/drillDownService.ts

import { supabase } from "../base/supabase";
import {
  DrillDownContext,
  DrillDownData,
  DrillDownRecord,
} from "@/types/reports.types";

/**
 * Service for fetching drill-down data when users click on report elements
 */
export class DrillDownService {
  /**
   * Main entry point - routes to appropriate fetch method based on context type
   */
  static async fetchData(context: DrillDownContext): Promise<DrillDownData> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    switch (context.type) {
      case "commission-aging-bucket":
        return this.getCommissionsByAgingBucket(user.id, context);
      case "client-tier":
        return this.getClientsByTier(user.id, context);
      case "carrier":
        return this.getDataByCarrier(user.id, context);
      case "product":
        return this.getDataByProduct(user.id, context);
      default:
        throw new Error(`Unknown drill-down type: ${context.type}`);
    }
  }

  /**
   * Fetch commissions in a specific aging bucket
   */
  static async getCommissionsByAgingBucket(
    userId: string,
    context: DrillDownContext,
  ): Promise<DrillDownData> {
    const bucket = context.agingBucket || "0-3 months";
    const { filters } = context;

    // Map bucket to months_paid range
    const bucketRanges: Record<string, { min: number; max: number }> = {
      "0-3 months": { min: 0, max: 3 },
      "3-6 months": { min: 3, max: 6 },
      "6-9 months": { min: 6, max: 9 },
      "9-12 months": { min: 9, max: 12 },
      "12+ months": { min: 12, max: 999 },
    };

    const range = bucketRanges[bucket] || { min: 0, max: 3 };

    // Query commissions with policy details
    let query = supabase
      .from("commissions")
      .select(
        `
        id,
        amount,
        status,
        months_paid,
        unearned_amount,
        created_at,
        policy:policies(
          id,
          policy_number,
          annual_premium,
          status,
          client:clients(id, first_name, last_name),
          carrier:carriers(id, name),
          product:products(id, name)
        )
      `,
      )
      .eq("user_id", userId)
      .gte("months_paid", range.min)
      .lt("months_paid", range.max)
      .gte("created_at", filters.startDate.toISOString())
      .lte("created_at", filters.endDate.toISOString());

    // Apply optional filters
    if (filters.carrierIds?.length) {
      query = query.in("policy.carrier_id", filters.carrierIds);
    }

    const { data, error } = await query.order("unearned_amount", {
      ascending: false,
    });
    if (error) throw error;

    // Transform to DrillDownRecords
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- report data has dynamic shape
    const records: DrillDownRecord[] = (data || []).map((c: any) => ({
      id: c.id,
      type: "commission" as const,
      date: new Date(c.created_at).toLocaleDateString(),
      amount: c.unearned_amount || 0,
      status: c.status,
      policyNumber: c.policy?.policy_number,
      clientName: c.policy?.client
        ? `${c.policy.client.first_name} ${c.policy.client.last_name}`
        : "Unknown",
      carrierName: c.policy?.carrier?.name || "Unknown",
      productName: c.policy?.product?.name || "Unknown",
      monthsPaid: c.months_paid,
      annualPremium: c.policy?.annual_premium,
    }));

    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

    return {
      summary: {
        totalRecords: records.length,
        totalAmount,
        avgAmount: records.length > 0 ? totalAmount / records.length : 0,
        additionalMetrics: {
          bucket,
          riskLevel: range.min < 6 ? "High" : range.min < 9 ? "Medium" : "Low",
        },
      },
      records,
      columns: [
        { key: "policyNumber", label: "Policy", format: "text" },
        { key: "clientName", label: "Client", format: "text" },
        { key: "carrierName", label: "Carrier", format: "text" },
        { key: "monthsPaid", label: "Months Paid", format: "number" },
        { key: "amount", label: "At Risk", format: "currency" },
        { key: "status", label: "Status", format: "text" },
      ],
    };
  }

  /**
   * Fetch clients in a specific tier (A, B, C, D)
   */
  static async getClientsByTier(
    userId: string,
    context: DrillDownContext,
  ): Promise<DrillDownData> {
    const tier = context.clientTier || "A";
    const { filters: _filters } = context;

    // Query from materialized view mv_client_ltv
    const query = supabase
      .from("mv_client_ltv")
      .select("*")
      .eq("user_id", userId)
      .eq("tier", tier);

    const { data, error } = await query.order("total_premium", {
      ascending: false,
    });
    if (error) throw error;

    // Transform to DrillDownRecords
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- report data has dynamic shape
    const records: DrillDownRecord[] = (data || []).map((c: any) => ({
      id: c.client_id,
      type: "client" as const,
      date: "",
      amount: c.total_premium || 0,
      status: c.active_policies > 0 ? "Active" : "Inactive",
      clientName: c.client_name || "Unknown",
      tier: c.tier,
      annualPremium: c.total_premium,
    }));

    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

    return {
      summary: {
        totalRecords: records.length,
        totalAmount,
        avgAmount: records.length > 0 ? totalAmount / records.length : 0,
        additionalMetrics: {
          tier,
          tierDescription: this.getTierDescription(tier),
        },
      },
      records,
      columns: [
        { key: "clientName", label: "Client", format: "text" },
        { key: "amount", label: "Total Premium", format: "currency" },
        { key: "status", label: "Status", format: "text" },
        { key: "tier", label: "Tier", format: "text" },
      ],
    };
  }

  /**
   * Fetch commissions/policies for a specific carrier
   */
  static async getDataByCarrier(
    userId: string,
    context: DrillDownContext,
  ): Promise<DrillDownData> {
    const carrierId = context.carrierId;
    if (!carrierId) throw new Error("Carrier ID required");

    const { filters } = context;

    // Query policies with commissions for this carrier
    const query = supabase
      .from("policies")
      .select(
        `
        id,
        policy_number,
        annual_premium,
        status,
        effective_date,
        client:clients(id, first_name, last_name),
        carrier:carriers(id, name),
        product:products(id, name),
        commissions(id, amount, status, months_paid, unearned_amount)
      `,
      )
      .eq("user_id", userId)
      .eq("carrier_id", carrierId)
      .gte("effective_date", filters.startDate.toISOString())
      .lte("effective_date", filters.endDate.toISOString());

    const { data, error } = await query.order("annual_premium", {
      ascending: false,
    });
    if (error) throw error;

    // Transform to DrillDownRecords
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- report data has dynamic shape
    const records: DrillDownRecord[] = (data || []).map((p: any) => {
      const totalCommission = (p.commissions || []).reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- report data has dynamic shape
        (sum: number, c: any) => sum + (c.amount || 0),
        0,
      );
      return {
        id: p.id,
        type: "policy" as const,
        date: new Date(p.effective_date).toLocaleDateString(),
        amount: totalCommission,
        status: p.status,
        policyNumber: p.policy_number,
        clientName: p.client
          ? `${p.client.first_name} ${p.client.last_name}`
          : "Unknown",
        carrierName: p.carrier?.name || context.carrierName || "Unknown",
        productName: p.product?.name || "Unknown",
        annualPremium: p.annual_premium,
      };
    });

    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
    const totalPremium = records.reduce(
      (sum, r) => sum + (r.annualPremium || 0),
      0,
    );

    return {
      summary: {
        totalRecords: records.length,
        totalAmount,
        avgAmount: records.length > 0 ? totalAmount / records.length : 0,
        additionalMetrics: {
          totalPremium,
          carrierName: context.carrierName || "Carrier",
        },
      },
      records,
      columns: [
        { key: "policyNumber", label: "Policy", format: "text" },
        { key: "clientName", label: "Client", format: "text" },
        { key: "productName", label: "Product", format: "text" },
        { key: "date", label: "Effective Date", format: "date" },
        { key: "annualPremium", label: "Premium", format: "currency" },
        { key: "amount", label: "Commission", format: "currency" },
        { key: "status", label: "Status", format: "text" },
      ],
    };
  }

  /**
   * Fetch policies for a specific product
   */
  static async getDataByProduct(
    userId: string,
    context: DrillDownContext,
  ): Promise<DrillDownData> {
    const productId = context.productId;
    if (!productId) throw new Error("Product ID required");

    const { filters } = context;

    const query = supabase
      .from("policies")
      .select(
        `
        id,
        policy_number,
        annual_premium,
        status,
        effective_date,
        client:clients(id, first_name, last_name),
        carrier:carriers(id, name),
        product:products(id, name)
      `,
      )
      .eq("user_id", userId)
      .eq("product_id", productId)
      .gte("effective_date", filters.startDate.toISOString())
      .lte("effective_date", filters.endDate.toISOString());

    const { data, error } = await query.order("annual_premium", {
      ascending: false,
    });
    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- report data has dynamic shape
    const records: DrillDownRecord[] = (data || []).map((p: any) => ({
      id: p.id,
      type: "policy" as const,
      date: new Date(p.effective_date).toLocaleDateString(),
      amount: p.annual_premium || 0,
      status: p.status,
      policyNumber: p.policy_number,
      clientName: p.client
        ? `${p.client.first_name} ${p.client.last_name}`
        : "Unknown",
      carrierName: p.carrier?.name || "Unknown",
      productName: p.product?.name || context.productName || "Unknown",
      annualPremium: p.annual_premium,
    }));

    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

    return {
      summary: {
        totalRecords: records.length,
        totalAmount,
        avgAmount: records.length > 0 ? totalAmount / records.length : 0,
        additionalMetrics: {
          productName: context.productName || "Product",
        },
      },
      records,
      columns: [
        { key: "policyNumber", label: "Policy", format: "text" },
        { key: "clientName", label: "Client", format: "text" },
        { key: "carrierName", label: "Carrier", format: "text" },
        { key: "date", label: "Effective Date", format: "date" },
        { key: "annualPremium", label: "Premium", format: "currency" },
        { key: "status", label: "Status", format: "text" },
      ],
    };
  }

  /**
   * Helper to get tier description
   */
  private static getTierDescription(tier: string): string {
    const descriptions: Record<string, string> = {
      A: "High-value clients ($10K+ premium)",
      B: "Growth clients ($5K-$10K premium)",
      C: "Standard clients ($2K-$5K premium)",
      D: "Entry-level clients (<$2K premium)",
    };
    return descriptions[tier] || "Unknown tier";
  }
}
