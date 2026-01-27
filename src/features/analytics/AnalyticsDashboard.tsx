// src/features/analytics/AnalyticsDashboard.tsx

import React, { lazy, Suspense } from "react";
import { BarChart3 } from "lucide-react";
import { TimePeriodSelector } from "./components/TimePeriodSelector";
import { Button } from "@/components/ui/button";
import { useAnalyticsData } from "@/hooks";
import { downloadCSV, printAnalyticsToPDF } from "../../utils/exportHelpers";
import {
  AnalyticsDateProvider,
  useAnalyticsDateRange,
} from "./context/AnalyticsDateContext";
import { AnalyticsSectionGate } from "@/components/subscription";
import { ChunkErrorBoundary } from "@/components/shared/ChunkErrorBoundary";

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
  import("./components").then((m) => ({
    default: m.CarriersProductsBreakdown,
  })),
);
const GeographicAnalysis = lazy(() =>
  import("./components").then((m) => ({ default: m.GeographicAnalysis })),
);
const GamePlan = lazy(() =>
  import("./components").then((m) => ({ default: m.GamePlan })),
);
const CommissionPipeline = lazy(() =>
  import("./components/CommissionPipeline").then((m) => ({
    default: m.CommissionPipeline,
  })),
);
const PredictiveAnalytics = lazy(() =>
  import("./components").then((m) => ({ default: m.PredictiveAnalytics })),
);

function AnalyticsDashboardContent() {
  const { timePeriod, setTimePeriod, customRange, setCustomRange, dateRange } =
    useAnalyticsDateRange();

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
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
      {/* Compact Header Card */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Analytics
          </h1>
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Performance metrics and insights
          </span>
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
              className="h-6 px-2 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              title="Export data to CSV"
            >
              CSV
            </Button>
            <Button
              onClick={handlePrintPDF}
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              title="Print report to PDF"
            >
              PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Loading State */}
        {analyticsData.isLoading ? (
          <div className="p-4 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
            Loading analytics...
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-2 max-w-[1920px] mx-auto w-full">
            {/* Free Tier Sections (3) */}
            <AnalyticsSectionGate section="pace_metrics">
              <Suspense fallback={null}>
                <PaceMetrics />
              </Suspense>
            </AnalyticsSectionGate>

            <AnalyticsSectionGate section="carriers_products">
              <Suspense fallback={null}>
                <CarriersProductsBreakdown />
              </Suspense>
            </AnalyticsSectionGate>

            <AnalyticsSectionGate section="product_matrix">
              <Suspense fallback={null}>
                <ProductMatrix />
              </Suspense>
            </AnalyticsSectionGate>

            {/* Pro Tier Sections (all 9 sections) */}
            <AnalyticsSectionGate section="policy_status_breakdown">
              <Suspense fallback={null}>
                <PolicyStatusBreakdown />
              </Suspense>
            </AnalyticsSectionGate>

            <AnalyticsSectionGate section="geographic">
              <Suspense fallback={null}>
                <GeographicAnalysis />
              </Suspense>
            </AnalyticsSectionGate>

            <AnalyticsSectionGate section="client_segmentation">
              <Suspense fallback={null}>
                <ClientSegmentation />
              </Suspense>
            </AnalyticsSectionGate>

            {/* Pro Tier Sections (+3 = 9 total) */}
            <AnalyticsSectionGate section="game_plan">
              <Suspense fallback={null}>
                <GamePlan />
              </Suspense>
            </AnalyticsSectionGate>

            <AnalyticsSectionGate section="commission_pipeline">
              <Suspense fallback={null}>
                <CommissionPipeline />
              </Suspense>
            </AnalyticsSectionGate>

            <AnalyticsSectionGate section="predictive_analytics">
              <Suspense fallback={null}>
                <PredictiveAnalytics />
              </Suspense>
            </AnalyticsSectionGate>
          </div>
        )}

        {/* Compact Footer Note */}
        <div className="mt-3 px-2 py-1 text-[10px] text-zinc-400 dark:text-zinc-500 text-center max-w-[1920px]">
          Real-time calculations • Auto-refresh on data changes
        </div>
      </div>
    </div>
  );
}

export function AnalyticsDashboard() {
  return (
    <AnalyticsDateProvider>
      <ChunkErrorBoundary context="analytics dashboard">
        <AnalyticsDashboardContent />
      </ChunkErrorBoundary>
    </AnalyticsDateProvider>
  );
}
