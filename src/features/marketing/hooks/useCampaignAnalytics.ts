import { useQuery } from "@tanstack/react-query";
import {
  getOverallMetrics,
  getCampaignMetrics,
  getRecentCampaigns,
} from "../services/marketingAnalyticsService";

export function useOverallMetrics(from?: string, to?: string) {
  return useQuery({
    queryKey: ["marketing-analytics", "overall", from, to],
    queryFn: () => getOverallMetrics(from, to),
  });
}

export function useCampaignMetrics(campaignId: string | null) {
  return useQuery({
    queryKey: ["marketing-analytics", "campaign", campaignId],
    queryFn: () => getCampaignMetrics(campaignId!),
    enabled: !!campaignId,
  });
}

export function useRecentCampaigns(limit = 10, from?: string, to?: string) {
  return useQuery({
    queryKey: ["marketing-analytics", "recent", limit, from, to],
    queryFn: () => getRecentCampaigns(limit, from, to),
  });
}
