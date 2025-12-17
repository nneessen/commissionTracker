// src/services/hierarchy/invitationService.ts
// Service layer for hierarchy invitation system - handles all invitation business logic

import { supabase } from "../base/supabase";
import { logger } from "../base/logger";
import { emailService } from "../emailService";
import type {
  HierarchyInvitation,
  SendInvitationRequest,
  SendInvitationResponse,
  AcceptInvitationRequest,
  AcceptInvitationResponse,
  DenyInvitationRequest,
  CancelInvitationRequest,
  ResendInvitationRequest,
  InvitationValidationResult,
  InvitationWithDetails,
  InvitationStats,
} from "../../types/invitation.types";
import { DatabaseError, NotFoundError } from "../../errors/ServiceErrors";

/**
 * Service layer for hierarchy invitation operations
 * Handles all invitation business logic with comprehensive validation
 */
class InvitationService {
  /**
   * Send an invitation to add someone to your downline
   * Validates all business rules before creating invitation
   */
  async sendInvitation(
    request: SendInvitationRequest,
  ): Promise<SendInvitationResponse> {
    try {
      // Get current user (inviter)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      // Validate invitation
      const validation = await this.validateSendInvitation(
        user.id,
        request.invitee_email,
      );

      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
          warnings: validation.warnings,
        };
      }

