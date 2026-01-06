// src/services/lead-purchases/LeadVendorRepository.ts
import { BaseRepository } from "../base/BaseRepository";
import type {
  LeadVendor,
  CreateLeadVendorData,
  UpdateLeadVendorData,
  VendorWithStats,
  MergeVendorsResult,
} from "@/types/lead-purchase.types";
import {
  transformLeadVendorFromDB,
  transformLeadVendorToDB,
} from "@/types/lead-purchase.types";

export class LeadVendorRepository extends BaseRepository<
  LeadVendor,
  CreateLeadVendorData,
  UpdateLeadVendorData
> {
  constructor() {
    super("lead_vendors");
  }

  protected transformFromDB(dbRecord: Record<string, unknown>): LeadVendor {
    return transformLeadVendorFromDB(
      dbRecord as Parameters<typeof transformLeadVendorFromDB>[0],
    );
  }

  protected transformToDB(
    data: CreateLeadVendorData | UpdateLeadVendorData,
  ): Record<string, unknown> {
    return transformLeadVendorToDB(data) as Record<string, unknown>;
  }

  /**
   * Override create to inject imo_id and created_by from current user
   */
  async create(data: CreateLeadVendorData): Promise<LeadVendor> {
    // Get current user for created_by and imo_id
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get user's imo_id from user_profiles table (not users/auth table)
    const { data: userProfile, error: profileError } = await this.client
      .from("user_profiles")
      .select("imo_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile?.imo_id) {
      throw new Error("Could not determine user IMO");
    }

    // Transform data and add required fields
    const dbData = {
      ...this.transformToDB(data),
      imo_id: userProfile.imo_id,
      created_by: user.id,
    };

    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(dbData)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "create");
    }

    return this.transformFromDB(result);
  }

  /**
   * Find all active vendors for the current user's IMO
   */
  async findActiveVendors(): Promise<LeadVendor[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      throw this.handleError(error, "findActiveVendors");
    }

    return data?.map((row) => this.transformFromDB(row)) || [];
  }

  /**
   * Find vendor by name within the same IMO
   */
  async findByName(name: string): Promise<LeadVendor | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .ilike("name", name)
      .maybeSingle();

    if (error) {
      throw this.handleError(error, "findByName");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Search vendors by name
   */
  async searchByName(searchTerm: string): Promise<LeadVendor[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .ilike("name", `%${searchTerm}%`)
      .eq("is_active", true)
      .order("name", { ascending: true })
      .limit(20);

    if (error) {
      throw this.handleError(error, "searchByName");
    }

    return data?.map((row) => this.transformFromDB(row)) || [];
  }

  /**
   * Soft delete a vendor (set is_active = false)
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await this.client
      .from(this.tableName)
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      throw this.handleError(error, "softDelete");
    }
  }

  /**
   * Find all vendors with purchase stats (for management UI)
   */
  async findAllWithStats(includeInactive = false): Promise<VendorWithStats[]> {
    const { data, error } = await this.client.rpc("get_vendors_with_stats", {
      p_imo_id: null, // Will default to current user's IMO
      p_include_inactive: includeInactive,
    });

    if (error) {
      throw this.handleError(error, "findAllWithStats");
    }

    return (
      data?.map((row: Record<string, unknown>) => ({
        id: String(row.vendor_id),
        name: String(row.vendor_name),
        contactName: row.contact_name ? String(row.contact_name) : null,
        contactEmail: row.contact_email ? String(row.contact_email) : null,
        contactPhone: row.contact_phone ? String(row.contact_phone) : null,
        website: row.website ? String(row.website) : null,
        isActive: Boolean(row.is_active),
        createdAt: String(row.created_at),
        createdBy: String(row.created_by),
        totalPurchases: Number(row.total_purchases || 0),
        totalSpent: Number(row.total_spent || 0),
        uniqueUsers: Number(row.unique_users || 0),
      })) || []
    );
  }

  /**
   * Merge multiple vendors into one (reassigns all purchases)
   */
  async mergeVendors(
    keepVendorId: string,
    mergeVendorIds: string[],
  ): Promise<MergeVendorsResult> {
    const { data, error } = await this.client.rpc("merge_vendors", {
      p_keep_vendor_id: keepVendorId,
      p_merge_vendor_ids: mergeVendorIds,
    });

    if (error) {
      throw this.handleError(error, "mergeVendors");
    }

    const row = data?.[0];
    return {
      reassignedCount: Number(row?.reassigned_count || 0),
      mergedVendorCount: Number(row?.merged_vendor_count || 0),
    };
  }

  /**
   * Toggle vendor active status
   */
  async toggleActive(id: string, isActive: boolean): Promise<LeadVendor> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ is_active: isActive })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "toggleActive");
    }

    return this.transformFromDB(data);
  }
}
