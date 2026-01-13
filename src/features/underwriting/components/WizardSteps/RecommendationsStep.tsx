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
  Shield,
  Ban,
  FileCheck,
  Ruler,
  GitBranch,
  Database,
  Sparkles,
  DollarSign,
  TrendingUp as Coverage,
  ThumbsUp,
  HelpCircle,
  FileQuestion,
  Eye,
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
import type {
  DecisionEngineResult,
  Recommendation as DecisionEngineRecommendation,
} from "@/services/underwriting/decisionEngine";
import {
  formatRecommendationReason,
  getReasonBadgeColor,
  formatCurrency as formatDECurrency,
  formatPercentage,
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
  getRatingComparisonMessage,
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
  const clientProfile: EligibilityClientProfile = {
    age: clientInfo.age,
    requestedFaceAmount: coverageRequest.faceAmount,
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
      ...decisionEngineResult.recommendations,
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
                {coverageRequest.faceAmount > 0 && (
                  <>
                    {" "}
                    • Requested: {formatCurrency(coverageRequest.faceAmount)}
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
        <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800 flex items-center gap-2">
          <Database className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
            Rate Table Recommendations
          </span>
          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 ml-auto">
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

        <div className="p-3">
          {isDecisionEngineLoading ? (
            <div className="flex items-center gap-2 p-4 justify-center">
              <div className="h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-500">
                Searching rate tables...
              </span>
            </div>
          ) : decisionEngineResult &&
            (decisionEngineResult.recommendations.length > 0 ||
              decisionEngineResult.unknownEligibility.length > 0) ? (
            <div className="space-y-3">
              {/* Eligible Recommendations */}
              {decisionEngineResult.recommendations.length > 0 && (
                <div className="space-y-2">
                  {decisionEngineResult.recommendations.map((rec) => (
                    <DecisionEngineCard
                      key={`de-${rec.carrierId}-${rec.productId}`}
                      recommendation={rec}
                    />
                  ))}
                </div>
              )}

              {/* Unknown Eligibility Products */}
              {decisionEngineResult.unknownEligibility.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-[11px] font-medium text-yellow-700 dark:text-yellow-400">
                      Verification Needed (
                      {decisionEngineResult.unknownEligibility.length})
                    </span>
                    <span className="text-[10px] text-yellow-600 dark:text-yellow-500 ml-auto">
                      Missing follow-up data
                    </span>
                  </div>
                  <div className="space-y-2">
                    {decisionEngineResult.unknownEligibility.map((rec) => (
                      <UnknownEligibilityCard
                        key={`de-unknown-${rec.carrierId}-${rec.productId}`}
                        recommendation={rec}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Footer */}
              <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 flex flex-wrap items-center gap-2">
                <span>
                  Searched {decisionEngineResult.filtered.totalProducts}{" "}
                  products
                </span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {decisionEngineResult.filtered.passedEligibility} eligible
                </span>
                {decisionEngineResult.filtered.unknownEligibility > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-yellow-600 dark:text-yellow-400">
                      {decisionEngineResult.filtered.unknownEligibility} need
                      verification
                    </span>
                  </>
                )}
                <span>•</span>
                <span>
                  {decisionEngineResult.filtered.withPremiums} with rates
                </span>
                <span className="ml-auto">
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
        <div className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300">
            AI-Powered Analysis
          </span>
          <span className="text-[10px] text-purple-500 dark:text-purple-400 ml-auto">
            Using underwriting guides
          </span>
        </div>
        <div className="p-3">
          {isAILoading ? (
            <div className="flex items-center gap-2 p-4 justify-center">
              <div className="h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-500">
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

              {/* Eligible Recommendations */}
              {!constraintsLoading && !buildTablesLoading && (
                <div>
                  <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    Eligible Products
                    <span className="text-zinc-400">
                      ({eligibleRecommendations.length})
                    </span>
                  </div>

                  {eligibleRecommendations.length > 0 ? (
                    <div className="space-y-2">
                      {eligibleRecommendations
                        .sort((a, b) => a.priority - b.priority)
                        .map((rec, index) => (
                          <RecommendationCard
                            key={`${rec.carrierId}-${rec.productId}`}
                            recommendation={rec}
                            rank={index + 1}
                            clientHeight={{
                              feet: clientInfo.heightFeet,
                              inches: clientInfo.heightInches,
                            }}
                            clientWeight={clientInfo.weight}
                            buildTable={buildTablesMap?.get(rec.carrierId)}
                          />
                        ))}
                    </div>
                  ) : constraintsMap ? (
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded text-center">
                      <XCircle className="h-5 w-5 text-zinc-400 mx-auto mb-1" />
                      <p className="text-[10px] text-zinc-500">
                        No eligible products found.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Ineligible Recommendations */}
              {!constraintsLoading &&
                !buildTablesLoading &&
                ineligibleRecommendations.length > 0 && (
                  <div>
                    <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
                      <Ban className="h-3.5 w-3.5 text-red-400" />
                      Ineligible Products
                      <span className="text-zinc-400">
                        ({ineligibleRecommendations.length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      {ineligibleRecommendations.map((rec) => (
                        <IneligibleRecommendationCard
                          key={`${rec.carrierId}-${rec.productId}`}
                          recommendation={rec}
                        />
                      ))}
                    </div>
                  </div>
                )}

              {/* AI Reasoning */}
              {aiResult.reasoning && (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Analysis Summary
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                    {aiResult.reasoning}
                  </p>
                </div>
              )}

              {/* Processing Info */}
              {aiResult.processingTimeMs && (
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 pt-2">
                  <Clock className="h-3 w-3" />
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

// Sub-component for eligible recommendation
interface RecommendationCardProps {
  recommendation: RecommendationWithEligibility;
  rank: number;
  clientHeight: { feet: number; inches: number };
  clientWeight: number;
  buildTable?: BuildTableData;
}

function RecommendationCard({
  recommendation,
  rank,
  clientHeight,
  clientWeight,
  buildTable,
}: RecommendationCardProps) {
  // Calculate build-based rating if table exists
  const buildRatingResult = lookupBuildRating(
    clientHeight.feet,
    clientHeight.inches,
    clientWeight,
    buildTable,
  );

  const comparisonMessage = getRatingComparisonMessage(
    recommendation.expectedRating,
    buildRatingResult.ratingClass,
  );

  const confidenceColor =
    recommendation.confidence >= 0.8
      ? "text-emerald-600"
      : recommendation.confidence >= 0.6
        ? "text-blue-600"
        : recommendation.confidence >= 0.4
          ? "text-yellow-600"
          : "text-orange-600";

  const ratingColorClass = (() => {
    const rating = recommendation.expectedRating.toLowerCase();
    if (rating.includes("preferred")) return "text-emerald-600 bg-emerald-50";
    if (rating.includes("standard")) return "text-blue-600 bg-blue-50";
    if (rating.includes("table") || rating.includes("substandard"))
      return "text-orange-600 bg-orange-50";
    if (rating.includes("decline")) return "text-red-600 bg-red-50";
    return "text-zinc-600 bg-zinc-50";
  })();

  const buildRatingColorClass = (() => {
    const rating = buildRatingResult.ratingClass;
    if (rating === "preferred_plus" || rating === "preferred")
      return "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400";
    if (rating === "standard_plus" || rating === "standard")
      return "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400";
    if (rating === "table_rated")
      return "text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400";
    return "text-zinc-600 bg-zinc-50";
  })();

  const { eligibility } = recommendation;

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-3">
        {/* Rank Badge */}
        <div
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold",
            rank === 1
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
          )}
        >
          #{rank}
        </div>

        <div className="flex-1 min-w-0">
          {/* Carrier & Product */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {recommendation.carrierName}
              </div>
              <div className="text-[11px] text-zinc-500">
                {recommendation.productName}
              </div>
            </div>
            <div className="text-right space-y-1">
              {/* AI Rating */}
              <div>
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 rounded text-[10px] font-medium",
                    ratingColorClass,
                  )}
                >
                  {recommendation.expectedRating}
                </span>
                <div className={cn("text-[10px] font-medium", confidenceColor)}>
                  {Math.round(recommendation.confidence * 100)}% confidence
                  {recommendation.treeMatchBoost &&
                    recommendation.treeMatchBoost > 0 && (
                      <span className="text-emerald-500 ml-1">
                        (+{Math.round(recommendation.treeMatchBoost * 100)}%
                        boost)
                      </span>
                    )}
                </div>
              </div>
              {/* Build Table Rating */}
              {buildRatingResult.hasTable &&
                buildRatingResult.ratingClass !== "unknown" && (
                  <div>
                    <div className="flex items-center justify-end gap-1">
                      <Ruler className="h-2.5 w-2.5 text-zinc-400" />
                      <span
                        className={cn(
                          "inline-block px-1.5 py-0.5 rounded text-[9px] font-medium",
                          buildRatingColorClass,
                        )}
                      >
                        {
                          BUILD_RATING_CLASS_LABELS[
                            buildRatingResult.ratingClass
                          ]
                        }
                      </span>
                    </div>
                    {/* Weight Guidance - shows how to reach better rating */}
                    {buildRatingResult.ratingClass !== "preferred_plus" && (
                      <WeightGuidanceMessage
                        heightFeet={clientHeight.feet}
                        heightInches={clientHeight.inches}
                        weight={clientWeight}
                        buildTable={buildTable}
                      />
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* Build Rating Comparison Warning */}
          {comparisonMessage && (
            <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-[10px] text-amber-700 dark:text-amber-300">
              <Ruler className="h-3 w-3 shrink-0" />
              <span>{comparisonMessage}</span>
            </div>
          )}

          {/* Full Underwriting Warning */}
          {eligibility.requiresFullUnderwriting && (
            <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-[10px] text-amber-700 dark:text-amber-300">
              <FileCheck className="h-3 w-3" />
              <span>
                Full underwriting required (threshold:{" "}
                {formatCurrency(eligibility.fullUnderwritingThreshold)})
              </span>
            </div>
          )}

          {/* Max Face Amount Info */}
          {eligibility.maxAllowedFaceAmount !== null &&
            !eligibility.ineligibilityReasons.length && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-500">
                <Shield className="h-3 w-3" />
                <span>
                  Max face amount:{" "}
                  {formatCurrency(eligibility.maxAllowedFaceAmount)}
                </span>
              </div>
            )}

          {/* Key Factors */}
          {recommendation.keyFactors.length > 0 && (
            <div className="mt-2">
              <div className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                Favorable Factors
              </div>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {recommendation.keyFactors.map((factor, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded text-[9px] text-emerald-700 dark:text-emerald-300"
                  >
                    <CheckCircle className="h-2.5 w-2.5" />
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Concerns */}
          {recommendation.concerns.length > 0 && (
            <div className="mt-2">
              <div className="text-[9px] font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                Potential Concerns
              </div>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {recommendation.concerns.map((concern, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded text-[9px] text-orange-700 dark:text-orange-300"
                  >
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {concern}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tree Match Indicator */}
          {recommendation.treeMatchedRules &&
            recommendation.treeMatchedRules.length > 0 && (
              <div className="mt-2">
                <div className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-1">
                  <GitBranch className="h-2.5 w-2.5" />
                  Decision Tree Match
                </div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {recommendation.treeMatchedRules.map((rule, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded text-[9px] text-indigo-700 dark:text-indigo-300"
                    >
                      {rule}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Notes */}
          {recommendation.notes && (
            <div className="mt-2 text-[10px] text-zinc-500 italic">
              {recommendation.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-component for ineligible recommendation
interface IneligibleRecommendationCardProps {
  recommendation: RecommendationWithEligibility;
}

function IneligibleRecommendationCard({
  recommendation,
}: IneligibleRecommendationCardProps) {
  const { eligibility } = recommendation;

  return (
    <div className="border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 rounded-lg p-3 opacity-75">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30">
          <Ban className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Carrier & Product */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {recommendation.carrierName}
              </div>
              <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
                {recommendation.productName}
              </div>
            </div>
          </div>

          {/* Ineligibility Reasons */}
          <div className="mt-2 space-y-1">
            {eligibility.ineligibilityReasons.map((reason, i) => (
              <div
                key={i}
                className="flex items-start gap-1.5 text-[10px] text-red-600 dark:text-red-400"
              >
                <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
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
// Decision Engine Card Component
// ============================================================================

interface DecisionEngineCardProps {
  recommendation: DecisionEngineRecommendation;
}

function DecisionEngineCard({ recommendation }: DecisionEngineCardProps) {
  const reasonBadgeColor = getReasonBadgeColor(recommendation.reason);
  const reasonLabel = formatRecommendationReason(recommendation.reason);

  // Icon for the reason badge
  const ReasonIcon =
    recommendation.reason === "cheapest"
      ? DollarSign
      : recommendation.reason === "highest_coverage"
        ? Coverage
        : ThumbsUp;

  // Approval likelihood color
  const approvalColor =
    recommendation.approvalLikelihood >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : recommendation.approvalLikelihood >= 60
        ? "text-blue-600 dark:text-blue-400"
        : recommendation.approvalLikelihood >= 40
          ? "text-yellow-600 dark:text-yellow-400"
          : "text-orange-600 dark:text-orange-400";

  return (
    <div className="border border-indigo-100 dark:border-indigo-900/50 rounded-lg p-3 bg-white dark:bg-zinc-900 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
      <div className="flex items-start gap-3">
        {/* Reason Badge */}
        <div
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-full shrink-0",
            reasonBadgeColor,
          )}
        >
          <ReasonIcon className="h-3.5 w-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header: Carrier & Product */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {recommendation.carrierName}
              </div>
              <div className="text-[11px] text-zinc-500">
                {recommendation.productName}
                {recommendation.termYears !== undefined &&
                  recommendation.termYears !== null && (
                    <span className="ml-1.5 text-indigo-500 dark:text-indigo-400">
                      • {recommendation.termYears} Year Term
                    </span>
                  )}
                {recommendation.termYears === null && (
                  <span className="ml-1.5 text-emerald-500 dark:text-emerald-400">
                    • Permanent
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Face Amount Comparison Grid */}
          {recommendation.alternativeQuotes &&
          recommendation.alternativeQuotes.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 mb-2">
              {recommendation.alternativeQuotes.map((quote, idx) => {
                const isRequested =
                  quote.faceAmount === recommendation.maxCoverage;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "text-center p-2 rounded-md border",
                      isRequested
                        ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700"
                        : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700",
                    )}
                  >
                    <div
                      className={cn(
                        "text-[10px] font-medium",
                        isRequested
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-zinc-500",
                      )}
                    >
                      {formatDECurrency(quote.faceAmount)}
                    </div>
                    <div
                      className={cn(
                        "text-base font-bold",
                        isRequested
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-zinc-700 dark:text-zinc-300",
                      )}
                    >
                      {formatDECurrency(quote.monthlyPremium)}
                      <span className="text-[9px] font-normal text-zinc-400">
                        /mo
                      </span>
                    </div>
                    <div className="text-[9px] text-zinc-400">
                      ${quote.costPerThousand.toFixed(2)} per $1K
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Fallback: Single premium display */
            <div className="mb-2 p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-center">
              <div className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                {formatDECurrency(recommendation.maxCoverage)}
              </div>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {recommendation.monthlyPremium !== null
                  ? formatDECurrency(recommendation.monthlyPremium)
                  : "TBD"}
                <span className="text-[10px] font-normal text-zinc-400">
                  /mo
                </span>
              </div>
              <div className="text-[9px] text-zinc-400">
                {recommendation.maxCoverage > 0 &&
                recommendation.monthlyPremium !== null
                  ? `$${((recommendation.monthlyPremium * 12) / (recommendation.maxCoverage / 1000)).toFixed(2)} per $1K`
                  : "N/A"}
              </div>
            </div>
          )}

          {/* Reason Badge & Health Class */}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                reasonBadgeColor,
              )}
            >
              <ReasonIcon className="h-2.5 w-2.5" />
              {reasonLabel}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {recommendation.healthClassResult}
            </span>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 mt-2 text-[10px]">
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3 text-zinc-400" />
              <span className={approvalColor}>
                {formatPercentage(recommendation.approvalLikelihood)} approval
              </span>
            </div>
            <div className="flex items-center gap-1 text-zinc-500">
              <Shield className="h-3 w-3" />
              <span>Max: {formatDECurrency(recommendation.maxCoverage)}</span>
            </div>
          </div>

          {/* Concerns */}
          {recommendation.concerns.length > 0 && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {recommendation.concerns.map((concern, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded text-[9px] text-orange-700 dark:text-orange-300"
                  >
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {concern}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Condition Decisions (if any) */}
          {recommendation.conditionDecisions.length > 0 && (
            <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-wide mb-1">
                Condition Analysis
              </div>
              <div className="space-y-1">
                {recommendation.conditionDecisions.map((cd, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-[10px]"
                  >
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {cd.conditionCode}
                    </span>
                    <span
                      className={cn(
                        cd.decision === "approved"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : cd.decision === "declined"
                            ? "text-red-600 dark:text-red-400"
                            : "text-yellow-600 dark:text-yellow-400",
                      )}
                    >
                      {cd.decision} ({cd.likelihood}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Draft Rules FYI (if any) */}
          {recommendation.draftRulesFyi &&
            recommendation.draftRulesFyi.length > 0 && (
              <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Eye className="h-2.5 w-2.5" />
                  Draft Rules (FYI Only)
                </div>
                <div className="space-y-1">
                  {recommendation.draftRulesFyi.map((rule, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-[10px] px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-800/50 rounded"
                    >
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {rule.conditionCode}
                      </span>
                      <span className="text-zinc-400 dark:text-zinc-500 italic">
                        {rule.decision} ({rule.reviewStatus})
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-zinc-400 mt-1 italic">
                  These rules are pending review and do not affect scoring
                </p>
              </div>
            )}

          {/* Score Components (data confidence) */}
          {recommendation.scoreComponents && recommendation.confidence < 1 && (
            <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-[9px] text-zinc-500">
                <span>
                  Data confidence: {Math.round(recommendation.confidence * 100)}
                  %
                </span>
                <span>•</span>
                <span>
                  Score adjusted by{" "}
                  {Math.round(
                    recommendation.scoreComponents.confidenceMultiplier * 100,
                  )}
                  %
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Unknown Eligibility Card Component
// ============================================================================

interface UnknownEligibilityCardProps {
  recommendation: DecisionEngineRecommendation;
}

function UnknownEligibilityCard({
  recommendation,
}: UnknownEligibilityCardProps) {
  return (
    <div className="border border-yellow-200 dark:border-yellow-800/50 rounded-lg p-3 bg-yellow-50/50 dark:bg-yellow-900/10">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 bg-yellow-100 dark:bg-yellow-900/30">
          <HelpCircle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header: Carrier & Product */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {recommendation.carrierName}
              </div>
              <div className="text-[11px] text-zinc-500">
                {recommendation.productName}
                {recommendation.termYears !== undefined &&
                  recommendation.termYears !== null && (
                    <span className="ml-1.5 text-yellow-600 dark:text-yellow-400">
                      • {recommendation.termYears} Year Term
                    </span>
                  )}
                {recommendation.termYears === null && (
                  <span className="ml-1.5 text-yellow-600 dark:text-yellow-400">
                    • Permanent
                  </span>
                )}
              </div>
            </div>

            {/* Premium (if available) */}
            <div className="text-right">
              <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {recommendation.monthlyPremium !== null
                  ? formatDECurrency(recommendation.monthlyPremium)
                  : "TBD"}
                <span className="text-[10px] font-normal text-zinc-400">
                  /mo
                </span>
              </div>
            </div>
          </div>

          {/* Verification Needed Badge */}
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
              <FileQuestion className="h-2.5 w-2.5" />
              Verification Needed
            </span>
            {recommendation.healthClassResult && (
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                Est. {recommendation.healthClassResult}
              </span>
            )}
          </div>

          {/* Missing Fields */}
          {recommendation.missingFields &&
            recommendation.missingFields.length > 0 && (
              <div className="mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-800/30">
                <div className="text-[9px] font-medium text-yellow-700 dark:text-yellow-400 uppercase tracking-wide mb-1">
                  Information Needed
                </div>
                <div className="space-y-1">
                  {recommendation.missingFields.map((field, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1.5 text-[10px] text-yellow-700 dark:text-yellow-300"
                    >
                      <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>{field.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Eligibility Reasons */}
          {recommendation.eligibilityReasons &&
            recommendation.eligibilityReasons.length > 0 && (
              <div className="mt-2">
                <div className="flex flex-wrap gap-1">
                  {recommendation.eligibilityReasons.map((reason, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/20 rounded text-[9px] text-yellow-700 dark:text-yellow-300"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Confidence indicator */}
          <div className="mt-2 flex items-center gap-2 text-[9px] text-yellow-600 dark:text-yellow-400">
            <div className="flex-1 h-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 dark:bg-yellow-400 rounded-full"
                style={{ width: `${recommendation.confidence * 100}%` }}
              />
            </div>
            <span>
              {Math.round(recommendation.confidence * 100)}% data complete
            </span>
          </div>

          {/* Draft Rules FYI */}
          {recommendation.draftRulesFyi &&
            recommendation.draftRulesFyi.length > 0 && (
              <div className="mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-800/30">
                <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Eye className="h-2.5 w-2.5" />
                  Pending Rules (FYI)
                </div>
                <div className="space-y-0.5">
                  {recommendation.draftRulesFyi.slice(0, 3).map((rule, i) => (
                    <div key={i} className="text-[9px] text-zinc-500 italic">
                      {rule.conditionCode}: {rule.decision}
                    </div>
                  ))}
                  {recommendation.draftRulesFyi.length > 3 && (
                    <div className="text-[9px] text-zinc-400">
                      +{recommendation.draftRulesFyi.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
