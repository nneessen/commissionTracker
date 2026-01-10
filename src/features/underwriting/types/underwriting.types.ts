// src/features/underwriting/types/underwriting.types.ts

import type { Database } from "@/types/database.types";

// ============================================================================
// Database Row Types
// ============================================================================

export type HealthCondition =
  Database["public"]["Tables"]["underwriting_health_conditions"]["Row"];
export type HealthConditionInsert =
  Database["public"]["Tables"]["underwriting_health_conditions"]["Insert"];

export type UnderwritingGuide =
  Database["public"]["Tables"]["underwriting_guides"]["Row"];
export type UnderwritingGuideInsert =
  Database["public"]["Tables"]["underwriting_guides"]["Insert"];
export type UnderwritingGuideUpdate =
  Database["public"]["Tables"]["underwriting_guides"]["Update"];

export type DecisionTree =
  Database["public"]["Tables"]["underwriting_decision_trees"]["Row"];
export type DecisionTreeInsert =
  Database["public"]["Tables"]["underwriting_decision_trees"]["Insert"];
export type DecisionTreeUpdate =
  Database["public"]["Tables"]["underwriting_decision_trees"]["Update"];

export type UnderwritingSession =
  Database["public"]["Tables"]["underwriting_sessions"]["Row"];
export type UnderwritingSessionInsert =
  Database["public"]["Tables"]["underwriting_sessions"]["Insert"];

// ============================================================================
// Follow-up Question Types
// ============================================================================

export type QuestionType =
  | "select"
  | "multiselect"
  | "number"
  | "text"
  | "date";

