// src/hooks/targets/useAchievements.ts

import { useQuery } from "@tanstack/react-query";
import { targetsService } from "../../services/targets";
import { supabase } from "../../services/base/supabase";

export interface UseAchievementsOptions {
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Fetch user achievements using TanStack Query
 *
 * @param options Optional configuration for the query
 * @returns TanStack Query result with achievements data
 */
export const useAchievements = (options?: UseAchievementsOptions) => {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      return await targetsService.getAchievements(user.id);
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    enabled: options?.enabled ?? true,
  });
};
