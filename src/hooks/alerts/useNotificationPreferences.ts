/**
 * Notification Preferences Hooks
 *
 * TanStack Query hooks for managing notification preferences.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import type {
  NotificationPreferences,
  NotificationPreferencesFormData,
} from "@/types/alert-rules.types";

// Query keys
export const notificationPreferencesKeys = {
  all: ["notification-preferences"] as const,
  current: () => [...notificationPreferencesKeys.all, "current"] as const,
};

/**
 * Get current user's notification preferences
 */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationPreferencesKeys.current(),
    queryFn: async (): Promise<NotificationPreferences> => {
      const { data, error } = await supabase.rpc(
        "get_my_notification_preferences"
      );

      if (error) {
        throw new Error(
          `Failed to fetch notification preferences: ${error.message}`
        );
      }

      return data as unknown as NotificationPreferences;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      formData: Partial<NotificationPreferencesFormData>
    ): Promise<NotificationPreferences> => {
      const { data, error } = await supabase.rpc(
        "update_my_notification_preferences",
        {
          p_in_app_enabled: formData.in_app_enabled,
          p_browser_push_enabled: formData.browser_push_enabled,
          p_email_digest_enabled: formData.email_digest_enabled,
          p_email_digest_frequency: formData.email_digest_frequency,
          p_email_digest_time: formData.email_digest_time,
          p_email_digest_timezone: formData.email_digest_timezone,
          p_quiet_hours_enabled: formData.quiet_hours_enabled,
          p_quiet_hours_start: formData.quiet_hours_start,
          p_quiet_hours_end: formData.quiet_hours_end,
        }
      );

      if (error) {
        throw new Error(
          `Failed to update notification preferences: ${error.message}`
        );
      }

      return data as unknown as NotificationPreferences;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(notificationPreferencesKeys.current(), data);
    },
  });
}
