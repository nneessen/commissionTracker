// src/services/reports/reportExportService.ts

import { Report, ExportOptions } from '../../types/reports.types';
import { format } from 'date-fns';
import { downloadCSV, generatePrintableHTML, printAnalyticsToPDF } from '../../utils/exportHelpers';

/**
 * Report Export Service - Handles exporting reports to various formats
 */
export class ReportExportService {
  /**
   * Export report to specified format
   */
  static async exportReport(report: Report, options: ExportOptions): Promise<void> {
    switch (options.format) {
      case 'pdf':
        return this.exportToPDF(report, options);
      case 'csv':
        return this.exportToCSV(report, options);
      case 'excel':
        return this.exportToExcel(report, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export to PDF using browser's print dialog
   */
  private static exportToPDF(report: Report, options: ExportOptions): void {
    const sections = report.sections
      .filter(s => !options.includeSections || options.includeSections.includes(s.id))
      .map(section => {
        let content = '';

        // Add description
        if (section.description) {
          content += `<p style="color: #666; margin-bottom: 12pt;">${section.description}</p>`;
        }

        // Add metrics (compact 3-column grid)
        if (section.metrics && section.metrics.length > 0) {
          content += '<div class="metrics-grid">';
          section.metrics.forEach(metric => {
            content += `
              <div>
                <span class="metric-label">${metric.label}:</span>
                <span class="metric-value">${metric.value}</span>
              </div>
            `;
          });
          content += '</div>';
        }

        // Add table data
        if (section.tableData) {
          content += '<table>';
          content += '<thead><tr>';
          section.tableData.headers.forEach(header => {
            content += `<th>${header}</th>`;
          });
          content += '</tr></thead><tbody>';
          section.tableData.rows.forEach(row => {
            content += '<tr>';
            row.forEach(cell => {
              content += `<td>${cell}</td>`;
            });
            content += '</tr>';
          });
          content += '</tbody></table>';
        }

        // Add insights
        if (options.includeInsights !== false && section.insights && section.insights.length > 0) {
          content += '<div style="margin-top: 8pt;">';
          content += '<h3>Key Insights</h3>';
          section.insights.forEach(insight => {
            const severityColor = this.getSeverityColor(insight.severity);
            content += `
              <div class="insight" style="border-left-color: ${severityColor};">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-description">${insight.description}</div>
                <div class="insight-impact">Impact: ${insight.impact}</div>
                ${insight.recommendedActions && insight.recommendedActions.length > 0 ? `
                  <ul class="insight-actions">
                    ${insight.recommendedActions.map(action => `<li>→ ${action}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            `;
          });
          content += '</div>';
        }

        return {
          title: section.title,
          content,
        };
      });

    // Add summary if requested
    if (options.includeSummary !== false) {
      const summaryContent = `
        <div class="metrics-grid">
          ${report.summary.keyMetrics.map(m => `
            <div>
              <span class="metric-label">${m.label}:</span>
              <span class="metric-value">${m.value}</span>
            </div>
          `).join('')}
        </div>
      `;

      sections.unshift({
        title: 'Executive Summary',
        content: summaryContent,
      });
    }

    printAnalyticsToPDF(report.title, sections);
  }

  /**
   * Export to CSV
   */
  private static exportToCSV(report: Report, options: ExportOptions): void {
    const csvData: Record<string, any>[] = [];

    // Add summary metrics
    if (options.includeSummary !== false) {
      report.summary.keyMetrics.forEach(metric => {
        csvData.push({
          Section: 'Summary',
          Metric: metric.label,
          Value: metric.value,
          Trend: metric.trend || '',
        });
      });
    }

    // Add section data
    report.sections
      .filter(s => !options.includeSections || options.includeSections.includes(s.id))
      .forEach(section => {
        // Add metrics
        section.metrics?.forEach(metric => {
          csvData.push({
            Section: section.title,
            Metric: metric.label,
            Value: metric.value,
            Trend: metric.trend || '',
          });
        });

        // Add table data
        if (section.tableData) {
          section.tableData.rows.forEach(row => {
            const rowData: Record<string, any> = { Section: section.title };
            section.tableData!.headers.forEach((header, index) => {
              rowData[header] = row[index];
            });
            csvData.push(rowData);
          });
        }
      });

    downloadCSV(
      csvData,
      `${report.type}_${format(new Date(), 'yyyy-MM-dd')}`,
    );
  }

  /**
   * Export to Excel (using CSV for now, can be enhanced with xlsx library)
   */
  private static exportToExcel(report: Report, options: ExportOptions): void {
    // For now, use CSV export
    // Can be enhanced with a library like xlsx or exceljs
    this.exportToCSV(report, options);
  }

  /**
   * Get color for severity level
   */
  private static getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#DC2626';
      case 'high':
        return '#EA580C';
      case 'medium':
        return '#D97706';
      case 'low':
        return '#65A30D';
      default:
        return '#6B7280';
    }
  }
}
