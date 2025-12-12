// src/hooks/hierarchy/useInvitations.ts
// TanStack Query hooks for hierarchy invitation system

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {invitationService} from '../../services/hierarchy/invitationService';
import type {SendInvitationRequest, AcceptInvitationRequest, DenyInvitationRequest, CancelInvitationRequest} from '../../types/invitation.types';
import {toast} from 'sonner';

/**
 * Query keys for invitation-related queries
 */
export const invitationKeys = {
  all: ['invitations'] as const,
  received: () => [...invitationKeys.all, 'received'] as const,
  receivedByStatus: (status?: string) => [...invitationKeys.received(), status] as const,
  sent: () => [...invitationKeys.all, 'sent'] as const,
  sentByStatus: (status?: string) => [...invitationKeys.sent(), status] as const,
  stats: () => [...invitationKeys.all, 'stats'] as const,
};

/**
 * Get invitations received by current user
 */
export function useReceivedInvitations(status?: string) {
  return useQuery({
    queryKey: invitationKeys.receivedByStatus(status),
    queryFn: () => invitationService.getReceivedInvitations(status),
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Get invitations sent by current user
 */
export function useSentInvitations(status?: string) {
  return useQuery({
    queryKey: invitationKeys.sentByStatus(status),
    queryFn: () => invitationService.getSentInvitations(status),
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Get invitation statistics
 */
export function useInvitationStats() {
  return useQuery({
    queryKey: invitationKeys.stats(),
    queryFn: () => invitationService.getInvitationStats(),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Send a new invitation
 */
export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SendInvitationRequest) => invitationService.sendInvitation(request),
    onSuccess: (response) => {
      if (response.success) {
        toast.success('Invitation sent successfully', {
          description: `Invitation sent to ${response.invitation?.invitee_email}`,
        });

        // Show warnings if any
        if (response.warnings && response.warnings.length > 0) {
          response.warnings.forEach(warning => {
            toast.warning(warning);
          });
        }

        // Invalidate sent invitations
        queryClient.invalidateQueries({ queryKey: invitationKeys.sent() });
        queryClient.invalidateQueries({ queryKey: invitationKeys.stats() });
      } else {
        toast.error('Failed to send invitation', {
          description: response.error,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to send invitation', {
        description: error.message,
      });
    },
  });
}

/**
 * Accept an invitation
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AcceptInvitationRequest) => invitationService.acceptInvitation(request),
    onSuccess: (response) => {
      if (response.success) {
        toast.success('Invitation accepted!', {
          description: 'You have joined the hierarchy',
        });

        // Invalidate all relevant queries
        queryClient.invalidateQueries({ queryKey: invitationKeys.received() });
        queryClient.invalidateQueries({ queryKey: invitationKeys.stats() });
        queryClient.invalidateQueries({ queryKey: ['hierarchy'] }); // Invalidate hierarchy queries
        queryClient.invalidateQueries({ queryKey: ['downlines'] }); // Invalidate downlines queries
      } else {
        toast.error('Failed to accept invitation', {
          description: response.error,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to accept invitation', {
        description: error.message,
      });
    },
  });
}

/**
 * Deny an invitation
 */
export function useDenyInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DenyInvitationRequest) => invitationService.denyInvitation(request),
    onSuccess: (response) => {
      if (response.success) {
        toast.success('Invitation denied');

        // Invalidate received invitations
        queryClient.invalidateQueries({ queryKey: invitationKeys.received() });
        queryClient.invalidateQueries({ queryKey: invitationKeys.stats() });
      } else {
        toast.error('Failed to deny invitation', {
          description: response.error,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to deny invitation', {
        description: error.message,
      });
    },
  });
}

/**
 * Cancel an invitation (inviter side)
 */
export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CancelInvitationRequest) => invitationService.cancelInvitation(request),
    onSuccess: (response) => {
      if (response.success) {
        toast.success('Invitation cancelled');

        // Invalidate sent invitations
        queryClient.invalidateQueries({ queryKey: invitationKeys.sent() });
        queryClient.invalidateQueries({ queryKey: invitationKeys.stats() });
      } else {
        toast.error('Failed to cancel invitation', {
          description: response.error,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to cancel invitation', {
        description: error.message,
      });
    },
  });
}
