// src/hooks/integrations/useSchedulingIntegrations.ts

/**
 * Scheduling Integrations Hooks
 *
 * TanStack Query hooks for managing scheduling integrations (Calendly, Google Calendar, Zoom).
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schedulingIntegrationService } from "@/services/integrations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/base/supabase";
import type {
  SchedulingIntegration,
  SchedulingIntegrationType,
  CreateSchedulingIntegrationInput,
  UpdateSchedulingIntegrationInput,
} from "@/types/integration.types";

// Query keys
export const schedulingIntegrationKeys = {
  all: ["scheduling-integrations"] as const,
  list: (userId: string) =>
    [...schedulingIntegrationKeys.all, "list", userId] as const,
  active: (userId: string) =>
    [...schedulingIntegrationKeys.all, "active", userId] as const,
  byType: (userId: string, type: SchedulingIntegrationType) =>
    [...schedulingIntegrationKeys.all, "type", userId, type] as const,
  detail: (id: string) =>
    [...schedulingIntegrationKeys.all, "detail", id] as const,
  forRecruit: (recruitId: string) =>
    [...schedulingIntegrationKeys.all, "for-recruit", recruitId] as const,
};

/**
 * Get all integrations for the current user
 */
export function useSchedulingIntegrations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: schedulingIntegrationKeys.list(user?.id ?? ""),
    queryFn: async (): Promise<SchedulingIntegration[]> => {
      if (!user?.id) return [];
      return schedulingIntegrationService.getByUserId(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get active integrations for the current user
 */
export function useActiveSchedulingIntegrations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: schedulingIntegrationKeys.active(user?.id ?? ""),
    queryFn: async (): Promise<SchedulingIntegration[]> => {
      if (!user?.id) return [];
      return schedulingIntegrationService.getActiveByUserId(user.id);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get a specific integration by type for the current user
 */
export function useSchedulingIntegrationByType(
  type: SchedulingIntegrationType,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: schedulingIntegrationKeys.byType(user?.id ?? "", type),
    queryFn: async (): Promise<SchedulingIntegration | null> => {
      if (!user?.id) return null;
      return schedulingIntegrationService.getByType(user.id, type);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get integration by ID
 */
export function useSchedulingIntegration(id: string | null) {
  return useQuery({
    queryKey: schedulingIntegrationKeys.detail(id ?? ""),
    queryFn: async (): Promise<SchedulingIntegration | null> => {
      if (!id) return null;
      return schedulingIntegrationService.getById(id);
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create a new integration
 */
export function useCreateSchedulingIntegration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: CreateSchedulingIntegrationInput,
    ): Promise<SchedulingIntegration> => {
      if (!user?.id) throw new Error("User not authenticated");
      return schedulingIntegrationService.create(user.id, input);
    },
    onSuccess: () => {
      // Invalidate all integration queries for current user
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: schedulingIntegrationKeys.list(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: schedulingIntegrationKeys.active(user.id),
        });
      }
    },
  });
}

/**
 * Update an existing integration
 */
export function useUpdateSchedulingIntegration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateSchedulingIntegrationInput;
    }): Promise<SchedulingIntegration> => {
      return schedulingIntegrationService.update(id, updates);
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: schedulingIntegrationKeys.list(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: schedulingIntegrationKeys.active(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: schedulingIntegrationKeys.byType(
            user.id,
            data.integration_type,
          ),
        });
      }
      queryClient.invalidateQueries({
        queryKey: schedulingIntegrationKeys.detail(data.id),
      });
    },
  });
}

/**
 * Upsert integration (create or update by type)
 */
export function useUpsertSchedulingIntegration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: CreateSchedulingIntegrationInput,
    ): Promise<SchedulingIntegration> => {
      if (!user?.id) throw new Error("User not authenticated");
      return schedulingIntegrationService.upsert(user.id, input);
    },
    onSuccess: (data) => {
      // Invalidate all integration queries for current user
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: schedulingIntegrationKeys.list(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: schedulingIntegrationKeys.active(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: schedulingIntegrationKeys.byType(
            user.id,
            data.integration_type,
          ),
        });
      }
    },
  });
}

/**
 * Delete an integration
 */
export function useDeleteSchedulingIntegration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return schedulingIntegrationService.delete(id);
    },
    onSuccess: () => {
      // Invalidate all integration queries for current user
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: schedulingIntegrationKeys.list(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: schedulingIntegrationKeys.active(user.id),
        });
      }
    },
  });
}

/**
 * Toggle integration active status
 */
export function useToggleSchedulingIntegration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }): Promise<SchedulingIntegration> => {
      if (isActive) {
        return schedulingIntegrationService.activate(id);
      }
      return schedulingIntegrationService.deactivate(id);
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: schedulingIntegrationKeys.list(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: schedulingIntegrationKeys.active(user.id),
        });
        queryClient.invalidateQueries({
          queryKey: schedulingIntegrationKeys.byType(
            user.id,
            data.integration_type,
          ),
        });
      }
    },
  });
}

/**
 * Get the upline's active scheduling integrations for a given user (recruit)
 *
 * This hook looks up the user's upline_id and fetches their active integrations.
 * Used when a recruit views their pipeline to see their upline's scheduling links.
 *
 * Note: upline_id is the canonical field (recruiter_id is deprecated and kept in sync).
 *
 * @param userId - The ID of the user (recruit) whose upline's integrations to fetch
 */
export function useRecruiterSchedulingIntegrations(userId: string | null) {
  return useQuery({
    queryKey: schedulingIntegrationKeys.forRecruit(userId ?? ""),
    queryFn: async (): Promise<SchedulingIntegration[]> => {
      if (!userId) {
        return [];
      }

      // Get the user's upline_id (canonical) with recruiter_id fallback for pre-migration data
      const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("upline_id, recruiter_id")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error(
          "[useRecruiterSchedulingIntegrations] Error fetching user profile:",
          profileError,
        );
        return [];
      }

      // Use upline_id as canonical, fall back to recruiter_id for pre-migration data
      const uplineId = userProfile?.upline_id || userProfile?.recruiter_id;
      if (!uplineId) {
        // User has no upline - return empty (they might be the admin/top-level)
        return [];
      }

      // Fetch the upline's active integrations
      // RLS policy "scheduling_integrations_select_for_recruit" allows this
      const integrations =
        await schedulingIntegrationService.getActiveByUserId(uplineId);
      return integrations;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
