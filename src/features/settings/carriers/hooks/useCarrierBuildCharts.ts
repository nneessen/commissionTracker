// src/features/settings/carriers/hooks/useCarrierBuildCharts.ts

import { useQuery } from "@tanstack/react-query";
import { useImo } from "@/contexts/ImoContext";
import { fetchBuildChartsByCarrier } from "@/services/settings/carriers/BuildChartService";
import type { BuildChartDisplay } from "@/features/underwriting/types/build-table.types";

export const buildChartKeys = {
  all: ["buildCharts"] as const,
  byCarrier: (carrierId: string) =>
    [...buildChartKeys.all, "carrier", carrierId] as const,
  options: (carrierId: string) =>
    [...buildChartKeys.all, "options", carrierId] as const,
  single: (chartId: string) =>
    [...buildChartKeys.all, "single", chartId] as const,
  defaults: (carrierIds: string[]) =>
    [...buildChartKeys.all, "defaults", ...carrierIds.sort()] as const,
};

/**
 * Fetches all build charts for a specific carrier.
 * Returns display-ready data with carrier name included.
 */
export function useCarrierBuildCharts(carrierId: string | null | undefined) {
  const { imo } = useImo();
  const imoId = imo?.id;

  return useQuery<BuildChartDisplay[]>({
    queryKey: buildChartKeys.byCarrier(carrierId || ""),
    queryFn: () => fetchBuildChartsByCarrier(carrierId!, imoId!),
    enabled: !!carrierId && !!imoId,
    staleTime: 5 * 60 * 1000,
  });
}
