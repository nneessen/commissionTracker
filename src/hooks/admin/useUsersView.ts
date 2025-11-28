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

  // Fetch paginated users using admin RPC function (bypasses RLS)
  const {
    data: paginatedData,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['users-paginated', currentPage, pageSize, filters, sortConfig],
    queryFn: async () => {
      console.log('[useUsersView] Fetching users via admin_get_all_users()');

      // Get ALL users via RPC function (bypasses RLS)
      const { data: allUsers, error } = await supabase.rpc('admin_get_all_users');

      if (error) {
        console.error('[useUsersView] Error fetching users:', error);
        throw error;
      }

      console.log('[useUsersView] Fetched', allUsers?.length || 0, 'total users');

      let filteredUsers = (allUsers as UserProfile[]) || [];

      // CRITICAL: Exclude recruits (users in onboarding pipeline) from users table
      // Only show active agents (users with 'agent' role) OR admins (is_admin=true)
      // Per GraduateToAgentDialog.tsx: Graduation sets roles=['agent'] AND onboarding_status='completed'
      filteredUsers = filteredUsers.filter(u =>
        u.roles?.includes('agent') || u.is_admin === true
      );

      // Apply filters client-side
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredUsers = filteredUsers.filter(u =>
          u.email.toLowerCase().includes(searchLower)
        );
      }
      if (filters.approvalStatus) {
        filteredUsers = filteredUsers.filter(u =>
          u.approval_status === filters.approvalStatus
        );
      }

      // Apply sorting client-side
      filteredUsers.sort((a, b) => {
        const aVal = a[sortConfig.field];
        const bVal = b[sortConfig.field];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });

      // Apply pagination client-side
      const totalCount = filteredUsers.length;
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize;
      const paginatedUsers = filteredUsers.slice(from, to);

      console.log('[useUsersView] After filtering/pagination:', paginatedUsers.length, 'users on page', currentPage);

      return {
        users: paginatedUsers,
        totalCount,
      };
    },
    staleTime: 30000, // 30 seconds
  });

  // Fetch overall metrics using admin RPC function (bypasses RLS)
  const { data: metrics } = useQuery({
    queryKey: ['users-metrics'],
    queryFn: async () => {
      console.log('[useUsersView] Fetching metrics via admin_get_all_users()');

      const { data, error } = await supabase.rpc('admin_get_all_users');

      if (error) {
        console.error('[useUsersView] Error fetching metrics:', error);
        throw error;
      }

      const allUsers = (data as UserProfile[]) || [];

      // CRITICAL: Exclude recruits from metrics (same logic as main query)
      // Only count active agents (users with 'agent' role) OR admins (is_admin=true)
      // Per GraduateToAgentDialog.tsx: Graduation sets roles=['agent'] AND onboarding_status='completed'
      const users = allUsers.filter(u =>
        u.roles?.includes('agent') || u.is_admin === true
      );

      const totalUsers = users.length;
      const pendingUsers = users.filter(u => u.approval_status === 'pending').length;
      const approvedUsers = users.filter(u => u.approval_status === 'approved').length;
      const deniedUsers = users.filter(u => u.approval_status === 'denied').length;

      console.log('[useUsersView] Metrics:', { totalUsers, pendingUsers, approvedUsers, deniedUsers });

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
