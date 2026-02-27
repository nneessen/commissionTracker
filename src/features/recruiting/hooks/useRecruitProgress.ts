// src/features/recruiting/hooks/useRecruitProgress.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { checklistService } from "@/services/recruiting/checklistService";
import type { UpdateChecklistItemStatusInput } from "@/types/recruiting.types";

// ========================================
// VALIDATION HELPER
// ========================================

/**
 * Validates that a string is a valid UUID format.
 * Prevents invalid IDs (like "invitation-{uuid}") from being used in database queries.
 */
const isValidUuid = (id: string | undefined): boolean => {
  if (!id) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// ========================================
// RECRUIT PHASE PROGRESS
// ========================================

export function useRecruitPhaseProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ["recruit-phase-progress", userId],
    queryFn: () => checklistService.getRecruitPhaseProgress(userId!),
    enabled: !!userId && isValidUuid(userId),
  });
}

export function useCurrentPhase(userId: string | undefined) {
  return useQuery({
    queryKey: ["recruit-current-phase", userId],
    queryFn: () => checklistService.getCurrentPhase(userId!),
    enabled: !!userId && isValidUuid(userId),
  });
}

export function useInitializeRecruitProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      templateId,
    }: {
      userId: string;
      templateId: string;
    }) => checklistService.initializeRecruitProgress(userId, templateId),
    onMutate: async (variables) => {
      // Cancel in-flight queries to prevent connection pool competition
      await queryClient.cancelQueries({
        queryKey: ["recruit-phase-progress", variables.userId],
      });
      await queryClient.cancelQueries({
        queryKey: ["recruit-current-phase", variables.userId],
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recruit-phase-progress", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recruit-current-phase", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recruits"],
      });
      queryClient.invalidateQueries({
        queryKey: ["recruits", variables.userId],
      });
    },
    onError: () => {
      toast.error("Failed to initialize pipeline");
    },
  });
}

export function useUpdatePhaseStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      phaseId,
      status,
      notes,
      blockedReason,
    }: {
      userId: string;
      phaseId: string;
      status:
        | "not_started"
        | "in_progress"
        | "completed"
        | "blocked"
        | "skipped"; // TODO: shouldn't this be using a type/interface?
      notes?: string;
      blockedReason?: string;
    }) =>
      checklistService.updatePhaseStatus(
        userId,
        phaseId,
        status,
        notes,
        blockedReason,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recruit-phase-progress", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recruit-current-phase", variables.userId],
      });
    },
    onError: () => {
      toast.error("Failed to update phase status");
    },
  });
}

export function useAdvancePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      currentPhaseId,
    }: {
      userId: string;
      currentPhaseId: string;
    }) => checklistService.advanceToNextPhase(userId, currentPhaseId),
    onMutate: async (variables) => {
      // Cancel in-flight queries to prevent connection pool competition
      await queryClient.cancelQueries({
        queryKey: ["recruit-phase-progress", variables.userId],
      });
      await queryClient.cancelQueries({
        queryKey: ["recruit-current-phase", variables.userId],
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recruit-phase-progress", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recruit-current-phase", variables.userId],
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "recruits",
      });
      queryClient.invalidateQueries({ queryKey: ["recruiting-stats"] });
    },
    onError: () => {
      toast.error("Failed to advance phase");
    },
  });
}

export function useBlockPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      phaseId,
      reason,
    }: {
      userId: string;
      phaseId: string;
      reason: string;
    }) => checklistService.blockPhase(userId, phaseId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recruit-phase-progress", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recruit-current-phase", variables.userId],
      });
    },
    onError: () => {
      toast.error("Failed to block phase");
    },
  });
}

