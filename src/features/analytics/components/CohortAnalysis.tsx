// src/features/analytics/components/CohortAnalysis.tsx

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Info, X } from 'lucide-react';
import { CohortHeatmap } from '../visualizations';
import { useAnalyticsData } from '../../../hooks';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';

/**
 * CohortAnalysis - Retention and cohort performance tracking
 *
 * Analyzes policy performance by cohorts (groups that started in the same month)
 * Tracks retention, chargebacks, and earning progress over time
 */
export function CohortAnalysis() {
  const { dateRange } = useAnalyticsDateRange();
  const { cohort, isLoading } = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const [showInfo, setShowInfo] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-3">
          <Heading
            title="Policy Survival Rates"
            subtitle="How long policies stay active by start month"
          />
          <div className="p-10 text-center text-muted-foreground text-xs">
            Loading cohort data...
          </div>
        </CardContent>
      </Card>
    );
  }

  const { retention, summary } = cohort;

  return (
    <Card>
      <CardContent className="p-3">
        {/* Header */}
        <Heading
          title="Policy Survival Rates"
          subtitle="How long policies stay active by start month"
        >
          {/* Info Icon Button */}
          <Button
            onClick={() => setShowInfo(!showInfo)}
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            title="Click for detailed explanation"
          >
            <Info className="h-3 w-3" />
          </Button>
        </Heading>

        {/* Info Panel */}
        {showInfo && (
          <Alert className="bg-primary/10 border-primary mb-4">
            <AlertDescription>
              <div className="flex justify-between items-start mb-3">
                <h3 className="m-0 text-sm font-bold text-foreground">
                  Understanding Policy Survival Rates
                </h3>
                <Button
                  onClick={() => setShowInfo(false)}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-4">
                <strong>What is this?</strong> This shows how many of your policies are still active after different periods of time.
                Think of it like tracking how long customers stay with you - which months had the best "stickiness"?
              </div>

              <div className="mb-4">
                <strong>Key Metrics Explained:</strong>
              </div>

              <div className="mb-3 pl-4">
                <div className="mb-2">
                  <strong className="text-foreground">Total Cohorts:</strong>
                  <div className="mt-1 text-muted-foreground">
                    How many different "start months" you have policies from
                  </div>
                </div>

                <div className="mb-2">
                  <strong className="text-status-active">Avg 9-Mo Retention:</strong>
                  <div className="mt-1 text-muted-foreground">
                    What percentage of policies are still active after 9 months (industry benchmark)
                    <div className="text-xs mt-0.5">
                      Example: 85% means 85 out of 100 policies are still active at month 9
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <strong className="text-primary">Best Cohort:</strong>
                  <div className="mt-1 text-muted-foreground">
                    Which start month has the best retention (your strongest group)
                  </div>
                </div>

                <div className="mb-2">
                  <strong className="text-destructive">Worst Cohort:</strong>
                  <div className="mt-1 text-muted-foreground">
                    Which start month has the lowest retention (needs attention)
                  </div>
                </div>
              </div>

              <div className="mb-4 p-3 bg-gradient-to-r from-info/15 via-status-earned/10 to-card rounded-md shadow-sm">
                <strong className="text-foreground">How to Read the Heatmap:</strong>
                <div className="text-xs mt-2 text-muted-foreground">
                  • <strong>Rows</strong> = Different cohorts (Jan 2025, Feb 2025, etc.)<br/>
                  • <strong>Columns</strong> = Months elapsed (M0 = start, M3 = 3 months later, M9 = 9 months later)<br/>
                  • <strong>Colors</strong> = Health indicator:<br/>
                  <div className="pl-3 mt-1">
                    <span className="text-success font-bold">Green (≥90%)</span> = Excellent retention<br/>
                    <span className="text-info font-bold">Blue (80-89%)</span> = Good retention<br/>
                    <span className="text-warning font-bold">Amber (70-79%)</span> = Fair retention<br/>
                    <span className="text-status-lapsed font-bold">Orange (60-69%)</span> = Needs attention<br/>
                    <span className="text-destructive font-bold">Red (&lt;60%)</span> = Critical - investigate!
                  </div>
                </div>
              </div>

              <div className="mb-4 p-3 bg-gradient-to-r from-success/15 via-status-active/10 to-card rounded-md shadow-sm">
                <strong className="text-foreground">Real Example:</strong>
                <div className="text-xs mt-2 text-muted-foreground">
                  Jan 2025 cohort: Started with 20 policies<br/>
                  • M0 (Jan): <span className="text-success font-bold">100% retention</span> (20/20 active)<br/>
                  • M3 (Apr): <span className="text-success font-bold">90% retention</span> (18/20 active) - 2 lapsed<br/>
                  • M9 (Oct): <span className="text-info font-bold">85% retention</span> (17/20 active) - 1 more lapsed<br/>
                  <div className="mt-2 text-primary font-semibold">
                    This is a <strong>healthy cohort</strong> - losing only 3 policies in 9 months!
                  </div>
                </div>
              </div>

              <div className="p-2 bg-gradient-to-r from-primary/20 to-accent/10 rounded text-xs text-center text-primary font-semibold shadow-sm">
                <strong>Pro Tip:</strong> Look for patterns - if certain months have worse retention, investigate what was different about those sales!
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2 mb-3">
          <Card className="bg-gradient-to-br from-accent/15 to-card shadow-md hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Total Cohorts
              </div>
              <div className="text-lg font-bold text-foreground font-mono">
                {summary.totalCohorts}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/20 via-status-active/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Avg 9-Mo Retention
              </div>
              <div className="text-lg font-bold text-success font-mono">
                {summary.avgRetention9Month?.toFixed(1) || 0}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/20 via-accent/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Best Cohort
              </div>
              <div className="text-sm font-bold text-primary font-mono">
                {summary.bestCohort || 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-destructive/20 via-error/10 to-card shadow-md hover:shadow-lg transition-all duration-200">
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Worst Cohort
              </div>
              <div className="text-sm font-bold text-destructive font-mono">
                {summary.worstCohort || 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Retention Heatmap */}
        <div className="mb-2">
          <Heading title="Retention Heatmap" className="mb-2" />
          <CohortHeatmap data={retention} maxMonths={12} />
        </div>
      </CardContent>
    </Card>
  );
}
