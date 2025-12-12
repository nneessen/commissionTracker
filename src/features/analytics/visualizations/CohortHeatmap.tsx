// src/features/analytics/visualizations/CohortHeatmap.tsx

import React from 'react';
import {CohortRetentionData} from '../../../services/analytics/cohortService';

interface CohortHeatmapProps {
  data: CohortRetentionData[];
  maxMonths?: number;
}

/**
 * CohortHeatmap - Retention heatmap by cohort month
 *
 * Displays a color-coded table showing retention percentages
 * for each cohort over time (0-24 months).
 */
export function CohortHeatmap({ data, maxMonths = 12 }: CohortHeatmapProps) {
  if (!data || data.length === 0) {
    return (
      <div className="p-10 text-center text-gray-400 text-xs">
        No cohort data available
      </div>
    );
  }

  // Get Tailwind classes based on retention percentage
  const getRetentionClasses = (retention: number) => {
    if (retention >= 90) return { bg: 'bg-green-100', text: 'text-green-900' };
    if (retention >= 80) return { bg: 'bg-blue-100', text: 'text-blue-900' };
    if (retention >= 70) return { bg: 'bg-amber-100', text: 'text-amber-900' };
    if (retention >= 60) return { bg: 'bg-orange-100', text: 'text-orange-900' };
    return { bg: 'bg-red-100', text: 'text-red-900' };
  };

  return (
    <div className="overflow-x-auto text-xs">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white z-[2] p-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-slate-300">
              Cohort
            </th>
            <th className="p-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-slate-300">
              Size
            </th>
            {Array.from({ length: maxMonths + 1 }, (_, i) => (
              <th key={i} className="p-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b-2 border-slate-300 min-w-[60px]">
                M{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((cohort, idx) => (
            <tr
              key={cohort.cohortMonth}
              className={idx < data.length - 1 ? 'border-b border-slate-100' : ''}
            >
              <td className="sticky left-0 bg-white z-[1] py-2.5 px-2 font-semibold text-xs text-foreground whitespace-nowrap">
                {cohort.cohortLabel}
              </td>
              <td className="py-2.5 px-2 text-center font-medium text-xs text-muted-foreground">
                {cohort.totalPolicies}
              </td>
              {Array.from({ length: maxMonths + 1 }, (_, monthsElapsed) => {
                const retention = cohort.retentionByMonth[monthsElapsed];
                const activeCount = cohort.activeCount[monthsElapsed];

                if (retention === undefined) {
                  return (
                    <td key={monthsElapsed} className="py-2.5 px-2 text-center bg-muted text-slate-400 text-xs">
                      -
                    </td>
                  );
                }

                const classes = getRetentionClasses(retention);

                return (
                  <td
                    key={monthsElapsed}
                    title={`${retention.toFixed(1)}% retention (${activeCount} active)`}
                    className={`py-2.5 px-2 text-center font-semibold text-xs cursor-pointer transition-all duration-200 font-mono hover:scale-105 hover:shadow-sm ${classes.bg} ${classes.text}`}
                  >
                    {retention.toFixed(0)}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-4 flex gap-3 items-center text-xs text-muted-foreground">
        <span className="font-semibold">Legend:</span>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 bg-success rounded-sm" />
          <span>≥90%</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 bg-info rounded-sm" />
          <span>80-89%</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 bg-warning rounded-sm" />
          <span>70-79%</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 bg-orange-400 rounded-sm" />
          <span>60-69%</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 bg-error rounded-sm" />
          <span>{'<'}60%</span>
        </div>
      </div>
    </div>
  );
}
