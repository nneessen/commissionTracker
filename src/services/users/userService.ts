// /home/nneessen/projects/commissionTracker/src/services/users/userService.ts

import { supabase } from "../base/supabase";
import { logger } from "../base/logger";
import { User, CreateUserData, UpdateUserData } from "../../types/user.types";
import type { RoleName } from "../../types/permissions.types";
import type { Database } from "../../types/database.types";

export type { CreateUserData, UpdateUserData };

// Use the generated type from database.types.ts
export type UserProfile =
  Database["public"]["Tables"]["user_profiles"]["Row"] & {
    // Add the optional joined upline data that's not in the base table
    upline?: {
      id: string;
      email: string;
      first_name?: string | null;
      last_name?: string | null;
    } | null;
    // Add missing fields that might not be in database yet but are needed
    full_name?: string | null;
    hire_date?: string | null;
    agent_code?: string | null;
    license_state?: string | null;
    license_states?: string[] | null;
    notes?: string | null;
    ytd_commission?: number | null;
    ytd_premium?: number | null;
    zip?: string | null;
  };

export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  denied: number;
}

interface UserServiceFilter {
  roles?: RoleName[];
  approvalStatus?: "pending" | "approved" | "denied";
  agentStatus?: "licensed" | "unlicensed" | "not_applicable";
  includeDeleted?: boolean;
}

// Valid contract levels for insurance agents
// TODO: this is a constont and should be where constants are held
export const VALID_CONTRACT_LEVELS = [
  80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145,
];

class UserService {
  private currentUserCache: { user: UserProfile; timestamp: number } | null =
    null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      if (this.currentUserCache) {
        const age = Date.now() - this.currentUserCache.timestamp;
        if (age < this.CACHE_TTL) {
          return this.currentUserCache.user;
        }
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        logger.error(
          "Failed to get authenticated user",
          authError,
          "UserService",
        );
        return null;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        logger.error(
          "Failed to fetch user profile",
          error as Error,
          "UserService",
        );

        if (user.email === "nick@nickneessen.com") {
          console.warn(
            "[UserService] Admin user query blocked by RLS, using fallback",
          );
          return {
            id: user.id,
            user_id: user.id,
            email: user.email,
            approval_status: "approved",
            is_admin: true,
            is_super_admin: true,
            roles: ["admin"],
            agent_status: "licensed",
            approved_at: new Date().toISOString(),
            created_at: user.created_at,
            updated_at: new Date().toISOString(),
          } as UserProfile;
        }

        return null;
      }

      // Cache the result
      if (data) {
        this.currentUserCache = {
          user: data as UserProfile,
          timestamp: Date.now(),
        };
      }

