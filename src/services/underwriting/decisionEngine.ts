// src/services/underwriting/decisionEngine.ts
// 4-Stage Recommendation Engine for Product Recommendations
// Stage 1: Eligibility Filter (products table + extracted_criteria) - Now with tri-state
// Stage 2: Approval Scoring (rule engine v2 with compound predicates)
// Stage 3: Premium Calculation (premium_matrix with interpolation)
// Stage 4: Ranking & Explanation - With derived confidence penalty

// Debug flag - set to false in production to suppress verbose logging
const DEBUG_DECISION_ENGINE =
  import.meta.env.DEV && import.meta.env.VITE_DEBUG_DECISION_ENGINE === "true";

import { supabase } from "@/services/base/supabase";
import type { Database } from "@/types/database.types";
import type {
  ExtractedCriteria,
  EligibilityStatus,
  EligibilityResult,
  MissingFieldInfo,
  ScoreComponents,
  DraftRuleInfo,
  AcceptanceDecision as TypesAcceptanceDecision,
  RuleProvenance,
} from "@/features/underwriting/types/underwriting.types";
import {
  lookupAcceptance,
  getDraftRulesForConditions,
  type AcceptanceDecision,
} from "./acceptanceService";
import {
  getPremiumMatrixForProduct,
  interpolatePremium,
  getAvailableTermsForAge,
  getLongestAvailableTermForAge,
  calculateAlternativeQuotes,
  getComparisonFaceAmounts,
  type GenderType,
  type TobaccoClass,
  type HealthClass,
  type TermYears,
  type RateableHealthClass,
  type PremiumLookupResult,
  type AlternativeQuote,
  type PremiumMatrix,
} from "./premiumMatrixService";
import { calculateDataCompleteness } from "./conditionMatcher";
import { calculateApprovalV2 } from "./ruleEngineV2Adapter";

// Re-export for convenience
export type { GenderType, AcceptanceDecision };

// ============================================================================
// Types
// ============================================================================

type ProductType = Database["public"]["Enums"]["product_type"];

export interface ClientProfile {
  age: number;
  gender: GenderType;
  state?: string;
  bmi?: number;
  tobacco: boolean;
  healthConditions: string[]; // condition codes
  /** Per-condition follow-up responses (for data completeness assessment) */
  conditionResponses?: Record<string, Record<string, unknown>>;
}

export interface CoverageRequest {
  faceAmount: number;
  /** User-specified face amounts for quote comparison. If provided, these are used instead of auto-generated amounts. */
  faceAmounts?: number[];
  productTypes?: ProductType[];
}

export interface DecisionEngineInput {
  client: ClientProfile;
  coverage: CoverageRequest;
  imoId: string;
  /** Optional preferred term length. If not provided, uses longest available term. */
  termYears?: number | null;
}

export interface ProductMetadata {
  ageTieredFaceAmounts?: {
    tiers: Array<{
      minAge: number;
      maxAge: number;
      maxFaceAmount: number;
      // Term-specific restrictions within this age tier
      termRestrictions?: Array<{
        termYears: number;
        maxFaceAmount: number;
      }>;
    }>;
  };
  knockoutConditions?: string[];
  fullUnderwritingThreshold?: number;
  stateAvailability?: string[];
}

export interface ProductCandidate {
  productId: string;
  productName: string;
  carrierId: string;
  carrierName: string;
  productType: ProductType;
  minAge: number | null;
  maxAge: number | null;
  minFaceAmount: number | null;
  maxFaceAmount: number | null;
  metadata: ProductMetadata | null;
}

interface ConditionDecision {
  conditionCode: string;
  decision: AcceptanceDecision;
  likelihood: number;
  healthClassResult: string | null;
  /** Whether this rule is from an approved (reviewed) source */
  isApproved: boolean;
  /** Source provenance for the rule */
  provenance?: RuleProvenance;
}

export interface Recommendation {
  carrierId: string;
  carrierName: string;
  productId: string;
  productName: string;
  productType: ProductType;
  monthlyPremium: number | null;
  maxCoverage: number;
  approvalLikelihood: number;
  healthClassResult: string;
  /** Normalized health class requested for premium lookup */
  healthClassRequested?: RateableHealthClass;
  /** Actual health class used in premium lookup (if fallback occurred) */
  healthClassUsed?: RateableHealthClass;
  /** True if health class fallback was used (different from requested) */
  wasFallback?: boolean;
  /** Term length in years used for premium lookup (null for permanent products) */
  termYears?: number | null;
  /** Available term lengths for this product (sorted ascending) */
  availableTerms?: number[];
  /** Alternative quotes at different face amounts (same term as primary quote) */
  alternativeQuotes?: {
    faceAmount: number;
    monthlyPremium: number;
    costPerThousand: number;
  }[];
  reason:
    | "cheapest"
    | "highest_coverage"
    | "best_approval"
    | "best_value"
    | null;
  concerns: string[];
  conditionDecisions: ConditionDecision[];
  score: number;
  /** Tri-state eligibility status for this product */
  eligibilityStatus: EligibilityStatus;
  /** Reasons for the eligibility determination */
  eligibilityReasons: string[];
  /** Fields that are missing and needed for full evaluation */
  missingFields: MissingFieldInfo[];
  /** Data completeness confidence (0-1) */
  confidence: number;
  /** Breakdown of how the score was calculated */
  scoreComponents: ScoreComponents;
  /** Draft rules shown for FYI only (not used in scoring) */
  draftRulesFyi: DraftRuleInfo[];
}

export interface DecisionEngineResult {
  recommendations: Recommendation[];
  /** Products with unknown eligibility (kept in results but ranked lower) */
  unknownEligibility: Recommendation[];
  filtered: {
    totalProducts: number;
    passedEligibility: number;
    unknownEligibility: number;
    passedAcceptance: number;
    withPremiums: number;
    ineligible: number;
  };
  processingTime: number;
}

// ============================================================================
// Stage 1: Eligibility Filter
// ============================================================================

