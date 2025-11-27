# RBAC Role Management Page - IMPROVED Continuation Prompt

**CRITICAL**: This is the IMPROVED version that fixes security flaws, performance issues, and UX problems found in the original plan.

Copy/paste this entire prompt into a new Claude Code conversation to continue work on the Role Management page.

---

## Context: RBAC System Status

I have a **fully implemented RBAC (Role-Based Access Control) system** deployed to production. The database migrations are live, TypeScript layer is complete, and navigation filtering works. However, the **Role Management admin page needs enhancement** to allow viewing and editing role permissions.

### What's Already Complete ✅

**Database Layer (3 migrations deployed)**:
1. `supabase/migrations/20251127163855_create_rbac_system.sql`
   - Tables: `roles`, `permissions`, `role_permissions`
   - 8 predefined roles, 48 permissions, 108 mappings
   - Helper functions: `get_user_permissions()`, `has_permission()`, `has_role()`, `is_admin_user()`

2. `supabase/migrations/20251127164036_update_rls_for_rbac.sql`
   - 58 RLS policies across 5 tables (user_profiles, policies, clients, commissions, expenses)
   - Fixed critical recruit isolation bug

3. `supabase/migrations/20251127165500_fix_agent_recruiting_nav_permission.sql`
   - Added `nav.recruiting_pipeline` to agent role

**TypeScript/React Layer**:
- `src/types/permissions.types.ts` - Complete permission types
- `src/services/permissions/permissionService.ts` - Database access functions
- `src/hooks/permissions/usePermissions.ts` - React Query hooks
- `src/components/permissions/PermissionGate.tsx` - Conditional rendering component
- `src/components/layout/Sidebar.tsx` - Permission-based navigation (UPDATED)

**Admin Pages**:
- `src/routes/admin/roles.tsx` - Role Management route
- `src/features/admin/components/RoleManagementPage.tsx` - **NEEDS ENHANCEMENT**
- `src/routes/admin/users.tsx` - User Management route
- `src/features/admin/components/UserManagementPage.tsx` - Full featured

**Documentation**:
- `docs/rbac-implementation-guide.md` - Complete 38KB guide
- `.serena/memories/supabase-credentials.md` - DB credentials (password: N123j234n345!$!$)

### The 8 Roles

| Role | Has Hierarchy | Description |
|------|---------------|-------------|
| admin | No | Full system access (Nick & Kerry) |
| agent | Yes | Base role for selling policies |
| upline_manager | Yes | Inherits from agent + downline management |
| trainer | No | Training and onboarding oversight |
| recruiter | No | Recruiting focus, no policy sales |
| contracting_manager | No | Manages contracts/carriers |
| office_staff | Yes | Data entry support |
| view_only | No | Systemwide read-only access |

---

## 🔴 CRITICAL FIXES REQUIRED (vs Original Plan)

### Issue #1: Infinite Recursion Bug
**Original plan had JavaScript recursion with NO cycle detection** - would crash on circular role references.

**REQUIRED FIX**: Use PostgreSQL recursive CTE instead (see Section 4 below).

### Issue #2: N+1 Query Problem
**Original plan made 1 query per role in hierarchy** - slow performance.

**REQUIRED FIX**: Single recursive CTE query fetches everything at once (see Section 4 below).

### Issue #3: Missing RLS Policies
**Original plan didn't verify security on RBAC tables** - ANY user could modify permissions!

**REQUIRED FIX**: Create migration to add RLS policies on `roles`, `permissions`, `role_permissions` tables (see Section 1 below).

### Issue #4: No Backend Validation
**Original plan only disabled UI button** - attackers can bypass with dev tools.

**REQUIRED FIX**: Add database trigger to prevent system role modifications (see Section 1 below).

### Issue #5: Missing Cache Invalidation
**Original plan had no optimistic updates** - users wouldn't see their changes.

**REQUIRED FIX**: Add mutation hooks with optimistic updates (see Section 6 below).

### Issue #6: Accessibility Violation
**Original plan used color-only encoding** - not accessible to color-blind users.

**REQUIRED FIX**: Add icons and text labels to scope badges (see Section 5 below).

### Issue #7: Duplicate Permission Display
**Original plan showed permission twice if both direct AND inherited**.

**REQUIRED FIX**: Deduplicate and mark sources (see Section 5 below).

---

## Task: Enhance Role Management Page (with Critical Fixes)

### Phase 1: Security & Database Layer

#### Step 1.1: Create Migration for RBAC Table Security

