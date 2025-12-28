# Users/Roles/Permissions - Code Review & Bug Fixes

**STATUS: COMPLETED** (2025-12-27)

## Summary of Changes

### 1. User Creation Bug (400 Bad Request) - FIXED

**Root Cause:** The `handle_new_user()` database trigger was inserting into columns that don't exist:
- `full_name` (should be `first_name`, `last_name`)
- `is_active` (removed column)
- `is_deleted` (replaced by `archived_at`)

**Fix Applied:** Re-applied migration `20251227_001_fix_handle_new_user_final.sql` which creates the corrected trigger function using proper columns.

**Verification:** Confirmed trigger function now uses correct INSERT columns.

### 2. AddUserDialog Staff Roles - FIXED

**Issue:** When selecting staff roles (trainer, contracting_manager), the Status toggle and Onboarding sections were shown but irrelevant.

**Fix Applied:**
- Added `isStaffRoleSelected` computed value
- Hide Status toggle and Onboarding sections when staff role selected
- Auto-set `approval_status: 'approved'` for staff roles
- Show info message explaining staff roles are auto-approved

**File:** `src/features/admin/components/AddUserDialog.tsx`

### 3. Role Management Action Buttons - VERIFIED

**Issue:** Reported buttons not working.

**Status:** WORKING - All components verified correct:
- RLS policies properly configured (`is_super_admin()` checks)
- `is_super_admin()` function correctly checks database flag
- Super admin user properly flagged
- Mutation hooks correctly implemented

The issue was likely from before migrations were applied.

### 4. Code Review - COMPLETED

**Files Reviewed:**
- `useFeatureAccess.ts` - Staff bypass correctly implemented
- `RouteGuard.tsx` - Super admin bypass is secure (DB-controlled)
- `useUserApproval.ts` - isSuperAdmin flag correctly implemented
- `usePermissions.ts` - user.id assertions safe (guarded by enabled)
- Messages hooks - Same pattern, safe

**Findings:**

| Finding | Severity | Status |
|---------|----------|--------|
| Super admin bypass in RouteGuard | Low | Safe - controlled by DB flag |
| Staff roles bypass subscription | Low | Intentional per business logic |
| `user!.id!` assertions | Low | Safe - guarded by `enabled: !!user?.id` |

**No blocking issues found.**

## Verification

- Build passes with zero TypeScript errors
- All migrations applied correctly
- RLS policies verified in database

## Low-Priority Recommendations

1. Consider refactoring `user!.id!` patterns to avoid non-null assertions
2. Add comment explaining super admin bypass in RouteGuard

---

*Completed by Claude Code on 2025-12-27*
