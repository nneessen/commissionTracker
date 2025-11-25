// src/services/hierarchy/invitationService.ts
// Service layer for hierarchy invitation system - handles all invitation business logic

import { supabase } from '../base/supabase';
import { logger } from '../base/logger';
import type {
  HierarchyInvitation,
  SendInvitationRequest,
  SendInvitationResponse,
  AcceptInvitationRequest,
  AcceptInvitationResponse,
  DenyInvitationRequest,
  CancelInvitationRequest,
  InvitationValidationResult,
  InvitationWithDetails,
  InvitationStats,
} from '../../types/invitation.types';
import { DatabaseError, NotFoundError, ValidationError } from '../../errors/ServiceErrors';

/**
 * Service layer for hierarchy invitation operations
 * Handles all invitation business logic with comprehensive validation
 */
class InvitationService {
  /**
   * Send an invitation to add someone to your downline
   * Validates all business rules before creating invitation
   */
  async sendInvitation(request: SendInvitationRequest): Promise<SendInvitationResponse> {
    try {
      // Get current user (inviter)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      // Validate invitation
      const validation = await this.validateSendInvitation(user.id, request.invitee_email);

      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; '),
          warnings: validation.warnings,
        };
      }

      // Create invitation
      const { data: invitation, error: insertError } = await supabase
        .from('hierarchy_invitations')
        .insert({
          inviter_id: user.id,
          invitee_email: request.invitee_email.toLowerCase().trim(),
          message: request.message || null,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        throw new DatabaseError('sendInvitation', insertError);
      }

      logger.info('Invitation sent', {
        inviterId: user.id,
        inviteeEmail: request.invitee_email,
        invitationId: invitation.id,
      }, 'InvitationService');

      return {
        success: true,
        invitation,
        warnings: validation.warnings,
      };
    } catch (error) {
      logger.error('InvitationService.sendInvitation', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Accept an invitation (invitee side)
   * Sets upline_id via database trigger
   */
  async acceptInvitation(request: AcceptInvitationRequest): Promise<AcceptInvitationResponse> {
    try {
      // Get current user (invitee)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      // Get invitation
      const { data: invitation, error: fetchError } = await supabase
        .from('hierarchy_invitations')
        .select('*')
        .eq('id', request.invitation_id)
        .single();

      if (fetchError || !invitation) {
        throw new NotFoundError('Invitation', request.invitation_id);
      }

      // Validate acceptance
      const validation = await this.validateAcceptInvitation(user.id, invitation);

      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; '),
        };
      }

      // Update status to 'accepted' (trigger will handle upline_id update)
      const { data: updatedInvitation, error: updateError } = await supabase
        .from('hierarchy_invitations')
        .update({
          status: 'accepted',
        })
        .eq('id', request.invitation_id)
        .select()
        .single();

      if (updateError) {
        throw new DatabaseError('acceptInvitation', updateError);
      }

      logger.info('Invitation accepted', {
        inviteeId: user.id,
        invitationId: request.invitation_id,
        inviterId: invitation.inviter_id,
      }, 'InvitationService');

      return {
        success: true,
        invitation: updatedInvitation,
      };
    } catch (error) {
      logger.error('InvitationService.acceptInvitation', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Deny an invitation (invitee side)
   */
  async denyInvitation(request: DenyInvitationRequest): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user (invitee)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      // Verify invitation belongs to user and is pending
      const { data: invitation, error: fetchError } = await supabase
        .from('hierarchy_invitations')
        .select('*')
        .eq('id', request.invitation_id)
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
        .single();

      if (fetchError || !invitation) {
        return {
          success: false,
          error: 'Invitation not found or already processed',
        };
      }

      // Update status to 'denied'
      const { error: updateError } = await supabase
        .from('hierarchy_invitations')
        .update({
          status: 'denied',
        })
        .eq('id', request.invitation_id);

      if (updateError) {
        throw new DatabaseError('denyInvitation', updateError);
      }

      logger.info('Invitation denied', {
        inviteeId: user.id,
        invitationId: request.invitation_id,
      }, 'InvitationService');

      return { success: true };
    } catch (error) {
      logger.error('InvitationService.denyInvitation', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Cancel an invitation (inviter side)
   */
  async cancelInvitation(request: CancelInvitationRequest): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user (inviter)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      // Verify invitation belongs to user and is pending
      const { data: invitation, error: fetchError } = await supabase
        .from('hierarchy_invitations')
        .select('*')
        .eq('id', request.invitation_id)
        .eq('inviter_id', user.id)
        .eq('status', 'pending')
        .single();

      if (fetchError || !invitation) {
        return {
          success: false,
          error: 'Invitation not found or already processed',
        };
      }

      // Update status to 'cancelled'
      const { error: updateError } = await supabase
        .from('hierarchy_invitations')
        .update({
          status: 'cancelled',
        })
        .eq('id', request.invitation_id);

      if (updateError) {
        throw new DatabaseError('cancelInvitation', updateError);
      }

      logger.info('Invitation cancelled', {
        inviterId: user.id,
        invitationId: request.invitation_id,
      }, 'InvitationService');

      return { success: true };
    } catch (error) {
      logger.error('InvitationService.cancelInvitation', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get all invitations received by current user
   */
  async getReceivedInvitations(status?: string): Promise<InvitationWithDetails[]> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      let query = supabase
        .from('hierarchy_invitations')
        .select('*')
        .eq('invitee_id', user.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: invitations, error } = await query;

      if (error) {
        throw new DatabaseError('getReceivedInvitations', error);
      }

      // Enrich with details
      return await this.enrichInvitationsWithDetails(invitations || []);
    } catch (error) {
      logger.error('InvitationService.getReceivedInvitations', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get all invitations sent by current user
   */
  async getSentInvitations(status?: string): Promise<InvitationWithDetails[]> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      let query = supabase
        .from('hierarchy_invitations')
        .select('*')
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: invitations, error } = await query;

      if (error) {
        throw new DatabaseError('getSentInvitations', error);
      }

      return await this.enrichInvitationsWithDetails(invitations || []);
    } catch (error) {
      logger.error('InvitationService.getSentInvitations', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get invitation statistics for current user
   */
  async getInvitationStats(): Promise<InvitationStats> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Not authenticated');
      }

      // Get sent invitations
      const { data: sent } = await supabase
        .from('hierarchy_invitations')
        .select('status')
        .eq('inviter_id', user.id);

      // Get received invitations
      const { data: received } = await supabase
        .from('hierarchy_invitations')
        .select('status, expires_at')
        .eq('invitee_id', user.id);

      const now = new Date();

      return {
        sent_pending: (sent || []).filter(i => i.status === 'pending').length,
        sent_accepted: (sent || []).filter(i => i.status === 'accepted').length,
        sent_denied: (sent || []).filter(i => i.status === 'denied').length,
        sent_cancelled: (sent || []).filter(i => i.status === 'cancelled').length,
        received_pending: (received || []).filter(i => i.status === 'pending').length,
        received_expired: (received || []).filter(i => i.status === 'expired' || (i.status === 'pending' && new Date(i.expires_at) < now)).length,
      };
    } catch (error) {
      logger.error('InvitationService.getInvitationStats', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Validate sending an invitation
   * Uses database function for server-side validation
   */
  private async validateSendInvitation(inviterId: string, inviteeEmail: string): Promise<InvitationValidationResult> {
    try {
      // Call database function to validate
      const { data, error } = await supabase
        .rpc('validate_invitation_eligibility', {
          p_inviter_id: inviterId,
          p_invitee_email: inviteeEmail.toLowerCase().trim(),
        })
        .single();

      if (error) {
        logger.error('InvitationService.validateSendInvitation', error);
        return {
          valid: false,
          errors: ['Validation failed: ' + error.message],
          warnings: [],
        };
      }

      if (!data.valid) {
        return {
          valid: false,
          errors: [data.error_message],
          warnings: data.warning_message ? [data.warning_message] : [],
          invitee_user_id: data.invitee_user_id,
        };
      }

      return {
        valid: true,
        errors: [],
        warnings: data.warning_message ? [data.warning_message] : [],
        invitee_user_id: data.invitee_user_id,
      };
    } catch (error) {
      logger.error('InvitationService.validateSendInvitation', error instanceof Error ? error : new Error(String(error)));
      return {
        valid: false,
        errors: ['Validation failed: ' + (error instanceof Error ? error.message : String(error))],
        warnings: [],
      };
    }
  }

  /**
   * Validate accepting an invitation
   * Uses database function for server-side validation
   */
  private async validateAcceptInvitation(userId: string, invitation: HierarchyInvitation): Promise<InvitationValidationResult> {
    try {
      // Call database function to validate
      const { data, error } = await supabase
        .rpc('validate_invitation_acceptance', {
          p_invitee_id: userId,
          p_invitation_id: invitation.id,
        })
        .single();

      if (error) {
        logger.error('InvitationService.validateAcceptInvitation', error);
        return {
          valid: false,
          errors: ['Validation failed: ' + error.message],
          warnings: [],
        };
      }

      if (!data.valid) {
        return {
          valid: false,
          errors: [data.error_message],
          warnings: [],
        };
      }

      return {
        valid: true,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      logger.error('InvitationService.validateAcceptInvitation', error instanceof Error ? error : new Error(String(error)));
      return {
        valid: false,
        errors: ['Validation failed: ' + (error instanceof Error ? error.message : String(error))],
        warnings: [],
      };
    }
  }

  /**
   * Enrich invitations with additional details for display
   */
  private async enrichInvitationsWithDetails(invitations: HierarchyInvitation[]): Promise<InvitationWithDetails[]> {
    if (invitations.length === 0) return [];

    try {
      // Get all unique inviter and invitee IDs
      const inviterIds = [...new Set(invitations.map(i => i.inviter_id))];
      const inviteeIds = [...new Set(invitations.map(i => i.invitee_id).filter(Boolean))];

      // Fetch inviter profiles
      const { data: inviterProfiles } = await supabase
        .from('user_profiles')
        .select('id, email, hierarchy_depth')
        .in('id', inviterIds);

      // Fetch invitee profiles
      const { data: inviteeProfiles } = await supabase
        .from('user_profiles')
        .select('id, email, upline_id')
        .in('id', inviteeIds.filter((id): id is string => id !== null));

      // Check for downlines
      const { data: downlines } = await supabase
        .from('user_profiles')
        .select('upline_id')
        .in('upline_id', inviteeIds.filter((id): id is string => id !== null));

      const inviterMap = new Map(inviterProfiles?.map(p => [p.id, p]));
      const inviteeMap = new Map(inviteeProfiles?.map(p => [p.id, p]));
      const downlineMap = new Map<string, number>();

      // Count downlines per user
      (downlines || []).forEach(d => {
        if (d.upline_id) {
          downlineMap.set(d.upline_id, (downlineMap.get(d.upline_id) || 0) + 1);
        }
      });

      const now = new Date();

      // Enrich invitations
      return invitations.map(inv => {
        const inviter = inviterMap.get(inv.inviter_id);
        const invitee = inv.invitee_id ? inviteeMap.get(inv.invitee_id) : null;
        const expiresAt = new Date(inv.expires_at);
        const isExpired = expiresAt < now;
        const hasDownlines = inv.invitee_id ? (downlineMap.get(inv.invitee_id) || 0) > 0 : false;
        const hasUpline = invitee?.upline_id !== null && invitee?.upline_id !== undefined;

        return {
          ...inv,
          inviter_email: inviter?.email,
          inviter_hierarchy_depth: inviter?.hierarchy_depth,
          invitee_has_downlines: hasDownlines,
          invitee_has_upline: hasUpline,
          is_expired: isExpired,
          can_accept: inv.status === 'pending' && !isExpired && !hasUpline && !hasDownlines,
        };
      });
    } catch (error) {
      logger.error('InvitationService.enrichInvitationsWithDetails', error instanceof Error ? error : new Error(String(error)));
      // Return basic invitations if enrichment fails
      return invitations.map(inv => ({
        ...inv,
        is_expired: new Date(inv.expires_at) < new Date(),
      }));
    }
  }
}

export { InvitationService };
export const invitationService = new InvitationService();
