// src/features/analytics/components/CohortAnalysis.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CohortHeatmap } from '../visualizations';
import { useAnalyticsData } from '../../../hooks';

/**
 * CohortAnalysis - Retention and cohort performance tracking
 *
 * Analyzes policy performance by cohorts (groups that started in the same month)
 * Tracks retention, chargebacks, and earning progress over time
 */
export function CohortAnalysis() {
  const { cohort, isLoading } = useAnalyticsData();
  const [showInfo, setShowInfo] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
          Cohort Analysis
        </div>
        <div className="p-10 text-center text-gray-400 text-xs">
          Loading cohort data...
        </div>
      </div>
    );
  }

  const { retention, summary } = cohort;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <div>
            <div className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Cohort Analysis
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Track retention by policy start month
            </div>
          </div>
          {/* Info Icon Button */}
          <Button
            onClick={() => setShowInfo(!showInfo)}
            size="icon"
            variant="ghost"
            className="h-6 w-6 bg-blue-50 border border-blue-100 hover:bg-blue-200 hover:scale-110 transition-transform"
            title="Click for detailed explanation"
          >
            i
          </Button>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="bg-blue-50 border border-blue-200">
          <div className="flex justify-between items-start mb-3">
            <h3 className="m-0 text-sm font-bold text-blue-800">
              Understanding Cohort Analysis
            </h3>
            <Button
              onClick={() => setShowInfo(false)}
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 text-lg text-slate-600 hover:text-slate-900"
            >
              ×
            </Button>
          </div>

          <div className="mb-4">
            <strong>What is this?</strong> Cohort Analysis groups your policies by the month they started and tracks how well they stick around over time.
            Think of it like tracking different "graduating classes" of policies to see which months produced the most lasting relationships.
          </div>

          <div className="mb-4">
            <strong>Key Metrics Explained:</strong>
          </div>

          <div className="mb-3 pl-4">
            <div className="mb-2">
              <strong className="text-gray-900">Total Cohorts:</strong>
              <div className="mt-1 text-gray-600">
                How many different "start months" you have policies from
              </div>
            </div>

            <div className="mb-2">
              <strong className="text-green-500">Avg 9-Mo Retention:</strong>
              <div className="mt-1 text-gray-600">
                What percentage of policies are still active after 9 months (industry benchmark)
                <div className="text-xs mt-0.5">
                  Example: 85% means 85 out of 100 policies are still active at month 9
                </div>
              </div>
            </div>

            <div className="mb-2">
              <strong className="text-blue-500">Best Cohort:</strong>
              <div className="mt-1 text-gray-600">
                Which start month has the best retention (your strongest group)
              </div>
            </div>

            <div className="mb-2">
              <strong className="text-red-500">Worst Cohort:</strong>
              <div className="mt-1 text-gray-600">
                Which start month has the lowest retention (needs attention)
              </div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-white rounded-md">
            <strong>How to Read the Heatmap:</strong>
            <div className="text-xs mt-2 text-gray-600">
              • <strong>Rows</strong> = Different cohorts (Jan 2025, Feb 2025, etc.)<br/>
              • <strong>Columns</strong> = Months elapsed (M0 = start, M3 = 3 months later, M9 = 9 months later)<br/>
              • <strong>Colors</strong> = Health indicator:<br/>
              <div className="pl-3 mt-1">
                Green (≥90%) = Excellent retention<br/>
                Blue (80-89%) = Good retention<br/>
                Amber (70-79%) = Fair retention<br/>
                Orange (60-69%) = Needs attention<br/>
                Red (&lt;60%) = Critical - investigate!
              </div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-white rounded-md">
            <strong>Real Example:</strong>
            <div className="text-xs mt-2 text-gray-600">
              Jan 2025 cohort: Started with 20 policies<br/>
              • M0 (Jan): 100% retention (20/20 active)<br/>
              • M3 (Apr): 90% retention (18/20 active) - 2 lapsed<br/>
              • M9 (Oct): 85% retention (17/20 active) - 1 more lapsed<br/>
              <div className="mt-2 text-blue-700">
                This is a <strong>healthy cohort</strong> - losing only 3 policies in 9 months!
              </div>
            </div>
          </div>

          <div className="p-2 bg-blue-100 rounded text-xs text-center text-blue-700">
            <strong>Pro Tip:</strong> Look for patterns - if certain months have worse retention, investigate what was different about those sales!
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3 mb-6">
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Total Cohorts
          </div>
          <div className="text-lg font-bold text-foreground font-mono">
            {summary.totalCohorts}
          </div>
        </div>

        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Avg 9-Mo Retention
          </div>
          <div className="text-lg font-bold text-success font-mono">
            {summary.avgRetention9Month?.toFixed(1) || 0}%
          </div>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Best Cohort
          </div>
          <div className="text-sm font-bold text-info font-mono">
            {summary.bestCohort || 'N/A'}
          </div>
        </div>

        <div className="p-3 bg-red-50 rounded-lg">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Worst Cohort
          </div>
          <div className="text-sm font-bold text-error font-mono">
            {summary.worstCohort || 'N/A'}
          </div>
        </div>
      </div>

      {/* Retention Heatmap */}
      <div className="mb-5">
        <div className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">
          Retention Heatmap
        </div>
        <CohortHeatmap data={retention} maxMonths={12} />
      </div>
    </div>
  );
}
