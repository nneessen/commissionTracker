// src/features/dashboard/components/KPIGrid.tsx

import React from "react";
import { DetailedKPIGridProps } from "../../../types/dashboard.types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * KPI Grid Layout
 *
 * 2-column responsive grid for detailed KPI breakdown.
 */
export const KPIGrid: React.FC<DetailedKPIGridProps> = ({ sections }) => {
  // Color mapping for different categories - VERY subtle tints for visual separation
  const getCategoryColors = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes("commission")) {
      return "from-emerald-50/50 to-green-50/40 dark:from-emerald-950/10 dark:to-green-950/8 shadow-sm";
    } else if (
      lowerCategory.includes("policy") ||
      lowerCategory.includes("policies")
    ) {
      return "from-blue-50/50 to-indigo-50/40 dark:from-blue-950/10 dark:to-indigo-950/8 shadow-sm";
    } else if (lowerCategory.includes("performance")) {
      return "from-amber-50/50 to-orange-50/40 dark:from-amber-950/10 dark:to-orange-950/8 shadow-sm";
    } else if (lowerCategory.includes("financial")) {
      return "from-violet-50/50 to-purple-50/40 dark:from-violet-950/10 dark:to-purple-950/8 shadow-sm";
    } else if (lowerCategory.includes("client")) {
      return "from-cyan-50/50 to-sky-50/40 dark:from-cyan-950/10 dark:to-sky-950/8 shadow-sm";
    } else {
      return "from-slate-50/50 to-zinc-50/40 dark:from-slate-950/10 dark:to-zinc-950/8 shadow-sm";
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-sm uppercase tracking-wide">
          Detailed KPI Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-4">
          {sections.map((section, sectionIndex) => (
            <div
              key={sectionIndex}
              className={cn(
                "rounded-lg p-4 bg-gradient-to-br",
                getCategoryColors(section.category),
              )}
            >
              <div className="text-xs uppercase tracking-wide font-semibold mb-3 text-foreground/90">
                {section.category}
              </div>
              {section.kpis.map((kpi, kpiIndex) => (
                <div key={kpiIndex} className="flex justify-between py-1">
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
      </CardContent>
    </Card>
  );
};
