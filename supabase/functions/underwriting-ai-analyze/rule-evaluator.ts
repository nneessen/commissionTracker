// supabase/functions/underwriting-ai-analyze/rule-evaluator.ts
// Deterministic decision tree rule evaluation engine

// ============================================================================
// Types (matching src/features/underwriting/types/underwriting.types.ts)
// ============================================================================

export type ConditionField =
  | "age"
  | "gender"
  | "bmi"
  | "health_tier"
  | "tobacco"
  | "face_amount"
  | "state"
  | "condition_present"
  | "bp_med_count"
  | "cholesterol_med_count"
  | "insulin_use"
  | "blood_thinners"
  | "antidepressants"
  | "pain_medications";

export type ConditionOperator =
  | "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "in"
  | "not_in"
  | "contains";

export interface RuleCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number | boolean | string[];
}

export interface RuleConditionGroup {
  all?: RuleCondition[];
  any?: RuleCondition[];
}

export interface RuleRecommendation {
  carrierId: string;
  productIds: string[];
  priority: number;
  notes?: string;
}

export interface DecisionTreeRule {
  id: string;
  name: string;
  conditions: RuleConditionGroup;
  recommendations: RuleRecommendation[];
  isActive?: boolean;
}

export interface DecisionTreeRules {
  rules: DecisionTreeRule[];
}

// ============================================================================
// Evaluation Context - The client data to evaluate against
// ============================================================================

export interface ClientEvaluationContext {
  age: number;
  gender: string;
  state: string;
  bmi: number;
  tobacco: boolean;
  faceAmount: number;
  conditionCodes: string[];
  healthTier?: string; // Optional - set after AI analysis for second-pass
  // Medication fields
  bpMedCount: number;
  cholesterolMedCount: number;
  insulinUse: boolean;
  bloodThinners: boolean;
  antidepressants: boolean;
  painMedications: "none" | "otc_only" | "prescribed_non_opioid" | "opioid";
}

// ============================================================================
// Evaluation Results
// ============================================================================

export interface RuleMatch {
  ruleId: string;
  ruleName: string;
  matchScore: number; // 1.0 for full match, 0.0-1.0 for partial (any logic)
  matchedConditions: string[];
  failedConditions: string[];
  recommendations: RuleRecommendation[];
}

export interface TreeEvaluationResult {
  matchedRules: RuleMatch[];
  recommendedCarrierIds: string[];
  recommendedProductIds: string[];
  allRecommendations: RuleRecommendation[];
  metadata: {
    totalRulesEvaluated: number;
    totalMatches: number;
    evaluationTimeMs: number;
    primaryRoutingMatches: string[]; // Rule names that matched on age/face_amount
  };
}

// ============================================================================
// Condition Evaluation Functions
// ============================================================================

/**
 * Evaluates a single condition against the client context
 */
export function evaluateCondition(
  condition: RuleCondition,
  context: ClientEvaluationContext,
): boolean {
  const { field, operator, value } = condition;

  // Handle condition_present specially
  if (field === "condition_present") {
    return evaluateConditionPresent(operator, value, context.conditionCodes);
  }

  // Get the actual value from context
  const actualValue = getContextValue(field, context);

  // Apply operator
  return applyOperator(operator, actualValue, value);
}

/**
 * Gets the value from context for a given field
 */
function getContextValue(
  field: ConditionField,
  context: ClientEvaluationContext,
): string | number | boolean {
  switch (field) {
    case "age":
      return context.age;
    case "gender":
      return context.gender;
    case "bmi":
      return context.bmi;
    case "state":
      return context.state;
    case "tobacco":
      return context.tobacco;
    case "face_amount":
      return context.faceAmount;
    case "health_tier":
      return context.healthTier || "unknown";
    // Medication fields
    case "bp_med_count":
      return context.bpMedCount;
    case "cholesterol_med_count":
      return context.cholesterolMedCount;
    case "insulin_use":
      return context.insulinUse;
    case "blood_thinners":
      return context.bloodThinners;
    case "antidepressants":
      return context.antidepressants;
    case "pain_medications":
      return context.painMedications;
    default:
      return "";
  }
}

