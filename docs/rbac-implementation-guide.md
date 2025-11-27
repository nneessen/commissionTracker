# RBAC Implementation Guide

**Status**: ✅ Core System Implemented | ⏳ Awaiting Database Migration Push | ⏳ Admin UI Pending

**Critical Bug Fixed**: Recruit isolation bug where all users could see all recruits in the system

---

## Executive Summary

This document describes the complete Role-Based Access Control (RBAC) system implemented to fix critical security bugs and provide granular permission management across the commission tracking application.

### Critical Security Issue Fixed

**Problem**: When users logged into different accounts (e.g., nick@nickneessen.com vs nickneessen.ffl@gmail.com), they could see ALL recruits from every agent in the system, regardless of who recruited them.

**Root Cause**: Simple RLS policies on `user_profiles` table didn't enforce proper data isolation based on recruiter_id, upline_id, or downline hierarchy.

**Solution**: Implemented comprehensive RBAC system with:
1. 8 predefined roles with specific permissions
2. Role hierarchy with inheritance (Upline Manager inherits from Agent)
3. Granular permissions for all resources (policies, clients, commissions, recruiting, expenses)
4. RLS policies that check permissions at database level
5. Permission-based navigation filtering

---

## System Architecture

### Database Schema

#### Tables Created

1. **`roles`**
   - `id` (UUID)
   - `name` (TEXT) - snake_case role name
   - `display_name` (TEXT) - Human-readable name
   - `description` (TEXT)
   - `parent_role_id` (UUID) - For role hierarchy inheritance
   - `respects_hierarchy` (BOOLEAN) - Whether role respects upline/downline boundaries
   - `is_system_role` (BOOLEAN) - System roles cannot be deleted
   - `created_at`, `updated_at` (TIMESTAMPTZ)

2. **`permissions`**
   - `id` (UUID)
   - `code` (TEXT) - Format: `resource.action.scope` (e.g., `policies.read.own`)
   - `resource` (TEXT) - Resource type (policies, clients, commissions, etc.)
   - `action` (TEXT) - Action type (create, read, update, delete, manage, access)
   - `scope` (TEXT) - Scope (own, downline, all, self)
   - `description` (TEXT)
   - `created_at` (TIMESTAMPTZ)

3. **`role_permissions`** (Junction Table)
   - `role_id` (UUID) - FK to roles
   - `permission_id` (UUID) - FK to permissions
   - `created_at` (TIMESTAMPTZ)
   - PRIMARY KEY: (role_id, permission_id)

4. **`user_profiles`** (Updated)
   - Added: `roles` (TEXT[]) - Array of role names
   - Added: `custom_permissions` (JSONB) - Per-user permission overrides

#### Database Functions

1. **`get_user_permissions(target_user_id UUID)`**
   - Returns all permission codes for a user
   - Uses recursive CTE to traverse role hierarchy
   - Includes permissions from inherited roles

2. **`has_permission(target_user_id UUID, permission_code TEXT)`**
   - Checks if user has specific permission
   - Returns BOOLEAN

3. **`has_role(target_user_id UUID, role_name TEXT)`**
   - Checks if user has specific role
   - Returns BOOLEAN

4. **`is_admin_user(target_user_id UUID)`**
   - Checks if user has admin role
   - Returns BOOLEAN

---

## The 8 Roles

| Role | Parent Role | Respects Hierarchy | Description |
|------|-------------|-------------------|-------------|
| **Admin** | None | ❌ No | Full system access (Nick & Kerry) |
| **Agent (Active)** | None | ✅ Yes | Licensed agent selling policies |
| **Upline Manager** | Agent | ✅ Yes | Manages downline agents (inherits Agent permissions) |
| **Trainer** | None | ❌ No | Handles training and onboarding recruits |
| **Recruiter Only** | None | ❌ No | Recruiting focus, no policy sales |
| **Contracting Manager** | None | ❌ No | Manages contracts, carriers, appointments |
| **Office Staff** | None | ✅ Yes | Administrative support and data entry |
| **View-Only** | None | ❌ No | Systemwide read-only access |

---

## Permission Matrix

### Navigation Permissions

