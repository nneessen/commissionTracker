// src/features/training-modules/hooks/useTrainingModules.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainingModuleService } from "../services/trainingModuleService";
import type {
  CreateModuleInput,
  UpdateModuleInput,
} from "../types/training-module.types";
import { useAuth } from "@/contexts/AuthContext";
import { useImo } from "@/contexts/ImoContext";
import { toast } from "sonner";

export const trainingModuleKeys = {
  all: ["training-modules"] as const,
  lists: () => [...trainingModuleKeys.all, "list"] as const,
  list: (filters?: Record<string, unknown>) =>
    [...trainingModuleKeys.lists(), filters] as const,
  details: () => [...trainingModuleKeys.all, "detail"] as const,
  detail: (id: string) => [...trainingModuleKeys.details(), id] as const,
  count: () => [...trainingModuleKeys.all, "count"] as const,
};

export function useTrainingModules(filters?: {
  category?: string;
  search?: string;
  publishedOnly?: boolean;
  agencyId?: string;
}) {
  return useQuery({
    queryKey: trainingModuleKeys.list(filters),
    queryFn: () => trainingModuleService.list(filters),
    staleTime: 1000 * 60 * 2,
  });
}

export function useTrainingModule(id: string | undefined) {
  return useQuery({
    queryKey: trainingModuleKeys.detail(id!),
    queryFn: () => trainingModuleService.getById(id!),
    enabled: !!id,
  });
}

export function useTrainingModuleCount() {
  return useQuery({
    queryKey: trainingModuleKeys.count(),
    queryFn: () => trainingModuleService.getCount(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateTrainingModule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { imo } = useImo();

  return useMutation({
    mutationFn: (input: CreateModuleInput) => {
      if (!user?.id || !imo?.id) throw new Error("Not authenticated");
      return trainingModuleService.create(input, user.id, imo.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingModuleKeys.all });
      toast.success("Module created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateTrainingModule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateModuleInput }) => {
      if (!user?.id) throw new Error("Not authenticated");
      return trainingModuleService.update(id, input, user.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trainingModuleKeys.all });
      queryClient.setQueryData(trainingModuleKeys.detail(data.id), data);
      toast.success("Module updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function usePublishTrainingModule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      return trainingModuleService.publish(id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingModuleKeys.all });
      toast.success("Module published");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteTrainingModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => trainingModuleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trainingModuleKeys.all });
      toast.success("Module deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
