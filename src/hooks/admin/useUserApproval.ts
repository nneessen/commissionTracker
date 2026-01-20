// /home/nneessen/projects/commissionTracker/src/hooks/admin/useUserApproval.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateHierarchyForNode } from "../hierarchy/invalidation";
import { userApprovalService } from "@/services/users/userService";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Query keys for user approval
 */
export const userApprovalKeys = {
  all: ["userApproval"] as const,
  currentProfile: () => [...userApprovalKeys.all, "currentProfile"] as const,
  profile: (userId: string) =>
    [...userApprovalKeys.all, "profile", userId] as const,
  allUsers: () => [...userApprovalKeys.all, "allUsers"] as const,
  pendingUsers: () => [...userApprovalKeys.all, "pendingUsers"] as const,
  stats: () => [...userApprovalKeys.all, "stats"] as const,
  isAdmin: () => [...userApprovalKeys.all, "isAdmin"] as const,
};

/**
 * Hook to get current user's profile and approval status
 * CRITICAL: Query key MUST include user.id to prevent cache collisions
 */
export function useCurrentUserProfile() {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    // Include user.id in key - when it changes, TanStack Query fetches fresh data
    queryKey: [...userApprovalKeys.currentProfile(), user?.id],
    queryFn: () => userApprovalService.getCurrentUserProfile(),
    enabled: !authLoading && !!user?.id,
    staleTime: 1000 * 60 * 5,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

/**
 * Hook to get a specific user's profile (admin only)
 */
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: userApprovalKeys.profile(userId),
    queryFn: () => userApprovalService.getUserProfile(userId),
    enabled: !!userId,
  });
}

/**
 * Hook to get all users (admin only)
 */
export function useAllUsers() {
  return useQuery({
    queryKey: userApprovalKeys.allUsers(),
    queryFn: () => userApprovalService.getAllUsers(),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get pending users (admin only)
 */
export function usePendingUsers() {
  return useQuery({
    queryKey: userApprovalKeys.pendingUsers(),
    queryFn: () => userApprovalService.getPendingUsers(),
    staleTime: 1000 * 30, // 30 seconds - poll more frequently for pending users
    refetchInterval: 1000 * 60, // Auto-refetch every minute
  });
}

/**
 * Hook to get approval statistics (admin only)
 */
export function useApprovalStats() {
  return useQuery({
    queryKey: userApprovalKeys.stats(),
    queryFn: () => userApprovalService.getApprovalStats(),
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to check if current user is admin
 */
export function useIsAdmin() {
  return useQuery({
    queryKey: userApprovalKeys.isAdmin(),
    queryFn: () => userApprovalService.isCurrentUserAdmin(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to approve a user (admin only)
 */
export function useApproveUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userApprovalService.approveUser(userId),
    onSuccess: (_data, _userId) => {
      // Invalidate and refetch all user-related queries
      queryClient.invalidateQueries({ queryKey: userApprovalKeys.allUsers() });
      queryClient.invalidateQueries({
        queryKey: userApprovalKeys.pendingUsers(),
      });
      queryClient.invalidateQueries({ queryKey: userApprovalKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ["users-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["users-metrics"] });
    },
  });
}

/**
 * Hook to deny a user (admin only)
 */
export function useDenyUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      userApprovalService.denyUser(userId, reason),
    onSuccess: () => {
      // Invalidate and refetch all user-related queries
      queryClient.invalidateQueries({ queryKey: userApprovalKeys.allUsers() });
      queryClient.invalidateQueries({
        queryKey: userApprovalKeys.pendingUsers(),
      });
      queryClient.invalidateQueries({ queryKey: userApprovalKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ["users-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["users-metrics"] });
    },
  });
}

/**
 * Hook to set a user back to pending status (admin only)
 */
export function useSetPendingUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userApprovalService.setPendingUser(userId),
    onSuccess: () => {
      // Invalidate and refetch all user-related queries
      queryClient.invalidateQueries({ queryKey: userApprovalKeys.allUsers() });
      queryClient.invalidateQueries({
        queryKey: userApprovalKeys.pendingUsers(),
      });
      queryClient.invalidateQueries({ queryKey: userApprovalKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ["users-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["users-metrics"] });
    },
  });
}

/**
 * Hook to get current user's approval status
 * Returns: 'pending' | 'approved' | 'denied' | null
 */
export function useApprovalStatus() {
  return useQuery({
    queryKey: [...userApprovalKeys.currentProfile(), "status"],
    queryFn: () => userApprovalService.getCurrentUserStatus(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to set admin role for a user (admin only)
 */
export function useSetAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
      userApprovalService.setAdminRole(userId, isAdmin),
    onSuccess: () => {
      // Invalidate and refetch all user-related queries
      queryClient.invalidateQueries({ queryKey: userApprovalKeys.allUsers() });
      queryClient.invalidateQueries({
        queryKey: userApprovalKeys.pendingUsers(),
      });
      queryClient.invalidateQueries({ queryKey: userApprovalKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ["users-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["users-metrics"] });
    },
  });
}

/**
 * Combined hook for auth guard - gets both admin status and approval status
 * CRITICAL: Must include auth loading state, not just query loading state
 */
export function useAuthorizationStatus() {
  const { user, loading: authLoading } = useAuth();
  const {
    data: profile,
    isLoading: profileLoading,
    isFetching,
    isPending,
  } = useCurrentUserProfile();

  // Loading if: auth loading, profile loading, fetching, no cached data, OR user exists but profile missing
  const isLoading =
    authLoading ||
    profileLoading ||
    isFetching ||
    isPending ||
    (!!user && !profile);

  return {
    isAdmin: profile?.is_admin === true,
    isSuperAdmin: profile?.is_super_admin === true,
    isApproved:
      profile?.approval_status === "approved" || profile?.is_admin === true,
    isPending: profile?.approval_status === "pending",
    isDenied: profile?.approval_status === "denied",
    denialReason: profile?.denial_reason,
    isLoading,
    profile,
  };
}

/**
 * Hook to update a user's contract level (admin only)
 */
export function useUpdateContractLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      contractLevel,
    }: {
      userId: string;
      contractLevel: number | null;
    }) => userApprovalService.updateContractLevel(userId, contractLevel),
    onSuccess: () => {
      // Invalidate and refetch all user-related queries
      queryClient.invalidateQueries({ queryKey: userApprovalKeys.allUsers() });
      queryClient.invalidateQueries({
        queryKey: userApprovalKeys.pendingUsers(),
      });
      queryClient.invalidateQueries({ queryKey: userApprovalKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ["users-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["users-metrics"] });
    },
  });
}

/**
 * Hook to delete a user (admin only)
 * CRITICAL: Properly invalidates all related queries to update UI after deletion
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userApprovalService.delete(userId),
    onSuccess: () => {
      // Invalidate ALL user-related queries
      queryClient.invalidateQueries({ queryKey: userApprovalKeys.all });
      queryClient.invalidateQueries({ queryKey: userApprovalKeys.allUsers() });
      queryClient.invalidateQueries({
        queryKey: userApprovalKeys.pendingUsers(),
      });
      queryClient.invalidateQueries({ queryKey: userApprovalKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ["users-paginated"] });
      queryClient.invalidateQueries({ queryKey: ["users-metrics"] });

      // CRITICAL: Invalidate hierarchy/team queries so deleted user disappears from lists
      invalidateHierarchyForNode(queryClient, userId);
    },
  });
}