Create new migration: `supabase/migrations/YYYYMMDD_NNN_add_rbac_table_security.sql`

```sql
-- ============================================================================
-- RBAC Table Security - RLS Policies and Triggers
-- ============================================================================

-- Enable RLS on RBAC tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can READ roles and permissions (needed for UI)
CREATE POLICY "read_roles" ON roles
  FOR SELECT
  USING (true);

CREATE POLICY "read_permissions" ON permissions
  FOR SELECT
  USING (true);

CREATE POLICY "read_role_permissions" ON role_permissions
  FOR SELECT
  USING (true);

-- Only admins can INSERT/DELETE role_permissions
CREATE POLICY "admin_manage_role_permissions_insert" ON role_permissions
  FOR INSERT
  WITH CHECK (is_admin_user());

CREATE POLICY "admin_manage_role_permissions_delete" ON role_permissions
  FOR DELETE
  USING (is_admin_user());

-- Prevent modification of system roles (trigger-based protection)
CREATE OR REPLACE FUNCTION prevent_system_role_permission_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if trying to modify permissions for a system role
  IF EXISTS (
    SELECT 1 FROM roles
    WHERE id = NEW.role_id AND is_system_role = true
  ) THEN
    RAISE EXCEPTION 'Cannot modify permissions for system roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to enforce system role protection
CREATE TRIGGER prevent_system_role_changes
  BEFORE INSERT OR DELETE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_system_role_permission_changes();

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id
  ON role_permissions(role_id);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id
  ON role_permissions(permission_id);

-- Add comment
COMMENT ON POLICY "read_roles" ON roles IS
  'Allow all authenticated users to read roles for UI display';
COMMENT ON POLICY "admin_manage_role_permissions_insert" ON role_permissions IS
  'Only admins can assign permissions to roles';
COMMENT ON TRIGGER prevent_system_role_changes ON role_permissions IS
  'Prevents modification of system role permissions via database constraint';
```

**Action**: Create and apply this migration BEFORE implementing UI.

---

### Phase 2: Service Layer (Database Functions)

#### Step 2.1: Add Helper Function in Migration

Add to the migration above:

```sql
-- ============================================================================
-- Recursive CTE Function: Get Role Permissions with Inheritance
-- ============================================================================

CREATE OR REPLACE FUNCTION get_role_permissions_with_inheritance(p_role_id UUID)
RETURNS TABLE (
  permission_id UUID,
  permission_code TEXT,
  permission_resource TEXT,
  permission_action TEXT,
  permission_scope TEXT,
  permission_description TEXT,
  permission_type TEXT,  -- 'direct' or 'inherited'
  inherited_from_role_name TEXT  -- NULL if direct
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE role_hierarchy AS (
    -- Base case: start with the requested role
    SELECT
      id,
      parent_role_id,
      name,
      1 as depth
    FROM roles
    WHERE id = p_role_id

    UNION ALL

    -- Recursive case: get parent roles
    SELECT
      r.id,
      r.parent_role_id,
      r.name,
      rh.depth + 1
    FROM roles r
    INNER JOIN role_hierarchy rh ON r.id = rh.parent_role_id
    WHERE rh.depth < 5  -- Max depth protection (prevents infinite loops)
  )
  SELECT DISTINCT
    p.id as permission_id,
    p.code as permission_code,
    p.resource as permission_resource,
    p.action as permission_action,
    p.scope as permission_scope,
    p.description as permission_description,
    CASE
      WHEN rh.id = p_role_id THEN 'direct'::TEXT
      ELSE 'inherited'::TEXT
    END as permission_type,
    CASE
      WHEN rh.id = p_role_id THEN NULL
      ELSE rh.name
    END as inherited_from_role_name
  FROM role_hierarchy rh
  INNER JOIN role_permissions rp ON rh.id = rp.role_id
  INNER JOIN permissions p ON rp.permission_id = p.id
  ORDER BY p.resource, p.scope, p.action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add comment
COMMENT ON FUNCTION get_role_permissions_with_inheritance(UUID) IS
  'Recursively fetches all permissions for a role including inherited permissions from parent roles. Uses CTE with max depth of 5 to prevent infinite loops.';
```

**Why This is Better**:
- ✅ Single database query (no N+1 problem)
- ✅ Cycle protection with max depth limit
- ✅ Returns both direct and inherited permissions
- ✅ Includes source role name for inherited permissions
- ✅ Efficient with proper indexing

---

#### Step 2.2: TypeScript Service Functions

Update `src/services/permissions/permissionService.ts`:

```typescript
/**
 * Permission with source information
 */
export interface PermissionWithSource extends Permission {
  permissionType: 'direct' | 'inherited';
  inheritedFromRoleName?: string;
}

/**
 * Get all permissions for a role including inherited permissions
 * Uses database recursive CTE for efficient single-query fetching
 */
export async function getRolePermissionsWithInheritance(
  roleId: string
): Promise<PermissionWithSource[]> {
  const { data, error } = await supabase.rpc(
    'get_role_permissions_with_inheritance',
    { p_role_id: roleId }
  );

  if (error) {
    console.error('Error fetching role permissions with inheritance:', error);
    throw new Error(`Failed to fetch role permissions: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    id: row.permission_id,
    code: row.permission_code,
    resource: row.permission_resource,
    action: row.permission_action,
    scope: row.permission_scope,
    description: row.permission_description,
    permissionType: row.permission_type,
    inheritedFromRoleName: row.inherited_from_role_name,
  }));
}

/**
 * Get only direct permissions for a role (no inheritance)
 */
export async function getRolePermissions(roleId: string): Promise<Permission[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select(`
      permission:permissions (*)
    `)
    .eq('role_id', roleId);

  if (error) {
    console.error('Error fetching role permissions:', error);
    throw new Error(`Failed to fetch role permissions: ${error.message}`);
  }

  return (data || []).map((row: any) => row.permission);
}

/**
 * Assign permission to role with validation
 */
export async function assignPermissionToRole(
  roleId: string,
  permissionId: string
): Promise<void> {
  const { error } = await supabase
    .from('role_permissions')
    .insert({ role_id: roleId, permission_id: permissionId });

  if (error) {
    // Check if it's a system role error from our trigger
    if (error.message.includes('system role')) {
      throw new Error('Cannot modify permissions for system roles');
    }
    console.error('Error assigning permission to role:', error);
    throw new Error(`Failed to assign permission: ${error.message}`);
  }
}

/**
 * Remove permission from role with validation
 */
export async function removePermissionFromRole(
  roleId: string,
  permissionId: string
): Promise<void> {
  const { error } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
    .eq('permission_id', permissionId);

  if (error) {
    // Check if it's a system role error from our trigger
    if (error.message.includes('system role')) {
      throw new Error('Cannot modify permissions for system roles');
    }
    console.error('Error removing permission from role:', error);
    throw new Error(`Failed to remove permission: ${error.message}`);
  }
}
```

---

### Phase 3: React Query Hooks

#### Step 3.1: Update Query Key Factory

In `src/hooks/permissions/usePermissions.ts`, first verify the existing `permissionKeys` structure, then add:

```typescript
// Query key factory (add to existing permissionKeys if it exists)
export const permissionKeys = {
  all: ['permissions'] as const,
  allPermissions: ['permissions', 'all'] as const,
  allRoles: ['roles'] as const,
  role: (id: string) => ['roles', id] as const,
  rolePermissions: (id: string) => [...permissionKeys.role(id), 'permissions'] as const,
  rolePermissionsInherited: (id: string) =>
    [...permissionKeys.role(id), 'permissions', 'inherited'] as const,
};
```

#### Step 3.2: Add Query Hooks

```typescript
/**
 * Get permissions for a specific role with inheritance
 * Uses efficient database recursive CTE
 */
export function useRolePermissionsWithInheritance(roleId: string | undefined) {
  return useQuery({
    queryKey: roleId ? permissionKeys.rolePermissionsInherited(roleId) : ['empty'],
    queryFn: () => getRolePermissionsWithInheritance(roleId!),
    enabled: !!roleId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get only direct permissions for a role (no inheritance)
 */
export function useRolePermissions(roleId: string | undefined) {
  return useQuery({
    queryKey: roleId ? permissionKeys.rolePermissions(roleId) : ['empty'],
    queryFn: () => getRolePermissions(roleId!),
    enabled: !!roleId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}
```

---

#### Step 3.3: Add Mutation Hooks with Optimistic Updates

```typescript
/**
 * Mutation: Assign permission to role
 * Includes optimistic updates for instant UI feedback
 */
export function useAssignPermissionToRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      assignPermissionToRole(roleId, permissionId),

    // Optimistic update - instant feedback
    onMutate: async ({ roleId, permissionId }) => {
      // Cancel outgoing queries for this role
      await queryClient.cancelQueries({
        queryKey: permissionKeys.rolePermissionsInherited(roleId),
      });

      // Snapshot previous value for rollback
      const previousData = queryClient.getQueryData<PermissionWithSource[]>(
        permissionKeys.rolePermissionsInherited(roleId)
      );

      // Optimistically add permission to cache
      if (previousData) {
        const allPermissions = queryClient.getQueryData<Permission[]>(
          permissionKeys.allPermissions
        );
        const newPermission = allPermissions?.find((p) => p.id === permissionId);

        if (newPermission) {
          queryClient.setQueryData<PermissionWithSource[]>(
            permissionKeys.rolePermissionsInherited(roleId),
            [...previousData, { ...newPermission, permissionType: 'direct' }]
          );
        }
      }

      return { previousData };
    },

    // Rollback on error
    onError: (err, { roleId }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          permissionKeys.rolePermissionsInherited(roleId),
          context.previousData
        );
      }
      console.error('Failed to assign permission:', err);
    },

    // Refetch on success to ensure consistency
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({
        queryKey: permissionKeys.rolePermissionsInherited(roleId),
      });
      queryClient.invalidateQueries({
        queryKey: permissionKeys.rolePermissions(roleId),
      });
    },
  });
}

