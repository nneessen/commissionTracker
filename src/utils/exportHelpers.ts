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
        margin: 1in;
        size: letter;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 10pt;
        color: #000;
      }
      h1 {
        font-size: 18pt;
        margin-bottom: 0.5in;
        border-bottom: 2px solid #000;
        padding-bottom: 8pt;
      }
      h2 {
        font-size: 12pt;
        margin-top: 0.3in;
        margin-bottom: 8pt;
        page-break-after: avoid;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 0.2in;
        page-break-inside: avoid;
      }
      th, td {
        padding: 4pt;
        border: 1px solid #ccc;
        text-align: left;
      }
      th {
        background-color: #f0f0f0;
        font-weight: 600;
      }
      .metric {
        display: inline-block;
        margin: 4pt 8pt 4pt 0;
      }
      .metric-label {
        font-size: 8pt;
        color: #666;
        text-transform: uppercase;
      }
      .metric-value {
        font-size: 11pt;
        font-weight: 600;
      }
      .page-break {
        page-break-before: always;
      }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p style="font-size: 9pt; color: #666; margin-bottom: 0.3in;">
    Generated on ${format(new Date(), 'MMMM d, yyyy')} at ${format(new Date(), 'h:mm a')}
  </p>
  ${sections.map((section, index) => `
    ${index > 0 ? '<div class="page-break"></div>' : ''}
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
