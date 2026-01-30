// src/features/hierarchy/components/TeamAnalyticsDashboard.tsx

import React, { lazy, Suspense, useState } from "react";
import { BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTeamAnalyticsData } from "@/hooks/analytics";
import {
  TeamPaceMetrics,
  TeamCarriersProductsBreakdown,
  TeamProductMatrix,
  TeamPolicyStatusBreakdown,
  TeamGeographicAnalysis,
  TeamAgentSegments,
  TeamGamePlan,
  TeamCommissionPipeline,
  TeamPredictiveAnalytics,
} from "./analytics";

interface TeamAnalyticsDashboardProps {
  /** Start date for analytics data (ISO string) */
  startDate: string;
  /** End date for analytics data (ISO string) */
  endDate: string;
}

/**
 * TeamAnalyticsDashboard - Container for all 9 team analytics sections
 *
 * Embeds below the AgentTable on the Team Hierarchy page.
 * Uses server-side aggregation via useTeamAnalyticsData hook.
 */
export function TeamAnalyticsDashboard({
  startDate,
  endDate,
}: TeamAnalyticsDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch team analytics data
  const {
    isLoading,
    isError,
    rawData,
    agentMetrics,
    agentSegmentation,
    teamGamePlan,
    teamPace,
    policyStatus,
    geographicBreakdown,
    carrierBreakdown,
    teamUserIds,
  } = useTeamAnalyticsData({
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    enabled: true,
  });

  // Don't render if no team (just the current user)
  if (teamUserIds.length <= 1 && !isLoading) {
    return null;
  }

  if (isError) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-center text-[11px] text-red-500 dark:text-red-400">
          Failed to load team analytics. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      {/* Collapsible Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Team Analytics
            </h2>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              {teamUserIds.length} team members • Performance metrics and
              insights
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          )}
        </Button>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-3">
          {isLoading ? (
            <div className="p-4 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
              Loading team analytics...
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-2">
              {/* 1. Pace Metrics */}
              <TeamPaceMetrics data={teamPace} isLoading={isLoading} />

              {/* 2. Carriers & Products Breakdown */}
              <TeamCarriersProductsBreakdown
                data={carrierBreakdown}
                isLoading={isLoading}
              />

              {/* 3. Product Mix */}
              <TeamProductMatrix
                data={carrierBreakdown}
                isLoading={isLoading}
              />

              {/* 4. Policy Status Breakdown */}
              <TeamPolicyStatusBreakdown
                data={policyStatus}
                isLoading={isLoading}
              />

              {/* 5. Premium by State */}
              <TeamGeographicAnalysis
                data={geographicBreakdown}
                isLoading={isLoading}
              />

              {/* 6. Agent Segments (replaces Client Segmentation) */}
              <TeamAgentSegments
                data={agentSegmentation}
                isLoading={isLoading}
              />

              {/* 7. Team Game Plan */}
              <TeamGamePlan data={teamGamePlan} isLoading={isLoading} />

              {/* 8. Commission Pipeline */}
              <TeamCommissionPipeline rawData={rawData} isLoading={isLoading} />

              {/* 9. Predictive Analytics */}
              <TeamPredictiveAnalytics
                rawData={rawData}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-3 px-2 py-1 text-[10px] text-zinc-400 dark:text-zinc-500 text-center">
            Team data aggregated from {teamUserIds.length} agents • Auto-refresh
            on data changes
          </div>
        </div>
      )}
    </div>
  );
}
