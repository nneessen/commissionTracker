// src/services/users/userSearchService.ts
// Service for server-side user search (upline selection, recruiter assignment, etc.)

import { supabase } from "@/services/base/supabase";

/**
 * User search result from the search_users_for_assignment RPC
 */
export interface UserSearchResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  roles: string[];
  agent_status: string | null;
}

/**
 * Parameters for searching users
 */
export interface SearchUsersParams {
  /** Search term to match against name or email */
  searchTerm?: string;
  /** Filter by roles (user must have at least one of these roles) */
  roles?: string[];
  /** Filter by approval status (default: 'approved', null for any) */
  approvalStatus?: "approved" | "pending" | "denied" | null;
  /** Exclude specific user IDs (for excluding self, downlines, etc.) */
  excludeIds?: string[];
  /** Maximum number of results (default: 15) */
  limit?: number;
}

/**
 * Search users for assignment (upline selection, recruiter assignment, etc.)
 *
 * Uses server-side search with the search_users_for_assignment RPC for scalability.
 * Supports filtering by roles, approval status, and ID exclusions.
 *
 * @param params - Search parameters
 * @returns Array of matching users
 * @throws Error if the RPC call fails
 */
export async function searchUsersForAssignment(
  params: SearchUsersParams,
): Promise<UserSearchResult[]> {
  const { data, error } = await supabase.rpc("search_users_for_assignment", {
    p_search_term: params.searchTerm || "",
    p_roles: params.roles || null,
    p_approval_status: params.approvalStatus ?? "approved",
    p_exclude_ids: params.excludeIds || null,
    p_limit: params.limit || 15,
  });

  if (error) {
    console.error("Error searching users:", error);
    throw new Error(`Failed to search users: ${error.message}`);
  }

  // Map the response to ensure consistent typing
  // The RPC returns properly typed data from database.types.ts
  return (data || []).map(
    (user: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      roles: string[];
      agent_status: string;
    }) => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      roles: user.roles || [],
      agent_status: user.agent_status,
    }),
  );
}

/**
 * Get display name for a user (first_name + last_name or email fallback)
 */
export function getUserDisplayName(user: UserSearchResult): string {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : user.email;
}
