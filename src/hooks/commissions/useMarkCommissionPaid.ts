// src/hooks/commissions/useMarkCommissionPaid.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { commissionService } from "../../services/commissions/commissionService";
import { Commission } from "../../types/commission.types";

interface MarkCommissionPaidVariables {
  commissionId: string;
  paymentDate?: Date;
}

/**
 * Hook to mark an earned commission as paid
 *
 * Validates that commission is in 'earned' status before marking as paid.
 * Automatically invalidates queries on success.
 *
 * @returns TanStack Query mutation result
 *
 * @example
 * ```tsx
 * const { mutate: markAsPaid, isPending } = useMarkCommissionPaid();
 *
 * const handleMarkPaid = (commissionId: string) => {
 *   markAsPaid({ commissionId });
 * };
 * ```
 */
export const useMarkCommissionPaid = () => {
  const queryClient = useQueryClient();

  return useMutation<Commission, Error, MarkCommissionPaidVariables>({
    mutationFn: async ({
      commissionId,
      paymentDate,
    }: MarkCommissionPaidVariables) => {
      return await commissionService.markAsPaid(commissionId, paymentDate);
    },

    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      queryClient.invalidateQueries({ queryKey: ["commission", data.id] });
      queryClient.invalidateQueries({ queryKey: ["policies"] });

      // Show success toast
      toast.success(
        `Commission marked as paid${data.paymentDate ? ` on ${new Date(data.paymentDate).toLocaleDateString()}` : ""}`,
      );
    },

    onError: (error: Error) => {
      // Show error toast
      toast.error(`Failed to mark commission as paid: ${error.message}`);
      console.error("Error marking commission as paid:", error);
    },

    // Retry logic
    retry: false, // Don't retry on validation errors
  });
};
