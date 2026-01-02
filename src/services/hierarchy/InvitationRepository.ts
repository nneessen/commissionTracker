// src/services/hierarchy/InvitationRepository.ts
// Repository for hierarchy_invitations table data access

import { BaseRepository, BaseEntity } from "../base/BaseRepository";
import { logger } from "../base/logger";
import type { Database } from "@/types/database.types";
import type {
  HierarchyInvitation,
  InvitationWithDetails,
  InvitationStats,
  InvitationValidationResult,
} from "@/types/invitation.types";

// Database row types from generated types
type InvitationInsert =
  Database["public"]["Tables"]["hierarchy_invitations"]["Insert"];
type InvitationUpdate =
  Database["public"]["Tables"]["hierarchy_invitations"]["Update"];

// Entity type combining HierarchyInvitation with BaseEntity
export type InvitationBaseEntity = HierarchyInvitation & BaseEntity;

// Filter options for queries
export interface InvitationFilters {
  status?: string;
  inviter_id?: string;
  invitee_id?: string;
  invitee_email?: string;
}

// User profile for enrichment
export interface InviterProfile {
  first_name: string | null;
  last_name: string | null;
  email: string;
}

// RPC response types
interface EligibilityValidationResponse {
  valid: boolean;
  error_message?: string;
  warning_message?: string;
  inviteeuser_id?: string;
}

interface AcceptanceValidationResponse {
  valid: boolean;
  error_message?: string;
}

/**
 * Repository for hierarchy_invitations table
 * Handles all database operations for invitations
 */
export class InvitationRepository extends BaseRepository<
  InvitationBaseEntity,
  InvitationInsert,
  InvitationUpdate
