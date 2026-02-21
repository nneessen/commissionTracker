// src/features/recruiting/hooks/useRecruitCarrierContracts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { carrierContractRequestService } from "@/services/recruiting/carrierContractRequestService";
import { toast } from "sonner";

/** Unified query key — shared with CarrierContractingItem.tsx */
const contractsKey = (recruitId: string | undefined) =>
  ["recruit-carrier-contracts", recruitId] as const;

export function useRecruitCarrierContracts(recruitId: string | undefined) {
  return useQuery({
    queryKey: contractsKey(recruitId),
    queryFn: () =>
      carrierContractRequestService.getRecruitContractRequests(recruitId!),
    enabled: !!recruitId,
    staleTime: 30_000,
  });
}

export function useUpdateCarrierContract(recruitId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Record<string, unknown>;
    }) => carrierContractRequestService.updateContractRequest(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractsKey(recruitId) });
      queryClient.invalidateQueries({
        queryKey: ["contract-requests-filtered"],
      });
      toast.success("Contract request updated");
    },
    onError: (error) => {
      toast.error("Failed to update contract request");
      console.error(error);
    },
  });
}

export function useAddCarrierContract(recruitId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (carrierId: string) =>
      carrierContractRequestService.createContractRequest({
        recruit_id: recruitId!,
        carrier_id: carrierId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractsKey(recruitId) });
      queryClient.invalidateQueries({
        queryKey: ["contract-requests-filtered"],
      });
      toast.success("Carrier contract added");
    },
    onError: (error) => {
      toast.error("Failed to add carrier contract");
      console.error(error);
    },
  });
}

export function useDeleteCarrierContract(recruitId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      carrierContractRequestService.deleteContractRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractsKey(recruitId) });
      queryClient.invalidateQueries({
        queryKey: ["contract-requests-filtered"],
      });
      toast.success("Contract request deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete contract request");
      console.error(error);
    },
  });
}
