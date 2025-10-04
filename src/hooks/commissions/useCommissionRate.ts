/**
 * Hook to fetch commission rate from comp_guide table
 * Based on product_id and agent's contract_level
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/base/supabase';

export function useCommissionRate(productId?: string, contractLevel?: number) {
  return useQuery({
    queryKey: ['commission-rate', productId, contractLevel],
    queryFn: async () => {
      if (!productId || !contractLevel) return null;

      const { data, error } = await supabase
        .from('comp_guide')
        .select('commission_percentage')
        .eq('product_id', productId)
        .eq('contract_level', contractLevel)
        .lte('effective_date', new Date().toISOString())
        .or(`expiration_date.is.null,expiration_date.gte.${new Date().toISOString()}`)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching commission rate:', error);
        return null;
      }

      // Convert decimal to percentage (0.85 → 85)
      return data?.commission_percentage ? data.commission_percentage * 100 : null;
    },
    enabled: !!productId && !!contractLevel,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
