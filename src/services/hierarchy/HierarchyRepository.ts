// src/services/hierarchy/HierarchyRepository.ts
// Repository for hierarchy-related data access
// Handles ONLY user_profiles hierarchy queries

import {
  BaseRepository,
  BaseEntity,
  QueryOptions,
} from "../base/BaseRepository";
import type { UserProfile } from "@/types/user.types";

type HierarchyBaseEntity = UserProfile & BaseEntity;

// ---------------------------------------------------------------------------
// Type definitions for repository return values
// ---------------------------------------------------------------------------

export interface DirectReportProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  contract_level: number | null;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// HierarchyRepository
// ---------------------------------------------------------------------------

/**
 * Repository for hierarchy-related data access
 * Extends BaseRepository for standard CRUD on user_profiles
 *
 * IMPORTANT: This repository ONLY handles user_profiles table queries.
 * For policy, commission, or override queries, use:
 * - PolicyRepository (src/services/policies/)
 * - CommissionRepository (src/services/commissions/)
 * - OverrideRepository (src/services/overrides/)
 */
export class HierarchyRepository extends BaseRepository<
  HierarchyBaseEntity,
  Partial<UserProfile>,
  Partial<UserProfile>
> {
  constructor() {
    super("user_profiles");
  }

  /**
   * Transform database record to entity
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): HierarchyBaseEntity {
    return dbRecord as unknown as HierarchyBaseEntity;
  }

  /**
   * Transform entity to database record
   */
  protected transformToDB(data: Partial<UserProfile>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const fields = ["upline_id", "hierarchy_path", "hierarchy_depth"];

    for (const field of fields) {
      if (field in data) {
        result[field] = (data as Record<string, unknown>)[field];
      }
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // HIERARCHY QUERIES (user_profiles table only)
  // -------------------------------------------------------------------------

  /**
   * Get downlines by hierarchy path prefix (LIKE query)
   * Returns all agents whose hierarchy_path starts with the given prefix
   *
   * @param hierarchyPath - The hierarchy path prefix to match
   * @param options - Query options (limit, offset, orderBy)
   * @param agencyId - Optional agency ID to filter by (for multi-agency support)
   */
  async findDownlinesByHierarchyPath(
    hierarchyPath: string,
    options?: QueryOptions,
    agencyId?: string,
    approvedOnly: boolean = true,
  ): Promise<HierarchyBaseEntity[]> {
    let query = this.client
      .from(this.tableName)
      .select("*")
      .like("hierarchy_path", `${hierarchyPath}.%`);

    // Only return approved agents (not recruits still in pipeline)
    if (approvedOnly) {
      query = query
        .eq("approval_status", "approved")
        // Exclude users with 'recruit' role - they're in the recruiting pipeline
        .not("roles", "cs", '{"recruit"}');
    }

    // Filter by agency if provided (multi-agency support)
    if (agencyId) {
      query = query.eq("agency_id", agencyId);
    }

    // Apply ordering
    const orderBy = options?.orderBy || "hierarchy_depth";
    const ascending = options?.orderDirection !== "desc";
    query = query.order(orderBy, { ascending });

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1,
      );
    }

    const { data, error } = await query;

    if (error) {
      throw this.handleError(error, "findDownlinesByHierarchyPath");
    }

    return data?.map((item) => this.transformFromDB(item)) || [];
  }

  /**
   * Get downlines within the same agency as the caller
   * This is the preferred method for multi-agency systems
   *
   * @param hierarchyPath - The hierarchy path prefix to match
   * @param agencyId - The agency ID to filter by
   * @param options - Query options
   */
  async findDownlinesByHierarchyPathInAgency(
    hierarchyPath: string,
    agencyId: string,
    options?: QueryOptions,
  ): Promise<HierarchyBaseEntity[]> {
    return this.findDownlinesByHierarchyPath(hierarchyPath, options, agencyId);
  }

  /**
   * Get direct reports (agents where upline_id = given agent)
   *
   * @param uplineId - The upline's user ID
   * @param agencyId - Optional agency ID to filter by (for multi-agency support)
   */
  async findDirectReportsByUplineId(
    uplineId: string,
    agencyId?: string,
  ): Promise<DirectReportProfile[]> {
    let query = this.client
      .from(this.tableName)
      .select("id, email, first_name, last_name, contract_level, created_at")
      .eq("upline_id", uplineId);

    // Filter by agency if provided (multi-agency support)
    if (agencyId) {
      query = query.eq("agency_id", agencyId);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw this.handleError(error, "findDirectReportsByUplineId");
    }

    return (data as DirectReportProfile[]) || [];
  }

  /**
   * Get direct reports within the same agency
   * This is the preferred method for multi-agency systems
   */
  async findDirectReportsInAgency(
    uplineId: string,
    agencyId: string,
  ): Promise<DirectReportProfile[]> {
    return this.findDirectReportsByUplineId(uplineId, agencyId);
  }

  /**
   * Find profiles by list of IDs
   */
  async findByIds(ids: string[]): Promise<HierarchyBaseEntity[]> {
    if (ids.length === 0) return [];

    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .in("id", ids)
      .order("hierarchy_depth", { ascending: true });

    if (error) {
      throw this.handleError(error, "findByIds");
    }

    return data?.map((item) => this.transformFromDB(item)) || [];
  }

  /**
   * Update agent's upline
   */
  async updateUpline(
    agentId: string,
    newUplineId: string | null,
  ): Promise<HierarchyBaseEntity> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({ upline_id: newUplineId })
      .eq("id", agentId)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "updateUpline");
    }

    return this.transformFromDB(data);
  }
}

export type { HierarchyBaseEntity };
