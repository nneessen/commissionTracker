// src/hooks/subscription/useTeamUWWizardSeats.ts
// TanStack Query hooks for team UW Wizard seat management

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  subscriptionService,
  type TeamUWWizardSeat,
  type EligibleDownlineAgent,
} from "@/services/subscription";
import { uwWizardUsageKeys } from "@/features/underwriting";

export const teamSeatKeys = {
  all: ["team-uw-wizard-seats"] as const,
  seats: (ownerId: string) => [...teamSeatKeys.all, "seats", ownerId] as const,
  limit: (ownerId: string) => [...teamSeatKeys.all, "limit", ownerId] as const,
  eligible: (ownerId: string) =>
    [...teamSeatKeys.all, "eligible", ownerId] as const,
};

/**
 * Fetch all team UW wizard seats for an owner
 */
export function useTeamUWWizardSeats(ownerId: string | undefined) {
  return useQuery<TeamUWWizardSeat[], Error>({
    queryKey: teamSeatKeys.seats(ownerId || ""),
    queryFn: () => {
      if (!ownerId) return [];
      return subscriptionService.getTeamUWWizardSeats(ownerId);
    },
    enabled: !!ownerId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch the seat limit for a team owner
 */
export function useTeamSeatLimit(ownerId: string | undefined) {
  return useQuery<number, Error>({
    queryKey: teamSeatKeys.limit(ownerId || ""),
    queryFn: () => {
      if (!ownerId) return 5;
      return subscriptionService.getTeamSeatLimit(ownerId);
    },
    enabled: !!ownerId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch eligible downline agents for seat assignment
 */
export function useEligibleDownlines(ownerId: string | undefined) {
  return useQuery<EligibleDownlineAgent[], Error>({
    queryKey: teamSeatKeys.eligible(ownerId || ""),
    queryFn: () => {
      if (!ownerId) return [];
      return subscriptionService.getEligibleDownlines(ownerId);
    },
    enabled: !!ownerId,
    staleTime: 30 * 1000,
  });
}

/**
 * Mutation to grant a team UW wizard seat to an agent
 */
export function useGrantTeamUWSeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ownerId, agentId }: { ownerId: string; agentId: string }) =>
      subscriptionService.grantTeamUWSeat(ownerId, agentId),
    onSuccess: (result, { ownerId }) => {
      if (result.success) {
        toast.success("Agent seat assigned successfully.");
        queryClient.invalidateQueries({
          queryKey: teamSeatKeys.seats(ownerId),
        });
        queryClient.invalidateQueries({
          queryKey: teamSeatKeys.eligible(ownerId),
        });
        queryClient.invalidateQueries({
          queryKey: uwWizardUsageKeys.all,
        });
      } else {
        toast.error(result.error || "Failed to assign seat.");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign seat.");
    },
  });
}

/**
 * Mutation to revoke a team UW wizard seat from an agent
 */
export function useRevokeTeamUWSeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ownerId, agentId }: { ownerId: string; agentId: string }) =>
      subscriptionService.revokeTeamUWSeat(ownerId, agentId),
    onSuccess: (result, { ownerId }) => {
      if (result.success) {
        toast.success("Agent seat removed.");
        queryClient.invalidateQueries({
          queryKey: teamSeatKeys.seats(ownerId),
        });
        queryClient.invalidateQueries({
          queryKey: teamSeatKeys.eligible(ownerId),
        });
        queryClient.invalidateQueries({
          queryKey: uwWizardUsageKeys.all,
        });
      } else {
        toast.error(result.error || "Failed to remove seat.");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove seat.");
    },
  });
}
