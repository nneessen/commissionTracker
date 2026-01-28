// src/hooks/leaderboard/useAgencies.ts
// TanStack Query hook for fetching agencies list

import { useQuery } from "@tanstack/react-query";
import { leaderboardService } from "../../services/leaderboard";
import { leaderboardKeys } from "./leaderboardKeys";

interface Agency {
  id: string;
  name: string;
}

interface UseAgenciesOptions {
  /**
   * Whether the query is enabled
   * @default true
   */
  enabled?: boolean;
}

/**
 * Hook to fetch agencies list for the filter dropdown
 *
 * @param options - Query options
 * @returns TanStack Query result with Agency array
 *
 * @example
 * ```tsx
 * const { data: agencies } = useAgencies();
 *
 * return (
 *   <Select>
 *     {agencies?.map(agency => (
 *       <SelectItem key={agency.id} value={agency.id}>
 *         {agency.name}
 *       </SelectItem>
 *     ))}
 *   </Select>
 * );
 * ```
 */
export const useAgencies = (options: UseAgenciesOptions = {}) => {
  const { enabled = true } = options;

  return useQuery<Agency[], Error>({
    queryKey: leaderboardKeys.agenciesList(),
    queryFn: () => leaderboardService.getAgencies(),
    staleTime: 10 * 60_000, // 10 minutes
    gcTime: 60 * 60_000, // 1 hour (rarely changes)
    enabled,
  });
};