      // Create invitation
      const { data: invitation, error: insertError } = await supabase
        .from("hierarchy_invitations")
        .insert({
          inviter_id: user.id,
          invitee_email: request.invitee_email.toLowerCase().trim(),
          message: request.message || null,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) {
        throw new DatabaseError("sendInvitation", insertError);
      }

      // Get inviter's profile for email
      const { data: inviterProfile } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .single();

      const inviterName = inviterProfile
        ? `${inviterProfile.first_name || ""} ${inviterProfile.last_name || ""}`.trim() ||
          inviterProfile.email ||
          "A team member"
        : "A team member";

      // Send invitation email via Mailgun
      try {
        const emailHTML = this.generateInvitationEmailHTML(
          inviterName,
          request.invitee_email,
          request.message,
        );

        // Determine sender: owner uses personal email, others use system noreply
        const senderEmail = this.getSenderEmailAddress(
          inviterProfile?.email,
          inviterName,
        );

        await emailService.sendEmail({
          to: [request.invitee_email],
          subject: `${inviterName} invited you to join their team`,
          html: emailHTML,
          text: emailService.htmlToText(emailHTML),
          from: senderEmail,
        });

        logger.info(
          "Invitation email sent",
          {
            invitationId: invitation.id,
            inviteeEmail: request.invitee_email,
          },
          "InvitationService",
        );
      } catch (emailError) {
        // Log email failure but don't fail the invitation
        logger.error(
          "Failed to send invitation email",
          emailError instanceof Error
            ? emailError
            : new Error(String(emailError)),
        );
        // Add warning to response
        validation.warnings.push(
          "Invitation created but email notification failed to send",
        );
      }

      logger.info(
        "Invitation sent",
        {
          inviterId: user.id,
          inviteeEmail: request.invitee_email,
          invitationId: invitation.id,
        },
        "InvitationService",
      );

      return {
        success: true,
        invitation,
        warnings: validation.warnings,
      };
    } catch (error) {
      logger.error(
        "InvitationService.sendInvitation",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Accept an invitation (invitee side)
   * Sets upline_id via database trigger
   */
  async acceptInvitation(
    request: AcceptInvitationRequest,
  ): Promise<AcceptInvitationResponse> {
    try {
      // Get current user (invitee)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      // Get invitation
      const { data: invitation, error: fetchError } = await supabase
        .from("hierarchy_invitations")
        .select("*")
        .eq("id", request.invitation_id)
        .single();

      if (fetchError || !invitation) {
        throw new NotFoundError("Invitation", request.invitation_id);
      }

      // Validate acceptance
      const validation = await this.validateAcceptInvitation(
        user.id,
        invitation,
      );

      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
        };
      }

      // Update status to 'accepted' (trigger will handle upline_id update)
      const { data: updatedInvitation, error: updateError } = await supabase
        .from("hierarchy_invitations")
        .update({
          status: "accepted",
        })
        .eq("id", request.invitation_id)
        .select()
        .single();

      if (updateError) {
        throw new DatabaseError("acceptInvitation", updateError);
      }

      logger.info(
        "Invitation accepted",
        {
          inviteeId: user.id,
          invitationId: request.invitation_id,
          inviterId: invitation.inviter_id,
        },
        "InvitationService",
      );

      return {
        success: true,
        invitation: updatedInvitation,
      };
    } catch (error) {
      logger.error(
        "InvitationService.acceptInvitation",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Deny an invitation (invitee side)
   */
  async denyInvitation(
    request: DenyInvitationRequest,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user (invitee)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      // Verify invitation belongs to user and is pending
      const { data: invitation, error: fetchError } = await supabase
        .from("hierarchy_invitations")
        .select("*")
        .eq("id", request.invitation_id)
        .eq("invitee_id", user.id)
        .eq("status", "pending")
        .single();

      if (fetchError || !invitation) {
        return {
          success: false,
          error: "Invitation not found or already processed",
        };
      }

      // Update status to 'denied'
      const { error: updateError } = await supabase
        .from("hierarchy_invitations")
        .update({
          status: "denied",
        })
        .eq("id", request.invitation_id);

      if (updateError) {
        throw new DatabaseError("denyInvitation", updateError);
      }

      logger.info(
        "Invitation denied",
        {
          inviteeId: user.id,
          invitationId: request.invitation_id,
        },
        "InvitationService",
      );

      return { success: true };
    } catch (error) {
      logger.error(
        "InvitationService.denyInvitation",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Cancel an invitation (inviter side)
   */
  async cancelInvitation(
    request: CancelInvitationRequest,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user (inviter)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      // Verify invitation belongs to user and is pending
      const { data: invitation, error: fetchError } = await supabase
        .from("hierarchy_invitations")
        .select("*")
        .eq("id", request.invitation_id)
        .eq("inviter_id", user.id)
        .eq("status", "pending")
        .single();

      if (fetchError || !invitation) {
        return {
          success: false,
          error: "Invitation not found or already processed",
        };
      }

      // Update status to 'cancelled'
      const { error: updateError } = await supabase
        .from("hierarchy_invitations")
        .update({
          status: "cancelled",
        })
        .eq("id", request.invitation_id);

      if (updateError) {
        throw new DatabaseError("cancelInvitation", updateError);
      }

      logger.info(
        "Invitation cancelled",
        {
          inviterId: user.id,
          invitationId: request.invitation_id,
        },
        "InvitationService",
      );

      return { success: true };
    } catch (error) {
      logger.error(
        "InvitationService.cancelInvitation",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Resend an invitation (updates expiration date)
   */
  async resendInvitation(
    request: ResendInvitationRequest,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user (inviter)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      // Verify invitation belongs to user and is pending
      const { data: invitation, error: fetchError } = await supabase
        .from("hierarchy_invitations")
        .select("*")
        .eq("id", request.invitation_id)
        .eq("inviter_id", user.id)
        .eq("status", "pending")
        .single();

      if (fetchError || !invitation) {
        return {
          success: false,
          error: "Invitation not found or already processed",
        };
      }

      // Check if invitation is expired
      const now = new Date();
      const expiresAt = new Date(invitation.expires_at);
      const isExpired = now > expiresAt;

      // Update expires_at to 7 days from now
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      const { error: updateError } = await supabase
        .from("hierarchy_invitations")
        .update({
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", request.invitation_id);

      if (updateError) {
        throw new DatabaseError("resendInvitation", updateError);
      }

      // Get inviter's profile for email
      const { data: inviterProfile } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .single();

      const inviterName = inviterProfile
        ? `${inviterProfile.first_name || ""} ${inviterProfile.last_name || ""}`.trim() ||
          inviterProfile.email ||
          "A team member"
        : "A team member";

      // Send invitation email via Mailgun
      try {
        const emailHTML = this.generateInvitationEmailHTML(
          inviterName,
          invitation.invitee_email,
          invitation.message,
        );

        // Determine sender: owner uses personal email, others use system noreply
        const senderEmail = this.getSenderEmailAddress(
          inviterProfile?.email,
          inviterName,
        );

        await emailService.sendEmail({
          to: [invitation.invitee_email],
          subject: `Reminder: ${inviterName} invited you to join their team`,
          html: emailHTML,
          text: emailService.htmlToText(emailHTML),
          from: senderEmail,
        });

        logger.info(
          "Invitation resend email sent",
          {
            invitationId: request.invitation_id,
            inviteeEmail: invitation.invitee_email,
          },
          "InvitationService",
        );
      } catch (emailError) {
        // Log email failure but don't fail the resend
        logger.error(
          "Failed to send invitation resend email",
          emailError instanceof Error
            ? emailError
            : new Error(String(emailError)),
        );
      }

      logger.info(
        "Invitation resent",
        {
          inviterId: user.id,
          invitationId: request.invitation_id,
          inviteeEmail: invitation.invitee_email,
          wasExpired: isExpired,
          newExpiresAt: newExpiresAt.toISOString(),
        },
        "InvitationService",
      );

      return { success: true };
    } catch (error) {
      logger.error(
        "InvitationService.resendInvitation",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Get all invitations received by current user
   */
  async getReceivedInvitations(
    status?: string,
  ): Promise<InvitationWithDetails[]> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      let query = supabase
        .from("hierarchy_invitations")
        .select("*")
        .eq("invitee_id", user.id)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data: invitations, error } = await query;

      if (error) {
        throw new DatabaseError("getReceivedInvitations", error);
      }

      // Enrich with details
      return await this.enrichInvitationsWithDetails(invitations || []);
    } catch (error) {
      logger.error(
        "InvitationService.getReceivedInvitations",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Get all invitations sent by current user
   */
  async getSentInvitations(status?: string): Promise<InvitationWithDetails[]> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      let query = supabase
        .from("hierarchy_invitations")
        .select("*")
        .eq("inviter_id", user.id)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data: invitations, error } = await query;

      if (error) {
        throw new DatabaseError("getSentInvitations", error);
      }

      return await this.enrichInvitationsWithDetails(invitations || []);
    } catch (error) {
      logger.error(
        "InvitationService.getSentInvitations",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Get invitation statistics for current user
   */
  async getInvitationStats(): Promise<InvitationStats> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Not authenticated");
      }

      // Get sent invitations
      const { data: sent } = await supabase
        .from("hierarchy_invitations")
        .select("status")
        .eq("inviter_id", user.id);

      // Get received invitations
      const { data: received } = await supabase
        .from("hierarchy_invitations")
        .select("status, expires_at")
        .eq("invitee_id", user.id);

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
      logger.error(
        "InvitationService.getInvitationStats",
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Validate sending an invitation
   * Uses database function for server-side validation
   */
  private async validateSendInvitation(
    inviterId: string,
    inviteeEmail: string,
  ): Promise<InvitationValidationResult> {
    // Type for RPC response
    interface ValidationRpcResponse {
      valid: boolean;
      error_message?: string;
      warning_message?: string;
      inviteeuser_id?: string;
    }

    try {
      // Call database function to validate
      const { data, error } = await supabase
        .rpc("validate_invitation_eligibility", {
          p_inviter_id: inviterId,
          p_invitee_email: inviteeEmail.toLowerCase().trim(),
        })
        .single();

      if (error) {
        logger.error("InvitationService.validateSendInvitation", error);
        return {
          valid: false,
          errors: ["Validation failed: " + error.message],
          warnings: [],
        };
      }

      const result = data as ValidationRpcResponse;

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
        "InvitationService.validateSendInvitation",
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
   * Validate accepting an invitation
   * Uses database function for server-side validation
   */
  private async validateAcceptInvitation(
    userId: string,
    invitation: HierarchyInvitation,
  ): Promise<InvitationValidationResult> {
    // Type for RPC response
    interface AcceptValidationRpcResponse {
      valid: boolean;
      error_message?: string;
    }

    try {
      // Call database function to validate
      const { data, error } = await supabase
        .rpc("validate_invitation_acceptance", {
          p_invitee_id: userId,
          p_invitation_id: invitation.id,
        })
        .single();

      if (error) {
        logger.error("InvitationService.validateAcceptInvitation", error);
        return {
          valid: false,
          errors: ["Validation failed: " + error.message],
          warnings: [],
        };
      }

      const result = data as AcceptValidationRpcResponse;

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
        "InvitationService.validateAcceptInvitation",
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
   * Enrich invitations with additional details for display
   */
  /**
   * Get the sender email address for invitation emails
   * Returns the inviter's personal email if they're the owner, otherwise noreply
   */
  private getSenderEmailAddress(
    inviterEmail: string | null | undefined,
    inviterName: string,
  ): string {
    // Owner email - when the owner sends invitations, use their personal email
    const OWNER_EMAIL = "nickneessen@thestandardhq.com";
    const SYSTEM_EMAIL = "noreply@thestandardhq.com";

    if (inviterEmail?.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      return `${inviterName} <${OWNER_EMAIL}>`;
    }

    // For all other users, use the system noreply address
    return `The Standard HQ <${SYSTEM_EMAIL}>`;
  }

  /**
   * Generate invitation email HTML
   * Uses zinc-based styling to match the application design
   */
  private generateInvitationEmailHTML(
    inviterName: string,
    inviteeEmail: string,
    message?: string | null,
  ): string {
    // Use environment variable or fallback to production URL
    const appUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : import.meta.env.VITE_APP_URL || "https://yourapp.com";
    const hierarchyUrl = `${appUrl}/hierarchy`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #3f3f46; max-width: 560px; margin: 0 auto; padding: 16px; background-color: #fafafa;">
  <!-- Header -->
  <div style="background-color: #18181b; padding: 20px 24px; border-radius: 6px 6px 0 0;">
    <h1 style="color: #fafafa; margin: 0; font-size: 16px; font-weight: 600; letter-spacing: -0.02em;">Team Invitation</h1>
  </div>

  <!-- Main Content -->
  <div style="background-color: #ffffff; padding: 24px; border: 1px solid #e4e4e7; border-top: none; border-radius: 0 0 6px 6px;">
    <p style="font-size: 14px; margin: 0 0 16px 0; color: #52525b;">Hi there,</p>

    <p style="font-size: 14px; margin: 0 0 20px 0; color: #27272a;">
      <strong style="color: #18181b;">${inviterName}</strong> has invited you to join their team.
    </p>

    ${
      message
        ? `
    <div style="background-color: #f4f4f5; padding: 12px 16px; border-left: 3px solid #18181b; margin: 0 0 20px 0; border-radius: 0 4px 4px 0;">
      <p style="margin: 0; font-size: 13px; font-style: italic; color: #52525b;">"${message}"</p>
    </div>
    `
        : ""
    }

    <p style="font-size: 13px; margin: 0 0 12px 0; color: #52525b; font-weight: 500;">To accept this invitation:</p>

    <ol style="font-size: 13px; line-height: 1.7; margin: 0 0 24px 0; padding-left: 20px; color: #3f3f46;">
      <li style="margin-bottom: 4px;">Log into your account using <strong style="color: #18181b;">${inviteeEmail}</strong></li>
      <li style="margin-bottom: 4px;">Go to the Team page</li>
      <li style="margin-bottom: 4px;">Click Accept on the invitation banner</li>
    </ol>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 24px 0;">
      <a href="${hierarchyUrl}" style="display: inline-block; background-color: #18181b; color: #fafafa; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 13px;">View Invitation</a>
    </div>

    <p style="font-size: 12px; color: #71717a; margin: 20px 0 0 0;">
      This invitation expires in 7 days. You can decline it from the Team page if needed.
    </p>

    <!-- Divider -->
    <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;">

    <!-- Footer -->
    <p style="font-size: 11px; color: #a1a1aa; text-align: center; margin: 0;">
      If you didn't expect this invitation, please contact your team leader.
    </p>
  </div>

  <!-- Email Footer -->
  <div style="text-align: center; padding: 16px 0;">
    <p style="font-size: 11px; color: #a1a1aa; margin: 0;">The Standard HQ</p>
  </div>
</body>
</html>
    `.trim();
  }

  private async enrichInvitationsWithDetails(
    invitations: HierarchyInvitation[],
  ): Promise<InvitationWithDetails[]> {
    if (invitations.length === 0) return [];

    try {
      // Get all unique inviter and invitee IDs
      const inviterIds = [...new Set(invitations.map((i) => i.inviter_id))];
      const inviteeIds = [
        ...new Set(invitations.map((i) => i.invitee_id).filter(Boolean)),
      ];

      // Fetch inviter profiles
      const { data: inviterProfiles } = await supabase
        .from("user_profiles")
        .select("id, email, hierarchy_depth")
        .in("id", inviterIds);

      // Fetch invitee profiles
      const { data: inviteeProfiles } = await supabase
        .from("user_profiles")
        .select("id, email, upline_id")
        .in(
          "id",
          inviteeIds.filter((id): id is string => id !== null),
        );

      // Check for downlines
      const { data: downlines } = await supabase
        .from("user_profiles")
        .select("upline_id")
        .in(
          "upline_id",
          inviteeIds.filter((id): id is string => id !== null),
        );

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
        "InvitationService.enrichInvitationsWithDetails",
        error instanceof Error ? error : new Error(String(error)),
      );
      // Return basic invitations if enrichment fails
      return invitations.map((inv) => ({
        ...inv,
        is_expired: new Date(inv.expires_at) < new Date(),
      }));
    }
  }
}

export { InvitationService };
export const invitationService = new InvitationService();
