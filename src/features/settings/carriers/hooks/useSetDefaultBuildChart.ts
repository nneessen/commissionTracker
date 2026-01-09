// src/features/settings/carriers/hooks/useSetDefaultBuildChart.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useImo } from "@/contexts/ImoContext";
import { setDefaultBuildChart } from "@/services/settings/carriers/BuildChartService";
import { buildChartKeys } from "./useCarrierBuildCharts";
import { toast } from "sonner";

export type SetDefaultBuildChartInput = {
  chartId: string;
  carrierId: string;
};

/**
 * Sets a build chart as the default for its carrier.
 * Unsets all other charts for that carrier.
 */
export function useSetDefaultBuildChart() {
  const queryClient = useQueryClient();
  const { imo } = useImo();

  return useMutation({
    mutationFn: async (input: SetDefaultBuildChartInput) => {
      if (!imo?.id) {
        throw new Error("IMO context not available");
      }

      const result = await setDefaultBuildChart(
        input.chartId,
        input.carrierId,
        imo.id,
      );

      return result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildChartKeys.byCarrier(variables.carrierId),
      });
      queryClient.invalidateQueries({
        queryKey: buildChartKeys.options(variables.carrierId),
      });
      toast.success("Default build chart updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
