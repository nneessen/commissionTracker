// src/features/reports/components/ReportSection.tsx

import React from 'react';
import { ReportSection as ReportSectionType } from '../../../types/reports.types';
import { Card } from '../../../components/ui/card';
import { InsightCard } from './InsightCard';
import {
  TrendLineChart,
  BarComparisonChart,
  PieBreakdownChart,
  AreaStackedChart,
} from './charts';

interface ReportSectionProps {
  section: ReportSectionType;
  className?: string;
}

/**
 * Determine chart type and render appropriate component
 */
function renderChart(chartData: any, sectionId: string) {
  if (!chartData || !chartData.datasets || chartData.datasets.length === 0) {
    return null;
  }

  // Prepare data for Recharts format
  const data = chartData.labels.map((label: string, index: number) => {
    const dataPoint: any = { label };
    chartData.datasets.forEach((dataset: any) => {
      dataPoint[dataset.label] = dataset.data[index];
    });
    return dataPoint;
  });

  // Determine chart type based on section ID or data characteristics
  const chartType = determineChartType(sectionId, chartData);

  switch (chartType) {
    case 'pie':
      // For pie charts, convert to name/value format
      const pieData = chartData.labels.map((label: string, index: number) => ({
        name: label,
        value: chartData.datasets[0].data[index],
        color: chartData.datasets[0].color?.[index],
      }));
      return (
        <PieBreakdownChart
          data={pieData}
          height={350}
          showLegend
          format={getFormatFromSectionId(sectionId)}
        />
      );

    case 'bar':
      const bars = chartData.datasets.map((dataset: any) => ({
        dataKey: dataset.label,
        name: dataset.label,
        color: dataset.color || '#3b82f6',
        format: getFormatFromSectionId(sectionId),
      }));
      return (
        <BarComparisonChart
          data={data}
          bars={bars}
          height={350}
          showGrid
          showLegend={chartData.datasets.length > 1}
        />
      );

    case 'area':
      const areas = chartData.datasets.map((dataset: any) => ({
        dataKey: dataset.label,
        name: dataset.label,
        color: dataset.color || '#3b82f6',
        format: getFormatFromSectionId(sectionId),
      }));
      return (
        <AreaStackedChart
          data={data}
          areas={areas}
          height={350}
          showGrid
          showLegend
        />
      );

    case 'line':
    default:
      const lines = chartData.datasets.map((dataset: any) => ({
        dataKey: dataset.label,
        name: dataset.label,
        color: dataset.color || '#3b82f6',
        format: getFormatFromSectionId(sectionId),
      }));
      return (
        <TrendLineChart
          data={data}
          lines={lines}
          height={350}
          showGrid
          showLegend={chartData.datasets.length > 1}
        />
      );
  }
}

/**
 * Determine appropriate chart type based on section ID
 */
function determineChartType(sectionId: string, chartData: any): 'line' | 'bar' | 'pie' | 'area' {
  // Pie chart for breakdowns/distributions
  if (sectionId.includes('breakdown') || sectionId.includes('distribution')) {
    return 'pie';
  }

  // Area chart for cumulative/stacked metrics
  if (sectionId.includes('cumulative') || sectionId.includes('stacked')) {
    return 'area';
  }

  // Bar chart for comparisons
  if (sectionId.includes('comparison') || sectionId.includes('carrier-performance')) {
    return 'bar';
  }

  // Line chart for trends (default)
  return 'line';
}

/**
 * Get data format based on section ID
 */
function getFormatFromSectionId(sectionId: string): 'currency' | 'number' | 'percent' {
  if (sectionId.includes('income') || sectionId.includes('revenue') || sectionId.includes('commission') || sectionId.includes('expense')) {
    return 'currency';
  }
  if (sectionId.includes('rate') || sectionId.includes('percent') || sectionId.includes('ratio')) {
    return 'percent';
  }
  return 'number';
}

export function ReportSection({ section, className = '' }: ReportSectionProps) {
  return (
    <Card className={`p-6 ${className}`}>
      {/* Section Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground mb-1">
          {section.title}
        </h2>
        {section.description && (
          <p className="text-sm text-muted-foreground">
            {section.description}
          </p>
        )}
      </div>

      {/* Metrics Grid */}
      {section.metrics && section.metrics.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {section.metrics.map((metric, index) => (
            <div
              key={index}
              className="p-4 bg-card rounded-lg border border-border"
            >
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {metric.label}
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-foreground">
                  {metric.value}
                </div>
                {metric.trend && (
                  <span
                    className={`text-xs font-medium ${
                      metric.trend === 'up'
                        ? 'text-green-600 dark:text-green-400'
                        : metric.trend === 'down'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
                  </span>
                )}
              </div>
              {metric.change !== undefined && (
                <div className={`text-xs mt-1 ${metric.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Table Data */}
      {section.tableData && (
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {section.tableData.headers.map((header, index) => (
                  <th
                    key={index}
                    className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.tableData.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="py-3 px-4 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Insights */}
      {section.insights && section.insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Insights
          </h3>
          {section.insights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      {/* Chart Visualization */}
      {section.chartData && (
        <div className="mt-6">
          {renderChart(section.chartData, section.id)}
        </div>
      )}
    </Card>
  );
}
