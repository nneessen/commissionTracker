// /home/nneessen/projects/commissionTracker/src/services/admin/userApprovalService.ts

import { supabase } from "../base/supabase";
import { logger } from "../base/logger";
import type { RoleName } from "@/types/permissions.types";

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null; // Computed from first_name + last_name in RPC
  first_name?: string;
  last_name?: string;
  roles?: RoleName[]; // User roles from RBAC system
  approval_status: "pending" | "approved" | "denied";
  is_admin: boolean;
  approved_by?: string;
  approved_at?: string;
  denied_at?: string;
  denial_reason?: string;
  created_at: string;
  updated_at: string;
  contract_level?: number; // Insurance agent contract compensation level (80-145)
  upline_id?: string; // ID of upline agent in hierarchy
  hierarchy_path?: string;
  hierarchy_depth?: number;
  // Recruiting fields
  onboarding_status?: 'interview_1' | 'zoom_interview' | 'pre_licensing' | 'exam' | 'npn_received' | 'contracting' | 'bootcamp' | 'completed' | 'dropped' | null;
  current_onboarding_phase?: string;
  onboarding_completed_at?: string;
  phone?: string;
  profile_photo_url?: string;
  instagram_url?: string;
  instagram_username?: string;
  linkedin_url?: string;
  linkedin_username?: string;
}

export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  denied: number;
}

export class UserApprovalService {
  /**
   * Get current user's profile and approval status
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
          "UserApprovalService",
        );
        console.error(
          "[UserApprovalService] Auth error or no user:",
          authError,
        );
        return null;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // FIX: Only use fallback when query FAILS (error), not when it succeeds with null data
      if (error) {
        logger.error(
          "Failed to fetch user profile",
          error,
          "UserApprovalService",
        );
        console.error("[UserApprovalService] Profile fetch error:", error);

        // Admin fallback - ensures admin always has access even if RLS blocks the query
        // ONLY triggers when RLS blocks the query (error), NOT when query succeeds
        if (user.email === "nick@nickneessen.com") {
          console.warn(
            "[UserApprovalService] Admin user query blocked by RLS, using fallback",
          );
          return {
            id: user.id,
            email: user.email,
            approval_status: "approved",
            is_admin: true,
            approved_at: new Date().toISOString(),
            created_at: user.created_at,
            updated_at: new Date().toISOString(),
          } as UserProfile;
        }

        return null;
      }

      // If no error but data is null, user doesn't exist in user_profiles
      if (!data) {
        console.warn(
          "[UserApprovalService] User profile not found for:",
          user.email,
        );
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      logger.error(
        "Error in getCurrentUserProfile",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      console.error(
        "[UserApprovalService] Unexpected error in getCurrentUserProfile:",
        error,
      );
      return null;
    }
  }

  /**
   * Get a specific user's profile by ID (admin only)
   * Uses SECURITY DEFINER function to bypass RLS
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase.rpc("admin_get_user_profile", {
        target_user_id: userId,
      });

      if (error) {
        logger.error(
          "Failed to fetch user profile",
          error,
          "UserApprovalService",
        );
        console.error(
          "[UserApprovalService] Error fetching user profile:",
          error,
        );
        return null;
      }

      // RPC returns an array, get the first result
      const profile = Array.isArray(data) && data.length > 0 ? data[0] : null;

      return profile as UserProfile;
    } catch (error) {
      logger.error(
        "Error in getUserProfile",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      console.error(
        "[UserApprovalService] Unexpected error in getUserProfile:",
        error,
      );
      return null;
    }
  }

  /**
   * Get all users (admin only)
   * Uses SECURITY DEFINER function to bypass RLS
   */
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase.rpc("admin_get_all_users");

      if (error) {
        logger.error("Failed to fetch all users", error, "UserApprovalService");
        console.error("[UserApprovalService] Error fetching all users:", error);
        return [];
      }