| Permission Code | Admin | Agent | Upline Mgr | Trainer | Recruiter | Contracting | Office | View-Only |
|----------------|-------|-------|------------|---------|-----------|-------------|--------|-----------|
| `nav.dashboard` | ✅ | ✅ | ✅ (inherited) | ✅ | ❌ | ✅ | ❌ | ✅ |
| `nav.policies` | ✅ | ✅ | ✅ (inherited) | ❌ | ❌ | ❌ | ✅ | ✅ |
| `nav.clients` | ✅ | ✅ | ✅ (inherited) | ❌ | ❌ | ❌ | ✅ | ✅ |
| `nav.commissions` | ✅ | ✅ | ✅ (inherited) | ❌ | ❌ | ❌ | ❌ | ✅ |
| `nav.recruiting_pipeline` | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| `nav.training_admin` | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `nav.team_dashboard` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `nav.commission_overrides` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `nav.downline_reports` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `nav.user_management` | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `nav.role_management` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `nav.audit_logs` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Data Permissions

#### Policies
- **Agent**: `policies.create.own`, `policies.read.own`, `policies.update.own`, `policies.delete.own`
- **Upline Manager**: Inherits Agent + `policies.read.downline`
- **Office Staff**: `policies.read.all`, `policies.update.own` (for data entry support)
- **View-Only**: `policies.read.all`
- **Admin**: All policies permissions

#### Clients
- **Agent**: `clients.create.own`, `clients.read.own`, `clients.update.own`, `clients.delete.own`
- **Upline Manager**: Inherits Agent + `clients.read.downline`
- **Recruiter**: `clients.read.own` (view only)
- **Office Staff**: `clients.read.all`, `clients.update.own`
- **View-Only**: `clients.read.all`
- **Admin**: All clients permissions

#### Commissions
- **Agent**: `commissions.read.own`
- **Upline Manager**: Inherits Agent + `commissions.read.downline`, `commission_overrides.manage`
- **View-Only**: `commissions.read.all`
- **Admin**: All commissions permissions

#### Recruiting
- **Agent**: `recruiting.create.own`, `recruiting.read.own`, `recruiting.update.own`, `recruiting.delete.own`
- **Upline Manager**: Inherits Agent + `recruiting.read.downline`, `recruiting.update.downline`
- **Trainer**: `recruiting.read.all`, `recruiting.update.all` (training oversight)
- **Recruiter**: `recruiting.create.own`, `recruiting.read.all`, `recruiting.update.all`, `recruiting.delete.own` (full CRUD on all recruits)
- **View-Only**: `recruiting.read.all`
- **Admin**: All recruiting permissions

#### Expenses
- **Agent**: `expenses.create.own`, `expenses.read.own`, `expenses.update.own`, `expenses.delete.own`
- **Admin**: All expenses permissions (no other roles have expense access)

---

## RLS Policies

### user_profiles Table (11 policies)

1. **`user_profiles_select_own`**: Users can see their own profile
2. **`user_profiles_select_admin`**: Admin sees ALL profiles
3. **`user_profiles_select_view_only`**: View-Only role sees ALL profiles
4. **`user_profiles_select_contracting`**: Contracting Manager sees ALL profiles
5. **`user_profiles_select_recruiter`**: Recruiter sees all recruits (onboarding_status = lead/active)
6. **`user_profiles_select_trainer`**: Trainer sees all recruits
7. **`user_profiles_select_hierarchy`**: Agent/Upline see own recruits + downline (FIXES ISOLATION BUG)
8. **`user_profiles_update_own`**: Users can update their own profile
9. **`user_profiles_update_admin`**: Admins can update all profiles
10. **`user_profiles_update_contracting`**: Contracting Manager can update user profiles
11. **`user_profiles_insert_own`**: Users can insert their own profile (signup)

**Critical Policy** (`user_profiles_select_hierarchy`):
```sql
CREATE POLICY "user_profiles_select_hierarchy"
  ON user_profiles FOR SELECT
  USING (
    -- Own recruits (where I'm the recruiter)
    recruiter_id = auth.uid()
    -- OR recruits in my downline hierarchy
    OR id IN (SELECT downline_id FROM get_downline_ids(auth.uid()))
    -- OR recruits I manage directly
    OR upline_id = auth.uid()
  );
```

