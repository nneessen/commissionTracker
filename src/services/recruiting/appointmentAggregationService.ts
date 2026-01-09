// src/services/recruiting/appointmentAggregationService.ts

import { supabase } from "@/services/base/supabase";
import type { SchedulingIntegrationType } from "@/types/integration.types";

/**
 * Shape of the joined query result for appointments
 * Uses Record<string, unknown> because Supabase join results have dynamic structure
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join results have complex nested arrays
type AppointmentQueryRow = Record<string, any>;

/**
 * Appointment represents a scheduled meeting/call from a checklist item
 * Aggregated from recruit_checklist_progress + phase_checklist_items
 */
export interface Appointment {
  id: string; // checklist_item_id
  recruit_id: string;
  recruit_name: string;
  item_name: string;
  platform: SchedulingIntegrationType;
  scheduled_at: string | null;
  join_url: string;
  meeting_id?: string;
  passcode?: string;
  status: "upcoming" | "today" | "past" | "pending";
  phase_name: string;
}

/**
 * Appointment Aggregation Service
 *
 * Aggregates appointment data from checklist progress for display in UI.
 * Appointments are not stored in a separate table - they exist as
 * scheduling_booking checklist items with metadata.
 *
 * Data source: recruit_checklist_progress.metadata.appointment_details
 */
export const appointmentAggregationService = {
  /**
   * Get all appointments for a specific recruit
   * @param userId - Recruit user ID
   * @returns Array of appointments
   */
  async getRecruitAppointments(userId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from("recruit_checklist_progress")
      .select(
        `
        id,
        checklist_item_id,
        user_id,
        status,
        metadata,
        phase_checklist_items!inner (
          id,
          item_name,
          item_type,
          metadata,
          phase_id,
          pipeline_phases!inner (
            phase_name
          )
        ),
        user_profiles!inner (
          first_name,
          last_name
        )
      `,
      )
      .eq("user_id", userId)
      .eq("phase_checklist_items.item_type", "scheduling_booking");

    if (error) throw error;

    return this.mapToAppointments(data || []);
  },

  /**
   * Get all appointments for a recruiter's recruits
   * @param recruiterId - Recruiter user ID
   * @returns Array of appointments for all recruits
   */
  async getRecruiterAppointments(recruiterId: string): Promise<Appointment[]> {
    // First, get all recruits under this recruiter
    const { data: recruits, error: recruitsError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("recruiter_id", recruiterId);

    if (recruitsError) throw recruitsError;
    if (!recruits?.length) return [];

    const recruitIds = recruits.map((r: { id: string }) => r.id);

    // Then get all appointments for these recruits
    const { data, error } = await supabase
      .from("recruit_checklist_progress")
      .select(
        `
        id,
        checklist_item_id,
        user_id,
        status,
        metadata,
        phase_checklist_items!inner (
          id,
          item_name,
          item_type,
          metadata,
          phase_id,
          pipeline_phases!inner (
            phase_name
          )
        ),
        user_profiles!inner (
          first_name,
          last_name
        )
      `,
      )
      .in("user_id", recruitIds)
      .eq("phase_checklist_items.item_type", "scheduling_booking");

    if (error) throw error;

    return this.mapToAppointments(data || []);
  },

  /**
   * Filter appointments to only upcoming ones
   * @param appointments - Array of appointments
   * @returns Filtered array of upcoming appointments, sorted by date
   */
  filterUpcoming(appointments: Appointment[]): Appointment[] {
    const now = new Date();
    return appointments
      .filter((apt) => apt.scheduled_at && new Date(apt.scheduled_at) > now)
      .sort(
        (a, b) =>
          new Date(a.scheduled_at!).getTime() -
          new Date(b.scheduled_at!).getTime(),
      );
  },

  /**
   * Filter appointments to only past ones
   * @param appointments - Array of appointments
   * @returns Filtered array of past appointments, sorted by date (newest first)
   */
  filterPast(appointments: Appointment[]): Appointment[] {
    const now = new Date();
    return appointments
      .filter((apt) => apt.scheduled_at && new Date(apt.scheduled_at) <= now)
      .sort(
        (a, b) =>
          new Date(b.scheduled_at!).getTime() -
          new Date(a.scheduled_at!).getTime(),
      );
  },

  // TODO: the 3 filter methods above is repetive code. this can be one method instead which makes this file a bit cleaner
  /**
   * Get appointments happening today
   * @param appointments - Array of appointments
   * @returns Filtered array of today's appointments
   */
  filterToday(appointments: Appointment[]): Appointment[] {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfDay = new Date(startOfDay.getTime() + 86400000); // +24 hours

    return appointments.filter((apt) => {
      if (!apt.scheduled_at) return false;
      const date = new Date(apt.scheduled_at);
      return date >= startOfDay && date < endOfDay;
    });
  },

  /**
   * Map database results to Appointment objects
   * @param data - Raw database results
   * @returns Array of mapped appointments
   */
  mapToAppointments(data: AppointmentQueryRow[]): Appointment[] {
    return data.map((row) => {
      const itemMetadata = row.phase_checklist_items
        .metadata as unknown as Record<string, string | undefined>;
      const progressMetadata = row.metadata;

      // Determine appointment status based on scheduled date
      let status: Appointment["status"] = "pending";
      if (progressMetadata?.appointment_details?.scheduled_at) {
        const scheduledDate = new Date(
          progressMetadata.appointment_details.scheduled_at,
        );
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );

        if (scheduledDate < now) {
          status = "past";
        } else if (
          scheduledDate >= today &&
          scheduledDate < new Date(today.getTime() + 86400000)
        ) {
          status = "today";
        } else {
          status = "upcoming";
        }
      }

      return {
        id: row.checklist_item_id,
        recruit_id: row.user_id,
        recruit_name: `${row.user_profiles.first_name} ${row.user_profiles.last_name}`,
        item_name: row.phase_checklist_items.item_name,
        platform: (itemMetadata.scheduling_type ||
          "zoom") as SchedulingIntegrationType,
        scheduled_at:
          progressMetadata?.appointment_details?.scheduled_at || null,
        join_url: itemMetadata.booking_url || "",
        meeting_id: itemMetadata.meeting_id,
        passcode: itemMetadata.passcode,
        status,
        phase_name: row.phase_checklist_items.pipeline_phases.phase_name,
      };
    });
  },
};
