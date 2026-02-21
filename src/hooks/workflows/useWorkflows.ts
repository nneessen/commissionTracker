// File: /home/nneessen/projects/commissionTracker/src/hooks/workflows/useWorkflows.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { workflowService } from "@/services/workflowService";
import type {
  WorkflowFormData,
  WorkflowStatus,
  TriggerEventType,
  Workflow,
} from "@/types/workflow.types";

// =====================================================
// QUERY KEYS
// =====================================================

const QUERY_KEYS = {
  workflows: (status?: WorkflowStatus) => ["workflows", status] as const,
  workflow: (id: string) => ["workflow", id] as const,
  workflowRuns: (workflowId?: string) => ["workflow-runs", workflowId] as const,
  workflowRun: (id: string) => ["workflow-run", id] as const,
  workflowTemplates: (category?: string) =>
    ["workflow-templates", category] as const,
  imoWorkflowTemplates: ["imo-workflow-templates"] as const,
  triggerEventTypes: ["trigger-event-types"] as const,
  eventTypes: ["event-types"] as const,
  workflowStats: (workflowId: string) =>
    ["workflow-stats", workflowId] as const,
};

// =====================================================
// WORKFLOWS
// =====================================================

export function useWorkflows(status?: WorkflowStatus) {
  return useQuery({
    queryKey: QUERY_KEYS.workflows(status),
    queryFn: () => workflowService.getWorkflows(status),
    staleTime: 30000, // 30 seconds
    retry: 1, // Reduce retries for 404 errors
    retryDelay: 1000,
    // DO NOT mask errors - we need to see what's failing
    // initialData: []
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.workflow(id),
    queryFn: () => workflowService.getWorkflow(id),
    enabled: !!id,
    retry: 1,
    retryDelay: 1000,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: WorkflowFormData) =>
      workflowService.createWorkflow(formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success(`Workflow "${data.name}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create workflow: ${error.message}`);
    },
  });
}

export function useUpdateWorkflow(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<WorkflowFormData>) =>
      workflowService.updateWorkflow(id, updates),
    onSuccess: (data) => {
      // CRITICAL: Update the cache directly with the new data
      queryClient.setQueryData(QUERY_KEYS.workflow(id), data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Query cache type
      queryClient.setQueryData(["workflows"], (old: any) => {
        if (!old) return [data];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Query cache type
        return old.map((w: any) => (w.id === id ? data : w));
      });

      // Also invalidate to ensure fresh data on next fetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workflow(id) });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });

      toast.success(`Workflow "${data.name}" updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update workflow: ${error.message}`);
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workflowService.deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete workflow: ${error.message}`);
    },
  });
}

export function useUpdateWorkflowStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkflowStatus }) =>
      workflowService.updateWorkflowStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workflow(data.id) });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });

      const statusMessages: Record<WorkflowStatus, string> = {
        active: "activated",
        paused: "paused",
        draft: "set to draft",
        archived: "archived",
      };

      toast.success(`Workflow ${statusMessages[data.status]}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update workflow status: ${error.message}`);
    },
  });
}

// =====================================================
// WORKFLOW RUNS
// =====================================================

export function useWorkflowRuns(workflowId?: string, limit = 50) {
  return useQuery({
    queryKey: QUERY_KEYS.workflowRuns(workflowId),
    queryFn: () => workflowService.getWorkflowRuns(workflowId, limit),
    staleTime: 10000, // 10 seconds
    retry: 1,
    retryDelay: 1000,
    // DO NOT mask errors
    // initialData: []
  });
}

export function useWorkflowRun(
  id: string,
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: QUERY_KEYS.workflowRun(id),
    queryFn: () => workflowService.getWorkflowRun(id),
    enabled: !!id,
    retry: 1,
    retryDelay: 1000,
    refetchInterval: options?.refetchInterval ?? false,
  });
}

export function useTriggerWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workflowId,
      context,
      skipLimits,
    }: {
      workflowId: string;
      context?: Record<string, unknown>;
      skipLimits?: boolean;
    }) => workflowService.triggerWorkflow(workflowId, context, { skipLimits }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.workflowRuns(data.workflowId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.workflowStats(data.workflowId),
      });
      toast.success("Workflow triggered successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to trigger workflow: ${error.message}`);
    },
  });
}

export function useCancelWorkflowRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: string) => workflowService.cancelWorkflowRun(runId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.workflowRun(data.id),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.workflowRuns(data.workflowId),
      });
      toast.success("Workflow run cancelled");
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel workflow run: ${error.message}`);
    },
  });
}

// =====================================================
// WORKFLOW TEMPLATES
// =====================================================

export function useWorkflowTemplates(category?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.workflowTemplates(category),
    queryFn: () => workflowService.getWorkflowTemplates(category),
    staleTime: 60000, // 1 minute
    retry: 1,
    retryDelay: 1000,
    // initialData: []
  });
}

export function useCreateWorkflowFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, name }: { templateId: string; name: string }) =>
      workflowService.createWorkflowFromTemplate(templateId, name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success(`Workflow "${data.name}" created from template`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create workflow from template: ${error.message}`);
    },
  });
}

