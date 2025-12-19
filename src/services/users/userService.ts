// src/services/users/userService.ts
// User profile management service using database-first types

import { supabase } from "../base/supabase";
import { logger } from "../base/logger";
import type {
  UserProfile,
  UserProfileRow,
  ApprovalStats,
  AgentStatus,
  ApprovalStatus,
  CreateUserProfileData,
} from "../../types/user.types";
import {
  VALID_CONTRACT_LEVELS,
  isValidContractLevel,
} from "../../lib/constants";
export { VALID_CONTRACT_LEVELS };

type RoleName = string;

interface UserServiceFilter {
  roles?: RoleName[];
  approvalStatus?: ApprovalStatus;
  agentStatus?: AgentStatus;
}

// =============================================================================
// USER SERVICE CLASS
// =============================================================================

class UserService {
  // -------------------------------------------------------------------------
  // READ OPERATIONS
  // -------------------------------------------------------------------------

  /**
   * Get the current authenticated user's profile
   */
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
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
        .eq("id", user.id)
        .single();

      if (error) {
        logger.error(
          "Failed to fetch user profile",
          error as Error,
          "UserService",
        );
        return null;
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

  /**
   * Get a user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // Try admin RPC as fallback (for viewing other users)
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "admin_getuser_profile",
          { target_user_id: userId },
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

  /**
   * Get a user profile by email
   */
  async getByEmail(email: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to fetch user by email: ${error.message}`);
    }

    return data as UserProfile;
  }

  /**
   * Get all users with optional filtering
   */
  async getAll(filter?: UserServiceFilter): Promise<UserProfile[]> {
    let query = supabase.from("user_profiles").select("*");

    if (filter?.roles && filter.roles.length > 0) {
      query = query.contains("roles", filter.roles);
    }
    if (filter?.approvalStatus) {
      query = query.eq("approval_status", filter.approvalStatus);
    }
    if (filter?.agentStatus) {
      query = query.eq("agent_status", filter.agentStatus);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      // Fallback to admin RPC
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

  /**
   * Get all users (alias for getAll with no filter)
   */
  async getAllUsers(): Promise<UserProfile[]> {
    return this.getAll();
  }

  /**
   * Get all agents (users with 'agent' or 'active_agent' role)
   */
  async getAllAgents(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .or(`roles.cs.{agent},roles.cs.{active_agent}`)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }

    return (data as UserProfile[]) || [];
  }

  /**
   * Get all active agents (approved and licensed)
   */
  async getActiveAgents(): Promise<UserProfile[]> {
    return this.getAll({
      roles: ["active_agent"],
      approvalStatus: "approved",
      agentStatus: "licensed",
    });
  }

  /**
   * Get all recruits
   */
  async getRecruits(): Promise<UserProfile[]> {
    return this.getAll({ roles: ["recruit"] });
  }

  /**
   * Get all admins
   */
  async getAdmins(): Promise<UserProfile[]> {
    return this.getAll({ roles: ["admin"] });
  }

  /**
   * Get users by contract level
   */
  async getByContractLevel(contractLevel: number): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("contract_level", contractLevel)
      .order("first_name", { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch users by contract level: ${error.message}`,
      );
    }

    return (data as UserProfile[]) || [];
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

  // -------------------------------------------------------------------------
  // CREATE OPERATIONS
  // -------------------------------------------------------------------------

