import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { joinRequestService } from '../../services/join-request';
import type {
  CreateJoinRequestInput,
  ApproveJoinRequestInput,
  RejectJoinRequestInput,
} from '../../types/join-request.types';

// Query keys
export const joinRequestKeys = {
  all: ['join-requests'] as const,
  eligibility: () => [...joinRequestKeys.all, 'eligibility'] as const,
  myRequests: () => [...joinRequestKeys.all, 'my-requests'] as const,
  myPending: () => [...joinRequestKeys.all, 'my-pending'] as const,
  pendingApprovals: () => [...joinRequestKeys.all, 'pending-approvals'] as const,
  pendingCount: () => [...joinRequestKeys.all, 'pending-count'] as const,
  availableImos: () => [...joinRequestKeys.all, 'available-imos'] as const,
  agenciesForImo: (imoId: string) =>
    [...joinRequestKeys.all, 'agencies', imoId] as const,
  detail: (id: string) => [...joinRequestKeys.all, 'detail', id] as const,
};

/**
 * Check if current user can submit a join request
 */
export function useJoinRequestEligibility() {
  return useQuery({
    queryKey: joinRequestKeys.eligibility(),
    queryFn: () => joinRequestService.checkEligibility(),
  });
}

/**
 * Get available IMOs for join request form
 */
export function useAvailableImos() {
  return useQuery({
    queryKey: joinRequestKeys.availableImos(),
    queryFn: () => joinRequestService.getAvailableImos(),
  });
}

/**
 * Get agencies for a specific IMO
 */
export function useAgenciesForImo(imoId: string | null) {
  return useQuery({
    queryKey: joinRequestKeys.agenciesForImo(imoId ?? ''),
    queryFn: () => joinRequestService.getAgenciesForImo(imoId!),
    enabled: !!imoId,
  });
}

/**
 * Get current user's join requests
 */
export function useMyJoinRequests() {
  return useQuery({
    queryKey: joinRequestKeys.myRequests(),
    queryFn: () => joinRequestService.getMyRequests(),
  });
}

/**
 * Get current user's pending join request
 */
export function useMyPendingJoinRequest() {
  return useQuery({
    queryKey: joinRequestKeys.myPending(),
    queryFn: () => joinRequestService.getMyPendingRequest(),
  });
}

/**
 * Get pending join requests for current user to approve
 */
export function usePendingJoinApprovals() {
  return useQuery({
    queryKey: joinRequestKeys.pendingApprovals(),
    queryFn: () => joinRequestService.getPendingApprovals(),
  });
}

/**
 * Get count of pending join approvals
 */
export function usePendingJoinApprovalCount() {
  return useQuery({
    queryKey: joinRequestKeys.pendingCount(),
    queryFn: () => joinRequestService.getPendingApprovalCount(),
  });
}

/**
 * Get a single join request by ID
 */
export function useJoinRequest(requestId: string | null) {
  return useQuery({
    queryKey: joinRequestKeys.detail(requestId ?? ''),
    queryFn: () => joinRequestService.getRequest(requestId!),
    enabled: !!requestId,
  });
}

/**
 * Create a new join request
 */
export function useCreateJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateJoinRequestInput) =>
      joinRequestService.createRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: joinRequestKeys.all });
    },
  });
}

/**
 * Cancel a pending join request
 */
export function useCancelJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      joinRequestService.cancelMyRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: joinRequestKeys.all });
    },
  });
}

/**
 * Approve a join request
 */
export function useApproveJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApproveJoinRequestInput) =>
      joinRequestService.approveRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: joinRequestKeys.all });
    },
  });
}

/**
 * Reject a join request
 */
export function useRejectJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RejectJoinRequestInput) =>
      joinRequestService.rejectRequest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: joinRequestKeys.all });
    },
  });
}
