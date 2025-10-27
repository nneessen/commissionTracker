// OPTION 2: Tabbed Interface
// Visual: Tabs to switch between categories, shows one category at a time in larger format

import React, { useState } from "react";
import { DetailedKPIGridProps } from "../../../types/dashboard.types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const KPIGrid_Option2: React.FC<DetailedKPIGridProps> = ({ sections }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Card>
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-sm uppercase tracking-wide mb-3">
          Detailed KPI Breakdown
        </CardTitle>

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-3 -mb-3">
          {sections.map((section, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={cn(
                "px-3 py-2 rounded-t-lg text-xs font-medium whitespace-nowrap transition-all",
                activeTab === index
                  ? "bg-card shadow-sm text-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              )}
            >
              {section.category}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Active Tab Content */}
        <div className="bg-gradient-to-br from-slate-50/30 to-zinc-50/20 dark:from-slate-950/10 dark:to-zinc-950/5 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {sections[activeTab].kpis.map((kpi, kpiIndex) => (
              <div key={kpiIndex} className="flex justify-between items-baseline py-1.5">
                <span className="text-sm text-muted-foreground">
                  {kpi.label}
                </span>
                <span className="text-sm font-bold font-mono text-foreground ml-4">
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
