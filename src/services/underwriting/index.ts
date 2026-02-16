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
export {
  deleteRuleSet,
  type RuleSetWithRules,
  type HealthClass,
  type TableRating,
  type RuleReviewStatus,
} from "./ruleService";
export {
  parsePredicate,
  validatePredicate,
  isFieldCondition,
  type PredicateGroup,
  type FieldCondition,
  type RuleSetScope,
} from "./ruleEngineDSL";
