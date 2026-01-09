// src/features/underwriting/index.ts

// Components
export { default as UnderwritingWizard } from "./components/UnderwritingWizard";
export {
  DecisionTreeEditor,
  RuleBuilder,
  RuleConditionRow,
  RuleActionConfig,
} from "./components/DecisionTreeEditor";
export { UnderwritingSettingsTab } from "./components/UnderwritingSettingsTab";
export { DecisionTreeList } from "./components/DecisionTreeList";
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
  useDecisionTrees,
  useDecisionTree,
  useActiveDecisionTree,
  useCreateDecisionTree,
  useUpdateDecisionTree,
  useDeleteDecisionTree,
  useSetDefaultDecisionTree,
  useUnderwritingGuides,
  useUnderwritingGuide,
  useUploadGuide,
  useUpdateGuide,
  useDeleteGuide,
  useGuideSignedUrl,
  useUnderwritingToggle,
  useCarriersWithProducts,
  underwritingQueryKeys,
  decisionTreeQueryKeys,
  guideQueryKeys,
  carriersWithProductsQueryKeys,
  parseFollowUpSchema,
  groupConditionsByCategory,
} from "./hooks";

// Types
export type {
  HealthCondition,
  UnderwritingGuide,
  DecisionTree,
  DecisionTreeInsert,
  DecisionTreeUpdate,
  DecisionTreeRule,
  DecisionTreeRules,
  RuleCondition,
  RuleConditionGroup,
  RuleRecommendation,
  ConditionField,
  ConditionOperator,
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
