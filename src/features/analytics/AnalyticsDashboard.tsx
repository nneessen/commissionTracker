// src/features/analytics/AnalyticsDashboard.tsx

import React, { useState, lazy, Suspense } from "react";
import {
  TimePeriodSelector,
  AdvancedTimePeriod,
  getAdvancedDateRange,
} from "@/components/custom_ui/TimePeriodSelector";
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
              <button
                onClick={handleExportCSV}
                style={{
                  padding: "6px 12px",
                  background: "#10b981",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                title="Export data to CSV"
              >
                📊 Export CSV
              </button>
              <button
                onClick={handlePrintPDF}
                style={{
                  padding: "6px 12px",
                  background: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                title="Print report to PDF"
              >
                📄 Print PDF
              </button>
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
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              fontSize: "14px",
              color: "#656d76",
            }}
          >
            Loading analytics...
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                window.innerWidth >= 1200 ? "1fr 1fr" : "1fr",
              gap: "16px",
              maxWidth: "1600px",
              margin: "0 auto",
              width: "100%",
            }}
          >
            {/* Left Column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                minWidth: 0,
                width: "100%",
              }}
            >
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Loading...
                  </div>
                }
              >
                <PerformanceAttribution />
              </Suspense>
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Loading...
                  </div>
                }
              >
                <CohortAnalysis />
              </Suspense>
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Loading...
                  </div>
                }
              >
                <ProductMatrix />
              </Suspense>
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Loading...
                  </div>
                }
              >
                <GeographicAnalysis />
              </Suspense>
            </div>

            {/* Right Column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                minWidth: 0,
                width: "100%",
              }}
            >
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Loading...
                  </div>
                }
              >
                <ClientSegmentation />
              </Suspense>
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Loading...
                  </div>
                }
              >
                <PredictiveAnalytics />
              </Suspense>
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Loading...
                  </div>
                }
              >
                <CommissionDeepDive />
              </Suspense>
              <Suspense
                fallback={
                  <div
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Loading...
                  </div>
                }
              >
                <EfficiencyMetrics />
              </Suspense>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div
          style={{
            marginTop: "32px",
            padding: "16px",
            background: "#ffffff",
            borderRadius: "8px",
            textAlign: "center",
            fontSize: "11px",
            color: "#656d76",
            maxWidth: "1600px",
          }}
        >
          <strong style={{ color: "#1a1a1a" }}>Note:</strong> All analytics are
          calculated in real-time from your policy and commission data. Data is
          automatically refreshed when underlying records change.
        </div>
      </div>
    </>
  );
}
