// src/hooks/signatures/useSignatureSubmissions.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signatureSubmissionService } from "@/services/signatures";
import type {
  CreateSignatureSubmissionInput,
  UpdateSignatureSubmissionInput,
  SubmissionStatus,
  SignerRole,
} from "@/types/signature.types";
import { logger } from "@/services/base/logger";

interface SubmitterInput {
  userId?: string;
  role: SignerRole;
  email: string;
  name?: string;
  signingOrder?: number;
}

interface CreateSubmissionWithSubmittersInput extends CreateSignatureSubmissionInput {
  submitters: SubmitterInput[];
}

// Query keys for React Query cache management
export const signatureSubmissionQueryKeys = {
  all: ["signatureSubmissions"] as const,
  lists: () => [...signatureSubmissionQueryKeys.all, "list"] as const,
  listByTargetUser: (userId: string) =>
    [...signatureSubmissionQueryKeys.lists(), "user", userId] as const,
  listPendingByUser: (userId: string) =>
    [...signatureSubmissionQueryKeys.lists(), "pending", userId] as const,
  listByChecklist: (checklistProgressId: string) =>
    [
      ...signatureSubmissionQueryKeys.lists(),
      "checklist",
      checklistProgressId,
    ] as const,
  detail: (id: string) =>
    [...signatureSubmissionQueryKeys.all, "detail", id] as const,
  detailWithSubmitters: (id: string) =>
    [...signatureSubmissionQueryKeys.all, "detail", id, "full"] as const,
};

/**
 * Hook to fetch a submission by ID with details
 */
export function useSignatureSubmission(
  submissionId: string | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) {
  const { enabled = true, staleTime = 30 * 1000 } = options || {};

  return useQuery({
    queryKey: signatureSubmissionQueryKeys.detailWithSubmitters(
      submissionId || "",
    ),
    queryFn: async () => {
      if (!submissionId) throw new Error("Submission ID is required");
      const result =
        await signatureSubmissionService.getWithDetails(submissionId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(
        result.error?.message || "Failed to fetch signature submission",
      );
    },
    enabled: enabled && !!submissionId,
    staleTime,
  });
}

/**
 * Hook to fetch submissions by target user
 */
export function useUserSignatureSubmissions(
  userId: string | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) {
  const { enabled = true, staleTime = 60 * 1000 } = options || {};

  return useQuery({
    queryKey: signatureSubmissionQueryKeys.listByTargetUser(userId || ""),
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const result = await signatureSubmissionService.getByTargetUserId(userId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(
        result.error?.message || "Failed to fetch user's signature submissions",
      );
    },
    enabled: enabled && !!userId,
    staleTime,
  });
}

/**
 * Hook to fetch pending submissions for a user
 */
export function usePendingSignatureSubmissions(
  userId: string | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number | false;
  },
) {
  const {
    enabled = true,
    staleTime = 30 * 1000,
    refetchInterval = false,
  } = options || {};

  return useQuery({
    queryKey: signatureSubmissionQueryKeys.listPendingByUser(userId || ""),
    queryFn: async () => {
      if (!userId) throw new Error("User ID is required");
      const result = await signatureSubmissionService.getPendingForUser(userId);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(
        result.error?.message || "Failed to fetch pending submissions",
      );
    },
    enabled: enabled && !!userId,
    staleTime,
    refetchInterval,
  });
}

/**
 * Hook to fetch submission by checklist progress ID
 */
export function useSubmissionByChecklistProgress(
  checklistProgressId: string | undefined,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) {
  const { enabled = true, staleTime = 30 * 1000 } = options || {};

  return useQuery({
    queryKey: signatureSubmissionQueryKeys.listByChecklist(
      checklistProgressId || "",
    ),
    queryFn: async () => {
      if (!checklistProgressId)
        throw new Error("Checklist progress ID is required");
      const result =
        await signatureSubmissionService.getByChecklistProgressId(
          checklistProgressId,
        );
      if (result.success && result.data) {
        return result.data;
      }
      // Return null if not found (not an error)
      return null;
    },
    enabled: enabled && !!checklistProgressId,
    staleTime,
  });
}

/**
 * Hook to create a submission with submitters
 */
export function useCreateSignatureSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSubmissionWithSubmittersInput) => {
      const result =
        await signatureSubmissionService.createWithSubmitters(data);
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(
        result.error?.message || "Failed to create signature submission",
      );
    },
    onSuccess: (newSubmission) => {
      // Invalidate relevant queries
      if (newSubmission.targetUserId) {
        queryClient.invalidateQueries({
          queryKey: signatureSubmissionQueryKeys.listByTargetUser(
            newSubmission.targetUserId,
          ),
        });
        queryClient.invalidateQueries({
          queryKey: signatureSubmissionQueryKeys.listPendingByUser(
            newSubmission.targetUserId,
          ),
        });
      }
      if (newSubmission.checklistProgressId) {
        queryClient.invalidateQueries({
          queryKey: signatureSubmissionQueryKeys.listByChecklist(
            newSubmission.checklistProgressId,
          ),
        });
      }
      // Add to cache
      queryClient.setQueryData(
        signatureSubmissionQueryKeys.detailWithSubmitters(newSubmission.id),
        newSubmission,
      );
    },
    onError: (error) => {
      logger.error(
        "Error creating signature submission",
        error instanceof Error ? error : new Error(String(error)),
        "useSignatureSubmissions",
      );
    },
  });
}

/**
 * Hook to update submission status
 */
export function useUpdateSubmissionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      additionalUpdates,
    }: {
      id: string;
      status: SubmissionStatus;
      additionalUpdates?: Partial<UpdateSignatureSubmissionInput>;
    }) => {
      const result = await signatureSubmissionService.updateStatus(
        id,
        status,
        additionalUpdates,
      );
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(
        result.error?.message || "Failed to update submission status",
      );
    },
    onSuccess: (updatedSubmission) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({
        queryKey: signatureSubmissionQueryKeys.detail(updatedSubmission.id),
      });
      if (updatedSubmission.targetUserId) {
        queryClient.invalidateQueries({
          queryKey: signatureSubmissionQueryKeys.listByTargetUser(
            updatedSubmission.targetUserId,
          ),
        });
        queryClient.invalidateQueries({
          queryKey: signatureSubmissionQueryKeys.listPendingByUser(
            updatedSubmission.targetUserId,
          ),
        });
      }
      if (updatedSubmission.checklistProgressId) {
        queryClient.invalidateQueries({
          queryKey: signatureSubmissionQueryKeys.listByChecklist(
            updatedSubmission.checklistProgressId,
          ),
        });
      }
    },
    onError: (error) => {
      logger.error(
        "Error updating submission status",
        error instanceof Error ? error : new Error(String(error)),
        "useSignatureSubmissions",
      );
    },
  });
}

/**
 * Hook to void a submission
 */
export function useVoidSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      voidedBy,
      reason,
    }: {
      id: string;
      voidedBy: string;
      reason?: string;
    }) => {
      const result = await signatureSubmissionService.voidSubmission(
        id,
        voidedBy,
        reason,
      );
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.error?.message || "Failed to void submission");
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({
        queryKey: signatureSubmissionQueryKeys.all,
      });
    },
    onError: (error) => {
      logger.error(
        "Error voiding submission",
        error instanceof Error ? error : new Error(String(error)),
        "useSignatureSubmissions",
      );
    },
  });
}
