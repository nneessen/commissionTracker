// /home/nneessen/projects/commissionTracker/src/services/users/userService.ts
// SINGLE comprehensive user service for ALL user operations
// Handles agents, recruits, admins, and all user types

import { supabase } from "../base/supabase";
import { logger } from "../base/logger";
import {
  User,
  CreateUserData,
  UpdateUserData,
} from "../../types/user.types";
import type { RoleName } from "../../types/permissions.types";

export type { CreateUserData, UpdateUserData };

// User profile interface for detailed user data
export interface UserProfile {
  id: string;
  user_id?: string | null;
  email: string;
  full_name?: string | null;
  first_name?: string;
  last_name?: string;
  roles?: RoleName[];
  agent_status?: 'licensed' | 'unlicensed' | 'not_applicable';
  approval_status: "pending" | "approved" | "denied";
  is_admin: boolean;
  is_super_admin?: boolean;
  approved_by?: string;
  approved_at?: string;
  denied_at?: string;
  denial_reason?: string;
  created_at: string;
  updated_at: string;
  contract_level?: number;
  upline_id?: string;
  hierarchy_path?: string;
  hierarchy_depth?: number;
  onboarding_status?: 'lead' | 'active' | 'interview_1' | 'zoom_interview' | 'pre_licensing' | 'exam' | 'npn_received' | 'contracting' | 'bootcamp' | 'completed' | 'dropped' | null;
  current_onboarding_phase?: string;
  onboarding_completed_at?: string;
  phone?: string;
  profile_photo_url?: string;
  instagram_url?: string;
  instagram_username?: string;
  linkedin_url?: string;
  linkedin_username?: string;
  agent_code?: string;
  license_number?: string;
  license_state?: string;
  license_states?: string[];
  notes?: string;
  hire_date?: string;
  ytd_commission?: number;
  ytd_premium?: number;
  is_deleted?: boolean;
}

export interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  denied: number;
}

interface UserServiceFilter {
  roles?: RoleName[];
  approvalStatus?: 'pending' | 'approved' | 'denied';
  agentStatus?: 'licensed' | 'unlicensed' | 'not_applicable';
  includeDeleted?: boolean;
}

// Valid contract levels for insurance agents
export const VALID_CONTRACT_LEVELS = [
  80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145,
];

