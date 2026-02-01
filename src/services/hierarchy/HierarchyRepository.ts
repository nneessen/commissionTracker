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
   * Escape special characters in LIKE patterns to prevent SQL injection
   * and unintended wildcard matching (%, _, \)
   */
  private escapeLikePattern(pattern: string): string {
    return pattern.replace(/[%_\\]/g, "\\$&");
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
    // Escape special LIKE characters to prevent injection/unintended matches
    const escapedPath = this.escapeLikePattern(hierarchyPath);

    let query = this.client
      .from(this.tableName)
      .select("*")
      .like("hierarchy_path", `${escapedPath}.%`);

    // Only return approved agents (not recruits still in pipeline)
    // An "active agent" is defined as:
    //   - approval_status = 'approved'
    //   - archived_at IS NULL
    //   - Has role 'agent' OR 'active_agent' (OR is_admin = true - handled server-side)
    //   - NOT a pure recruit (has 'recruit' role without 'agent' or 'active_agent')
    if (approvedOnly) {
      query = query
        .eq("approval_status", "approved")
        .is("archived_at", null)
        // Must have agent or active_agent role
        .or("roles.cs.{agent},roles.cs.{active_agent},is_admin.eq.true")
        // Exclude pure recruits (those with 'recruit' role but no 'agent' or 'active_agent')
        // Note: This filter excludes anyone with recruit role. Users with both recruit
        // and agent roles would be included by the above OR but excluded here.
        // However, in practice, graduated agents should have 'recruit' removed.
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
    if (options?.limit !== undefined && options?.offset !== undefined) {
      // Both limit and offset: use range for proper pagination
      query = query.range(options.offset, options.offset + options.limit - 1);
    } else if (options?.limit !== undefined) {
      // Only limit: simple limit
      query = query.limit(options.limit);
    } else if (options?.offset !== undefined) {
      // Only offset without limit: skip first N rows
      query = query.range(options.offset, options.offset + 999);
    }

    const { data, error } = await query;

    if (error) {
      throw this.handleError(error, "findDownlinesByHierarchyPath");
    }

    return data?.map((item) => this.transformFromDB(item)) || [];
  }

  /**
   * Get direct reports (agents where upline_id = given agent)
   *
   * @param uplineId - The upline's user ID
   * @param agencyId - Optional agency ID to filter by (for multi-agency support)
   * @param approvedAgentsOnly - If true (default), only returns approved agents (excludes recruits)
   */
  async findDirectReportsByUplineId(
    uplineId: string,
    agencyId?: string,
    approvedAgentsOnly: boolean = true,
  ): Promise<DirectReportProfile[]> {
    let query = this.client
      .from(this.tableName)
      .select("id, email, first_name, last_name, contract_level, created_at")
      .eq("upline_id", uplineId);

    // Filter by agency if provided (multi-agency support)
    if (agencyId) {
      query = query.eq("agency_id", agencyId);
    }

    // Only return approved agents (not recruits, not archived, not pending)
    // An "active agent" is defined as:
    //   - approval_status = 'approved'
    //   - archived_at IS NULL
    //   - Has role 'agent' OR 'active_agent' (OR is_admin = true)
    //   - NOT a pure recruit
    if (approvedAgentsOnly) {
      query = query
        .eq("approval_status", "approved")
        .is("archived_at", null)
        // Must have agent or active_agent role
        .or("roles.cs.{agent},roles.cs.{active_agent},is_admin.eq.true")
        // Exclude pure recruits
        .not("roles", "cs", '{"recruit"}');
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw this.handleError(error, "findDirectReportsByUplineId");
    }

    return (data as DirectReportProfile[]) || [];
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
