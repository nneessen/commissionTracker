// src/features/analytics/AnalyticsDashboard.tsx

import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import {
  TimePeriodSelector,
  AdvancedTimePeriod,
  getAdvancedDateRange,
} from '../../components/ui/TimePeriodSelector';
import { useAnalyticsData } from '../../hooks/useAnalyticsData';
import { downloadCSV, printAnalyticsToPDF } from '../../utils/exportHelpers';

// Lazy load analytics components for better performance
const PerformanceAttribution = lazy(() => import('./components').then(m => ({ default: m.PerformanceAttribution })));
const CohortAnalysis = lazy(() => import('./components').then(m => ({ default: m.CohortAnalysis })));
const ClientSegmentation = lazy(() => import('./components').then(m => ({ default: m.ClientSegmentation })));
const CommissionDeepDive = lazy(() => import('./components').then(m => ({ default: m.CommissionDeepDive })));
const ProductMatrix = lazy(() => import('./components').then(m => ({ default: m.ProductMatrix })));
const GeographicAnalysis = lazy(() => import('./components').then(m => ({ default: m.GeographicAnalysis })));
const PredictiveAnalytics = lazy(() => import('./components').then(m => ({ default: m.PredictiveAnalytics })));
const EfficiencyMetrics = lazy(() => import('./components').then(m => ({ default: m.EfficiencyMetrics })));

/**
 * AnalyticsDashboard - Advanced analytics and insights
 *
 * Provides deep analysis through:
 * - Performance attribution
 * - Cohort retention tracking
 * - Client segmentation
 * - Predictive analytics
 * - Geographic and product analysis
 * - Commission and efficiency metrics
 */
export function AnalyticsDashboard() {
  const [timePeriod, setTimePeriod] = useState<AdvancedTimePeriod>('MTD');
  const [customRange, setCustomRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(),
    endDate: new Date(),
  });

  // Get current date range based on selected period
  const dateRange = useMemo(
    () => getAdvancedDateRange(timePeriod, customRange),
    [timePeriod, customRange]
  );

  // Fetch analytics data with date range filter
  const analyticsData = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Export handlers
  const handleExportCSV = useCallback(() => {
    if (analyticsData.raw.policies.length > 0) {
      downloadCSV(
        analyticsData.raw.policies.map(p => ({
          policyNumber: p.policyNumber,
          product: p.product,
          status: p.status,
          annualPremium: p.annualPremium,
          effectiveDate: p.effectiveDate,
        })),
        'analytics_policies'
      );
    }
  }, [analyticsData.raw.policies]);

  const handlePrintPDF = useCallback(() => {
    printAnalyticsToPDF('Analytics Report', [
      {
        title: 'Overview',
        content: `<p>Analytics report for ${timePeriod} period</p>`,
      },
      {
        title: 'Data Summary',
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
  }, [timePeriod, analyticsData.raw.policies.length, analyticsData.raw.commissions.length]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      padding: window.innerWidth < 768 ? '12px' : '24px'
    }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: '8px'
        }}>
          Analytics
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#656d76',
          marginBottom: '20px'
        }}>
          Deep insights into performance, cohorts, segmentation, and forecasts
        </p>

        {/* Time Period Selector and Export Controls */}
        <div style={{
          marginBottom: '16px',
          padding: '16px',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#1a1a1a',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Time Period
            </div>

            {/* Export Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleExportCSV}
                style={{
                  padding: '6px 12px',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Export data to CSV"
              >
                📊 Export CSV
              </button>
              <button
                onClick={handlePrintPDF}
                style={{
                  padding: '6px 12px',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
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
      </div>

      {/* Loading State */}
      {analyticsData.isLoading ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#656d76'
        }}>
          Loading analytics...
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 600px), 1fr))',
          gap: '16px',
          maxWidth: '1600px'
        }}>
          {/* Left Column */}
          <div style={{ display: 'grid', gap: '16px' }}>
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}>
              <PerformanceAttribution />
            </Suspense>
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}>
              <CohortAnalysis />
            </Suspense>
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}>
              <ProductMatrix />
            </Suspense>
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}>
              <GeographicAnalysis />
            </Suspense>
          </div>

          {/* Right Column */}
          <div style={{ display: 'grid', gap: '16px' }}>
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}>
              <ClientSegmentation />
            </Suspense>
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}>
              <PredictiveAnalytics />
            </Suspense>
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}>
              <CommissionDeepDive />
            </Suspense>
            <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>}>
              <EfficiencyMetrics />
            </Suspense>
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div style={{
        marginTop: '32px',
        padding: '16px',
        background: '#ffffff',
        borderRadius: '8px',
        textAlign: 'center',
        fontSize: '11px',
        color: '#656d76',
        maxWidth: '1600px'
      }}>
        <strong style={{ color: '#1a1a1a' }}>Note:</strong> All analytics are calculated in real-time from your policy and commission data.
        Data is automatically refreshed when underlying records change.
      </div>
    </div>
  );
}