/**
 * Calculate the maximum face amount for a given age and term, considering:
 * 1. Product-level maxFaceAmount
 * 2. Age-tiered constraints from metadata
 * 3. Term-specific restrictions within age tiers
 *
 * @param metadata - Product metadata with age-tiered constraints
 * @param productMaxFace - Product-level max face amount (fallback)
 * @param clientAge - Client's age
 * @param termYears - Selected term (null for permanent products)
 * @returns Maximum allowed face amount
 */
function getMaxFaceAmountForAgeTerm(
  metadata: ProductMetadata | null | undefined,
  productMaxFace: number | null | undefined,
  clientAge: number,
  termYears: number | null | undefined,
): number {
  let maxFace = productMaxFace ?? Number.MAX_SAFE_INTEGER;

  if (!metadata?.ageTieredFaceAmounts?.tiers) {
    return maxFace;
  }

  for (const tier of metadata.ageTieredFaceAmounts.tiers) {
    if (clientAge >= tier.minAge && clientAge <= tier.maxAge) {
      // Start with the tier's base max face amount
      let tierMax = tier.maxFaceAmount;

      // Check for term-specific restrictions within this tier
      if (termYears && tier.termRestrictions) {
        for (const termRestriction of tier.termRestrictions) {
          if (termRestriction.termYears === termYears) {
            // Use the more restrictive term-specific limit
            tierMax = Math.min(tierMax, termRestriction.maxFaceAmount);
          }
        }
      }

      maxFace = Math.min(maxFace, tierMax);
    }
  }

  return maxFace;
}

/**
 * Check if a product is eligible for the client.
 * Returns tri-state: eligible, ineligible, or unknown (when missing data).
 */
function checkEligibility(
  product: ProductCandidate,
  client: ClientProfile,
  coverage: CoverageRequest,
  extractedCriteria?: ExtractedCriteria,
  _requiredFieldsByCondition?: Record<string, string[]>,
  termYears?: number | null,
): EligibilityResult {
  const ineligibleReasons: string[] = [];
  const missingFields: MissingFieldInfo[] = [];

  // Check basic product constraints (from products table)
  const minAge = product.minAge ?? 0;
  const maxAge = product.maxAge ?? 100;

  if (client.age < minAge) {
    ineligibleReasons.push(`Client age ${client.age} below minimum ${minAge}`);
  }
  if (client.age > maxAge) {
    ineligibleReasons.push(`Client age ${client.age} above maximum ${maxAge}`);
  }

  const minFace = product.minFaceAmount ?? 0;
  // Use helper function that considers age tier AND term restrictions
  const maxFace = getMaxFaceAmountForAgeTerm(
    product.metadata,
    product.maxFaceAmount,
    client.age,
    termYears,
  );

  if (coverage.faceAmount < minFace) {
    ineligibleReasons.push(
      `Requested $${coverage.faceAmount.toLocaleString()} below minimum`,
    );
  }
  if (coverage.faceAmount > maxFace && maxFace < Number.MAX_SAFE_INTEGER) {
    const termInfo = termYears ? ` for ${termYears}yr term` : "";
    ineligibleReasons.push(
      `Requested $${coverage.faceAmount.toLocaleString()} exceeds max $${maxFace.toLocaleString()} for age ${client.age}${termInfo}`,
    );
  }

  // Check extracted criteria if available (more sophisticated)
  if (extractedCriteria) {
    // Age limits from extracted criteria
    if (extractedCriteria.ageLimits) {
      const { minIssueAge, maxIssueAge } = extractedCriteria.ageLimits;
      if (minIssueAge !== undefined && client.age < minIssueAge) {
        if (!ineligibleReasons.some((r) => r.includes("below minimum"))) {
          ineligibleReasons.push(
            `Age ${client.age} below issue age ${minIssueAge}`,
          );
        }
      }
      if (maxIssueAge !== undefined && client.age > maxIssueAge) {
        if (!ineligibleReasons.some((r) => r.includes("above maximum"))) {
          ineligibleReasons.push(
            `Age ${client.age} above issue age ${maxIssueAge}`,
          );
        }
      }
    }

    // Face amount with age tiers (key feature)
    if (extractedCriteria.faceAmountLimits) {
      const { minimum, maximum, ageTiers } = extractedCriteria.faceAmountLimits;

      if (minimum !== undefined && coverage.faceAmount < minimum) {
        if (!ineligibleReasons.some((r) => r.includes("below minimum"))) {
          ineligibleReasons.push(
            `Amount below minimum $${minimum.toLocaleString()}`,
          );
        }
      }

      // Check age-specific face amount limits
      let ageSpecificMax = maximum ?? Number.MAX_SAFE_INTEGER;
      if (ageTiers && ageTiers.length > 0) {
        for (const tier of ageTiers) {
          if (client.age >= tier.minAge && client.age <= tier.maxAge) {
            ageSpecificMax = Math.min(ageSpecificMax, tier.maxFaceAmount);
          }
        }
      }

      if (
        coverage.faceAmount > ageSpecificMax &&
        ageSpecificMax < Number.MAX_SAFE_INTEGER
      ) {
        ineligibleReasons.push(
          `$${coverage.faceAmount.toLocaleString()} exceeds age-based max $${ageSpecificMax.toLocaleString()}`,
        );
      }
    }

    // Knockout conditions
    if (extractedCriteria.knockoutConditions?.conditionCodes) {
      const knockouts = client.healthConditions.filter((c) =>
        extractedCriteria.knockoutConditions!.conditionCodes!.includes(c),
      );
      if (knockouts.length > 0) {
        ineligibleReasons.push(`Knockout condition: ${knockouts.join(", ")}`);
      }
    }

    // State availability
    if (
      client.state &&
      extractedCriteria.stateAvailability?.unavailableStates
    ) {
      if (
        extractedCriteria.stateAvailability.unavailableStates.includes(
          client.state,
        )
      ) {
        ineligibleReasons.push(`Not available in ${client.state}`);
      }
    }
  }

  // Check data completeness for conditions
  // Collect required fields across all conditions
  const allRequiredFields: string[] = [];
  const allResponses: Record<string, unknown> = {};

  for (const conditionCode of client.healthConditions) {
    const responses = client.conditionResponses?.[conditionCode] || {};
    Object.entries(responses).forEach(([key, value]) => {
      allResponses[`${conditionCode}.${key}`] = value;
    });
    // Note: In a full implementation, we'd look up required fields from
    // carrier_condition_acceptance.required_fields for this carrier/condition
    // For now, we mark as unknown if there are conditions but no responses
    if (
      client.conditionResponses &&
      Object.keys(client.conditionResponses[conditionCode] || {}).length === 0
    ) {
      missingFields.push({
        field: `${conditionCode}.follow_up`,
        reason: `Missing follow-up details for ${conditionCode}`,
        conditionCode,
      });
    }
  }

  // Calculate data completeness
  const completeness = calculateDataCompleteness(
    allResponses,
    allRequiredFields,
  );

  // Determine final eligibility status
  if (ineligibleReasons.length > 0) {
    return {
      status: "ineligible",
      reasons: ineligibleReasons,
      missingFields: [],
      confidence: 1, // We're confident about ineligibility
    };
  }

  if (missingFields.length > 0) {
    return {
      status: "unknown",
      reasons: ["Missing required follow-up information"],
      missingFields,
      confidence: completeness.confidence,
    };
  }

  return {
    status: "eligible",
    reasons: [],
    missingFields: [],
    confidence: 1,
  };
}