// =====================================================
// TRIGGER EVENT TYPES
// =====================================================

export function useTriggerEventTypes() {
  return useQuery({
    queryKey: QUERY_KEYS.triggerEventTypes,
    queryFn: () => workflowService.getTriggerEventTypes(),
    staleTime: 300000, // 5 minutes
    retry: 1,
    retryDelay: 1000,
    // initialData: []
  });
}

// Event Type Management Hooks
export function useEventTypes() {
  return useQuery({
    queryKey: QUERY_KEYS.eventTypes,
    queryFn: () => workflowService.getEventTypes(),
    staleTime: 60000, // 1 minute
    retry: 1,
    retryDelay: 1000,
  });
}

export function useCreateEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<TriggerEventType, "id" | "created_at">) =>
      workflowService.createEventType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.eventTypes });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.triggerEventTypes });
      toast.success("Event type created successfully");
    },
    onError: (error) => {
      console.error("Failed to create event type:", error);
      toast.error("Failed to create event type");
    },
  });
}

export function useUpdateEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<TriggerEventType> & { id: string }) =>
      workflowService.updateEventType(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.eventTypes });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.triggerEventTypes });
      toast.success("Event type updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update event type:", error);
      toast.error("Failed to update event type");
    },
  });
}

export function useDeleteEventType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workflowService.deleteEventType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.eventTypes });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.triggerEventTypes });
      toast.success("Event type deleted successfully");
    },
    onError: (error) => {
      console.error("Failed to delete event type:", error);
      toast.error("Failed to delete event type");
    },
  });
}

// =====================================================
// STATISTICS
// =====================================================

export function useWorkflowStats(workflowId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.workflowStats(workflowId),
    queryFn: () => workflowService.getWorkflowStats(workflowId),
    enabled: !!workflowId,
    staleTime: 30000, // 30 seconds
    retry: 1,
    retryDelay: 1000,
  });
}

// =====================================================
// IMO ORG TEMPLATES
// =====================================================

/**
 * Fetch IMO org workflow templates
 * @param options.enabled - Whether to fetch (typically based on isImoAdmin)
 */
export function useImoWorkflowTemplates(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.imoWorkflowTemplates,
    queryFn: () => workflowService.getImoWorkflowTemplates(),
    enabled: options?.enabled ?? true,
    staleTime: 60000, // 1 minute
    retry: 1,
    retryDelay: 1000,
  });
}

/**
 * Save a workflow as an org template (IMO admin only)
 */
export function useSaveAsOrgTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workflowId: string) =>
      workflowService.saveAsOrgTemplate(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.imoWorkflowTemplates,
      });
      toast.success("Workflow saved as org template");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save as org template: ${error.message}`);
    },
  });
}

/**
 * Clone an org template to create a personal workflow
 */
export function useCloneOrgTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      newName,
    }: {
      templateId: string;
      newName: string;
    }) => workflowService.cloneOrgTemplate(templateId, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow created from org template");
    },
    onError: (error: Error) => {
      toast.error(`Failed to clone org template: ${error.message}`);
    },
  });
}

/**
 * Create a new org template directly (IMO admin only)
 */
export function useCreateOrgTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Workflow) => workflowService.createOrgTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.imoWorkflowTemplates,
      });
      toast.success("Org template created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create org template: ${error.message}`);
    },
  });
}

/**
 * Update an existing org template (IMO admin only)
 */
export function useUpdateOrgTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Workflow> }) =>
      workflowService.updateOrgTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.imoWorkflowTemplates,
      });
      toast.success("Org template updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update org template: ${error.message}`);
    },
  });
}

/**
 * Delete an org template (IMO admin only)
 */
export function useDeleteOrgTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workflowService.deleteOrgTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.imoWorkflowTemplates,
      });
      toast.success("Org template deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete org template: ${error.message}`);
    },
  });
}

// =====================================================
// TEST WORKFLOW
// =====================================================

export function useTestWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workflowId,
      testContext,
    }: {
      workflowId: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic context data
      testContext: Record<string, any>;
    }) => workflowService.testWorkflow(workflowId, testContext),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.workflowRuns(data.workflowId),
      });
      toast.success("Test run started - check the runs tab for results");
    },
    onError: (error: Error) => {
      toast.error(`Failed to test workflow: ${error.message}`);
    },
  });
}
