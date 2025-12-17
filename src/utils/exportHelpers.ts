// src/utils/exportHelpers.ts

import { format } from "date-fns";

/**
 * Convert data to CSV format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- export format varies
export function convertToCSV(
  data: Record<string, any>[],
  headers?: string[],
): string {
  if (data.length === 0) return "";

  // Use provided headers or extract from first object
  const keys = headers || Object.keys(data[0]);

  // Create header row
  const headerRow = keys.join(",");

  // Create data rows
  const dataRows = data.map((row) => {
    return keys
      .map((key) => {
        const value = row[key];

        // Handle different value types
        if (value === null || value === undefined) return "";
        if (typeof value === "string" && value.includes(",")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        if (value instanceof Date) {
          return format(value, "yyyy-MM-dd");
        }

        return value.toString();
      })
      .join(",");
  });

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Download CSV file
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- export format varies
export function downloadCSV(
  data: Record<string, any>[],
  filename: string,
  headers?: string[],
): void {
  const csv = convertToCSV(data, headers);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Copy data to clipboard as CSV
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- export format varies
export async function copyToClipboardAsCSV(
  data: Record<string, any>[],
  headers?: string[],
): Promise<boolean> {
  try {
    const csv = convertToCSV(data, headers);
    await navigator.clipboard.writeText(csv);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}

/**
 * Export analytics section data
 */
export interface AnalyticsSectionExport {
  sectionName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- export format varies
  data: Record<string, any>[];
  headers?: string[];
}

/**
 * Download multiple analytics sections as separate CSV files
 */
export function downloadAnalyticsSections(
  sections: AnalyticsSectionExport[],
): void {
  sections.forEach((section) => {
    downloadCSV(section.data, section.sectionName, section.headers);
  });
}

/**
 * Generate PDF-friendly HTML for printing
 *
 * PROFESSIONAL BUSINESS DESIGN INSPIRED BY:
 * - Goldman Sachs financial reports
 * - McKinsey executive summaries
 * - Bloomberg terminal analytics
 * - Deloitte audit reports
 *
 * DESIGN PRINCIPLES:
 * - Executive-level typography (Garamond, Georgia serif family)
 * - Sophisticated color palette (navy, charcoal, gold accents)
 * - Financial report structure (header block, sections with rules)
 * - Data-dense tables with proper accounting alignment
 * - Professional visual hierarchy with strategic whitespace
 * - Clean, authoritative presentation suitable for C-suite
 */
