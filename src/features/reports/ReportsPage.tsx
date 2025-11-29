// src/features/reports/ReportsPage.tsx

import React, { useState, useMemo } from 'react';
import { ReportType, ReportFilters } from '../../types/reports.types';
import { Button } from '../../components/ui/button';
import { TimePeriodSelector, AdvancedTimePeriod, getAdvancedDateRange } from '../analytics/components/TimePeriodSelector';
import { useReport } from '../../hooks/reports/useReport';
import { ReportExportService } from '../../services/reports/reportExportService';
import { Download, Loader2, FileText, Table, Printer, ChevronRight, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '../../components/ui/card';

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

  // Get date range from time period (memoized to prevent infinite loop)
  const dateRange = useMemo(
    () => getAdvancedDateRange(timePeriod, customRange),
    [timePeriod, customRange]
  );

  // Build report filters (memoized to prevent infinite loop)
  const filters: ReportFilters = useMemo(
    () => ({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
    [dateRange.startDate, dateRange.endDate]
  );

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
      {/* Top Bar - Compact */}
      <div className="border-b border-border bg-card px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-foreground">Reports</h1>
          </div>

          {/* Controls - Horizontal */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <TimePeriodSelector
                selectedPeriod={timePeriod}
                onPeriodChange={setTimePeriod}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
              />
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportPDF}
                size="sm"
                variant="outline"
                disabled={!report || isLoading}
                className="h-8 px-3"
              >
                <Printer className="w-3 h-3 mr-1.5" />
                PDF
              </Button>
              <Button
                onClick={handleExportExcel}
                size="sm"
                variant="outline"
                disabled={!report || isLoading}
                className="h-8 px-3"
              >
                <FileText className="w-3 h-3 mr-1.5" />
                Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Three-Pane Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE - Report Navigator */}
        <div className="w-48 border-r border-border bg-card flex-shrink-0">
          <div className="p-3 space-y-4">
            {Object.entries(REPORT_CATEGORIES).map(([key, category]) => (
              <div key={key}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {category.name}
                </h3>
                <div className="space-y-0.5">
                  {category.reports.map(report => (
                    <button
                      key={report.type}
                      onClick={() => setSelectedType(report.type)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                        selectedType === report.type
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'hover:bg-accent text-foreground'
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
        <div className="flex-1 overflow-y-auto bg-muted/30">
          <div className="max-w-full mx-auto p-4">
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-sm text-muted-foreground">Generating professional report...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card className="p-6 border-red-500 bg-red-50 dark:bg-red-950/20">
                <p className="text-sm text-red-600 dark:text-red-400">
                  Error generating report: {error instanceof Error ? error.message : 'Unknown error'}
                </p>
              </Card>
            )}

            {/* DOCUMENT-STYLE REPORT */}
            {!isLoading && !error && report && (
              <div className="bg-card rounded-lg shadow-lg border border-border">
                {/* Report Header - Compact */}
                <div className="p-3 border-b border-border bg-gradient-to-br from-primary/5 to-primary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-lg font-bold text-foreground">
                        {report.title}
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        {filters.startDate.toLocaleDateString()} - {filters.endDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Executive Summary Section */}
                <div className="p-3 border-b border-border">
                  <h2 className="text-sm font-bold text-foreground mb-2">
                    Executive Summary
                  </h2>

                  {/* Key Metrics - Compact 3-Column Grid */}
                  <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 mb-3">
                    {report.summary.keyMetrics.map((metric, index) => (
                      <div key={index} className="flex items-baseline gap-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          {metric.label}:
                        </span>
                        <span className="text-xs font-bold text-foreground font-mono">
                          {metric.value}
                        </span>
                        {metric.trend && (
                          <span className={`text-[9px] font-medium ${
                            metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {metric.trend === 'up' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Top Insights - Ultra Compact */}
                  {report.summary.topInsights.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-foreground mb-2">
                        Priority Actions
                      </h3>
                      {report.summary.topInsights.map((insight, index) => (
                        <div
                          key={insight.id}
                          className="flex items-start gap-2 p-2 rounded bg-muted/50 border-l-2 border-l-orange-500"
                        >
                          <AlertTriangle className="w-3 h-3 text-orange-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-foreground">{insight.title}</h4>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              {insight.description}
                            </p>
                            <div className="text-[10px] text-foreground font-medium mt-0.5">
                              Impact: {insight.impact}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Report Sections - Ultra Compact */}
                {report.sections.map((section, sectionIndex) => (
                  <div key={section.id} className="p-2 border-b border-border last:border-b-0">
                    <h2 className="text-sm font-bold text-foreground mb-2">
                      {section.title}
                    </h2>

                    {section.description && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {section.description}
                      </p>
                    )}

                    {/* Section Metrics - Table Format (NO COOKIE-CUTTER CARDS!) */}
                    {section.metrics && section.metrics.length > 0 && (
                      <div className="mb-3">
                        <table className="w-full text-xs">
                          <tbody className="divide-y divide-border">
                            {section.metrics.map((metric, idx) => (
                              <tr key={idx} className="group hover:bg-muted/30">
                                <td className="py-1 pr-3 text-muted-foreground font-medium w-1/3">
                                  {metric.label}
                                </td>
                                <td className="py-1 text-foreground font-bold text-sm">
                                  <div className="flex items-baseline gap-1.5">
                                    <span>{metric.value}</span>
                                    {metric.trend && (
                                      <span className={`text-[10px] font-medium ${
                                        metric.trend === 'up' ? 'text-green-600' :
                                        metric.trend === 'down' ? 'text-red-600' :
                                        'text-muted-foreground'
                                      }`}>
                                        {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-1 text-right text-[10px] text-muted-foreground">
                                  {metric.change !== undefined && (
                                    <span>{metric.change > 0 ? '+' : ''}{metric.change}% vs prior</span>
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

                    {/* Section Table */}
                    {section.tableData && (
                      <div className="mb-3 space-y-1">
                        <h4 className="text-xs font-semibold text-foreground">Detailed Data</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-muted border-b border-border">
                              <tr>
                                {section.tableData.headers.map((header, headerIdx) => (
                                  <th key={headerIdx} className="px-2 py-1.5 text-left font-semibold text-foreground text-[10px]">
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {section.tableData.rows.map((row, rowIdx) => (
                                <tr key={rowIdx} className="hover:bg-muted/50">
                                  {row.map((cell, cellIdx) => (
                                    <td key={cellIdx} className="px-2 py-1.5 text-muted-foreground">
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
                          <div key={insight.id || idx} className="flex items-start gap-1.5 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border-l-2 border-l-blue-500">
                            <CheckCircle className="w-3 h-3 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs font-medium text-foreground mb-0.5">{insight.title}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight">{insight.description}</p>
                              {insight.recommendedActions && insight.recommendedActions.length > 0 && (
                                <ul className="mt-1 space-y-0.5">
                                  {insight.recommendedActions.map((action, actionIdx) => (
                                    <li key={actionIdx} className="text-[10px] text-foreground">
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
                  <p className="text-[10px] text-muted-foreground">
                    Report ID: {report.id} | Generated: {report.generatedAt.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
