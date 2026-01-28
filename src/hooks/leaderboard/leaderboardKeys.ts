// src/hooks/leaderboard/leaderboardKeys.ts
// Query key factory for leaderboard-related queries

import type { LeaderboardFilters } from "../../types/leaderboard.types";

/**
 * Query key factory for leaderboard queries
 * Provides consistent, cache-friendly keys for TanStack Query
 */
export const leaderboardKeys = {
  /**
   * Root key for all leaderboard queries
   */
  all: ["leaderboard"] as const,

  /**
   * Key for individual agent leaderboard data
   */
  agents: (filters: LeaderboardFilters) =>
    [...leaderboardKeys.all, "agents", filters] as const,

  /**
   * Key for agency leaderboard data (agencies as units)
   */
  agencies: (filters: LeaderboardFilters) =>
    [...leaderboardKeys.all, "agencies", filters] as const,

  /**
   * Key for team leaderboard data (teams as units)
   */
  teams: (filters: LeaderboardFilters) =>
    [...leaderboardKeys.all, "teams", filters] as const,

  /**
   * Key for team leaders dropdown query
   * @param threshold - Minimum downline count threshold
   */
  teamLeaders: (threshold: number) =>
    [...leaderboardKeys.all, "team-leaders", threshold] as const,

  /**
   * Key for agencies dropdown list
   */
  agenciesList: () => [...leaderboardKeys.all, "agencies-list"] as const,
};
