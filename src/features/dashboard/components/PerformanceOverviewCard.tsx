// src/features/dashboard/components/PerformanceOverviewCard.tsx

import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { PerformanceOverviewCardProps } from '../../../types/dashboard.types';
import { formatCurrency, formatPercent } from '../../../lib/format';
import { getPerformanceStatus, calculateTargetPercentage } from '../../../utils/dashboardCalculations';
import { getPeriodLabel } from '../../../utils/dateRange';
import { cn } from '@/lib/utils';

/**
 * Performance Overview Card Component
 *
 * Center card displaying performance metrics table and breakeven status.
 * Refactored to use Tailwind CSS classes instead of inline styles.
 */
export const PerformanceOverviewCard: React.FC<PerformanceOverviewCardProps> = ({
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
      case 'HIT':
        return 'text-success';
      case 'GOOD':
        return 'text-info';
      case 'FAIR':
        return 'text-warning';
      case 'POOR':
        return 'text-error';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="bg-card rounded-lg p-4 shadow-md">
      <h3 className="text-sm font-semibold mb-3 text-foreground uppercase tracking-wide">
        Performance Overview
      </h3>

      {/* Status Banner */}
      <div
        className={cn(
          "p-3 rounded-md mb-4 flex items-center gap-3",
          isBreakeven
            ? "bg-success/10 border border-success/20"
            : "bg-warning/10 border border-warning/20"
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
              isBreakeven ? "text-success" : "text-warning"
            )}
          >
            {isBreakeven
              ? `✓ Above Breakeven (${periodLabel})`
              : `⚠ Below Breakeven (${periodLabel})`}
          </div>
          <div
            className={cn(
              "text-xs",
              isBreakeven ? "text-success/80" : "text-warning/80"
            )}
          >
            {isBreakeven
              ? `${periodLabel} surplus of ${formatCurrency(Math.abs(surplusDeficit))}`
              : `Need ${formatCurrency(breakevenDisplay)}${periodSuffix.toLowerCase()} (${Math.ceil(policiesNeeded)} policies)`}
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-border">
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
              const status = getPerformanceStatus(row.current, row.target, row.showTarget);
              const statusColorClass = getStatusColorClass(status);

              return (
                <tr key={index} className="border-b border-border/50">
                  <td className="py-2 px-1 text-foreground">
                    {row.metric}
                  </td>
                  <td className="py-2 px-1 text-right font-mono font-semibold text-foreground">
                    {row.unit === '$'
                      ? formatCurrency(row.current)
                      : row.unit === '%'
                        ? formatPercent(row.current)
                        : row.current.toFixed(1)}
                  </td>
                  <td className="py-2 px-1 text-right text-muted-foreground font-mono">
                    {row.showTarget && row.target
                      ? row.unit === '$'
                        ? formatCurrency(row.target)
                        : row.unit === '%'
                          ? formatPercent(row.target)
                          : row.target
                      : '—'}
                  </td>
                  <td className={cn("py-2 px-1 text-right font-semibold", statusColorClass)}>
                    {row.showTarget ? `${pct.toFixed(0)}%` : '—'}
                  </td>
                  <td className="py-2 px-1 text-center">
                    {row.showTarget && (
                      <span
                        className={cn(
                          "inline-block w-2 h-2 rounded-full",
                          status.toUpperCase() === 'HIT' && "bg-success",
                          status.toUpperCase() === 'GOOD' && "bg-info",
                          status.toUpperCase() === 'FAIR' && "bg-warning",
                          status.toUpperCase() === 'POOR' && "bg-error",
                          status.toUpperCase() === 'NEUTRAL' && "bg-muted-foreground"
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
    </div>
  );
};