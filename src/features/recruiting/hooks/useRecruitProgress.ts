// src/features/recruiting/hooks/useRecruitProgress.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { checklistService } from "@/services/recruiting/checklistService";
import type { UpdateChecklistItemStatusInput } from "@/types/recruiting.types";

// ========================================
// RECRUIT PHASE PROGRESS
// ========================================

export function useRecruitPhaseProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ["recruit-phase-progress", userId],
    queryFn: () => checklistService.getRecruitPhaseProgress(userId!),
    enabled: !!userId,
  });
}

export function useCurrentPhase(userId: string | undefined) {
  return useQuery({
    queryKey: ["recruit-current-phase", userId],
    queryFn: () => checklistService.getCurrentPhase(userId!),
    enabled: !!userId,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recruit-phase-progress", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recruit-current-phase", variables.userId],
      });
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recruit-phase-progress", variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recruit-current-phase", variables.userId],
      });
      // Invalidate all recruits queries (the key starts with 'recruits')
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "recruits",
      });
      queryClient.invalidateQueries({ queryKey: ["recruiting-stats"] });
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
    enabled: !!userId && !!phaseId,
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