export interface FollowUpQuestion {
  id: string;
  type: QuestionType;
  label: string;
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface FollowUpSchema {
  questions: FollowUpQuestion[];
}

// ============================================================================
// Wizard Form State Types
// ============================================================================

export interface ClientInfo {
  name: string;
  dob: string | null;
  age: number;
  gender: "male" | "female" | "other" | "";
  state: string;
  heightFeet: number;
  heightInches: number;
  weight: number;
}

export interface ConditionResponse {
  conditionCode: string;
  conditionName: string;
  responses: Record<string, string | number | string[]>;
}

export interface TobaccoInfo {
  currentUse: boolean;
  type?: "cigarettes" | "cigars" | "vape" | "chewing" | "other";
  lastUseDate?: string;
  frequency?: string;
}

export type PainMedicationType =
  | "none"
  | "otc_only"
  | "prescribed_non_opioid"
  | "opioid";

export interface MedicationInfo {
  bpMedCount: number;
  cholesterolMedCount: number;
  insulinUse: boolean;
  bloodThinners: boolean;
  antidepressants: boolean;
  painMedications: PainMedicationType;
  otherMedications?: string[];
}

export interface HealthInfo {
  conditions: ConditionResponse[];
  tobacco: TobaccoInfo;
  medications: MedicationInfo;
}

export interface CoverageRequest {
  faceAmount: number;
  productTypes: ProductType[];
}

export type ProductType =
  | "term_life"
  | "whole_life"
  | "universal_life"
  | "indexed_universal_life";

export interface WizardFormData {
  client: ClientInfo;
  health: HealthInfo;
  coverage: CoverageRequest;
}

// ============================================================================
// AI Analysis Types
// ============================================================================

export type HealthTier =
  | "preferred_plus"
  | "preferred"
  | "standard_plus"
  | "standard"
  | "substandard"
  | "table_rated"
  | "decline";

export interface CarrierRecommendation {
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
  guideReferences?: string[]; // References to carrier guide content used in the recommendation
  // Decision tree boost info (populated when tree matches)
  treeMatchBoost?: number;
  treeMatchedRules?: string[];
}

export interface AIAnalysisResult {
  healthTier: HealthTier;
  riskFactors: string[];
  recommendations: CarrierRecommendation[];
  reasoning: string;
  processingTimeMs?: number;
  criteriaFilters?: CriteriaFilterResult; // Phase 5: Criteria evaluation results
}

// ============================================================================
// Phase 5: Criteria Evaluation Types
// ============================================================================

/**
 * Result of evaluating extracted criteria against a client profile
 */
export interface CriteriaEvaluationResult {
  eligible: boolean;
  reasons: string[];
  buildRating?:
    | "preferred_plus"
    | "preferred"
    | "standard"
    | "table_rated"
    | "decline";
  tobaccoClass?: string;
}

/**
 * Product filtered by criteria rules
 */
export interface CriteriaFilteredProduct {
  carrierId: string;
  carrierName: string;
  productId?: string;
  productName?: string;
  rule: string;
  reason: string;
}

/**
 * Summary of criteria filtering applied during analysis
 */
export interface CriteriaFilterResult {
  /** Whether any criteria were applied */
  applied: boolean;
  /** Carrier IDs that had active criteria */
  matchedCarriers: string[];
  /** Products filtered out by criteria rules */
  filteredByCarrier: CriteriaFilteredProduct[];
  /** Per-carrier evaluation results */
  evaluationResults?: Record<string, CriteriaEvaluationResult>;
}

// ============================================================================
// Decision Tree Evaluation Types
// ============================================================================

export interface TreeRuleMatch {
  ruleName: string;
  matchScore: number;
  matchedConditions: string[];
}

export interface TreeEvaluationResult {
  matchedRules: TreeRuleMatch[];
  totalMatches: number;
  evaluationTimeMs: number;
}

export interface UnderwritingAnalysisResponse {
  success: boolean;
  analysis: AIAnalysisResult;
  filteredProducts: Array<{
    productName: string;
    carrierName: string;
    reason: string;
  }>;
  fullUnderwritingRequired: string[];
  criteriaFilters?: CriteriaFilterResult; // Phase 5: Criteria evaluation results
  treeEvaluation: TreeEvaluationResult | null;
  error?: string;
}

export interface AIAnalysisRequest {
  client: {
    age: number;
    gender: string;
    state: string;
    bmi: number;
  };
  health: {
    conditions: Array<{
      code: string;
      responses: Record<string, string | number | string[]>;
    }>;
    tobacco: TobaccoInfo;
    medications: MedicationInfo;
  };
  coverage: {
    faceAmount: number;
    productTypes: string[];
  };
  decisionTreeId?: string;
  imoId?: string; // For fetching relevant carrier guides
}

// ============================================================================
// Decision Tree Types
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
// Wizard Step Types
// ============================================================================

export type WizardStep =
  | "client"
  | "health"
  | "coverage"
  | "review"
  | "results";

export interface WizardStepConfig {
  id: WizardStep;
  label: string;
  description?: string;
}

export const WIZARD_STEPS: WizardStepConfig[] = [
  { id: "client", label: "Client Info", description: "Basic client details" },
  { id: "health", label: "Health", description: "Medical history" },
  { id: "coverage", label: "Coverage", description: "Policy requirements" },
  { id: "review", label: "Review", description: "Confirm details" },
  { id: "results", label: "Results", description: "Recommendations" },
];

// ============================================================================
// Session Types
// ============================================================================

export interface SessionSaveData {
  clientName?: string;
  clientAge: number;
  clientGender: string;
  clientState: string;
  clientBmi: number;
  healthResponses: Record<string, ConditionResponse>;
  conditionsReported: string[];
  tobaccoUse: boolean;
  tobaccoDetails?: TobaccoInfo;
  requestedFaceAmount: number;
  requestedProductTypes: string[];
  aiAnalysis: AIAnalysisResult;
  healthTier: HealthTier;
  riskFactors: string[];
  recommendations: CarrierRecommendation[];
  decisionTreeId?: string;
  sessionDurationSeconds?: number;
  notes?: string;
}

// ============================================================================
// Category Types
// ============================================================================

export type ConditionCategory =
  | "cardiovascular"
  | "metabolic"
  | "cancer"
  | "respiratory"
  | "mental_health"
  | "gastrointestinal"
  | "neurological"
  | "autoimmune"
  | "renal"
  | "substance"
  | "endocrine"
  | "infectious";

export const CONDITION_CATEGORY_LABELS: Record<ConditionCategory, string> = {
  cardiovascular: "Cardiovascular",
  metabolic: "Metabolic",
  cancer: "Cancer",
  respiratory: "Respiratory",
  mental_health: "Mental Health",
  gastrointestinal: "Gastrointestinal",
  neurological: "Neurological",
  autoimmune: "Autoimmune",
  renal: "Kidney",
  substance: "Substance Use",
  endocrine: "Endocrine",
  infectious: "Infectious Disease",
};

// ============================================================================
// Carrier Underwriting Criteria Types (AI Extraction)
// SYNC: ExtractedCriteria must match supabase/functions/underwriting-ai-analyze/criteria-evaluator.ts
// When updating ExtractedCriteria, update both locations.
// ============================================================================

export type CarrierUnderwritingCriteria =
  Database["public"]["Tables"]["carrier_underwriting_criteria"]["Row"];
export type CarrierUnderwritingCriteriaInsert =
  Database["public"]["Tables"]["carrier_underwriting_criteria"]["Insert"];
export type CarrierUnderwritingCriteriaUpdate =
  Database["public"]["Tables"]["carrier_underwriting_criteria"]["Update"];

export type ExtractionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";
export type ReviewStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_revision";

export interface ExtractedCriteria {
  ageLimits?: {
    minIssueAge: number;
    maxIssueAge: number;
  };
  faceAmountLimits?: {
    minimum: number;
    maximum: number;
    ageTiers?: Array<{
      minAge: number;
      maxAge: number;
      maxFaceAmount: number;
    }>;
  };
  knockoutConditions?: {
    conditionCodes: string[];
    descriptions: Array<{
      code: string;
      name: string;
      severity: string;
    }>;
  };
  buildRequirements?: {
    type: "height_weight" | "bmi";
    preferredPlusBmiMax?: number;
    preferredBmiMax?: number;
    standardBmiMax?: number;
  };
  tobaccoRules?: {
    smokingClassifications: Array<{
      classification: string;
      requiresCleanMonths: number;
    }>;
    nicotineTestRequired: boolean;
  };
  medicationRestrictions?: {
    insulin?: { allowed: boolean; ratingImpact?: string };
    bloodThinners?: { allowed: boolean };
    opioids?: { allowed: boolean; timeSinceUse?: number };
    bpMedications?: { maxCount: number };
    cholesterolMedications?: { maxCount: number };
    antidepressants?: { allowed: boolean };
  };
  stateAvailability?: {
    availableStates: string[];
    unavailableStates: string[];
  };
}

export interface SourceExcerpt {
  field: string;
  excerpt: string;
  pageNumber?: number;
}

export interface CriteriaWithRelations extends CarrierUnderwritingCriteria {
  carrier?: { id: string; name: string };
  guide?: { id: string; name: string };
  product?: { id: string; name: string };
  reviewer?: { id: string; full_name: string | null };
}

export interface ExtractionResponse {
  success: boolean;
  criteriaId?: string;
  guideId?: string;
  confidence?: number;
  chunksProcessed?: number;
  totalChunks?: number;
  elapsed?: number;
  error?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export function calculateBMI(
  heightFeet: number,
  heightInches: number,
  weightLbs: number,
): number {
  const totalInches = heightFeet * 12 + heightInches;
  if (totalInches <= 0 || weightLbs <= 0) return 0;
  // BMI formula: (weight in lbs * 703) / (height in inches)^2
  return (
    Math.round(((weightLbs * 703) / (totalInches * totalInches)) * 10) / 10
  );
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obese Class I";
  if (bmi < 40) return "Obese Class II";
  return "Obese Class III";
}

export function getHealthTierLabel(tier: HealthTier): string {
  const labels: Record<HealthTier, string> = {
    preferred_plus: "Preferred Plus",
    preferred: "Preferred",
    standard_plus: "Standard Plus",
    standard: "Standard",
    substandard: "Substandard",
    table_rated: "Table Rated",
    decline: "Decline",
  };
  return labels[tier] || tier;
}

// ============================================================================
// Carrier Types (for Decision Tree Editor)
// ============================================================================

export interface CarrierWithProducts {
  id: string;
  name: string;
  products: Array<{
    id: string;
    name: string;
    product_type: string;
  }>;
}

// US States for dropdown
export const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
] as const;