  /**
   * Create a new user with auth account and profile
   */
  async create(
    userData: CreateUserProfileData & {
      name?: string;
      roles?: RoleName[];
      approval_status?: ApprovalStatus;
      onboarding_status?: string | null;
      sendInvite?: boolean;
      upline_id?: string | null;
      agent_status?: AgentStatus;
      contractCompLevel?: number;
    },
  ): Promise<{
    success: boolean;
    user?: UserProfile;
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
          error: `A user with email ${email} already exists`,
        };
      }

      // Determine roles and status
      let assignedRoles = userData.roles || [];
      let agentStatus: AgentStatus = userData.agent_status || "not_applicable";
      let approvalStatus: ApprovalStatus =
        userData.approval_status || "approved";

      if (assignedRoles.length === 0) {
        const contractLevel =
          userData.contractCompLevel || userData.contract_level;
        if (contractLevel && contractLevel >= 50) {
          assignedRoles = ["active_agent"];
          agentStatus = "licensed";
        } else if (contractLevel && contractLevel < 50) {
          assignedRoles = ["agent"];
          agentStatus = "licensed";
        } else {
          assignedRoles = ["recruit"];
          agentStatus = "unlicensed";
          approvalStatus = "pending";
        }
      } else {
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

      // Create auth user via Edge Function
      if (userData.sendInvite === false) {
        return {
          success: false,
          error:
            "Cannot create user without sending invite (auth user required)",
        };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-auth-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email,
            fullName:
              userData.name ||
              `${userData.first_name || ""} ${userData.last_name || ""}`.trim(),
            roles: assignedRoles,
            isAdmin: assignedRoles.includes("admin"),
            skipPipeline: false,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: `Auth user creation failed: ${result.error || "Unknown error"}`,
        };
      }

      const authUserId = result.user?.id;
      const inviteSent = result.emailSent === true;

      if (!authUserId) {
        return {
          success: false,
          error: "Auth user was created but no ID was returned",
        };
      }

      // Parse name into first/last
      let firstName = userData.first_name || "";
      let lastName = userData.last_name || "";
      if (userData.name && !firstName) {
        const parts = userData.name.split(" ");
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ") || "";
      }

      // Update the profile created by trigger
      const profileData: Partial<UserProfileRow> = {
        first_name: firstName,
        last_name: lastName,
        phone: userData.phone || null,
        upline_id: userData.upline_id || null,
        recruiter_id: userData.recruiter_id || null,
        roles: assignedRoles,
        agent_status: agentStatus,
        approval_status: approvalStatus,
        onboarding_status: userData.onboarding_status || null,
        contract_level:
          userData.contractCompLevel || userData.contract_level || null,
        license_number: userData.license_number || null,
        is_admin: assignedRoles.includes("admin"),
        referral_source: userData.referral_source || null,
        street_address: userData.street_address || null,
        city: userData.city || null,
        state: userData.state || null,
        zip: userData.zip || null,
        resident_state: userData.resident_state || null,
        date_of_birth: userData.date_of_birth || null,
        npn: userData.npn || null,
      };

      const { data, error } = await supabase
        .from("user_profiles")
        .update(profileData)
        .eq("id", authUserId)
        .select()
        .single();

      if (error) {
        logger.error(
          "Failed to update user profile after auth creation",
          error as Error,
          "UserService",
        );
        return {
          success: true,
          userId: authUserId,
          inviteSent,
          error: `Auth user created but profile update failed: ${error.message}`,
        };
      }

      logger.info(`User created: ${email} (ID: ${authUserId})`, "UserService");
      return {
        success: true,
        userId: authUserId,
        user: data as UserProfile,
        inviteSent,
      };
    } catch (error) {
      logger.error("Error in create", error as Error, "UserService");
      return { success: false, error: "Failed to create user" };
    }
  }

  // -------------------------------------------------------------------------
  // UPDATE OPERATIONS
  // -------------------------------------------------------------------------

  /**
   * Update a user profile
   */
  async update(
    id: string,
    updates: Partial<UserProfileRow> & {
      roles?: RoleName[];
      name?: string;
    },
  ): Promise<UserProfile> {
    const dbData: Partial<UserProfileRow> = { ...updates };

    // Handle name -> first_name/last_name
    if (updates.name !== undefined) {
      const parts = updates.name.split(" ");
      dbData.first_name = parts[0] || "";
      dbData.last_name = parts.slice(1).join(" ") || "";
      delete (dbData as Record<string, unknown>).name;
    }

    // Auto-set agent_status based on roles
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

    const { data, error } = await supabase
      .from("user_profiles")
      .update(dbData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      // Try to fetch to verify update worked
      const { data: fetchedData, error: fetchError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (!fetchError && fetchedData) {
        return fetchedData as UserProfile;
      }

      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data as UserProfile;
  }

  /**
   * Update current user's profile
   */
  async updateCurrentUserProfile(
    updates: Partial<Omit<UserProfileRow, "roles">> & { roles?: string[] },
  ): Promise<UserProfile | null> {
    const currentUser = await this.getCurrentUserProfile();
    if (!currentUser) {
      throw new Error("No authenticated user");
    }
    return this.update(currentUser.id, updates);
  }

  /**
   * Update contract level
   */
  async updateContractLevel(
    userId: string,
    contractLevel: number | null,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (contractLevel !== null && !isValidContractLevel(contractLevel)) {
        return {
          success: false,
          error: `Invalid contract level. Must be one of: ${VALID_CONTRACT_LEVELS.join(", ")}`,
        };
      }

      const { error } = await supabase
        .from("user_profiles")
        .update({ contract_level: contractLevel })
        .eq("id", userId);

      if (error) {
        logger.error(
          "Failed to update contract level",
          error as Error,
          "UserService",
        );
        return { success: false, error: error.message };
      }

      // Auto-upgrade agent role if contract level is high enough
      if (contractLevel && contractLevel >= 50) {
        const profile = await this.getUserProfile(userId);
        if (
          profile &&
          profile.roles?.includes("agent") &&
          !profile.roles?.includes("active_agent")
        ) {
          const newRoles = profile.roles.map((r) =>
            r === "agent" ? "active_agent" : r,
          );
          await this.update(userId, { roles: newRoles });
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

  /**
   * Get user's contract level
   */
  async getUserContractLevel(userId: string): Promise<number> {
    const profile = await this.getUserProfile(userId);
    return profile?.contract_level || 100;
  }

  // -------------------------------------------------------------------------
  // APPROVAL OPERATIONS
  // -------------------------------------------------------------------------

  /**
   * Approve a user
   */
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

      const { error } = await supabase.rpc("admin_approveuser", {
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

  /**
   * Deny a user
   */
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

      const { error } = await supabase.rpc("admin_denyuser", {
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

  /**
   * Set user to pending status
   */
  async setPending(
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("admin_set_pendinguser", {
        target_user_id: userId,
      });

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

  /**
   * Set admin role for a user
   */
  async setAdminRole(
    userId: string,
    isAdmin: boolean,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc("admin_set_admin_role", {
        target_user_id: userId,
        new_is_admin: isAdmin,
      });

      if (error) {
        logger.error("Failed to set admin role", error as Error, "UserService");
        return { success: false, error: error.message };
      }

      // Update roles array
      const profile = await this.getUserProfile(userId);
      if (profile) {
        const currentRoles = profile.roles || [];
        const newRoles = isAdmin
          ? [...currentRoles, "admin"].filter((v, i, a) => a.indexOf(v) === i)
          : currentRoles.filter((r) => r !== "admin");

        await this.update(userId, { roles: newRoles });
      }

      logger.info(`User ${userId} admin role set to ${isAdmin}`, "UserService");
      return { success: true };
    } catch (error) {
      logger.error("Error in setAdminRole", error as Error, "UserService");
      return { success: false, error: "Failed to set admin role" };
    }
  }

  // -------------------------------------------------------------------------
  // DELETE OPERATIONS
  // -------------------------------------------------------------------------

  /**
   * Hard delete a user and all related data
   */
  async delete(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("admin_deleteuser", {
        target_user_id: userId,
      });

      if (error) {
        logger.error("Failed to delete user", error as Error, "UserService");
        return { success: false, error: error.message };
      }

      if (
        data &&
        typeof data === "object" &&
        (data as { success?: boolean }).success === false
      ) {
        const errorData = data as { error?: string };
        logger.error("Delete user denied", errorData.error, "UserService");
        return {
          success: false,
          error: errorData.error || "Failed to delete user",
        };
      }

      logger.info(`User ${userId} deleted`, "UserService");
      return { success: true };
    } catch (error) {
      logger.error("Error in delete", error as Error, "UserService");
      return { success: false, error: "Failed to delete user" };
    }
  }

  // -------------------------------------------------------------------------
  // STATUS CHECK OPERATIONS
  // -------------------------------------------------------------------------

  /**
   * Check if current user is admin
   */
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

  /**
   * Check if current user is approved
   */
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

  /**
   * Get current user's approval status
   */
  async getCurrentUserStatus(): Promise<ApprovalStatus | null> {
    try {
      const profile = await this.getCurrentUserProfile();
      return (profile?.approval_status as ApprovalStatus) || null;
    } catch (error) {
      logger.error(
        "Error in getCurrentUserStatus",
        error as Error,
        "UserService",
      );
      return null;
    }
  }

  /**
   * Get approval statistics
   */
  async getApprovalStats(): Promise<ApprovalStats> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("approval_status");

      if (error) {
        logger.error(
          "Failed to fetch approval stats",
          error as Error,
          "UserService",
        );
        return { total: 0, pending: 0, approved: 0, denied: 0 };
      }

      return {
        total: data.length,
        pending: data.filter((u) => u.approval_status === "pending").length,
        approved: data.filter((u) => u.approval_status === "approved").length,
        denied: data.filter((u) => u.approval_status === "denied").length,
      };
    } catch (error) {
      logger.error("Error in getApprovalStats", error as Error, "UserService");
      return { total: 0, pending: 0, approved: 0, denied: 0 };
    }
  }

  // -------------------------------------------------------------------------
  // AUTH OPERATIONS
  // -------------------------------------------------------------------------

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  /**
   * Map Supabase auth user to UserProfile (for initial login)
   * Used by AuthContext before full profile is loaded
   */
  mapAuthUserToProfile(supabaseUser: {
    id: string;
    email?: string;
    created_at: string;
    updated_at?: string;
    user_metadata?: Record<string, unknown>;
  }): Partial<UserProfile> {
    const metadata = supabaseUser.user_metadata || {};

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || "",
      first_name: (metadata.first_name as string) || null,
      last_name: (metadata.last_name as string) || null,
      phone: (metadata.phone as string) || null,
      contract_level: (metadata.contract_level as number) || null,
      roles: (metadata.roles as string[]) || null,
      is_admin: (metadata.is_admin as boolean) || false,
      created_at: supabaseUser.created_at,
      updated_at: supabaseUser.updated_at || null,
    };
  }

  /**
   * @deprecated Use mapAuthUserToProfile instead
   * Legacy method for backward compatibility with AuthContext
   * Returns the deprecated User type format
   */
  mapAuthUserToUser(supabaseUser: {
    id: string;
    email?: string;
    created_at: string;
    updated_at?: string;
    user_metadata?: Record<string, unknown>;
  }): {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    contractCompLevel?: number;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    rawuser_meta_data?: Record<string, unknown>;
  } {
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
      createdAt: new Date(supabaseUser.created_at),
      updatedAt: supabaseUser.updated_at
        ? new Date(supabaseUser.updated_at)
        : undefined,
      rawuser_meta_data: metadata,
    };
  }

  // -------------------------------------------------------------------------
  // BACKWARD COMPATIBILITY ALIASES
  // -------------------------------------------------------------------------

  /** @deprecated Use getUserProfile instead */
  async getById(userId: string): Promise<UserProfile | null> {
    return this.getUserProfile(userId);
  }

  /** @deprecated Use create instead */
  async createUser(
    userData: Parameters<typeof this.create>[0],
  ): Promise<ReturnType<typeof this.create>> {
    return this.create(userData);
  }

  /** @deprecated Use update instead */
  async updateUser(
    id: string,
    updates: Parameters<typeof this.update>[1],
  ): Promise<{
    success: boolean;
    data?: {
      id: string;
      email: string;
      name?: string;
      phone?: string;
      contractCompLevel?: number;
      isActive?: boolean;
    };
    error?: string;
  }> {
    try {
      const result = await this.update(id, updates);
      // Convert to legacy User format
      return {
        success: true,
        data: {
          id: result.id,
          email: result.email,
          name:
            [result.first_name, result.last_name].filter(Boolean).join(" ") ||
            undefined,
          phone: result.phone || undefined,
          contractCompLevel: result.contract_level || undefined,
          isActive: result.approval_status === "approved",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update user",
      };
    }
  }

  /** @deprecated Use delete instead */
  async deleteUser(
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.delete(userId);
  }

  /** @deprecated Use approve instead */
  async approveUser(
    userId: string,
    role?: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.approve(userId, role);
  }

  /** @deprecated Use deny instead */
  async denyUser(
    userId: string,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.deny(userId, reason);
  }

  /** @deprecated Use setPending instead */
  async setPendingUser(
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.setPending(userId);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const userService = new UserService();

// Backward compatibility aliases
export const agentService = userService;
export const userApprovalService = userService;

// Re-export types
export type { UserProfile, ApprovalStats };
