// /home/nneessen/projects/commissionTracker/src/services/admin/userApprovalService.ts

import { supabase } from "../base/supabase";
import { logger } from "../base/logger";

export interface UserProfile {
  id: string;
  email: string;
  approval_status: "pending" | "approved" | "denied";
  is_admin: boolean;
  approved_by?: string;
  approved_at?: string;
  denied_at?: string;
  denial_reason?: string;
  created_at: string;
  updated_at: string;
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
          error,
          "UserApprovalService",
        );
        console.error("Profile fetch error details:", {
          userId: user.id,
          error,
        });

        if (user.email === "nick@nickneessen.com") {
          console.warn("Admin user profile not found, using fallback");
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

      return data as UserProfile;
    } catch (error) {
      logger.error(
        "Error in getCurrentUserProfile",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      return null;
    }
  }

  /**
   * Get a specific user's profile by ID (admin only)
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        logger.error(
          "Failed to fetch user profile",
          error,
          "UserApprovalService",
        );
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      logger.error(
        "Error in getUserProfile",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      return null;
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        logger.error("Failed to fetch all users", error, "UserApprovalService");
        return [];
      }

      return (data as UserProfile[]) || [];
    } catch (error) {
      logger.error(
        "Error in getAllUsers",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
      );
      return [];
    }
  }

  /**
   * Get all pending users (admin only)
   */
  async getPendingUsers(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        logger.error(
          "Failed to fetch pending users",
          error,
          "UserApprovalService",
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

      const { error } = await supabase
        .from("user_profiles")
        .update({
          approval_status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          denied_at: null,
          denial_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        logger.error("Failed to approve user", error, "UserApprovalService");
        return { success: false, error: error.message };
      }

      logger.info(
        `User ${userId} approved by ${user.id}`,
        "UserApprovalService",
      );
      return { success: true };
    } catch (error) {
      logger.error(
        "Error in approveUser",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
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

      const { error } = await supabase
        .from("user_profiles")
        .update({
          approval_status: "denied",
          denied_at: new Date().toISOString(),
          denial_reason: reason || "No reason provided",
          approved_by: null,
          approved_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        logger.error("Failed to deny user", error, "UserApprovalService");
        return { success: false, error: error.message };
      }

      logger.info(`User ${userId} denied by ${user.id}`, "UserApprovalService");
      return { success: true };
    } catch (error) {
      logger.error(
        "Error in denyUser",
        error instanceof Error ? error : String(error),
        "UserApprovalService",
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

      const { error } = await supabase
        .from("user_profiles")
        .update({
          approval_status: "pending",
          denied_at: null,
          denial_reason: null,
          approved_by: null,
          approved_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        logger.error(
          "Failed to set user to pending",
          error,
          "UserApprovalService",
        );
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
      return { success: false, error: "Failed to set user to pending" };
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
}

// Export singleton instance
export const userApprovalService = new UserApprovalService();
