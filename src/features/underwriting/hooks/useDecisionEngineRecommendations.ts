// src/features/underwriting/hooks/useDecisionEngineRecommendations.ts
// Hook for integrating the decision engine with the underwriting wizard

import { useMutation } from "@tanstack/react-query";

import {
  getRecommendations,
  type DecisionEngineInput,
  type DecisionEngineResult,
  type GenderType,
} from "@/services/underwriting/decisionEngine";

import { transformConditionResponses } from "@/services/underwriting/conditionResponseTransformer";
import type {
  ClientInfo,
  HealthInfo,
  CoverageRequest,
  ProductType,
} from "../types/underwriting.types";
import { calculateBMI } from "../utils/bmiCalculator";

// ============================================================================
// Data Transformation
// ============================================================================

/**
 * Map wizard ProductType to decision engine ProductType
 * They should match, but this provides type safety
 */
function mapProductTypes(types: ProductType[]): ProductType[] {
  return types;
}

/**
 * Transform wizard form data to decision engine input format.
 *
 * IMPORTANT: This function now transforms condition follow-up responses
 * to rule-engine-compatible field names using the transformer layer.
 *
 * Semantics:
 * - Missing wizard fields → undefined in transformed data (not false/[])
 * - Transformed data is keyed by condition code (e.g., diabetes.insulin_use)
 */
export function transformWizardToDecisionEngineInput(
  clientInfo: ClientInfo,
  healthInfo: HealthInfo,
  coverageRequest: CoverageRequest,
  imoId: string,
  termYears?: number | null,
): DecisionEngineInput {
  // Calculate BMI from height/weight
  const bmi = calculateBMI(
    clientInfo.heightFeet,
    clientInfo.heightInches,
    clientInfo.weight,
  );

  // Extract condition codes from health conditions
  const healthConditions = healthInfo.conditions.map((c) => c.conditionCode);

  // Transform wizard follow-up responses to rule-compatible fact keys
  // This maps field names like "treatment" → "insulin_use" for diabetes
  const conditionResponses = transformConditionResponses(
    healthInfo.conditions,
    clientInfo.age,
  );

  // Map gender - handle empty string (default to male for rate lookup)
  // This is a fallback; the wizard should validate gender is selected
  let gender: GenderType = "male";
  if (clientInfo.gender === "male" || clientInfo.gender === "female") {
    gender = clientInfo.gender;
  }

  // Get valid face amounts (>= $10,000)
  const validFaceAmounts = (coverageRequest.faceAmounts || []).filter(
    (a) => a >= 10000,
  );
  const primaryFaceAmount = validFaceAmounts[0] || 0;

  return {
    client: {
      age: clientInfo.age,
      gender,
      state: clientInfo.state || undefined,
      bmi: bmi > 0 ? bmi : undefined,
      heightFeet: clientInfo.heightFeet,
      heightInches: clientInfo.heightInches,
      weight: clientInfo.weight,
      tobacco: healthInfo.tobacco.currentUse,
      healthConditions,
      conditionResponses,
    },
    coverage: {
      faceAmount: primaryFaceAmount,
      // Pass all user-specified face amounts for quote comparison
      faceAmounts: validFaceAmounts.length > 0 ? validFaceAmounts : undefined,
      productTypes: mapProductTypes(coverageRequest.productTypes),
    },
    imoId,
    termYears,
  };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for getting decision engine recommendations
 *
 * Usage:
 * ```tsx
 * const mutation = useDecisionEngineRecommendations();
 *
 * // Trigger analysis
 * const input = transformWizardToDecisionEngineInput(client, health, coverage, imoId);
 * mutation.mutate(input);
 *
 * // Access results
 * mutation.data // DecisionEngineResult
 * mutation.isPending // loading state
 * mutation.error // error state
 * ```
 */
export function useDecisionEngineRecommendations() {
  return useMutation<DecisionEngineResult, Error, DecisionEngineInput>({
    mutationFn: getRecommendations,
    onError: (error) => {
      console.error("Decision engine error:", error);
    },
  });
}