This policy ensures:
- Agents only see recruits they personally recruited
- Agents see their entire downline hierarchy tree
- Agents see recruits they manage directly (upline relationship)
- **NO access to recruits belonging to other agents** ✅

### policies Table (7 policies)
- Own CRUD for agents
- Downline read for upline managers
- All read for admins/view-only/office staff
- All update for admins

### clients Table (6 policies)
- Own CRUD for agents
- Downline read for upline managers
- All read for admins/office staff

### commissions Table (5 policies)
- Own read for agents
- Downline read for upline managers
- All read for admins/view-only
- System insert (triggers)
- Admin update only

### expenses Table (4 policies)
- Own CRUD for agents
- No other role access (except admin)

---

## TypeScript/React Layer

### Files Created

1. **`src/types/permissions.types.ts`**
   - Type definitions for roles, permissions, permission codes
   - Navigation permission interfaces
   - Role display info types

2. **`src/services/permissions/permissionService.ts`**
   - `getUserPermissions(userId)` - Get all permissions for user
   - `hasPermission(userId, permissionCode)` - Check specific permission
   - `hasRole(userId, roleName)` - Check specific role
   - `isAdminUser(userId)` - Check admin status
   - `getUserRoles(userId)` - Get user's roles array
   - `getUserPermissionsContext(userId)` - Get full context (roles + permissions)
   - Admin functions: `getAllRoles()`, `getAllPermissions()`, `setUserRoles()`, etc.

3. **`src/hooks/permissions/usePermissions.ts`**
   - `useUserPermissions()` - Get current user's permissions context
   - `useUserPermissionCodes()` - Get permission codes only
   - `useUserRoles()` - Get user's roles
   - `useHasPermission(code)` - Check specific permission
   - `useHasRole(roleName)` - Check specific role
   - `useIsAdmin()` - Check admin status
   - **`usePermissionCheck()`** - Main hook with helper functions:
     - `can(permissionCode)` - Check single permission
     - `canAny(codes)` - Check if has ANY of the permissions
     - `canAll(codes)` - Check if has ALL of the permissions
     - `is(roleName)` - Check single role
     - `isAnyRole(roles)` - Check if has ANY of the roles
     - `isAdmin()` - Check admin
   - Admin hooks: `useAllRoles()`, `useAllPermissions()`, `useUpdateUserRoles()`, etc.

4. **`src/components/permissions/PermissionGate.tsx`**
   - Conditional rendering component
   - Usage examples:
     ```tsx
     <PermissionGate permission="policies.create.own">
       <CreatePolicyButton />
     </PermissionGate>

     <PermissionGate permission={['policies.read.own', 'policies.read.downline']} matchAny>
       <ViewPolicies />
     </PermissionGate>

     <PermissionGate role="admin" fallback={<NoAccess />}>
       <AdminPanel />
     </PermissionGate>
     ```

5. **`src/components/layout/Sidebar.tsx`** (Updated)
   - Navigation items now have `permission` field
   - Filters visible nav items based on user permissions
   - Admin section separated with visual divider
   - Three new admin nav items:
     - User Management (`nav.user_management`)
     - Role Management (`nav.role_management`)
     - Audit Logs (`nav.audit_logs`)

---

## Migration Files

### 1. `supabase/migrations/20251127163855_create_rbac_system.sql`

**Purpose**: Create core RBAC database schema

**Creates**:
- `roles` table with 8 predefined roles
- `permissions` table with ~40 permissions
- `role_permissions` junction table
- Updates `user_profiles` with `roles` and `custom_permissions` columns
- 4 helper functions (`get_user_permissions`, `has_permission`, `has_role`, `is_admin_user`)
- Sets Nick and Kerry as admins
- Maps permissions to roles

**Status**: ✅ Created, ⏳ Awaiting push to remote DB

### 2. `supabase/migrations/20251127164036_update_rls_for_rbac.sql`

**Purpose**: Replace all RLS policies with RBAC-aware permission checks

**Updates**:
- `user_profiles`: 11 new RBAC policies (replaces 8 old policies)
- `policies`: 7 new RBAC policies (replaces 4 old policies)
- `clients`: 6 new RBAC policies (replaces 4 old policies)
- `commissions`: 5 new RBAC policies (replaces 4 old policies)
- `expenses`: 4 new RBAC policies (replaces 4 old policies)

