// src/features/underwriting/components/RuleEngine/index.ts
// Exports for the Rule Engine v2 components

// Field Registry
export {
  type FieldDefinition,
  type FieldType,
  type AllOperators,
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
  CLIENT_FIELDS,
  CONDITION_FIELDS,
  getFieldsForCondition,
  getClientFields,
  getAllFields,
  getOperatorsForType,
  getOperatorLabel,
  getFieldDefinition,
  getAvailableConditionCodes,
  getFieldsByCategory,
} from "./fieldRegistry";

// Predicate Builder Components
export { PredicateBuilder } from "./PredicateBuilder";
export { PredicateGroupBuilder } from "./PredicateGroupBuilder";
export {
  PredicateLeafBuilder,
  createDefaultCondition,
} from "./PredicateLeafBuilder";
export { PredicateJsonEditor } from "./PredicateJsonEditor";

// New Condition-First Components
export { ConditionInfoPanel } from "./ConditionInfoPanel";
export { RuleCard } from "./RuleCard";
export { RuleConditionBuilder } from "./RuleConditionBuilder";
export { ConditionRuleSetView } from "./ConditionRuleSetView";

// Outcome Editor
export {
  OutcomeEditor,
  DEFAULT_OUTCOME,
  type RuleOutcomeValues,
} from "./OutcomeEditor";

// Rule Editor
export { RuleEditor, type RuleFormData } from "./RuleEditor";

// Rule Set Components
export { RuleSetEditor, type RuleSetFormData } from "./RuleSetEditor";
export { RuleSetList } from "./RuleSetList";

// Provenance
export { ProvenanceTooltip } from "./ProvenanceTooltip";
