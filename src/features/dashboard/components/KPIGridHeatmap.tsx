// src/features/dashboard/components/KPIGridHeatmap.tsx

import React from "react";
import {
  DetailedKPIGridProps,
  KPISection,
} from "../../../types/dashboard.types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GatedKPISection } from "./GatedKPISection";

/**
 * Renders the content of a single KPI section
 */
const SectionContent: React.FC<{
  section: KPISection;
  sectionIndex: number;
}> = ({ section, sectionIndex }) => (
  <>
    <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
      {section.category}
    </div>
    <div className="space-y-1">
      {section.kpis.map((kpi, kpiIndex) => (
        <Tooltip key={`${sectionIndex}-${kpiIndex}`}>
          <TooltipTrigger asChild>
            <div className="flex justify-between items-center text-[11px] cursor-help hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded px-1 -mx-1 py-0.5">
              <span className="text-zinc-500 dark:text-zinc-400">
                {kpi.label}
              </span>
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                {kpi.value}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-xs bg-zinc-900 dark:bg-zinc-800 border-zinc-700"
          >
            <div className="space-y-1">
              <div className="text-xs font-semibold text-zinc-100">
                {kpi.label}
              </div>
              <div className="text-[10px] text-zinc-400">
                Category: {section.category}
              </div>
              <div className="text-[10px] text-zinc-400">
                Value:{" "}
                <span className="font-mono text-zinc-200">{kpi.value}</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  </>
);

interface KPIGridHeatmapProps extends DetailedKPIGridProps {
  title?: string;
}

/**
 * KPI Grid Component - Compact zinc-styled layout
 */
export const KPIGridHeatmap: React.FC<KPIGridHeatmapProps> = ({
  sections,
  title = "Detailed KPI Breakdown",
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
        {title}
      </div>
      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-3 gap-4">
          {sections.map((section, sectionIndex) => (
            <div
              key={sectionIndex}
              className={cn(
                sectionIndex > 0 &&
                  "border-l border-zinc-200 dark:border-zinc-700 pl-4",
              )}
            >
              {section.gated ? (
                <GatedKPISection
                  hasAccess={false}
                  title={section.category}
                  requiredTier={section.requiredTier || "Starter"}
                >
                  <SectionContent
                    section={section}
                    sectionIndex={sectionIndex}
                  />
                </GatedKPISection>
              ) : (
                <SectionContent section={section} sectionIndex={sectionIndex} />
              )}
            </div>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
};
