// src/services/underwriting/decisionEngine.ts
// 4-Stage Recommendation Engine for Product Recommendations
// Stage 1: Eligibility Filter (products table + extracted_criteria)
// Stage 2: Approval Scoring (carrier_condition_acceptance)
// Stage 3: Premium Calculation (premium_matrix with interpolation)
// Stage 4: Ranking & Explanation

import { supabase } from "@/services/base/supabase";
import type { Database } from "@/types/database.types";
import type { ExtractedCriteria } from "@/features/underwriting/types/underwriting.types";
import { lookupAcceptance, type AcceptanceDecision } from "./acceptanceService";
import {
  getPremiumMatrixForProduct,
  interpolatePremium,
  type GenderType,
  type TobaccoClass,
  type HealthClass,
} from "./premiumMatrixService";

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
}

export interface CoverageRequest {
  faceAmount: number;
  productTypes?: ProductType[];
}

export interface DecisionEngineInput {
  client: ClientProfile;
  coverage: CoverageRequest;
  imoId: string;
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
}

interface ConditionDecision {
  conditionCode: string;
  decision: AcceptanceDecision;
  likelihood: number;
  healthClassResult: string | null;
}

export interface Recommendation {
  carrierId: string;
  carrierName: string;
  productId: string;
  productName: string;
  productType: ProductType;
  monthlyPremium: number;
  maxCoverage: number;
  approvalLikelihood: number;
  healthClassResult: string;
  reason: "cheapest" | "highest_coverage" | "best_approval" | "best_value";
  concerns: string[];
  conditionDecisions: ConditionDecision[];
  score: number;
}

export interface DecisionEngineResult {
  recommendations: Recommendation[];
  filtered: {
    totalProducts: number;
    passedEligibility: number;
    passedAcceptance: number;
    withPremiums: number;
  };
  processingTime: number;
}

// ============================================================================
// Stage 1: Eligibility Filter
// ============================================================================

/**
 * Check if a product is eligible for the client
 */
