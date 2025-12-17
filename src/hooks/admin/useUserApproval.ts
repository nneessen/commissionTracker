// /home/nneessen/projects/commissionTracker/src/hooks/admin/useUserApproval.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApprovalService } from "@/services/users/userService";

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
 */
export function useCurrentUserProfile() {
  return useQuery({
    queryKey: userApprovalKeys.currentProfile(),
    queryFn: () => userApprovalService.getCurrentUserProfile(),
    staleTime: 1000 * 60 * 5, // 5 minutes
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
 */
export function useAuthorizationStatus() {
  const { data: profile, isLoading: profileLoading } = useCurrentUserProfile();

  return {
    isAdmin: profile?.is_admin === true,
    isApproved:
      profile?.approval_status === "approved" || profile?.is_admin === true,
    isPending: profile?.approval_status === "pending",
    isDenied: profile?.approval_status === "denied",
    denialReason: profile?.denial_reason,
    isLoading: profileLoading,
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
