// src/services/reports/reportBundleService.ts

import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import {
  Report,
  ReportType,
  ReportBundleTemplate,
  BundleTemplateId,
  BundleExportOptions,
  BundleCoverPage,
} from '../../types/reports.types';

// ============================================================================
// BUNDLE TEMPLATES
// ============================================================================

export const BUNDLE_TEMPLATES: ReportBundleTemplate[] = [
  {
    id: 'weekly-check-in',
    name: 'Weekly Check-In',
    description: 'Quick overview: Executive summary + Commission status',
    reportTypes: ['executive-dashboard', 'commission-performance'],
    icon: '📅',
  },
  {
    id: 'monthly-comprehensive',
    name: 'Monthly Comprehensive',
    description: 'Full business review with all reports',
    reportTypes: [
      'executive-dashboard',
      'commission-performance',
      'policy-performance',
      'client-relationship',
      'financial-health',
      'predictive-analytics',
    ],
    icon: '📊',
  },
  {
    id: 'quarterly-strategic',
    name: 'Quarterly Strategic',
    description: 'Strategic planning: Executive + Financial + Predictions',
    reportTypes: ['executive-dashboard', 'financial-health', 'predictive-analytics'],
    icon: '📈',
  },
  {
    id: 'performance-review',
    name: 'Performance Review',
    description: 'Performance focus: Commissions + Policies + Clients',
    reportTypes: ['commission-performance', 'policy-performance', 'client-relationship'],
    icon: '🎯',
  },
];

// Report type display names
const REPORT_TYPE_NAMES: Record<ReportType, string> = {
  'executive-dashboard': 'Executive Dashboard',
  'commission-performance': 'Commission Performance',
  'policy-performance': 'Policy Performance',
  'client-relationship': 'Client Relationship',
  'financial-health': 'Financial Health',
  'predictive-analytics': 'Predictive Analytics',
};

// ============================================================================
// BUNDLE EXPORT SERVICE
// ============================================================================

