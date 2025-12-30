// src/features/reports/components/AgencyPerformanceReport.tsx

import { useMemo, useCallback } from "react";
import { Loader2, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "../../../lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { TrendLineChart } from "./charts/TrendLineChart";
import {
  useAgencyPerformanceReport,
  useAgencyProductionByAgent,
  agencyKeys,
} from "../../../hooks/imo/useImoQueries";
import { formatCurrency } from "../../../lib/format";
import type { ReportDateRange } from "../../../types/team-reports.schemas";
import {
  ReportErrorBoundary,
  QueryErrorAlert,
  ReportQueryError,
} from "./ReportErrorBoundary";

interface AgencyPerformanceReportProps {
  agencyId?: string;
  dateRange?: ReportDateRange;
}

function AgencyPerformanceReportContent({
  agencyId,
  dateRange,
}: AgencyPerformanceReportProps) {
  const queryClient = useQueryClient();

  const {
    data: performanceReport,
    isLoading: isLoadingPerformance,
    error: errorPerformance,
  } = useAgencyPerformanceReport(agencyId, dateRange);

  const {
    data: agentProduction,
    isLoading: isLoadingAgents,
    error: errorAgents,
  } = useAgencyProductionByAgent(agencyId);

  const isLoading = isLoadingPerformance || isLoadingAgents;

  const hasCriticalError = errorPerformance !== null;

  const secondaryErrors = [
    { name: "Agent Production", error: errorAgents },
  ].filter((e) => e.error !== null);

  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: agencyKeys.all });
  }, [queryClient]);

  const trendData = useMemo(() => {
    if (!performanceReport?.months) return [];
    return performanceReport.months.map((month) => ({
      label: month.month_label,
      premium: month.new_premium,
      commissions: month.commissions_earned,
      policies: month.new_policies,
    }));
  }, [performanceReport]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
        <span className="ml-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          Loading agency performance data...
        </span>
      </div>
    );
  }

  if (hasCriticalError) {
    return (
      <ReportQueryError
        message={
          errorPerformance instanceof Error
            ? errorPerformance.message
            : "Failed to load performance data"
        }
        onRetry={handleRetry}
      />
    );
  }

  if (!performanceReport) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex flex-col items-center justify-center text-center py-4">
          <AlertCircle className="h-6 w-6 text-zinc-400 dark:text-zinc-500 mb-2" />
          <p className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100">
            Agency Performance Report Unavailable
          </p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 max-w-[300px]">
            This report requires database features that may not be available
            yet.
          </p>
        </div>
      </div>
    );
  }

  const { summary } = performanceReport;
  const netGrowthPositive = summary.net_growth >= 0;

  return (
    <div className="space-y-2">
      {secondaryErrors.length > 0 && (
        <QueryErrorAlert
          title="Some data failed to load"
          errors={secondaryErrors}
          onRetry={handleRetry}
        />
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Summary Stats Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Performance Summary
            </div>
            <div
              className={cn(
                "px-1.5 py-0.5 rounded text-[9px] font-medium",
                netGrowthPositive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400",
              )}
            >
              {netGrowthPositive ? "GROWTH" : "DECLINE"}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 dark:text-zinc-400">
                New Premium
              </span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(summary.total_new_premium)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 dark:text-zinc-400">
                Commissions
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(summary.total_commissions)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 dark:text-zinc-400">
                New Policies
              </span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {summary.total_new_policies.toLocaleString()}
              </span>
            </div>
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 dark:text-zinc-400">
                New Agents
              </span>
              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                {summary.total_new_agents.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 dark:text-zinc-400">Lapsed</span>
              <span className="font-mono font-bold text-red-600 dark:text-red-400">
                {summary.total_lapsed.toLocaleString()}
              </span>
            </div>
            <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-500 dark:text-zinc-400 uppercase">
                Net Growth
              </span>
              <div className="flex items-center gap-1">
                {netGrowthPositive ? (
                  <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600 dark:text-red-400" />
                )}
                <span
                  className={cn(
                    "font-mono font-bold",
                    netGrowthPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {netGrowthPositive ? "+" : ""}
                  {formatCurrency(summary.net_growth)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Monthly Production Trend
          </div>
          <TrendLineChart
            data={trendData}
            lines={[
              {
                dataKey: "premium",
                name: "New Premium",
                color: "#3b82f6",
                format: "currency",
              },
              {
                dataKey: "commissions",
                name: "Commissions",
                color: "#10b981",
                format: "currency",
              },
            ]}
            height={200}
          />
        </div>
      </div>

      {/* Agent Production */}
      {agentProduction && agentProduction.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Agent Production
            </div>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {agentProduction.length} agents
            </span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-200 dark:border-zinc-800">
                  <TableHead className="text-[10px] text-zinc-500 dark:text-zinc-400 py-1.5 h-auto w-12">
                    #
                  </TableHead>
                  <TableHead className="text-[10px] text-zinc-500 dark:text-zinc-400 py-1.5 h-auto">
                    Agent
                  </TableHead>
                  <TableHead className="text-[10px] text-zinc-500 dark:text-zinc-400 py-1.5 h-auto text-right">
                    Policies
                  </TableHead>
                  <TableHead className="text-[10px] text-zinc-500 dark:text-zinc-400 py-1.5 h-auto text-right">
                    Premium
                  </TableHead>
                  <TableHead className="text-[10px] text-zinc-500 dark:text-zinc-400 py-1.5 h-auto text-right">
                    Commissions
                  </TableHead>
                  <TableHead className="text-[10px] text-zinc-500 dark:text-zinc-400 py-1.5 h-auto text-right">
                    % Share
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentProduction.slice(0, 10).map((agent, index) => (
                  <TableRow
                    key={agent.agent_id}
                    className="border-zinc-200 dark:border-zinc-800"
                  >
                    <TableCell className="text-[11px] py-1.5">
                      <div
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold",
                          index === 0
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            : index === 1
                              ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                              : index === 2
                                ? "bg-orange-500/20 text-orange-600 dark:text-orange-400"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400",
                        )}
                      >
                        {index + 1}
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] py-1.5">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {agent.agent_name}
                        </p>
                        <p className="text-[9px] text-zinc-500 dark:text-zinc-400">
                          {agent.agent_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-[11px] py-1.5 text-right font-mono text-zinc-900 dark:text-zinc-100">
                      {agent.active_policies}
                    </TableCell>
                    <TableCell className="text-[11px] py-1.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(agent.total_annual_premium)}
                    </TableCell>
                    <TableCell className="text-[11px] py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(agent.commissions_ytd)}
                    </TableCell>
                    <TableCell className="text-[11px] py-1.5 text-right font-mono text-zinc-500 dark:text-zinc-400">
                      {agent.pct_of_agency_production}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Monthly Breakdown */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
          Monthly Breakdown
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200 dark:border-zinc-800">
                <TableHead className="text-[10px] text-zinc-500 dark:text-zinc-400 py-1.5 h-auto">
                  Month
                </TableHead>
                <TableHead className="text-[10px] text-zinc-500 dark:text-zinc-400 py-1.5 h-auto text-right">
                  Policies
                </TableHead>
                <TableHead className="text-[10px] text-zinc-500 dark:text-zinc-400 py-1.5 h-auto text-right">
                  Premium
                </TableHead>
                <TableHead className="text-[10px] text-zinc-500 dark:text-zinc-400 py-1.5 h-auto text-right">
                  Commissions
                </TableHead>
                <TableHead className="text-[10px] text-zinc-500 dark:text-zinc-400 py-1.5 h-auto text-right">
                  Lapsed
                </TableHead>
                <TableHead className="text-[10px] text-zinc-500 dark:text-zinc-400 py-1.5 h-auto text-right">
                  Net Change
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performanceReport.months.map((month) => (
                <TableRow
                  key={month.month_start}
                  className="border-zinc-200 dark:border-zinc-800"
                >
                  <TableCell className="text-[11px] py-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                    {month.month_label}
                  </TableCell>
                  <TableCell className="text-[11px] py-1.5 text-right font-mono text-zinc-900 dark:text-zinc-100">
                    {month.new_policies}
                  </TableCell>
                  <TableCell className="text-[11px] py-1.5 text-right font-mono text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(month.new_premium)}
                  </TableCell>
                  <TableCell className="text-[11px] py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(month.commissions_earned)}
                  </TableCell>
                  <TableCell className="text-[11px] py-1.5 text-right font-mono text-red-600 dark:text-red-400">
                    {month.policies_lapsed}
                  </TableCell>
                  <TableCell className="text-[11px] py-1.5 text-right font-mono">
                    <span
                      className={cn(
                        month.net_premium_change >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {month.net_premium_change >= 0 ? "+" : ""}
                      {formatCurrency(month.net_premium_change)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function AgencyPerformanceReport(props: AgencyPerformanceReportProps) {
  const queryClient = useQueryClient();

  const handleBoundaryRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: agencyKeys.all });
  }, [queryClient]);

  return (
    <ReportErrorBoundary onRetry={handleBoundaryRetry}>
      <AgencyPerformanceReportContent {...props} />
    </ReportErrorBoundary>
  );
}
