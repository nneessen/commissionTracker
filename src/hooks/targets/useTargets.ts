// src/hooks/targets/useTargets.ts

import { useQuery } from "@tanstack/react-query";
import { targetsService } from "../../services/targets";
import { supabase } from "../../services/base/supabase";

export interface UseTargetsOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export const useTargets = (options?: UseTargetsOptions) => {
  return useQuery({
    queryKey: ["targets"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      return await targetsService.getUserTargets(user.id);
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: options?.gcTime ?? 10 * 60 * 1000,
    enabled: options?.enabled ?? true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
