// src/services/users/UserRepository.ts

import {
  BaseRepository,
  BaseEntity,
  QueryOptions,
} from "../base/BaseRepository";
import type {
  UserProfile,
  UserProfileInsert,
  UserProfileUpdate,
  ApprovalStatus,
  AgentStatus,
} from "@/types/user.types";

type UserBaseEntity = UserProfile & BaseEntity;

export interface UserFilters {
  roles?: string[];
  approvalStatus?: ApprovalStatus;
  agentStatus?: AgentStatus;
  contractLevel?: number;
  email?: string;
}

/**
 * Repository for user_profiles data access
 *
 * NOTE: Most operations respect RLS policies. Admin operations use
 * dedicated RPC functions that have their own permission checks.
 */
export class UserRepository extends BaseRepository<
  UserBaseEntity,
  UserProfileInsert,
  UserProfileUpdate
> {
  constructor() {
    super("user_profiles");
  }

  /**
   * Transform database record to entity
   */
  protected transformFromDB(dbRecord: Record<string, unknown>): UserBaseEntity {
    return dbRecord as unknown as UserBaseEntity;
  }

  /**
   * Transform entity to database record
   */
  protected transformToDB(
    data: UserProfileInsert | UserProfileUpdate,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // NOTE: are all fields listed below suppose to be here?
    const fields = [
      "first_name",
      "last_name",
      "email",
      "phone",
      "upline_id",
      "recruiter_id",
      "referral_source",
      "agent_status",
      "approval_status",
      "onboarding_status",
      "current_onboarding_phase",
      "onboarding_started_at",
      "onboarding_completed_at",
      "contract_level",
      "license_number",
      "is_admin",
      "roles",
      "profile_photo_url",
      "street_address",
      "city",
      "state",
      "zip",
      "resident_state",
      "date_of_birth",
      "npn",
      "licensing_info",
      "hierarchy_path",
      "hierarchy_depth",
      "pipeline_template_id",
      "imo_id",
      "agency_id",
    ];

    for (const field of fields) {
      if (field in data) {
        result[field] = (data as Record<string, unknown>)[field];
      }
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // READ OPERATIONS
  // -------------------------------------------------------------------------

  /**
   * Find user by email
   * Returns null if not found (does not throw)
   */
  async findByEmail(email: string): Promise<UserBaseEntity | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw this.handleError(error, "findByEmail");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Find all users with role-based filtering
   */
  async findWithFilters(
    filters?: UserFilters,
    options?: QueryOptions,
  ): Promise<UserBaseEntity[]> {
    let query = this.client
      .from(this.tableName)
      .select("*, upline:upline_id(id, first_name, last_name)");

    if (filters) {
      if (filters.roles && filters.roles.length > 0) {
        query = query.contains("roles", filters.roles);
      }
      if (filters.approvalStatus) {
        query = query.eq("approval_status", filters.approvalStatus);
      }
      if (filters.agentStatus) {
        query = query.eq("agent_status", filters.agentStatus);
      }
      if (filters.contractLevel) {
        query = query.eq("contract_level", filters.contractLevel);
      }
      if (filters.email) {
        query = query.eq("email", filters.email.toLowerCase());
      }
    }

    // Apply sorting
    const orderBy = options?.orderBy || "created_at";
    const ascending = options?.orderDirection === "asc";
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
      throw this.handleError(error, "findWithFilters");
    }

    return data?.map((item) => this.transformFromDB(item)) || [];
  }

  /**
   * Find all agents (users with 'agent' or 'active_agent' role)
   */
  async findAllAgents(): Promise<UserBaseEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .or("roles.cs.{agent},roles.cs.{active_agent}")
      .order("created_at", { ascending: false });

    if (error) {
      throw this.handleError(error, "findAllAgents");
    }

    return data?.map((item) => this.transformFromDB(item)) || [];
  }

  /**
   * Check if email already exists
   */
  async emailExists(email: string): Promise<boolean> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (error) {
      throw this.handleError(error, "emailExists");
    }

    return data !== null;
  }

  // -------------------------------------------------------------------------
  // ADMIN RPC OPERATIONS
  // These use RPC functions with built-in permission checks
  // -------------------------------------------------------------------------

  /**
   * Get user profile via admin RPC (bypasses RLS for admin access)
   * The RPC function validates admin permissions internally
   */
  async adminGetUserProfile(
    targetUserId: string,
  ): Promise<UserBaseEntity | null> {
    const { data, error } = await this.client.rpc("admin_getuser_profile", {
      target_user_id: targetUserId,
    });

    if (error) {
      throw this.handleError(error, "adminGetUserProfile");
    }

    const profile = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return profile ? this.transformFromDB(profile) : null;
  }

  /**
   * Get all users via admin RPC (bypasses RLS for admin access)
   * The RPC function validates admin permissions internally
   */
  async adminGetAllUsers(): Promise<UserBaseEntity[]> {
    const { data, error } = await this.client.rpc("admin_get_allusers");

    if (error) {
      throw this.handleError(error, "adminGetAllUsers");
    }

    return (data as UserBaseEntity[]) || [];
  }

  /**
   * Get pending users via admin RPC
   * The RPC function validates admin permissions internally
   */
  async adminGetPendingUsers(): Promise<UserBaseEntity[]> {
    const { data, error } = await this.client.rpc("admin_get_pendingusers");

    if (error) {
      throw this.handleError(error, "adminGetPendingUsers");
    }

    return (data as UserBaseEntity[]) || [];
  }

  /**
   * Approve user via admin RPC
   * The RPC function validates admin permissions internally
   */
  async adminApproveUser(
    targetUserId: string,
    approverId: string,
  ): Promise<void> {
    const { error } = await this.client.rpc("admin_approveuser", {
      target_user_id: targetUserId,
      approver_id: approverId,
    });

    if (error) {
      throw this.handleError(error, "adminApproveUser");
    }
  }

  /**
   * Deny user via admin RPC
   * The RPC function validates admin permissions internally
   */
  async adminDenyUser(
    targetUserId: string,
    approverId: string,
    reason: string,
  ): Promise<void> {
    const { error } = await this.client.rpc("admin_denyuser", {
      target_user_id: targetUserId,
      approver_id: approverId,
      reason,
    });

    if (error) {
      throw this.handleError(error, "adminDenyUser");
    }
  }

  /**
   * Set user to pending via admin RPC
   * The RPC function validates admin permissions internally
   */
  async adminSetPendingUser(targetUserId: string): Promise<void> {
    const { error } = await this.client.rpc("admin_set_pendinguser", {
      target_user_id: targetUserId,
    });

    if (error) {
      throw this.handleError(error, "adminSetPendingUser");
    }
  }

  /**
   * Set admin role via admin RPC
   * The RPC function validates admin permissions internally
   */
  async adminSetAdminRole(
    targetUserId: string,
    isAdmin: boolean,
  ): Promise<void> {
    const { error } = await this.client.rpc("admin_set_admin_role", {
      target_user_id: targetUserId,
      new_is_admin: isAdmin,
    });

    if (error) {
      throw this.handleError(error, "adminSetAdminRole");
    }
  }

  /**
   * Delete user via admin RPC
   * The RPC function validates admin permissions internally
   * Returns the result object from the RPC function
   */
  async adminDeleteUser(
    targetUserId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await this.client.rpc("admin_deleteuser", {
      target_user_id: targetUserId,
    });

    if (error) {
      throw this.handleError(error, "adminDeleteUser");
    }

    // The RPC may return a result object indicating success/failure
    if (
      data &&
      typeof data === "object" &&
      (data as { success?: boolean }).success === false
    ) {
      return {
        success: false,
        error: (data as { error?: string }).error || "Delete operation failed",
      };
    }

    return { success: true };
  }

  // -------------------------------------------------------------------------
  // STATS OPERATIONS
  // -------------------------------------------------------------------------

  /**
   * Get approval statistics
   */
  async getApprovalStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    denied: number;
  }> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("approval_status");

    if (error) {
      throw this.handleError(error, "getApprovalStats");
    }

    const profiles = data || [];
    return {
      total: profiles.length,
      pending: profiles.filter((u) => u.approval_status === "pending").length,
      approved: profiles.filter((u) => u.approval_status === "approved").length,
      denied: profiles.filter((u) => u.approval_status === "denied").length,
    };
  }
}

export type { UserBaseEntity };
