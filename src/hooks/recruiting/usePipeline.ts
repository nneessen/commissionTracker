// /home/nneessen/projects/commissionTracker/src/hooks/recruiting/usePipeline.ts

import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {pipelineService} from '../../services/recruiting/pipelineService';

// Query keys
const PIPELINE_KEYS = {
  all: ['pipelines'] as const,
  templates: () => [...PIPELINE_KEYS.all, 'templates'] as const,
  template: (id: string) => [...PIPELINE_KEYS.templates(), id] as const,
  activeTemplate: () => [...PIPELINE_KEYS.templates(), 'active'] as const,
  phases: (templateId: string) => [...PIPELINE_KEYS.all, 'phases', templateId] as const,
  phase: (phaseId: string) => [...PIPELINE_KEYS.all, 'phase', phaseId] as const,
  checklistItems: (phaseId: string) => [...PIPELINE_KEYS.all, 'checklist', phaseId] as const,
};

// ========================================
// TEMPLATE HOOKS
// ========================================

export function usePipelineTemplates() {
  return useQuery({
    queryKey: PIPELINE_KEYS.templates(),
    queryFn: () => pipelineService.getTemplates(),
  });
}

export function usePipelineTemplate(templateId: string) {
  return useQuery({
    queryKey: PIPELINE_KEYS.template(templateId),
    queryFn: () => pipelineService.getTemplate(templateId),
    enabled: !!templateId,
  });
}

export function useActiveTemplate() {
  return useQuery({
    queryKey: PIPELINE_KEYS.activeTemplate(),
    queryFn: () => pipelineService.getActiveTemplate(),
  });
}

// ========================================
// PHASE HOOKS
// ========================================

export function usePipelinePhases(templateId?: string) {
  // If no templateId provided, get the active template first
  const { data: activeTemplate } = useActiveTemplate();
  const effectiveTemplateId = templateId || activeTemplate?.id;

  return useQuery({
    queryKey: PIPELINE_KEYS.phases(effectiveTemplateId || ''),
    queryFn: () => pipelineService.getPhases(effectiveTemplateId!),
    enabled: !!effectiveTemplateId,
  });
}

export function usePipelinePhase(phaseId: string) {
  return useQuery({
    queryKey: PIPELINE_KEYS.phase(phaseId),
    queryFn: () => pipelineService.getPhase(phaseId),
    enabled: !!phaseId,
  });
}

// ========================================
// CHECKLIST HOOKS
// ========================================

export function useChecklistItems(phaseId: string) {
  return useQuery({
    queryKey: PIPELINE_KEYS.checklistItems(phaseId),
    queryFn: () => pipelineService.getChecklistItems(phaseId),
    enabled: !!phaseId,
  });
}

// ========================================
// MUTATION HOOKS
// ========================================

export function useCreatePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, phaseData }: { templateId: string; phaseData: any }) =>
      pipelineService.createPhase(templateId, phaseData),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.phases(templateId) });
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.template(templateId) });
    },
  });
}

export function useUpdatePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ phaseId, updates }: { phaseId: string; updates: any }) =>
      pipelineService.updatePhase(phaseId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.phase(data.id) });
      // Also invalidate the phases list for the template
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.all });
    },
  });
}

export function useDeletePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (phaseId: string) => pipelineService.deletePhase(phaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.all });
    },
  });
}

export function useReorderPhases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, phaseIds }: { templateId: string; phaseIds: string[] }) =>
      pipelineService.reorderPhases(templateId, phaseIds),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: PIPELINE_KEYS.phases(templateId) });
    },
  });
}