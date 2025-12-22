// src/features/reports/ReportsDashboard.tsx

import { useState, useMemo } from "react";
import { Package, Loader2, ChevronDown, Calendar, ChevronUp } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  TimePeriodSelector,
  AdvancedTimePeriod,
  getAdvancedDateRange,
} from "../analytics/components/TimePeriodSelector";

// Types
import type {
  ReportType,
  ReportFilters,
  DrillDownContext,
} from "../../types/reports.types";

// Hooks
import { useReport } from "./hooks";

// Config
import { REPORT_CATEGORIES, getDefaultReportType } from "./config";

// Utils
import { getInitialDateRange, TIER_DESCRIPTIONS } from "./utils";

// Components
import {
  ReportDocumentHeader,
  ExecutiveSummary,
  ReportSectionCard,
  BundleExportDialog,
  DrillDownDrawer,
  ImoPerformanceReport,
  AgencyPerformanceReport,
} from "./components";
import { ScheduledReportsManager } from "./components/ScheduledReportsManager";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../components/ui/collapsible";

// Services
import { ReportExportService } from "../../services/reports/reportExportService";

// Get report name by type
function getReportName(type: ReportType): string {
  for (const category of Object.values(REPORT_CATEGORIES)) {
    const report = category.reports.find((r) => r.type === type);
    if (report) return report.name;
  }
  return "Report";
}

export function ReportsDashboard() {
  // State
  const [selectedType, setSelectedType] = useState<ReportType>(
    getDefaultReportType(),
  );
  const [timePeriod, setTimePeriod] = useState<AdvancedTimePeriod>("MTD");
  const [customRange, setCustomRange] = useState<{
    startDate: Date;
    endDate: Date;
  }>(getInitialDateRange);
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false);
  const [drillDownContext, setDrillDownContext] =
    useState<DrillDownContext | null>(null);
  const [showScheduledReports, setShowScheduledReports] = useState(false);

  // Memoized date range
  const dateRange = useMemo(
    () => getAdvancedDateRange(timePeriod, customRange),
    [timePeriod, customRange],
  );

  // Memoized filters
  const filters: ReportFilters = useMemo(
    () => ({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
    [dateRange.startDate, dateRange.endDate],
  );

  // Fetch report data
  const { data: report, isLoading, error } = useReport(selectedType, filters);

  // Drill-down handlers
  const handleAgingBucketClick = (bucket: string) => {
    setDrillDownContext({
      type: "commission-aging-bucket",
      title: `Commission Aging: ${bucket}`,
      subtitle: "At-risk commissions in this aging window",
      agingBucket: bucket,
      filters,
    });
  };

  const handleClientTierClick = (tier: string) => {
    setDrillDownContext({
      type: "client-tier",
      title: `Tier ${tier} Clients`,
      subtitle: TIER_DESCRIPTIONS[tier] || "Clients in this tier",
      clientTier: tier as "A" | "B" | "C" | "D",
      filters,
    });
  };

  // Export handlers
  const handleExportPDF = () => {
    if (!report) return;
    ReportExportService.exportReport(report, {
      format: "pdf",
      includeCharts: true,
      includeSummary: true,
      includeInsights: true,
    });
  };

  const handleExportExcel = () => {
    if (!report) return;
    ReportExportService.exportReport(report, {
      format: "excel",
      includeSummary: true,
    });
  };

  return (
    <>
      <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
        {/* Compact Header Card - matches other pages */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            {/* Report Type Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs font-semibold gap-1"
                >
                  {getReportName(selectedType)}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {Object.entries(REPORT_CATEGORIES).map(([key, category]) => (
                  <div key={key}>
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-zinc-500">
                      {category.name}
                    </DropdownMenuLabel>
                    {category.reports.map((report) => (
                      <DropdownMenuItem
                        key={report.type}
                        onClick={() => setSelectedType(report.type)}
                        className={`text-xs ${selectedType === report.type ? "bg-blue-50 dark:bg-blue-950" : ""}`}
                      >
                        <span className="mr-2">{report.icon}</span>
                        {report.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:inline">
              Professional reporting and analytics
            </span>
          </div>

          <div className="flex items-center gap-2">
            <TimePeriodSelector
              selectedPeriod={timePeriod}
              onPeriodChange={setTimePeriod}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
            />
            <div className="flex gap-1">
              <Button
                onClick={handleExportPDF}
                size="sm"
                variant="ghost"
                disabled={!report || isLoading}
                className="h-7 px-2 text-xs"
                title="Export to PDF"
              >
                PDF
              </Button>
              <Button
                onClick={handleExportExcel}
                size="sm"
                variant="ghost"
                disabled={!report || isLoading}
                className="h-7 px-2 text-xs"
                title="Export to Excel"
              >
                Excel
              </Button>
              <Button
                onClick={() => setBundleDialogOpen(true)}
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400"
              >
                <Package className="w-3 h-3 mr-1" />
                Bundle
              </Button>
              <Button
                onClick={() => setShowScheduledReports(!showScheduledReports)}
                size="sm"
                variant="ghost"
                className={`h-7 px-2 text-xs ${showScheduledReports ? "bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400" : ""}`}
              >
                <Calendar className="w-3 h-3 mr-1" />
                Schedule
              </Button>
            </div>
          </div>
        </div>

        {/* Scheduled Reports Panel */}
        <Collapsible open={showScheduledReports} onOpenChange={setShowScheduledReports}>
          <CollapsibleContent>
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
              <ScheduledReportsManager />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Main Content */}
        <div className="flex-1 overflow-auto space-y-2">
          {/* Loading State */}
          {isLoading && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8">
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mb-3" />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Generating report...
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-red-200 dark:border-red-800 p-4">
              <p className="text-xs text-red-600 dark:text-red-400">
                Error:{" "}
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </div>
          )}

          {/* Team Performance Reports (Phase 6) */}
          {selectedType === "imo-performance" && (
            <ImoPerformanceReport
              dateRange={{
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
              }}
            />
          )}

          {selectedType === "agency-performance" && (
            <AgencyPerformanceReport
              dateRange={{
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
              }}
            />
          )}

          {/* Standard Report Document */}
          {!isLoading &&
            !error &&
            report &&
            selectedType !== "imo-performance" &&
            selectedType !== "agency-performance" && (
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <ReportDocumentHeader title={report.title} filters={filters} />
                <ExecutiveSummary summary={report.summary} />

                {/* Report Sections */}
                {report.sections.map((section) => (
                  <ReportSectionCard
                    key={section.id}
                    section={section}
                    onAgingBucketClick={handleAgingBucketClick}
                    onClientTierClick={handleClientTierClick}
                  />
                ))}

                {/* Report Footer */}
                <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 text-center border-t border-zinc-200 dark:border-zinc-700 rounded-b-lg">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Report ID: {report.id} | Generated:{" "}
                    {report.generatedAt.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Dialogs */}
      <BundleExportDialog
        open={bundleDialogOpen}
        onOpenChange={setBundleDialogOpen}
        filters={filters}
      />

      <DrillDownDrawer
        open={!!drillDownContext}
        onClose={() => setDrillDownContext(null)}
        context={drillDownContext}
      />
    </>
  );
}
