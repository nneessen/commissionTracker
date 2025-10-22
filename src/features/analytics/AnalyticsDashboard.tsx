// src/features/analytics/AnalyticsDashboard.tsx

import React, { useState, lazy, Suspense } from "react";
import {
  TimePeriodSelector,
  AdvancedTimePeriod,
  getAdvancedDateRange,
} from "@/components/custom_ui/TimePeriodSelector";
import { Button } from "@/components/ui/button";
import { useAnalyticsData } from "../../hooks/useAnalyticsData";
import { downloadCSV, printAnalyticsToPDF } from "../../utils/exportHelpers";

// Lazy load analytics components for better performance
const PerformanceAttribution = lazy(() =>
  import("./components").then((m) => ({ default: m.PerformanceAttribution })),
);
const CohortAnalysis = lazy(() =>
  import("./components").then((m) => ({ default: m.CohortAnalysis })),
);
const ClientSegmentation = lazy(() =>
  import("./components").then((m) => ({ default: m.ClientSegmentation })),
);
const CommissionDeepDive = lazy(() =>
  import("./components").then((m) => ({ default: m.CommissionDeepDive })),
);
const ProductMatrix = lazy(() =>
  import("./components").then((m) => ({ default: m.ProductMatrix })),
);
const GeographicAnalysis = lazy(() =>
  import("./components").then((m) => ({ default: m.GeographicAnalysis })),
);
const PredictiveAnalytics = lazy(() =>
  import("./components").then((m) => ({ default: m.PredictiveAnalytics })),
);
const EfficiencyMetrics = lazy(() =>
  import("./components").then((m) => ({ default: m.EfficiencyMetrics })),
);

export function AnalyticsDashboard() {
  const [timePeriod, setTimePeriod] = useState<AdvancedTimePeriod>("MTD");
  const [customRange, setCustomRange] = useState<{
    startDate: Date;
    endDate: Date;
  }>({
    startDate: new Date(),
    endDate: new Date(),
  });

  // React 19.1 optimizes automatically - no need for useMemo
  const dateRange = getAdvancedDateRange(timePeriod, customRange);

  const analyticsData = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // React 19.1 optimizes automatically - no need for useCallback
  const handleExportCSV = () => {
    if (analyticsData.raw.policies.length > 0) {
      downloadCSV(
        analyticsData.raw.policies.map((p) => ({
          policyNumber: p.policyNumber,
          product: p.product,
          status: p.status,
          annualPremium: p.annualPremium,
          effectiveDate: p.effectiveDate,
        })),
        "analytics_policies",
      );
    }
  };

  // React 19.1 optimizes automatically - no need for useCallback
  const handlePrintPDF = () => {
    printAnalyticsToPDF("Analytics Report", [
      {
        title: "Overview",
        content: `<p>Analytics report for ${timePeriod} period</p>`,
      },
      {
        title: "Data Summary",
        content: `
          <div class="metric">
            <div class="metric-label">Total Policies</div>
            <div class="metric-value">${analyticsData.raw.policies.length}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Total Commissions</div>
            <div class="metric-value">${analyticsData.raw.commissions.length}</div>
          </div>
        `,
      },
    ]);
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">
          Deep insights into performance, cohorts, segmentation, and forecasts
        </p>
      </div>

      <div className="page-content">
        {/* Time Period Selector and Export Controls */}
        <div
          className="mb-4 p-4 bg-white rounded-lg shadow-sm"
        >
          <div
            className="flex justify-between items-center mb-3"
          >
            <div
              className="text-xs font-semibold text-gray-900 uppercase tracking-wide"
            >
              Time Period
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleExportCSV}
                size="sm"
                className="bg-success hover:bg-success/90 text-white"
                title="Export data to CSV"
              >
                Export CSV
              </Button>
              <Button
                onClick={handlePrintPDF}
                size="sm"
                variant="destructive"
                title="Print report to PDF"
              >
                Print PDF
              </Button>
            </div>
          </div>

          <TimePeriodSelector
            selectedPeriod={timePeriod}
            onPeriodChange={setTimePeriod}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
        </div>

        {/* Loading State */}
        {analyticsData.isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Loading analytics...
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-[1600px] mx-auto w-full">
            {/* Left Column */}
            <div className="flex flex-col gap-4 min-w-0 w-full">
              <Suspense fallback={<div className="p-5 text-center text-slate-400">Loading...</div>}>
                <PerformanceAttribution />
              </Suspense>
              <Suspense fallback={<div className="p-5 text-center text-slate-400">Loading...</div>}>
                <CohortAnalysis />
              </Suspense>
              <Suspense fallback={<div className="p-5 text-center text-slate-400">Loading...</div>}>
                <ProductMatrix />
              </Suspense>
              <Suspense fallback={<div className="p-5 text-center text-slate-400">Loading...</div>}>
                <GeographicAnalysis />
              </Suspense>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-4 min-w-0 w-full">
              <Suspense fallback={<div className="p-5 text-center text-slate-400">Loading...</div>}>
                <ClientSegmentation />
              </Suspense>
              <Suspense fallback={<div className="p-5 text-center text-slate-400">Loading...</div>}>
                <PredictiveAnalytics />
              </Suspense>
              <Suspense fallback={<div className="p-5 text-center text-slate-400">Loading...</div>}>
                <CommissionDeepDive />
              </Suspense>
              <Suspense fallback={<div className="p-5 text-center text-slate-400">Loading...</div>}>
                <EfficiencyMetrics />
              </Suspense>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-white rounded-lg text-center text-xs text-muted-foreground max-w-[1600px]">
          <strong className="text-foreground">Note:</strong> All analytics are
          calculated in real-time from your policy and commission data. Data is
          automatically refreshed when underlying records change.
        </div>
      </div>
    </>
  );
}
