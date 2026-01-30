// src/features/hierarchy/components/analytics/TeamCommissionPipeline.tsx

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

interface TeamCommissionPipelineProps {
  rawData: TeamAnalyticsRawData | undefined;
  isLoading?: boolean;
}

/**
 * TeamCommissionPipeline - Team pending commissions overview
 *
 * Shows pending commission amounts across the team with:
 * - Total pending by status
 * - Earned vs unearned breakdown
 * - Timeline to payment
 */
export function TeamCommissionPipeline({
  rawData,
  isLoading,
}: TeamCommissionPipelineProps) {
  if (isLoading || !rawData) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Team Commission Pipeline
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

  // Calculate pipeline metrics from all commissions
  const allCommissions = rawData.allCommissions;

  // Group by status
  const statusGroups = {
    pending: allCommissions.filter((c) => c.payment_status === "pending"),
    earned: allCommissions.filter((c) => c.payment_status === "earned"),
    paid: allCommissions.filter((c) => c.payment_status === "paid"),
  };

  // Calculate totals
  const pendingAmount = statusGroups.pending.reduce(
    (sum, c) => sum + (c.commission_amount || 0),
    0
  );
  const earnedAmount = statusGroups.earned.reduce(
    (sum, c) => sum + (c.commission_amount || 0),
    0
  );
  const paidAmount = statusGroups.paid.reduce(
    (sum, c) => sum + (c.commission_amount || 0),
    0
  );

  // Calculate unearned amounts (at risk)
  const totalUnearned = allCommissions.reduce(
    (sum, c) => sum + (c.unearned_amount || 0),
    0
  );
  const totalEarnedAmount = allCommissions.reduce(
    (sum, c) => sum + (c.earned_amount || 0),
    0
  );

  // Calculate months paid summary
  const commissionsWithMonths = allCommissions.filter(
    (c) =>
      c.months_paid !== null &&
      c.advance_months !== null &&
      c.payment_status !== "paid"
  );

  const earningProgress =
    commissionsWithMonths.length > 0
      ? commissionsWithMonths.reduce((sum, c) => {
          const progress = c.advance_months
            ? ((c.months_paid || 0) / c.advance_months) * 100
            : 0;
          return sum + progress;
        }, 0) / commissionsWithMonths.length
      : 0;

  // Group commissions by agent for top earners
  const agentTotals = new Map<string, number>();
  const agentProfiles = new Map<string, string>();

  rawData.agentProfiles.forEach((p) => {
    const name =
      [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email;
    agentProfiles.set(p.id, name);
  });

  allCommissions.forEach((c) => {
    if (c.payment_status !== "paid") {
      const current = agentTotals.get(c.user_id) || 0;
      agentTotals.set(c.user_id, current + (c.commission_amount || 0));
    }
  });

  // Sort agents by pending amount
  const topAgentsPending = Array.from(agentTotals.entries())
    .map(([id, amount]) => ({
      id,
      name: agentProfiles.get(id) || "Unknown",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Status cards configuration
  const statusCards = [
    {
      label: "Pending",
      count: statusGroups.pending.length,
      amount: pendingAmount,
      color: "amber",
    },
    {
      label: "Earned",
      count: statusGroups.earned.length,
      amount: earnedAmount,
      color: "blue",
    },
    {
      label: "Paid",
      count: statusGroups.paid.length,
      amount: paidAmount,
      color: "emerald",
    },
  ];

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      amber: "text-amber-600 dark:text-amber-400",
      blue: "text-blue-600 dark:text-blue-400",
      emerald: "text-emerald-600 dark:text-emerald-400",
    };
    return colors[color] || "";
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Team Commission Pipeline
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {allCommissions.length} total commissions
          </div>
        </div>
        <div
          className={cn(
            "px-1.5 py-0.5 rounded text-[9px] font-medium",
            earningProgress >= 75
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : earningProgress >= 50
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "bg-red-500/10 text-red-600 dark:text-red-400"
          )}
        >
          {earningProgress.toFixed(0)}% Earning Progress
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {statusCards.map((status) => (
          <div
            key={status.label}
            className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded text-center"
          >
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">
              {status.label}
            </div>
            <div
              className={cn(
                "font-mono font-bold text-sm",
                getColorClass(status.color)
              )}
            >
              {formatCurrency(status.amount)}
            </div>
            <div className="text-[9px] text-zinc-400 dark:text-zinc-500">
              {status.count} entries
            </div>
          </div>
        ))}
      </div>

      {/* Earned vs Unearned */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="p-2 bg-emerald-500/10 rounded">
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mb-0.5">
            Total Earned
          </div>
          <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalEarnedAmount)}
          </div>
        </div>
        <div className="p-2 bg-red-500/10 rounded">
          <div className="text-[10px] text-red-600 dark:text-red-400 mb-0.5">
            Unearned (At Risk)
          </div>
          <div className="font-mono font-bold text-sm text-red-600 dark:text-red-400">
            {formatCurrency(totalUnearned)}
          </div>
        </div>
      </div>

      {/* Top Agents with Pending */}
      {topAgentsPending.length > 0 && (
        <>
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            Agents with Pending Commissions
          </div>
          <Table className="text-[11px]">
            <TableHeader>
              <TableRow className="h-6 border-b border-zinc-200 dark:border-zinc-800">
                <TableHead className="p-1 text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                  Agent
                </TableHead>
                <TableHead className="p-1 text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                  Pending
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topAgentsPending.map((agent) => (
                <TableRow
                  key={agent.id}
                  className="border-b border-zinc-100 dark:border-zinc-800/50"
                >
                  <TableCell className="p-1 text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]">
                    {agent.name}
                  </TableCell>
                  <TableCell className="p-1 text-right font-mono font-semibold text-amber-600 dark:text-amber-400">
                    {formatCurrency(agent.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