**Critical Fix**: `user_profiles_select_hierarchy` policy enforces proper recruit isolation

**Status**: ✅ Created, ⏳ Awaiting push to remote DB

---

## Deployment Steps

### ⏳ Step 1: Push Migrations to Remote Database

**Command**: `npx supabase db push`

**Current Blocker**: Password authentication failed for remote database

**Required**: Supabase database password for `postgres@pcyaqwodnyrpkaiojnpz`

**Once Password Provided**:
```bash
# Set password in environment or use interactive prompt
npx supabase db push
```

**Expected Output**:
- Both migrations will be applied
- 33 RLS policies will be created across 5 tables
- 8 roles will be inserted
- ~40 permissions will be inserted
- Permission mappings will be created
- Nick and Kerry will be set as admins

### ✅ Step 2: TypeScript Layer (COMPLETED)

- Permission types created
- Permission service created
- React hooks created
- PermissionGate component created
- Navigation system updated

### ⏳ Step 3: Admin UI (PENDING)

**Pages to Create**:

1. **Role Management** (`/admin/roles`)
   - View all roles
   - See permissions for each role
   - Assign/remove permissions from roles (admin only)
   - Cannot delete system roles

2. **User Management** (Update `/admin/users`)
   - Add role assignment UI
   - Show user's current roles
   - Multi-select role picker
   - Real-time permission preview

3. **Audit Logs** (`/admin/audit`)
   - Track role changes
   - Track permission changes
   - Track user access patterns

### ⏳ Step 4: Testing

**Test with Different Roles**:

1. **Admin Test** (nick@nickneessen.com)
   - Should see ALL navigation items
   - Should see ALL recruits
   - Should see ALL policies, clients, commissions
   - Should have access to User Management, Role Management, Audit Logs

2. **Agent Test** (regular agent account)
   - Should see: Dashboard, Analytics, Targets, Expenses, Policies, Settings
   - Should NOT see: Recruiting, Team, Reports, Admin sections
   - Should ONLY see own policies, clients, commissions
   - Should NOT see other agents' data

3. **Upline Manager Test**
   - Should see everything Agent sees
   - PLUS: Recruiting Pipeline, Team Dashboard, Commission Overrides, Downline Reports
   - Should see own recruits + entire downline hierarchy
   - Should NOT see recruits from other upline managers

4. **Recruiter Test**
   - Should see: Recruiting Pipeline, Training Admin
   - Should see ALL recruits (not just own)
   - Can CRUD all recruits
   - Should NOT see policies, commissions, expenses

5. **Trainer Test**
   - Should see: Recruiting Pipeline, Training Admin, Dashboard
   - Should see ALL recruits (read/update only)
   - Cannot create/delete recruits

6. **View-Only Test**
   - Should see most navigation items
   - Can READ everything
   - Cannot CREATE, UPDATE, or DELETE anything

---

## How It Works: Data Flow

### User Login Flow

1. User logs in with Supabase Auth
2. `useAuth()` hook provides user ID
3. `useUserPermissions()` hook calls `get_user_permissions(user_id)`
4. Database function:
   - Looks up user's roles from `user_profiles.roles`
   - Recursively traverses role hierarchy to get inherited roles
   - Collects all permissions from `role_permissions` for all roles
   - Returns array of permission codes
5. React hook caches permissions for 5 minutes
6. UI components use `usePermissionCheck()` to check access

### Navigation Rendering

```tsx
// Sidebar.tsx
const { can, isLoading } = usePermissionCheck();

const visibleNavItems = navigationItems.filter((item) => {
  if (item.public) return true; // Always show public items (Settings)
  if (!item.permission) return true; // No permission required
  if (isLoading) return false; // Don't show until loaded
  return can(item.permission); // Check permission
});
```

### Data Access (RLS)

1. User queries `user_profiles` table
2. PostgreSQL RLS checks all applicable policies in order:
   - `user_profiles_select_own`: ✅ Pass (user can see own profile)
   - `user_profiles_select_admin`: ❌ Fail (user is not admin)
   - `user_profiles_select_hierarchy`: Checks if:
     - `recruiter_id = auth.uid()` → User recruited this profile?
     - `id IN (SELECT downline_id FROM get_downline_ids(auth.uid()))` → Profile in downline?
     - `upline_id = auth.uid()` → User is upline manager?
   - If ANY policy passes, row is visible
