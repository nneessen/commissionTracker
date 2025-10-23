// src/features/dashboard/components/PerformanceOverviewCard.tsx

import React from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { PerformanceOverviewCardProps } from "../../../types/dashboard.types";
import { formatCurrency, formatPercent } from "../../../lib/format";
import {
  getPerformanceStatus,
  calculateTargetPercentage,
} from "../../../utils/dashboardCalculations";
import { getPeriodLabel } from "../../../utils/dateRange";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// TODO: why is this component not using the re-usable Table component? I already have a fucking Table component that can be used

export const PerformanceOverviewCard: React.FC<
  PerformanceOverviewCardProps
> = ({
  metrics,
  isBreakeven,
  timePeriod,
  surplusDeficit,
  breakevenDisplay,
  policiesNeeded,
  periodSuffix,
}) => {
  const periodLabel = getPeriodLabel(timePeriod);

  const getStatusColorClass = (status: string): string => {
    switch (status.toUpperCase()) {
      case "HIT":
        return "text-success";
      case "GOOD":
        return "text-info";
      case "FAIR":
        return "text-warning";
      case "POOR":
        return "text-error";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-sm uppercase tracking-wide">
          Performance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {/* Status Banner */}
        <div
          className={cn(
            "p-3 rounded-lg mb-4 flex items-center gap-3",
            isBreakeven
              ? "bg-gradient-to-br from-success/20 via-status-active/15 to-card"
              : "bg-gradient-to-br from-warning/20 via-status-pending/15 to-card",
          )}
        >
          {isBreakeven ? (
            <CheckCircle className="h-5 w-5 text-success" />
          ) : (
            <AlertCircle className="h-5 w-5 text-warning" />
          )}
          <div className="flex-1">
            <div
              className={cn(
                "text-sm font-semibold",
                isBreakeven ? "text-success" : "text-warning",
              )}
            >
              {isBreakeven
                ? `✓ Above Breakeven (${periodLabel})`
                : `⚠ Below Breakeven (${periodLabel})`}
            </div>
            <div
              className={cn(
                "text-xs",
                isBreakeven ? "text-success/80" : "text-warning/80",
              )}
            >
              {isBreakeven
                ? `${periodLabel} surplus of ${formatCurrency(Math.abs(surplusDeficit))}`
                : `Need ${formatCurrency(breakevenDisplay)}${periodSuffix.toLowerCase()} (${Math.ceil(policiesNeeded)} policies)`}
            </div>
          </div>
        </div>

        {/* Performance Table */}
        <div className="overflow-x-auto bg-gradient-to-br from-muted/10 to-card rounded-lg p-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="mb-2">
                <th className="text-left py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">
                  Metric
                </th>
                <th className="text-right py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">
                  Current
                </th>
                <th className="text-right py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">
                  Target
                </th>
                <th className="text-right py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">
                  %
                </th>
                <th className="text-center py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((row, index) => {
                const pct = calculateTargetPercentage(row.current, row.target);
                const status = getPerformanceStatus(
                  row.current,
                  row.target,
                  row.showTarget,
                );
                const statusColorClass = getStatusColorClass(status);

                return (
                  <tr
                    key={index}
                    className="hover:bg-muted/10 transition-colors"
                  >
                    <td className="py-2 px-1 text-foreground">{row.metric}</td>
                    <td className="py-2 px-1 text-right font-mono font-semibold text-foreground">
                      {row.unit === "$"
                        ? formatCurrency(row.current)
                        : row.unit === "%"
                          ? formatPercent(row.current)
                          : row.current.toFixed(1)}
                    </td>
                    <td className="py-2 px-1 text-right text-muted-foreground font-mono">
                      {row.showTarget && row.target
                        ? row.unit === "$"
                          ? formatCurrency(row.target)
                          : row.unit === "%"
                            ? formatPercent(row.target)
                            : row.target
                        : "—"}
                    </td>
                    <td
                      className={cn(
                        "py-2 px-1 text-right font-semibold",
                        statusColorClass,
                      )}
                    >
                      {row.showTarget ? `${pct.toFixed(0)}%` : "—"}
                    </td>
                    <td className="py-2 px-1 text-center">
                      {row.showTarget && (
                        <span
                          className={cn(
                            "inline-block w-2 h-2 rounded-full",
                            status.toUpperCase() === "HIT" && "bg-success",
                            status.toUpperCase() === "GOOD" && "bg-info",
                            status.toUpperCase() === "FAIR" && "bg-warning",
                            status.toUpperCase() === "POOR" && "bg-error",
                            status.toUpperCase() === "NEUTRAL" &&
                              "bg-muted-foreground",
                          )}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

