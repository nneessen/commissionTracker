// src/features/dashboard/components/KPIGridHeatmap.tsx

import React from 'react';
import { DetailedKPIGridProps } from '../../../types/dashboard.types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MiniSparkline } from './kpi-layouts/MiniSparkline';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Get performance color based on value
 * Uses HSL color space for smooth gradients
 */
function getPerformanceColor(value: string | number): string {
  // Try to extract percentage or numeric value
  const strValue = String(value);
  const percentMatch = strValue.match(/(\d+\.?\d*)%/);
  const numMatch = strValue.match(/^[\d,]+\.?\d*$/);

  if (!percentMatch && !numMatch) {
    return 'bg-muted/10'; // Neutral for non-numeric values
  }

  const numValue = percentMatch
    ? parseFloat(percentMatch[1])
    : parseFloat(strValue.replace(/,/g, ''));

  // Performance thresholds for percentages
  if (percentMatch) {
    if (numValue < 70) {
      // Red spectrum (poor)
      return 'bg-red-100/80 dark:bg-red-950/30 text-red-900 dark:text-red-100';
    } else if (numValue < 90) {
      // Amber spectrum (fair)
      return 'bg-amber-100/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-100';
    } else {
      // Green spectrum (good)
      return 'bg-emerald-100/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100';
    }
  }

  // For absolute numbers, use neutral with subtle color
  return 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100';
}

/**
 * Get cell size class based on metric importance
 */
function getCellSizeClass(label: string): string {
  const primaryMetrics = ['Profit Margin', 'Net Income', 'Policies Sold', 'Policies Needed'];
  const isPrimary = primaryMetrics.some((metric) =>
    label.toLowerCase().includes(metric.toLowerCase())
  );

  return isPrimary ? 'col-span-2 row-span-2' : '';
}

/**
 * Generate mock sparkline data (in production, this would come from real historical data)
 */
function generateSparklineData(): number[] {
  // TODO: Replace with real historical trend data
  return Array.from({ length: 7 }, () => Math.random() * 100 + 50);
}

/**
 * KPI Grid Heatmap Layout Component
 *
 * Visual heatmap dashboard with color-coded performance cells,
 * mini sparklines, and interactive tooltips.
 *
 * Design Philosophy: Bloomberg Terminal meets modern data visualization
 */
export const KPIGridHeatmap: React.FC<DetailedKPIGridProps> = ({ sections }) => {
  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-sm uppercase tracking-wide">
          KPI Heatmap Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 auto-rows-fr">
            {sections.map((section, sectionIndex) =>
              section.kpis.map((kpi, kpiIndex) => {
                const colorClass = getPerformanceColor(kpi.value);
                const sizeClass = getCellSizeClass(kpi.label);
                const sparklineData = generateSparklineData();

                return (
                  <Tooltip key={`${sectionIndex}-${kpiIndex}`}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'rounded-lg p-3 transition-all duration-200 cursor-pointer',
                          'hover:scale-105 hover:shadow-lg hover:z-10',
                          colorClass,
                          sizeClass
                        )}
                      >
                        {/* Category tag (small) */}
                        <div className="text-[9px] uppercase tracking-wider font-bold opacity-60 mb-1">
                          {section.category}
                        </div>

                        {/* Label */}
                        <div className="text-xs font-medium mb-2 leading-tight">{kpi.label}</div>

                        {/* Value (prominent) */}
                        <div className="text-2xl font-bold font-mono mb-2">{kpi.value}</div>

                        {/* Sparkline */}
                        <div className="flex justify-end opacity-50">
                          <MiniSparkline
                            data={sparklineData}
                            width={50}
                            height={16}
                            strokeWidth={1.5}
                            className="opacity-70"
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <div className="font-semibold">{kpi.label}</div>
                        <div className="text-sm text-muted-foreground">
                          Category: {section.category}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Current Value: <span className="font-mono">{kpi.value}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Trend: 7-day historical performance
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            )}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};
