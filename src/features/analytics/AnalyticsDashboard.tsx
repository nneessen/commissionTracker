// src/features/analytics/AnalyticsDashboard.tsx

import React, { lazy, Suspense } from "react";
import {
  TimePeriodSelector,
} from "./components/TimePeriodSelector";
import { Button } from "@/components/ui/button";
import { useAnalyticsData } from '@/hooks';
import { downloadCSV, printAnalyticsToPDF } from "../../utils/exportHelpers";
import { AnalyticsDateProvider, useAnalyticsDateRange } from "./context/AnalyticsDateContext";

// Lazy load analytics components for better performance
const PaceMetrics = lazy(() =>
  import("./components").then((m) => ({ default: m.PaceMetrics })),
);
const PolicyStatusBreakdown = lazy(() =>
  import("./components").then((m) => ({ default: m.PolicyStatusBreakdown })),
);
const ClientSegmentation = lazy(() =>
  import("./components").then((m) => ({ default: m.ClientSegmentation })),
);
const ProductMatrix = lazy(() =>
  import("./components").then((m) => ({ default: m.ProductMatrix })),
);
const CarriersProductsBreakdown = lazy(() =>
  import("./components").then((m) => ({ default: m.CarriersProductsBreakdown })),
);
const GeographicAnalysis = lazy(() =>
  import("./components").then((m) => ({ default: m.GeographicAnalysis })),
);
const GamePlan = lazy(() =>
  import("./components").then((m) => ({ default: m.GamePlan })),
);

function AnalyticsDashboardContent() {
  const { timePeriod, setTimePeriod, customRange, setCustomRange, dateRange } = useAnalyticsDateRange();

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
        <div className="border-b border-border pb-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Time Period
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleExportCSV}
                size="sm"
                variant="ghost"
                title="Export data to CSV"
              >
                Export CSV
              </Button>
              <Button
                onClick={handlePrintPDF}
                size="sm"
                variant="ghost"
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
              <Suspense fallback={<div className="p-5 text-center text-muted-foreground">Loading...</div>}>
                <PaceMetrics />
              </Suspense>
              <Suspense fallback={<div className="p-5 text-center text-muted-foreground">Loading...</div>}>
                <PolicyStatusBreakdown />
              </Suspense>
              <Suspense fallback={<div className="p-5 text-center text-muted-foreground">Loading...</div>}>
                <ProductMatrix />
              </Suspense>
              <Suspense fallback={<div className="p-5 text-center text-muted-foreground">Loading...</div>}>
                <CarriersProductsBreakdown />
              </Suspense>
              <Suspense fallback={<div className="p-5 text-center text-muted-foreground">Loading...</div>}>
                <GeographicAnalysis />
              </Suspense>
            </div>

            {/* Right Column */}
            <div className="flex flex-col gap-4 min-w-0 w-full">
              <Suspense fallback={<div className="p-5 text-center text-muted-foreground">Loading...</div>}>
                <ClientSegmentation />
              </Suspense>
              <Suspense fallback={<div className="p-5 text-center text-muted-foreground">Loading...</div>}>
                <GamePlan />
              </Suspense>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-card rounded-lg border border-border text-center text-xs text-muted-foreground max-w-[1600px]">
          <strong className="text-foreground">Note:</strong> All analytics are
          calculated in real-time from your policy and commission data. Data is
          automatically refreshed when underlying records change.
        </div>
      </div>
    </>
  );
}

export function AnalyticsDashboard() {
  return (
    <AnalyticsDateProvider>
      <AnalyticsDashboardContent />
    </AnalyticsDateProvider>
  );
}
