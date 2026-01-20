// src/hooks/recruiting/useAppointments.ts

import { useQuery } from "@tanstack/react-query";
import { appointmentAggregationService } from "@/services/recruiting/appointmentAggregationService";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserProfile } from "@/hooks/admin";

/**
 * TanStack Query hooks for appointment data
 *
 * Appointments are cached for 5 minutes and automatically invalidated
 * when checklist items are updated.
 */

/**
 * Get all appointments for a specific recruit
 * @param userId - Recruit user ID
 * @returns Query result with appointments array
 */
export function useRecruitAppointments(userId: string) {
  return useQuery({
    queryKey: ["recruit-appointments", userId],
    queryFn: () => appointmentAggregationService.getRecruitAppointments(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });
}

/**
 * Get only upcoming appointments for a recruit
 * @param userId - Recruit user ID
 * @returns Query result with upcoming appointments
 */
export function useUpcomingAppointments(userId: string) {
  return useQuery({
    queryKey: ["upcoming-appointments", userId],
    queryFn: async () => {
      const appointments =
        await appointmentAggregationService.getRecruitAppointments(userId);
      return appointmentAggregationService.filterUpcoming(appointments);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });
}

/**
 * Get all appointments for a recruiter's recruits
 * @param recruiterId - Recruiter user ID
 * @returns Query result with all recruits' appointments
 */
export function useRecruiterAppointments(recruiterId: string) {
  return useQuery({
    queryKey: ["recruiter-appointments", recruiterId],
    queryFn: () =>
      appointmentAggregationService.getRecruiterAppointments(recruiterId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!recruiterId,
  });
}

/**
 * Get appointments for the current user
 * Automatically detects if user is a recruit or recruiter
 * - Recruits: Returns their own appointments
 * - Recruiters: Returns appointments for all their recruits
 * @returns Query result with appointments
 */
export function useMyAppointments() {
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();

  // A recruit is identified by having the 'recruit' role
  // Note: recruiter_id indicates who recruited them, not whether they are a recruit
  const isRecruit = profile?.roles?.includes("recruit") ?? false;

  return useQuery({
    queryKey: ["my-appointments", user?.id, isRecruit],
    queryFn: async () => {
      if (!user?.id) return [];

      if (isRecruit) {
        // User is a recruit - get their own appointments
        return appointmentAggregationService.getRecruitAppointments(user.id);
      } else {
        // User is a recruiter - get all their recruits' appointments
        return appointmentAggregationService.getRecruiterAppointments(user.id);
      }
    },
    enabled: !!user?.id && !!profile,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get today's appointments for current user
 * @returns Query result with today's appointments
 */
export function useTodaysAppointments() {
  const { user } = useAuth();
  const { data: profile } = useCurrentUserProfile();
  // A recruit is identified by having the 'recruit' role
  const isRecruit = profile?.roles?.includes("recruit") ?? false;

  return useQuery({
    queryKey: ["todays-appointments", user?.id, isRecruit],
    queryFn: async () => {
      if (!user?.id) return [];

      let appointments;
      if (isRecruit) {
        appointments =
          await appointmentAggregationService.getRecruitAppointments(user.id);
      } else {
        appointments =
          await appointmentAggregationService.getRecruiterAppointments(user.id);
      }

      return appointmentAggregationService.filterToday(appointments);
    },
    enabled: !!user?.id && !!profile,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
