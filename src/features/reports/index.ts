// src/features/reports/index.ts

// Main dashboard component
export { ReportsDashboard } from "./ReportsDashboard";

// Backward compatibility alias
export { ReportsDashboard as ReportsPage } from "./ReportsDashboard";

// Components
export { ReportSelector } from "./components/ReportSelector";
export { InsightCard } from "./components/InsightCard";
export {
  ReportNavigator,
  ReportMobileSelector,
  ReportDocumentHeader,
  ExecutiveSummary,
  ReportSectionCard,
  BundleExportDialog,
} from "./components";

// Config
export {
  REPORT_CATEGORIES,
  getAllReportTypes,
  getDefaultReportType,
} from "./config";

// Utils
export {
  getInitialDateRange,
  parseCurrency,
  getAgingChartData,
  getTierChartData,
  TIER_DESCRIPTIONS,
} from "./utils";

// Hooks
export { useReport, useDrillDown, useReportFilterOptions } from "./hooks";
