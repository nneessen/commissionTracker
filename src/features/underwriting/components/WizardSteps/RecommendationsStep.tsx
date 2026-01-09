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
  result: AIAnalysisResult | null;
  clientInfo: ClientInfo;
  healthInfo: HealthInfo;
  coverageRequest: CoverageRequest;
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
  result,
  clientInfo,
  healthInfo,
  coverageRequest,
}: RecommendationsStepProps) {
  // Extract product IDs and carrier IDs from recommendations
  const productIds = result?.recommendations.map((r) => r.productId) ?? [];
  const carrierIds = [
    ...new Set(result?.recommendations.map((r) => r.carrierId) ?? []),
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

  // Apply eligibility filtering if constraints are loaded
  let eligibleRecommendations: RecommendationWithEligibility[] = [];
  let ineligibleRecommendations: RecommendationWithEligibility[] = [];

  if (result && constraintsMap) {
    const withEligibility = applyEligibilityToRecommendations(
      result.recommendations,
      clientProfile,
      constraintsMap,
      conditionNames,
    );
    const separated = separateByEligibility(withEligibility);
    eligibleRecommendations = separated.eligible;
    ineligibleRecommendations = separated.ineligible;
  }

  const tierConfig = result
    ? HEALTH_TIER_CONFIG[result.healthTier] || HEALTH_TIER_CONFIG.standard
    : null;

  if (!result) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-zinc-500">
        No analysis results available.
      </div>
    );
  }

  const TierIcon = tierConfig?.icon || CheckCircle;

  return (
    <div className="space-y-4 p-1">
      {/* Health Tier Summary */}
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
              {getHealthTierLabel(result.healthTier)}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              For {clientInfo.name || "this client"}, age {clientInfo.age}
              {coverageRequest.faceAmount > 0 && (
                <> • Requested: {formatCurrency(coverageRequest.faceAmount)}</>
              )}
            </p>
          </div>
        </div>

        {/* Risk Factors */}
        {result.riskFactors.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1">
              Risk Factors Considered
            </div>
            <div className="flex flex-wrap gap-1">
              {result.riskFactors.map((factor, i) => (
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

      {/* Loading state */}
      {(constraintsLoading || buildTablesLoading) && (
        <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-500">
            Checking eligibility and build tables...
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
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-center">
              <XCircle className="h-6 w-6 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">
                No eligible products found for this client profile.
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
      {result.reasoning && (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
              Analysis Summary
            </span>
          </div>
          <div className="p-3">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
              {result.reasoning}
            </p>
          </div>
        </div>
      )}

      {/* Processing Info */}
      {result.processingTimeMs && (
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <Clock className="h-3 w-3" />
          Analysis completed in {(result.processingTimeMs / 1000).toFixed(1)}s
        </div>
      )}
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
