// src/features/hierarchy/components/analytics/TeamPredictiveAnalytics.tsx

import React from "react";
import { cn } from "@/lib/utils";
import type { TeamAnalyticsRawData } from "@/types/team-analytics.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";

interface TeamPredictiveAnalyticsProps {
  rawData: TeamAnalyticsRawData | undefined;
  isLoading?: boolean;
}

/**
 * TeamPredictiveAnalytics - Team growth forecasts and risk analysis
 *
 * Shows:
 * - Growth trajectory based on historical data
 * - Renewal forecasts
 * - Chargeback risk assessment
 */
export function TeamPredictiveAnalytics({
  rawData,
  isLoading,
}: TeamPredictiveAnalyticsProps) {
  if (isLoading || !rawData) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Team Predictive Analytics
        </div>
        <div className="p-3 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
          {isLoading ? "Loading..." : "No data available"}
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate growth metrics
  const now = new Date();
  const threeMonthsAgo = new Date(
    now.getFullYear(),
    now.getMonth() - 3,
    1
  );
  const sixMonthsAgo = new Date(
    now.getFullYear(),
    now.getMonth() - 6,
    1
  );

  // Recent policies (last 3 months)
  const recentPolicies = rawData.allPolicies.filter((p) => {
    const date = new Date(p.created_at);
    return date >= threeMonthsAgo;
  });

  // Previous period policies (3-6 months ago)
  const previousPolicies = rawData.allPolicies.filter((p) => {
    const date = new Date(p.created_at);
    return date >= sixMonthsAgo && date < threeMonthsAgo;
  });

  // Calculate growth rate
  const recentAP = recentPolicies.reduce(
    (sum, p) => sum + (p.annual_premium || 0),
    0
  );
  const previousAP = previousPolicies.reduce(
    (sum, p) => sum + (p.annual_premium || 0),
    0
  );
  const growthRate =
    previousAP > 0 ? ((recentAP - previousAP) / previousAP) * 100 : 0;

  // Project next quarter
  const projectedNextQuarter = recentAP * (1 + growthRate / 100);

  // Calculate renewal forecast (policies approaching anniversary)
  const upcomingRenewals = rawData.allPolicies.filter((p) => {
    if (p.status !== "active" || !p.term_length) return false;
    const effectiveDate = new Date(p.effective_date);
    const renewalDate = new Date(effectiveDate);
    renewalDate.setFullYear(renewalDate.getFullYear() + p.term_length);

    const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    return renewalDate >= now && renewalDate <= next90Days;
  });

  const renewalPremium = upcomingRenewals.reduce(
    (sum, p) => sum + (p.annual_premium || 0),
    0
  );

  // Calculate chargeback risk
  const commissionsByPolicy = new Map<string, typeof rawData.allCommissions[0]>();
  rawData.allCommissions.forEach((c) => {
    if (c.policy_id && !commissionsByPolicy.has(c.policy_id)) {
      commissionsByPolicy.set(c.policy_id, c);
    }
  });

  const atRiskPolicies = rawData.allPolicies
    .filter((p) => {
      if (p.status !== "active") return false;
      const commission = p.id ? commissionsByPolicy.get(p.id) : null;
      if (!commission) return false;

      // At risk if less than 50% of advance months paid
      const monthsPaid = commission.months_paid || 0;
      const advanceMonths = commission.advance_months || 9;
      return monthsPaid < advanceMonths * 0.5;
    })
    .sort((a, b) => (b.annual_premium || 0) - (a.annual_premium || 0))
    .slice(0, 5);

  const totalAtRiskPremium = atRiskPolicies.reduce(
    (sum, p) => sum + (p.annual_premium || 0),
    0
  );

  // Create agent profile lookup
  const agentProfiles = new Map<string, string>();
  rawData.agentProfiles.forEach((p) => {
    const name =
      [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email;
    agentProfiles.set(p.id, name);
  });

  // Create client lookup
  const clients = new Map<string, string>();
  rawData.clients.forEach((c) => {
    clients.set(c.id, c.name || "Unknown");
  });

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Team Predictive Analytics
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Growth forecasts & risk analysis
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {/* Growth Rate */}
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp
              className={cn(
                "h-3 w-3",
                growthRate >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            />
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Growth Rate
            </span>
          </div>
          <div
            className={cn(
              "font-mono font-bold text-sm",
              growthRate >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {growthRate >= 0 ? "+" : ""}
            {growthRate.toFixed(1)}%
          </div>
          <div className="text-[9px] text-zinc-400 dark:text-zinc-500">
            vs prior quarter
          </div>
        </div>

        {/* Upcoming Renewals */}
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded">
          <div className="flex items-center gap-1 mb-1">
            <RefreshCw className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Renewals (90d)
            </span>
          </div>
          <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
            {upcomingRenewals.length}
          </div>
          <div className="text-[9px] text-zinc-400 dark:text-zinc-500">
            {formatCurrency(renewalPremium)} premium
          </div>
        </div>

        {/* At Risk */}
        <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              At Risk
            </span>
          </div>
          <div className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
            {atRiskPolicies.length}
          </div>
          <div className="text-[9px] text-zinc-400 dark:text-zinc-500">
            {formatCurrency(totalAtRiskPremium)} AP
          </div>
        </div>
      </div>

      {/* Projection */}
      <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded mb-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Projected Next Quarter
          </span>
          <span
            className={cn(
              "font-mono font-bold text-sm",
              growthRate >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            )}
          >
            {formatCurrency(projectedNextQuarter)}
          </span>
        </div>
        <div className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
          Based on {growthRate >= 0 ? "+" : ""}
          {growthRate.toFixed(1)}% growth trend
        </div>
      </div>

      {/* High Risk Policies */}
      {atRiskPolicies.length > 0 && (
        <>
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Highest Risk Policies
          </div>
          <Table className="text-[11px]">
            <TableHeader>
              <TableRow className="h-6 border-b border-zinc-200 dark:border-zinc-800">
                <TableHead className="p-1 text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                  Client
                </TableHead>
                <TableHead className="p-1 text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                  Agent
                </TableHead>
                <TableHead className="p-1 text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                  Premium
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRiskPolicies.map((policy) => (
                <TableRow
                  key={policy.id}
                  className="border-b border-zinc-100 dark:border-zinc-800/50"
                >
                  <TableCell className="p-1 text-zinc-900 dark:text-zinc-100 truncate max-w-[100px]">
                    {policy.client_id
                      ? clients.get(policy.client_id) || "Unknown"
                      : "Unknown"}
                  </TableCell>
                  <TableCell className="p-1 text-zinc-500 dark:text-zinc-400 truncate max-w-[100px]">
                    {agentProfiles.get(policy.user_id) || "Unknown"}
                  </TableCell>
                  <TableCell className="p-1 text-right font-mono text-amber-600 dark:text-amber-400">
                    {formatCurrency(policy.annual_premium || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {/* Confidence Note */}
      <div className="mt-2 text-[9px] text-zinc-400 dark:text-zinc-500 text-center">
        Projections based on 6-month historical data • Confidence: Medium
      </div>
    </div>
  );
}
