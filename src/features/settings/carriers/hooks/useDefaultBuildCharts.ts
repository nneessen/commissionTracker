// src/features/settings/carriers/hooks/useDefaultBuildCharts.ts
// Hook for fetching default build charts for multiple carriers - used by RecommendationsStep

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";
import type { BuildTableData } from "@/features/underwriting/types/build-table.types";
import { buildChartKeys } from "./useCarrierBuildCharts";

interface DefaultBuildChartResult {
  carrierId: string;
  buildData: BuildTableData;
}

async function fetchDefaultBuildCharts(
  carrierIds: string[],
): Promise<DefaultBuildChartResult[]> {
  if (carrierIds.length === 0) {
    return [];
  }

  // Fetch default build charts for each carrier
  // If no explicit default, get the first one created
  const { data, error } = await supabase
    .from("carrier_build_charts")
    .select("carrier_id, build_data, is_default, created_at")
    .in("carrier_id", carrierIds)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching default build charts:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Group by carrier and take the first (which will be default if exists, or oldest)
  const byCarrier = new Map<string, DefaultBuildChartResult>();
  for (const row of data) {
    if (!byCarrier.has(row.carrier_id)) {
      byCarrier.set(row.carrier_id, {
        carrierId: row.carrier_id,
        buildData: (row.build_data as BuildTableData) || [],
      });
    }
  }

  return Array.from(byCarrier.values());
}

/**
 * Hook to fetch default build charts for multiple carriers.
 * Returns a Map<carrierId, BuildTableData> for easy lookup.
 * Used by RecommendationsStep to show build rating comparisons.
 */
export function useDefaultBuildCharts(carrierIds: string[]) {
  return useQuery({
    queryKey: buildChartKeys.defaults(carrierIds),
    queryFn: () => fetchDefaultBuildCharts(carrierIds),
    enabled: carrierIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data): Map<string, BuildTableData> => {
      const map = new Map<string, BuildTableData>();
      for (const item of data) {
        map.set(item.carrierId, item.buildData);
      }
      return map;
    },
  });
}
