// src/features/the-standard-team/hooks/useAgentWritingNumbers.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import type { Database } from "@/types/database.types";

type AgentWritingNumber =
  Database["public"]["Tables"]["agent_writing_numbers"]["Row"];

export const agentWritingNumbersQueryKeys = {
  all: ["agent-writing-numbers"] as const,
  byAgents: (agentIds: string[]) =>
    [
      ...agentWritingNumbersQueryKeys.all,
      "by-agents",
      ...[...agentIds].sort(),
    ] as const,
};

/**
 * Fetches writing numbers for multiple agents
 */
export function useAgentWritingNumbers(
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
    queryKey: agentWritingNumbersQueryKeys.byAgents(agentIds),
    queryFn: async () => {
      if (agentIds.length === 0) return [];

      const { data, error } = await supabase
        .from("agent_writing_numbers")
        .select("*")
        .in("agent_id", agentIds)
        .eq("status", "active");

      if (error) {
        throw new Error(error.message);
      }

      return data as AgentWritingNumber[];
    },
    enabled: enabled && agentIds.length > 0,
    staleTime,
    gcTime,
  });
}

interface UpsertWritingNumberParams {
  agentId: string;
  carrierId: string;
  writingNumber: string;
  existingId?: string;
}

/**
 * Upserts (creates or updates) an agent writing number
 */
export function useUpsertWritingNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentId,
      carrierId,
      writingNumber,
      existingId,
    }: UpsertWritingNumberParams) => {
      if (existingId) {
        // Update existing
        const { data, error } = await supabase
          .from("agent_writing_numbers")
          .update({
            writing_number: writingNumber,
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
          .from("agent_writing_numbers")
          .insert({
            agent_id: agentId,
            carrier_id: carrierId,
            writing_number: writingNumber,
            status: "active",
          })
          .select()
          .single();

        if (error) throw new Error(error.message);
        return data;
      }
    },
    onSuccess: () => {
      // Invalidate all writing numbers queries to refresh data
      queryClient.invalidateQueries({
        queryKey: agentWritingNumbersQueryKeys.all,
      });
    },
  });
}

/**
 * Deletes (or deactivates) an agent writing number
 */
export function useDeleteWritingNumber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting status to inactive
      const { error } = await supabase
        .from("agent_writing_numbers")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: agentWritingNumbersQueryKeys.all,
      });
    },
  });
}
