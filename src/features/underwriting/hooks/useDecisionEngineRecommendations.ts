// src/features/underwriting/hooks/useDecisionEngineRecommendations.ts
// Hook for integrating the decision engine with the underwriting wizard

import { useMutation } from "@tanstack/react-query";
import {
  getRecommendations,
  type DecisionEngineInput,
  type DecisionEngineResult,
  type GenderType,
} from "@/services/underwriting/decisionEngine";
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
 * Transform wizard form data to decision engine input format
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

  // Map gender - handle empty string (default to male for rate lookup)
  // This is a fallback; the wizard should validate gender is selected
  let gender: GenderType = "male";
  if (clientInfo.gender === "male" || clientInfo.gender === "female") {
    gender = clientInfo.gender;
  }

  return {
    client: {
      age: clientInfo.age,
      gender,
      state: clientInfo.state || undefined,
      bmi: bmi > 0 ? bmi : undefined,
      tobacco: healthInfo.tobacco.currentUse,
      healthConditions,
    },
    coverage: {
      faceAmount: coverageRequest.faceAmount,
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
