// src/features/recruiting/hooks/useRecruitActivity.ts
import { useQuery } from "@tanstack/react-query";
import { recruitingService } from "@/services/recruiting";

/**
 * Validates that a string is a valid UUID format.
 * Prevents invalid IDs (like "invitation-{uuid}") from being used in database queries.
 */
const isValidUuid = (id: string | undefined): boolean => {
  if (!id) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export function useRecruitActivityLog(
  recruitId: string | undefined,
  limit = 50,
) {
  return useQuery({
    queryKey: ["recruits", recruitId, "activity", limit],
    queryFn: () => recruitingService.getRecruitActivityLog(recruitId!, limit),
    enabled: !!recruitId && isValidUuid(recruitId),
  });
}