export function generatePrintableHTML(
  title: string,
  sections: { title: string; content: string }[],
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @media print {
      @page {
        margin: 0.65in 0.75in;
        size: letter;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body {
        font-family: 'Garamond', 'Georgia', 'Times New Roman', serif;
        font-size: 9.5pt;
        color: #1a1a1a;
        line-height: 1.35;
        background: white;
      }

      /* EXECUTIVE HEADER */
      .report-header {
        border-top: 4pt solid #1e3a5f;
        border-bottom: 1.5pt solid #1e3a5f;
        padding: 12pt 0 10pt 0;
        margin-bottom: 14pt;
        position: relative;
      }

      .report-header::after {
        content: '';
        position: absolute;
        bottom: -3pt;
        left: 0;
        width: 120pt;
        height: 0.75pt;
        background: #c9a961;
      }

      h1 {
        font-family: 'Garamond', 'Georgia', serif;
        font-size: 20pt;
        font-weight: 500;
        letter-spacing: 0.02em;
        color: #1e3a5f;
        margin: 0 0 6pt 0;
        text-transform: uppercase;
      }

      .report-subtitle {
        font-size: 9pt;
        color: #4a5568;
        font-weight: 400;
        font-style: italic;
        margin: 4pt 0 0 0;
        letter-spacing: 0.01em;
      }

      .report-metadata {
        display: flex;
        justify-content: space-between;
        font-size: 8pt;
        color: #6b7280;
        margin: 8pt 0 0 0;
        font-family: 'Arial', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .report-metadata .confidential {
        color: #991b1b;
        font-weight: 600;
      }

      /* SECTION HEADERS */
      h2 {
        font-family: 'Garamond', 'Georgia', serif;
        font-size: 13pt;
        font-weight: 600;
        color: #1e3a5f;
        margin: 16pt 0 8pt 0;
        padding-bottom: 4pt;
        border-bottom: 1.25pt solid #2d3748;
        letter-spacing: 0.015em;
        page-break-after: avoid;
        position: relative;
      }

      h2::after {
        content: '';
        position: absolute;
        bottom: -2.5pt;
        left: 0;
        width: 50pt;
        height: 1pt;
        background: #c9a961;
      }

      h3 {
        font-size: 10pt;
        font-weight: 600;
        color: #2d3748;
        margin: 10pt 0 5pt 0;
        letter-spacing: 0.01em;
        text-transform: uppercase;
        font-family: 'Arial', sans-serif;
        font-size: 8.5pt;
      }

      /* FINANCIAL TABLES */
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 8pt 0 12pt 0;
        page-break-inside: avoid;
        font-family: 'Arial', sans-serif;
        font-size: 8.5pt;
      }

      thead {
        border-top: 1.5pt solid #1e3a5f;
        border-bottom: 1pt solid #2d3748;
      }

      th {
        background: #f8f9fa;
        font-weight: 600;
        font-size: 7.5pt;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #1e3a5f;
        padding: 5pt 6pt;
        text-align: left;
        border-bottom: 0.75pt solid #cbd5e0;
      }

      th:last-child,
      td:last-child {
        text-align: right;
      }

      td {
        padding: 4pt 6pt;
        border-bottom: 0.5pt solid #e2e8f0;
        color: #1a202c;
        font-size: 8.5pt;
      }

      tbody tr:hover {
        background-color: #f7fafc;
      }

      tbody tr:last-child td {
        border-bottom: 1.5pt solid #2d3748;
        font-weight: 600;
      }

      /* NUMERIC FORMATTING */
      .numeric {
        font-family: 'Courier New', 'Consolas', monospace;
        font-weight: 500;
        text-align: right;
        letter-spacing: -0.01em;
      }

      .currency::before {
        content: '$';
        margin-right: 1pt;
      }

      .positive {
        color: #065f46;
      }

      .negative {
        color: #991b1b;
      }

      /* EXECUTIVE METRICS GRID */
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8pt 12pt;
        margin: 10pt 0 14pt 0;
        padding: 10pt;
        background: #fafbfc;
        border: 0.75pt solid #cbd5e0;
        border-left: 3pt solid #1e3a5f;
      }

      .metric-card {
        padding: 6pt 8pt;
        background: white;
        border: 0.5pt solid #e2e8f0;
      }

      .metric-label {
        font-family: 'Arial', sans-serif;
        font-size: 7pt;
        color: #4a5568;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-weight: 600;
        margin-bottom: 3pt;
        display: block;
      }

      .metric-value {
        font-family: 'Courier New', monospace;
        font-size: 12pt;
        font-weight: 700;
        color: #1e3a5f;
        display: block;
        margin: 2pt 0;
        letter-spacing: -0.02em;
      }

      .metric-change {
        font-family: 'Arial', sans-serif;
        font-size: 6.5pt;
        font-weight: 600;
        margin-top: 2pt;
        display: block;
      }

      .metric-change.up {
        color: #065f46;
      }

      .metric-change.up::before {
        content: '▲ ';
      }

      .metric-change.down {
        color: #991b1b;
      }

      .metric-change.down::before {
        content: '▼ ';
      }

      /* EXECUTIVE INSIGHTS */
      .insight {
        border-left: 3pt solid #c9a961;
        background: linear-gradient(to right, #fffbf0 0%, #ffffff 15%);
        padding: 8pt 10pt 8pt 12pt;
        margin: 8pt 0;
        page-break-inside: avoid;
        border-top: 0.5pt solid #e6dcc8;
        border-bottom: 0.5pt solid #e6dcc8;
      }

      .insight.critical {
        border-left-color: #991b1b;
        background: linear-gradient(to right, #fef2f2 0%, #ffffff 15%);
        border-top-color: #fecaca;
        border-bottom-color: #fecaca;
      }

      .insight.high {
        border-left-color: #d97706;
        background: linear-gradient(to right, #fffbeb 0%, #ffffff 15%);
        border-top-color: #fed7aa;
        border-bottom-color: #fed7aa;
      }

      .insight-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 4pt;
      }

      .insight-severity {
        font-family: 'Arial', sans-serif;
        font-size: 6.5pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 2pt 6pt;
        border-radius: 2pt;
        background: #1e3a5f;
        color: white;
      }

      .insight-severity.critical {
        background: #991b1b;
      }

      .insight-severity.high {
        background: #d97706;
      }

      .insight-title {
        font-weight: 600;
        font-size: 9pt;
        color: #1a202c;
        margin-bottom: 3pt;
        flex: 1;
      }

      .insight-description {
        font-size: 8pt;
        color: #2d3748;
        margin: 3pt 0;
        line-height: 1.4;
      }

      .insight-impact {
        font-size: 7.5pt;
        color: #4a5568;
        font-weight: 600;
        margin: 4pt 0;
        padding: 3pt 6pt;
        background: rgba(30, 58, 95, 0.04);
        border-left: 2pt solid #cbd5e0;
        font-family: 'Arial', sans-serif;
      }

      .insight-actions {
        margin: 5pt 0 0 0;
        padding: 0 0 0 14pt;
        font-size: 7.5pt;
        color: #2d3748;
        line-height: 1.5;
      }

      .insight-actions li {
        margin: 2pt 0;
        font-weight: 500;
      }

      .insight-actions li::marker {
        color: #c9a961;
        font-weight: 700;
      }

      /* FOOTER */
      .report-footer {
        margin-top: 16pt;
        padding-top: 8pt;
        border-top: 1pt solid #cbd5e0;
        font-size: 6.5pt;
        color: #718096;
        text-align: center;
        font-family: 'Arial', sans-serif;
        letter-spacing: 0.04em;
      }

      .report-footer .disclaimer {
        margin-top: 4pt;
        font-style: italic;
      }

      /* PAGE BREAKS */
      .page-break {
        page-break-before: always;
      }

      .no-break {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <h1>${title}</h1>
    <div class="report-subtitle">Performance Analytics & Strategic Insights</div>
    <div class="report-metadata">
      <span>Report Date: ${format(new Date(), "MMMM d, yyyy")}</span>
      <span>Generated: ${format(new Date(), "h:mm a")}</span>
      <span class="confidential">Confidential</span>
    </div>
  </div>

  ${sections
    .map(
      (section, _index) => `
    <div class="no-break">
      <h2>${section.title}</h2>
      ${section.content}
    </div>
  `,
    )
    .join("\n")}

  <div class="report-footer">
    <div>This report contains confidential business information. Distribution is restricted to authorized personnel only.</div>
    <div class="disclaimer">All figures are system-generated and subject to verification. Past performance does not guarantee future results.</div>
  </div>
</body>
</html>
  `;
}

/**
 * Print analytics to PDF (using browser's print dialog)
 */
export function printAnalyticsToPDF(
  title: string,
  sections: { title: string; content: string }[],
): void {
  const html = generatePrintableHTML(title, sections);
  const printWindow = window.open("", "_blank");

  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  } else {
    console.error(
      "Failed to open print window. Please check popup blocker settings.",
    );
  }
}

/**
 * Format analytics metrics for export
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- export format varies
export function formatMetricsForExport(
  metrics: Record<string, any>,
): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- export format varies
  const formatted: Record<string, any> = {};

  for (const [key, value] of Object.entries(metrics)) {
    if (value instanceof Date) {
      formatted[key] = format(value, "yyyy-MM-dd");
    } else if (typeof value === "number") {
      // Format numbers with 2 decimal places
      formatted[key] = Math.round(value * 100) / 100;
    } else if (typeof value === "object" && value !== null) {
      // Skip nested objects for flat CSV export
      formatted[key] = JSON.stringify(value);
    } else {
      formatted[key] = value;
    }
  }

  return formatted;
}