// ============================================================================
// Stage 2: Approval Scoring
// ============================================================================

/**
 * Calculate approval likelihood based on carrier acceptance rules.
 * Only uses approved rules for scoring; collects draft rules for FYI display.
 * @deprecated Use calculateApprovalV2 instead. Kept for type reference.
 */
async function _calculateApproval(
  carrierId: string,
  productType: ProductType,
  healthConditions: string[],
  imoId: string,
): Promise<{
  likelihood: number;
  healthClass: HealthClass;
  conditionDecisions: ConditionDecision[];
  concerns: string[];
  draftRules: DraftRuleInfo[];
}> {
  const conditionDecisions: ConditionDecision[] = [];
  const concerns: string[] = [];
  const draftRules: DraftRuleInfo[] = [];

  // No conditions = healthy client
  if (healthConditions.length === 0) {
    return {
      likelihood: 0.95,
      healthClass: "preferred",
      conditionDecisions: [],
      concerns: [],
      draftRules: [],
    };
  }

  // Fetch draft rules for FYI display (does not affect scoring)
  try {
    const drafts = await getDraftRulesForConditions(
      carrierId,
      healthConditions,
      imoId,
    );
    for (const draft of drafts) {
      draftRules.push({
        conditionCode: draft.condition_code,
        decision: draft.acceptance as TypesAcceptanceDecision,
        reviewStatus:
          (draft.review_status as DraftRuleInfo["reviewStatus"]) || "draft",
        source: draft.source_snippet || undefined,
      });
    }
  } catch (e) {
    // Non-critical: log but continue
    console.warn("Failed to fetch draft rules for FYI:", e);
  }

  // Evaluate each condition using only approved rules
  for (const conditionCode of healthConditions) {
    // lookupAcceptance defaults to approved rules only
    const acceptance = await lookupAcceptance(
      carrierId,
      conditionCode,
      imoId,
      productType,
    );

    if (acceptance) {
      // Build provenance if available
      const provenance: RuleProvenance | undefined =
        acceptance.source_guide_id ||
        acceptance.source_pages ||
        acceptance.source_snippet
          ? {
              guideId: acceptance.source_guide_id ?? undefined,
              pages: acceptance.source_pages ?? undefined,
              snippet: acceptance.source_snippet ?? undefined,
              confidence: acceptance.extraction_confidence ?? undefined,
              reviewStatus:
                (acceptance.review_status as RuleProvenance["reviewStatus"]) ||
                "approved",
            }
          : undefined;

      conditionDecisions.push({
        conditionCode,
        decision: acceptance.acceptance as AcceptanceDecision,
        likelihood: acceptance.approval_likelihood ?? 0.5,
        healthClassResult: acceptance.health_class_result,
        isApproved: true, // We only get approved rules here
        provenance,
      });

      if (acceptance.acceptance === "declined") {
        concerns.push(`${conditionCode}: declined`);
      } else if (acceptance.acceptance === "case_by_case") {
        concerns.push(`${conditionCode}: requires review`);
      } else if (acceptance.acceptance === "table_rated") {
        concerns.push(`${conditionCode}: table rated`);
      }
    } else {
      // No approved rule found
      conditionDecisions.push({
        conditionCode,
        decision: "case_by_case",
        likelihood: 0.5,
        healthClassResult: null,
        isApproved: false, // No rule = not approved
      });
      concerns.push(`${conditionCode}: no approved rule found`);
    }
  }

  // Check for declined
  if (conditionDecisions.some((d) => d.decision === "declined")) {
    return {
      likelihood: 0,
      healthClass: "standard",
      conditionDecisions,
      concerns,
      draftRules,
    };
  }

  // Calculate overall likelihood (minimum)
  const likelihood = Math.min(...conditionDecisions.map((d) => d.likelihood));

  // Determine health class
  const healthClass = determineHealthClass(conditionDecisions);

  return { likelihood, healthClass, conditionDecisions, concerns, draftRules };
}

/**
 * Determine health class based on condition decisions
 */
function determineHealthClass(
  conditionDecisions: ConditionDecision[],
): HealthClass {
  const healthClasses: HealthClass[] = [
    "preferred_plus",
    "preferred",
    "standard_plus",
    "standard",
    "table_rated",
  ];
  let worstIndex = 0;

  for (const decision of conditionDecisions) {
    if (decision.healthClassResult) {
      const healthResult = decision.healthClassResult.startsWith("table_")
        ? "table_rated"
        : (decision.healthClassResult as HealthClass);

      const index = healthClasses.indexOf(healthResult);
      if (index > worstIndex) {
        worstIndex = index;
      }
    }
  }

  return healthClasses[worstIndex];
}

// ============================================================================
// Stage 3: Premium Calculation
// ============================================================================

/**
 * Get premium from premium_matrix with interpolation and health class fallback.
 * Returns the premium result with metadata about the health class used.
 */
