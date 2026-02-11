// src/features/training-modules/hooks/useTrainingGamification.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainingGamificationService } from "../services/trainingGamificationService";
import type { CreateBadgeInput } from "../types/training-module.types";
import { useAuth } from "@/contexts/AuthContext";
import { useImo } from "@/contexts/ImoContext";
import { toast } from "sonner";

export const gamificationKeys = {
  all: ["training-gamification"] as const,
  stats: (userId: string) =>
    [...gamificationKeys.all, "stats", userId] as const,
  xpHistory: (userId: string) =>
    [...gamificationKeys.all, "xp", userId] as const,
  badges: (imoId: string) =>
    [...gamificationKeys.all, "badges", imoId] as const,
  userBadges: (userId: string) =>
    [...gamificationKeys.all, "user-badges", userId] as const,
  leaderboard: (agencyId: string, period: string) =>
    [...gamificationKeys.all, "leaderboard", agencyId, period] as const,
  skillRadar: (userId?: string) =>
    [...gamificationKeys.all, "radar", userId] as const,
  certifications: (imoId: string) =>
    [...gamificationKeys.all, "certs", imoId] as const,
  userCerts: (userId: string) =>
    [...gamificationKeys.all, "user-certs", userId] as const,
  challenges: (agencyId?: string) =>
    [...gamificationKeys.all, "challenges", agencyId] as const,
};

export function useTrainingUserStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: gamificationKeys.stats(user?.id || ""),
    queryFn: () => trainingGamificationService.getUserStats(user!.id!),
    enabled: !!user?.id,
    staleTime: 1000 * 60,
  });
}

export function useXpHistory(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: gamificationKeys.xpHistory(user?.id || ""),
    queryFn: () => trainingGamificationService.getXpHistory(user!.id!, limit),
    enabled: !!user?.id,
  });
}

export function useTrainingBadges(includeInactive = false) {
  const { imo } = useImo();

  return useQuery({
    queryKey: [...gamificationKeys.badges(imo?.id || ""), includeInactive] as const,
    queryFn: () => trainingGamificationService.listBadges(imo!.id, includeInactive),
    enabled: !!imo?.id,
  });
}

export function useUserBadges(userId?: string) {
  const { user } = useAuth();
  const uid = userId || user?.id;

  return useQuery({
    queryKey: gamificationKeys.userBadges(uid || ""),
    queryFn: () => trainingGamificationService.getUserBadges(uid!),
    enabled: !!uid,
  });
}

export function useTrainingLeaderboard(
  agencyId: string | undefined,
  period = "all_time",
) {
  return useQuery({
    queryKey: gamificationKeys.leaderboard(agencyId!, period),
    queryFn: () =>
      trainingGamificationService.getLeaderboard(agencyId!, period),
    enabled: !!agencyId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useSkillRadarData(userId?: string) {
  return useQuery({
    queryKey: gamificationKeys.skillRadar(userId),
    queryFn: () => trainingGamificationService.getSkillRadarData(userId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTrainingCertifications() {
  const { imo } = useImo();

  return useQuery({
    queryKey: gamificationKeys.certifications(imo?.id || ""),
    queryFn: () => trainingGamificationService.listCertifications(imo!.id),
    enabled: !!imo?.id,
  });
}

export function useUserCertifications(userId?: string) {
  const { user } = useAuth();
  const uid = userId || user?.id;

  return useQuery({
    queryKey: gamificationKeys.userCerts(uid || ""),
    queryFn: () => trainingGamificationService.getUserCertifications(uid!),
    enabled: !!uid,
  });
}

export function useTrainingChallenges(agencyId?: string) {
  return useQuery({
    queryKey: gamificationKeys.challenges(agencyId),
    queryFn: () => trainingGamificationService.listChallenges(agencyId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useJoinChallenge() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { imo, agency } = useImo();

  return useMutation({
    mutationFn: (challengeId: string) => {
      if (!user?.id || !imo?.id || !agency?.id)
        throw new Error("Not authenticated");
      return trainingGamificationService.joinChallenge(
        challengeId,
        user.id,
        imo.id,
        agency.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.challenges(),
      });
      toast.success("Joined challenge!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateBadge() {
  const queryClient = useQueryClient();
  const { imo } = useImo();

  return useMutation({
    mutationFn: (input: CreateBadgeInput) =>
      trainingGamificationService.createBadge(input, imo!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.badges(imo?.id || ""),
      });
      toast.success("Badge created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateBadge() {
  const queryClient = useQueryClient();
  const { imo } = useImo();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateBadgeInput> }) =>
      trainingGamificationService.updateBadge(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.badges(imo?.id || ""),
      });
      toast.success("Badge updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteBadge() {
  const queryClient = useQueryClient();
  const { imo } = useImo();

  return useMutation({
    mutationFn: (id: string) =>
      trainingGamificationService.deleteBadge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.badges(imo?.id || ""),
      });
      toast.success("Badge deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
