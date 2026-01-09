// src/features/settings/carriers/hooks/useDeleteBuildChart.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteBuildChart } from "@/services/settings/carriers/BuildChartService";
import { buildChartKeys } from "./useCarrierBuildCharts";
import { toast } from "sonner";

export type DeleteBuildChartInput = {
  chartId: string;
  carrierId: string; // For cache invalidation
};

/**
 * Deletes a build chart.
 * Fails if products reference this chart.
 */
export function useDeleteBuildChart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteBuildChartInput) => {
      await deleteBuildChart(input.chartId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildChartKeys.byCarrier(variables.carrierId),
      });
      queryClient.invalidateQueries({
        queryKey: buildChartKeys.options(variables.carrierId),
      });
      toast.success("Build chart deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
