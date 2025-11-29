// src/utils/exportHelpers.ts

import { format } from 'date-fns';

/**
 * Convert data to CSV format
 */
export function convertToCSV(data: Record<string, any>[], headers?: string[]): string {
  if (data.length === 0) return '';

  // Use provided headers or extract from first object
  const keys = headers || Object.keys(data[0]);

  // Create header row
  const headerRow = keys.join(',');

  // Create data rows
  const dataRows = data.map(row => {
    return keys.map(key => {
      const value = row[key];

      // Handle different value types
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      if (value instanceof Date) {
        return format(value, 'yyyy-MM-dd');
      }

      return value.toString();
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(data: Record<string, any>[], filename: string, headers?: string[]): void {
  const csv = convertToCSV(data, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Copy data to clipboard as CSV
 */
export async function copyToClipboardAsCSV(data: Record<string, any>[], headers?: string[]): Promise<boolean> {
  try {
    const csv = convertToCSV(data, headers);
    await navigator.clipboard.writeText(csv);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Export analytics section data
 */
export interface AnalyticsSectionExport {
  sectionName: string;
  data: Record<string, any>[];
  headers?: string[];
}

/**
 * Download multiple analytics sections as separate CSV files
 */
export function downloadAnalyticsSections(sections: AnalyticsSectionExport[]): void {
  sections.forEach(section => {
    downloadCSV(section.data, section.sectionName, section.headers);
  });
}

/**
 * Generate PDF-friendly HTML for printing
 * (Browser's native print-to-PDF will be used)
 *
 * DESIGN GOALS:
 * - Ultra-compact: fit maximum content on one page
 * - Modern: professional gradient backgrounds, proper visual hierarchy
 * - Data-dense: no wasted space, efficient layout
 */
export function generatePrintableHTML(
  title: string,
  sections: { title: string; content: string }[]
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
        margin: 0.4in 0.5in;
        size: letter;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 8.5pt;
        color: #1a1a1a;
        line-height: 1.3;
      }

      h1 {
        font-size: 16pt;
        margin: 0 0 6pt 0;
        padding-bottom: 4pt;
        border-bottom: 1.5pt solid #2563eb;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: #0f172a;
      }

      h2 {
        font-size: 11pt;
        margin: 10pt 0 4pt 0;
        font-weight: 600;
        color: #374151;
        page-break-after: avoid;
        border-left: 3pt solid #2563eb;
        padding-left: 6pt;
      }

      h3 {
        font-size: 9pt;
        margin: 6pt 0 3pt 0;
        font-weight: 600;
        color: #4b5563;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin: 6pt 0 10pt 0;
        page-break-inside: avoid;
        font-size: 8pt;
      }

      th {
        background: linear-gradient(to bottom, #f3f4f6, #e5e7eb);
        font-weight: 600;
        font-size: 7.5pt;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: #374151;
        padding: 3pt 4pt;
        border: 0.5pt solid #d1d5db;
        text-align: left;
      }

      td {
        padding: 2.5pt 4pt;
        border: 0.5pt solid #e5e7eb;
        color: #1f2937;
      }

      tbody tr:nth-child(even) {
        background-color: #f9fafb;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 6pt 8pt;
        margin: 6pt 0 10pt 0;
      }

      .metrics-grid > div {
        font-size: 8pt;
        line-height: 1.3;
      }

      .metrics-grid .metric-label {
        color: #64748b;
        font-weight: 500;
        display: inline;
      }

      .metrics-grid .metric-value {
        color: #0f172a;
        font-weight: 700;
        font-family: 'SF Mono', Monaco, 'Courier New', monospace;
        display: inline;
        margin-left: 3pt;
      }

      .insight {
        border-left: 2.5pt solid #ea580c;
        background-color: #fef3c7;
        padding: 4pt 6pt;
        margin: 4pt 0;
        page-break-inside: avoid;
      }

      .insight-title {
        font-weight: 600;
        font-size: 8pt;
        color: #92400e;
        margin-bottom: 2pt;
      }

      .insight-description {
        font-size: 7.5pt;
        color: #78350f;
        margin: 2pt 0;
        line-height: 1.3;
      }

      .insight-impact {
        font-size: 7pt;
        color: #a16207;
        font-weight: 600;
      }

      .insight-actions {
        margin: 3pt 0 0 8pt;
        padding: 0;
        font-size: 7pt;
        color: #713f12;
      }

      .insight-actions li {
        margin: 1pt 0;
      }

      .report-metadata {
        font-size: 7pt;
        color: #6b7280;
        margin: 3pt 0 8pt 0;
        padding: 3pt 0;
        border-bottom: 0.5pt solid #e5e7eb;
      }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="report-metadata">
    Generated on ${format(new Date(), 'MMMM d, yyyy')} at ${format(new Date(), 'h:mm a')}
  </div>
  ${sections.map((section, index) => `
    <h2>${section.title}</h2>
    ${section.content}
  `).join('\n')}
</body>
</html>
  `;
}

/**
 * Print analytics to PDF (using browser's print dialog)
 */
export function printAnalyticsToPDF(
  title: string,
  sections: { title: string; content: string }[]
): void {
  const html = generatePrintableHTML(title, sections);
  const printWindow = window.open('', '_blank');

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
    console.error('Failed to open print window. Please check popup blocker settings.');
  }
}

/**
 * Format analytics metrics for export
 */
export function formatMetricsForExport(metrics: Record<string, any>): Record<string, any> {
  const formatted: Record<string, any> = {};

  for (const [key, value] of Object.entries(metrics)) {
    if (value instanceof Date) {
      formatted[key] = format(value, 'yyyy-MM-dd');
    } else if (typeof value === 'number') {
      // Format numbers with 2 decimal places
      formatted[key] = Math.round(value * 100) / 100;
    } else if (typeof value === 'object' && value !== null) {
      // Skip nested objects for flat CSV export
      formatted[key] = JSON.stringify(value);
    } else {
      formatted[key] = value;
    }
  }

  return formatted;
}
