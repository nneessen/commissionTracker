// src/hooks/agency-request/useAgencyRequestQueries.ts
// TanStack Query hooks for Agency Request workflow

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agencyRequestService } from '@/services/agency-request';
import type { CreateAgencyRequestData } from '@/types/agency-request.types';
import { agencyKeys } from '../imo/useImoQueries';

// Query keys
export const agencyRequestKeys = {
  all: ['agency-requests'] as const,
  lists: () => [...agencyRequestKeys.all, 'list'] as const,
  my: () => [...agencyRequestKeys.all, 'my'] as const,
  pending: () => [...agencyRequestKeys.all, 'pending'] as const,
  pendingCount: () => [...agencyRequestKeys.all, 'pending-count'] as const,
  detail: (id: string) => [...agencyRequestKeys.all, 'detail', id] as const,
  canRequest: () => [...agencyRequestKeys.all, 'can-request'] as const,
};

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Check if current user can request agency status
 */
export function useCanRequestAgency() {
  return useQuery({
    queryKey: agencyRequestKeys.canRequest(),
    queryFn: () => agencyRequestService.canRequestAgency(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get current user's agency requests (all statuses)
 */
export function useMyAgencyRequests() {
  return useQuery({
    queryKey: agencyRequestKeys.my(),
    queryFn: () => agencyRequestService.getMyRequests(),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get a single agency request by ID
 */
export function useAgencyRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: agencyRequestKeys.detail(requestId!),
    queryFn: () => agencyRequestService.getRequest(requestId!),
    enabled: !!requestId,
    staleTime: 60 * 1000,
  });
}

/**
 * Get pending requests awaiting current user's approval
 */
export function usePendingAgencyRequests() {
  return useQuery({
    queryKey: agencyRequestKeys.pending(),
    queryFn: () => agencyRequestService.getPendingRequestsToApprove(),
    staleTime: 30 * 1000, // 30 seconds - check frequently for new requests
  });
}

/**
 * Get count of pending approval requests (for sidebar badge)
 */
export function usePendingAgencyRequestCount() {
  return useQuery({
    queryKey: agencyRequestKeys.pendingCount(),
    queryFn: () => agencyRequestService.getPendingApprovalCount(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Check if agency code is available
 */
export function useIsAgencyCodeAvailable(code: string, enabled = true) {
  return useQuery({
    queryKey: [...agencyRequestKeys.all, 'code-check', code],
    queryFn: () => agencyRequestService.isCodeAvailable(code),
    enabled: enabled && code.length >= 2,
    staleTime: 10 * 1000, // 10 seconds
  });
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new agency request
 */
export function useCreateAgencyRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAgencyRequestData) =>
      agencyRequestService.createRequest(data),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: agencyRequestKeys.my() });
      queryClient.invalidateQueries({ queryKey: agencyRequestKeys.canRequest() });
    },
  });
}

/**
 * Cancel a pending agency request
 */
export function useCancelAgencyRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      agencyRequestService.cancelRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyRequestKeys.my() });
      queryClient.invalidateQueries({ queryKey: agencyRequestKeys.canRequest() });
    },
  });
}

/**
 * Approve an agency request
 */
export function useApproveAgencyRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      agencyRequestService.approveRequest(requestId),
    onSuccess: () => {
      // Invalidate many queries since approval creates an agency and moves agents
      queryClient.invalidateQueries({ queryKey: agencyRequestKeys.pending() });
      queryClient.invalidateQueries({ queryKey: agencyRequestKeys.pendingCount() });
      queryClient.invalidateQueries({ queryKey: agencyKeys.all });
      queryClient.invalidateQueries({ queryKey: ['user-profiles'] });
    },
  });
}

/**
 * Reject an agency request
 */
export function useRejectAgencyRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) =>
      agencyRequestService.rejectRequest(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agencyRequestKeys.pending() });
      queryClient.invalidateQueries({ queryKey: agencyRequestKeys.pendingCount() });
    },
  });
}
