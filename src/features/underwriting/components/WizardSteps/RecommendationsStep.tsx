// src/features/underwriting/components/WizardSteps/RecommendationsStep.tsx

import {
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Clock,
  Ban,
  Ruler,
  Database,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AIAnalysisResult,
  ClientInfo,
  HealthTier,
  HealthInfo,
  CoverageRequest,
} from "../../types/underwriting.types";
import { getHealthTierLabel } from "../../types/underwriting.types";
// eslint-disable-next-line no-restricted-imports
import type {
  DecisionEngineResult,
  Recommendation as DecisionEngineRecommendation,
} from "@/services/underwriting/decisionEngine";
// eslint-disable-next-line no-restricted-imports
import {
  formatCurrency as formatDECurrency,
} from "@/services/underwriting/decisionEngine";
import {
  useProductConstraints,
  useHealthConditions,
  useDefaultBuildCharts,
} from "../../hooks";
import {
  applyEligibilityToRecommendations,
  separateByEligibility,
  type RecommendationWithEligibility,
} from "../../utils/eligibilityChecker";
import {
  lookupBuildRating,
  getWeightGuidance,
} from "../../utils/buildTableLookup";
import type { EligibilityClientProfile } from "../../types/product-constraints.types";
import type { BuildTableData } from "../../types/build-table.types";
import { BUILD_RATING_CLASS_LABELS } from "../../types/build-table.types";
import { formatCurrency } from "../../utils/formatters";

interface RecommendationsStepProps {
  aiResult: AIAnalysisResult | null;
  decisionEngineResult: DecisionEngineResult | null;
  isDecisionEngineLoading: boolean;
  isAILoading: boolean;
  clientInfo: ClientInfo;
  healthInfo: HealthInfo;
  coverageRequest: CoverageRequest;
  /** Currently selected term length (null = use longest available) */
  selectedTermYears?: number | null;
  /** Handler for term selection changes */
  onTermChange?: (termYears: number | null) => void;
}

const HEALTH_TIER_CONFIG: Record<
  HealthTier,
  { color: string; bgColor: string; borderColor: string; icon: typeof Award }
> = {
  preferred_plus: {
    color: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    icon: Award,
  },
  preferred: {
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    icon: Award,
  },
  standard_plus: {
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: CheckCircle,
  },
  standard: {
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: CheckCircle,
  },
  substandard: {
    color: "text-yellow-700 dark:text-yellow-300",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    icon: AlertTriangle,
  },
  table_rated: {
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: AlertTriangle,
  },
  decline: {
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    icon: XCircle,
  },
};

