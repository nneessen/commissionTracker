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
  // Color mapping for different categories
  const getCategoryColors = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes("commission")) {
      return "from-success/15 via-status-active/10 to-card";
    } else if (
      lowerCategory.includes("policy") ||
      lowerCategory.includes("policies")
    ) {
      return "from-info/15 via-status-earned/10 to-card";
    } else if (lowerCategory.includes("performance")) {
      return "from-warning/15 via-status-pending/10 to-card";
    } else if (lowerCategory.includes("financial")) {
      return "from-primary/15 via-accent/10 to-card";
    } else {
      return "from-accent/10 to-card";
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
        <div className="grid grid-cols-2 gap-3">
          {sections.map((section, sectionIndex) => (
            <div
              key={sectionIndex}
              className={cn(
                "rounded-lg p-3 bg-gradient-to-br",
                getCategoryColors(section.category),
              )}
            >
              <div className="text-xs uppercase tracking-wide font-semibold mb-2">
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
