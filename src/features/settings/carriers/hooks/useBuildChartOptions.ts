// src/features/settings/carriers/hooks/useBuildChartOptions.ts

import { useQuery } from "@tanstack/react-query";
import { useImo } from "@/contexts/ImoContext";
import { fetchBuildChartOptions } from "@/services/settings/carriers/BuildChartService";
import { buildChartKeys } from "./useCarrierBuildCharts";
import type { BuildChartOption } from "@/features/underwriting/types/build-table.types";

/**
 * Fetches build chart options for a carrier (for select dropdowns).
 * Returns minimal data needed for selection UI.
 */
export function useBuildChartOptions(carrierId: string | null | undefined) {
  const { imo } = useImo();
  const imoId = imo?.id;

  return useQuery<BuildChartOption[]>({
    queryKey: buildChartKeys.options(carrierId || ""),
    queryFn: () => fetchBuildChartOptions(carrierId!, imoId!),
    enabled: !!carrierId && !!imoId,
    staleTime: 5 * 60 * 1000,
  });
}
