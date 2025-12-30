// src/hooks/reports/useReport.ts

import { useQuery } from "@tanstack/react-query";
import { Report, ReportType, ReportFilters } from "../../types/reports.types";
import { ReportGenerationService } from "../../services/reports/reportGenerationService";
import { supabase } from "../../services/base/supabase";

// Report types that use dedicated components with their own data fetching
// These should NOT use the ReportGenerationService
const CUSTOM_REPORT_TYPES: ReportType[] = [
  "imo-performance",
  "agency-performance",
];

/**
 * Hook to fetch and generate a report
 */
export function useReport(type: ReportType, filters: ReportFilters) {
  return useQuery<Report | null, Error>({
    queryKey: [
      "report",
      type,
      filters.startDate.toISOString(),
      filters.endDate.toISOString(),
    ],
    queryFn: async () => {
      // Skip for report types that use dedicated components
      if (CUSTOM_REPORT_TYPES.includes(type)) {
        return null;
      }

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Generate report
      return ReportGenerationService.generateReport({
        userId: user.id,
        type,
        filters,
      });
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus (reports are expensive)
    enabled: !CUSTOM_REPORT_TYPES.includes(type), // Don't even run for custom types
  });
}
