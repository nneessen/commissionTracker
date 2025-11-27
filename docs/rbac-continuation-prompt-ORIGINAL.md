# RBAC Role Management Page - Continuation Prompt

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

### Database Schema Details

**roles table**:
```sql
- id (UUID)
- name (TEXT) - snake_case role name
- display_name (TEXT)
- description (TEXT)
- parent_role_id (UUID) - For inheritance
- respects_hierarchy (BOOLEAN)
- is_system_role (BOOLEAN)
- created_at, updated_at (TIMESTAMPTZ)
```

**permissions table**:
```sql
- id (UUID)
- code (TEXT) - Format: resource.action.scope (e.g., "policies.read.own")
- resource (TEXT) - policies, clients, commissions, recruiting, expenses, navigation, users, etc.
- action (TEXT) - create, read, update, delete, manage, access
- scope (TEXT) - own, downline, all, self
- description (TEXT)
- created_at (TIMESTAMPTZ)
```

**role_permissions table** (junction):
```sql
- role_id (UUID FK)
- permission_id (UUID FK)
- created_at (TIMESTAMPTZ)
- PRIMARY KEY (role_id, permission_id)
```

### Permission Categories

Permissions are grouped by resource:
- **policies** - Policy management (7 permissions)
- **clients** - Client management (6 permissions)
- **commissions** - Commission viewing (4 permissions)
- **recruiting** - Recruit management (8 permissions)
- **expenses** - Expense tracking (4 permissions)
- **navigation** - Page access (14 permissions)
- **users, roles, carriers, contracts, documents** - Admin permissions (5 permissions)

---

## Task: Enhance Role Management Page

**Current State**:
The Role Management page at `/admin/roles` (`src/features/admin/components/RoleManagementPage.tsx`) displays roles but has a placeholder for permission management:

```tsx
<Alert>
  <CheckCircle2 className="h-4 w-4" />
  <AlertDescription>
    Permission management interface will be available in the next update.
    For now, permissions are managed via database migrations.
  </AlertDescription>
</Alert>
```

**What Needs to Be Built**:

### 1. Query Role Permissions from Database

Currently the page uses:
- `useAllRoles()` - gets all roles
- `useAllPermissions()` - gets all permissions

But it needs a new hook to get permissions for a specific role:
- `useRolePermissions(roleId)` - Should query `role_permissions` table

**Database Query Needed**:
```sql
SELECT p.*
FROM permissions p
INNER JOIN role_permissions rp ON p.id = rp.permission_id
WHERE rp.role_id = :roleId
ORDER BY p.resource, p.scope, p.action
```

### 2. Display Role Permissions

When a role is expanded, show:
- **Grouped by category** (policies, clients, commissions, etc.)
- **Permission badges** with color coding by scope:
  - `own` scope - blue
  - `downline` scope - purple
  - `all` scope - red
  - `self` scope - green
- **Inherited permissions** (if role has parent_role_id)
  - Show with different badge style or icon
  - Label as "Inherited from [Parent Role]"
- **Direct permissions** (assigned to this role)
  - Show with standard badge

**UI Layout**:
```
Role Card (expanded)
├─ Role Info (name, description, hierarchy)
├─ Permission Summary (X direct, Y inherited)
└─ Permissions by Category
   ├─ Policies (7)
   │  ├─ policies.create.own [own] [direct]
   │  ├─ policies.read.own [own] [inherited from agent]
   │  └─ ...
   ├─ Clients (6)
   ├─ Commissions (4)
   └─ ...
```

### 3. Add Permission Editing UI (Admin Only)

Add ability to add/remove permissions from roles:

**Features**:
- Button: "Edit Permissions" (only for admins)
- Opens dialog with all available permissions
- Checkboxes to add/remove permissions
- Cannot edit system roles (is_system_role = true) - show read-only
- Save button calls mutation to update `role_permissions` table

**Mutations Needed**:
- `assignPermissionToRole(roleId, permissionId)` - Already exists in `permissionService.ts`
- `removePermissionFromRole(roleId, permissionId)` - Already exists in `permissionService.ts`

### 4. Service Functions to Implement

In `src/services/permissions/permissionService.ts`, add:

```typescript
/**
 * Get all permissions for a specific role (direct only, not inherited)
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
 * Get all permissions for a role including inherited from parent roles
 */
export async function getRolePermissionsWithInheritance(roleId: string, allRoles: Role[]): Promise<{
  direct: Permission[];
  inherited: Permission[];
}> {
  // Get direct permissions
  const direct = await getRolePermissions(roleId);

  // Get parent role permissions recursively
  const role = allRoles.find(r => r.id === roleId);
  let inherited: Permission[] = [];

  if (role?.parent_role_id) {
    const parentPerms = await getRolePermissionsWithInheritance(role.parent_role_id, allRoles);
    inherited = [...parentPerms.direct, ...parentPerms.inherited];
  }

  return { direct, inherited };
}
```

### 5. React Query Hooks to Add

In `src/hooks/permissions/usePermissions.ts`, add:

```typescript
/**
 * Get permissions for a specific role (direct only)
 */
export function useRolePermissions(roleId: string) {
  return useQuery({
    queryKey: [...permissionKeys.allRoles, roleId, 'permissions'],
    queryFn: () => getRolePermissions(roleId),
    enabled: !!roleId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get permissions with inheritance for a role
 */
export function useRolePermissionsWithInheritance(roleId: string) {
  const { data: allRoles } = useAllRoles();

  return useQuery({
    queryKey: [...permissionKeys.allRoles, roleId, 'permissions-inherited'],
    queryFn: () => getRolePermissionsWithInheritance(roleId, allRoles || []),
    enabled: !!roleId && !!allRoles,
    staleTime: 1000 * 60 * 5,
  });
}
```

---

## Implementation Requirements

1. **Update `RoleManagementPage.tsx`**:
   - Remove placeholder alert
   - Add permission display grouped by category
   - Show inherited vs direct permissions
   - Add color-coded badges for scopes
   - Add "Edit Permissions" button (admin only)

2. **Create Permission Edit Dialog**:
   - Similar to User Management role dialog
   - Checkboxes for all permissions
   - Group by category
   - Disable if system role
   - Use mutations from permissionService

3. **Add Service Functions**:
   - `getRolePermissions(roleId)`
   - `getRolePermissionsWithInheritance(roleId, allRoles)`

4. **Add React Query Hooks**:
   - `useRolePermissions(roleId)`
   - `useRolePermissionsWithInheritance(roleId)`

5. **UI/UX Considerations**:
   - Permission badges should be small and readable
   - Group permissions by category with counts
   - Show inherited permissions with icon (e.g., ArrowDownFromLine)
   - Color code scopes consistently
   - Disable editing for system roles

6. **Testing**:
   - View role with no parent (e.g., admin, agent)
   - View role with parent (e.g., upline_manager inherits from agent)
   - Verify inherited permissions show correctly
   - Test permission editing (if implemented)

---

## File Locations

**Files to modify**:
- `src/features/admin/components/RoleManagementPage.tsx` - Main page
- `src/services/permissions/permissionService.ts` - Add getRolePermissions functions
- `src/hooks/permissions/usePermissions.ts` - Add hooks

**Files to reference**:
- `src/features/admin/components/UserManagementPage.tsx` - Example dialog pattern
- `docs/rbac-implementation-guide.md` - Complete permission matrix

---

## Scope Colors (Consistent with User Management)

```typescript
const getScopeColor = (scope: string): string => {
  const colors: Record<string, string> = {
    own: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    downline: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    all: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    self: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };
  return colors[scope] || 'bg-gray-100 text-gray-800';
};
```

---

## Example Permission Display Structure

```tsx
{/* Permissions Section (when role is expanded) */}
<div className="space-y-4 mt-4">
  <div className="flex items-center justify-between">
    <h3 className="text-sm font-semibold">Permissions</h3>
    <div className="flex items-center gap-2">
      <Badge variant="secondary">
        {directPermissions.length} direct
      </Badge>
      {inheritedPermissions.length > 0 && (
        <Badge variant="outline">
          {inheritedPermissions.length} inherited
        </Badge>
      )}
      {isAdmin && !role.is_system_role && (
        <Button size="sm" variant="outline" onClick={() => openEditDialog(role)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Permissions
        </Button>
      )}
    </div>
  </div>

  {/* Group by category */}
  {Object.entries(permissionsByCategory).map(([category, perms]) => (
    <div key={category} className="space-y-2">
      <h4 className="text-sm font-medium capitalize flex items-center gap-2">
        {category}
        <Badge variant="secondary" className="text-xs">
          {perms.length}
        </Badge>
      </h4>
      <div className="flex flex-wrap gap-2">
        {perms.map((perm) => {
          const isInherited = inheritedPermissions.some(p => p.id === perm.id);
          return (
            <Badge
              key={perm.id}
              className={getScopeColor(perm.scope)}
              variant={isInherited ? "outline" : "secondary"}
            >
              {isInherited && <ArrowDownFromLine className="h-3 w-3 mr-1" />}
              {perm.code}
            </Badge>
          );
        })}
      </div>
    </div>
  ))}
</div>
```

---

## Success Criteria

✅ All role permissions display correctly grouped by category
✅ Inherited permissions clearly marked and differentiated
✅ Permission scopes color-coded consistently
✅ Edit dialog allows adding/removing permissions (admin only)
✅ System roles cannot be edited
✅ Changes persist to database via role_permissions table
✅ Page is responsive and accessible
✅ Loading states and error handling implemented

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
- Admin-only features protected by permissions
- Simple, clean, conventional code
- Test as you build

---

## Start Here

1. Read the existing `RoleManagementPage.tsx` to understand current structure
2. Add service functions for querying role permissions
3. Add React Query hooks
4. Update the page to display permissions grouped by category
5. Add edit dialog (optional, can be phase 2)
6. Test with different roles

Good luck! The foundation is solid - you just need to build the permission display UI.