/**
 * Applies an operator to compare actual vs expected values
 */
function applyOperator(
  operator: ConditionOperator,
  actual: string | number | boolean,
  expected: string | number | boolean | string[],
): boolean {
  switch (operator) {
    case "==":
      // Handle boolean comparisons with string "true"/"false"
      if (typeof actual === "boolean" && typeof expected === "string") {
        return actual === (expected === "true");
      }
      // Handle case-insensitive string comparisons
      if (typeof actual === "string" && typeof expected === "string") {
        return actual.toLowerCase() === expected.toLowerCase();
      }
      return actual === expected;

    case "!=":
      if (typeof actual === "boolean" && typeof expected === "string") {
        return actual !== (expected === "true");
      }
      if (typeof actual === "string" && typeof expected === "string") {
        return actual.toLowerCase() !== expected.toLowerCase();
      }
      return actual !== expected;

    case ">":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual > expected
      );

    case "<":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual < expected
      );

    case ">=":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual >= expected
      );

    case "<=":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual <= expected
      );

    case "in":
      if (Array.isArray(expected)) {
        const actualStr = String(actual).toLowerCase();
        return expected.some((e) => String(e).toLowerCase() === actualStr);
      }
      return false;

    case "not_in":
      if (Array.isArray(expected)) {
        const actualStr = String(actual).toLowerCase();
        return !expected.some((e) => String(e).toLowerCase() === actualStr);
      }
      return true;

    case "contains":
      return (
        typeof actual === "string" &&
        typeof expected === "string" &&
        actual.toLowerCase().includes(expected.toLowerCase())
      );

    default:
      return false;
  }
}

/**
 * Evaluates condition_present field - checks if client has specific health conditions
 */
function evaluateConditionPresent(
  operator: ConditionOperator,
  conditionCode: string | number | boolean | string[],
  clientConditions: string[],
): boolean {
  // Normalize condition codes to array
  const targetCodes = Array.isArray(conditionCode)
    ? conditionCode.map((c) => String(c).toLowerCase())
    : [String(conditionCode).toLowerCase()];

  const clientCodesLower = clientConditions.map((c) => c.toLowerCase());

  if (operator === "==" || operator === "in" || operator === "contains") {
    // Client HAS at least one of these conditions
    return targetCodes.some((code) => clientCodesLower.includes(code));
  } else if (operator === "!=" || operator === "not_in") {
    // Client does NOT have any of these conditions
    return !targetCodes.some((code) => clientCodesLower.includes(code));
  }

  return false;
}

// ============================================================================
// Rule Evaluation Functions
// ============================================================================

/**
 * Evaluates a single rule against the client context
 * Returns null if the rule doesn't match, RuleMatch if it does
 */
export function evaluateRule(
  rule: DecisionTreeRule,
  context: ClientEvaluationContext,
): RuleMatch | null {
  // Skip inactive rules
  if (rule.isActive === false) return null;

  // Get conditions - can be 'all' (AND) or 'any' (OR)
  const allConditions = rule.conditions.all || [];
  const anyConditions = rule.conditions.any || [];
  const hasAllLogic = allConditions.length > 0;
  const hasAnyLogic = anyConditions.length > 0;

  // If no conditions, rule always matches
  if (!hasAllLogic && !hasAnyLogic) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matchScore: 1.0,
      matchedConditions: ["(no conditions - always matches)"],
      failedConditions: [],
      recommendations: rule.recommendations,
    };
  }

  const matchedConditions: string[] = [];
  const failedConditions: string[] = [];

  // Evaluate 'all' conditions (AND logic)
  let allPassed = true;
  for (const condition of allConditions) {
    const description = formatConditionDescription(condition);
    if (evaluateCondition(condition, context)) {
      matchedConditions.push(description);
    } else {
      failedConditions.push(description);
      allPassed = false;
    }
  }

  // Evaluate 'any' conditions (OR logic)
  let anyPassed = anyConditions.length === 0; // True if no 'any' conditions
  for (const condition of anyConditions) {
    const description = formatConditionDescription(condition);
    if (evaluateCondition(condition, context)) {
      matchedConditions.push(description);
      anyPassed = true;
    } else {
      failedConditions.push(description);
    }
  }

  // Determine if rule matches based on logic type
  let matches: boolean;
  if (hasAllLogic && hasAnyLogic) {
    // Both: ALL must pass AND at least one ANY must pass
    matches = allPassed && anyPassed;
  } else if (hasAllLogic) {
    // Only ALL: all must pass
    matches = allPassed;
  } else {
    // Only ANY: at least one must pass
    matches = anyPassed;
  }

  if (!matches) return null;

  // Calculate match score
  const totalConditions = allConditions.length + anyConditions.length;
  const matchScore =
    totalConditions > 0 ? matchedConditions.length / totalConditions : 1.0;

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    matchScore,
    matchedConditions,
    failedConditions,
    recommendations: rule.recommendations,
  };
}