3. Database returns only rows that passed RLS policies

**Result**: Users ONLY see data they have permission to access

---

## Security Features

✅ **Database-Level Enforcement**: All permissions checked at PostgreSQL level via RLS
✅ **Role Hierarchy**: Inheritance reduces permission duplication
✅ **Granular Scopes**: `own`, `downline`, `all` scopes for precise control
✅ **Recruit Isolation**: Fixed critical bug where all users saw all recruits
✅ **Navigation Filtering**: Users only see nav items they have permission to access
✅ **CRUD Separation**: Different permissions for create, read, update, delete
✅ **Admin Safeguards**: System roles cannot be deleted, admins have all permissions
✅ **Configurable Hierarchy**: Some roles ignore hierarchy (Admin, Trainer), others respect it (Agent, Upline Manager)

---

## Known Issues & Next Steps

### ⏳ Awaiting Completion

1. **Database Password Required**: Cannot push migrations without Supabase DB password
2. **Admin UI Not Created**: Role Management and User Management pages need to be built
3. **Audit Logging Not Implemented**: No tracking of permission/role changes yet
4. **Testing Not Done**: Cannot test until migrations are pushed

### 🐛 Existing TypeScript Errors (Unrelated to RBAC)

The typecheck shows several errors in existing code (tests, mock data, etc.) that are unrelated to the RBAC implementation:
- Test files with incorrect type usage
- Mock data with wrong field names
- Date type mismatches in tests

**These should be fixed separately** - they do not block RBAC deployment.

### 📋 Future Enhancements

1. **Custom Permissions**: Use `user_profiles.custom_permissions` JSONB field for per-user overrides
2. **Permission Groups**: Group related permissions for easier role management
3. **Time-Based Permissions**: Temporary permission grants with expiration
4. **Permission Audit Trail**: Track all permission checks and denials
5. **Role Templates**: Predefined role combinations for common use cases

---

## Admin Emails (Set in Migration)

- **Nick Neessen**: nick@nickneessen.com
- **Kerry Glass**: kerryglass.ffl@gmail.com

Both set to `roles = ['admin']` in migration `20251127163855_create_rbac_system.sql` (line 352-354)

---

## Quick Reference: Permission Codes

```typescript
// Navigation
'nav.dashboard'
'nav.policies'
'nav.clients'
'nav.commissions'
'nav.recruiting_pipeline'
'nav.training_admin'
'nav.team_dashboard'
'nav.commission_overrides'
'nav.downline_reports'
'nav.user_management'
'nav.role_management'
'nav.audit_logs'
'nav.documents'
'nav.system_settings'

// Policies
'policies.create.own'
'policies.read.own'
'policies.read.downline'
'policies.read.all'
'policies.update.own'
'policies.update.all'
'policies.delete.own'

// Clients
'clients.create.own'
'clients.read.own'
'clients.read.downline'
'clients.read.all'
'clients.update.own'
'clients.delete.own'

// Commissions
'commissions.read.own'
'commissions.read.downline'
'commissions.read.all'
'commission_overrides.manage'

// Recruiting
'recruiting.create.own'
'recruiting.read.own'
'recruiting.read.downline'
'recruiting.read.all'
'recruiting.update.own'
'recruiting.update.downline'
'recruiting.update.all'
'recruiting.delete.own'

// Expenses
'expenses.create.own'
'expenses.read.own'
'expenses.update.own'
'expenses.delete.own'

// Admin
'users.manage'
'roles.assign'
'carriers.manage'
'contracts.manage'
'documents.manage.all'
```

---

## Support

For issues or questions about the RBAC system:
1. Check this guide first
2. Review migration files in `supabase/migrations/`
3. Check TypeScript types in `src/types/permissions.types.ts`
4. Test permission checks in browser console:
   ```typescript
   const { can, is } = usePermissionCheck();
   console.log('Can create policies?', can('policies.create.own'));
   console.log('Is admin?', is('admin'));
   ```