export class ReportBundleService {
  /**
   * Export multiple reports as a bundle
   */
  static async exportBundle(
    reports: Report[],
    options: BundleExportOptions
  ): Promise<void> {
    if (reports.length === 0) {
      throw new Error('No reports to export');
    }

    switch (options.format) {
      case 'pdf':
        return this.exportToPDFBundle(reports, options);
      case 'excel':
        return this.exportToExcelBundle(reports, options);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  /**
   * Get bundle template by ID
   */
  static getTemplate(id: BundleTemplateId): ReportBundleTemplate | undefined {
    return BUNDLE_TEMPLATES.find(t => t.id === id);
  }

  /**
   * Get all bundle templates
   */
  static getAllTemplates(): ReportBundleTemplate[] {
    return BUNDLE_TEMPLATES;
  }

  // ============================================================================
  // PDF BUNDLE EXPORT
  // ============================================================================

  private static exportToPDFBundle(
    reports: Report[],
    options: BundleExportOptions
  ): void {
    const html = this.generateBundleHTML(reports, options);
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    } else {
      console.error('Failed to open print window');
    }
  }

  private static generateBundleHTML(
    reports: Report[],
    options: BundleExportOptions
  ): string {
    const { coverPage, filters, includeTableOfContents = true, includeInsights = true } = options;
    const dateRangeStr = `${format(filters.startDate, 'MMM d, yyyy')} - ${format(filters.endDate, 'MMM d, yyyy')}`;

    // Generate cover page HTML
    const coverPageHTML = this.generateCoverPageHTML(coverPage, dateRangeStr);

    // Generate table of contents HTML
    const tocHTML = includeTableOfContents ? this.generateTableOfContentsHTML(reports) : '';

    // Generate report sections HTML
    const reportsHTML = reports.map((report, index) =>
      this.generateReportSectionHTML(report, index, includeInsights)
    ).join('\n');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${coverPage?.title || 'Report Bundle'}</title>
  <style>
    ${this.getBundleStyles()}
  </style>
</head>
<body>
  ${coverPageHTML}
  ${tocHTML}
  ${reportsHTML}

  <div class="bundle-footer">
    <p>This report bundle contains confidential business information.</p>
    <p>Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
  </div>
</body>
</html>
    `;
  }

  private static generateCoverPageHTML(
    coverPage: BundleCoverPage | undefined,
    dateRange: string
  ): string {
    const title = coverPage?.title || 'Business Report Bundle';
    const subtitle = coverPage?.subtitle || dateRange;
    const businessName = coverPage?.businessName || '';
    const preparedFor = coverPage?.preparedFor || '';
    const confidential = coverPage?.confidential !== false;

    return `
      <div class="cover-page">
        <div class="cover-content">
          ${businessName ? `<div class="cover-business-name">${businessName}</div>` : ''}
          <h1 class="cover-title">${title}</h1>
          <div class="cover-subtitle">${subtitle}</div>
          ${preparedFor ? `<div class="cover-prepared-for">Prepared for: ${preparedFor}</div>` : ''}
          <div class="cover-date">${format(new Date(), 'MMMM d, yyyy')}</div>
          ${confidential ? '<div class="cover-confidential">CONFIDENTIAL</div>' : ''}
        </div>
        <div class="cover-footer">
          <div class="cover-divider"></div>
        </div>
      </div>
    `;
  }

  private static generateTableOfContentsHTML(reports: Report[]): string {
    const items = reports.map((report, index) => `
      <div class="toc-item">
        <span class="toc-number">${index + 1}</span>
        <span class="toc-title">${report.title}</span>
        <span class="toc-dots"></span>
        <span class="toc-page">${index + 3}</span>
      </div>
    `).join('');

    return `
      <div class="toc-page page-break">
        <h2 class="toc-header">Table of Contents</h2>
        <div class="toc-list">
          ${items}
        </div>
      </div>
    `;
  }

  private static generateReportSectionHTML(
    report: Report,
    index: number,
    includeInsights: boolean
  ): string {
    // Generate executive summary metrics
    const metricsHTML = report.summary.keyMetrics.map(m => `
      <div class="metric-card">
        <span class="metric-label">${m.label}</span>
        <span class="metric-value">${m.value}</span>
        ${m.change ? `<span class="metric-change ${m.trend === 'up' ? 'up' : 'down'}">${m.change > 0 ? '+' : ''}${m.change}%</span>` : ''}
      </div>
    `).join('');

    // Generate sections HTML
    const sectionsHTML = report.sections.map(section => {
      let content = '';

      // Section metrics as table
      if (section.metrics && section.metrics.length > 0) {
        content += `
          <table class="metrics-table">
            <tbody>
              ${section.metrics.map(m => `
                <tr>
                  <td class="metric-name">${m.label}</td>
                  <td class="metric-val">${m.value}</td>
                  <td class="metric-chg">${m.change !== undefined ? `${m.change > 0 ? '+' : ''}${m.change}%` : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }

      // Section table data
      if (section.tableData) {
        content += `
          <table class="data-table">
            <thead>
              <tr>
                ${section.tableData.headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${section.tableData.rows.map(row => `
                <tr>
                  ${row.map(cell => `<td>${cell}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }

      // Section insights
      if (includeInsights && section.insights && section.insights.length > 0) {
        content += `
          <div class="insights-container">
            <h4 class="insights-header">Key Findings</h4>
            ${section.insights.map(insight => `
              <div class="insight ${insight.severity}">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-desc">${insight.description}</div>
                ${insight.recommendedActions?.length ? `
                  <ul class="insight-actions">
                    ${insight.recommendedActions.map(a => `<li>${a}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `;
      }

      return `
        <div class="report-subsection">
          <h3 class="subsection-title">${section.title}</h3>
          ${section.description ? `<p class="subsection-desc">${section.description}</p>` : ''}
          ${content}
        </div>
      `;
    }).join('');

    return `
      <div class="report-section page-break">
        <div class="section-header">
          <h2 class="section-title">${report.title}</h2>
          <div class="section-subtitle">${report.subtitle}</div>
        </div>

        <div class="executive-metrics">
          <h3 class="metrics-header">Executive Summary</h3>
          <div class="metrics-grid">
            ${metricsHTML}
          </div>
        </div>

        ${includeInsights && report.summary.topInsights.length > 0 ? `
          <div class="top-insights">
            <h3 class="insights-header">Priority Actions</h3>
            ${report.summary.topInsights.slice(0, 3).map(insight => `
              <div class="insight ${insight.severity}">
                <span class="insight-severity">${insight.severity.toUpperCase()}</span>
                <div class="insight-title">${insight.title}</div>
                <div class="insight-impact">Impact: ${insight.impact}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${sectionsHTML}
      </div>
    `;
  }

  private static getBundleStyles(): string {
    return `
      @media print {
        @page {
          margin: 0.6in 0.7in;
          size: letter;
        }

        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }

      body {
        font-family: 'Georgia', 'Times New Roman', serif;
        font-size: 10pt;
        color: #1a1a1a;
        line-height: 1.4;
        margin: 0;
        padding: 0;
      }

      .page-break {
        page-break-before: always;
      }

      /* COVER PAGE */
      .cover-page {
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
        color: white;
        page-break-after: always;
      }

      .cover-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 40pt;
      }

      .cover-business-name {
        font-size: 14pt;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        margin-bottom: 30pt;
        opacity: 0.8;
      }

      .cover-title {
        font-size: 36pt;
        font-weight: 400;
        margin: 0 0 20pt 0;
        letter-spacing: 0.02em;
      }

      .cover-subtitle {
        font-size: 16pt;
        font-style: italic;
        margin-bottom: 30pt;
        opacity: 0.9;
      }

      .cover-prepared-for {
        font-size: 12pt;
        margin-bottom: 10pt;
      }

      .cover-date {
        font-size: 12pt;
        margin-top: 30pt;
      }

      .cover-confidential {
        margin-top: 40pt;
        font-size: 10pt;
        letter-spacing: 0.3em;
        padding: 8pt 20pt;
        border: 1pt solid rgba(255,255,255,0.5);
        display: inline-block;
      }

      .cover-footer {
        padding: 20pt;
      }

      .cover-divider {
        width: 100pt;
        height: 2pt;
        background: #c9a961;
        margin: 0 auto;
      }

      /* TABLE OF CONTENTS */
      .toc-page {
        padding: 40pt;
      }

      .toc-header {
        font-size: 24pt;
        color: #1e3a5f;
        margin-bottom: 30pt;
        padding-bottom: 10pt;
        border-bottom: 2pt solid #1e3a5f;
      }

      .toc-list {
        margin-top: 20pt;
      }

      .toc-item {
        display: flex;
        align-items: baseline;
        margin-bottom: 12pt;
        font-size: 12pt;
      }

      .toc-number {
        width: 30pt;
        font-weight: 600;
        color: #1e3a5f;
      }

      .toc-title {
        flex-shrink: 0;
      }

      .toc-dots {
        flex: 1;
        border-bottom: 1pt dotted #ccc;
        margin: 0 10pt;
        height: 1em;
      }

      .toc-page {
        color: #1e3a5f;
        font-weight: 600;
      }

      /* REPORT SECTIONS */
      .report-section {
        padding: 20pt 0;
      }

      .section-header {
        border-top: 3pt solid #1e3a5f;
        border-bottom: 1pt solid #1e3a5f;
        padding: 15pt 0;
        margin-bottom: 20pt;
      }

      .section-title {
        font-size: 20pt;
        color: #1e3a5f;
        margin: 0 0 5pt 0;
        font-weight: 500;
      }

      .section-subtitle {
        font-size: 11pt;
        color: #666;
        font-style: italic;
      }

      /* METRICS GRID */
      .executive-metrics {
        margin-bottom: 25pt;
      }

      .metrics-header {
        font-size: 12pt;
        font-weight: 600;
        color: #1e3a5f;
        margin-bottom: 10pt;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-family: Arial, sans-serif;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10pt;
        padding: 12pt;
        background: #f8f9fa;
        border-left: 3pt solid #1e3a5f;
      }

      .metric-card {
        background: white;
        padding: 8pt;
        border: 0.5pt solid #e2e8f0;
      }

      .metric-label {
        display: block;
        font-family: Arial, sans-serif;
        font-size: 7pt;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 4pt;
      }

      .metric-value {
        display: block;
        font-family: 'Courier New', monospace;
        font-size: 14pt;
        font-weight: 700;
        color: #1e3a5f;
      }

      .metric-change {
        display: block;
        font-size: 8pt;
        margin-top: 3pt;
        font-weight: 600;
      }

      .metric-change.up { color: #065f46; }
      .metric-change.down { color: #991b1b; }

      /* SUBSECTIONS */
      .report-subsection {
        margin-bottom: 20pt;
        page-break-inside: avoid;
      }

      .subsection-title {
        font-size: 13pt;
        color: #1e3a5f;
        margin: 0 0 8pt 0;
        padding-bottom: 4pt;
        border-bottom: 1pt solid #ccc;
      }

      .subsection-desc {
        font-size: 9pt;
        color: #666;
        margin-bottom: 10pt;
      }

      /* TABLES */
      .metrics-table, .data-table {
        width: 100%;
        border-collapse: collapse;
        margin: 10pt 0;
        font-family: Arial, sans-serif;
        font-size: 9pt;
      }

      .metrics-table td {
        padding: 4pt 6pt;
        border-bottom: 0.5pt solid #e2e8f0;
      }

      .metric-name { color: #666; width: 50%; }
      .metric-val { font-weight: 600; }
      .metric-chg { text-align: right; font-size: 8pt; color: #666; }

      .data-table th {
        background: #f1f5f9;
        padding: 6pt;
        text-align: left;
        font-weight: 600;
        font-size: 8pt;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        border-bottom: 1pt solid #1e3a5f;
      }

      .data-table td {
        padding: 5pt 6pt;
        border-bottom: 0.5pt solid #e2e8f0;
      }

      /* INSIGHTS */
      .insights-container {
        margin-top: 15pt;
      }

      .insights-header {
        font-size: 10pt;
        font-weight: 600;
        color: #1e3a5f;
        margin-bottom: 8pt;
        font-family: Arial, sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .top-insights {
        margin-bottom: 20pt;
        padding: 12pt;
        background: #fffbf0;
        border-left: 3pt solid #c9a961;
      }

      .insight {
        padding: 8pt 10pt;
        margin-bottom: 8pt;
        border-left: 3pt solid #ccc;
        background: #f8f9fa;
      }

      .insight.critical { border-left-color: #991b1b; background: #fef2f2; }
      .insight.high { border-left-color: #d97706; background: #fffbeb; }
      .insight.medium { border-left-color: #2563eb; background: #eff6ff; }

      .insight-severity {
        display: inline-block;
        font-size: 7pt;
        font-weight: 700;
        padding: 2pt 6pt;
        background: #1e3a5f;
        color: white;
        margin-bottom: 4pt;
        letter-spacing: 0.05em;
      }

      .insight.critical .insight-severity { background: #991b1b; }
      .insight.high .insight-severity { background: #d97706; }

      .insight-title {
        font-weight: 600;
        font-size: 10pt;
        color: #1a202c;
        margin-bottom: 3pt;
      }

      .insight-desc {
        font-size: 9pt;
        color: #4a5568;
        margin-bottom: 4pt;
      }

      .insight-impact {
        font-size: 8pt;
        color: #666;
        font-weight: 500;
      }

      .insight-actions {
        margin: 6pt 0 0 15pt;
        padding: 0;
        font-size: 8pt;
        color: #2d3748;
      }

      .insight-actions li {
        margin: 3pt 0;
      }

      /* FOOTER */
      .bundle-footer {
        margin-top: 30pt;
        padding-top: 15pt;
        border-top: 1pt solid #ccc;
        text-align: center;
        font-size: 8pt;
        color: #666;
        font-family: Arial, sans-serif;
      }
    `;
  }

  // ============================================================================
  // EXCEL BUNDLE EXPORT
  // ============================================================================

  private static async exportToExcelBundle(
    reports: Report[],
    options: BundleExportOptions
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Commission Tracker';
    workbook.created = new Date();

    // Add summary sheet
    this.addSummarySheet(workbook, reports, options);

    // Add each report as a worksheet
    reports.forEach((report, index) => {
      this.addReportSheet(workbook, report, index);
    });

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Report_Bundle_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private static addSummarySheet(
    workbook: ExcelJS.Workbook,
    reports: Report[],
    options: BundleExportOptions
  ): void {
    const sheet = workbook.addWorksheet('Summary', {
      properties: { tabColor: { argb: '1E3A5F' } },
    });

    // Title
    sheet.mergeCells('A1:E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = options.coverPage?.title || 'Report Bundle Summary';
    titleCell.font = { bold: true, size: 18, color: { argb: '1E3A5F' } };
    titleCell.alignment = { horizontal: 'center' };

    // Date range
    sheet.mergeCells('A2:E2');
    const dateCell = sheet.getCell('A2');
    dateCell.value = `${format(options.filters.startDate, 'MMM d, yyyy')} - ${format(options.filters.endDate, 'MMM d, yyyy')}`;
    dateCell.font = { italic: true, size: 11 };
    dateCell.alignment = { horizontal: 'center' };

    // Reports included
    let row = 4;
    sheet.getCell(`A${row}`).value = 'Reports Included:';
    sheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;

    reports.forEach((report, index) => {
      sheet.getCell(`A${row}`).value = `${index + 1}. ${report.title}`;
      sheet.getCell(`B${row}`).value = `(See "${this.getSheetName(report.type)}" tab)`;
      sheet.getCell(`B${row}`).font = { italic: true, color: { argb: '666666' } };
      row++;
    });

    // Key metrics from all reports
    row += 2;
    sheet.getCell(`A${row}`).value = 'Key Metrics Across All Reports';
    sheet.getCell(`A${row}`).font = { bold: true, size: 14, color: { argb: '1E3A5F' } };
    row++;

    // Headers
    sheet.getRow(row).values = ['Report', 'Metric', 'Value', 'Change', 'Trend'];
    sheet.getRow(row).font = { bold: true };
    sheet.getRow(row).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F1F5F9' },
    };
    row++;

    // Metrics from each report
    reports.forEach(report => {
      report.summary.keyMetrics.forEach(metric => {
        sheet.getRow(row).values = [
          report.title,
          metric.label,
          metric.value,
          metric.change ? `${metric.change > 0 ? '+' : ''}${metric.change}%` : '',
          metric.trend || '',
        ];
        row++;
      });
    });

    // Column widths
    sheet.getColumn('A').width = 25;
    sheet.getColumn('B').width = 25;
    sheet.getColumn('C').width = 15;
    sheet.getColumn('D').width = 10;
    sheet.getColumn('E').width = 10;
  }

  private static addReportSheet(
    workbook: ExcelJS.Workbook,
    report: Report,
    index: number
  ): void {
    const sheetName = this.getSheetName(report.type);
    const sheet = workbook.addWorksheet(sheetName);

    let row = 1;

    // Title
    sheet.mergeCells(`A${row}:F${row}`);
    const titleCell = sheet.getCell(`A${row}`);
    titleCell.value = report.title;
    titleCell.font = { bold: true, size: 16, color: { argb: '1E3A5F' } };
    row += 2;

    // Executive Summary Metrics
    sheet.getCell(`A${row}`).value = 'Executive Summary';
    sheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;

    // Metric headers
    sheet.getRow(row).values = ['Metric', 'Value', 'Change', 'Trend'];
    sheet.getRow(row).font = { bold: true };
    sheet.getRow(row).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'F1F5F9' },
    };
    row++;

    report.summary.keyMetrics.forEach(metric => {
      sheet.getRow(row).values = [
        metric.label,
        metric.value,
        metric.change ? `${metric.change > 0 ? '+' : ''}${metric.change}%` : '',
        metric.trend || '',
      ];
      row++;
    });

    row += 2;

    // Sections with table data
    report.sections.forEach(section => {
      if (section.tableData) {
        sheet.getCell(`A${row}`).value = section.title;
        sheet.getCell(`A${row}`).font = { bold: true, size: 12 };
        row++;

        // Headers
        sheet.getRow(row).values = section.tableData.headers;
        sheet.getRow(row).font = { bold: true };
        sheet.getRow(row).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F1F5F9' },
        };
        row++;

        // Data rows
        section.tableData.rows.forEach(dataRow => {
          sheet.getRow(row).values = dataRow;
          row++;
        });

        row += 2;
      }

      // Section metrics
      if (section.metrics && section.metrics.length > 0) {
        sheet.getCell(`A${row}`).value = `${section.title} - Metrics`;
        sheet.getCell(`A${row}`).font = { bold: true, size: 11 };
        row++;

        section.metrics.forEach(metric => {
          sheet.getRow(row).values = [metric.label, metric.value];
          row++;
        });

        row += 2;
      }
    });

    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 20;
    });
  }

  private static getSheetName(type: ReportType): string {
    const names: Record<ReportType, string> = {
      'executive-dashboard': 'Executive',
      'commission-performance': 'Commissions',
      'policy-performance': 'Policies',
      'client-relationship': 'Clients',
      'financial-health': 'Financial',
      'predictive-analytics': 'Predictions',
    };
    return names[type] || type;
  }
}
