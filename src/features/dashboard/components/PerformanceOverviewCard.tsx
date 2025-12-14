// src/features/dashboard/components/PerformanceOverviewCard.tsx

import React from "react";
import {CheckCircle, AlertCircle} from "lucide-react";
import {PerformanceOverviewCardProps} from "../../../types/dashboard.types";
import {formatCurrency, formatPercent} from "../../../lib/format";
import {getPerformanceStatus, calculateTargetPercentage} from "../../../utils/dashboardCalculations";
import {getPeriodLabel} from "../../../utils/dateRange";
import {cn} from "@/lib/utils";
import {Card, CardContent} from "@/components/ui/card";

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
      <CardContent className="p-3">
        <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">Performance Overview</div>

        {/* Status Banner - Clean design */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b">
          {isBreakeven ? (
            <CheckCircle className="h-3.5 w-3.5 text-success" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-warning" />
          )}
          <div className="flex-1">
            <div className={cn("text-[11px] font-semibold", isBreakeven ? "text-success" : "text-warning")}>
              {isBreakeven ? `Above Breakeven (${periodLabel})` : `Below Breakeven (${periodLabel})`}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {isBreakeven
                ? `Surplus: ${formatCurrency(Math.abs(surplusDeficit))}`
                : `Need ${formatCurrency(breakevenDisplay)}${periodSuffix.toLowerCase()} (${Math.ceil(policiesNeeded)} policies)`}
            </div>
          </div>
        </div>

        {/* Performance Table - Clean styling */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">Metric</th>
                <th className="text-right py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">Current</th>
                <th className="text-right py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">Target</th>
                <th className="text-right py-1.5 text-[10px] font-semibold text-muted-foreground uppercase">%</th>
                <th className="text-center py-1.5 text-[10px] font-semibold text-muted-foreground uppercase w-8">Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((row, index) => {
                const pct = calculateTargetPercentage(row.current, row.target);
                const status = getPerformanceStatus(row.current, row.target, row.showTarget);
                const statusColorClass = getStatusColorClass(status);

                return (
                  <tr key={index} className="hover:bg-muted/20">
                    <td className="py-1.5 text-[11px] text-foreground">{row.metric}</td>
                    <td className="py-1.5 text-right text-[11px] font-mono font-semibold">
                      {row.unit === "$"
                        ? formatCurrency(row.current)
                        : row.unit === "%"
                          ? formatPercent(row.current)
                          : row.current.toFixed(1)}
                    </td>
                    <td className="py-1.5 text-right text-[11px] text-muted-foreground font-mono">
                      {row.showTarget && row.target
                        ? row.unit === "$"
                          ? formatCurrency(row.target)
                          : row.unit === "%"
                            ? formatPercent(row.target)
                            : row.target
                        : "—"}
                    </td>
                    <td className={cn("py-1.5 text-right text-[11px] font-semibold", statusColorClass)}>
                      {row.showTarget ? `${pct.toFixed(0)}%` : "—"}
                    </td>
                    <td className="py-1.5 text-center">
                      {row.showTarget && (
                        <span
                          className={cn(
                            "inline-block w-1.5 h-1.5 rounded-full",
                            status.toUpperCase() === "HIT" && "bg-success",
                            status.toUpperCase() === "GOOD" && "bg-info",
                            status.toUpperCase() === "FAIR" && "bg-warning",
                            status.toUpperCase() === "POOR" && "bg-error",
                            status.toUpperCase() === "NEUTRAL" && "bg-muted-foreground",
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
