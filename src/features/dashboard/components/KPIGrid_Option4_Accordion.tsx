// OPTION 4: Accordion / Collapsible Sections
// Visual: Expandable sections, saves vertical space, shows summary counts

import React, { useState } from "react";
import { DetailedKPIGridProps } from "../../../types/dashboard.types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";

export const KPIGrid_Option4: React.FC<DetailedKPIGridProps> = ({ sections }) => {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set([0]) // First section expanded by default
  );

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const getCategoryColor = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes("financial")) return "from-violet-50/40 to-purple-50/30 dark:from-violet-950/10 dark:to-purple-950/8";
    if (lowerCategory.includes("production")) return "from-blue-50/40 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/8";
    if (lowerCategory.includes("commission") || lowerCategory.includes("metric")) return "from-emerald-50/40 to-green-50/30 dark:from-emerald-950/10 dark:to-green-950/8";
    if (lowerCategory.includes("client")) return "from-cyan-50/40 to-sky-50/30 dark:from-cyan-950/10 dark:to-sky-950/8";
    if (lowerCategory.includes("performance")) return "from-amber-50/40 to-orange-50/30 dark:from-amber-950/10 dark:to-orange-950/8";
    return "from-slate-50/40 to-zinc-50/30 dark:from-slate-950/10 dark:to-zinc-950/8";
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-sm uppercase tracking-wide">
          Detailed KPI Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-2">
          {sections.map((section, sectionIndex) => {
            const isExpanded = expandedSections.has(sectionIndex);

            return (
              <div
                key={sectionIndex}
                className={cn(
                  "rounded-lg shadow-sm overflow-hidden bg-gradient-to-br",
                  getCategoryColor(section.category)
                )}
              >
                {/* Section Header - Clickable */}
                <button
                  onClick={() => toggleSection(sectionIndex)}
                  className="w-full flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown size={14} className="text-muted-foreground" />
                    ) : (
                      <ChevronRight size={14} className="text-muted-foreground" />
                    )}
                    <span className="text-xs uppercase tracking-wide font-semibold text-foreground/90">
                      {section.category}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {section.kpis.length} metrics
                  </span>
                </button>

                {/* Section Content - Collapsible */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {section.kpis.map((kpi, kpiIndex) => (
                      <div
                        key={kpiIndex}
                        className="flex justify-between items-baseline py-1 px-2 rounded bg-card/40"
                      >
                        <span className="text-xs text-muted-foreground/80">
                          {kpi.label}
                        </span>
                        <span className="text-xs font-bold font-mono text-foreground ml-2">
                          {kpi.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
