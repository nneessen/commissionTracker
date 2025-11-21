// /home/nneessen/projects/commissionTracker/src/hooks/admin/useUsersView.ts
// Server-side paginated users view with filtering and sorting

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { supabase } from '../../services/base/supabase';
import { UserProfile } from '../../services/admin/userApprovalService';

export interface UserFilters {
  searchTerm?: string;
  approvalStatus?: 'pending' | 'approved' | 'denied';
}

export interface UserSortConfig {
  field: 'email' | 'approval_status' | 'created_at' | 'approved_at';
  direction: 'asc' | 'desc';
}

export interface UserMetrics {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  deniedUsers: number;
}

export function useUsersView() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState<UserFilters>({});
  const [sortConfig, setSortConfig] = useState<UserSortConfig>({
    field: 'created_at',
    direction: 'desc',
  });

  // Fetch paginated users
  const {
    data: paginatedData,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['users-paginated', currentPage, pageSize, filters, sortConfig],
    queryFn: async () => {
      let query = supabase
        .from('user_profiles')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.searchTerm) {
        query = query.ilike('email', `%${filters.searchTerm}%`);
      }
      if (filters.approvalStatus) {
        query = query.eq('approval_status', filters.approvalStatus);
      }

      // Apply sorting
      query = query.order(sortConfig.field, { ascending: sortConfig.direction === 'asc' });

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        users: (data as UserProfile[]) || [],
        totalCount: count || 0,
      };
    },
    staleTime: 30000, // 30 seconds
  });

  // Fetch overall metrics (not paginated)
  const { data: metrics } = useQuery({
    queryKey: ['users-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('approval_status');

      if (error) throw error;

      const totalUsers = data.length;
      const pendingUsers = data.filter(u => u.approval_status === 'pending').length;
      const approvedUsers = data.filter(u => u.approval_status === 'approved').length;
      const deniedUsers = data.filter(u => u.approval_status === 'denied').length;

      return {
        totalUsers,
        pendingUsers,
        approvedUsers,
        deniedUsers,
      } as UserMetrics;
    },
    staleTime: 30000,
  });

  const users = paginatedData?.users || [];
  const totalItems = paginatedData?.totalCount || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const filterCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.approvalStatus) count++;
    return count;
  }, [filters]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => goToPage(currentPage + 1);
  const previousPage = () => goToPage(currentPage - 1);

  const toggleSort = (field: UserSortConfig['field']) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1); // Reset to first page on sort change
  };

  const updateFilters = (newFilters: Partial<UserFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['users-paginated'] });
    queryClient.invalidateQueries({ queryKey: ['users-metrics'] });
  };

  const updatePageSize = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  return {
    users,
    metrics,
    isLoading,
    isFetching,
    error: error?.message,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    goToPage,
    nextPage,
    previousPage,
    setPageSize: updatePageSize,
    filters,
    setFilters: updateFilters,
    clearFilters,
    filterCount,
    sortConfig,
    toggleSort,
    refresh,
  };
}