async function getPremium(
  productId: string,
  age: number,
  gender: GenderType,
  tobacco: boolean,
  healthClass: string, // Raw health class from Stage 2 (will be normalized)
  faceAmount: number,
  imoId: string,
  termYears?: number | null,
  /** Optional pre-fetched matrix to avoid duplicate DB query */
  prefetchedMatrix?: PremiumMatrix[],
): Promise<PremiumLookupResult> {
  try {
    // Use pre-fetched matrix if provided, otherwise fetch (backward compatibility)
    const matrix =
      prefetchedMatrix ?? (await getPremiumMatrixForProduct(productId, imoId));

    if (!matrix || matrix.length === 0) {
      return { premium: null, reason: "NO_MATRIX" };
    }

    const tobaccoClass: TobaccoClass = tobacco ? "tobacco" : "non_tobacco";

    // If termYears not specified, try to find matching term from available data
    let effectiveTermYears: TermYears | null | undefined = termYears as
      | TermYears
      | null
      | undefined;
    if (effectiveTermYears === undefined) {
      // Check what term years are available in the matrix
      const availableTerms = [...new Set(matrix.map((m) => m.term_years))];
      if (availableTerms.length === 1 && availableTerms[0] === null) {
        // All rows have null term_years - this is a permanent product
        effectiveTermYears = null;
      } else if (!availableTerms.includes(null)) {
        // No null term_years - this is a term product, use default 20 years
        // or the most common available term
        const preferredTerms: TermYears[] = [20, 10, 15, 25, 30];
        const matchedTerm = preferredTerms.find((t) =>
          availableTerms.includes(t),
        );
        effectiveTermYears =
          matchedTerm ||
          (availableTerms.filter((t): t is TermYears => t !== null)[0] as
            | TermYears
            | undefined) ||
          20;
      }
    }

    return interpolatePremium(
      matrix,
      age,
      faceAmount,
      gender,
      tobaccoClass,
      healthClass,
      effectiveTermYears,
    );
  } catch (error) {
    console.error("Error getting premium:", error);
    return { premium: null, reason: "NO_MATCHING_RATES" };
  }
}

// ============================================================================
// Stage 4: Ranking & Main Entry Point
// ============================================================================

/**
 * Get all products
 */
