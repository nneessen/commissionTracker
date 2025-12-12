// src/hooks/reports/useReportFilterOptions.ts

import {useQuery} from '@tanstack/react-query';
import {supabase} from '../../services/base/supabase';
import {FilterOption} from '../../types/reports.types';

interface ReportFilterOptions {
  carriers: FilterOption[];
  products: FilterOption[];
  states: FilterOption[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch available filter options for reports
 * Returns carriers, products, and states that can be used to filter report data
 */
export function useReportFilterOptions(): ReportFilterOptions {
  // Fetch carriers
  const carriersQuery = useQuery<FilterOption[], Error>({
    queryKey: ['filter-options', 'carriers'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('carriers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data || []).map(c => ({ id: c.id, name: c.name }));
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch products
  const productsQuery = useQuery<FilterOption[], Error>({
    queryKey: ['filter-options', 'products'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return (data || []).map(p => ({ id: p.id, name: p.name }));
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Fetch unique states from policies
  const statesQuery = useQuery<FilterOption[], Error>({
    queryKey: ['filter-options', 'states'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get unique states from policies
      const { data, error } = await supabase
        .from('policies')
        .select('state')
        .eq('user_id', user.id)
        .not('state', 'is', null);

      if (error) throw error;

      // Extract unique states
      const uniqueStates = [...new Set((data || []).map(p => p.state).filter(Boolean))].sort();
      return uniqueStates.map(s => ({ id: s, name: s }));
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  return {
    carriers: carriersQuery.data || [],
    products: productsQuery.data || [],
    states: statesQuery.data || [],
    isLoading: carriersQuery.isLoading || productsQuery.isLoading || statesQuery.isLoading,
    error: carriersQuery.error || productsQuery.error || statesQuery.error,
  };
}
