// src/features/reports/ReportsPage.tsx

import React, { useState, useMemo } from 'react';
import {ReportType, ReportFilters, ReportSection, DrillDownContext} from '../../types/reports.types';
import {Button} from '../../components/ui/button';
import {TimePeriodSelector, AdvancedTimePeriod, getAdvancedDateRange} from '../analytics/components/TimePeriodSelector';
import {useReport} from '../../hooks/reports/useReport';
import {ReportExportService} from '../../services/reports/reportExportService';
import {Printer, ChevronRight, TrendingUp, AlertTriangle, CheckCircle, Package, Loader2} from 'lucide-react';
import {Card} from '../../components/ui/card';
import {CommissionAgingChart, ClientTierChart} from './components/charts';
import {BundleExportDialog} from './components/BundleExportDialog';
import {DrillDownDrawer} from './components/drill-down';

// Helper function to create stable initial dates
function getInitialDateRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  return {
    startDate: today,
    endDate: endDate,
  };
}

// Helper to parse currency string to number
function parseCurrency(value: string | number): number {
  if (typeof value === 'number') return value;
  return parseFloat(value.replace(/[$,]/g, '')) || 0;
}

// Helper to extract chart data from table data
function getAgingChartData(section: ReportSection) {
  if (!section.tableData) return [];
  return section.tableData.rows.map(row => ({
    bucket: String(row[0]),
    atRisk: parseCurrency(row[2]),
    earned: 0, // Aging table doesn't have earned column
    riskLevel: String(row[3]),
  }));
}

function getTierChartData(section: ReportSection) {
  if (!section.tableData) return [];
  return section.tableData.rows.map(row => ({
    tier: String(row[0]).replace(/^.*Tier\s*/, '').replace(/\s*-.*$/, '').trim().charAt(0),
    count: typeof row[1] === 'number' ? row[1] : parseInt(String(row[1])) || 0,
  }));
}

// Report categories for navigation
const REPORT_CATEGORIES = {
  executive: {
    name: 'Executive Reports',
    reports: [
      { type: 'executive-dashboard' as ReportType, name: 'Executive Report', icon: '📊' },
      { type: 'financial-health' as ReportType, name: 'Financial Health', icon: '💰' },
      { type: 'predictive-analytics' as ReportType, name: 'Predictive Analytics', icon: '📈' },
    ]
  },
  performance: {
    name: 'Performance Reports',
    reports: [
      { type: 'commission-performance' as ReportType, name: 'Commission Report', icon: '💵' },
      { type: 'policy-performance' as ReportType, name: 'Policy Report', icon: '📋' },
      { type: 'client-relationship' as ReportType, name: 'Client Report', icon: '👥' },
    ]
  }
};

