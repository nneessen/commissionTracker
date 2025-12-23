// src/hooks/reports/scheduled/useScheduledReports.ts
// React Query hooks for scheduled report management
// Phase 9: Report Export Enhancement

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../services/base/supabase";
import {
  ScheduledReportWithStats,
  ScheduleDelivery,
  EligibleRecipient,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  parseScheduledReports,
  parseScheduleDeliveries,
  parseEligibleRecipients,
} from "../../../types/scheduled-reports.types";
import { toast } from "sonner";

// Query keys
export const scheduledReportKeys = {
  all: ["scheduled-reports"] as const,
  list: () => [...scheduledReportKeys.all, "list"] as const,
  detail: (id: string) => [...scheduledReportKeys.all, "detail", id] as const,
  deliveries: (scheduleId: string) =>
    [...scheduledReportKeys.all, "deliveries", scheduleId] as const,
  eligibleRecipients: (imoId?: string, agencyId?: string) =>
    [...scheduledReportKeys.all, "recipients", imoId, agencyId] as const,
};

/**
 * Hook to fetch current user's scheduled reports
 */
export function useMyScheduledReports() {
  return useQuery<ScheduledReportWithStats[], Error>({
    queryKey: scheduledReportKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_scheduled_reports");

      if (error) {
        console.error("Failed to fetch scheduled reports:", error);
        throw error;
      }

      return parseScheduledReports(data || []);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook to fetch delivery history for a schedule
 */
export function useScheduleDeliveryHistory(scheduleId: string, limit = 20) {
  return useQuery<ScheduleDelivery[], Error>({
    queryKey: scheduledReportKeys.deliveries(scheduleId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_schedule_delivery_history",
        {
          p_schedule_id: scheduleId,
          p_limit: limit,
        },
      );

      if (error) {
        console.error("Failed to fetch delivery history:", error);
        throw error;
      }

      return parseScheduleDeliveries(data || []);
    },
    enabled: !!scheduleId,
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

/**
 * Hook to fetch eligible recipients based on org scope
 */
export function useEligibleRecipients(
  imoId?: string | null,
  agencyId?: string | null,
) {
  return useQuery<EligibleRecipient[], Error>({
    queryKey: scheduledReportKeys.eligibleRecipients(
      imoId ?? undefined,
      agencyId ?? undefined,
    ),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_eligible_recipients", {
        p_imo_id: imoId || null,
        p_agency_id: agencyId || null,
      });

      if (error) {
        console.error("Failed to fetch eligible recipients:", error);
        throw error;
      }

      return parseEligibleRecipients(data || []);
    },
    enabled: !!(imoId || agencyId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to create a new scheduled report
 */
export function useCreateScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation<string, Error, CreateScheduleRequest>({
    mutationFn: async (request) => {
      const { data, error } = await supabase.rpc("create_scheduled_report", {
        p_schedule_name: request.schedule_name,
        p_report_type: request.report_type,
        p_frequency: request.frequency,
        p_day_of_week: request.day_of_week ?? null,
        p_day_of_month: request.day_of_month ?? null,
        p_preferred_time: request.preferred_time ?? "08:00:00",
        p_recipients: JSON.stringify(request.recipients),
        p_export_format: request.export_format ?? "pdf",
        p_report_config: JSON.stringify(request.report_config ?? {}),
        p_include_charts: request.include_charts ?? true,
        p_include_insights: request.include_insights ?? true,
        p_include_summary: request.include_summary ?? true,
      });

      if (error) {
        console.error("Failed to create scheduled report:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledReportKeys.list() });
      toast.success("Report schedule created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create schedule");
    },
  });
}

/**
 * Hook to update an existing scheduled report
 */
export function useUpdateScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation<
    boolean,
    Error,
    { scheduleId: string; updates: UpdateScheduleRequest }
  >({
    mutationFn: async ({ scheduleId, updates }) => {
      const { data, error } = await supabase.rpc("update_scheduled_report", {
        p_schedule_id: scheduleId,
        p_schedule_name: updates.schedule_name ?? null,
        p_frequency: updates.frequency ?? null,
        p_day_of_week: updates.day_of_week ?? null,
        p_day_of_month: updates.day_of_month ?? null,
        p_preferred_time: updates.preferred_time ?? null,
        p_recipients: updates.recipients
          ? JSON.stringify(updates.recipients)
          : null,
        p_export_format: updates.export_format ?? null,
        p_report_config: updates.report_config
          ? JSON.stringify(updates.report_config)
          : null,
        p_include_charts: updates.include_charts ?? null,
        p_include_insights: updates.include_insights ?? null,
        p_include_summary: updates.include_summary ?? null,
        p_is_active: updates.is_active ?? null,
      });

      if (error) {
        console.error("Failed to update scheduled report:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: scheduledReportKeys.list() });
      queryClient.invalidateQueries({
        queryKey: scheduledReportKeys.detail(scheduleId),
      });
      toast.success("Schedule updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update schedule");
    },
  });
}

/**
 * Hook to toggle schedule active status
 */
export function useToggleScheduleActive() {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, { scheduleId: string; isActive: boolean }>(
    {
      mutationFn: async ({ scheduleId, isActive }) => {
        const { data, error } = await supabase.rpc("update_scheduled_report", {
          p_schedule_id: scheduleId,
          p_is_active: isActive,
        });

        if (error) {
          throw error;
        }

        return data;
      },
      onSuccess: (_, { isActive }) => {
        queryClient.invalidateQueries({ queryKey: scheduledReportKeys.list() });
        toast.success(isActive ? "Schedule enabled" : "Schedule paused");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update schedule");
      },
    },
  );
}

/**
 * Hook to delete a scheduled report
 */
export function useDeleteScheduledReport() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (scheduleId) => {
      const { error } = await supabase
        .from("scheduled_reports")
        .delete()
        .eq("id", scheduleId);

      if (error) {
        console.error("Failed to delete scheduled report:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduledReportKeys.list() });
      toast.success("Schedule deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete schedule");
    },
  });
}
