// src/hooks/admin/useToggleUserUWAccess.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import { toast } from "sonner";

interface ToggleUWAccessParams {
  userId: string;
  enabled: boolean;
}

async function toggleUWAccess({
  userId,
  enabled,
}: ToggleUWAccessParams): Promise<void> {
  const { error } = await supabase
    .from("user_profiles")
    .update({ uw_wizard_enabled: enabled })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to update UW wizard access: ${error.message}`);
  }
}

/**
 * Hook to toggle UW wizard access for a user.
 * Only super admins should use this hook.
 */
export function useToggleUserUWAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleUWAccess,
    onSuccess: (_, { userId, enabled }) => {
      // Invalidate user queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["user-profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      queryClient.invalidateQueries({ queryKey: ["userApproval"] });

      // Invalidate UW feature flag if current user
      queryClient.invalidateQueries({
        queryKey: ["underwriting-feature-flag"],
      });

      toast.success(
        enabled
          ? "Underwriting Wizard access granted"
          : "Underwriting Wizard access revoked",
      );
    },
    onError: (error) => {
      toast.error(`Failed to update access: ${error.message}`);
    },
  });
}