function checkEligibility(
  product: ProductCandidate,
  client: ClientProfile,
  coverage: CoverageRequest,
  extractedCriteria?: ExtractedCriteria,
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check basic product constraints (from products table)
  const minAge = product.minAge ?? 0;
  const maxAge = product.maxAge ?? 100;

  if (client.age < minAge) {
    reasons.push(`Client age ${client.age} below minimum ${minAge}`);
  }
  if (client.age > maxAge) {
    reasons.push(`Client age ${client.age} above maximum ${maxAge}`);
  }

  const minFace = product.minFaceAmount ?? 0;
  const maxFace = product.maxFaceAmount ?? Number.MAX_SAFE_INTEGER;

  if (coverage.faceAmount < minFace) {
    reasons.push(
      `Requested $${coverage.faceAmount.toLocaleString()} below minimum`,
    );
  }
  if (coverage.faceAmount > maxFace) {
    reasons.push(
      `Requested $${coverage.faceAmount.toLocaleString()} above maximum`,
    );
  }

  // Check extracted criteria if available (more sophisticated)
  if (extractedCriteria) {
    // Age limits from extracted criteria
    if (extractedCriteria.ageLimits) {
      const { minIssueAge, maxIssueAge } = extractedCriteria.ageLimits;
      if (minIssueAge !== undefined && client.age < minIssueAge) {
        if (!reasons.some((r) => r.includes("below minimum"))) {
          reasons.push(`Age ${client.age} below issue age ${minIssueAge}`);
        }
      }
      if (maxIssueAge !== undefined && client.age > maxIssueAge) {
        if (!reasons.some((r) => r.includes("above maximum"))) {
          reasons.push(`Age ${client.age} above issue age ${maxIssueAge}`);
        }
      }
    }

    // Face amount with age tiers (key feature)
    if (extractedCriteria.faceAmountLimits) {
      const { minimum, maximum, ageTiers } = extractedCriteria.faceAmountLimits;

      if (minimum !== undefined && coverage.faceAmount < minimum) {
        if (!reasons.some((r) => r.includes("below minimum"))) {
          reasons.push(`Amount below minimum $${minimum.toLocaleString()}`);
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
        reasons.push(
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
        reasons.push(`Knockout condition: ${knockouts.join(", ")}`);
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
        reasons.push(`Not available in ${client.state}`);
      }
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

// ============================================================================
// Stage 2: Approval Scoring
// ============================================================================

/**
 * Calculate approval likelihood based on carrier acceptance rules
 */
async function calculateApproval(
  carrierId: string,
  productType: ProductType,
  healthConditions: string[],
  imoId: string,
): Promise<{
  likelihood: number;
  healthClass: HealthClass;
  conditionDecisions: ConditionDecision[];
  concerns: string[];
}> {
  const conditionDecisions: ConditionDecision[] = [];
  const concerns: string[] = [];

  // No conditions = healthy client
  if (healthConditions.length === 0) {
    return {
      likelihood: 0.95,
      healthClass: "preferred",
      conditionDecisions: [],
      concerns: [],
    };
  }

  // Evaluate each condition
  for (const conditionCode of healthConditions) {
    const acceptance = await lookupAcceptance(
      carrierId,
      conditionCode,
      imoId,
      productType,
    );

    if (acceptance) {
      conditionDecisions.push({
        conditionCode,
        decision: acceptance.acceptance as AcceptanceDecision,
        likelihood: acceptance.approval_likelihood ?? 0.5,
        healthClassResult: acceptance.health_class_result,
      });

      if (acceptance.acceptance === "declined") {
        concerns.push(`${conditionCode}: declined`);
      } else if (acceptance.acceptance === "case_by_case") {
        concerns.push(`${conditionCode}: requires review`);
      } else if (acceptance.acceptance === "table_rated") {
        concerns.push(`${conditionCode}: table rated`);
      }
    } else {
      conditionDecisions.push({
        conditionCode,
        decision: "case_by_case",
        likelihood: 0.5,
        healthClassResult: null,
      });
      concerns.push(`${conditionCode}: no rule found`);
    }
  }

  // Check for declined
  if (conditionDecisions.some((d) => d.decision === "declined")) {
    return {
      likelihood: 0,
      healthClass: "standard",
      conditionDecisions,
      concerns,
    };
  }

  // Calculate overall likelihood (minimum)
  const likelihood = Math.min(...conditionDecisions.map((d) => d.likelihood));

  // Determine health class
  const healthClass = determineHealthClass(conditionDecisions);

  return { likelihood, healthClass, conditionDecisions, concerns };
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
 * Get premium from premium_matrix with interpolation
 */
async function getPremium(
  productId: string,
  age: number,
  gender: GenderType,
  tobacco: boolean,
  healthClass: HealthClass,
  faceAmount: number,
  imoId: string,
): Promise<number | null> {
  try {
    const matrix = await getPremiumMatrixForProduct(productId, imoId);

    if (!matrix || matrix.length === 0) {
      return null;
    }

    const tobaccoClass: TobaccoClass = tobacco ? "tobacco" : "non_tobacco";

    return interpolatePremium(
      matrix,
      age,
      faceAmount,
      gender,
      tobaccoClass,
      healthClass,
    );
  } catch (error) {
    console.error("Error getting premium:", error);
    return null;
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
      min_face_amount, max_face_amount, carrier_id,
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
 * Calculate composite score for ranking
 */
function calculateScore(
  approvalLikelihood: number,
  monthlyPremium: number,
  maxPremium: number,
): number {
  const normalizedPremium =
    maxPremium > 0 ? 1 - monthlyPremium / maxPremium : 0.5;
  return approvalLikelihood * 0.4 + normalizedPremium * 0.6;
}

/**
 * Main entry point: Get product recommendations
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
    passedAcceptance: 0,
    withPremiums: 0,
  };

  const products = await getProducts(input);
  stats.totalProducts = products.length;

  // Evaluate products through all stages
  const evaluated: Array<{
    product: ProductCandidate;
    approval: Awaited<ReturnType<typeof calculateApproval>>;
    premium: number;
    maxCoverage: number;
  }> = [];

  for (const product of products) {
    // Stage 1: Eligibility
    const criteria = await getExtractedCriteria(product.productId);
    const eligibility = checkEligibility(product, client, coverage, criteria);
    if (!eligibility.eligible) continue;
    stats.passedEligibility++;

    // Stage 2: Approval
    const approval = await calculateApproval(
      product.carrierId,
      product.productType,
      client.healthConditions,
      imoId,
    );
    if (approval.likelihood === 0) continue;
    stats.passedAcceptance++;

    // Stage 3: Premium
    const premium = await getPremium(
      product.productId,
      client.age,
      client.gender,
      client.tobacco,
      approval.healthClass,
      coverage.faceAmount,
      imoId,
    );
    if (premium === null) continue;
    stats.withPremiums++;

    const maxCoverage = product.maxFaceAmount
      ? Math.min(product.maxFaceAmount, coverage.faceAmount)
      : coverage.faceAmount;

    evaluated.push({ product, approval, premium, maxCoverage });
  }

  // Stage 4: Rank and select recommendations
  if (evaluated.length === 0) {
    return {
      recommendations: [],
      filtered: stats,
      processingTime: Date.now() - startTime,
    };
  }

  const maxPremium = Math.max(...evaluated.map((e) => e.premium));
  const scored = evaluated.map((e) => ({
    ...e,
    score: calculateScore(e.approval.likelihood, e.premium, maxPremium),
  }));

  scored.sort((a, b) => b.score - a.score);

  const recommendations: Recommendation[] = [];
  const seen = new Set<string>();

  // Best value (highest score)
  if (scored.length > 0) {
    const best = scored[0];
    seen.add(best.product.productId);
    recommendations.push({
      carrierId: best.product.carrierId,
      carrierName: best.product.carrierName,
      productId: best.product.productId,
      productName: best.product.productName,
      productType: best.product.productType,
      monthlyPremium: best.premium,
      maxCoverage: best.maxCoverage,
      approvalLikelihood: best.approval.likelihood,
      healthClassResult: best.approval.healthClass,
      reason: "best_value",
      concerns: best.approval.concerns,
      conditionDecisions: best.approval.conditionDecisions,
      score: best.score,
    });
  }

  // Cheapest
  const byPrice = [...scored].sort((a, b) => a.premium - b.premium);
  const cheapest = byPrice.find((p) => !seen.has(p.product.productId));
  if (cheapest) {
    seen.add(cheapest.product.productId);
    recommendations.push({
      carrierId: cheapest.product.carrierId,
      carrierName: cheapest.product.carrierName,
      productId: cheapest.product.productId,
      productName: cheapest.product.productName,
      productType: cheapest.product.productType,
      monthlyPremium: cheapest.premium,
      maxCoverage: cheapest.maxCoverage,
      approvalLikelihood: cheapest.approval.likelihood,
      healthClassResult: cheapest.approval.healthClass,
      reason: "cheapest",
      concerns: cheapest.approval.concerns,
      conditionDecisions: cheapest.approval.conditionDecisions,
      score: cheapest.score,
    });
  }

  // Best approval
  const byApproval = [...scored].sort(
    (a, b) => b.approval.likelihood - a.approval.likelihood,
  );
  const bestApproval = byApproval.find((p) => !seen.has(p.product.productId));
  if (bestApproval) {
    seen.add(bestApproval.product.productId);
    recommendations.push({
      carrierId: bestApproval.product.carrierId,
      carrierName: bestApproval.product.carrierName,
      productId: bestApproval.product.productId,
      productName: bestApproval.product.productName,
      productType: bestApproval.product.productType,
      monthlyPremium: bestApproval.premium,
      maxCoverage: bestApproval.maxCoverage,
      approvalLikelihood: bestApproval.approval.likelihood,
      healthClassResult: bestApproval.approval.healthClass,
      reason: "best_approval",
      concerns: bestApproval.approval.concerns,
      conditionDecisions: bestApproval.approval.conditionDecisions,
      score: bestApproval.score,
    });
  }

  // Highest coverage
  const byCoverage = [...scored].sort((a, b) => b.maxCoverage - a.maxCoverage);
  const highestCoverage = byCoverage.find(
    (p) => !seen.has(p.product.productId),
  );
  if (highestCoverage) {
    recommendations.push({
      carrierId: highestCoverage.product.carrierId,
      carrierName: highestCoverage.product.carrierName,
      productId: highestCoverage.product.productId,
      productName: highestCoverage.product.productName,
      productType: highestCoverage.product.productType,
      monthlyPremium: highestCoverage.premium,
      maxCoverage: highestCoverage.maxCoverage,
      approvalLikelihood: highestCoverage.approval.likelihood,
      healthClassResult: highestCoverage.approval.healthClass,
      reason: "highest_coverage",
      concerns: highestCoverage.approval.concerns,
      conditionDecisions: highestCoverage.approval.conditionDecisions,
      score: highestCoverage.score,
    });
  }

  return {
    recommendations,
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
