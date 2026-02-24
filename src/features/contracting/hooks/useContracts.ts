// src/features/contracting/hooks/useContracts.ts
// React Query hooks for carrier contracts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  contractingService,
  type ContractFilters,
  type AgentContractToggleCarrier,
  type VisibleAgentCarrierContract,
} from "../services/contractingService";
import type { Database } from "@/types/database.types";
import { toast } from "sonner";

type CarrierContractInsert =
  Database["public"]["Tables"]["carrier_contracts"]["Insert"];
type CarrierContractUpdate =
  Database["public"]["Tables"]["carrier_contracts"]["Update"];

export const agentContractPanelKeys = {
  all: ["agent-contract-panel"] as const,
  carriers: (agentId: string) =>
    [...agentContractPanelKeys.all, "carriers", agentId] as const,
  contracts: (agentId: string) =>
    [...agentContractPanelKeys.all, "contracts", agentId] as const,
};

export function useContracts(filters?: ContractFilters, page = 1, limit = 50) {
  return useQuery({
    queryKey: ["contracts", filters, page, limit],
    queryFn: () => contractingService.getContracts(filters, page, limit),
  });
}

export function useContractById(id: string) {
  return useQuery({
    queryKey: ["contracts", id],
    queryFn: () => contractingService.getContractById(id),
    enabled: !!id,
  });
}

export function useContractStats() {
  return useQuery({
    queryKey: ["contract-stats"],
    queryFn: () => contractingService.getContractStats(),
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contract: CarrierContractInsert) =>
      contractingService.createContract(contract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contract-stats"] });
      toast.success("Contract created successfully");
    },
    onError: (error) => {
      console.error("Error creating contract:", error);
      toast.error("Failed to create contract");
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: CarrierContractUpdate;
    }) => contractingService.updateContract(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contracts", data.id] });
      queryClient.invalidateQueries({ queryKey: ["contract-stats"] });
      toast.success("Contract updated successfully");
    },
    onError: (error) => {
      console.error("Error updating contract:", error);
      toast.error("Failed to update contract");
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contractingService.deleteContract(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["contract-stats"] });
      toast.success("Contract deleted successfully");
    },
    onError: (error) => {
      console.error("Error deleting contract:", error);
      toast.error("Failed to delete contract");
    },
  });
}

export function useAgentContracts(agentId: string | undefined) {
  return useQuery({
    queryKey: ["agent-contracts", agentId],
    queryFn: () => contractingService.getContractsByAgentId(agentId!),
    enabled: !!agentId,
  });
}

export function useAgentContractToggleCarriers(agentId: string | undefined) {
  return useQuery<AgentContractToggleCarrier[]>({
    queryKey: agentId
      ? agentContractPanelKeys.carriers(agentId)
      : ["agent-contract-panel", "carriers", "none"],
    queryFn: () => contractingService.getActiveCarriersForAgent(agentId!),
    enabled: !!agentId,
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });
}

export function useVisibleAgentContracts(agentId: string | undefined) {
  return useQuery<VisibleAgentCarrierContract[]>({
    queryKey: agentId
      ? agentContractPanelKeys.contracts(agentId)
      : ["agent-contract-panel", "contracts", "none"],
    queryFn: () => contractingService.getVisibleAgentContracts(agentId!),
    enabled: !!agentId,
    staleTime: 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });
}

export function useToggleAgentContract(agentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      carrierId,
      active,
    }: {
      carrierId: string;
      active: boolean;
    }) => contractingService.toggleContract(carrierId, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-contracts", agentId] });
      queryClient.invalidateQueries({
        queryKey: ["upline-carrier-contracts", agentId],
      });
      toast.success("Carrier contract updated");
    },
    onError: (error) => {
      console.error("Error toggling contract:", error);
      toast.error("Failed to update carrier contract");
    },
  });
}

export function useToggleVisibleAgentContract(agentId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      carrierId,
      active,
    }: {
      carrierId: string;
      active: boolean;
    }) =>
      contractingService.toggleVisibleAgentContract(
        agentId!,
        carrierId,
        active,
      ),
    onSuccess: () => {
      if (!agentId) return;

      queryClient.invalidateQueries({
        queryKey: agentContractPanelKeys.contracts(agentId),
      });
      queryClient.invalidateQueries({
        queryKey: ["agent-contracts", agentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["upline-carrier-contracts", agentId],
      });
      toast.success("Carrier contract updated");
    },
    onError: (error) => {
      console.error("Error toggling visible agent contract:", error);
      toast.error("Failed to update carrier contract");
    },
  });
}