      return data as UserProfile;
    } catch (error) {
      logger.error(
        "Error in getCurrentUserProfile",
        error as Error,
        "UserService",
      );
      return null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const profile = await this.getCurrentUserProfile();
    if (!profile) return null;
    return this.transformProfileToUser(profile);
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      let { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      // If that fails, try by user_id
      if (error?.code === "PGRST116" || !data) {
        const result = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        data = result.data;
        error = result.error;
      }

      if (error || !data) {
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "admin_getuser_profile",
          {
            target_user_id: userId,
          },
        );

        if (rpcError) {
          logger.error("Failed to fetch user profile", rpcError, "UserService");
          return null;
        }

        const profile =
          Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : null;
        return profile as UserProfile;
      }

      return data as UserProfile;
    } catch (error) {
      logger.error("Error in getUserProfile", error as Error, "UserService");
      return null;
    }
  }

  async getById(id: string): Promise<User | null> {
    const profile = await this.getUserProfile(id);
    if (!profile) return null;
    return this.transformProfileToUser(profile);
  }

  async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", email.toLowerCase())
      .neq("is_deleted", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch user by email: ${error.message}`);
    }

    return data ? this.transformProfileToUser(data as UserProfile) : null;
  }

  async getAll(filter?: UserServiceFilter): Promise<User[]> {
    let query = supabase.from("user_profiles").select("*");

    // Apply filters
    if (filter?.roles && filter.roles.length > 0) {
      query = query.contains("roles", filter.roles);
    }
    if (filter?.approvalStatus) {
      query = query.eq("approval_status", filter.approvalStatus);
    }
    if (filter?.agentStatus) {
      query = query.eq("agent_status", filter.agentStatus);
    }
    if (!filter?.includeDeleted) {
      query = query.neq("is_deleted", true);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      const { data: rpcData, error: rpcError } =
        await supabase.rpc("admin_get_allusers");

      if (rpcError) {
        logger.error("Failed to fetch users", rpcError, "UserService");
        return [];
      }

      return ((rpcData as UserProfile[]) || []).map(
        this.transformProfileToUser,
      );
    }

    return (
      data?.map((profile) =>
        this.transformProfileToUser(profile as UserProfile),
      ) || []
    );
  }

  /**
   * Get all agents (users with 'agent' or 'active_agent' role)
   */
  async getAllAgents(): Promise<User[]> {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .or(`roles.cs.{agent},roles.cs.{active_agent}`)
      .neq("is_deleted", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }

    return (
      data?.map((profile) =>
        this.transformProfileToUser(profile as UserProfile),
      ) || []
    );
  }

  /**
   * Get all active agents (approved agents with licensed status)
   */
  async getActiveAgents(): Promise<User[]> {
    return this.getAll({
      roles: ["active_agent"],
      approvalStatus: "approved",
      agentStatus: "licensed",
    });
  }

  /**
   * Get all recruits
   */
  async getRecruits(): Promise<User[]> {
    return this.getAll({
      roles: ["recruit"],
    });
  }

  /**
   * Get all admins
   */
  async getAdmins(): Promise<User[]> {
    return this.getAll({
      roles: ["admin"],
    });
  }

  /**
   * Get users by contract level
   */
  async getByContractLevel(contractLevel: number): Promise<User[]> {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("contract_level", contractLevel)
      .neq("is_deleted", true)
      .order("first_name", { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch users by contract level: ${error.message}`,
      );
    }

    return (
      data?.map((profile) =>
        this.transformProfileToUser(profile as UserProfile),
      ) || []
    );
  }

  /**
   * Get pending users (awaiting approval)
   */
  async getPendingUsers(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase.rpc("admin_get_pendingusers");

      if (error) {
        logger.error(
          "Failed to fetch pending users",
          error as Error,
          "UserService",
        );
        return [];
      }

      return (data as UserProfile[]) || [];
    } catch (error) {
      logger.error("Error in getPendingUsers", error as Error, "UserService");
      return [];
    }
  }

  // ============================================
  // USER CRUD OPERATIONS
  // ============================================

  /**
   * Create a new user with appropriate role and status
   * Handles both admin-created users and self-registration
   */
  async create(
    userData: CreateUserData & {
      roles?: RoleName[];
      approval_status?: "pending" | "approved";
      onboarding_status?: string | null;
      sendInvite?: boolean;
      upline_id?: string | null;
      agent_status?: "licensed" | "unlicensed" | "not_applicable";
    },
  ): Promise<{
    success: boolean;
    user?: User;
    userId?: string;
    error?: string;
    inviteSent?: boolean;
  }> {
    try {
      const email = userData.email.toLowerCase().trim();

      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("id, email")
        .eq("email", email)
        .maybeSingle();

      if (existingProfile) {
        return {
          success: false,
          error: `A user with email ${userData.email} already exists`,
        };
      }

      // Determine appropriate role and status
      let assignedRoles = userData.roles;
      let agentStatus = userData.agent_status || "not_applicable";
      let approvalStatus = userData.approval_status || "approved";

      if (!assignedRoles || assignedRoles.length === 0) {
        // Auto-assign role based on context
        if (userData.contractCompLevel && userData.contractCompLevel >= 50) {
          assignedRoles = ["active_agent"];
          agentStatus = "licensed";
        } else if (
          userData.contractCompLevel &&
          userData.contractCompLevel < 50
        ) {
          assignedRoles = ["agent"];
          agentStatus = "licensed";
        } else {
          // Default to recruit if no contract level specified
          assignedRoles = ["recruit"];
          agentStatus = "unlicensed";
          approvalStatus = "pending"; // Recruits start as pending
        }
      } else {
        // Set agent_status based on provided roles
        if (
          assignedRoles.includes("active_agent") ||
          assignedRoles.includes("agent")
        ) {
          agentStatus = "licensed";
        } else if (assignedRoles.includes("recruit")) {
          agentStatus = "unlicensed";
          approvalStatus = "pending";
        } else if (assignedRoles.includes("admin")) {
          agentStatus = "licensed";
        }
      }

      // Build profile data
      const profileData: Partial<UserProfile> = {
        email: email,
        first_name: userData.name ? userData.name.split(" ")[0] : "",
        last_name: userData.name
          ? userData.name.split(" ").slice(1).join(" ")
          : "",
        phone: userData.phone?.trim() || undefined,
        upline_id: userData.upline_id || undefined,
        roles: assignedRoles,
        agent_status: agentStatus,
        approval_status: approvalStatus,
        onboarding_status: userData.onboarding_status || null,
        user_id: null, // Will be set when user clicks magic link
        contract_level: userData.contractCompLevel,
        license_number: userData.licenseNumber,
        license_states: userData.licenseStates,
        hire_date: userData.hireDate
          ? userData.hireDate.toISOString()
          : undefined,
        hierarchy_path: "",
        hierarchy_depth: 0,
        is_admin: assignedRoles.includes("admin"),
        is_super_admin: email === "nick@nickneessen.com",
        ytd_commission: userData.ytdCommission,
        ytd_premium: userData.ytdPremium,
      };

      // Create user profile
      const { data, error } = await supabase
        .from("user_profiles")
        .insert(profileData)
        .select()
        .single();

      if (error) {
        logger.error(
          "Failed to create user profile",
          error as Error,
          "UserService",
        );
        return { success: false, error: error.message };
      }

      // Send confirmation/password reset email if requested
      let inviteSent = false;
      if (userData.sendInvite !== false) {
        // First, create the auth user WITHOUT sending any email
        const { data: authData, error: createError } =
          await supabase.auth.admin.createUser({
            email: email,
            email_confirm: false, // Don't auto-confirm the email
            user_metadata: {
              email: email,
              first_name: userData.name ? userData.name.split(" ")[0] : "",
              last_name: userData.name
                ? userData.name.split(" ").slice(1).join(" ")
                : "",
              roles: assignedRoles,
              agent_status: agentStatus,
              approval_status: approvalStatus,
              profile_id: data?.id,
            },
          });

        if (createError) {
          // If user already exists, that's ok - just get their ID and send reset email
          if (createError.message?.includes("already exists")) {
            // User exists, send password reset email instead
            const { error: resetError } =
              await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
              });

            if (resetError) {
              logger.error(
                "Failed to send password reset email",
                resetError,
                "UserService",
              );
              return {
                success: true,
                userId: data?.id,
                user: this.transformProfileToUser(data as UserProfile),
                inviteSent: false,
                error: `Profile created but password reset email failed: ${resetError.message}`,
              };
            }
            inviteSent = true;
          } else {
            logger.error(
              "Failed to create auth user",
              createError,
              "UserService",
            );
            return {
              success: true,
              userId: data?.id,
              user: this.transformProfileToUser(data as UserProfile),
              inviteSent: false,
              error: `Profile created but auth user creation failed: ${createError.message}`,
            };
          }
        } else {
          // Auth user created successfully, now send password reset email
          // This acts as the confirmation email where they set their password
          const { error: resetError } =
            await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
            });

          if (resetError) {
            logger.error(
              "Failed to send password reset email",
              resetError,
              "UserService",
            );
            return {
              success: true,
              userId: data?.id,
              user: this.transformProfileToUser(data as UserProfile),
              inviteSent: false,
              error: `Profile and auth user created but password email failed: ${resetError.message}`,
            };
          }

          // Link the auth user to the profile
          if (authData?.user) {
            await supabase
              .from("user_profiles")
              .update({ user_id: authData.user.id })
              .eq("id", data?.id);
          }

          inviteSent = true;
        }
      }

      logger.info(`User profile created: ${email}`, "UserService");
      return {
        success: true,
        userId: data?.id,
        user: this.transformProfileToUser(data as UserProfile),
        inviteSent,
      };
    } catch (error) {
      logger.error("Error in create", error as Error, "UserService");
      return { success: false, error: "Failed to create user" };
    }
  }

  /**
   * Update user profile
   */
  async update(
    id: string,
    updates: Partial<UpdateUserData> & {
      roles?: RoleName[];
      approval_status?: "pending" | "approved" | "denied";
      agent_status?: "licensed" | "unlicensed" | "not_applicable";
      contract_level?: number;
    },
  ): Promise<User> {
    // Handle direct contract_level separately from transformUpdatesToDB
    const { contract_level, ...otherUpdates } = updates;
    const dbData = this.transformUpdatesToDB(otherUpdates);

    // Add contract_level directly if provided
    if (contract_level !== undefined) {
      dbData.contract_level = contract_level;
    }

    // If roles are being updated, also update agent_status accordingly
    if (updates.roles) {
      if (
        updates.roles.includes("active_agent") ||
        updates.roles.includes("agent")
      ) {
        dbData.agent_status = "licensed";
      } else if (updates.roles.includes("recruit")) {
        dbData.agent_status = "unlicensed";
      } else if (updates.roles.includes("admin")) {
        dbData.agent_status = "licensed";
      } else {
        dbData.agent_status = "not_applicable";
      }
    }

    // Handle approval_status if provided
    if (updates.approval_status) {
      dbData.approval_status = updates.approval_status;
    }

    // FIXED: Simplified query to avoid 406 errors
    const { data, error } = await supabase
      .from("user_profiles")
      .update(dbData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      // Special handling for edge cases
      if (error.code === "PGRST116" || error.message.includes("multiple")) {
        // Multiple rows returned, try with maybeSingle
        const { data: retryData, error: retryError } = await supabase
          .from("user_profiles")
          .update(dbData)
          .eq("id", id)
          .select()
          .maybeSingle();

        if (!retryError && retryData) {
          return this.transformProfileToUser(retryData as UserProfile);
        }
      }

      // Try to fetch the user to verify update worked
      const { data: fetchedData, error: fetchError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (!fetchError && fetchedData) {
        return this.transformProfileToUser(fetchedData as UserProfile);
      }

      throw new Error(`Failed to update user: ${error.message}`);
    }

    if (!data) {
      // If no data returned, fetch the user
      const { data: fetchedData, error: fetchError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch updated user: ${fetchError.message}`);
      }

      return this.transformProfileToUser(fetchedData as UserProfile);
    }

    // Clear cache if updating current user
    if (this.currentUserCache?.user.id === id) {
      this.clearCache();
    }

    return this.transformProfileToUser(data as UserProfile);
  }

  /**
   * Update current user's profile
   */
  async updateCurrentUserProfile(
    updates: Partial<UpdateUserData>,
  ): Promise<User | null> {
    const currentUser = await this.getCurrentUserProfile();
    if (!currentUser) {
      throw new Error("No authenticated user");
    }

    // Cast roles to RoleName[] if present
    const updateData: Record<string, unknown> = { ...updates };
    if (updateData.roles) {
      updateData.roles = updateData.roles as RoleName[];
    }

    return this.update(currentUser.id, updateData);
  }

  async approve(
    userId: string,
    role: RoleName = "active_agent",
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: "Not authenticated" };
      }

      const { data: _data, error } = await supabase.rpc("admin_approveuser", {
        target_user_id: userId,
        approver_id: user.id,
      });

      if (error) {
        logger.error("Failed to approve user", error as Error, "UserService");
        return { success: false, error: error.message };
      }

      // Update role if specified
      if (role && role !== "agent") {
        await this.update(userId, { roles: [role] });
      }

      return { success: true };
    } catch (error) {
      logger.error("Error in approve", error as Error, "UserService");
      return { success: false, error: "Failed to approve user" };
    }
  }

  async deny(
    userId: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: "Not authenticated" };
      }

      const { data: _data, error } = await supabase.rpc("admin_denyuser", {
        target_user_id: userId,
        approver_id: user.id,
        reason: reason || "No reason provided",
      });

      if (error) {
        logger.error("Failed to deny user", error as Error, "UserService");
        return { success: false, error: error.message };
      }

      logger.info(`User ${userId} denied by ${user.id}`, "UserService");
      return { success: true };
    } catch (error) {
      logger.error("Error in deny", error as Error, "UserService");
      return { success: false, error: "Failed to deny user" };
    }
  }

  async setPending(
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: _data, error } = await supabase.rpc(
        "admin_set_pendinguser",
        {
          target_user_id: userId,
        },
      );

      if (error) {
        logger.error(
          "Failed to set user to pending",
          error as Error,
          "UserService",
        );
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error("Error in setPending", error as Error, "UserService");
      return { success: false, error: "Failed to set user to pending" };
    }
  }

  async setAdminRole(
    userId: string,
    isAdmin: boolean,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: _data, error } = await supabase.rpc(
        "admin_set_admin_role",
        {
          target_user_id: userId,
          new_is_admin: isAdmin,
        },
      );

      if (error) {
        logger.error("Failed to set admin role", error as Error, "UserService");
        return { success: false, error: error.message };
      }

      const profile = await this.getUserProfile(userId);
      if (profile) {
        const newRoles = isAdmin
          ? [...(profile.roles || []), "admin"].filter(
              (v, i, a) => a.indexOf(v) === i,
            )
          : (profile.roles || []).filter((r) => r !== "admin");

        await this.update(userId, { roles: newRoles as RoleName[] });
      }

      logger.info(`User ${userId} admin role set to ${isAdmin}`, "UserService");
      return { success: true };
    } catch (error) {
      logger.error("Error in setAdminRole", error as Error, "UserService");
      return { success: false, error: "Failed to set admin role" };
    }
  }

  async updateContractLevel(
    userId: string,
    contractLevel: number | null,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate contract level
      if (
        contractLevel !== null &&
        !VALID_CONTRACT_LEVELS.includes(contractLevel)
      ) {
        return {
          success: false,
          error: `Invalid contract level. Must be one of: ${VALID_CONTRACT_LEVELS.join(", ")}`,
        };
      }

      const { data: _data, error } = await supabase
        .from("user_profiles")
        .update({ contract_level: contractLevel })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        logger.error(
          "Failed to update contract level",
          error as Error,
          "UserService",
        );
        return { success: false, error: error.message };
      }

      if (contractLevel && contractLevel >= 50) {
        const profile = await this.getUserProfile(userId);
        if (profile && profile.roles?.includes("agent")) {
          // Upgrade to active_agent
          await this.update(userId, {
            roles: profile.roles.map((r) =>
              r === "agent" ? "active_agent" : r,
            ) as RoleName[],
          });
        }
      }

      logger.info(
        `User ${userId} contract level set to ${contractLevel}`,
        "UserService",
      );
      return { success: true };
    } catch (error) {
      logger.error(
        "Error in updateContractLevel",
        error as Error,
        "UserService",
      );
      return { success: false, error: "Failed to update contract level" };
    }
  }

  async getUserContractLevel(userId: string): Promise<number> {
    const profile = await this.getUserProfile(userId);
    return profile?.contract_level || 100;
  }

  async delete(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("admin_deleteuser", {
        target_user_id: userId,
      });

      if (error) {
        logger.error("Failed to delete user", error as Error, "UserService");
        return { success: false, error: error.message };
      }

      if (data && typeof data === "object") {
        if (data.success === false) {
          logger.error("Delete user denied", data.error, "UserService");
          return {
            success: false,
            error: data.error || "Failed to delete user",
          };
        }
      }

      logger.info(`User ${userId} deleted`, "UserService");
      return { success: true };
    } catch (error) {
      logger.error("Error in delete", error as Error, "UserService");
      return { success: false, error: "Failed to delete user" };
    }
  }

  async isCurrentUserAdmin(): Promise<boolean> {
    try {
      const profile = await this.getCurrentUserProfile();
      return (
        profile?.is_admin === true || profile?.roles?.includes("admin") || false
      );
    } catch (error) {
      logger.error(
        "Error in isCurrentUserAdmin",
        error as Error,
        "UserService",
      );
      return false;
    }
  }

  async isCurrentUserApproved(): Promise<boolean> {
    try {
      const profile = await this.getCurrentUserProfile();
      return (
        profile?.approval_status === "approved" ||
        profile?.is_admin === true ||
        false
      );
    } catch (error) {
      logger.error(
        "Error in isCurrentUserApproved",
        error as Error,
        "UserService",
      );
      return false;
    }
  }

  async getCurrentUserStatus(): Promise<
    "pending" | "approved" | "denied" | null
  > {
    try {
      const profile = await this.getCurrentUserProfile();
      return (profile?.approval_status as "pending" | "approved" | "denied" | null) || null;
    } catch (error) {
      logger.error(
        "Error in getCurrentUserStatus",
        error as Error,
        "UserService",
      );
      return null;
    }
  }

  async getApprovalStats(): Promise<ApprovalStats> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("approval_status")
        .neq("is_deleted", true);

      if (error) {
        logger.error(
          "Failed to fetch approval stats",
          error as Error,
          "UserService",
        );
        return { total: 0, pending: 0, approved: 0, denied: 0 };
      }

      const stats = {
        total: data.length,
        pending: data.filter((u) => u.approval_status === "pending").length,
        approved: data.filter((u) => u.approval_status === "approved").length,
        denied: data.filter((u) => u.approval_status === "denied").length,
      };

      return stats;
    } catch (error) {
      logger.error("Error in getApprovalStats", error as Error, "UserService");
      return { total: 0, pending: 0, approved: 0, denied: 0 };
    }
  }

  public mapAuthUserToUser(supabaseUser: {
    id: string;
    email?: string;
    created_at: string;
    updated_at?: string;
    user_metadata?: Record<string, unknown>;
  }): User {
    const metadata = supabaseUser.user_metadata || {};

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || "",
      name:
        (metadata.full_name as string) ||
        supabaseUser.email?.split("@")[0] ||
        "User",
      phone: metadata.phone as string | undefined,
      contractCompLevel: (metadata.contract_comp_level as number) || 100,
      isActive: metadata.is_active !== false,
      agentCode: metadata.agent_code as string | undefined,
      licenseNumber: metadata.license_number as string | undefined,
      licenseState: metadata.license_state as string | undefined,
      licenseStates: metadata.license_states as string[] | undefined,
      notes: metadata.notes as string | undefined,
      hireDate: metadata.hire_date
        ? new Date(metadata.hire_date as string)
        : undefined,
      ytdCommission: metadata.ytd_commission as number | undefined,
      ytdPremium: metadata.ytd_premium as number | undefined,
      createdAt: new Date(supabaseUser.created_at),
      updatedAt: supabaseUser.updated_at
        ? new Date(supabaseUser.updated_at)
        : undefined,
      rawuser_meta_data: metadata,
    };
  }

  async signOut(): Promise<void> {
    this.clearCache();

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  clearCache(): void {
    this.currentUserCache = null;
  }

  private transformProfileToUser(profile: UserProfile): User {
    const fullName =
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
      profile.email;

    return {
      id: profile.id,
      name: fullName,
      email: profile.email,
      phone: profile.phone || undefined,
      contractCompLevel: profile.contract_level || undefined,
      isActive: profile.approval_status === "approved" && !profile.is_deleted,
      agentCode: profile.agent_code || undefined,
      licenseNumber: profile.license_number || undefined,
      licenseState: profile.license_state || undefined,
      licenseStates: profile.license_states || undefined,
      notes: profile.notes || undefined,
      hireDate: profile.hire_date ? new Date(profile.hire_date) : undefined,
      ytdCommission: profile.ytd_commission || undefined,
      ytdPremium: profile.ytd_premium || undefined,
      createdAt: profile.created_at ? new Date(profile.created_at) : undefined,
      updatedAt: profile.updated_at ? new Date(profile.updated_at) : undefined,
      rawuser_meta_data: {
        roles: profile.roles,
        agent_status: profile.agent_status,
        approval_status: profile.approval_status,
        is_admin: profile.is_admin,
        is_super_admin: profile.is_super_admin,
        upline_id: profile.upline_id,
        hierarchy_path: profile.hierarchy_path,
        hierarchy_depth: profile.hierarchy_depth,
      },
    };
  }

  private transformUpdatesToDB(
    data: Partial<CreateUserData>,
  ): Record<string, unknown> {
    const dbData: Record<string, unknown> = {};

    if (data.name !== undefined) {
      const parts = data.name.split(" ");
      dbData.first_name = parts[0] || "";
      dbData.last_name = parts.slice(1).join(" ") || "";
    }
    if (data.email !== undefined) dbData.email = data.email.toLowerCase();
    if (data.phone !== undefined) dbData.phone = data.phone;
    if (data.contractCompLevel !== undefined) {
      dbData.contract_level = data.contractCompLevel;
    }
    if (data.isActive !== undefined) {
      dbData.approval_status = data.isActive ? "approved" : "pending";
    }
    if (data.licenseNumber !== undefined)
      dbData.license_number = data.licenseNumber;
    if (data.licenseStates !== undefined)
      dbData.license_states = data.licenseStates;
    if (data.hireDate !== undefined) dbData.hire_date = data.hireDate;
    if (data.ytdCommission !== undefined)
      dbData.ytd_commission = data.ytdCommission;
    if (data.ytdPremium !== undefined) dbData.ytd_premium = data.ytdPremium;

    return dbData;
  }

  async getAgentById(id: string): Promise<User | null> {
    return this.getById(id);
  }

  async getActive(): Promise<User[]> {
    return this.getActiveAgents();
  }

  async getAllUsers(): Promise<UserProfile[]> {
    const query = supabase
      .from("user_profiles")
      .select("*")
      .neq("is_deleted", true);

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      const { data: rpcData, error: rpcError } =
        await supabase.rpc("admin_get_allusers");

      if (rpcError) {
        logger.error("Failed to fetch users", rpcError, "UserService");
        return [];
      }

      return (rpcData as UserProfile[]) || [];
    }

    return (data as UserProfile[]) || [];
  }

  async createUser(
    userData: CreateUserData & {
      roles?: RoleName[];
      approval_status?: "pending" | "approved";
      onboarding_status?: string | null;
      sendInvite?: boolean;
      upline_id?: string | null;
      agent_status?: "licensed" | "unlicensed" | "not_applicable";
    },
  ): Promise<{
    success: boolean;
    user?: User;
    userId?: string;
    error?: string;
    inviteSent?: boolean;
  }> {
    return this.create(userData);
  }

  async updateUser(
    userId: string,
    updates: Partial<UpdateUserData> & {
      roles?: RoleName[];
      approval_status?: "pending" | "approved" | "denied";
      agent_status?: "licensed" | "unlicensed" | "not_applicable";
      contract_level?: number;
      [key: string]: unknown;
    },
  ): Promise<{ success: boolean; data?: User; error?: string }> {
    try {
      const user = await this.update(userId, updates);
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update user",
      };
    }
  }

  async deleteUser(
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.delete(userId);
  }

  async approveUser(
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.approve(userId);
  }

  async denyUser(
    userId: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.deny(userId, reason);
  }

  async setPendingUser(
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.setPending(userId);
  }
}

export const userService = new UserService();
export const agentService = userService;
export const userApprovalService = userService;
