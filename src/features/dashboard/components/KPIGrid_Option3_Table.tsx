// OPTION 3: Unified Table View
// Visual: Single clean table with category groupings, stripe/hover effects

import React from "react";
import { DetailedKPIGridProps } from "../../../types/dashboard.types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const KPIGrid_Option3: React.FC<DetailedKPIGridProps> = ({ sections }) => {
  const getCategoryColor = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes("financial")) return "bg-violet-50/40 dark:bg-violet-950/10";
    if (lowerCategory.includes("production")) return "bg-blue-50/40 dark:bg-blue-950/10";
    if (lowerCategory.includes("commission") || lowerCategory.includes("metric")) return "bg-emerald-50/40 dark:bg-emerald-950/10";
    if (lowerCategory.includes("client")) return "bg-cyan-50/40 dark:bg-cyan-950/10";
    if (lowerCategory.includes("performance")) return "bg-amber-50/40 dark:bg-amber-950/10";
    return "bg-slate-50/40 dark:bg-slate-950/10";
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-sm uppercase tracking-wide">
          Detailed KPI Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="bg-gradient-to-br from-slate-50/30 to-zinc-50/20 dark:from-slate-950/10 dark:to-zinc-950/5 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Category
                </th>
                <th className="text-left py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Metric
                </th>
                <th className="text-right py-2.5 px-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section, sectionIndex) => (
                <React.Fragment key={sectionIndex}>
                  {section.kpis.map((kpi, kpiIndex) => (
                    <tr
                      key={`${sectionIndex}-${kpiIndex}`}
                      className={cn(
                        "transition-colors hover:bg-muted/20",
                        kpiIndex === 0 && getCategoryColor(section.category)
                      )}
                    >
                      {/* Category column - only show on first row of each section */}
                      <td className="py-2 px-3 align-top">
                        {kpiIndex === 0 && (
                          <span className="text-[10px] uppercase tracking-wide font-bold text-foreground/90">
                            {section.category}
                          </span>
                        )}
                      </td>

                      {/* Metric label */}
                      <td className="py-2 px-3 text-muted-foreground">
                        {kpi.label}
                      </td>

                      {/* Value */}
                      <td className="py-2 px-3 text-right font-bold font-mono text-foreground">
                        {kpi.value}
                      </td>
                    </tr>
                  ))}

                  {/* Spacer row between sections */}
                  {sectionIndex < sections.length - 1 && (
                    <tr>
                      <td colSpan={3} className="py-1"></td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
