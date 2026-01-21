// src/hooks/clients/useCreateOrFindClient.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clientService } from "@/services/clients";
import type { Client, CreateClientData } from "@/types/client.types";
import { clientHierarchyKeys } from "./useDownlineClients";

interface CreateOrFindClientParams {
  clientData: Omit<CreateClientData, "user_id">;
  userId: string;
}

/**
 * Hook to create or find a client by name
 */
export function useCreateOrFindClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      clientData,
      userId,
    }: CreateOrFindClientParams): Promise<Client> => {
      const result = await clientService.createOrFind(clientData, userId);
      if (!result.success || !result.data) {
        throw result.error || new Error("Failed to create/find client");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientHierarchyKeys.all });
    },
  });
}
