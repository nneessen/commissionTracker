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
export {
  useInvitationByToken,
  useSubmitRegistrationWithPassword,
  useCancelInvitation,
} from "./hooks/useRecruitInvitations";
export { AutomationDialog } from "./admin/AutomationDialog";

// Components
export { RecruitDetailPanel } from "./components/RecruitDetailPanel";
export { AddRecruitDialog } from "./components/AddRecruitDialog";
