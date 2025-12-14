// src/features/dashboard/components/KPIGridHeatmap.tsx

import React from 'react';
import {DetailedKPIGridProps} from '../../../types/dashboard.types';
import {cn} from '@/lib/utils';
import {Card, CardContent} from '@/components/ui/card';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip';

/**
 * KPI Grid Component - Clean, professional layout matching Targets/Expenses pages
 *
 * Displays KPIs in organized sections with consistent styling
 */
export const KPIGridHeatmap: React.FC<DetailedKPIGridProps> = ({ sections }) => {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">Detailed KPI Breakdown</div>
        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-3 gap-4">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className={cn(sectionIndex > 0 && "border-l pl-4")}>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {section.category}
                </div>
                <div className="space-y-1">
                  {section.kpis.map((kpi, kpiIndex) => (
                    <Tooltip key={`${sectionIndex}-${kpiIndex}`}>
                      <TooltipTrigger asChild>
                        <div className="flex justify-between items-center text-[11px] cursor-help hover:bg-muted/30 rounded px-1 -mx-1 py-0.5">
                          <span className="text-muted-foreground">{kpi.label}</span>
                          <span className="font-mono font-semibold">{kpi.value}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold">{kpi.label}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Category: {section.category}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Value: <span className="font-mono">{kpi.value}</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
};