/**
 * Formats a condition into a human-readable description
 */
function formatConditionDescription(condition: RuleCondition): string {
  const { field, operator, value } = condition;
  let valueStr: string;

  if (Array.isArray(value)) {
    valueStr = `[${value.join(", ")}]`;
  } else if (typeof value === "boolean") {
    valueStr = value ? "true" : "false";
  } else if (typeof value === "number" && field === "face_amount") {
    valueStr = `$${value.toLocaleString()}`;
  } else {
    valueStr = String(value);
  }

  return `${field} ${operator} ${valueStr}`;
}

// ============================================================================
// Decision Tree Evaluation
// ============================================================================

/**
 * Evaluates all rules in the decision tree against the client context
 * Returns matched rules sorted by priority, with aggregated recommendations
 */
export function evaluateDecisionTree(
  rules: DecisionTreeRule[],
  context: ClientEvaluationContext,
): TreeEvaluationResult {
  const startTime = Date.now();

  // Sort rules to prioritize age and face_amount conditions (primary routing)
  const sortedRules = sortRulesForPrimaryRouting(rules);

  const matchedRules: RuleMatch[] = [];
  const recommendedCarrierIds = new Set<string>();
  const recommendedProductIds = new Set<string>();
  const allRecommendations: RuleRecommendation[] = [];
  const primaryRoutingMatches: string[] = [];

  for (const rule of sortedRules) {
    const match = evaluateRule(rule, context);
    if (match) {
      matchedRules.push(match);

      // Check if this was a primary routing match (age or face_amount)
      if (isPrimaryRoutingRule(rule)) {
        primaryRoutingMatches.push(rule.name);
      }

      // Aggregate recommendations
      for (const rec of match.recommendations) {
        recommendedCarrierIds.add(rec.carrierId);
        rec.productIds.forEach((pid) => recommendedProductIds.add(pid));
        allRecommendations.push(rec);
      }
    }
  }

  // Sort matched rules by the minimum priority in their recommendations
  matchedRules.sort((a, b) => {
    const aPriority =
      a.recommendations.length > 0
        ? Math.min(...a.recommendations.map((r) => r.priority))
        : 999;
    const bPriority =
      b.recommendations.length > 0
        ? Math.min(...b.recommendations.map((r) => r.priority))
        : 999;
    return aPriority - bPriority;
  });

  // Sort all recommendations by priority
  allRecommendations.sort((a, b) => a.priority - b.priority);

  return {
    matchedRules,
    recommendedCarrierIds: Array.from(recommendedCarrierIds),
    recommendedProductIds: Array.from(recommendedProductIds),
    allRecommendations,
    metadata: {
      totalRulesEvaluated: rules.length,
      totalMatches: matchedRules.length,
      evaluationTimeMs: Date.now() - startTime,
      primaryRoutingMatches,
    },
  };
}

/**
 * Sorts rules to prioritize primary routing fields (age, face_amount)
 * This ensures fast path evaluation for most common routing criteria
 */
function sortRulesForPrimaryRouting(
  rules: DecisionTreeRule[],
): DecisionTreeRule[] {
  return [...rules].sort((a, b) => {
    const aScore = getPrimaryRoutingScore(a);
    const bScore = getPrimaryRoutingScore(b);
    return bScore - aScore; // Higher score = more primary routing
  });
}

