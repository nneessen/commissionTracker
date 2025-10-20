// src/features/dashboard/components/KPIGrid.tsx

import React from 'react';
import { DetailedKPIGridProps } from '../../../types/dashboard.types';
import { cn } from '@/lib/utils';

/**
 * KPI Grid Layout
 *
 * 2-column responsive grid for detailed KPI breakdown.
 */
export const KPIGrid: React.FC<DetailedKPIGridProps> = ({ sections }) => {
  return (
    <div className="bg-card rounded-lg p-4 shadow-sm">
      <div className="text-sm font-semibold mb-3 text-foreground uppercase tracking-wide">
        Detailed KPI Breakdown
      </div>

      <div className="grid grid-cols-2 gap-3">
        {sections.map((section, sectionIndex) => (
          <div
            key={sectionIndex}
            className="p-3 rounded-md bg-gradient-to-br from-muted/20 to-muted/50 border border-border"
          >
            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              {section.category}
            </div>
            {section.kpis.map((kpi, kpiIndex) => (
              <div
                key={kpiIndex}
                className={cn(
                  "flex justify-between py-1",
                  kpiIndex < section.kpis.length - 1 && "border-b border-border/50"
                )}
              >
                <span className="text-xs text-muted-foreground/80">
                  {kpi.label}
                </span>
                <span className="text-xs font-bold font-mono text-foreground">
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
