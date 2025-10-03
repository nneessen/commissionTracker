import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/base/supabase';
import { Product } from '../../types/product.types';

/**
 * Hook to fetch products with optional filtering by carrier
 */
export function useProducts(carrierId?: string) {
  return useQuery({
    queryKey: ['products', carrierId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (carrierId) {
        query = query.eq('carrier_id', carrierId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []) as Product[];
    },
    enabled: !!carrierId, // Only run query when carrierId is provided
    staleTime: 1000 * 60 * 15, // 15 minutes (products don't change often)
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to get commission rate for a specific product
 */
export function useProductCommission(productId?: string) {
  return useQuery({
    queryKey: ['product-commission', productId],
    queryFn: async () => {
      if (!productId) return null;

      const { data, error } = await supabase
        .from('products')
        .select('commission_percentage')
        .eq('id', productId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data?.commission_percentage ? data.commission_percentage * 100 : null;
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}