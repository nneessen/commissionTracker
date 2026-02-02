// src/features/the-standard-team/hooks/useStateClassifications.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";

export type StateClassificationType = "green" | "yellow" | "red" | "neutral";

export interface StateClassification {
  id: string;
  agency_id: string;
  state_code: string;
  classification: StateClassificationType;
  created_at: string | null;
  updated_at: string | null;
}

export const stateClassificationsQueryKeys = {
  all: ["state-classifications"] as const,
  byAgency: (agencyId: string) =>
    [...stateClassificationsQueryKeys.all, "by-agency", agencyId] as const,
};

/**
 * Fetches state classifications for an agency
 */
export function useStateClassifications(
  agencyId: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
  },
) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options || {};

  return useQuery({
    queryKey: stateClassificationsQueryKeys.byAgency(agencyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("state_classifications")
        .select("*")
        .eq("agency_id", agencyId);

      if (error) {
        throw new Error(error.message);
      }

      return data as StateClassification[];
    },
    enabled: enabled && !!agencyId,
    staleTime,
  });
}

interface UpdateStateClassificationParams {
  agencyId: string;
  stateCode: string;
  classification: StateClassificationType;
  existingId?: string;
}

/**
 * Updates or creates a state classification for an agency
 */
export function useUpdateStateClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agencyId,
      stateCode,
      classification,
      existingId,
    }: UpdateStateClassificationParams) => {
      if (existingId) {
        // Update existing
        const { data, error } = await supabase
          .from("state_classifications")
          .update({
            classification,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingId)
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from("state_classifications")
          .insert({
            agency_id: agencyId,
            state_code: stateCode,
            classification,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: stateClassificationsQueryKeys.all,
      });
    },
  });
}
