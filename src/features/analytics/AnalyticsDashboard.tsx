// src/features/analytics/AnalyticsDashboard.tsx

import React, { lazy, Suspense } from "react";
import {TimePeriodSelector} from "./components/TimePeriodSelector";
import {Button} from "@/components/ui/button";
import {useAnalyticsData} from '@/hooks';
import {downloadCSV, printAnalyticsToPDF} from "../../utils/exportHelpers";
import {AnalyticsDateProvider, useAnalyticsDateRange} from "./context/AnalyticsDateContext";

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
const CommissionPipeline = lazy(() =>
  import("./components/CommissionPipeline").then((m) => ({ default: m.CommissionPipeline })),
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
      {/* Page Header with TimePeriodSelector on same row */}
      <div className="page-header py-2 border-b border-border/50 mb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-shrink-0">
            <h1 className="text-base font-semibold text-foreground">Analytics Dashboard</h1>
            <p className="text-[11px] text-muted-foreground">
              Real-time performance metrics and insights
            </p>
          </div>

          {/* TimePeriodSelector and Export - all on same row */}
          <div className="flex items-center gap-3">
            <TimePeriodSelector
              selectedPeriod={timePeriod}
              onPeriodChange={setTimePeriod}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
            />
            <div className="flex gap-1.5 flex-shrink-0">
              <Button
                onClick={handleExportCSV}
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                title="Export data to CSV"
              >
                CSV
              </Button>
              <Button
                onClick={handlePrintPDF}
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                title="Print report to PDF"
              >
                PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="page-content">

        {/* Loading State */}
        {analyticsData.isLoading ? (
          <div className="p-4 text-center text-[11px] text-muted-foreground">
            Loading analytics...
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-2 max-w-[1920px] mx-auto w-full">
            {/* Compact Grid Layout */}
            <Suspense fallback={null}>
              <PaceMetrics />
            </Suspense>
            <Suspense fallback={null}>
              <PolicyStatusBreakdown />
            </Suspense>
            <Suspense fallback={null}>
              <ProductMatrix />
            </Suspense>
            <Suspense fallback={null}>
              <CarriersProductsBreakdown />
            </Suspense>
            <Suspense fallback={null}>
              <GeographicAnalysis />
            </Suspense>
            <Suspense fallback={null}>
              <ClientSegmentation />
            </Suspense>
            <Suspense fallback={null}>
              <GamePlan />
            </Suspense>
            <Suspense fallback={null}>
              <CommissionPipeline />
            </Suspense>
          </div>
        )}

        {/* Compact Footer Note */}
        <div className="mt-3 px-2 py-1 text-[10px] text-muted-foreground/70 text-center max-w-[1920px]">
          Real-time calculations • Auto-refresh on data changes
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
