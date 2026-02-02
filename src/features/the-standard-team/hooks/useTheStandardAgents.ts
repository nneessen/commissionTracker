// src/features/the-standard-team/hooks/useTheStandardAgents.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";

// The Standard agency ID
export const THE_STANDARD_AGENCY_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

export interface TheStandardAgent {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  agency_id: string | null;
}

export const theStandardAgentsQueryKeys = {
  all: ["the-standard-agents"] as const,
  list: () => [...theStandardAgentsQueryKeys.all, "list"] as const,
};

/**
 * Fetches all agents belonging to The Standard agency
 * Uses RLS policy "agency_members_can_view_same_agency" for access
 */
export function useTheStandardAgents(options?: {
  enabled?: boolean;
  staleTime?: number;
}) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options || {};

  return useQuery({
    queryKey: theStandardAgentsQueryKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, email, agency_id")
        .eq("agency_id", THE_STANDARD_AGENCY_ID)
        .eq("approval_status", "approved")
        .is("archived_at", null)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as TheStandardAgent[];
    },
    enabled,
    staleTime,
  });
}
