// src/features/recruiting/hooks/useRecruits.ts
import { useQuery } from "@tanstack/react-query";
import { recruitingService } from "@/services/recruiting";
import type { RecruitFilters } from "@/types/recruiting.types";

interface UseRecruitsOptions {
  enabled?: boolean;
}

export function useRecruits(
  filters?: RecruitFilters,
  page = 1,
  limit = 50,
  options?: UseRecruitsOptions,
) {
  return useQuery({
    queryKey: ["recruits", filters, page, limit],
    queryFn: () => recruitingService.getRecruits(filters, page, limit),
    enabled: options?.enabled ?? true,
  });
}

export function useRecruitById(id: string) {
  return useQuery({
    queryKey: ["recruits", id],
    queryFn: () => recruitingService.getRecruitById(id),
    enabled: !!id,
  });
}

export function useRecruitingStats(recruiterId?: string) {
  return useQuery({
    queryKey: ["recruiting-stats", recruiterId],
    queryFn: () => recruitingService.getRecruitingStats(recruiterId),
  });
}

export function useSearchRecruits(searchTerm: string, enabled = true) {
  return useQuery({
    queryKey: ["recruits-search", searchTerm],
    queryFn: () => recruitingService.searchRecruits(searchTerm),
    enabled: enabled && searchTerm.length > 0,
  });
}
