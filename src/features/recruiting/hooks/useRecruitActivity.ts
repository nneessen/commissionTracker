// src/features/recruiting/hooks/useRecruitActivity.ts
import {useQuery} from '@tanstack/react-query';
import {recruitingService} from '@/services/recruiting';

export function useRecruitActivityLog(recruitId: string, limit = 50) {
  return useQuery({
    queryKey: ['recruits', recruitId, 'activity', limit],
    queryFn: () => recruitingService.getRecruitActivityLog(recruitId, limit),
    enabled: !!recruitId,
  });
}