class UserService {
  // Cache for current user to avoid repeated queries
  private currentUserCache: { user: UserProfile; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // ============================================
  // CORE USER OPERATIONS
  // ============================================

  /**
   * Get current authenticated user profile with all details
   */
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      // Check cache first
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
        logger.error("Failed to get authenticated user", authError, "UserService");
        return null;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        logger.error("Failed to fetch user profile", error as Error, "UserService");

        // Admin fallback for RLS issues
        if (user.email === "nick@nickneessen.com") {
          console.warn("[UserService] Admin user query blocked by RLS, using fallback");
          return {
            id: user.id,
            user_id: user.id,
            email: user.email,
            approval_status: "approved",
            is_admin: true,
            is_super_admin: true,
            roles: ['admin'],
            agent_status: 'licensed',
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
          timestamp: Date.now()
        };
      }

      return data as UserProfile;
    } catch (error) {
      logger.error("Error in getCurrentUserProfile", error as Error, "UserService");
      return null;
    }
  }

  /**
   * Get simplified current user (for backward compatibility)
   */
  async getCurrentUser(): Promise<User | null> {
    const profile = await this.getCurrentUserProfile();
    if (!profile) return null;
    return this.transformProfileToUser(profile);
  }

  /**
   * Get user profile by ID (admin operation or self)
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      // First try direct query (works for self or if user has permissions)
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

      // If still fails, try RPC for admin access
      if (error || !data) {
        const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_user_profile", {
          target_user_id: userId,
        });

        if (rpcError) {
          logger.error("Failed to fetch user profile", rpcError, "UserService");
          return null;
        }

        const profile = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : null;
        return profile as UserProfile;
      }

      return data as UserProfile;
    } catch (error) {
      logger.error("Error in getUserProfile", error as Error, "UserService");
      return null;
    }
  }

  /**
   * Get user by ID (simplified version for backward compatibility)
   */
  async getById(id: string): Promise<User | null> {
    const profile = await this.getUserProfile(id);
    if (!profile) return null;
    return this.transformProfileToUser(profile);
  }

  /**
   * Get user by email
   */
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

  // ============================================
  // USER LISTING & FILTERING
  // ============================================

  /**
   * Get all users with optional filtering
   */
  async getAll(filter?: UserServiceFilter): Promise<User[]> {
    let query = supabase
      .from('user_profiles')
      .select("*");

    // Apply filters
    if (filter?.roles && filter.roles.length > 0) {
      query = query.contains('roles', filter.roles);
    }
    if (filter?.approvalStatus) {
      query = query.eq('approval_status', filter.approvalStatus);
    }
    if (filter?.agentStatus) {
      query = query.eq('agent_status', filter.agentStatus);
    }
    if (!filter?.includeDeleted) {
      query = query.neq('is_deleted', true);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      // Try admin RPC if direct query fails
      const { data: rpcData, error: rpcError } = await supabase.rpc("admin_get_all_users");

      if (rpcError) {
        logger.error("Failed to fetch users", rpcError, "UserService");
        return [];
      }

      return (rpcData as UserProfile[] || []).map(this.transformProfileToUser);
    }

    return data?.map((profile) => this.transformProfileToUser(profile as UserProfile)) || [];
  }

  /**
   * Get all agents (users with 'agent' or 'active_agent' role)
   */
  async getAllAgents(): Promise<User[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select("*")
      .or(`roles.cs.{agent},roles.cs.{active_agent}`)
      .neq('is_deleted', true)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch agents: ${error.message}`);
    }

    return data?.map((profile) => this.transformProfileToUser(profile as UserProfile)) || [];
  }

  /**
   * Get all active agents (approved agents with licensed status)
   */
  async getActiveAgents(): Promise<User[]> {
    return this.getAll({
      roles: ['active_agent'],
      approvalStatus: 'approved',
      agentStatus: 'licensed',
    });
  }

  /**
   * Get all recruits
   */
  async getRecruits(): Promise<User[]> {
    return this.getAll({
      roles: ['recruit'],
    });
  }

  /**
   * Get all admins
   */
  async getAdmins(): Promise<User[]> {
    return this.getAll({
      roles: ['admin'],
    });
  }

  /**
   * Get users by contract level
   */
  async getByContractLevel(contractLevel: number): Promise<User[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select("*")
      .eq("contract_level", contractLevel)
      .neq('is_deleted', true)
      .order("first_name", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch users by contract level: ${error.message}`);
    }

    return data?.map((profile) => this.transformProfileToUser(profile as UserProfile)) || [];
  }

  /**
   * Get pending users (awaiting approval)
   */
  async getPendingUsers(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase.rpc("admin_get_pending_users");

      if (error) {
        logger.error("Failed to fetch pending users", error as Error, "UserService");
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
  async create(userData: CreateUserData & {
    roles?: RoleName[];
    approval_status?: 'pending' | 'approved';
    onboarding_status?: string | null;
    sendInvite?: boolean;
    upline_id?: string | null;
    agent_status?: 'licensed' | 'unlicensed' | 'not_applicable';
  }): Promise<{ success: boolean; user?: User; userId?: string; error?: string; inviteSent?: boolean }> {
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
          error: `A user with email ${userData.email} already exists`
        };
      }

      // Determine appropriate role and status
      let assignedRoles = userData.roles;
      let agentStatus = userData.agent_status || 'not_applicable';
      let approvalStatus = userData.approval_status || 'approved';

      if (!assignedRoles || assignedRoles.length === 0) {
        // Auto-assign role based on context
        if (userData.contractCompLevel && userData.contractCompLevel >= 50) {
          assignedRoles = ['active_agent'];
          agentStatus = 'licensed';
        } else if (userData.contractCompLevel && userData.contractCompLevel < 50) {
          assignedRoles = ['agent'];
          agentStatus = 'licensed';
        } else {
          // Default to recruit if no contract level specified
          assignedRoles = ['recruit'];
          agentStatus = 'unlicensed';
          approvalStatus = 'pending'; // Recruits start as pending
        }
      } else {
        // Set agent_status based on provided roles
        if (assignedRoles.includes('active_agent') || assignedRoles.includes('agent')) {
          agentStatus = 'licensed';
        } else if (assignedRoles.includes('recruit')) {
          agentStatus = 'unlicensed';
          approvalStatus = 'pending';
        } else if (assignedRoles.includes('admin')) {
          agentStatus = 'licensed';
        }
      }

      // Build profile data
      const profileData: Partial<UserProfile> = {
        email: email,
        first_name: userData.name ? userData.name.split(' ')[0] : '',
        last_name: userData.name ? userData.name.split(' ').slice(1).join(' ') : '',
        phone: userData.phone?.trim() || undefined,
        upline_id: userData.upline_id || undefined,
        roles: assignedRoles,
        agent_status: agentStatus,
        approval_status: approvalStatus,
        onboarding_status: userData.onboarding_status as any || null,
        user_id: null, // Will be set when user clicks magic link
        contract_level: userData.contractCompLevel,
        license_number: userData.licenseNumber,
        license_states: userData.licenseStates,
        hire_date: userData.hireDate ? userData.hireDate.toISOString() : undefined,
        hierarchy_path: '',
        hierarchy_depth: 0,
        is_admin: assignedRoles.includes('admin'),
        is_super_admin: email === 'nick@nickneessen.com',
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
        logger.error("Failed to create user profile", error as Error, "UserService");
        return { success: false, error: error.message };
      }

      // Send magic link email if requested
      let inviteSent = false;
      if (userData.sendInvite !== false) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${window.location.origin}/`,
          }
        });

        if (otpError) {
          logger.error("Failed to send invite email", otpError, "UserService");
          // Profile was created but invite failed - still return success
          return {
            success: true,
            userId: data?.id,
            user: this.transformProfileToUser(data as UserProfile),
            inviteSent: false,
            error: `Profile created but invite email failed: ${otpError.message}`
          };
        }
        inviteSent = true;
      }

      logger.info(`User profile created: ${email}`, "UserService");
      return {
        success: true,
        userId: data?.id,
        user: this.transformProfileToUser(data as UserProfile),
        inviteSent
      };
    } catch (error) {
      logger.error("Error in create", error as Error, "UserService");
      return { success: false, error: "Failed to create user" };
    }
  }

  /**
   * Update user profile
   */
  async update(id: string, updates: Partial<UpdateUserData> & {
    roles?: RoleName[];
    approval_status?: 'pending' | 'approved' | 'denied';
    agent_status?: 'licensed' | 'unlicensed' | 'not_applicable';
  }): Promise<User> {
    const dbData = this.transformUpdatesToDB(updates);

    // If roles are being updated, also update agent_status accordingly
    if (updates.roles) {
      if (updates.roles.includes('active_agent') || updates.roles.includes('agent')) {
        dbData.agent_status = 'licensed';
      } else if (updates.roles.includes('recruit')) {
        dbData.agent_status = 'unlicensed';
      } else if (updates.roles.includes('admin')) {
        dbData.agent_status = 'licensed';
      } else {
        dbData.agent_status = 'not_applicable';
      }
    }

    // Handle approval_status if provided
    if (updates.approval_status) {
      dbData.approval_status = updates.approval_status;
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .update(dbData)
      .eq("id", id)
      .neq('is_deleted', true)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
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
  async updateCurrentUserProfile(updates: Partial<UpdateUserData>): Promise<User | null> {
    const currentUser = await this.getCurrentUserProfile();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    // Cast roles to RoleName[] if present
    const updateData: any = { ...updates };
    if (updateData.roles) {
      updateData.roles = updateData.roles as RoleName[];
    }

    return this.update(currentUser.id, updateData);
  }

  // ============================================
  // USER APPROVAL OPERATIONS (ADMIN)
  // ============================================

  /**
   * Approve a user (change from pending to approved)
   */
  async approve(userId: string, role: RoleName = 'active_agent'): Promise<{ success: boolean; error?: string }> {
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
        logger.error("Failed to approve user", error as Error, "UserService");
        return { success: false, error: error.message };
      }

      // Update role if specified
      if (role && role !== 'agent') {
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
  async deny(userId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: "Not authenticated" };
      }

      const { data, error } = await supabase.rpc("admin_deny_user", {
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
   * Set user to pending status (admin only)
   */
  async setPending(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("admin_set_pending_user", {
        target_user_id: userId,
      });

      if (error) {
        logger.error("Failed to set user to pending", error as Error, "UserService");
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      logger.error("Error in setPending", error as Error, "UserService");
      return { success: false, error: "Failed to set user to pending" };
    }
  }

  // ============================================
  // USER ADMINISTRATION
  // ============================================

  /**
   * Set admin role for a user (admin only)
   */
  async setAdminRole(userId: string, isAdmin: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("admin_set_admin_role", {
        target_user_id: userId,
        new_is_admin: isAdmin,
      });

      if (error) {
        logger.error("Failed to set admin role", error as Error, "UserService");
        return { success: false, error: error.message };
      }

      // Also update roles array
      const profile = await this.getUserProfile(userId);
      if (profile) {
        const newRoles = isAdmin
          ? [...(profile.roles || []), 'admin'].filter((v, i, a) => a.indexOf(v) === i)
          : (profile.roles || []).filter(r => r !== 'admin');

        await this.update(userId, { roles: newRoles as RoleName[] });
      }

      logger.info(`User ${userId} admin role set to ${isAdmin}`, "UserService");
      return { success: true };
    } catch (error) {
      logger.error("Error in setAdminRole", error as Error, "UserService");
      return { success: false, error: "Failed to set admin role" };
    }
  }

  /**
   * Update user's contract level (admin only)
   * Contract levels determine commission rates
   */
  async updateContractLevel(
    userId: string,
    contractLevel: number | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate contract level
      if (contractLevel !== null && !VALID_CONTRACT_LEVELS.includes(contractLevel)) {
        return {
          success: false,
          error: `Invalid contract level. Must be one of: ${VALID_CONTRACT_LEVELS.join(", ")}`,
        };
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .update({ contract_level: contractLevel })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        logger.error("Failed to update contract level", error as Error, "UserService");
        return { success: false, error: error.message };
      }

      // Update role based on contract level
      if (contractLevel && contractLevel >= 50) {
        const profile = await this.getUserProfile(userId);
        if (profile && profile.roles?.includes('agent')) {
          // Upgrade to active_agent
          await this.update(userId, {
            roles: profile.roles.map(r => r === 'agent' ? 'active_agent' : r) as RoleName[]
          });
        }
      }

      logger.info(`User ${userId} contract level set to ${contractLevel}`, "UserService");
      return { success: true };
    } catch (error) {
      logger.error("Error in updateContractLevel", error as Error, "UserService");
      return { success: false, error: "Failed to update contract level" };
    }
  }

  /**
   * Get user's contract compensation level
   */
  async getUserContractLevel(userId: string): Promise<number> {
    const profile = await this.getUserProfile(userId);
    return profile?.contract_level || 100;
  }

  /**
   * Delete user (admin only)
   * HARD DELETE - permanently removes user and all related data
   */
  async delete(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc("admin_delete_user", {
        target_user_id: userId,
      });

      if (error) {
        logger.error("Failed to delete user", error as Error, "UserService");
        return { success: false, error: error.message };
      }

      // Handle business logic errors from RPC
      if (data && typeof data === 'object') {
        if (data.success === false) {
          logger.error("Delete user denied", data.error, "UserService");
          return { success: false, error: data.error || "Failed to delete user" };
        }
      }

      logger.info(`User ${userId} deleted`, "UserService");
      return { success: true };
    } catch (error) {
      logger.error("Error in delete", error as Error, "UserService");
      return { success: false, error: "Failed to delete user" };
    }
  }

  // ============================================
  // STATUS CHECKING
  // ============================================

  /**
   * Check if current user is admin
   */
  async isCurrentUserAdmin(): Promise<boolean> {
    try {
      const profile = await this.getCurrentUserProfile();
      return profile?.is_admin === true || profile?.roles?.includes('admin') || false;
    } catch (error) {
      logger.error("Error in isCurrentUserAdmin", error as Error, "UserService");
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
      logger.error("Error in isCurrentUserApproved", error as Error, "UserService");
      return false;
    }
  }

  /**
   * Get current user's approval status
   */
  async getCurrentUserStatus(): Promise<"pending" | "approved" | "denied" | null> {
    try {
      const profile = await this.getCurrentUserProfile();
      return profile?.approval_status || null;
    } catch (error) {
      logger.error("Error in getCurrentUserStatus", error as Error, "UserService");
      return null;
    }
  }

  /**
   * Get approval statistics (admin only)
   */
  async getApprovalStats(): Promise<ApprovalStats> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("approval_status")
        .neq("is_deleted", true);

      if (error) {
        logger.error("Failed to fetch approval stats", error as Error, "UserService");
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

  // ============================================
  // AUTH OPERATIONS
  // ============================================

  /**
   * Map Supabase auth user to our User type (public for AuthContext)
   * This allows AuthContext to map users without a database query
   */
  public mapAuthUserToUser(supabaseUser: any): User {
    const metadata = supabaseUser.user_metadata || {};

    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: metadata.full_name || supabaseUser.email?.split('@')[0] || 'User',
      phone: metadata.phone,
      contractCompLevel: metadata.contract_comp_level || 100,
      isActive: metadata.is_active !== false,
      agentCode: metadata.agent_code,
      licenseNumber: metadata.license_number,
      licenseState: metadata.license_state,
      licenseStates: metadata.license_states,
      notes: metadata.notes,
      hireDate: metadata.hire_date ? new Date(metadata.hire_date) : undefined,
      ytdCommission: metadata.ytd_commission,
      ytdPremium: metadata.ytd_premium,
      createdAt: new Date(supabaseUser.created_at),
      updatedAt: supabaseUser.updated_at ? new Date(supabaseUser.updated_at) : undefined,
      raw_user_meta_data: metadata
    };
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    this.clearCache();

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  /**
   * Clear user cache (call on sign out or user update)
   */
  clearCache(): void {
    this.currentUserCache = null;
  }

  // ============================================
  // TRANSFORMATION UTILITIES
  // ============================================

  /**
   * Transform UserProfile to simplified User type
   */
  private transformProfileToUser(profile: UserProfile): User {
    const fullName = [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(' ') || profile.email;

    return {
      id: profile.id,
      name: fullName,
      email: profile.email,
      phone: profile.phone,
      contractCompLevel: profile.contract_level,
      isActive: profile.approval_status === 'approved' && !profile.is_deleted,
      agentCode: profile.agent_code,
      licenseNumber: profile.license_number,
      licenseState: profile.license_state,
      licenseStates: profile.license_states,
      notes: profile.notes,
      hireDate: profile.hire_date ? new Date(profile.hire_date) : undefined,
      ytdCommission: profile.ytd_commission,
      ytdPremium: profile.ytd_premium,
      createdAt: profile.created_at ? new Date(profile.created_at) : undefined,
      updatedAt: profile.updated_at ? new Date(profile.updated_at) : undefined,
      raw_user_meta_data: {
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

  /**
   * Transform update data to database format
   */
  private transformUpdatesToDB(data: Partial<CreateUserData>): any {
    const dbData: any = {};

    if (data.name !== undefined) {
      const parts = data.name.split(' ');
      dbData.first_name = parts[0] || '';
      dbData.last_name = parts.slice(1).join(' ') || '';
    }
    if (data.email !== undefined) dbData.email = data.email.toLowerCase();
    if (data.phone !== undefined) dbData.phone = data.phone;
    if (data.contractCompLevel !== undefined) {
      dbData.contract_level = data.contractCompLevel;
    }
    if (data.isActive !== undefined) {
      dbData.approval_status = data.isActive ? 'approved' : 'pending';
    }
    if (data.licenseNumber !== undefined) dbData.license_number = data.licenseNumber;
    if (data.licenseStates !== undefined) dbData.license_states = data.licenseStates;
    if (data.hireDate !== undefined) dbData.hire_date = data.hireDate;
    if (data.ytdCommission !== undefined) dbData.ytd_commission = data.ytdCommission;
    if (data.ytdPremium !== undefined) dbData.ytd_premium = data.ytdPremium;

    return dbData;
  }

  // ============================================
  // BACKWARD COMPATIBILITY ALIASES
  // ============================================

  // These methods exist for backward compatibility
  async getAgentById(id: string): Promise<User | null> {
    return this.getById(id);
  }

  async getActive(): Promise<User[]> {
    return this.getActiveAgents();
  }

  async getAllUsers(): Promise<UserProfile[]> {
    const users = await this.getAll();
    return users.map(user => ({
      ...user,
      id: user.id,
      email: user.email,
      approval_status: user.raw_user_meta_data?.approval_status || 'approved',
      is_admin: user.raw_user_meta_data?.is_admin || false,
      created_at: user.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: user.updatedAt?.toISOString() || new Date().toISOString(),
    } as UserProfile));
  }

  async createUser(userData: any): Promise<any> {
    return this.create(userData);
  }

  async updateUser(userId: string, updates: any): Promise<any> {
    try {
      const user = await this.update(userId, updates);
      return { success: true, data: user };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update user' };
    }
  }

  async deleteUser(userId: string): Promise<any> {
    return this.delete(userId);
  }

  async approveUser(userId: string): Promise<any> {
    return this.approve(userId);
  }

  async denyUser(userId: string, reason?: string): Promise<any> {
    return this.deny(userId, reason);
  }

  async setPendingUser(userId: string): Promise<any> {
    return this.setPending(userId);
  }
}

// Export singleton instance
export const userService = new UserService();

// Export backward compatibility aliases
export const agentService = userService;
export const userApprovalService = userService;