export function ReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType>('executive-dashboard');
  const [timePeriod, setTimePeriod] = useState<AdvancedTimePeriod>('MTD');
  const [customRange, setCustomRange] = useState<{ startDate: Date; endDate: Date }>(getInitialDateRange);
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [drillDownContext, setDrillDownContext] = useState<DrillDownContext | null>(null);

  // Get date range from time period (memoized to prevent infinite loop)
  const dateRange = useMemo(
    () => getAdvancedDateRange(timePeriod, customRange),
    [timePeriod, customRange]
  );

  // Build report filters (memoized to prevent infinite loop) - simplified without carrier/product/state
  const filters: ReportFilters = useMemo(
    () => ({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
    [dateRange.startDate, dateRange.endDate]
  );

  // Drill-down handlers
  const handleAgingBucketClick = (bucket: string) => {
    setDrillDownContext({
      type: 'commission-aging-bucket',
      title: `Commission Aging: ${bucket}`,
      subtitle: 'At-risk commissions in this aging window',
      agingBucket: bucket,
      filters,
    });
  };

  const handleClientTierClick = (tier: string) => {
    const tierDescriptions: Record<string, string> = {
      A: 'High-value clients with $10K+ total premium',
      B: 'Growth clients with $5K-$10K total premium',
      C: 'Standard clients with $2K-$5K total premium',
      D: 'Entry-level clients with less than $2K total premium',
    };
    setDrillDownContext({
      type: 'client-tier',
      title: `Tier ${tier} Clients`,
      subtitle: tierDescriptions[tier] || 'Clients in this tier',
      clientTier: tier as 'A' | 'B' | 'C' | 'D',
      filters,
    });
  };

  // Fetch report data using React Query
  const { data: report, isLoading, error } = useReport(selectedType, filters);

  // Export handlers
  const handleExportPDF = () => {
    if (!report) return;
    ReportExportService.exportReport(report, {
      format: 'pdf',
      includeCharts: true,
      includeSummary: true,
      includeInsights: true,
    });
  };

  const handleExportExcel = () => {
    if (!report) return;
    ReportExportService.exportReport(report, {
      format: 'excel',
      includeSummary: true,
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar - Mobile Responsive */}
      <div className="page-header py-2 md:py-3 border-b border-border/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-3 md:px-4">
          <div className="flex-shrink-0">
            <h1 className="text-lg md:text-xl font-semibold text-foreground">Reports</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Professional reporting and analytics
            </p>
          </div>

          {/* Controls - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <TimePeriodSelector
              selectedPeriod={timePeriod}
              onPeriodChange={setTimePeriod}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
            />
            <div className="flex gap-1.5 justify-end">
              <Button
                onClick={handleExportPDF}
                size="sm"
                variant="ghost"
                disabled={!report || isLoading}
                className="h-7 px-2 text-xs"
                title="Export to PDF"
              >
                PDF
              </Button>
              <Button
                onClick={handleExportExcel}
                size="sm"
                variant="ghost"
                disabled={!report || isLoading}
                className="h-7 px-2 text-xs"
                title="Export to Excel"
              >
                Excel
              </Button>
              <Button
                onClick={() => setBundleDialogOpen(true)}
                size="sm"
                variant="ghost"
                className="h-7 px-2.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary"
              >
                <Package className="w-3 h-3 mr-1" />
                Bundle
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Three-Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE - Report Navigator - Hidden on Mobile */}
        <div className="hidden md:block w-48 lg:w-52 border-r border-border/50 bg-muted/20 flex-shrink-0">
          <div className="p-3 space-y-3">
            {Object.entries(REPORT_CATEGORIES).map(([key, category]) => (
              <div key={key}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-2">
                  {category.name}
                </h3>
                <div className="space-y-1">
                  {category.reports.map(report => (
                    <button
                      key={report.type}
                      onClick={() => setSelectedType(report.type)}
                      className={`w-full text-left px-2 py-1.5 rounded-sm text-xs transition-colors ${
                        selectedType === report.type
                          ? 'bg-primary/90 text-primary-foreground font-medium'
                          : 'hover:bg-muted/50 text-foreground'
                      }`}
                    >
                      <span className="mr-1.5">{report.icon}</span>
                      {report.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER PANE - Report Viewer (Document Style) */}
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="max-w-full mx-auto p-3 md:p-4">
            {/* Mobile Report Selector */}
            <div className="md:hidden mb-4">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as ReportType)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-card text-foreground"
              >
                {Object.entries(REPORT_CATEGORIES).map(([key, category]) => (
                  <optgroup key={key} label={category.name}>
                    {category.reports.map(report => (
                      <option key={report.type} value={report.type}>
                        {report.icon} {report.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-xs text-muted-foreground">Generating report...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card className="p-4 border-red-200 bg-red-50/50 dark:bg-red-950/10">
                <p className="text-xs text-red-600 dark:text-red-400">
                  Error: {error instanceof Error ? error.message : 'Unknown error'}
                </p>
              </Card>
            )}

            {/* DOCUMENT-STYLE REPORT */}
            {!isLoading && !error && report && (
              <div className="bg-card rounded-md shadow-sm border border-border/50">
                {/* Report Header - Ultra Compact */}
                <div className="px-3 py-2 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-base font-bold text-foreground">
                        {report.title}
                      </h1>
                      <p className="text-[10px] text-muted-foreground">
                        {filters.startDate.toLocaleDateString()} - {filters.endDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Executive Summary Section */}
                <div className="px-3 py-2 border-b border-border/50">
                  <h2 className="text-sm font-bold text-foreground mb-2">
                    Executive Summary
                  </h2>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-1.5 mb-2">
                    {report.summary.keyMetrics.map((metric, index) => (
                      <div key={index} className="flex items-baseline gap-1.5">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {metric.label}:
                        </span>
                        <span className="text-sm font-bold text-foreground font-mono">
                          {metric.value}
                        </span>
                        {metric.trend && (
                          <span className={`text-xs font-medium ${
                            metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {metric.trend === 'up' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Top Insights */}
                  {report.summary.topInsights.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-foreground mb-1.5">
                        Priority Actions
                      </h3>
                      {report.summary.topInsights.map((insight, _index) => (
                        <div
                          key={insight.id}
                          className="flex items-start gap-2 p-2 rounded-sm bg-muted/30 border-l-2 border-l-orange-500/70"
                        >
                          <AlertTriangle className="w-3 h-3 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-foreground">{insight.title}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {insight.description}
                            </p>
                            <div className="text-xs text-foreground font-medium mt-0.5">
                              Impact: {insight.impact}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Report Sections */}
                {report.sections.map((section, _sectionIndex) => (
                  <div key={section.id} className="px-3 py-2 md:py-3 border-b border-border/50 last:border-b-0">
                    <h2 className="text-sm font-bold text-foreground mb-1.5">
                      {section.title}
                    </h2>

                    {section.description && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {section.description}
                      </p>
                    )}

                    {/* Section Metrics Table */}
                    {section.metrics && section.metrics.length > 0 && (
                      <div className="mb-3">
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-border/30">
                            {section.metrics.map((metric, idx) => (
                              <tr key={idx} className="group hover:bg-muted/20">
                                <td className="py-1 pr-2 text-muted-foreground font-medium w-1/3">
                                  {metric.label}
                                </td>
                                <td className="py-1 text-foreground font-bold text-sm">
                                  <div className="flex items-baseline gap-1">
                                    <span>{metric.value}</span>
                                    {metric.trend && (
                                      <span className={`text-xs font-medium ${
                                        metric.trend === 'up' ? 'text-green-600' :
                                        metric.trend === 'down' ? 'text-red-600' :
                                        'text-muted-foreground'
                                      }`}>
                                        {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-1 text-right text-xs text-muted-foreground">
                                  {metric.change !== undefined && (
                                    <span>{metric.change > 0 ? '+' : ''}{metric.change}%</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Section Chart */}
                    {section.chartData && (
                      <div className="mb-3 space-y-1">
                        <h4 className="text-xs font-semibold text-foreground">Performance Trends</h4>
                        <div className="p-2 bg-card rounded border border-border">
                          {/* Chart placeholder - would use actual chart library */}
                          <div className="h-40 flex items-center justify-center text-muted-foreground text-xs">
                            Chart data available ({section.chartData.datasets.length} datasets)
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Section Table with Optional Chart */}
                    {section.tableData && (
                      <div className="mb-3 space-y-2">
                        {/* Render chart for specific sections */}
                        {section.id === 'commission-aging' && (
                          <div className="mb-2">
                            <CommissionAgingChart
                              data={getAgingChartData(section)}
                              height={160}
                              onBarClick={handleAgingBucketClick}
                            />
                          </div>
                        )}
                        {section.id === 'client-tiers' && (
                          <div className="mb-2">
                            <ClientTierChart
                              data={getTierChartData(section)}
                              height={140}
                              onSliceClick={handleClientTierClick}
                            />
                          </div>
                        )}

                        {/* Data Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-muted border-b border-border">
                              <tr>
                                {section.tableData.headers.map((header, headerIdx) => (
                                  <th key={headerIdx} className="px-2 py-1.5 text-left font-semibold text-foreground text-xs">
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {section.tableData.rows.map((row, rowIdx) => (
                                <tr key={rowIdx} className="hover:bg-muted/50">
                                  {row.map((cell, cellIdx) => (
                                    <td key={cellIdx} className="px-2 py-1.5 text-xs text-muted-foreground">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Section Insights */}
                    {section.insights && section.insights.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <h4 className="text-xs font-semibold text-foreground">Key Findings</h4>
                        {section.insights.map((insight, idx) => (
                          <div key={insight.id || idx} className="flex items-start gap-2 p-2 bg-blue-50/50 dark:bg-blue-950/20 rounded-sm border-l-2 border-l-blue-500">
                            <CheckCircle className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-foreground mb-0.5">{insight.title}</p>
                              <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                              {insight.recommendedActions && insight.recommendedActions.length > 0 && (
                                <ul className="mt-1 space-y-0.5">
                                  {insight.recommendedActions.map((action, actionIdx) => (
                                    <li key={actionIdx} className="text-xs text-foreground">
                                      → {action}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Report Footer */}
                <div className="p-2 bg-muted/30 text-center border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Report ID: {report.id} | Generated: {report.generatedAt.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bundle Export Dialog */}
      <BundleExportDialog
        open={bundleDialogOpen}
        onOpenChange={setBundleDialogOpen}
        filters={filters}
      />

      {/* Drill-Down Drawer */}
      <DrillDownDrawer
        open={!!drillDownContext}
        onClose={() => setDrillDownContext(null)}
        context={drillDownContext}
      />
    </div>
  );
}
