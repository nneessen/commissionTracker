// src/features/underwriting/index.ts

// Components
export { default as UnderwritingWizard } from "./components/UnderwritingWizard";
export { QuickQuoteDialog } from "./components/QuickQuote";
export { UnderwritingSettingsTab } from "./components/UnderwritingSettingsTab";
export {
  SessionHistoryList,
  SessionDetailDialog,
} from "./components/SessionHistory";
export { GuideList, GuideUploader } from "./components/GuideManager";

// Hooks
export {
  useHealthConditions,
  useUnderwritingFeatureFlag,
  useCanManageUnderwriting,
  useUnderwritingAnalysis,
  useUnderwritingSessions,
  useUnderwritingSession,
  useSaveUnderwritingSession,
  useUnderwritingGuides,
  useUnderwritingGuide,
  useUploadGuide,
  useUpdateGuide,
  useDeleteGuide,
  useGuideSignedUrl,
  useUnderwritingToggle,
  useCarriersWithProducts,
  underwritingQueryKeys,
  guideQueryKeys,
  carriersWithProductsQueryKeys,
  parseFollowUpSchema,
  groupConditionsByCategory,
} from "./hooks";

// Types
export type {
  HealthCondition,
  UnderwritingGuide,
  UnderwritingSession,
  WizardFormData,
  ClientInfo,
  HealthInfo,
  CoverageRequest,
  AIAnalysisResult,
  AIAnalysisRequest,
  CarrierRecommendation,
  HealthTier,
  ConditionResponse,
  FollowUpQuestion,
  FollowUpSchema,
} from "./types/underwriting.types";

export {
  WIZARD_STEPS,
  US_STATES,
  CONDITION_CATEGORY_LABELS,
  calculateBMI,
  getBMICategory,
  getHealthTierLabel,
} from "./types/underwriting.types";

// Utils
export {
  calculateBMI as calcBMI,
  getBMICategory as getBMICat,
  getBMIRiskLevel,
  calculateAge,
  formatHeight,
} from "./utils/bmiCalculator";

export {
  getHealthTierBadgeColor,
  formatSessionDate,
  formatSessionDateLong,
  formatCurrency,
  capitalizeFirst,
  formatProductType,
  isValidHealthTier,
  safeParseJsonArray,
  safeParseJsonObject,
} from "./utils/formatters";
