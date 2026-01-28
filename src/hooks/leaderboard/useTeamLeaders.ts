// src/hooks/leaderboard/useTeamLeaders.ts
// TanStack Query hook for fetching team leaders (agents with N+ downlines)

import { useQuery } from "@tanstack/react-query";
import { leaderboardService } from "../../services/leaderboard";
import { leaderboardKeys } from "./leaderboardKeys";
import type { TeamLeader } from "../../types/leaderboard.types";

interface UseTeamLeadersOptions {
  /**
   * Minimum number of direct downlines to qualify as a team leader
   * @default 5
   */
  minDownlines?: number;
  /**
   * Whether the query is enabled
   * @default true
   */
  enabled?: boolean;
}

/**
 * Hook to fetch team leaders for the filter dropdown
 * Team leaders are agents with a minimum number of direct downlines
 *
 * @param options - Query options including minimum downline threshold
 * @returns TanStack Query result with TeamLeader array
 *
 * @example
 * ```tsx
 * const { data: teamLeaders } = useTeamLeaders({ minDownlines: 5 });
 *
 * return (
 *   <Select>
 *     {teamLeaders?.map(leader => (
 *       <SelectItem key={leader.id} value={leader.id}>
 *         {leader.name} ({leader.downlineCount} agents)
 *       </SelectItem>
 *     ))}
 *   </Select>
 * );
 * ```
 */
export const useTeamLeaders = (options: UseTeamLeadersOptions = {}) => {
  const { minDownlines = 5, enabled = true } = options;

  return useQuery<TeamLeader[], Error>({
    queryKey: leaderboardKeys.teamLeaders(minDownlines),
    queryFn: () => leaderboardService.getTeamLeaders(minDownlines),
    staleTime: 5 * 60_000, // 5 minutes
    gcTime: 30 * 60_000, // 30 minutes (less frequently changing data)
    enabled,
  });
};