/**
 * Calculates a score for how much a rule focuses on primary routing fields
 */
function getPrimaryRoutingScore(rule: DecisionTreeRule): number {
  let score = 0;
  const conditions = [
    ...(rule.conditions.all || []),
    ...(rule.conditions.any || []),
  ];

  for (const condition of conditions) {
    if (condition.field === "age") score += 10;
    if (condition.field === "face_amount") score += 8;
    if (condition.field === "tobacco") score += 5;
    if (condition.field === "bmi") score += 3;
  }

  return score;
}

/**
 * Checks if a rule is a primary routing rule (has age or face_amount conditions)
 */
function isPrimaryRoutingRule(rule: DecisionTreeRule): boolean {
  const conditions = [
    ...(rule.conditions.all || []),
    ...(rule.conditions.any || []),
  ];
  return conditions.some((c) => c.field === "age" || c.field === "face_amount");
}

// ============================================================================
// Hybrid Merge Functions
// ============================================================================

export interface MergedRecommendation {
  carrierId: string;
  carrierName: string;
  productId: string;
  productName: string;
  expectedRating: string;
  confidence: number;
  keyFactors: string[];
  concerns: string[];
  priority: number;
  notes?: string;
  guideReferences?: string[];
  // Tree match additions
  treeMatchBoost: number;
  treeMatchedRules: string[];
  finalScore: number;
}

/**
 * Calculates the boost to apply to AI confidence based on tree matches
 * Max boost of 0.2 for strong tree matches
 */
export function calculateTreeBoost(
  carrierId: string,
  productId: string,
  treeResult: TreeEvaluationResult,
): { boost: number; matchedRules: string[] } {
  const matchedRules: string[] = [];
  let totalMatchScore = 0;
  let matchCount = 0;

  for (const rule of treeResult.matchedRules) {
    for (const rec of rule.recommendations) {
      if (
        rec.carrierId === carrierId &&
        (rec.productIds.length === 0 || rec.productIds.includes(productId))
      ) {
        matchedRules.push(rule.ruleName);
        totalMatchScore += rule.matchScore;
        matchCount++;
      }
    }
  }

  if (matchCount === 0) {
    return { boost: 0, matchedRules: [] };
  }

  // Average match score, scaled to max 0.2 boost
  const avgScore = totalMatchScore / matchCount;
  const boost = Math.min(0.2, avgScore * 0.2);

  return { boost, matchedRules };
}

/**
 * Checks if a carrier/product was recommended by the decision tree
 */
export function isTreeRecommended(
  carrierId: string,
  productId: string,
  treeResult: TreeEvaluationResult,
): boolean {
  // Check if carrier is in recommended list
  if (!treeResult.recommendedCarrierIds.includes(carrierId)) {
    return false;
  }

  // If tree has no product-level recommendations, carrier match is enough
  if (treeResult.recommendedProductIds.length === 0) {
    return true;
  }

  // Check product-level match
  return treeResult.recommendedProductIds.includes(productId);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Builds a ClientEvaluationContext from the analysis request
 */
export function buildEvaluationContext(
  client: { age: number; gender: string; state: string; bmi: number },
  health: {
    tobacco: { currentUse: boolean };
    conditions: Array<{ code: string }>;
    medications: {
      bpMedCount: number;
      cholesterolMedCount: number;
      insulinUse: boolean;
      bloodThinners: boolean;
      antidepressants: boolean;
      painMedications: "none" | "otc_only" | "prescribed_non_opioid" | "opioid";
    };
  },
  coverage: { faceAmount: number },
): ClientEvaluationContext {
  return {
    age: client.age,
    gender: client.gender,
    state: client.state,
    bmi: client.bmi,
    tobacco: health.tobacco.currentUse,
    faceAmount: coverage.faceAmount,
    conditionCodes: health.conditions.map((c) => c.code),
    // Medication fields
    bpMedCount: health.medications.bpMedCount,
    cholesterolMedCount: health.medications.cholesterolMedCount,
    insulinUse: health.medications.insulinUse,
    bloodThinners: health.medications.bloodThinners,
    antidepressants: health.medications.antidepressants,
    painMedications: health.medications.painMedications,
  };
}
