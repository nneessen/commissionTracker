// src/features/messages/hooks/useLabels.ts
// Hook for managing email labels

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  ensureSystemLabels,
} from "../services/labelService";

export type { Label } from "../services/labelService";

export function useLabels() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: labels,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["labels", user?.id],
    queryFn: async () => {
      // Ensure system labels exist
      await ensureSystemLabels(user!.id);
      return getLabels(user!.id);
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });

  const createMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string }) =>
      createLabel({ userId: user!.id, name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      labelId,
      name,
      color,
    }: {
      labelId: string;
      name?: string;
      color?: string;
    }) => updateLabel(user!.id, { labelId, name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (labelId: string) => deleteLabel(user!.id, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labels"] });
      queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
  });

  return {
    labels: labels || [],
    systemLabels: labels?.filter((l) => l.is_system) || [],
    customLabels: labels?.filter((l) => !l.is_system) || [],
    isLoading,
    error,
    refetch,
    createLabel: (name: string, color?: string) =>
      createMutation.mutateAsync({ name, color }),
    updateLabel: (labelId: string, name?: string, color?: string) =>
      updateMutation.mutateAsync({ labelId, name, color }),
    deleteLabel: (labelId: string) => deleteMutation.mutateAsync(labelId),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
