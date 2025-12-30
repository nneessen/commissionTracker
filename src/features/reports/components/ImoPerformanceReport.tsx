// src/features/reports/components/ImoPerformanceReport.tsx

import { useMemo, useCallback } from "react";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  DollarSign,
  Building2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { TrendLineChart } from "./charts/TrendLineChart";
import { BarComparisonChart } from "./charts/BarComparisonChart";
import {
  useImoPerformanceReport,
  useTeamComparisonReport,
  useTopPerformersReport,
  imoKeys,
} from "../../../hooks/imo/useImoQueries";
import { formatCurrency } from "../../../lib/format";
import type { ReportDateRange } from "../../../types/team-reports.schemas";
import {
  ReportErrorBoundary,
  QueryErrorAlert,
  ReportQueryError,
} from "./ReportErrorBoundary";

interface ImoPerformanceReportProps {
  dateRange?: ReportDateRange;
}

function ImoPerformanceReportContent({ dateRange }: ImoPerformanceReportProps) {
  const queryClient = useQueryClient();

  const {
    data: performanceReport,
    isLoading: isLoadingPerformance,
    error: errorPerformance,
  } = useImoPerformanceReport(dateRange);

  const {
    data: teamComparison,
    isLoading: isLoadingTeam,
    error: errorTeam,
  } = useTeamComparisonReport(dateRange);

  const {
    data: topPerformers,
    isLoading: isLoadingTop,
    error: errorTop,
  } = useTopPerformersReport(10, dateRange);

  const isLoading = isLoadingPerformance || isLoadingTeam || isLoadingTop;

  // Check for critical error (primary data failed)
  const hasCriticalError = errorPerformance !== null;

  // Check for secondary errors (supplementary data failed)
  const secondaryErrors = [
    { name: "Team Comparison", error: errorTeam },
    { name: "Top Performers", error: errorTop },
  ].filter((e) => e.error !== null);

  // Retry handler
  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: imoKeys.all });
  }, [queryClient]);

  // Transform data for charts
  const trendData = useMemo(() => {
    if (!performanceReport?.months) return [];
    return performanceReport.months.map((month) => ({
      label: month.month_label,
      premium: month.new_premium,
      commissions: month.commissions_earned,
      policies: month.new_policies,
    }));
  }, [performanceReport]);

  const agencyComparisonData = useMemo(() => {
    if (!teamComparison?.agencies) return [];
    return teamComparison.agencies.slice(0, 10).map((agency) => ({
      label:
        agency.agency_name.length > 15
          ? agency.agency_name.substring(0, 15) + "..."
          : agency.agency_name,
      premium: agency.new_premium,
      agents: agency.agent_count,
    }));
  }, [teamComparison]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-sm text-zinc-500">
          Loading IMO performance data...
        </span>
      </div>
    );
  }

  // Critical error - primary data failed
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
      <div className="p-6 text-center bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="text-zinc-500 dark:text-zinc-400 space-y-2">
          <p className="text-sm font-medium">
            IMO Performance Report Unavailable
          </p>
          <p className="text-xs">
            This report requires database features that may not be available
            yet. Please contact your administrator if you believe you should
            have access.
          </p>
        </div>
      </div>
    );
  }

  const { summary } = performanceReport;
  const netGrowthPositive = summary.net_growth >= 0;

  return (
    <div className="space-y-4">
      {/* Show warning for partial failures */}
      {secondaryErrors.length > 0 && (
        <QueryErrorAlert
          title="Some data failed to load"
          errors={secondaryErrors}
          onRetry={handleRetry}
        />
      )}
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-white dark:bg-zinc-900">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded">
                <DollarSign className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">
                  New Premium
                </p>
                <p className="text-sm font-semibold">
                  {formatCurrency(summary.total_new_premium)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded">
                <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">
                  Commissions
                </p>
                <p className="text-sm font-semibold">
                  {formatCurrency(summary.total_commissions)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded">
                <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">
                  New Policies
                </p>
                <p className="text-sm font-semibold">
                  {summary.total_new_policies.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded">
                <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">
                  New Agents
                </p>
                <p className="text-sm font-semibold">
                  {summary.total_new_agents.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded">
                <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">Lapsed</p>
                <p className="text-sm font-semibold">
                  {summary.total_lapsed.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded ${netGrowthPositive ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}`}
              >
                {netGrowthPositive ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="text-[10px] text-zinc-500 uppercase">
                  Net Growth
                </p>
                <p
                  className={`text-sm font-semibold ${netGrowthPositive ? "text-emerald-600" : "text-red-600"}`}
                >
                  {netGrowthPositive ? "+" : ""}
                  {formatCurrency(summary.net_growth)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold">
            Monthly Production Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
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
            height={250}
          />
        </CardContent>
      </Card>

      {/* Agency Comparison */}
      {teamComparison && teamComparison.agencies.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Agency Comparison
              </CardTitle>
              <span className="text-xs text-zinc-500">
                {teamComparison.summary.total_agencies} agencies |{" "}
                {teamComparison.summary.total_agents} agents
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-zinc-500 mb-2">
                  Top 10 Agencies by Premium
                </p>
                <BarComparisonChart
                  data={agencyComparisonData}
                  bars={[
                    {
                      dataKey: "premium",
                      name: "Premium",
                      color: "#3b82f6",
                      format: "currency",
                    },
                  ]}
                  height={200}
                  layout="vertical"
                  showLegend={false}
                />
              </div>
              <div className="overflow-x-auto">
                <p className="text-xs text-zinc-500 mb-2">Agency Rankings</p>
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="py-2">Rank</TableHead>
                      <TableHead className="py-2">Agency</TableHead>
                      <TableHead className="py-2 text-right">Premium</TableHead>
                      <TableHead className="py-2 text-right">
                        Retention
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamComparison.agencies.slice(0, 5).map((agency) => (
                      <TableRow key={agency.agency_id} className="text-xs">
                        <TableCell className="py-1.5 font-medium">
                          #{agency.rank_by_premium}
                        </TableCell>
                        <TableCell className="py-1.5">
                          {agency.agency_name}
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                          {formatCurrency(agency.new_premium)}
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                          <span
                            className={
                              agency.retention_rate >= 80
                                ? "text-green-600"
                                : agency.retention_rate >= 60
                                  ? "text-amber-600"
                                  : "text-red-600"
                            }
                          >
                            {agency.retention_rate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      {topPerformers && topPerformers.performers.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="py-2">Rank</TableHead>
                    <TableHead className="py-2">Agent</TableHead>
                    <TableHead className="py-2">Agency</TableHead>
                    <TableHead className="py-2 text-right">Policies</TableHead>
                    <TableHead className="py-2 text-right">Premium</TableHead>
                    <TableHead className="py-2 text-right">
                      Commissions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPerformers.performers.map((performer) => (
                    <TableRow key={performer.agent_id} className="text-xs">
                      <TableCell className="py-1.5 font-medium">
                        #{performer.rank_in_imo}
                      </TableCell>
                      <TableCell className="py-1.5">
                        {performer.agent_name}
                      </TableCell>
                      <TableCell className="py-1.5 text-zinc-500">
                        {performer.agency_name}
                      </TableCell>
                      <TableCell className="py-1.5 text-right">
                        {performer.new_policies}
                      </TableCell>
                      <TableCell className="py-1.5 text-right">
                        {formatCurrency(performer.new_premium)}
                      </TableCell>
                      <TableCell className="py-1.5 text-right">
                        {formatCurrency(performer.commissions_earned)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * IMO Performance Report with error boundary wrapper.
 * Catches render errors and displays user-friendly error state.
 */
export function ImoPerformanceReport(props: ImoPerformanceReportProps) {
  const queryClient = useQueryClient();

  const handleBoundaryRetry = useCallback(() => {
    // Invalidate all IMO queries to ensure fresh data after render error
    queryClient.invalidateQueries({ queryKey: imoKeys.all });
  }, [queryClient]);

  return (
    <ReportErrorBoundary onRetry={handleBoundaryRetry}>
      <ImoPerformanceReportContent {...props} />
    </ReportErrorBoundary>
  );
}
