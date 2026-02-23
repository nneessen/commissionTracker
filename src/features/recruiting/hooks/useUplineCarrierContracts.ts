// src/features/recruiting/hooks/useUplineCarrierContracts.ts
import { useQuery } from "@tanstack/react-query";

import { contractingService } from "@/features/contracting/services/contractingService";

export function useUplineCarrierContracts(uplineId: string | undefined | null) {
  return useQuery({
    queryKey: ["upline-carrier-contracts", uplineId],
    queryFn: () => contractingService.getActiveCarrierIds(uplineId!),
    enabled: !!uplineId,
  });
}
