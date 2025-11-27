// src/features/admin/components/RolePermissionsDisplay.tsx

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Edit, Info } from 'lucide-react';
import { useRolePermissionsWithInheritance } from '@/hooks/permissions/usePermissions';
import { groupPermissionsByCategory, deduplicatePermissions } from '../utils/permissionHelpers';
import { PermissionBadge } from './PermissionBadge';
import type { Role } from '@/types/permissions.types';

/**
 * Role Permissions Display Component
 * Shows all permissions for a role including inherited permissions
 *
 * Features:
 * - Loading, error, and empty states
 * - Permission grouping by category
 * - Direct vs inherited counts
 * - Edit button for admins (non-system roles only)
 * - Automatic deduplication of permissions
 * - Retry on error
 */

interface RolePermissionsDisplayProps {
  role: Role;
  isAdmin: boolean;
  onEditClick?: () => void;
}

export function RolePermissionsDisplay({
  role,
  isAdmin,
  onEditClick,
}: RolePermissionsDisplayProps) {
  const {
    data: permissions,
    isLoading,
    error,
    refetch,
  } = useRolePermissionsWithInheritance(role.id);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 mt-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Failed to load permissions: {error.message}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (!permissions || permissions.length === 0) {
    return (
      <Alert className="mt-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          This role has no permissions assigned.
          {isAdmin && !role.is_system_role && (
            <Button variant="link" className="ml-2 p-0 h-auto" onClick={onEditClick}>
              Add permissions
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Deduplicate and group permissions
  const deduped = deduplicatePermissions(permissions);
  const directCount = deduped.filter((p) => p.sources.includes('direct')).length;
  const inheritedCount = deduped.filter((p) => p.sources.includes('inherited')).length;
  const permissionsByCategory = groupPermissionsByCategory(deduped);

  return (
    <div className="space-y-4 mt-4">
      {/* Header with counts and edit button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Permissions</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {directCount} direct
          </Badge>
          {inheritedCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {inheritedCount} inherited
            </Badge>
          )}
          {isAdmin && !role.is_system_role && onEditClick && (
            <Button size="sm" variant="outline" onClick={onEditClick}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Permissions
            </Button>
          )}
        </div>
      </div>

      {/* Permissions grouped by category */}
      <div className="space-y-4">
        {Object.entries(permissionsByCategory).map(([category, perms]) => (
          <div key={category} className="space-y-2">
            <h4 className="text-sm font-medium capitalize flex items-center gap-2">
              {category}
              <Badge variant="secondary" className="text-xs">
                {perms.length}
              </Badge>
            </h4>
            <div className="flex flex-wrap gap-2">
              {perms.map((perm) => (
                <PermissionBadge key={perm.id} permission={perm} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
