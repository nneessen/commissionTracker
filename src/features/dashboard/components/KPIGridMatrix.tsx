// src/features/dashboard/components/KPIGridMatrix.tsx

import React from 'react';
import { DetailedKPIGridProps } from '../../../types/dashboard.types';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CircularGauge } from './kpi-layouts/CircularGauge';

/**
 * Assign quadrant based on category
 */
function getQuadrant(category: string): number {
  const lowerCategory = category.toLowerCase();
  if (lowerCategory.includes('financial')) return 1; // Top-left
  if (lowerCategory.includes('production')) return 2; // Top-right
  if (lowerCategory.includes('commission') || lowerCategory.includes('metric')) return 3; // Bottom-left
  if (lowerCategory.includes('client')) return 3; // Bottom-left (share with metrics)
  if (lowerCategory.includes('target') || lowerCategory.includes('performance')) return 4; // Bottom-right
  return 4; // Default to bottom-right
}

/**
 * Get status indicator based on metric
 */
function getStatus(label: string, value: string | number): 'good' | 'warning' | 'critical' {
  const strValue = String(value);
  const percentMatch = strValue.match(/(\d+\.?\d*)%/);

  if (percentMatch) {
    const numValue = parseFloat(percentMatch[1]);
    if (numValue >= 90) return 'good';
    if (numValue >= 70) return 'warning';
    return 'critical';
  }

  // For cancel/lapsed metrics, inverse logic
  if (label.includes('Cancel') || label.includes('Lapsed')) {
    return 'warning'; // Always show as warning to draw attention
  }

  return 'good'; // Default
}

/**
 * Extract percentage value for gauge
 */
function getGaugeValue(label: string, value: string | number): number | null {
  const strValue = String(value);
  const percentMatch = strValue.match(/(\d+\.?\d*)%/);

  if (percentMatch) {
    return parseFloat(percentMatch[1]);
  }

  // For target/pace metrics, generate mock progress
  // TODO: Replace with real target comparison
  if (label.includes('Target') || label.includes('Pace') || label.includes('Margin')) {
    return Math.random() * 100;
  }

  return null;
}

/**
 * KPI Grid Matrix Layout Component
 *
 * Military/aerospace-inspired command center dashboard with quadrant layout,
 * circular gauges, status indicators, and technical typography.
 *
 * Design Philosophy: Mission control HUD with professional precision
 */
export const KPIGridMatrix: React.FC<DetailedKPIGridProps> = ({ sections }) => {
  // Organize KPIs by quadrant
  const quadrants = [
    { id: 1, title: 'FINANCIAL', kpis: [] as Array<{ label: string; value: string | number; category: string }> },
    { id: 2, title: 'PRODUCTION', kpis: [] as Array<{ label: string; value: string | number; category: string }> },
    { id: 3, title: 'PERFORMANCE', kpis: [] as Array<{ label: string; value: string | number; category: string }> },
    { id: 4, title: 'TARGETS', kpis: [] as Array<{ label: string; value: string | number; category: string }> },
  ];

  sections.forEach((section) => {
    const quadrantId = getQuadrant(section.category);
    const quadrant = quadrants.find((q) => q.id === quadrantId);
    if (quadrant) {
      section.kpis.forEach((kpi) => {
        quadrant.kpis.push({ ...kpi, category: section.category });
      });
    }
  });

  return (
    <Card>
      <CardHeader className="p-4 pb-3 border-b border-border/20">
        <CardTitle className="text-sm uppercase tracking-wide font-mono">
          Command Center Matrix
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {/* Quadrant Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          {/* Subtle scanline effect overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-5">
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)',
              }}
            />
          </div>

          {quadrants.map((quadrant) => (
            <div
              key={quadrant.id}
              className="relative rounded-lg border border-border/20 bg-card/50 p-4 space-y-3"
            >
              {/* Quadrant Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/10">
                <h3 className="text-[10px] uppercase tracking-widest font-bold font-mono text-muted-foreground">
                  {quadrant.title}
                </h3>
                <div className="flex gap-1">
                  {/* Status indicators */}
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                </div>
              </div>

              {/* Quadrant Metrics */}
              <div className="space-y-2">
                {quadrant.kpis.length > 0 ? (
                  quadrant.kpis.map((kpi, index) => {
                    const status = getStatus(kpi.label, kpi.value);
                    const gaugeValue = getGaugeValue(kpi.label, kpi.value);
                    const statusColor =
                      status === 'good'
                        ? 'bg-emerald-500'
                        : status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-red-500';

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 p-2 rounded bg-background/50 border border-border/10 hover:border-border/30 transition-colors"
                      >
                        {/* Status dot */}
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full flex-shrink-0',
                            statusColor,
                            status === 'critical' && 'animate-pulse'
                          )}
                        />

                        {/* Label and Value */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-muted-foreground truncate">
                            {kpi.label}
                          </div>
                          <div className="text-sm font-bold font-mono text-foreground">
                            {kpi.value}
                          </div>
                        </div>

                        {/* Circular Gauge (if applicable) */}
                        {gaugeValue !== null && (
                          <CircularGauge
                            value={gaugeValue}
                            size={36}
                            strokeWidth={3}
                            showValue={false}
                            color={
                              gaugeValue >= 90
                                ? 'hsl(142, 76%, 45%)'
                                : gaugeValue >= 70
                                  ? 'hsl(38, 92%, 50%)'
                                  : 'hsl(0, 84%, 60%)'
                            }
                          />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No metrics in this quadrant
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* System Status Footer */}
        <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <div>SYSTEM: ACTIVE</div>
          <div className="flex items-center gap-2">
            <span>REFRESH: LIVE</span>
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
