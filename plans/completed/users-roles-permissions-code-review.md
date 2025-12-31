# Users/Roles/Permissions - Code Review & Bug Fixes

**STATUS: COMPLETED** (2025-12-27)

## Summary of Changes

### 1. User Creation Bug (400 Bad Request) - FIXED

**Root Cause:** The `handle_new_user()` database trigger was inserting into columns that don't exist:
- `full_name` (should be `first_name`, `last_name`)
- `is_active` (removed column)
- `is_deleted` (replaced by `archived_at`)

**Fix Applied:** Re-applied migration `20251227_001_fix_handle_new_user_final.sql` which creates the corrected trigger function using proper columns.

### 2. AddUserDialog Staff Roles - FIXED

**Issue:** When selecting staff roles (trainer, contracting_manager), the Status toggle and Onboarding sections were shown but irrelevant.

**Fix Applied:**
- Added `isStaffRoleSelected` computed value
- Hide Status toggle and Onboarding sections when staff role selected
- Auto-set `approval_status: 'approved'` for staff roles
- Show info message explaining staff roles are auto-approved

**File:** `src/features/admin/components/AddUserDialog.tsx`

### 3. Role Management Action Buttons - **ACTUALLY FIXED**

**Root Cause:** The action buttons in `AdminControlCenter.tsx` had **no onClick handlers** - they literally did nothing. The separate `RoleManagementPage.tsx` file was never even used in the app.

**Fix Applied (AdminControlCenter.tsx):**
- Added "Create Role" button in the Roles & Permissions tab
- Added Edit button with `onClick={() => openEditRoleDialog(role)}`
- Added Delete button with `onClick={() => openDeleteRoleDialog(role)}`
- Added 3 dialog components: Create Role, Edit Role, Delete Role
- Added state for dialogs and form data
- Added mutation hooks: `useCreateRole`, `useUpdateRole`, `useDeleteRole`
- Added proper error handling with toast notifications
- System roles are disabled (cannot edit/delete)

**Files Changed:**
- `src/features/admin/components/AdminControlCenter.tsx` (main fix)
- `src/features/admin/components/AddUserDialog.tsx`
- `src/services/permissions/PermissionRepository.ts` (improved error handling)

### 4. Code Review - COMPLETED

No blocking issues found. Low-priority recommendations:
1. Consider removing unused `RoleManagementPage.tsx`
2. Refactor `user!.id!` patterns to avoid non-null assertions

## Verification

- ✅ Build passes with zero TypeScript errors
- ✅ Dev server starts successfully
- ✅ Database trigger fixed
- ✅ RLS policies verified
- ✅ Role CRUD buttons now have working onClick handlers and dialogs

---

*Completed by Claude Code on 2025-12-27*
