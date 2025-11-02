// src/features/reports/ReportsPage.tsx

import React, { useState } from 'react';
import { ReportType, ReportFilters } from '../../types/reports.types';
import { ReportSelector } from './components/ReportSelector';
import { ReportSection } from './components/ReportSection';
import { Button } from '../../components/ui/button';
import { TimePeriodSelector, AdvancedTimePeriod, getAdvancedDateRange } from '../analytics/components/TimePeriodSelector';
import { useReport } from '../../hooks/reports/useReport';
import { ReportExportService } from '../../services/reports/reportExportService';
import { Download, Loader2, FileText, Table, Printer } from 'lucide-react';
import { Card } from '../../components/ui/card';

export function ReportsPage() {
  const [selectedType, setSelectedType] = useState<ReportType>('executive-dashboard');
  const [timePeriod, setTimePeriod] = useState<AdvancedTimePeriod>('MTD');
  const [customRange, setCustomRange] = useState<{ startDate: Date; endDate: Date }>({
    startDate: new Date(),
    endDate: new Date(),
  });

  // Get date range from time period
  const dateRange = getAdvancedDateRange(timePeriod, customRange);

  // Build report filters
  const filters: ReportFilters = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
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

  const handleExportCSV = () => {
    if (!report) return;
    ReportExportService.exportReport(report, {
      format: 'csv',
      includeSummary: true,
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
    <>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">
          Generate comprehensive, actionable reports with insights and recommendations
        </p>
      </div>

      <div className="page-content">
        {/* Report Type Selector */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
            Select Report Type
          </h2>
          <ReportSelector
            selectedType={selectedType}
            onSelectType={setSelectedType}
          />
        </div>

        {/* Time Period and Export Controls */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-3">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
              Time Period
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleExportPDF}
                size="sm"
                variant="default"
                disabled={!report || isLoading}
                title="Export to PDF"
              >
                <Printer className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button
                onClick={handleExportCSV}
                size="sm"
                variant="outline"
                disabled={!report || isLoading}
                title="Export to CSV"
              >
                <Table className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button
                onClick={handleExportExcel}
                size="sm"
                variant="outline"
                disabled={!report || isLoading}
                title="Export to Excel"
              >
                <FileText className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>

          <TimePeriodSelector
            selectedPeriod={timePeriod}
            onPeriodChange={setTimePeriod}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Generating report...</p>
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

        {/* Report Content */}
        {!isLoading && !error && report && (
          <div className="space-y-6">
            {/* Report Header */}
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {report.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    {report.subtitle}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Generated on {report.generatedAt.toLocaleDateString()} at{' '}
                    {report.generatedAt.toLocaleTimeString()}
                  </p>
                </div>

                {/* Health Score */}
                <div className="flex flex-col items-center justify-center p-4 bg-card rounded-lg border border-border shadow-sm">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {report.summary.healthScore}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    Health Score
                  </div>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {report.summary.keyMetrics.map((metric, index) => (
                  <div key={index} className="p-3 bg-card rounded-lg border border-border">
                    <div className="text-xs text-muted-foreground mb-1">
                      {metric.label}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <div className="text-lg font-bold text-foreground">
                        {metric.value}
                      </div>
                      {metric.trend && (
                        <span className={`text-xs ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                          {metric.trend === 'up' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Insights */}
            {report.summary.topInsights.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                  Top Priority Insights
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {report.summary.topInsights.map(insight => (
                    <div
                      key={insight.id}
                      className="p-4 rounded-lg border-2 border-border bg-card"
                    >
                      <div className={`text-xs font-medium uppercase tracking-wide mb-2 ${
                        insight.severity === 'critical' ? 'text-red-600' :
                        insight.severity === 'high' ? 'text-orange-600' :
                        'text-yellow-600'
                      }`}>
                        {insight.severity}
                      </div>
                      <h4 className="font-semibold text-sm mb-2 text-foreground">
                        {insight.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {insight.description}
                      </p>
                      <div className="text-xs font-medium text-foreground">
                        Impact: {insight.impact}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Report Sections */}
            <div className="space-y-6">
              {report.sections.map(section => (
                <ReportSection key={section.id} section={section} />
              ))}
            </div>

            {/* Footer */}
            <Card className="p-4 text-center text-xs text-muted-foreground">
              <strong className="text-foreground">Note:</strong> All data is calculated in
              real-time from your database. Insights and recommendations are generated based on
              industry best practices and your historical performance.
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
