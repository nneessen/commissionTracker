// src/features/settings/carriers/hooks/useUpdateBuildChart.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBuildChart } from "@/services/settings/carriers/BuildChartService";
import { buildChartKeys } from "./useCarrierBuildCharts";
import { toast } from "sonner";
import type {
  BuildTableData,
  BmiTableData,
  BuildTableType,
} from "@/features/underwriting/types/build-table.types";

export type UpdateBuildChartInput = {
  id: string;
  carrierId: string; // For cache invalidation
  name?: string;
  tableType?: BuildTableType;
  buildData?: BuildTableData;
  bmiData?: BmiTableData | null;
  notes?: string | null;
  isDefault?: boolean;
};

/**
 * Updates an existing build chart.
 */
export function useUpdateBuildChart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBuildChartInput) => {
      const { carrierId, ...updateData } = input;
      const result = await updateBuildChart(updateData);
      return result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildChartKeys.byCarrier(variables.carrierId),
      });
      queryClient.invalidateQueries({
        queryKey: buildChartKeys.options(variables.carrierId),
      });
      queryClient.invalidateQueries({
        queryKey: buildChartKeys.single(variables.id),
      });
      toast.success("Build chart updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
