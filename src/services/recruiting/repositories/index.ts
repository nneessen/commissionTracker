// src/services/recruiting/repositories/index.ts

// Repositories
export { RecruitRepository } from "./RecruitRepository";
export { PipelineTemplateRepository } from "./PipelineTemplateRepository";
export { PipelinePhaseRepository } from "./PipelinePhaseRepository";
export { PhaseChecklistItemRepository } from "./PhaseChecklistItemRepository";
export { RecruitPhaseProgressRepository } from "./RecruitPhaseProgressRepository";
export { RecruitChecklistProgressRepository } from "./RecruitChecklistProgressRepository";
export { PipelineAutomationRepository } from "./PipelineAutomationRepository";
export { PipelineAutomationLogRepository } from "./PipelineAutomationLogRepository";

// Types from RecruitRepository
export type {
  CreateRecruitData,
  UpdateRecruitData,
  PaginatedRecruits,
} from "./RecruitRepository";

// Types from PipelineTemplateRepository
export type {
  PipelineTemplateEntity,
  CreatePipelineTemplateData,
  UpdatePipelineTemplateData,
} from "./PipelineTemplateRepository";

// Types from PipelinePhaseRepository
export type {
  PipelinePhaseEntity,
  CreatePipelinePhaseData,
  UpdatePipelinePhaseData,
} from "./PipelinePhaseRepository";

// Types from PhaseChecklistItemRepository
export type {
  PhaseChecklistItemEntity,
  CreatePhaseChecklistItemData,
  UpdatePhaseChecklistItemData,
} from "./PhaseChecklistItemRepository";

// Types from RecruitPhaseProgressRepository
export type {
  RecruitPhaseProgressEntity,
  CreateRecruitPhaseProgressData,
  UpdateRecruitPhaseProgressData,
  PhaseProgressStatus,
} from "./RecruitPhaseProgressRepository";

// Types from RecruitChecklistProgressRepository
export type {
  RecruitChecklistProgressEntity,
  CreateRecruitChecklistProgressData,
  UpdateRecruitChecklistProgressData,
  ChecklistProgressStatus,
} from "./RecruitChecklistProgressRepository";

// Types from PipelineAutomationRepository
export type {
  PipelineAutomationEntity,
  CreatePipelineAutomationData,
  UpdatePipelineAutomationData,
} from "./PipelineAutomationRepository";

// Types from PipelineAutomationLogRepository
export type {
  PipelineAutomationLogEntity,
  CreatePipelineAutomationLogData,
  UpdatePipelineAutomationLogData,
  AutomationLogStatus,
} from "./PipelineAutomationLogRepository";
