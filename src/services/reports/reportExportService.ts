// src/services/reports/reportExportService.ts

import { Report, ExportOptions } from "../../types/reports.types";
import { format } from "date-fns";
import { downloadCSV, printAnalyticsToPDF } from "../../utils/exportHelpers";

/**
 * Report Export Service - Handles exporting reports to various formats
 */
export class ReportExportService {
  /**
   * Export report to specified format
   */
  static async exportReport(
    report: Report,
    options: ExportOptions,
  ): Promise<void> {
    switch (options.format) {
      case "pdf":
        return this.exportToPDF(report, options);
      case "csv":
        return this.exportToCSV(report, options);
      case "excel":
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
      .filter(
        (s) =>
          !options.includeSections || options.includeSections.includes(s.id),
      )
      .map((section) => {
        let content = "";

        // Add description
        if (section.description) {
          content += `<p style="color: #666; margin-bottom: 12pt;">${section.description}</p>`;
        }

        // Add metrics (executive metric cards)
        if (section.metrics && section.metrics.length > 0) {
          content += '<div class="metrics-grid">';
          section.metrics.forEach((metric) => {
            const trendClass =
              metric.trend === "up"
                ? "up"
                : metric.trend === "down"
                  ? "down"
                  : "";
            const trendHTML = metric.change
              ? `<span class="metric-change ${trendClass}">${metric.change > 0 ? "+" : ""}${metric.change}%</span>`
              : "";
            content += `
              <div class="metric-card">
                <span class="metric-label">${metric.label}</span>
                <span class="metric-value">${metric.value}</span>
                ${trendHTML}
              </div>
            `;
          });
          content += "</div>";
        }

        // Add table data
        if (section.tableData) {
          content += "<table>";
          content += "<thead><tr>";
          section.tableData.headers.forEach((header) => {
            content += `<th>${header}</th>`;
          });
          content += "</tr></thead><tbody>";
          section.tableData.rows.forEach((row) => {
            content += "<tr>";
            row.forEach((cell) => {
              content += `<td>${cell}</td>`;
            });
            content += "</tr>";
          });
          content += "</tbody></table>";
        }

        // Add insights (professional executive format)
        if (
          options.includeInsights !== false &&
          section.insights &&
          section.insights.length > 0
        ) {
          content += '<div style="margin-top: 10pt;">';
          content += "<h3>Strategic Insights & Recommendations</h3>";
          section.insights.forEach((insight) => {
            const severityClass =
              insight.severity === "critical"
                ? "critical"
                : insight.severity === "high"
                  ? "high"
                  : "";
            content += `
              <div class="insight ${severityClass}">
                <div class="insight-header">
                  <div class="insight-title">${insight.title}</div>
                  <span class="insight-severity ${severityClass}">${insight.severity.toUpperCase()}</span>
                </div>
                <div class="insight-description">${insight.description}</div>
                <div class="insight-impact"><strong>Business Impact:</strong> ${insight.impact}</div>
                ${
                  insight.recommendedActions &&
                  insight.recommendedActions.length > 0
                    ? `
                  <strong style="font-size: 7.5pt; color: #2d3748; display: block; margin-top: 4pt;">Recommended Actions:</strong>
                  <ul class="insight-actions">
                    ${insight.recommendedActions.map((action) => `<li>${action}</li>`).join("")}
                  </ul>
                `
                    : ""
                }
              </div>
            `;
          });
          content += "</div>";
        }

        return {
          title: section.title,
          content,
        };
      });

    // Add summary if requested (executive metric cards)
    if (options.includeSummary !== false) {
      const summaryContent = `
        <div class="metrics-grid">
          ${report.summary.keyMetrics
            .map((m) => {
              const trendClass =
                m.trend === "up" ? "up" : m.trend === "down" ? "down" : "";
              const trendHTML = m.change
                ? `<span class="metric-change ${trendClass}">${m.change > 0 ? "+" : ""}${m.change}%</span>`
                : "";
              return `
              <div class="metric-card">
                <span class="metric-label">${m.label}</span>
                <span class="metric-value">${m.value}</span>
                ${trendHTML}
              </div>
            `;
            })
            .join("")}
        </div>
      `;

      sections.unshift({
        title: "Executive Summary",
        content: summaryContent,
      });
    }

    printAnalyticsToPDF(report.title, sections);
  }

  /**
   * Export to CSV
   */
  private static exportToCSV(report: Report, options: ExportOptions): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- export format specific
    const csvData: Record<string, any>[] = [];

    // Add summary metrics
    if (options.includeSummary !== false) {
      report.summary.keyMetrics.forEach((metric) => {
        csvData.push({
          Section: "Summary",
          Metric: metric.label,
          Value: metric.value,
          Trend: metric.trend || "",
        });
      });
    }

    // Add section data
    report.sections
      .filter(
        (s) =>
          !options.includeSections || options.includeSections.includes(s.id),
      )
      .forEach((section) => {
        // Add metrics
        section.metrics?.forEach((metric) => {
          csvData.push({
            Section: section.title,
            Metric: metric.label,
            Value: metric.value,
            Trend: metric.trend || "",
          });
        });

        // Add table data
        if (section.tableData) {
          section.tableData.rows.forEach((row) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- export format specific
            const rowData: Record<string, any> = { Section: section.title };
            section.tableData!.headers.forEach((header, index) => {
              rowData[header] = row[index];
            });
            csvData.push(rowData);
          });
        }
      });

    downloadCSV(csvData, `${report.type}_${format(new Date(), "yyyy-MM-dd")}`);
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
      case "critical":
        return "#DC2626";
      case "high":
        return "#EA580C";
      case "medium":
        return "#D97706";
      case "low":
        return "#65A30D";
      default:
        return "#6B7280";
    }
  }
}
