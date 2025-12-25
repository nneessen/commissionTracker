// src/hooks/subscription/useTeamSizeLimit.ts
// Hook to check team size limits for Pro tier users

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/base/supabase";

export interface TeamSizeLimitStatus {
  /** Maximum direct downlines allowed (null = unlimited, 0 = no team features) */
  limit: number | null;
  /** Current number of direct downlines */
  current: number;
  /** Remaining slots (null if unlimited) */
  remaining: number | null;
  /** Whether user can add more team members */
  canAdd: boolean;
  /** Whether user is at warning threshold (1 away from limit) */
  atWarning: boolean;
  /** User's current plan name */
  planName: string;
}

interface UseTeamSizeLimitResult {
  /** Team size limit status */
  status: TeamSizeLimitStatus | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Refetch the limit data */
  refetch: () => void;
}

/**
 * Hook to check team size limits for the current user
 *
 * Pro tier users are limited to 5 direct downlines (agents + recruits)
 * Team tier users have unlimited downlines
 * Free/Starter users have no team features (limit = 0)
 *
 * @returns Team size limit status including can_add and warning states
 */
export function useTeamSizeLimit(): UseTeamSizeLimitResult {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["team-size-limit", user?.id],
    queryFn: async (): Promise<TeamSizeLimitStatus | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase.rpc("check_team_size_limit", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error checking team size limit:", error);
        throw new Error(`Failed to check team size limit: ${error.message}`);
      }

      if (!data) return null;

      // Parse the JSONB response from the database function
      return {
        limit: data.limit,
        current: data.current,
        remaining: data.remaining,
        canAdd: data.can_add,
        atWarning: data.at_warning,
        planName: data.plan_name,
      };
    },
    enabled: !!user?.id,
    staleTime: 30000, // Cache for 30 seconds
    // Inherits global refetchOnWindowFocus: false from QueryClient config
  });

  return {
    status: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
