# Users/Roles/Permissions - Code Review & Bug Fixes

## CONTEXT

The previous session completed the type system cleanup and migrations for users/roles/permissions. However, several critical bugs and missing functionality were discovered:

## CRITICAL BUGS TO FIX

### 1. User Creation Fails (400 Bad Request)

**Error:**
```
POST https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/create-auth-user 400 (Bad Request)
[userService.create] Edge function failed: {status: 400, error: 'Database error creating new user'}
```

**Location:** `src/services/users/userService.ts:248`

**Likely Cause:** The edge function `create-auth-user` or the database trigger for user creation is failing. May be related to:
- Missing required fields in the payload (imo_id, agency_id now being sent)
- Database trigger `handle_new_user` expecting different data
- RLS policy blocking the insert

**Files to investigate:**
- `supabase/functions/create-auth-user/index.ts`
- `src/services/users/userService.ts` - the `create()` method
- Database trigger for `auth.users` insert
- RLS policies on `user_profiles` table

### 2. AddUserDialog: Conditional Fields for Staff Roles

**Issue:** When selecting `trainer` or `contracting_manager` role:
- Status toggle (Approved/Pending) should NOT be shown
- Onboarding status should NOT be shown
- Agency should be OPTIONAL (not required)

Staff roles don't go through the recruit → agent pipeline, so these fields are irrelevant.

**File:** `src/features/admin/components/AddUserDialog.tsx`

**Fix needed:**
- Detect if selected roles include `trainer` or `contracting_manager`
- Hide status/onboarding sections for staff roles
- Set default approval_status to 'approved' for staff roles
- Make agency optional (it already is, but UI should reflect this)

### 3. Role Management Action Buttons Not Working

**Issue:** The action buttons in the Roles & Permissions tab were never fixed.

**File:** `src/features/admin/components/RoleManagementPage.tsx`

**Investigate:**
- Are the mutations being called correctly?
- Are there RLS policy issues preventing CRUD operations?
- Check if `useCreateRole`, `useUpdateRole`, `useDeleteRole` hooks work

## CODE REVIEW REQUIRED

Review ALL changes made in commits:
- `e090e0d` - feat(auth): complete users/roles/permissions system overhaul
- `321d1ff` - fix(migration): add DROP POLICY IF EXISTS

### Files Changed to Review:

**Critical (high bug risk):**
- `src/features/admin/components/AddUserDialog.tsx` - IMO/Agency selection added
- `src/hooks/subscription/useFeatureAccess.ts` - Subscription bypass added
- `src/components/auth/RouteGuard.tsx` - ADMIN_EMAILS removed
- `src/hooks/admin/useUserApproval.ts` - isSuperAdmin added

**Medium (type safety):**
- `src/contexts/AuthContext.tsx` - user.id optional handling
- `src/hooks/permissions/usePermissions.ts` - user.id! assertions
- `src/features/messages/hooks/*.ts` - user.id! assertions (7 files)

**Low (simple fixes):**
- `src/features/test/TestCompGuide.tsx`
- `src/features/training-hub/components/ActionConfigPanel.tsx`
- `src/types/legacy/index.ts`

### Review Checklist:

1. **Type Safety**
   - [ ] All `user!.id!` assertions are protected by `enabled: !!user?.id`
   - [ ] No null pointer exceptions possible at runtime

2. **Security**
   - [ ] `isSuperAdmin` check is secure (uses DB flag, not client-side)
   - [ ] Subscription bypass only applies to intended roles
   - [ ] RLS policies are correctly configured

3. **Business Logic**
   - [ ] Staff roles (trainer, contracting_manager) don't need approval flow
   - [ ] IMO/Agency assignment logic is correct
   - [ ] Role CRUD respects system role protection

4. **Edge Cases**
   - [ ] What happens if user has no IMO assigned?
   - [ ] What happens if agency is deleted while user assigned?
   - [ ] What if super admin flag is removed mid-session?

## MIGRATIONS APPLIED

All 5 migrations were applied successfully:
- `20251227_007_consolidate_agent_roles.sql`
- `20251227_008_verify_super_admin.sql`
- `20251227_009_trainer_imo_access.sql`
- `20251227_010_subscription_bypass.sql`
- `20251227_011_role_management_rls.sql`

## CONTINUATION PROMPT

```
Continue fixing the users/roles/permissions system.

Read plans/active/users-roles-permissions-code-review.md for context.

PRIORITY ORDER:

1. **FIX USER CREATION BUG** (Critical)
   - Debug why create-auth-user edge function returns 400
   - Check the payload being sent from userService.create()
   - Check the edge function code in supabase/functions/create-auth-user/
   - Check database triggers and RLS policies

2. **FIX AddUserDialog for Staff Roles**
   - When trainer or contracting_manager is selected:
     - Hide status toggle (default to 'approved')
     - Hide onboarding status section
     - Make agency selection clearly optional
   - File: src/features/admin/components/AddUserDialog.tsx

3. **FIX Role Management Action Buttons**
   - Test create/edit/delete role functionality
   - File: src/features/admin/components/RoleManagementPage.tsx
   - Verify RLS policies allow super admin to perform CRUD

4. **CODE REVIEW**
   - Review all changes from commits e090e0d and 321d1ff
   - Look for type safety issues, security concerns, edge cases
   - Run npm run build to verify no regressions

Start by investigating the user creation error - check the edge function logs or test the payload manually.
```

## USEFUL COMMANDS

```bash
# Check edge function logs
npx supabase functions logs create-auth-user

# Test build
npm run build

# Check current errors
npm run typecheck
```