export default function RecommendationsStep({
  aiResult,
  decisionEngineResult,
  isDecisionEngineLoading,
  isAILoading,
  clientInfo,
  healthInfo,
  coverageRequest,
  selectedTermYears,
  onTermChange,
}: RecommendationsStepProps) {
  // Extract product IDs and carrier IDs from AI recommendations
  const productIds = aiResult?.recommendations.map((r) => r.productId) ?? [];
  const carrierIds = [
    ...new Set(aiResult?.recommendations.map((r) => r.carrierId) ?? []),
  ];

  // Fetch product constraints for all recommended products
  const { data: constraintsMap, isLoading: constraintsLoading } =
    useProductConstraints(productIds);

  // Fetch default build charts for carriers in recommendations
  const { data: buildTablesMap, isLoading: buildTablesLoading } =
    useDefaultBuildCharts(carrierIds);

  // Fetch health conditions for name lookups
  const { data: healthConditions = [] } = useHealthConditions();

  // Build condition names map for display
  const conditionNames = new Map<string, string>();
  for (const condition of healthConditions) {
    conditionNames.set(condition.code, condition.name);
  }

  // Build client profile for eligibility checking
  // Use the highest requested face amount for eligibility (most conservative)
  const maxFaceAmount = Math.max(...(coverageRequest.faceAmounts || [0]));
  const clientProfile: EligibilityClientProfile = {
    age: clientInfo.age,
    requestedFaceAmount: maxFaceAmount,
    conditionCodes: (healthInfo.conditions ?? []).map((c) => c.conditionCode),
  };

  // Apply eligibility filtering if constraints are loaded (for AI recommendations)
  let eligibleRecommendations: RecommendationWithEligibility[] = [];
  let ineligibleRecommendations: RecommendationWithEligibility[] = [];

  if (aiResult && constraintsMap) {
    const withEligibility = applyEligibilityToRecommendations(
      aiResult.recommendations,
      clientProfile,
      constraintsMap,
      conditionNames,
    );
    const separated = separateByEligibility(withEligibility);
    eligibleRecommendations = separated.eligible;
    ineligibleRecommendations = separated.ineligible;
  }

  const tierConfig = aiResult
    ? HEALTH_TIER_CONFIG[aiResult.healthTier] || HEALTH_TIER_CONFIG.standard
    : null;

  // Calculate available terms from all decision engine recommendations
  const allAvailableTerms = new Set<number>();
  if (decisionEngineResult) {
    for (const rec of [
      ...decisionEngineResult.eligibleProducts,
      ...decisionEngineResult.unknownEligibility,
    ]) {
      if (rec.availableTerms) {
        for (const term of rec.availableTerms) {
          allAvailableTerms.add(term);
        }
      }
    }
  }
  const sortedTerms = Array.from(allAvailableTerms).sort((a, b) => a - b);
  const hasTermOptions = sortedTerms.length > 1;

  // Determine the currently displayed term
  const displayedTerm =
    selectedTermYears ??
    decisionEngineResult?.recommendations[0]?.termYears ??
    decisionEngineResult?.eligibleProducts[0]?.termYears ??
    decisionEngineResult?.unknownEligibility[0]?.termYears ??
    null;

  // Both loading - show initial loading state
  if (
    isDecisionEngineLoading &&
    isAILoading &&
    !decisionEngineResult &&
    !aiResult
  ) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-zinc-500">
          Analyzing client profile...
        </span>
      </div>
    );
  }

  const TierIcon = tierConfig?.icon || CheckCircle;

  return (
    <div className="space-y-4 p-1">
      {/* Health Tier Summary (from AI) */}
      {isAILoading && !aiResult ? (
        <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="flex-1">
              <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                AI analyzing health classification...
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                For {clientInfo.name || "this client"}, age {clientInfo.age}
              </p>
            </div>
          </div>
        </div>
      ) : aiResult ? (
        <div
          className={cn(
            "p-4 rounded-lg border",
            tierConfig?.bgColor,
            tierConfig?.borderColor,
          )}
        >
          <div className="flex items-start gap-3">
            <TierIcon className={cn("h-5 w-5 mt-0.5", tierConfig?.color)} />
            <div className="flex-1">
              <div className={cn("text-sm font-semibold", tierConfig?.color)}>
                Estimated Health Classification:{" "}
                {getHealthTierLabel(aiResult.healthTier)}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                For {clientInfo.name || "this client"}, age {clientInfo.age}
                {maxFaceAmount > 0 && (
                  <>
                    {" "}
                    • Requested:{" "}
                    {(coverageRequest.faceAmounts || [])
                      .filter((a) => a >= 10000)
                      .map((a) => formatCurrency(a))
                      .join(", ")}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Risk Factors */}
          {aiResult.riskFactors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1">
                Risk Factors Considered
              </div>
              <div className="flex flex-wrap gap-1">
                {aiResult.riskFactors.map((factor, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] text-zinc-600 dark:text-zinc-400"
                  >
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ========== SECTION 1: Decision Engine (Rate Table) Results ========== */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800 flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            Rate Table Recommendations
          </span>
          <span className="text-xs text-indigo-500 dark:text-indigo-400 ml-auto">
            Based on your rate data
          </span>
        </div>

        {/* Term Length Selector */}
        {hasTermOptions && onTermChange && (
          <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
                Term Length:
              </span>
              <div className="flex items-center gap-1">
                {sortedTerms.map((term) => (
                  <button
                    key={term}
                    onClick={() => onTermChange(term)}
                    disabled={isDecisionEngineLoading}
                    className={cn(
                      "px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors",
                      "border",
                      displayedTerm === term ||
                        (displayedTerm === null &&
                          term === sortedTerms[sortedTerms.length - 1])
                        ? "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                        : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700",
                      isDecisionEngineLoading &&
                        "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {term} Year
                  </button>
                ))}
              </div>
              {isDecisionEngineLoading && (
                <div className="ml-2 h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
          </div>
        )}

        <div className="p-4">
          {isDecisionEngineLoading ? (
            <div className="flex items-center gap-3 p-6 justify-center">
              <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-zinc-500">
                Searching rate tables...
              </span>
            </div>
          ) : decisionEngineResult &&
            (decisionEngineResult.recommendations.length > 0 ||
              decisionEngineResult.eligibleProducts.length > 0 ||
              decisionEngineResult.unknownEligibility.length > 0) ? (
            <div className="space-y-2">
              {/* Compact Table for All Recommendations */}
              <DecisionEngineTable
                eligibleProducts={decisionEngineResult.eligibleProducts}
                unknownEligibility={decisionEngineResult.unknownEligibility}
              />

              {/* Stats Footer */}
              <div className="pt-3 mt-3 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-3">
                <span>
                  Searched {decisionEngineResult.filtered.totalProducts}{" "}
                  products
                </span>
                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {decisionEngineResult.filtered.passedEligibility} eligible
                </span>
                {decisionEngineResult.filtered.unknownEligibility > 0 && (
                  <>
                    <span className="text-zinc-300 dark:text-zinc-600">•</span>
                    <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                      {decisionEngineResult.filtered.unknownEligibility} need
                      verification
                    </span>
                  </>
                )}
                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                <span>
                  {decisionEngineResult.filtered.withPremiums} with rates
                </span>
                <span className="ml-auto text-zinc-400">
                  {decisionEngineResult.processingTime}ms
                </span>
              </div>
            </div>
          ) : decisionEngineResult ? (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-5 w-5 text-amber-500" />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  No Quoted Products Available
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mb-3">
                We evaluated {decisionEngineResult.filtered.totalProducts}{" "}
                products but couldn't generate pricing for any of them.
              </p>

              {/* Pipeline breakdown */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded p-2 mb-3">
                <p className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Pipeline Breakdown:
                </p>
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">
                      Stage 1 (Eligibility):
                    </span>
                    <span
                      className={
                        decisionEngineResult.filtered.passedEligibility > 0
                          ? "text-emerald-600"
                          : "text-red-500"
                      }
                    >
                      {decisionEngineResult.filtered.passedEligibility} passed
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Stage 2 (Approval):</span>
                    <span
                      className={
                        decisionEngineResult.filtered.passedAcceptance > 0
                          ? "text-emerald-600"
                          : "text-red-500"
                      }
                    >
                      {decisionEngineResult.filtered.passedAcceptance} passed
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">
                      Stage 3 (Premium Lookup):
                    </span>
                    <span
                      className={
                        decisionEngineResult.filtered.withPremiums > 0
                          ? "text-emerald-600"
                          : "text-red-500 font-medium"
                      }
                    >
                      {decisionEngineResult.filtered.withPremiums} found
                      {decisionEngineResult.filtered.withPremiums === 0 &&
                        " ← Issue here"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Likely causes */}
              {decisionEngineResult.filtered.withPremiums === 0 &&
                decisionEngineResult.filtered.passedAcceptance > 0 && (
                  <div className="text-[10px] text-zinc-500 space-y-1">
                    <p className="font-medium text-zinc-600 dark:text-zinc-400">
                      Likely causes:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
                      <li>Premium rates not yet loaded for these products</li>
                      <li>Health class not available in rate tables</li>
                      <li>Gender or tobacco class mismatch</li>
                      <li>Age/face amount outside rate grid</li>
                    </ul>
                    <p className="mt-2 text-zinc-400 italic">
                      Check browser console for detailed diagnostics.
                    </p>
                  </div>
                )}

              {decisionEngineResult.filtered.passedEligibility === 0 && (
                <div className="text-[10px] text-zinc-500 space-y-1">
                  <p className="font-medium text-zinc-600 dark:text-zinc-400">
                    All products failed eligibility:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
                    <li>Client age may be outside product age limits</li>
                    <li>Requested face amount may exceed product maximums</li>
                    <li>Client may have a knockout health condition</li>
                    <li>State may not be available for these products</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center">
              <XCircle className="h-6 w-6 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">
                Decision engine unavailable.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========== SECTION 2: AI Analysis Results ========== */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
            AI-Powered Analysis
          </span>
          <span className="text-xs text-purple-500 dark:text-purple-400 ml-auto">
            Using underwriting guides
          </span>
        </div>
        <div className="p-4">
          {isAILoading ? (
            <div className="flex items-center gap-3 p-6 justify-center">
              <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-zinc-500">
                AI analyzing underwriting guides...
              </span>
            </div>
          ) : aiResult ? (
            <div className="space-y-3">
              {/* Loading state for constraints */}
              {(constraintsLoading || buildTablesLoading) && (
                <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded">
                  <div className="h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-zinc-500">
                    Checking eligibility...
                  </span>
                </div>
              )}

              {/* AI Recommendations Table */}
              {!constraintsLoading && !buildTablesLoading && (
                <AIRecommendationsTable
                  eligibleRecommendations={eligibleRecommendations}
                  ineligibleRecommendations={ineligibleRecommendations}
                  clientHeight={{
                    feet: clientInfo.heightFeet,
                    inches: clientInfo.heightInches,
                  }}
                  clientWeight={clientInfo.weight}
                  buildTablesMap={buildTablesMap}
                />
              )}

              {/* AI Reasoning */}
              {aiResult.reasoning && (
                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Info className="h-4 w-4" />
                    Analysis Summary
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                    {aiResult.reasoning}
                  </p>
                </div>
              )}

              {/* Processing Info */}
              {aiResult.processingTimeMs && (
                <div className="flex items-center gap-2 text-xs text-zinc-400 pt-3">
                  <Clock className="h-4 w-4" />
                  AI analysis completed in{" "}
                  {(aiResult.processingTimeMs / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center">
              <XCircle className="h-6 w-6 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">AI analysis unavailable.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// Sub-component for weight guidance message
interface WeightGuidanceMessageProps {
  heightFeet: number;
  heightInches: number;
  weight: number;
  buildTable?: BuildTableData;
}

function WeightGuidanceMessage({
  heightFeet,
  heightInches,
  weight,
  buildTable,
}: WeightGuidanceMessageProps) {
  const guidance = getWeightGuidance(
    heightFeet,
    heightInches,
    weight,
    buildTable,
  );

  // Don't show if no guidance available or already at best rating
  if (
    !guidance ||
    !guidance.nextBetterRating ||
    guidance.weightToNextRating === null
  ) {
    return null;
  }

  return (
    <div className="mt-1 flex items-center gap-1 text-[9px] text-zinc-500 dark:text-zinc-400">
      <TrendingDown className="h-2.5 w-2.5 text-emerald-500" />
      <span>
        {guidance.weightToNextRating} lbs to reach{" "}
        {BUILD_RATING_CLASS_LABELS[guidance.nextBetterRating]}
      </span>
    </div>
  );
}

// ============================================================================
// AI Recommendations Table Component
// ============================================================================

interface AIRecommendationsTableProps {
  eligibleRecommendations: RecommendationWithEligibility[];
  ineligibleRecommendations: RecommendationWithEligibility[];
  clientHeight: { feet: number; inches: number };
  clientWeight: number;
  buildTablesMap?: Map<string, BuildTableData>;
}

function AIRecommendationsTable({
  eligibleRecommendations,
  ineligibleRecommendations,
  clientHeight,
  clientWeight,
  buildTablesMap,
}: AIRecommendationsTableProps) {
  const sortedEligible = [...eligibleRecommendations].sort(
    (a, b) => a.priority - b.priority,
  );

  if (
    eligibleRecommendations.length === 0 &&
    ineligibleRecommendations.length === 0
  ) {
    return (
      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-center">
        <XCircle className="h-6 w-6 text-zinc-400 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">
          No AI recommendations available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Eligible Products Table */}
      {sortedEligible.length > 0 && (
        <div>
          <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Eligible Products
            <span className="text-zinc-400 text-xs">
              ({eligibleRecommendations.length})
            </span>
          </div>

          <div className="overflow-x-auto bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-zinc-200 dark:border-zinc-700 text-left bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="py-3 px-3 font-semibold text-zinc-600 dark:text-zinc-300 w-12">
                    #
                  </th>
                  <th className="py-3 px-3 font-semibold text-zinc-600 dark:text-zinc-300">
                    Product
                  </th>
                  <th className="py-3 px-3 font-semibold text-zinc-600 dark:text-zinc-300 text-center">
                    Expected Rating
                  </th>
                  <th className="py-3 px-3 font-semibold text-zinc-600 dark:text-zinc-300 text-center">
                    Build Rating
                  </th>
                  <th className="py-3 px-3 font-semibold text-zinc-600 dark:text-zinc-300 text-center">
                    Confidence
                  </th>
                  <th className="py-3 px-3 font-semibold text-zinc-600 dark:text-zinc-300">
                    Key Factors
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {sortedEligible.map((rec, index) => (
                  <AIRecommendationRow
                    key={`${rec.carrierId}-${rec.productId}`}
                    recommendation={rec}
                    rank={index + 1}
                    clientHeight={clientHeight}
                    clientWeight={clientWeight}
                    buildTable={buildTablesMap?.get(rec.carrierId)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ineligible Products (collapsible summary) */}
      {ineligibleRecommendations.length > 0 && (
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
          <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2">
            <Ban className="h-4 w-4 text-red-400" />
            Ineligible Products
            <span className="text-zinc-400 text-xs">
              ({ineligibleRecommendations.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm opacity-75">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700 text-left">
                  <th className="pb-2 pr-3 font-medium text-zinc-500 dark:text-zinc-400">
                    Product
                  </th>
                  <th className="pb-2 pl-3 font-medium text-zinc-500 dark:text-zinc-400">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {ineligibleRecommendations.map((rec) => (
                  <tr
                    key={`${rec.carrierId}-${rec.productId}`}
                    className="text-zinc-500 dark:text-zinc-400"
                  >
                    <td className="py-2 pr-3">
                      <div className="font-medium">{rec.carrierName}</div>
                      <div className="text-xs">{rec.productName}</div>
                    </td>
                    <td className="py-2 pl-3">
                      <div className="flex flex-wrap gap-1">
                        {rec.eligibility.ineligibilityReasons
                          .slice(0, 2)
                          .map((reason, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                            >
                              {reason}
                            </span>
                          ))}
                        {rec.eligibility.ineligibilityReasons.length > 2 && (
                          <span className="text-xs text-zinc-400">
                            +{rec.eligibility.ineligibilityReasons.length - 2}{" "}
                            more
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No eligible products message */}
      {eligibleRecommendations.length === 0 &&
        ineligibleRecommendations.length > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">No eligible products found</span>
            </div>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              All AI-recommended products failed eligibility checks. See
              ineligible products above for details.
            </p>
          </div>
        )}
    </div>
  );
}

// ============================================================================
// AI Recommendation Row Component
// ============================================================================

interface AIRecommendationRowProps {
  recommendation: RecommendationWithEligibility;
  rank: number;
  clientHeight: { feet: number; inches: number };
  clientWeight: number;
  buildTable?: BuildTableData;
}

function AIRecommendationRow({
  recommendation,
  rank,
  clientHeight,
  clientWeight,
  buildTable,
}: AIRecommendationRowProps) {
  const buildRatingResult = lookupBuildRating(
    clientHeight.feet,
    clientHeight.inches,
    clientWeight,
    buildTable,
  );

  const confidenceColor =
    recommendation.confidence >= 0.8
      ? "text-emerald-600 dark:text-emerald-400"
      : recommendation.confidence >= 0.6
        ? "text-blue-600 dark:text-blue-400"
        : recommendation.confidence >= 0.4
          ? "text-yellow-600 dark:text-yellow-400"
          : "text-orange-600 dark:text-orange-400";

  const ratingColorClass = (() => {
    const rating = recommendation.expectedRating.toLowerCase();
    if (rating.includes("preferred"))
      return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700";
    if (rating.includes("standard"))
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700";
    if (rating.includes("table") || rating.includes("substandard"))
      return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700";
    if (rating.includes("decline"))
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700";
    return "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
  })();

  const buildRatingColorClass = (() => {
    const rating = buildRatingResult.ratingClass;
    if (rating === "preferred_plus" || rating === "preferred")
      return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300";
    if (rating === "standard_plus" || rating === "standard")
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
    if (rating === "table_rated" || rating.startsWith("table_"))
      return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300";
    return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400";
  })();

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors bg-white dark:bg-zinc-900">
      {/* Rank */}
      <td className="py-3 px-3">
        <div
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
            rank === 1
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
          )}
        >
          {rank}
        </div>
      </td>

      {/* Product */}
      <td className="py-3 px-3">
        <div className="font-medium text-zinc-800 dark:text-zinc-200">
          {recommendation.carrierName}
        </div>
        <div className="text-xs text-zinc-500">
          {recommendation.productName}
        </div>
      </td>

      {/* Expected Rating */}
      <td className="py-3 px-3 text-center">
        <span
          className={cn(
            "inline-block px-2.5 py-1 rounded-md text-xs font-medium border",
            ratingColorClass,
          )}
        >
          {recommendation.expectedRating}
        </span>
      </td>

      {/* Build Rating */}
      <td className="py-3 px-3 text-center">
        {buildRatingResult.hasTable &&
        buildRatingResult.ratingClass !== "unknown" ? (
          <div className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "inline-block px-2 py-0.5 rounded text-xs font-medium",
                buildRatingColorClass,
              )}
            >
              {BUILD_RATING_CLASS_LABELS[buildRatingResult.ratingClass]}
            </span>
            <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
              <Ruler className="h-2.5 w-2.5" />
              Build table
            </span>
          </div>
        ) : (
          <span className="text-xs text-zinc-400">—</span>
        )}
      </td>

      {/* Confidence */}
      <td className="py-3 px-3 text-center">
        <div className={cn("font-semibold text-sm", confidenceColor)}>
          {Math.round(recommendation.confidence * 100)}%
        </div>
        {recommendation.treeMatchBoost && recommendation.treeMatchBoost > 0 && (
          <div className="text-[10px] text-emerald-500">
            +{Math.round(recommendation.treeMatchBoost * 100)}% boost
          </div>
        )}
      </td>

      {/* Key Factors */}
      <td className="py-3 px-3">
        <div className="flex flex-wrap gap-1.5">
          {recommendation.keyFactors.slice(0, 3).map((factor, i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
            >
              {factor}
            </span>
          ))}
          {recommendation.concerns.length > 0 && (
            <span className="text-xs px-2 py-1 rounded-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300">
              {recommendation.concerns.length} concern
              {recommendation.concerns.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// Decision Engine Table Component (Compact Display)
// ============================================================================

interface DecisionEngineTableProps {
  eligibleProducts: DecisionEngineRecommendation[];
  unknownEligibility: DecisionEngineRecommendation[];
}

function DecisionEngineTable({
  eligibleProducts,
  unknownEligibility,
}: DecisionEngineTableProps) {
  // Sort by premium (low to high), with nulls at the end
  const sortByPremium = (
    a: DecisionEngineRecommendation,
    b: DecisionEngineRecommendation,
  ) => {
    if (a.monthlyPremium === null && b.monthlyPremium === null) return 0;
    if (a.monthlyPremium === null) return 1;
    if (b.monthlyPremium === null) return -1;
    return a.monthlyPremium - b.monthlyPremium;
  };

  const sortedRecommendations = [...eligibleProducts].sort(sortByPremium);
  const sortedUnknown = [...unknownEligibility].sort(sortByPremium);

  const allRecs = [
    ...sortedRecommendations.map((r) => ({ ...r, isUnknown: false })),
    ...sortedUnknown.map((r) => ({ ...r, isUnknown: true })),
  ];

  if (allRecs.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-zinc-200 dark:border-zinc-700 text-left bg-zinc-50 dark:bg-zinc-800/50">
            <th className="py-3 px-4 font-semibold text-zinc-600 dark:text-zinc-300">
              Product
            </th>
            <th className="py-3 px-4 font-semibold text-zinc-600 dark:text-zinc-300 text-right">
              Monthly Premium
            </th>
            <th className="py-3 px-4 font-semibold text-zinc-600 dark:text-zinc-300 text-center">
              Health Class
            </th>
            <th className="py-3 px-4 font-semibold text-zinc-600 dark:text-zinc-300">
              Coverage Options
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {allRecs.map((rec) => (
            <DecisionEngineRow
              key={`${rec.carrierId}-${rec.productId}`}
              recommendation={rec}
              isUnknown={rec.isUnknown}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Decision Engine Row Component (Compact Table Row)
// ============================================================================

interface DecisionEngineRowProps {
  recommendation: DecisionEngineRecommendation & { isUnknown?: boolean };
  isUnknown: boolean;
}

function DecisionEngineRow({
  recommendation,
  isUnknown,
}: DecisionEngineRowProps) {
  const isTableRated = recommendation.buildRating?.startsWith("table_");

  const healthClassDisplay = isTableRated ? (
    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
      {BUILD_RATING_CLASS_LABELS[recommendation.buildRating!] ?? "Table Rated"}
    </span>
  ) : recommendation.wasFallback ? (
    <span className="text-xs">
      <span className="line-through opacity-50 mr-0.5">
        {recommendation.healthClassRequested?.slice(0, 4)}
      </span>
      →
      <span className="font-medium ml-0.5">
        {recommendation.healthClassUsed?.slice(0, 4)}
      </span>
    </span>
  ) : (
    <span className="text-xs">{recommendation.healthClassResult}</span>
  );

  return (
    <tr
      className={cn(
        "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors bg-white dark:bg-zinc-900",
        isUnknown && "bg-yellow-50 dark:bg-yellow-900/20",
      )}
    >
      {/* Product Column */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {isUnknown && (
            <HelpCircle className="h-4 w-4 text-yellow-500 shrink-0" />
          )}
          <div className="min-w-0">
            <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate text-sm">
              {recommendation.carrierName}
            </div>
            <div className="text-xs text-zinc-500 truncate">
              {recommendation.productName}
              {recommendation.termYears !== null &&
                recommendation.termYears !== undefined && (
                  <span className="text-indigo-500 ml-1.5 font-medium">
                    {recommendation.termYears} Year
                  </span>
                )}
              {recommendation.termYears === null && (
                <span className="text-emerald-500 ml-1.5 font-medium">
                  Permanent
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Premium Column */}
      <td className="py-3 px-4 text-right">
        {recommendation.monthlyPremium !== null ? (
          <div>
            <span className="font-bold text-base text-zinc-800 dark:text-zinc-200">
              {formatDECurrency(recommendation.monthlyPremium)}
            </span>
            <span className="text-xs text-zinc-400 ml-0.5">/mo</span>
          </div>
        ) : recommendation.buildRating?.startsWith("table_") ? (
          <div>
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
              Substandard
            </span>
            <div className="text-[9px] text-zinc-400 mt-0.5">
              Call UW for rating
            </div>
          </div>
        ) : (
          <span className="text-zinc-400 text-sm">TBD</span>
        )}
      </td>

      {/* Health Class Column */}
      <td className="py-3 px-4 text-center">
        <span className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium border border-zinc-200 dark:border-zinc-700">
          {healthClassDisplay}
        </span>
      </td>

      {/* Coverage Options Column - Mini Table */}
      <td className="py-2 px-3">
        {recommendation.alternativeQuotes &&
        recommendation.alternativeQuotes.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="py-1 px-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Face Amount
                </th>
                <th className="py-1 px-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
                  Monthly
                </th>
              </tr>
            </thead>
            <tbody>
              {recommendation.alternativeQuotes.map((quote, idx) => {
                const isRequested =
                  quote.faceAmount === recommendation.maxCoverage;
                return (
                  <tr
                    key={idx}
                    className={cn(
                      "border-b border-zinc-100 dark:border-zinc-800 last:border-0",
                      isRequested && "bg-indigo-50 dark:bg-indigo-900/30",
                    )}
                  >
                    <td
                      className={cn(
                        "py-1.5 px-2",
                        isRequested
                          ? "font-semibold text-indigo-600 dark:text-indigo-400"
                          : "text-zinc-700 dark:text-zinc-300",
                      )}
                    >
                      {formatDECurrency(quote.faceAmount)}
                    </td>
                    <td
                      className={cn(
                        "py-1.5 px-2 text-right",
                        isRequested
                          ? "font-semibold text-indigo-600 dark:text-indigo-400"
                          : "text-zinc-600 dark:text-zinc-400",
                      )}
                    >
                      {formatDECurrency(quote.monthlyPremium)}/mo
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <span className="text-xs text-zinc-400">—</span>
        )}
      </td>
    </tr>
  );
}
