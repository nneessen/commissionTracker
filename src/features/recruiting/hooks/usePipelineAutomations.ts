// src/features/recruiting/hooks/usePipelineAutomations.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pipelineAutomationService } from "@/services/recruiting/pipelineAutomationService";
import type {
  CreateAutomationInput,
  UpdateAutomationInput,
} from "@/types/recruiting.types";

// ========================================
// PHASE AUTOMATIONS
// ========================================

export function usePhaseAutomations(phaseId: string | undefined) {
  return useQuery({
    queryKey: ["pipeline-automations", "phase", phaseId],
    queryFn: () => pipelineAutomationService.getByPhaseId(phaseId!),
    enabled: !!phaseId,
  });
}

// ========================================
// CHECKLIST ITEM AUTOMATIONS
// ========================================

export function useChecklistItemAutomations(itemId: string | undefined) {
  return useQuery({
    queryKey: ["pipeline-automations", "item", itemId],
    queryFn: () => pipelineAutomationService.getByChecklistItemId(itemId!),
    enabled: !!itemId,
  });
}

// ========================================
// SYSTEM AUTOMATIONS (password reminders, etc.)
// ========================================

export function useSystemAutomations() {
  return useQuery({
    queryKey: ["pipeline-automations", "system"],
    queryFn: () => pipelineAutomationService.getSystemAutomations(),
  });
}

// ========================================
// SINGLE AUTOMATION
// ========================================

export function useAutomation(automationId: string | undefined) {
  return useQuery({
    queryKey: ["pipeline-automation", automationId],
    queryFn: () => pipelineAutomationService.getById(automationId!),
    enabled: !!automationId,
  });
}

// ========================================
// CREATE AUTOMATION
// ========================================

export function useCreateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAutomationInput) =>
      pipelineAutomationService.create(data),
    onSuccess: (data) => {
      // Invalidate relevant queries based on target type
      if (data.phase_id) {
        queryClient.invalidateQueries({
          queryKey: ["pipeline-automations", "phase", data.phase_id],
        });
      } else if (data.checklist_item_id) {
        queryClient.invalidateQueries({
          queryKey: ["pipeline-automations", "item", data.checklist_item_id],
        });
      } else {
        // System-level automation (no phase or item)
        queryClient.invalidateQueries({
          queryKey: ["pipeline-automations", "system"],
        });
      }
    },
  });
}

// ========================================
// UPDATE AUTOMATION
// ========================================

export function useUpdateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateAutomationInput;
    }) => pipelineAutomationService.update(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["pipeline-automation", data.id],
      });
      if (data.phase_id) {
        queryClient.invalidateQueries({
          queryKey: ["pipeline-automations", "phase", data.phase_id],
        });
      } else if (data.checklist_item_id) {
        queryClient.invalidateQueries({
          queryKey: ["pipeline-automations", "item", data.checklist_item_id],
        });
      } else {
        // System-level automation - invalidate system cache
        queryClient.invalidateQueries({
          queryKey: ["pipeline-automations", "system"],
        });
      }
    },
  });
}

// ========================================
// DELETE AUTOMATION
// ========================================

export function useDeleteAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      id: string;
      phaseId?: string;
      itemId?: string;
      isSystem?: boolean;
    }) => pipelineAutomationService.delete(variables.id),
    onSuccess: (_data, variables) => {
      if (variables.phaseId) {
        queryClient.invalidateQueries({
          queryKey: ["pipeline-automations", "phase", variables.phaseId],
        });
      } else if (variables.itemId) {
        queryClient.invalidateQueries({
          queryKey: ["pipeline-automations", "item", variables.itemId],
        });
      } else if (variables.isSystem) {
        queryClient.invalidateQueries({
          queryKey: ["pipeline-automations", "system"],
        });
      }
    },
  });
}

// ========================================
// AUTOMATION LOGS
// ========================================

export function useAutomationLogs(recruitId: string | undefined) {
  return useQuery({
    queryKey: ["pipeline-automation-logs", "recruit", recruitId],
    queryFn: () => pipelineAutomationService.getLogsForRecruit(recruitId!),
    enabled: !!recruitId,
  });
}

export function useAutomationLogsByAutomation(
  automationId: string | undefined,
) {
  return useQuery({
    queryKey: ["pipeline-automation-logs", "automation", automationId],
    queryFn: () =>
      pipelineAutomationService.getLogsForAutomation(automationId!),
    enabled: !!automationId,
  });
}
