// src/features/reports/config/reportCategoriesConfig.ts

import type { ReportType } from "../../../types/reports.types";

export interface ReportOption {
  type: ReportType;
  name: string;
  icon: string;
}

export interface ReportCategory {
  name: string;
  reports: ReportOption[];
}

export const REPORT_CATEGORIES: Record<string, ReportCategory> = {
  executive: {
    name: "Executive Reports",
    reports: [
      {
        type: "executive-dashboard",
        name: "Executive Report",
        icon: "📊",
      },
      {
        type: "financial-health",
        name: "Financial Health",
        icon: "💰",
      },
      {
        type: "predictive-analytics",
        name: "Predictive Analytics",
        icon: "📈",
      },
    ],
  },
  performance: {
    name: "Performance Reports",
    reports: [
      {
        type: "commission-performance",
        name: "Commission Report",
        icon: "💵",
      },
      {
        type: "policy-performance",
        name: "Policy Report",
        icon: "📋",
      },
      {
        type: "client-relationship",
        name: "Client Report",
        icon: "👥",
      },
    ],
  },
};

// Helper to get all report types as flat array
export function getAllReportTypes(): ReportOption[] {
  return Object.values(REPORT_CATEGORIES).flatMap(
    (category) => category.reports,
  );
}

// Helper to get default report type
export function getDefaultReportType(): ReportType {
  return "executive-dashboard";
}
