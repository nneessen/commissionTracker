// src/features/hierarchy/components/analytics/TeamGeographicAnalysis.tsx

import React from "react";
import { cn } from "@/lib/utils";
import type { TeamGeographicBreakdown } from "@/types/team-analytics.types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TeamGeographicAnalysisProps {
  data: TeamGeographicBreakdown[];
  isLoading?: boolean;
}

/**
 * TeamGeographicAnalysis - Team premium distribution by state
 */
export function TeamGeographicAnalysis({
  data,
  isLoading,
}: TeamGeographicAnalysisProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Team Premium by State
        </div>
        <div className="p-3 text-center text-[10px] text-zinc-500 dark:text-zinc-400">
          Loading...
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

  // Calculate totals
  const totalPolicies = data.reduce((sum, d) => sum + d.policyCount, 0);
  const totalPremium = data.reduce((sum, d) => sum + d.totalPremium, 0);

  // Take top 10 states
  const topStates = data.slice(0, 10);

  // Calculate average premium per state for comparison (prefixed as unused)
  const _avgPremiumPerState = data.length > 0 ? totalPremium / data.length : 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Team Premium by State
        </div>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {data.length} states • Top 10
        </span>
      </div>

      {topStates.length > 0 ? (
        <Table className="text-[11px]">
          <TableHeader>
            <TableRow className="h-7 border-b border-zinc-200 dark:border-zinc-800">
              <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                State
              </TableHead>
              <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                Policies
              </TableHead>
              <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                Total
              </TableHead>
              <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                Avg
              </TableHead>
              <TableHead className="p-1.5 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                % Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topStates.map((row, idx) => {
              const avgPerPolicy =
                row.policyCount > 0 ? row.totalPremium / row.policyCount : 0;
              return (
                <TableRow
                  key={idx}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <TableCell className="p-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                    {row.state}
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-mono text-zinc-500 dark:text-zinc-400">
                    {row.policyCount}
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(row.totalPremium)}
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-mono text-zinc-500 dark:text-zinc-400">
                    {formatCurrency(avgPerPolicy)}
                  </TableCell>
                  <TableCell className="p-1.5 text-right">
                    <span
                      className={cn(
                        "font-mono",
                        row.percentage >= 20
                          ? "text-emerald-600 dark:text-emerald-400 font-bold"
                          : row.percentage >= 10
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-zinc-500 dark:text-zinc-400"
                      )}
                    >
                      {row.percentage.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="p-3 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
          No geographic data available
        </div>
      )}

      {/* Summary footer */}
      {topStates.length > 0 && (
        <div className="mt-2 p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded flex items-center justify-between text-[10px]">
          <span className="text-zinc-500 dark:text-zinc-400">
            {totalPolicies} policies across {data.length} states
          </span>
          <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(totalPremium)}
          </span>
        </div>
      )}
    </div>
  );
}