/**
 * Mutation: Remove permission from role
 * Includes optimistic updates for instant UI feedback
 */
export function useRemovePermissionFromRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, permissionId }: { roleId: string; permissionId: string }) =>
      removePermissionFromRole(roleId, permissionId),

    // Optimistic update
    onMutate: async ({ roleId, permissionId }) => {
      await queryClient.cancelQueries({
        queryKey: permissionKeys.rolePermissionsInherited(roleId),
      });

      const previousData = queryClient.getQueryData<PermissionWithSource[]>(
        permissionKeys.rolePermissionsInherited(roleId)
      );

      // Optimistically remove permission from cache
      if (previousData) {
        queryClient.setQueryData<PermissionWithSource[]>(
          permissionKeys.rolePermissionsInherited(roleId),
          previousData.filter((p) => p.id !== permissionId)
        );
      }

      return { previousData };
    },

    // Rollback on error
    onError: (err, { roleId }, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          permissionKeys.rolePermissionsInherited(roleId),
          context.previousData
        );
      }
      console.error('Failed to remove permission:', err);
    },

    // Refetch on success
    onSuccess: (_, { roleId }) => {
      queryClient.invalidateQueries({
        queryKey: permissionKeys.rolePermissionsInherited(roleId),
      });
      queryClient.invalidateQueries({
        queryKey: permissionKeys.rolePermissions(roleId),
      });
    },
  });
}
```

---

### Phase 4: UI Components

#### Step 4.1: Update Type Definitions

Update `src/types/permissions.types.ts`:

```typescript
// Add to existing types
export interface PermissionWithSource extends Permission {
  permissionType: 'direct' | 'inherited';
  inheritedFromRoleName?: string;
}
```

---

#### Step 4.2: Helper Functions for Permission Display

Create `src/features/admin/utils/permissionHelpers.ts`:

```typescript
// src/features/admin/utils/permissionHelpers.ts
import type { PermissionWithSource } from '@/types/permissions.types';
import { User, Users, Globe, UserCircle } from 'lucide-react';

/**
 * Get color classes for permission scope (accessible with icons)
 */
export function getScopeColor(scope: string): string {
  const colors: Record<string, string> = {
    own: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    downline: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    all: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    self: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };
  return colors[scope] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
}

/**
 * Get icon for permission scope (for accessibility)
 */
export function getScopeIcon(scope: string) {
  const icons = {
    own: User,
    downline: Users,
    all: Globe,
    self: UserCircle,
  };
  return icons[scope as keyof typeof icons] || User;
}

/**
 * Get aria-label for screen readers
 */
export function getScopeAriaLabel(scope: string, code: string): string {
  return `${code} - ${scope} scope permission`;
}

/**
 * Group permissions by category (resource)
 */
