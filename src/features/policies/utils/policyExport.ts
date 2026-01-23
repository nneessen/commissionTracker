// src/features/policies/utils/policyExport.ts

import ExcelJS from "exceljs";
import { format } from "date-fns";
import { downloadCSV } from "@/utils/exportHelpers";
import type { Policy } from "@/types/policy.types";
import type { Commission } from "@/types/commission.types";

/** Human-readable product type labels */
const PRODUCT_LABELS: Record<string, string> = {
  whole_life: "Whole Life",
  term_life: "Term Life",
  universal_life: "Universal Life",
  indexed_universal_life: "Indexed Universal Life",
  variable_life: "Variable Life",
  variable_universal_life: "Variable Universal Life",
  participating_whole_life: "Participating Whole Life",
  final_expense: "Final Expense",
  accidental: "Accidental Death & Dismemberment",
  health: "Health",
  disability: "Disability",
  annuity: "Annuity",
};

/** Column definitions for export */
const EXPORT_HEADERS = [
  "Policy Number",
  "Status",
  "Client Name",
  "Client DOB",
  "Client Age",
  "Client Street",
  "Client City",
  "Client State",
  "Client Zip Code",
  "Client Email",
  "Client Phone",
  "Carrier",
  "Product Type",
  "Annual Premium",
  "Payment Frequency",
  "Commission %",
  "Commission Amount",
  "Commission Status",
  "Effective Date",
  "Expiration Date",
  "Submit Date",
  "Notes",
  "Created Date",
];

export interface ExportRow {
  "Policy Number": string;
  Status: string;
  "Client Name": string;
  "Client DOB": string;
  "Client Age": string;
  "Client Street": string;
  "Client City": string;
  "Client State": string;
  "Client Zip Code": string;
  "Client Email": string;
  "Client Phone": string;
  Carrier: string;
  "Product Type": string;
  "Annual Premium": string;
  "Payment Frequency": string;
  "Commission %": string;
  "Commission Amount": string;
  "Commission Status": string;
  "Effective Date": string;
  "Expiration Date": string;
  "Submit Date": string;
  Notes: string;
  "Created Date": string;
}

/**
 * Flatten policies into export-ready row objects
 */
export function flattenPoliciesForExport(
  policies: Policy[],
  carrierMap: Record<string, string>,
  commissionMap: Record<string, Commission>,
): ExportRow[] {
  return policies.map((policy) => {
    const commission = policy.id ? commissionMap[policy.id] : undefined;

    return {
      "Policy Number": policy.policyNumber || "",
      Status: policy.status || "",
      "Client Name": policy.client?.name || "",
      "Client DOB": policy.client?.dateOfBirth || "",
      "Client Age": policy.client?.age != null ? String(policy.client.age) : "",
      "Client Street": policy.client?.street || "",
      "Client City": policy.client?.city || "",
      "Client State": policy.client?.state || "",
      "Client Zip Code": policy.client?.zipCode || "",
      "Client Email": policy.client?.email || "",
      "Client Phone": policy.client?.phone || "",
      Carrier: policy.carrierId ? carrierMap[policy.carrierId] || "" : "",
      "Product Type": PRODUCT_LABELS[policy.product] || policy.product || "",
      "Annual Premium":
        policy.annualPremium != null ? String(policy.annualPremium) : "",
      "Payment Frequency": policy.paymentFrequency || "",
      "Commission %":
        policy.commissionPercentage != null
          ? String((policy.commissionPercentage * 100).toFixed(1))
          : "",
      "Commission Amount":
        commission?.amount != null ? String(commission.amount) : "",
      "Commission Status": commission?.status || "",
      "Effective Date": policy.effectiveDate || "",
      "Expiration Date": policy.expirationDate || "",
      "Submit Date": policy.submitDate || "",
      Notes: policy.notes || "",
      "Created Date": policy.createdAt || "",
    };
  });
}

/**
 * Export flattened rows as CSV download
 */
export function exportPoliciesToCSV(rows: ExportRow[]): void {
  downloadCSV(
    rows as unknown as Record<string, unknown>[],
    "policies_export",
    EXPORT_HEADERS,
  );
}

/**
 * Export flattened rows as Excel (.xlsx) download
 */
export async function exportPoliciesToExcel(rows: ExportRow[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Policies");

  // Add header row
  sheet.addRow(EXPORT_HEADERS);

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { horizontal: "center" };

  // Add data rows
  for (const row of rows) {
    sheet.addRow(EXPORT_HEADERS.map((h) => row[h as keyof ExportRow]));
  }

  // Auto-fit column widths (approximate based on content)
  sheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellLength = cell.value ? String(cell.value).length : 0;
      if (cellLength > maxLength) maxLength = cellLength;
    });
    column.width = Math.min(Math.max(maxLength + 2, 10), 40);
  });

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `policies_export_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