async function getProducts(
  input: DecisionEngineInput,
): Promise<ProductCandidate[]> {
  const { coverage, imoId } = input;

  let query = supabase
    .from("products")
    .select(
      `
      id, name, product_type, min_age, max_age,
      min_face_amount, max_face_amount, carrier_id, metadata,
      carriers!inner(id, name)
    `,
    )
    .eq("is_active", true);

  if (coverage.productTypes && coverage.productTypes.length > 0) {
    query = query.in("product_type", coverage.productTypes);
  }

  query = query.or(`imo_id.eq.${imoId},imo_id.is.null`);

  const { data: products, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`);
  }

  return (products || []).map((p) => {
    const carrier = p.carriers as unknown as {
      id: string;
      name: string;
    } | null;
    return {
      productId: p.id,
      productName: p.name,
      carrierId: p.carrier_id,
      carrierName: carrier?.name || "Unknown",
      productType: p.product_type,
      minAge: p.min_age,
      maxAge: p.max_age,
      minFaceAmount: p.min_face_amount,
      maxFaceAmount: p.max_face_amount,
      metadata: (p.metadata as ProductMetadata) || null,
    };
  });
}

/**
 * Get extracted criteria for a product
 * Uses carrier_underwriting_criteria table with criteria column
 */
async function getExtractedCriteria(
  productId: string,
): Promise<ExtractedCriteria | undefined> {
  const { data, error } = await supabase
    .from("carrier_underwriting_criteria")
    .select("criteria")
    .eq("product_id", productId)
    .eq("review_status", "approved")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching extracted criteria:", error);
    return undefined;
  }

  return data?.criteria as unknown as ExtractedCriteria | undefined;
}

/**
 * Calculate composite score for ranking.
 * Applies derived confidence penalty for unknown eligibility products.
 *
 * @param approvalLikelihood - Likelihood of approval (0-1)
 * @param monthlyPremium - Monthly premium amount
 * @param maxPremium - Maximum premium in the result set (for normalization)
 * @param eligibilityStatus - Tri-state eligibility: eligible, unknown, ineligible
 * @param dataConfidence - Data completeness confidence (0-1)
 * @returns Score components including final score with penalty applied
 */
function calculateScore(
  approvalLikelihood: number,
  monthlyPremium: number | null,
  maxPremium: number,
  eligibilityStatus: EligibilityStatus,
  dataConfidence: number,
): ScoreComponents {
  // Price score: 1 = cheapest, 0 = most expensive
  const priceScore =
    maxPremium > 0 && monthlyPremium !== null
      ? 1 - monthlyPremium / maxPremium
      : 0.5;

  // Derived confidence multiplier for unknown eligibility
  // Range: 0.5 to 1.0 based on data completeness
  // If eligible, no penalty (multiplier = 1)
  // If unknown, penalty based on how much data is missing
  const confidenceMultiplier =
    eligibilityStatus === "unknown"
      ? 0.5 + dataConfidence * 0.5 // Range: 0.5 to 1.0
      : 1.0;

  // Returns components; caller computes:
  // rawScore = likelihood * 0.4 + priceScore * 0.6
  // finalScore = rawScore * confidenceMultiplier

  return {
    likelihood: approvalLikelihood,
    priceScore,
    dataConfidence,
    confidenceMultiplier,
  };
}

/**
 * Main entry point: Get product recommendations.
 * Now supports tri-state eligibility and keeps unknown products in results.
 */
export async function getRecommendations(
  input: DecisionEngineInput,
): Promise<DecisionEngineResult> {
  const startTime = Date.now();
  const { client, coverage, imoId } = input;

  // Validate required inputs
  if (!imoId || typeof imoId !== "string" || imoId.length < 10) {
    throw new Error("Invalid imoId: must be a valid UUID string");
  }

  if (
    !client ||
    typeof client.age !== "number" ||
    client.age < 0 ||
    client.age > 120
  ) {
    throw new Error("Invalid client age: must be between 0 and 120");
  }

  if (
    !coverage ||
    typeof coverage.faceAmount !== "number" ||
    coverage.faceAmount <= 0
  ) {
    throw new Error("Invalid coverage amount: must be a positive number");
  }

  const stats = {
    totalProducts: 0,
    passedEligibility: 0,
    unknownEligibility: 0,
    passedAcceptance: 0,
    withPremiums: 0,
    ineligible: 0,
  };

  const products = await getProducts(input);
  stats.totalProducts = products.length;

  // Internal type for evaluated products
  interface EvaluatedProduct {
    product: ProductCandidate;
    eligibility: EligibilityResult;
    approval: Awaited<ReturnType<typeof _calculateApproval>>;
    premium: number | null;
    /** Normalized health class requested for premium lookup */
    healthClassRequested?: RateableHealthClass;
    /** Actual health class used in premium lookup (if fallback occurred) */
    healthClassUsed?: RateableHealthClass;
    /** True if health class fallback was used */
    wasFallback?: boolean;
    /** Term length in years used for premium lookup (null for permanent products) */
    termYears?: number | null;
    /** Available term lengths for this product */
    availableTerms?: number[];
    /** Alternative quotes at different face amounts */
    alternativeQuotes?: {
      faceAmount: number;
      monthlyPremium: number;
      costPerThousand: number;
    }[];
    maxCoverage: number;
    scoreComponents: ScoreComponents;
    finalScore: number;
  }

  const eligibleProducts: EvaluatedProduct[] = [];
  const unknownProducts: EvaluatedProduct[] = [];

  for (const product of products) {
    // ==========================================================================
    // FIX 3: DETERMINE TERM BEFORE ELIGIBILITY
    // We must determine the effective term FIRST, then use it consistently for
    // both eligibility checking AND premium lookup. This prevents the bug where
    // eligibility passes with undefined term (using base limits) but pricing
    // uses a specific term with stricter limits.
    // ==========================================================================

    // OPTIMIZATION: Start both matrix and criteria fetches in parallel
    // Matrix is awaited immediately for term calculations, criteria awaited later
    const matrixPromise = getPremiumMatrixForProduct(product.productId, imoId);
    const criteriaPromise = getExtractedCriteria(product.productId);

    // Get the premium matrix FIRST to determine available terms
    const matrix = await matrixPromise;
    const availableTerms = getAvailableTermsForAge(matrix, client.age);
    const longestTerm = getLongestAvailableTermForAge(matrix, client.age);

    // Check if this is a permanent product (all matrix rows have term_years === null)
    const isPermanentProduct =
      matrix.length > 0 && matrix.every((row) => row.term_years === null);

    // Skip product if no terms are available for this age (only for term products)
    if (
      availableTerms.length === 0 &&
      matrix.length > 0 &&
      !isPermanentProduct
    ) {
      if (DEBUG_DECISION_ENGINE) {
        console.log(
          `[DecisionEngine] Skipping ${product.productName}: No terms available for age ${client.age}`,
        );
      }
      stats.ineligible++;
      continue;
    }

    // Determine effective term for BOTH eligibility AND pricing:
    // 1. For permanent products, use null (no term)
    // 2. If input.termYears is specified and available, use it
    // 3. Otherwise fall back to longest available term
    let effectiveTermYears: TermYears | null = isPermanentProduct
      ? null
      : longestTerm;

    if (
      !isPermanentProduct &&
      input.termYears !== undefined &&
      input.termYears !== null
    ) {
      if (availableTerms.includes(input.termYears)) {
        effectiveTermYears = input.termYears as TermYears;
      } else {
        // Requested term not available for this age - skip this product
        if (DEBUG_DECISION_ENGINE) {
          console.log(
            `[DecisionEngine] Skipping ${product.productName}: Requested term ${input.termYears}yr not available for age ${client.age}. Available: [${availableTerms.join(", ")}]`,
          );
        }
        stats.ineligible++;
        continue;
      }
    }

    // Debug: Log term determination
    if (DEBUG_DECISION_ENGINE) {
      console.log(
        `[DecisionEngine] Term determined for ${product.productName}:`,
        {
          inputTermYears: input.termYears,
          effectiveTermYears,
          availableTerms,
          isPermanentProduct,
          maxFaceAmount: product.maxFaceAmount,
          ageTieredFaceAmounts: product.metadata?.ageTieredFaceAmounts,
        },
      );
    }

    // Stage 1: Eligibility (tri-state)
    // CRITICAL: Pass effectiveTermYears (not input.termYears) to enforce
    // term-specific face amount restrictions consistently
    const criteria = await criteriaPromise; // Await the parallel fetch
    const eligibility = checkEligibility(
      product,
      client,
      coverage,
      criteria,
      undefined, // requiredFieldsByCondition
      effectiveTermYears, // Use same term for eligibility AND pricing
    );

    // Handle tri-state eligibility
    if (eligibility.status === "ineligible") {
      stats.ineligible++;
      continue; // Skip ineligible products entirely
    }

    if (eligibility.status === "unknown") {
      stats.unknownEligibility++;
    } else {
      stats.passedEligibility++;
    }

    // Stage 2: Approval (uses rule engine v2 with compound predicates)
    const approval = await calculateApprovalV2({
      carrierId: product.carrierId,
      productId: product.productId,
      imoId,
      healthConditions: client.healthConditions,
      client: {
        age: client.age,
        gender: client.gender as "male" | "female",
        state: client.state,
        bmi: client.bmi,
        tobacco: client.tobacco,
        healthConditions: client.healthConditions,
        conditionResponses: client.conditionResponses,
      },
    });

    // For unknown eligibility, we don't skip on low likelihood
    // For eligible products, skip if likelihood is 0 (declined)
    if (eligibility.status === "eligible" && approval.likelihood === 0) {
      stats.ineligible++;
      continue;
    }
    stats.passedAcceptance++;

    // Stage 3: Premium & Alternative Quotes
    // Use the same effectiveTermYears determined above
    const premiumLookupParams = {
      productId: product.productId,
      productName: product.productName,
      age: client.age,
      gender: client.gender,
      tobaccoClass: client.tobacco ? "tobacco" : "non_tobacco",
      healthClass: approval.healthClass,
      faceAmount: coverage.faceAmount,
      imoId,
      termYears: effectiveTermYears,
    };
    if (DEBUG_DECISION_ENGINE) {
      console.log(
        `[DecisionEngine Stage 3] Attempting premium lookup:`,
        premiumLookupParams,
      );
    }

    // termForQuotes is now effectiveTermYears (already determined above)
    const termForQuotes = effectiveTermYears;

    // Debug: Log product metadata to verify age-tiered constraints
    if (DEBUG_DECISION_ENGINE) {
      console.log(
        `[DecisionEngine Stage 3] Product metadata for ${product.productName}:`,
        {
          maxFaceAmount: product.maxFaceAmount,
          ageTieredFaceAmounts: product.metadata?.ageTieredFaceAmounts,
          hasMetadata: !!product.metadata,
          availableTermsForAge: availableTerms,
          isPermanentProduct,
          effectiveTermYears,
        },
      );
    }

    const premiumResult = await getPremium(
      product.productId,
      client.age,
      client.gender,
      client.tobacco,
      approval.healthClass,
      coverage.faceAmount,
      imoId,
      termForQuotes, // Use effectiveTermYears for both eligibility and pricing
      matrix, // Pass pre-fetched matrix to avoid duplicate DB query
    );

    // Extract premium and health class metadata from result
    const premium = premiumResult.premium;
    const healthClassRequested =
      premiumResult.premium !== null ? premiumResult.requested : undefined;
    const healthClassUsed =
      premiumResult.premium !== null ? premiumResult.used : undefined;
    const wasFallback =
      premiumResult.premium !== null ? !premiumResult.wasExact : undefined;
    const termYearsUsed =
      premiumResult.premium !== null ? premiumResult.termYears : undefined;

    // Debug: Log premium lookup result
    if (DEBUG_DECISION_ENGINE) {
      const matrixHealthClasses = [
        ...new Set(matrix.map((m) => m.health_class)),
      ];
      console.log(
        `[DecisionEngine Stage 3] Premium result for ${product.productName}:`,
        {
          requestedTerm: input.termYears,
          termUsed: termForQuotes,
          availableTerms,
          requestedHealthClass: approval.healthClass,
          healthClassUsed,
          wasFallback,
          premium,
          matrixRowCount: matrix.length,
          matrixFaceAmounts: [
            ...new Set(matrix.map((m) => m.face_amount)),
          ].sort((a, b) => a - b),
          // Show actual health class values in the matrix
          matrixHealthClasses,
          matrixHealthClassesRaw: matrixHealthClasses.join(", "),
        },
      );
    }

    // Calculate alternative quotes at different face amounts
    let alternativeQuotes: AlternativeQuote[] = [];
    if (premium !== null && healthClassUsed) {
      // Calculate age AND term adjusted max face amount using helper
      const ageTermAdjustedMaxFace = getMaxFaceAmountForAgeTerm(
        product.metadata,
        product.maxFaceAmount,
        client.age,
        termForQuotes,
      );

      // Use user-provided faceAmounts if available, otherwise generate comparison amounts
      let comparisonFaceAmounts: number[];
      if (coverage.faceAmounts && coverage.faceAmounts.length > 0) {
        // Filter user's amounts to be within product limits
        const minFace = product.minFaceAmount ?? 0;
        const maxFace = ageTermAdjustedMaxFace;
        comparisonFaceAmounts = coverage.faceAmounts
          .filter((amt) => amt >= minFace && amt <= maxFace)
          .sort((a, b) => a - b);
        // If no amounts fit within limits, use the closest valid amount
        if (comparisonFaceAmounts.length === 0) {
          comparisonFaceAmounts = [
            Math.min(Math.max(coverage.faceAmount, minFace), maxFace),
          ];
        }
      } else {
        comparisonFaceAmounts = getComparisonFaceAmounts(
          coverage.faceAmount,
          product.minFaceAmount,
          ageTermAdjustedMaxFace,
        );
      }

      // Diagnostic logging for alternative quotes calculation
      if (DEBUG_DECISION_ENGINE) {
        console.log(
          `[AlternativeQuotes] ${product.productName} - Age ${client.age}, Term ${termForQuotes ?? "N/A"}yr`,
        );
        console.log(
          `  Global max: $${product.maxFaceAmount?.toLocaleString() ?? "unlimited"}`,
        );
        console.log(
          `  Age+Term adjusted max: $${ageTermAdjustedMaxFace === Number.MAX_SAFE_INTEGER ? "unlimited" : ageTermAdjustedMaxFace.toLocaleString()}`,
        );
        console.log(
          `  Face amounts (${coverage.faceAmounts ? "user-provided" : "auto"}): ${comparisonFaceAmounts.map((f) => `$${f.toLocaleString()}`).join(", ")}`,
        );
      }

      const tobaccoClass: TobaccoClass = client.tobacco
        ? "tobacco"
        : "non_tobacco";
      alternativeQuotes = calculateAlternativeQuotes(
        matrix,
        comparisonFaceAmounts,
        client.age,
        client.gender,
        tobaccoClass,
        healthClassUsed,
        termYearsUsed ?? null,
      );
    }

    if (DEBUG_DECISION_ENGINE) {
      if (premium === null) {
        const reason =
          premiumResult.reason === "NON_RATEABLE_CLASS"
            ? "Health class is non-rateable (decline/refer)"
            : premiumResult.reason === "NO_MATRIX"
              ? "No premium matrix data"
              : "No matching rates after fallback";
        console.warn(
          `[DecisionEngine Stage 3] NO PREMIUM FOUND for ${product.productName}: ${reason}`,
          {
            ...premiumLookupParams,
            reason: premiumResult.reason,
          },
        );
      } else {
        const fallbackInfo = wasFallback
          ? ` (fallback: ${healthClassRequested} → ${healthClassUsed})`
          : "";
        console.log(
          `[DecisionEngine Stage 3] Premium found for ${product.productName}: $${premium}/month${fallbackInfo}`,
          { alternativeQuotes: alternativeQuotes.length },
        );
      }
    }

    // For unknown eligibility, premium can be null (we still keep the product)
    if (eligibility.status === "eligible" && premium === null) {
      continue;
    }
    if (premium !== null) {
      stats.withPremiums++;
    }

    const maxCoverage = product.maxFaceAmount
      ? Math.min(product.maxFaceAmount, coverage.faceAmount)
      : coverage.faceAmount;

    // Calculate score with confidence penalty for unknown eligibility
    const scoreComponents = calculateScore(
      approval.likelihood,
      premium,
      0, // Will recalculate maxPremium later
      eligibility.status,
      eligibility.confidence,
    );

    // Calculate raw score for now (will be adjusted with maxPremium)
    const rawScore =
      approval.likelihood * 0.4 + scoreComponents.priceScore * 0.6;
    const finalScore = rawScore * scoreComponents.confidenceMultiplier;

    const evaluated: EvaluatedProduct = {
      product,
      eligibility,
      approval,
      premium,
      healthClassRequested,
      healthClassUsed,
      wasFallback,
      termYears: termYearsUsed,
      availableTerms,
      alternativeQuotes,
      maxCoverage,
      scoreComponents,
      finalScore,
    };

    if (eligibility.status === "eligible") {
      eligibleProducts.push(evaluated);
    } else {
      unknownProducts.push(evaluated);
    }
  }

  // Recalculate scores with proper maxPremium
  const allWithPremiums = [...eligibleProducts, ...unknownProducts].filter(
    (e) => e.premium !== null,
  );
  const maxPremium =
    allWithPremiums.length > 0
      ? Math.max(...allWithPremiums.map((e) => e.premium!))
      : 0;

  // Recalculate with actual maxPremium
  const recalculate = (e: EvaluatedProduct): EvaluatedProduct => {
    const scoreComponents = calculateScore(
      e.approval.likelihood,
      e.premium,
      maxPremium,
      e.eligibility.status,
      e.eligibility.confidence,
    );
    const rawScore =
      e.approval.likelihood * 0.4 + scoreComponents.priceScore * 0.6;
    const finalScore = rawScore * scoreComponents.confidenceMultiplier;
    return { ...e, scoreComponents, finalScore };
  };

  const scoredEligible = eligibleProducts.map(recalculate);
  const scoredUnknown = unknownProducts.map(recalculate);

  // Sort by final score
  scoredEligible.sort((a, b) => b.finalScore - a.finalScore);
  scoredUnknown.sort((a, b) => b.finalScore - a.finalScore);

  // Helper to convert EvaluatedProduct to Recommendation
  const toRecommendation = (
    e: EvaluatedProduct,
    reason: Recommendation["reason"],
  ): Recommendation => ({
    carrierId: e.product.carrierId,
    carrierName: e.product.carrierName,
    productId: e.product.productId,
    productName: e.product.productName,
    productType: e.product.productType,
    monthlyPremium: e.premium,
    maxCoverage: e.maxCoverage,
    approvalLikelihood: e.approval.likelihood,
    healthClassResult: e.approval.healthClass,
    healthClassRequested: e.healthClassRequested,
    healthClassUsed: e.healthClassUsed,
    wasFallback: e.wasFallback,
    termYears: e.termYears,
    availableTerms: e.availableTerms,
    alternativeQuotes: e.alternativeQuotes,
    reason,
    concerns: e.approval.concerns,
    conditionDecisions: e.approval.conditionDecisions,
    score: e.finalScore,
    eligibilityStatus: e.eligibility.status,
    eligibilityReasons: e.eligibility.reasons,
    missingFields: e.eligibility.missingFields,
    confidence: e.eligibility.confidence,
    scoreComponents: e.scoreComponents,
    draftRulesFyi: e.approval.draftRules,
  });

  // Build recommendations from eligible products
  const recommendations: Recommendation[] = [];
  const seen = new Set<string>();

  // Best value (highest score among eligible)
  if (scoredEligible.length > 0) {
    const best = scoredEligible[0];
    seen.add(best.product.productId);
    recommendations.push(toRecommendation(best, "best_value"));
  }

  // Cheapest (lowest premium among eligible)
  const byPrice = [...scoredEligible]
    .filter((e) => e.premium !== null)
    .sort((a, b) => a.premium! - b.premium!);
  const cheapest = byPrice.find((p) => !seen.has(p.product.productId));
  if (cheapest) {
    seen.add(cheapest.product.productId);
    recommendations.push(toRecommendation(cheapest, "cheapest"));
  }

  // Best approval (highest likelihood among eligible)
  const byApproval = [...scoredEligible].sort(
    (a, b) => b.approval.likelihood - a.approval.likelihood,
  );
  const bestApproval = byApproval.find((p) => !seen.has(p.product.productId));
  if (bestApproval) {
    seen.add(bestApproval.product.productId);
    recommendations.push(toRecommendation(bestApproval, "best_approval"));
  }

  // Highest coverage (max coverage among eligible)
  const byCoverage = [...scoredEligible].sort(
    (a, b) => b.maxCoverage - a.maxCoverage,
  );
  const highestCoverage = byCoverage.find(
    (p) => !seen.has(p.product.productId),
  );
  if (highestCoverage) {
    recommendations.push(toRecommendation(highestCoverage, "highest_coverage"));
  }

  // Build unknown eligibility list (no specific reason, sorted by score)
  const unknownEligibility: Recommendation[] = scoredUnknown.map((e) =>
    toRecommendation(e, null),
  );

  return {
    recommendations,
    unknownEligibility,
    filtered: stats,
    processingTime: Date.now() - startTime,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getTobaccoClass(tobacco: boolean): TobaccoClass {
  return tobacco ? "tobacco" : "non_tobacco";
}

export function formatRecommendationReason(
  reason: Recommendation["reason"],
): string {
  switch (reason) {
    case "cheapest":
      return "Lowest Premium";
    case "highest_coverage":
      return "Most Coverage";
    case "best_approval":
      return "Best Approval Odds";
    case "best_value":
      return "Best Overall Value";
    case null:
      return "Verification Needed";
    default:
      return reason;
  }
}

export function getReasonBadgeColor(reason: Recommendation["reason"]): string {
  switch (reason) {
    case "cheapest":
      return "text-green-700 bg-green-50 border-green-200";
    case "highest_coverage":
      return "text-blue-700 bg-blue-50 border-blue-200";
    case "best_approval":
      return "text-purple-700 bg-purple-50 border-purple-200";
    case "best_value":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case null:
      return "text-yellow-700 bg-yellow-50 border-yellow-200"; // Unknown eligibility
    default:
      return "text-gray-700 bg-gray-50 border-gray-200";
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// ============================================================================
// V2 Rule Engine Integration
// ============================================================================
// The v2 rule engine provides compound predicates, cross-condition evaluation,
// proper unknown propagation, and table rating aggregation (max, not multiply).
// It can be enabled via feature flag for gradual rollout.

import {
  evaluateRuleSet,
  aggregateOutcomes,
  buildFactMap,
  generateInputHash,
} from "./ruleEvaluator";
import { loadApprovedRuleSets, logEvaluation } from "./ruleService";
import type { AggregatedOutcome, ConditionOutcome } from "./ruleEngineDSL";

// Adapter to convert service types to DSL types
// This will be unnecessary once database.types.ts is regenerated
function toRuleSetForEvaluation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rs: any,
): Parameters<typeof evaluateRuleSet>[0] {
  return rs;
}

export interface V2EvaluationInput {
  imoId: string;
  carrierId: string;
  productId: string | null;
  client: {
    age: number;
    gender: "male" | "female";
    bmi: number;
    state: string;
    tobacco: boolean;
  };
  healthConditions: string[];
  conditionResponses: Record<string, Record<string, unknown>>;
  sessionId?: string;
}

export interface V2EvaluationResult extends AggregatedOutcome {
  inputHash: string;
  evaluatedAt: string;
}

/**
 * Evaluate underwriting using the v2 rule engine.
 *
 * This function:
 * 1. Builds a canonical fact map from client data
 * 2. Loads and evaluates global (cross-condition) rules first
 * 3. Evaluates condition-specific rules for each health condition
 * 4. Aggregates outcomes using max table units (not multiply)
 * 5. Logs evaluation for audit trail
 *
 * Key differences from v1:
 * - Compound predicates (AND/OR/NOT groups)
 * - Proper unknown propagation with specific missing fields
 * - Table ratings aggregated by max, not multiplication
 * - Default fallback is unknown/refer, not decline
 * - Cross-condition rules for multi-morbidity interactions
 */
export async function evaluateUnderwritingV2(
  input: V2EvaluationInput,
): Promise<V2EvaluationResult> {
  const {
    imoId,
    carrierId,
    productId,
    client,
    healthConditions,
    conditionResponses,
    sessionId,
  } = input;

  // 1. Build canonical fact map
  const facts = buildFactMap(client, healthConditions, conditionResponses);
  const inputHash = generateInputHash(facts);

  // 2. Load and evaluate GLOBAL rules first (can decline early for multi-morbidity)
  let globalOutcome: ConditionOutcome | null = null;

  const globalRuleSets = await loadApprovedRuleSets(
    imoId,
    carrierId,
    productId,
    {
      scope: "global",
    },
  );

  for (const ruleSet of globalRuleSets) {
    const result = evaluateRuleSet(toRuleSetForEvaluation(ruleSet), facts);

    // Log evaluation
    await logEvaluation(
      imoId,
      sessionId ?? null,
      ruleSet.id,
      result.matchedRules[0]?.ruleId ?? null,
      null,
      result.matchedRules.length > 0
        ? "matched"
        : result.missingFields.length > 0
          ? "unknown"
          : "failed",
      {
        matchedConditions: result.matchedRules.map((r) => r.matchedConditions),
        missingFields: result.missingFields,
        outcomeApplied: result.matchedRules[0]?.outcome ?? null,
        inputHash,
      },
    );

    if (result.eligibility === "ineligible") {
      // Early decline from global rule
      return {
        ...aggregateOutcomes([], result, { flatExtraComposition: "max" }),
        inputHash,
        evaluatedAt: new Date().toISOString(),
      };
    }

    globalOutcome = result;
  }

  // 3. Evaluate CONDITION rules for each reported condition
  const conditionOutcomes: ConditionOutcome[] = [];

  for (const conditionCode of healthConditions) {
    const conditionRuleSets = await loadApprovedRuleSets(
      imoId,
      carrierId,
      productId,
      {
        scope: "condition",
        conditionCode,
      },
    );

    if (conditionRuleSets.length === 0) {
      // No rules for this condition = unknown
      conditionOutcomes.push({
        conditionCode,
        eligibility: "unknown",
        healthClass: "unknown",
        tableUnits: 0,
        flatExtra: null,
        concerns: [`No approved rules defined for ${conditionCode}`],
        matchedRules: [],
        missingFields: [],
      });
      continue;
    }

    // Evaluate the first (should be only) approved rule set for this condition
    const ruleSet = conditionRuleSets[0];
    const result = evaluateRuleSet(toRuleSetForEvaluation(ruleSet), facts);

    // Log evaluation
    await logEvaluation(
      imoId,
      sessionId ?? null,
      ruleSet.id,
      result.matchedRules[0]?.ruleId ?? null,
      conditionCode,
      result.matchedRules.length > 0
        ? "matched"
        : result.missingFields.length > 0
          ? "unknown"
          : "failed",
      {
        matchedConditions: result.matchedRules.map((r) => r.matchedConditions),
        missingFields: result.missingFields,
        outcomeApplied: result.matchedRules[0]?.outcome ?? null,
        inputHash,
      },
    );

    conditionOutcomes.push(result);
  }

  // 4. Aggregate all outcomes
  const aggregated = aggregateOutcomes(
    conditionOutcomes,
    globalOutcome,
    { flatExtraComposition: "max" }, // Use max for flat extras by default
  );

  return {
    ...aggregated,
    inputHash,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Check if v2 rule engine should be used for a given carrier.
 * Returns true if the carrier has any approved v2 rule sets.
 */
export async function hasV2RulesForCarrier(
  imoId: string,
  carrierId: string,
): Promise<boolean> {
  const ruleSets = await loadApprovedRuleSets(imoId, carrierId, null, {});
  return ruleSets.length > 0;
}
