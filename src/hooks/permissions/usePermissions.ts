// src/hooks/permissions/usePermissions.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type {
  UserPermissions,
  PermissionCode,
  RoleName,
  Role,
  Permission,
} from '@/types/permissions.types';
import {
  getUserPermissionsContext,
  getUserPermissions,
  getUserRoles,
  hasPermission,
  hasRole,
  isAdminUser,
  hasAnyPermission,
  hasAllPermissions,
  getAllRoles,
  getAllPermissions,
  setUserRoles,
  assignPermissionToRole,
  removePermissionFromRole,
} from '@/services/permissions/permissionService';

// ============================================
// QUERY KEYS
// ============================================

export const permissionKeys = {
  all: ['permissions'] as const,
  userPermissions: (userId: string) => ['permissions', 'user', userId] as const,
  userRoles: (userId: string) => ['permissions', 'roles', userId] as const,
  userContext: (userId: string) => ['permissions', 'context', userId] as const,
  allRoles: ['permissions', 'all-roles'] as const,
  allPermissions: ['permissions', 'all-permissions'] as const,
  hasPermission: (userId: string, code: PermissionCode) =>
    ['permissions', 'has', userId, code] as const,
  hasRole: (userId: string, role: RoleName) => ['permissions', 'has-role', userId, role] as const,
  isAdmin: (userId: string) => ['permissions', 'is-admin', userId] as const,
};

// ============================================
// USER PERMISSION HOOKS
// ============================================

/**
 * Get current user's full permissions context (roles + permissions)
 */
export function useUserPermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: permissionKeys.userContext(user?.id || ''),
    queryFn: () => getUserPermissionsContext(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Get current user's permission codes only
 */
export function useUserPermissionCodes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: permissionKeys.userPermissions(user?.id || ''),
    queryFn: () => getUserPermissions(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get current user's roles
 */
export function useUserRoles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: permissionKeys.userRoles(user?.id || ''),
    queryFn: () => getUserRoles(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Check if current user has a specific permission
 */
export function useHasPermission(permissionCode: PermissionCode) {
  const { user } = useAuth();

  return useQuery({
    queryKey: permissionKeys.hasPermission(user?.id || '', permissionCode),
    queryFn: () => hasPermission(user!.id, permissionCode),
    enabled: !!user?.id && !!permissionCode,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Check if current user has a specific role
 */
export function useHasRole(roleName: RoleName) {
  const { user } = useAuth();

  return useQuery({
    queryKey: permissionKeys.hasRole(user?.id || '', roleName),
    queryFn: () => hasRole(user!.id, roleName),
    enabled: !!user?.id && !!roleName,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Check if current user is an admin
 */
export function useIsAdmin() {
  const { user } = useAuth();

  return useQuery({
    queryKey: permissionKeys.isAdmin(user?.id || ''),
    queryFn: () => isAdminUser(user?.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to check multiple permissions and roles
 * Returns helper functions for permission checks
 */
export function usePermissionCheck() {
  const { user } = useAuth();
  const { data: permissionsContext } = useUserPermissions();

  const can = (permissionCode: PermissionCode): boolean => {
    if (!permissionsContext) return false;
    return permissionsContext.permissions.includes(permissionCode);
  };

  const canAny = (permissionCodes: PermissionCode[]): boolean => {
    if (!permissionsContext) return false;
    return permissionCodes.some((code) => permissionsContext.permissions.includes(code));
  };

  const canAll = (permissionCodes: PermissionCode[]): boolean => {
    if (!permissionsContext) return false;
    return permissionCodes.every((code) => permissionsContext.permissions.includes(code));
  };

  const is = (roleName: RoleName): boolean => {
    if (!permissionsContext) return false;
    return permissionsContext.roles.includes(roleName);
  };

  const isAnyRole = (roleNames: RoleName[]): boolean => {
    if (!permissionsContext) return false;
    return roleNames.some((role) => permissionsContext.roles.includes(role));
  };

  const isAdmin = (): boolean => {
    if (!permissionsContext) return false;
    return permissionsContext.roles.includes('admin');
  };

  return {
    can,
    canAny,
    canAll,
    is,
    isAnyRole,
    isAdmin,
    permissions: permissionsContext?.permissions || [],
    roles: permissionsContext?.roles || [],
    isLoading: !permissionsContext,
  };
}

// ============================================
// ADMIN HOOKS (ROLE & PERMISSION MANAGEMENT)
// ============================================

/**
 * Get all system roles (admin only)
 */
export function useAllRoles() {
  return useQuery({
    queryKey: permissionKeys.allRoles,
    queryFn: getAllRoles,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}

/**
 * Get all system permissions (admin only)
 */
export function useAllPermissions() {
  return useQuery({
    queryKey: permissionKeys.allPermissions,
    queryFn: getAllPermissions,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Mutation to update user roles (admin only)
 */
export function useUpdateUserRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roles }: { userId: string; roles: RoleName[] }) =>
      setUserRoles(userId, roles),
    onSuccess: (_, variables) => {
      // Invalidate user permissions cache
      queryClient.invalidateQueries({
        queryKey: permissionKeys.userContext(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: permissionKeys.userRoles(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: permissionKeys.userPermissions(variables.userId),
      });
    },
  });
}

/**
 * Mutation to assign permission to role (admin only)
 */
export function useAssignPermissionToRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      assignPermissionToRole(roleId, permissionId),
    onSuccess: () => {
      // Invalidate all permission-related queries
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
    },
  });
}

/**
 * Mutation to remove permission from role (admin only)
 */
export function useRemovePermissionFromRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      removePermissionFromRole(roleId, permissionId),
    onSuccess: () => {
      // Invalidate all permission-related queries
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
    },
  });
}
