// src/features/the-standard-team/hooks/useAgentStateLicenses.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";

export interface AgentStateLicense {
  id: string;
  agent_id: string;
  state_code: string;
  is_licensed: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export const agentStateLicensesQueryKeys = {
  all: ["agent-state-licenses"] as const,
  byAgents: (agentIds: string[]) =>
    [
      ...agentStateLicensesQueryKeys.all,
      "by-agents",
      ...[...agentIds].sort(),
    ] as const,
};

/**
 * Fetches state licenses for multiple agents
 */
export function useAgentStateLicenses(
  agentIds: string[],
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
  },
) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000,
    gcTime = 20 * 60 * 1000,
  } = options || {};

  return useQuery({
    queryKey: agentStateLicensesQueryKeys.byAgents(agentIds),
    queryFn: async () => {
      if (agentIds.length === 0) return [];

      const { data, error } = await supabase
        .from("agent_state_licenses")
        .select("*")
        .in("agent_id", agentIds);

      if (error) {
        throw new Error(error.message);
      }

      return data as AgentStateLicense[];
    },
    enabled: enabled && agentIds.length > 0,
    staleTime,
    gcTime,
  });
}

interface ToggleStateLicenseParams {
  agentId: string;
  stateCode: string;
  isLicensed: boolean;
  existingId?: string;
}

/**
 * Toggles a state license for an agent (creates or updates)
 */
export function useToggleStateLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentId,
      stateCode,
      isLicensed,
      existingId,
    }: ToggleStateLicenseParams) => {
      if (existingId) {
        // Update existing
        const { data, error } = await supabase
          .from("agent_state_licenses")
          .update({
            is_licensed: isLicensed,
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
          .from("agent_state_licenses")
          .insert({
            agent_id: agentId,
            state_code: stateCode,
            is_licensed: isLicensed,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: agentStateLicensesQueryKeys.all,
      });
    },
  });
}
