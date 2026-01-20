// src/features/recruiting/index.ts
export { useActiveTemplate, usePhases } from "./hooks/usePipeline";
export {
  usePhaseAutomations,
  useChecklistItemAutomations,
  useSystemAutomations,
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
} from "./hooks/usePipelineAutomations";
export { AutomationDialog } from "./admin/AutomationDialog";
