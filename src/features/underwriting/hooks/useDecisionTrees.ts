// src/features/underwriting/hooks/useDecisionTrees.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { decisionTreeRepository } from "@/services/underwriting/DecisionTreeRepository";
import type {
  DecisionTree,
  DecisionTreeRules,
} from "../types/underwriting.types";
import { toast } from "sonner";

export const decisionTreeQueryKeys = {
  all: ["decision-trees"] as const,
  list: (imoId: string) =>
    [...decisionTreeQueryKeys.all, "list", imoId] as const,
  detail: (id: string) => [...decisionTreeQueryKeys.all, "detail", id] as const,
  active: (imoId: string) =>
    [...decisionTreeQueryKeys.all, "active", imoId] as const,
};

/**
 * Fetch all decision trees for the current IMO
 */
export function useDecisionTrees() {
  const { user } = useAuth();
  const imoId = user?.imo_id;

  return useQuery({
    queryKey: decisionTreeQueryKeys.list(imoId || ""),
    queryFn: async (): Promise<DecisionTree[]> => {
      if (!imoId) throw new Error("No IMO ID available");
      return decisionTreeRepository.findByImoId(imoId);
    },
    enabled: !!imoId,
  });
}

/**
 * Fetch a single decision tree by ID
 */
export function useDecisionTree(id: string | undefined) {
  return useQuery({
    queryKey: decisionTreeQueryKeys.detail(id || ""),
    queryFn: async (): Promise<DecisionTree | null> => {
      if (!id) return null;
      return decisionTreeRepository.findTreeById(id);
    },
    enabled: !!id,
  });
}

/**
 * Fetch the active (default) decision tree for the current IMO
 */
export function useActiveDecisionTree() {
  const { user } = useAuth();
  const imoId = user?.imo_id;

  return useQuery({
    queryKey: decisionTreeQueryKeys.active(imoId || ""),
    queryFn: async (): Promise<DecisionTree | null> => {
      if (!imoId) return null;
      return decisionTreeRepository.findActiveDefault(imoId);
    },
    enabled: !!imoId,
  });
}

interface CreateDecisionTreeInput {
  name: string;
  description?: string;
  rules: DecisionTreeRules;
  isActive?: boolean;
  isDefault?: boolean;
}

/**
 * Create a new decision tree
 */
export function useCreateDecisionTree() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: CreateDecisionTreeInput,
    ): Promise<DecisionTree> => {
      if (!user?.imo_id) throw new Error("No IMO ID available");
      if (!user?.id) throw new Error("No user ID available");

      return decisionTreeRepository.createTree({
        imoId: user.imo_id,
        createdBy: user.id,
        name: input.name,
        description: input.description || null,
        rules: input.rules,
        isActive: input.isActive ?? true,
        isDefault: input.isDefault ?? false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: decisionTreeQueryKeys.all,
      });
      toast.success("Decision tree created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create decision tree: ${error.message}`);
    },
  });
}

interface UpdateDecisionTreeInput {
  id: string;
  name?: string;
  description?: string;
  rules?: DecisionTreeRules;
  isActive?: boolean;
  isDefault?: boolean;
}

/**
 * Update an existing decision tree
 */
export function useUpdateDecisionTree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: UpdateDecisionTreeInput,
    ): Promise<DecisionTree> => {
      return decisionTreeRepository.updateTree(input.id, {
        name: input.name,
        description: input.description,
        rules: input.rules,
        isActive: input.isActive,
        isDefault: input.isDefault,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: decisionTreeQueryKeys.all,
      });
      queryClient.setQueryData(decisionTreeQueryKeys.detail(data.id), data);
      toast.success("Decision tree updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update decision tree: ${error.message}`);
    },
  });
}

/**
 * Delete a decision tree
 */
export function useDeleteDecisionTree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return decisionTreeRepository.deleteTree(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: decisionTreeQueryKeys.all,
      });
      toast.success("Decision tree deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete decision tree: ${error.message}`);
    },
  });
}

/**
 * Set a decision tree as the default
 * Uses atomic RPC function to prevent race conditions
 */
export function useSetDefaultDecisionTree() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!user?.imo_id) throw new Error("No IMO ID available");
      return decisionTreeRepository.setDefault(id, user.imo_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: decisionTreeQueryKeys.all,
      });
      toast.success("Default decision tree updated");
    },
    onError: (error) => {
      toast.error(`Failed to set default: ${error.message}`);
    },
  });
}