export function groupPermissionsByCategory(
  permissions: PermissionWithSource[]
): Record<string, PermissionWithSource[]> {
  return permissions.reduce((acc, perm) => {
    const category = perm.resource;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {} as Record<string, PermissionWithSource[]>);
}

/**
 * Deduplicate permissions and mark sources
 * Handles case where permission is both direct AND inherited
 */
export interface DeduplicatedPermission extends PermissionWithSource {
  sources: Array<'direct' | 'inherited'>;
  inheritedFromRoles: string[];
}

export function deduplicatePermissions(
  permissions: PermissionWithSource[]
): DeduplicatedPermission[] {
  const permMap = new Map<string, DeduplicatedPermission>();

  for (const perm of permissions) {
    const existing = permMap.get(perm.id);

    if (existing) {
      // Permission already exists - add source
      if (!existing.sources.includes(perm.permissionType)) {
        existing.sources.push(perm.permissionType);
      }
      if (perm.inheritedFromRoleName && !existing.inheritedFromRoles.includes(perm.inheritedFromRoleName)) {
        existing.inheritedFromRoles.push(perm.inheritedFromRoleName);
      }
    } else {
      // First time seeing this permission
      permMap.set(perm.id, {
        ...perm,
        sources: [perm.permissionType],
        inheritedFromRoles: perm.inheritedFromRoleName ? [perm.inheritedFromRoleName] : [],
      });
    }
  }

  return Array.from(permMap.values());
}
```

---

#### Step 4.3: Permission Badge Component

Create `src/features/admin/components/PermissionBadge.tsx`:

```typescript
// src/features/admin/components/PermissionBadge.tsx
import { Badge } from '@/components/ui/badge';
import { ArrowDownFromLine } from 'lucide-react';
import { getScopeColor, getScopeIcon, getScopeAriaLabel } from '../utils/permissionHelpers';
import type { DeduplicatedPermission } from '../utils/permissionHelpers';

interface PermissionBadgeProps {
  permission: DeduplicatedPermission;
}

export function PermissionBadge({ permission }: PermissionBadgeProps) {
  const ScopeIcon = getScopeIcon(permission.scope);
  const isInherited = permission.sources.includes('inherited');
  const isDirect = permission.sources.includes('direct');
  const isBoth = isInherited && isDirect;

  return (
    <Badge
      className={`${getScopeColor(permission.scope)} text-xs`}
      variant={isInherited && !isDirect ? 'outline' : 'secondary'}
      aria-label={getScopeAriaLabel(permission.scope, permission.code)}
    >
      {/* Scope icon for accessibility */}
      <ScopeIcon className="h-3 w-3 mr-1" />

      {/* Inherited indicator */}
      {isInherited && <ArrowDownFromLine className="h-3 w-3 mr-1" />}

      {/* Permission code */}
      <span>{permission.code}</span>

      {/* Scope label (not just color) */}
      <span className="ml-1 text-[10px] font-semibold opacity-70">
        [{permission.scope}]
      </span>

      {/* Both direct and inherited indicator */}
      {isBoth && (
        <span className="ml-1 text-[10px] font-bold">(both)</span>
      )}
    </Badge>
  );
}
```

---

#### Step 4.4: Permission Display Section Component

Create `src/features/admin/components/RolePermissionsDisplay.tsx`:

```typescript
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

interface RolePermissionsDisplayProps {
  role: Role;
  isAdmin: boolean;
  onEditClick?: () => void;
}

export function RolePermissionsDisplay({ role, isAdmin, onEditClick }: RolePermissionsDisplayProps) {
  const { data: permissions, isLoading, error, refetch } = useRolePermissionsWithInheritance(role.id);

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
          {isAdmin && !role.is_system_role && (
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
```

---

### Phase 5: Permission Edit Dialog (Optional - Phase 2)

**NOTE**: This is a complex feature. Implement Phase 1-4 first, then add this.

Key considerations for dialog:
1. Show all available permissions grouped by category
2. Checkboxes for direct permissions (can toggle)
3. Inherited permissions shown as disabled checkboxes with note
4. Track changes: what's being added vs removed
5. Batch mutations on save
6. Optimistic updates for instant feedback
7. Handle system role protection (show disabled state)

**Detailed implementation** can be added in a follow-up prompt once Phase 1-4 is complete.

---

## Implementation Checklist

### Phase 1: Security & Database ✅
- [ ] Create migration for RLS policies on RBAC tables
- [ ] Add database trigger for system role protection
- [ ] Add recursive CTE function for efficient permission fetching
- [ ] Add indexes for performance
- [ ] Test migration locally with `supabase db reset`
- [ ] Apply to production

### Phase 2: Service Layer ✅
- [ ] Update `permissionService.ts` with new functions
- [ ] Add `getRolePermissionsWithInheritance()` using RPC call
- [ ] Add error handling for system role violations
- [ ] Test service functions

### Phase 3: React Query Hooks ✅
- [ ] Verify existing `permissionKeys` structure
- [ ] Add new query keys for role permissions
- [ ] Add `useRolePermissionsWithInheritance()` hook
- [ ] Add `useAssignPermissionToRole()` mutation with optimistic updates
- [ ] Add `useRemovePermissionFromRole()` mutation with optimistic updates
- [ ] Test hooks with React Query DevTools

### Phase 4: UI Components ✅
- [ ] Create `permissionHelpers.ts` utility file
- [ ] Create `PermissionBadge.tsx` component (accessible)
- [ ] Create `RolePermissionsDisplay.tsx` component
- [ ] Update `RoleManagementPage.tsx` to use new components
- [ ] Test loading, error, and empty states
- [ ] Test permission display with different roles
- [ ] Verify accessibility (screen reader, keyboard navigation)

### Phase 5: Edit Dialog (Optional) 🚧
- [ ] Design dialog state management
- [ ] Implement checkbox list with inheritance handling
- [ ] Add batch mutation logic
- [ ] Test concurrent editing scenarios

---

## Testing Strategy

### Unit Tests
- [ ] Test `deduplicatePermissions()` with various inputs
- [ ] Test `groupPermissionsByCategory()`
- [ ] Test permission badge rendering
- [ ] Test error states in service functions

### Integration Tests
- [ ] Test role with no parent (e.g., admin, agent)
- [ ] Test role with parent (e.g., upline_manager inherits from agent)
- [ ] Test role with circular reference (should not crash)
- [ ] Test role with orphaned parent_role_id (should handle gracefully)
- [ ] Test duplicate permission (both direct and inherited)
- [ ] Test empty role (0 permissions)
- [ ] Test system role protection (trigger should fire)

### E2E Tests
- [ ] Load role management page as admin
- [ ] Expand role and view permissions
- [ ] Verify inherited permissions show correctly
- [ ] Try to edit system role (should be disabled)
- [ ] Edit non-system role permissions
- [ ] Verify optimistic updates work
- [ ] Test network failure handling

---

## Success Criteria

✅ **Security**:
- RLS policies protect RBAC tables
- Database trigger prevents system role modifications
- Backend validation, not just UI hiding

✅ **Performance**:
- Single query fetches all permissions (no N+1)
- Recursive CTE with cycle protection
- Optimistic updates provide instant feedback

✅ **Accessibility**:
- Scope badges use icons AND text, not just color
- Proper aria-labels for screen readers
- Keyboard navigation works

✅ **UX**:
- Loading, error, and empty states handled
- Duplicate permissions deduplicated
- Clear distinction between direct and inherited

✅ **Code Quality**:
- TypeScript strict mode
- Conventional naming
- Comprehensive error handling
- Unit and integration tests

---

## File Locations

**Database**:
- `supabase/migrations/YYYYMMDD_NNN_add_rbac_table_security.sql` - NEW

**Services**:
- `src/services/permissions/permissionService.ts` - UPDATE
- `src/types/permissions.types.ts` - UPDATE

**Hooks**:
- `src/hooks/permissions/usePermissions.ts` - UPDATE

**Components**:
- `src/features/admin/utils/permissionHelpers.ts` - NEW
- `src/features/admin/components/PermissionBadge.tsx` - NEW
- `src/features/admin/components/RolePermissionsDisplay.tsx` - NEW
- `src/features/admin/components/RoleManagementPage.tsx` - UPDATE

**Reference**:
- `src/features/admin/components/UserManagementPage.tsx` - Example patterns
- `docs/rbac-implementation-guide.md` - Complete permission matrix

---

## Additional Context

**Project Stack**:
- React 19.1 + TypeScript
- TanStack Router, Query, Form
- Shadcn UI + Tailwind CSS v4
- Supabase (PostgreSQL)
- Vite

**DB Connection** (already in memory - `.serena/memories/supabase-credentials.md`):
- URL: https://pcyaqwodnyrpkaiojnpz.supabase.co
- Password: N123j234n345!$!$

**Key Principles**:
- All data in Supabase (NO local storage for app data)
- Permission checks at database level via RLS
- Admin-only features protected by permissions AND database triggers
- Simple, clean, conventional code
- Test as you build
- Accessibility is non-negotiable

---

## Start Implementation

**Recommended Order**:

1. **Database first**: Create and apply security migration
2. **Service layer**: Update permissionService.ts with new functions
3. **Hooks**: Add React Query hooks with optimistic updates
4. **UI**: Build components from smallest to largest (badge → display → page)
5. **Test**: Verify with different roles and edge cases
6. **Phase 2**: Add edit dialog if needed

**Start with**: `supabase migration new add_rbac_table_security`

Good luck! This improved plan addresses all security, performance, and UX issues from the original.
