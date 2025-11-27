// src/features/admin/components/RoleManagementPage.tsx

import React, { useState } from 'react';
import { useAllRoles, useAllPermissions, useIsAdmin } from '@/hooks/permissions/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Users, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import type { Role, Permission } from '@/types/permissions.types';
import { RolePermissionsDisplay } from './RolePermissionsDisplay';

export function RoleManagementPage() {
  const { data: roles, isLoading: rolesLoading, error: rolesError } = useAllRoles();
  const { data: permissions, isLoading: permissionsLoading } = useAllPermissions();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  const toggleRole = (roleId: string) => {
    const newExpanded = new Set(expandedRoles);
    if (newExpanded.has(roleId)) {
      newExpanded.delete(roleId);
    } else {
      newExpanded.add(roleId);
    }
    setExpandedRoles(newExpanded);
  };

  if (rolesLoading || permissionsLoading || isAdminLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (rolesError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load roles: {rolesError instanceof Error ? rolesError.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Group permissions by category for display
  const permissionsByCategory =
    permissions?.reduce(
      (acc, perm) => {
        const category = perm.resource;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(perm);
        return acc;
      },
      {} as Record<string, Permission[]>
    ) || {};

  const getRoleColor = (roleName: string): string => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      agent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      upline_manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      trainer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      recruiter: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      contracting_manager: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      office_staff: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      view_only: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[roleName] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
            <p className="text-muted-foreground">
              Manage system roles and their permissions
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {roles?.filter(r => r.is_system_role).length} system roles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {Object.keys(permissionsByCategory).length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Role Hierarchy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roles?.filter(r => r.parent_role_id).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              roles with inheritance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Roles List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">System Roles</h2>
          <Button variant="outline" size="sm" disabled>
            <Shield className="h-4 w-4 mr-2" />
            Add Custom Role (Coming Soon)
          </Button>
        </div>

        <div className="grid gap-4">
          {roles?.map((role) => {
            const isExpanded = expandedRoles.has(role.id);
            const parentRole = roles.find(r => r.id === role.parent_role_id);

            return (
              <Card key={role.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleRole(role.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRole(role.id);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        <CardTitle className="text-lg">{role.display_name}</CardTitle>
                        <Badge className={getRoleColor(role.name)} variant="secondary">
                          {role.name}
                        </Badge>
                        {role.is_system_role && (
                          <Badge variant="outline" className="text-xs">
                            System Role
                          </Badge>
                        )}
                      </div>

                      {role.description && (
                        <CardDescription className="ml-9">
                          {role.description}
                        </CardDescription>
                      )}

                      <div className="ml-9 flex items-center gap-4 text-sm text-muted-foreground">
                        {parentRole && (
                          <div className="flex items-center gap-1">
                            <span>Inherits from:</span>
                            <Badge variant="outline" className="text-xs">
                              {parentRole.display_name}
                            </Badge>
                          </div>
                        )}
                        {role.respects_hierarchy && (
                          <Badge variant="outline" className="text-xs">
                            Respects Hierarchy
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 border-t">
                    <RolePermissionsDisplay
                      role={role}
                      isAdmin={isAdmin || false}
                      onEditClick={
                        isAdmin && !role.is_system_role
                          ? () => {
                              // TODO: Implement permission edit dialog
                              console.log('Edit permissions for role:', role.name);
                            }
                          : undefined
                      }
                    />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Permission Categories Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Categories</CardTitle>
          <CardDescription>
            All available permission categories in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.keys(permissionsByCategory).sort().map((category) => (
              <div
                key={category}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <span className="font-medium capitalize">{category}</span>
                <Badge variant="secondary">
                  {permissionsByCategory[category].length}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