      return (data as UserProfile[]) || [];
    } catch (error) {
      logger.error(
        "Error in getAllUsers",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      console.error(
        "[UserApprovalService] Unexpected error in getAllUsers:",
        error,
      );
      return [];
    }
  }

  /**
   * Get all pending users (admin only)
   * Uses SECURITY DEFINER function to bypass RLS
   */
  async getPendingUsers(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase.rpc("admin_get_pending_users");

      if (error) {
        logger.error(
          "Failed to fetch pending users",
          error,
          "UserApprovalService",
        );
        console.error(
          "[UserApprovalService] Error fetching pending users:",
          error,
        );
        return [];
      }

      return (data as UserProfile[]) || [];
    } catch (error) {
      logger.error(
        "Error in getPendingUsers",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      console.error(
        "[UserApprovalService] Unexpected error in getPendingUsers:",
        error,
      );
      return [];
    }
  }

  /**
   * Get approval statistics (admin only)
   */
  async getApprovalStats(): Promise<ApprovalStats> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("approval_status");

      if (error) {
        logger.error(
          "Failed to fetch approval stats",
          error,
          "UserApprovalService",
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
      logger.error(
        "Error in getApprovalStats",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      return { total: 0, pending: 0, approved: 0, denied: 0 };
    }
  }

  /**
   * Approve a user (admin only)
   */
  async approveUser(
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: "Not authenticated" };
      }

      const { data, error } = await supabase.rpc("admin_approve_user", {
        target_user_id: userId,
        approver_id: user.id,
      });

      if (error) {
        logger.error("Failed to approve user", error, "UserApprovalService");
        console.error("[UserApprovalService] Approve error:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error(
        "Error in approveUser",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      console.error(
        "[UserApprovalService] Unexpected error approving user:",
        error,
      );
      return { success: false, error: "Failed to approve user" };
    }
  }

  /**
   * Deny a user (admin only)
   */
  async denyUser(
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

      console.log(
        "[UserApprovalService] Denying user via admin_deny_user():",
        userId,
      );

      const { data, error } = await supabase.rpc("admin_deny_user", {
        target_user_id: userId,
        approver_id: user.id,
        reason: reason || "No reason provided",
      });

      if (error) {
        logger.error("Failed to deny user", error, "UserApprovalService");
        console.error("[UserApprovalService] Deny error:", error);
        return { success: false, error: error.message };
      }

      console.log("[UserApprovalService] User denied successfully:", data);
      logger.info(`User ${userId} denied by ${user.id}`, "UserApprovalService");
      return { success: true };
    } catch (error) {
      logger.error(
        "Error in denyUser",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      console.error(
        "[UserApprovalService] Unexpected error denying user:",
        error,
      );
      return { success: false, error: "Failed to deny user" };
    }
  }

  /**
   * Set user to pending status (admin only)
   */
  async setPendingUser(
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: "Not authenticated" };
      }

      const { data, error } = await supabase.rpc("admin_set_pending_user", {
        target_user_id: userId,
      });

      if (error) {
        logger.error(
          "Failed to set user to pending",
          error,
          "UserApprovalService",
        );
        console.error("[UserApprovalService] Set pending error:", error);
        return { success: false, error: error.message };
      }

      logger.info(
        `User ${userId} set to pending by ${user.id}`,
        "UserApprovalService",
      );
      return { success: true };
    } catch (error) {
      logger.error(
        "Error in setPendingUser",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      console.error(
        "[UserApprovalService] Unexpected error setting user to pending:",
        error,
      );
      return { success: false, error: "Failed to set user to pending" };
    }
  }

  /**
   * Set admin role for a user (admin only)
   */
  async setAdminRole(
    userId: string,
    isAdmin: boolean,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("admin_set_admin_role", {
        target_user_id: userId,
        new_is_admin: isAdmin,
      });

      if (error) {
        logger.error("Failed to set admin role", error, "UserApprovalService");
        console.error("[UserApprovalService] Set admin role error:", error);
        return { success: false, error: error.message };
      }

      logger.info(
        `User ${userId} admin role set to ${isAdmin}`,
        "UserApprovalService",
      );
      return { success: true };
    } catch (error) {
      logger.error(
        "Error in setAdminRole",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      console.error(
        "[UserApprovalService] Unexpected error setting admin role:",
        error,
      );
      return { success: false, error: "Failed to set admin role" };
    }
  }

  /**
   * Check if current user is admin
   */
  async isCurrentUserAdmin(): Promise<boolean> {
    try {
      const profile = await this.getCurrentUserProfile();
      return profile?.is_admin === true;
    } catch (error) {
      logger.error(
        "Error in isCurrentUserAdmin",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
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
        profile?.approval_status === "approved" || profile?.is_admin === true
      );
    } catch (error) {
      logger.error(
        "Error in isCurrentUserApproved",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      return false;
    }
  }

  /**
   * Get current user's approval status
   */
  async getCurrentUserStatus(): Promise<
    "pending" | "approved" | "denied" | null
  > {
    try {
      const profile = await this.getCurrentUserProfile();
      return profile?.approval_status || null;
    } catch (error) {
      logger.error(
        "Error in getCurrentUserStatus",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      return null;
    }
  }

  /**
   * Update user's contract level (admin only)
   * Contract levels determine commission rates and override calculations
   * Valid levels: 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145
   */
  async updateContractLevel(
    userId: string,
    contractLevel: number | null,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate contract level
      const validLevels = [
        80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145,
      ];
      if (contractLevel !== null && !validLevels.includes(contractLevel)) {
        return {
          success: false,
          error: `Invalid contract level. Must be one of: ${validLevels.join(", ")}`,
        };
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .update({ contract_level: contractLevel })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        logger.error(
          "Failed to update contract level",
          error,
          "UserApprovalService",
        );
        console.error(
          "[UserApprovalService] Update contract level error:",
          error,
        );
        return { success: false, error: error.message };
      }

      logger.info(
        `User ${userId} contract level set to ${contractLevel}`,
        "UserApprovalService",
      );
      return { success: true };
    } catch (error) {
      logger.error(
        "Error in updateContractLevel",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      console.error(
        "[UserApprovalService] Unexpected error updating contract level:",
        error,
      );
      return { success: false, error: "Failed to update contract level" };
    }
  }
}

// Export singleton instance
export const userApprovalService = new UserApprovalService();

// Export valid contract levels for use in UI
export const VALID_CONTRACT_LEVELS = [
  80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145,
];