> {
  constructor() {
    super("hierarchy_invitations");
  }

  /**
   * Transform database record to entity
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): InvitationBaseEntity {
    // Use double cast to bypass BaseEntity date type conflict
    // (HierarchyInvitation uses string dates, BaseEntity uses Date)
    return dbRecord as unknown as InvitationBaseEntity;
  }

  /**
   * Transform entity to database record
   */
  protected transformToDB(
    data: InvitationInsert | InvitationUpdate,
  ): Record<string, unknown> {
    return data as Record<string, unknown>;
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Find invitations by inviter ID (sent invitations)
   */
  async findByInviterId(
    inviterId: string,
    status?: string,
  ): Promise<InvitationBaseEntity[]> {
    try {
      let query = this.client
        .from(this.tableName)
        .select("*")
        .eq("inviter_id", inviterId);

      if (status) {
        query = query.eq("status", status);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw this.handleError(error, "findByInviterId");
      }

      return (data || []).map((item) => this.transformFromDB(item));
    } catch (error) {
      throw this.wrapError(error, "findByInviterId");
    }
  }

  /**
   * Find invitations by invitee ID (received invitations)
   */
  async findByInviteeId(
    inviteeId: string,
    status?: string,
  ): Promise<InvitationBaseEntity[]> {
    try {
      let query = this.client
        .from(this.tableName)
        .select("*")
        .eq("invitee_id", inviteeId);

      if (status) {
        query = query.eq("status", status);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw this.handleError(error, "findByInviteeId");
      }

      return (data || []).map((item) => this.transformFromDB(item));
    } catch (error) {
      throw this.wrapError(error, "findByInviteeId");
    }
  }

  /**
   * Find invitations by invitee email (for pre-registration invitations)
   */
  async findByInviteeEmail(
    email: string,
    excludeWithInviteeId = false,
  ): Promise<InvitationBaseEntity[]> {
    try {
      let query = this.client
        .from(this.tableName)
        .select("*")
        .eq("invitee_email", email.toLowerCase())
        .order("created_at", { ascending: false });

      if (excludeWithInviteeId) {
        query = query.is("invitee_id", null);
      }

      const { data, error } = await query;

      if (error) {
        throw this.handleError(error, "findByInviteeEmail");
      }

      return (data || []).map((item) => this.transformFromDB(item));
    } catch (error) {
      throw this.wrapError(error, "findByInviteeEmail");
    }
  }

  /**
   * Find pending invitations for an invitee (by ID or email)
   * Used when loading received invitations
   */
  async findPendingForInvitee(
    inviteeId: string,
    inviteeEmail: string,
  ): Promise<InvitationBaseEntity[]> {
    try {
      // Query by invitee_id
      const byIdPromise = this.client
        .from(this.tableName)
        .select("*")
        .eq("invitee_id", inviteeId)
        .order("created_at", { ascending: false });

      // Query by email (for invitations sent before user existed)
      const byEmailPromise = this.client
        .from(this.tableName)
        .select("*")
        .eq("invitee_email", inviteeEmail.toLowerCase())
        .is("invitee_id", null)
        .order("created_at", { ascending: false });

      const [byIdResult, byEmailResult] = await Promise.all([
        byIdPromise,
        byEmailPromise,
      ]);

      const error = byIdResult.error || byEmailResult.error;
      if (error) {
        throw this.handleError(error, "findPendingForInvitee");
      }

      // Merge results, removing duplicates by id
      const allInvitations = [
        ...(byIdResult.data || []),
        ...(byEmailResult.data || []),
      ];
      const uniqueInvitations = allInvitations.filter(
        (inv, index, self) => index === self.findIndex((i) => i.id === inv.id),
      );

      return uniqueInvitations.map((item) => this.transformFromDB(item));
    } catch (error) {
      throw this.wrapError(error, "findPendingForInvitee");
    }
  }

  /**
   * Find and verify pending invitation by inviter
   */
  async findPendingByInviterId(
    invitationId: string,
    inviterId: string,
  ): Promise<InvitationBaseEntity | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("id", invitationId)
        .eq("inviter_id", inviterId)
        .eq("status", "pending")
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw this.handleError(error, "findPendingByInviterId");
      }

      return data ? this.transformFromDB(data) : null;
    } catch (error) {
      throw this.wrapError(error, "findPendingByInviterId");
    }
  }

  /**
   * Find and verify pending invitation by invitee
   */
  async findPendingByInviteeId(
    invitationId: string,
    inviteeId: string,
  ): Promise<InvitationBaseEntity | null> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select("*")
        .eq("id", invitationId)
        .eq("invitee_id", inviteeId)
        .eq("status", "pending")
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw this.handleError(error, "findPendingByInviteeId");
      }

      return data ? this.transformFromDB(data) : null;
    } catch (error) {
      throw this.wrapError(error, "findPendingByInviteeId");
    }
  }

  // ============================================
  // Update Methods
  // ============================================

  /**
   * Update invitation status
   */
  async updateStatus(
    id: string,
    status: string,
  ): Promise<InvitationBaseEntity> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .update({ status })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw this.handleError(error, "updateStatus");
      }

      return this.transformFromDB(data);
    } catch (error) {
      throw this.wrapError(error, "updateStatus");
    }
  }

  /**
   * Extend invitation expiration date
   */
  async extendExpiration(id: string, newExpiresAt: Date): Promise<void> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .update({
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        throw this.handleError(error, "extendExpiration");
      }
    } catch (error) {
      throw this.wrapError(error, "extendExpiration");
    }
  }

  // ============================================
  // RPC Validation Methods
  // ============================================

  /**
   * Validate invitation eligibility via database RPC
   * @param excludeInvitationId - Optional invitation ID to exclude from duplicate check (for resend)
   */
  async validateEligibility(
    inviterId: string,
    inviteeEmail: string,
    excludeInvitationId?: string,
  ): Promise<InvitationValidationResult> {
    try {
      const { data, error } = await this.client
        .rpc("validate_invitation_eligibility", {
          p_inviter_id: inviterId,
          p_invitee_email: inviteeEmail.toLowerCase().trim(),
          p_exclude_invitation_id: excludeInvitationId ?? null,
        })
        .single();

      if (error) {
        logger.error("InvitationRepository.validateEligibility", error);
        return {
          valid: false,
          errors: ["Validation failed: " + error.message],
          warnings: [],
        };
      }

      const result = data as EligibilityValidationResponse;

      if (!result.valid) {
        return {
          valid: false,
          errors: [result.error_message || "Validation failed"],
          warnings: result.warning_message ? [result.warning_message] : [],
          inviteeuser_id: result.inviteeuser_id,
        };
      }

      return {
        valid: true,
        errors: [],
        warnings: result.warning_message ? [result.warning_message] : [],
        inviteeuser_id: result.inviteeuser_id,
      };
    } catch (error) {
      logger.error(
        "InvitationRepository.validateEligibility",
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        valid: false,
        errors: [
          "Validation failed: " +
            (error instanceof Error ? error.message : String(error)),
        ],
        warnings: [],
      };
    }
  }

  /**
   * Validate invitation acceptance via database RPC
   */
  async validateAcceptance(
    inviteeId: string,
    invitationId: string,
  ): Promise<InvitationValidationResult> {
    try {
      const { data, error } = await this.client
        .rpc("validate_invitation_acceptance", {
          p_invitee_id: inviteeId,
          p_invitation_id: invitationId,
        })
        .single();

      if (error) {
        logger.error("InvitationRepository.validateAcceptance", error);
        return {
          valid: false,
          errors: ["Validation failed: " + error.message],
          warnings: [],
        };
      }

      const result = data as AcceptanceValidationResponse;

      if (!result.valid) {
        return {
          valid: false,
          errors: [result.error_message || "Validation failed"],
          warnings: [],
        };
      }

      return {
        valid: true,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      logger.error(
        "InvitationRepository.validateAcceptance",
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        valid: false,
        errors: [
          "Validation failed: " +
            (error instanceof Error ? error.message : String(error)),
        ],
        warnings: [],
      };
    }
  }

  // ============================================
  // Profile Enrichment Methods
  // ============================================

  /**
   * Get user profile for email sending
   */
  async getUserProfile(userId: string): Promise<InviterProfile | null> {
    try {
      const { data, error } = await this.client
        .from("user_profiles")
        .select("first_name, last_name, email")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw this.handleError(error, "getUserProfile");
      }

      return data as InviterProfile;
    } catch (error) {
      throw this.wrapError(error, "getUserProfile");
    }
  }

  /**
   * Enrich invitations with profile data for display
   */
  async enrichWithDetails(
    invitations: InvitationBaseEntity[],
  ): Promise<InvitationWithDetails[]> {
    if (invitations.length === 0) return [];

    try {
      // Get all unique inviter and invitee IDs
      const inviterIds = [...new Set(invitations.map((i) => i.inviter_id))];
      const inviteeIds = [
        ...new Set(invitations.map((i) => i.invitee_id).filter(Boolean)),
      ] as string[];

      // Fetch inviter profiles
      const { data: inviterProfiles } = await this.client
        .from("user_profiles")
        .select("id, email, hierarchy_depth")
        .in("id", inviterIds);

      // Fetch invitee profiles
      const { data: inviteeProfiles } = await this.client
        .from("user_profiles")
        .select("id, email, upline_id")
        .in("id", inviteeIds);

      // Check for downlines
      const { data: downlines } = await this.client
        .from("user_profiles")
        .select("upline_id")
        .in("upline_id", inviteeIds);

      const inviterMap = new Map(inviterProfiles?.map((p) => [p.id, p]));
      const inviteeMap = new Map(inviteeProfiles?.map((p) => [p.id, p]));
      const downlineMap = new Map<string, number>();

      // Count downlines per user
      (downlines || []).forEach((d) => {
        if (d.upline_id) {
          downlineMap.set(d.upline_id, (downlineMap.get(d.upline_id) || 0) + 1);
        }
      });

      const now = new Date();

      // Enrich invitations
      return invitations.map((inv) => {
        const inviter = inviterMap.get(inv.inviter_id);
        const invitee = inv.invitee_id ? inviteeMap.get(inv.invitee_id) : null;
        const expiresAt = new Date(inv.expires_at);
        const isExpired = expiresAt < now;
        const hasDownlines = inv.invitee_id
          ? (downlineMap.get(inv.invitee_id) || 0) > 0
          : false;
        const hasUpline =
          invitee?.upline_id !== null && invitee?.upline_id !== undefined;

        return {
          ...inv,
          inviter_email: inviter?.email,
          inviter_hierarchy_depth: inviter?.hierarchy_depth,
          invitee_has_downlines: hasDownlines,
          invitee_has_upline: hasUpline,
          is_expired: isExpired,
          can_accept:
            inv.status === "pending" &&
            !isExpired &&
            !hasUpline &&
            !hasDownlines,
        };
      });
    } catch (error) {
      logger.error(
        "InvitationRepository.enrichWithDetails",
        error instanceof Error ? error : new Error(String(error)),
      );
      // Return basic invitations if enrichment fails
      return invitations.map((inv) => ({
        ...inv,
        is_expired: new Date(inv.expires_at) < new Date(),
      }));
    }
  }

  // ============================================
  // Statistics Methods
  // ============================================

  /**
   * Get invitation statistics for a user
   */
  async getStatsByUserId(userId: string): Promise<InvitationStats> {
    try {
      // Get sent invitations
      const { data: sent } = await this.client
        .from(this.tableName)
        .select("status")
        .eq("inviter_id", userId);

      // Get received invitations
      const { data: received } = await this.client
        .from(this.tableName)
        .select("status, expires_at")
        .eq("invitee_id", userId);

      const now = new Date();

      return {
        sent_pending: (sent || []).filter((i) => i.status === "pending").length,
        sent_accepted: (sent || []).filter((i) => i.status === "accepted")
          .length,
        sent_denied: (sent || []).filter((i) => i.status === "denied").length,
        sent_cancelled: (sent || []).filter((i) => i.status === "cancelled")
          .length,
        received_pending: (received || []).filter((i) => i.status === "pending")
          .length,
        received_expired: (received || []).filter(
          (i) =>
            i.status === "expired" ||
            (i.status === "pending" && new Date(i.expires_at) < now),
        ).length,
      };
    } catch (error) {
      throw this.wrapError(error, "getStatsByUserId");
    }
  }
}
