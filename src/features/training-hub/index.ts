// src/features/training-hub/index.ts
export { default as TrainingHubPage } from "./components/TrainingHubPage";
export { default as TrainerDashboard } from "./components/TrainerDashboard";
export { RecruitingTab } from "./components/RecruitingTab";
export { ActivityTab } from "./components/ActivityTab";
export { EmailTemplatesTab } from "./components/EmailTemplatesTab";
export { DocumentsTab } from "./components/DocumentsTab";
export { DocumentBrowserSheet } from "./components/DocumentBrowserSheet";

// Types
export type {
  TrainingDocument,
  TrainingDocumentCategory,
  TrainingDocumentFilters,
} from "./types/training-document.types";
export {
  TRAINING_CATEGORY_CONFIG,
  TRAINING_CATEGORY_ORDER,
  formatFileSize,
} from "./types/training-document.types";
