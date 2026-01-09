// src/features/settings/carriers/hooks/useCreateBuildChart.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useImo } from "@/contexts/ImoContext";
import { createBuildChart } from "@/services/settings/carriers/BuildChartService";
import { buildChartKeys } from "./useCarrierBuildCharts";
import { toast } from "sonner";
import type {
  BuildTableData,
  BmiTableData,
  BuildTableType,
} from "@/features/underwriting/types/build-table.types";

export type CreateBuildChartInput = {
  carrierId: string;
  name: string;
  tableType: BuildTableType;
  buildData: BuildTableData;
  bmiData?: BmiTableData | null;
  notes?: string | null;
  isDefault?: boolean;
};

/**
 * Creates a new build chart for a carrier.
 */
export function useCreateBuildChart() {
  const queryClient = useQueryClient();
  const { imo } = useImo();

  return useMutation({
    mutationFn: async (input: CreateBuildChartInput) => {
      if (!imo?.id) {
        throw new Error("IMO context not available");
      }

      const result = await createBuildChart({
        ...input,
        imoId: imo.id,
      });

      return result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: buildChartKeys.byCarrier(variables.carrierId),
      });
      queryClient.invalidateQueries({
        queryKey: buildChartKeys.options(variables.carrierId),
      });
      toast.success("Build chart created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
