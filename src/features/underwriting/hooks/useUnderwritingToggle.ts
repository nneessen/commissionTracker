// src/features/underwriting/hooks/useUnderwritingToggle.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ImoSettings {
  underwriting_wizard_enabled?: boolean;
  [key: string]: unknown;
}

/**
 * Hook to manage the underwriting wizard feature toggle for an IMO.
 * Reads and updates the imos.settings JSONB field.
 */
export function useUnderwritingToggle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const imoId = user?.imo_id;

  // Query to get current setting
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["imo-settings", imoId],
    queryFn: async (): Promise<ImoSettings> => {
      if (!imoId) return {};

      const { data, error } = await supabase
        .from("imos")
        .select("settings")
        .eq("id", imoId)
        .single();

      if (error) {
        console.error("Failed to fetch IMO settings:", error);
        return {};
      }

      return (data?.settings as ImoSettings) || {};
    },
    enabled: !!imoId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation to toggle the setting
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean): Promise<void> => {
      if (!imoId) throw new Error("No IMO ID available");

      // Merge with existing settings to preserve other JSONB fields
      const newSettings: ImoSettings = {
        ...settings,
        underwriting_wizard_enabled: enabled,
      };

      const { error } = await supabase
        .from("imos")
        .update({ settings: newSettings })
        .eq("id", imoId);

      if (error) {
        throw new Error(`Failed to update setting: ${error.message}`);
      }
    },
    onSuccess: (_, enabled) => {
      // Update cache
      queryClient.setQueryData(
        ["imo-settings", imoId],
        (old: ImoSettings | undefined) => ({
          ...old,
          underwriting_wizard_enabled: enabled,
        }),
      );
      // Also invalidate the feature flag query
      queryClient.invalidateQueries({
        queryKey: ["underwriting-feature-flag"],
      });
      toast.success(
        enabled
          ? "Underwriting wizard enabled"
          : "Underwriting wizard disabled",
      );
    },
    onError: (error) => {
      toast.error(`Failed to update setting: ${error.message}`);
    },
  });

  const isEnabled = settings?.underwriting_wizard_enabled ?? false;

  const toggleEnabled = (enabled: boolean) => {
    toggleMutation.mutate(enabled);
  };

  return {
    isEnabled,
    isLoading: isLoadingSettings || toggleMutation.isPending,
    toggleEnabled,
    error: toggleMutation.error,
  };
}