export function useRevertPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, phaseId }: { userId: string; phaseId: string }) =>
      checklistService.revertPhase(userId, phaseId),
    onMutate: async (variables) => {
      // Cancel in-flight queries to prevent them from competing for connections
      // during the mutation. This was a contributing factor to the 2026-02-27 lockup.
      await queryClient.cancelQueries({
        queryKey: ["recruit-phase-progress", variables.userId],
      });
      await queryClient.cancelQueries({
        queryKey: ["recruit-current-phase", variables.userId],
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recruit-phase-progress", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recruit-current-phase", variables.userId],
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "recruits",
      });
      queryClient.invalidateQueries({ queryKey: ["recruiting-stats"] });
    },
    onError: () => {
      toast.error("Failed to revert phase");
    },
  });
}

// ========================================
// CHECKLIST ITEM PROGRESS
// ========================================
// TODO: clicking a checklist box is very slow. not sure why, but it takes like 2 to 3 seconds to finish

export function useChecklistProgress(
  userId: string | undefined,
  phaseId: string | undefined,
) {
  return useQuery({
    queryKey: ["recruit-checklist-progress", userId, phaseId],
    queryFn: () => checklistService.getChecklistProgress(userId!, phaseId!),
    enabled: !!userId && !!phaseId && isValidUuid(userId),
  });
}

export function useUpdateChecklistItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      itemId,
      statusData,
    }: {
      userId: string;
      itemId: string;
      statusData: UpdateChecklistItemStatusInput;
    }) =>
      checklistService.updateChecklistItemStatus(userId, itemId, statusData),
    onSuccess: (_, variables) => {
      // Invalidate checklist progress queries
      queryClient.invalidateQueries({
        queryKey: ["recruit-checklist-progress", variables.userId],
      });

      // Invalidate phase progress (auto-advancement might have occurred)
      queryClient.invalidateQueries({
        queryKey: ["recruit-phase-progress", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recruit-current-phase", variables.userId],
      });

      // Invalidate recruits list (phase might have changed)
      queryClient.invalidateQueries({ queryKey: ["recruits"] });

      // Invalidate appointment queries (scheduling items might have been completed)
      queryClient.invalidateQueries({ queryKey: ["recruit-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["recruiter-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["todays-appointments"] });
    },
  });
}

// ========================================
// DOCUMENT APPROVAL
// ========================================

export function useApproveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      approverId,
    }: {
      documentId: string;
      approverId: string;
    }) => checklistService.approveDocument(documentId, approverId),
    onSuccess: (data) => {
      // Invalidate document queries
      queryClient.invalidateQueries({
        queryKey: ["recruit-documents", data.userId],
      });

      // Invalidate checklist progress (linked item might have been approved)
      queryClient.invalidateQueries({
        queryKey: ["recruit-checklist-progress", data.userId],
      });

      // Invalidate phase progress (auto-advancement might have occurred)
      queryClient.invalidateQueries({
        queryKey: ["recruit-phase-progress", data.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recruit-current-phase", data.userId],
      });
    },
  });
}

export function useRejectDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      approverId,
      reason,
    }: {
      documentId: string;
      approverId: string;
      reason: string;
    }) => checklistService.rejectDocument(documentId, approverId, reason),
    onSuccess: (data) => {
      // Invalidate document queries
      queryClient.invalidateQueries({
        queryKey: ["recruit-documents", data.userId],
      });

      // Invalidate checklist progress (linked item status changed)
      queryClient.invalidateQueries({
        queryKey: ["recruit-checklist-progress", data.userId],
      });
    },
  });
}

// ========================================
// PIPELINE UNENROLLMENT
// ========================================

export function useUnenrollFromPipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      checklistService.unenrollFromPipeline(userId),
    onSuccess: (_, variables) => {
      // Invalidate all progress queries for this user
      queryClient.invalidateQueries({
        queryKey: ["recruit-phase-progress", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recruit-current-phase", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recruit-checklist-progress", variables.userId],
      });

      // Invalidate recruits list (status changed)
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "recruits",
      });
      queryClient.invalidateQueries({ queryKey: ["recruiting-stats"] });
    },
  });
}
