// src/hooks/commissions/useUserCommissionProfile.ts

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { commissionRateService } from '../../services/commissions/commissionRateService';
import { UserCommissionProfile } from '../../types/product.types';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Hook to get user's commission rate profile
 * Calculates weighted average commission rate based on:
 * - User's contract level
 * - Historical sales product mix (premium-weighted)
 * - Commission rates from comp_guide table
 *
 * @param lookbackMonths - How many months of sales history to analyze (default: 12)
 * @returns TanStack Query result with UserCommissionProfile
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data: profile, isLoading } = useUserCommissionProfile();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!profile) return <Alert>No commission data</Alert>;
 *
 *   return (
 *     <div>
 *       <p>Your avg commission rate: {(profile.recommendedRate * 100).toFixed(1)}%</p>
 *       <p>Data quality: {profile.dataQuality}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserCommissionProfile(
  lookbackMonths: number = 12
): UseQueryResult<UserCommissionProfile, Error> {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-commission-profile', user?.id, lookbackMonths],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return commissionRateService.getUserCommissionProfile(user.id, lookbackMonths);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 60, // 1 hour - calculations don't change frequently
    gcTime: 1000 * 60 * 60 * 24, // 24 hours - keep in cache for a day
    retry: 1, // Retry once on failure
    throwOnError: false, // Don't throw, let component handle error state
  });
}

/**
 * Hook to get just the recommended commission rate (convenience wrapper)
 *
 * @param lookbackMonths - Lookback period (default: 12)
 * @returns Commission rate as decimal (e.g., 0.85) or null if loading/error
 *
 * @example
 * ```tsx
 * function TargetsCalculator() {
 *   const commissionRate = useRecommendedCommissionRate();
 *
 *   if (!commissionRate) return <Skeleton />;
 *
 *   const projectedIncome = annualPremium * commissionRate;
 *   return <p>Projected: ${projectedIncome}</p>;
 * }
 * ```
 */
export function useRecommendedCommissionRate(lookbackMonths: number = 12): number | null {
  const { data: profile } = useUserCommissionProfile(lookbackMonths);
  return profile?.recommendedRate ?? null;
}

/**
 * Hook to check if user has good commission data quality
 *
 * @returns true if data quality is HIGH or MEDIUM, false otherwise
 *
 * @example
 * ```tsx
 * function TargetsPage() {
 *   const hasGoodData = useHasGoodCommissionData();
 *
 *   return (
 *     <div>
 *       {!hasGoodData && (
 *         <Alert variant="warning">
 *           Limited sales history. Commission rates may be less accurate.
 *         </Alert>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useHasGoodCommissionData(): boolean {
  const { data: profile } = useUserCommissionProfile();
  return profile?.dataQuality === 'HIGH' || profile?.dataQuality === 'MEDIUM';
}
