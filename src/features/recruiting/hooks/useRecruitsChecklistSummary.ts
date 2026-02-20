// src/features/recruiting/hooks/useRecruitsChecklistSummary.ts

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/base/supabase";

export interface ChecklistSummary {
  totalItems: number;
  completedItems: number;
  isLastItem: boolean;
}

/**
 * Fetches checklist progress for multiple recruits at once.
 * Returns a Map keyed by user_id with their checklist completion summary.
 */
export function useRecruitsChecklistSummary(recruitIds: string[]) {
  return useQuery({
    queryKey: ["recruits-checklist-summary", recruitIds],
    queryFn: async (): Promise<Map<string, ChecklistSummary>> => {
      if (recruitIds.length === 0) return new Map();

      const { data, error } = await supabase.rpc(
        "get_recruits_checklist_summary",
        { recruit_ids: recruitIds },
      );

      if (error) throw error;

      const map = new Map<string, ChecklistSummary>();
      if (data) {
        for (const row of data) {
          map.set(row.user_id, {
            totalItems: row.total_items,
            completedItems: row.completed_items,
            isLastItem: row.is_last_item,
          });
        }
      }
      return map;
    },
    enabled: recruitIds.length > 0,
    staleTime: 30_000,
  });
}
