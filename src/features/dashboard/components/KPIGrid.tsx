import React from "react";
import {DetailedKPIGridProps} from "../../../types/dashboard.types";
import {cn} from "@/lib/utils";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {DollarSign, FileText, TrendingUp, Users, Target, Activity} from "lucide-react";

export const KPIGrid: React.FC<DetailedKPIGridProps> = ({ sections }) => {
  const getCategoryIcon = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes("financial")) return DollarSign;
    if (lowerCategory.includes("production")) return FileText;
    if (
      lowerCategory.includes("commission") ||
      lowerCategory.includes("metric")
    )
      return TrendingUp;
    if (lowerCategory.includes("client")) return Users;
    if (lowerCategory.includes("performance")) return Target;
    return Activity;
  };

  const getCategoryColor = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes("financial"))
      return "text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-950/20";
    if (lowerCategory.includes("production"))
      return "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20";
    if (
      lowerCategory.includes("commission") ||
      lowerCategory.includes("metric")
    )
      return "text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20";
    if (lowerCategory.includes("client"))
      return "text-cyan-600 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/20";
    if (lowerCategory.includes("performance"))
      return "text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20";
    return "text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20";
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-sm uppercase tracking-wide">
          Detailed KPI Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-3 gap-3">
          {sections.map((section, sectionIndex) => {
            const Icon = getCategoryIcon(section.category);
            const colorClass = getCategoryColor(section.category);

            return (
              <div
                key={sectionIndex}
                className="rounded-lg p-3 bg-card shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Icon Header */}
                <div className="flex items-center gap-2 mb-3 pb-2">
                  <div className={cn("p-1.5 rounded-md", colorClass)}>
                    <Icon size={14} />
                  </div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-foreground/90">
                    {section.category}
                  </div>
                </div>

                {/* KPI List */}
                <div className="space-y-1.5">
                  {section.kpis.map((kpi, kpiIndex) => (
                    <div
                      key={kpiIndex}
                      className="flex justify-between items-baseline"
                    >
                      <span className="text-[10px] text-muted-foreground/80 leading-tight">
                        {kpi.label}
                      </span>
                      <span className="text-[11px] font-bold font-mono text-foreground ml-2">
                        {kpi.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
