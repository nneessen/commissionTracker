// src/features/admin/components/lead-vendors/HeatDistribution.tsx

import { ResponsivePie } from "@nivo/pie";
import type { HeatLevel } from "@/types/lead-purchase.types";

const HEAT_CONFIG: Record<HeatLevel, { label: string; color: string }> = {
  hot: { label: "Hot", color: "#ef4444" },
  warming: { label: "Warm", color: "#f97316" },
  neutral: { label: "Neutral", color: "#a1a1aa" },
  cooling: { label: "Cool", color: "#60a5fa" },
  cold: { label: "Cold", color: "#2563eb" },
};

interface HeatDistributionProps {
  counts: Record<HeatLevel, number>;
  total: number;
}

export function HeatDistribution({ counts, total }: HeatDistributionProps) {
  const data = (Object.keys(HEAT_CONFIG) as HeatLevel[])
    .filter((level) => counts[level] > 0)
    .map((level) => ({
      id: level,
      label: HEAT_CONFIG[level].label,
      value: counts[level],
      color: HEAT_CONFIG[level].color,
    }));

  // If no data, show placeholder
  if (data.length === 0 || total === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-2">
          Heat Distribution
        </div>
        <div className="flex items-center justify-center h-[100px] text-[11px] text-zinc-400">
          No pack data
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide mb-1">
        Heat Distribution
      </div>
      <div className="flex items-center gap-3">
        {/* Donut chart */}
        <div className="h-[90px] w-[90px] flex-shrink-0">
          <ResponsivePie
            data={data}
            colors={{ datum: "data.color" }}
            innerRadius={0.6}
            padAngle={2}
            cornerRadius={2}
            enableArcLabels={false}
            enableArcLinkLabels={false}
            isInteractive={false}
            margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {(Object.keys(HEAT_CONFIG) as HeatLevel[]).map((level) => (
            <div key={level} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: HEAT_CONFIG[level].color }}
              />
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {HEAT_CONFIG[level].label}
              </span>
              <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                {counts[level]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
