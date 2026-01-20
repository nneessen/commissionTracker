// src/hooks/hierarchy/useUplineProfile.ts

import { useQuery } from "@tanstack/react-query";
import { hierarchyKeys } from "@/hooks/hierarchy/hierarchyKeys";
import { supabase } from "@/services/base/supabase";
import type { UserProfile } from "@/types/hierarchy.types";

export interface UseUplineProfileOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export const useUplineProfile = (
  uplineId?: string,
  options?: UseUplineProfileOptions,
) => {
  const { enabled = true, staleTime, gcTime } = options || {};

  return useQuery<UserProfile | null>({
    queryKey: hierarchyKeys.rollup(
      uplineId ?? "unknown",
      undefined,
      "upline-profile",
    ),
    queryFn: async () => {
      if (!uplineId) return null;

      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          "id, first_name, last_name, email, phone, profile_photo_url, roles",
        )
        .eq("id", uplineId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: enabled && !!uplineId,
    staleTime: staleTime ?? 60_000,
    gcTime: gcTime ?? 20 * 60_000,
  });
};
