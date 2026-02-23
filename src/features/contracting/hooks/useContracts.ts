// src/features/contracting/hooks/useContracts.ts
// React Query hooks for carrier contracts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  contractingService,
  type ContractFilters,
} from "../services/contractingService";
import type { Database } from "@/types/database.types";
import { toast } from "sonner";

type CarrierContractInsert =
  Database["public"]["Tables"]["carrier_contracts"]["Insert"];
type CarrierContractUpdate =
  Database["public"]["Tables"]["carrier_contracts"]["Update"];

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
