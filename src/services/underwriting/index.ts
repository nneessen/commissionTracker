// src/services/underwriting/index.ts
// Barrel file for underwriting services

export {
  criteriaService,
  createCriteria,
  type CreateCriteriaInput,
} from "./criteriaService";
export { guideStorageService } from "./guideStorageService";
export {
  transformConditionResponses,
  type TransformedConditionResponses,
} from "./conditionResponseTransformer";
export {
  getRecommendations,
  formatRecommendationReason,
  getReasonBadgeColor,
  formatCurrency as formatDECurrency,
  formatPercentage,
  type DecisionEngineInput,
  type DecisionEngineResult,
  type Recommendation,
  type GenderType,
} from "./decisionEngine";
