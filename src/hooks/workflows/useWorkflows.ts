// File: /home/nneessen/projects/commissionTracker/src/hooks/workflows/useWorkflows.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { workflowService } from '@/services/workflowService';
import type {
  Workflow,
  WorkflowFormData,
  WorkflowStatus,
  WorkflowRun,
  WorkflowTemplate,
  TriggerEventType,
  WorkflowStats
} from '@/types/workflow.types';

// =====================================================
// QUERY KEYS
// =====================================================

const QUERY_KEYS = {
  workflows: (status?: WorkflowStatus) => ['workflows', status] as const,
  workflow: (id: string) => ['workflow', id] as const,
  workflowRuns: (workflowId?: string) => ['workflow-runs', workflowId] as const,
  workflowRun: (id: string) => ['workflow-run', id] as const,
  workflowTemplates: (category?: string) => ['workflow-templates', category] as const,
  triggerEventTypes: ['trigger-event-types'] as const,
  workflowStats: (workflowId: string) => ['workflow-stats', workflowId] as const
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
    // Return empty array on error to prevent UI crashes
    initialData: []
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.workflow(id),
    queryFn: () => workflowService.getWorkflow(id),
    enabled: !!id,
    retry: 1,
    retryDelay: 1000
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: WorkflowFormData) => workflowService.createWorkflow(formData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success(`Workflow "${data.name}" created successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create workflow: ${error.message}`);
    }
  });
}

export function useUpdateWorkflow(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<WorkflowFormData>) =>
      workflowService.updateWorkflow(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workflow(id) });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success(`Workflow "${data.name}" updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update workflow: ${error.message}`);
    }
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workflowService.deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete workflow: ${error.message}`);
    }
  });
}

export function useUpdateWorkflowStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkflowStatus }) =>
      workflowService.updateWorkflowStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workflow(data.id) });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });

      const statusMessages: Record<WorkflowStatus, string> = {
        active: 'activated',
        paused: 'paused',
        draft: 'set to draft',
        archived: 'archived'
      };

      toast.success(`Workflow ${statusMessages[data.status]}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update workflow status: ${error.message}`);
    }
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
    // Return empty array on error to prevent UI crashes
    initialData: []
  });
}

export function useWorkflowRun(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.workflowRun(id),
    queryFn: () => workflowService.getWorkflowRun(id),
    enabled: !!id,
    retry: 1,
    retryDelay: 1000
    // TODO: Add refetchInterval when run is in progress
  });
}

export function useTriggerWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, context }: { workflowId: string; context?: Record<string, any> }) =>
      workflowService.triggerWorkflow(workflowId, context),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workflowRuns(data.workflowId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workflowStats(data.workflowId) });
      toast.success('Workflow triggered successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to trigger workflow: ${error.message}`);
    }
  });
}

export function useCancelWorkflowRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: string) => workflowService.cancelWorkflowRun(runId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workflowRun(data.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workflowRuns(data.workflowId) });
      toast.success('Workflow run cancelled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel workflow run: ${error.message}`);
    }
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
    // Return empty array on error to prevent UI crashes
    initialData: []
  });
}

export function useCreateWorkflowFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, name }: { templateId: string; name: string }) =>
      workflowService.createWorkflowFromTemplate(templateId, name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success(`Workflow "${data.name}" created from template`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create workflow from template: ${error.message}`);
    }
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
    initialData: []
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
    retryDelay: 1000
  });
}

// =====================================================
// TEST WORKFLOW
// =====================================================

export function useTestWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, testContext }: {
      workflowId: string;
      testContext: Record<string, any>
    }) => workflowService.testWorkflow(workflowId, testContext),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workflowRuns(data.workflowId) });
      toast.success('Test run started - check the runs tab for results');
    },
    onError: (error: Error) => {
      toast.error(`Failed to test workflow: ${error.message}`);
    }
  });
}