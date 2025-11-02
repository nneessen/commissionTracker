// src/features/reports/components/ReportSection.tsx

import React from 'react';
import { ReportSection as ReportSectionType } from '../../../types/reports.types';
import { Card } from '../../../components/ui/card';
import { InsightCard } from './InsightCard';

interface ReportSectionProps {
  section: ReportSectionType;
  className?: string;
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

      {/* Chart Data (placeholder for future enhancement) */}
      {section.chartData && (
        <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
          <p className="text-sm text-muted-foreground text-center">
            Chart visualization coming soon
          </p>
        </div>
      )}
    </Card>
  );
}
