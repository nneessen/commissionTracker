import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/base/supabase';

interface CompGuideResult {
  commission_percentage: number;
  bonus_percentage: number;
}

export const useCompGuide = (productId: string, contractLevel: number) => {
  return useQuery({
    queryKey: ['comp_guide', productId, contractLevel],
    queryFn: async (): Promise<CompGuideResult | null> => {
      if (!productId || !contractLevel) return null;

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('comp_guide')
        .select('commission_percentage, bonus_percentage')
        .eq('product_id', productId)
        .eq('contract_level', contractLevel)
        .lte('effective_date', today)
        .or(`expiration_date.is.null,expiration_date.gte.${today}`)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('comp_guide query error:', error);
        return null;
      }

      return data;
    },
    enabled: !!productId && !!contractLevel,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
