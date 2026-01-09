// src/features/underwriting/hooks/useUnderwritingAnalysis.ts

import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import type {
  AIAnalysisRequest,
  AIAnalysisResult,
} from "../types/underwriting.types";

interface AnalysisError {
  message: string;
  code?: string;
}

async function analyzeClient(
  request: AIAnalysisRequest,
): Promise<AIAnalysisResult> {
  const startTime = Date.now();

  const { data, error } = await supabase.functions.invoke(
    "underwriting-ai-analyze",
    {
      body: request,
    },
  );

  if (error) {
    console.error("Underwriting analysis failed:", error);
    throw new Error(
      error.message || "Failed to analyze client. Please try again.",
    );
  }

  if (!data || !data.success) {
    throw new Error(
      data?.error || "Analysis failed. Please check your inputs and try again.",
    );
  }

  const result: AIAnalysisResult = {
    healthTier: data.analysis.health_tier,
    riskFactors: data.analysis.risk_factors || [],
    recommendations: (data.analysis.recommendations || []).map(
      (rec: {
        carrier_id: string;
        carrier_name: string;
        product_id: string;
        product_name: string;
        expected_rating: string;
        confidence: number;
        key_factors: string[];
        concerns: string[];
        priority: number;
        notes?: string;
        guide_references?: string[];
      }) => ({
        carrierId: rec.carrier_id,
        carrierName: rec.carrier_name,
        productId: rec.product_id,
        productName: rec.product_name,
        expectedRating: rec.expected_rating,
        confidence: rec.confidence,
        keyFactors: rec.key_factors || [],
        concerns: rec.concerns || [],
        priority: rec.priority,
        notes: rec.notes,
        guideReferences: rec.guide_references || [],
      }),
    ),
    reasoning: data.analysis.reasoning || "",
    processingTimeMs: Date.now() - startTime,
  };

  return result;
}

/**
 * Hook to analyze a client using the AI underwriting system
 */
export function useUnderwritingAnalysis() {
  return useMutation<AIAnalysisResult, AnalysisError, AIAnalysisRequest>({
    mutationFn: analyzeClient,
    onError: (error) => {
      console.error("Underwriting analysis error:", error);
    },
  });
}
