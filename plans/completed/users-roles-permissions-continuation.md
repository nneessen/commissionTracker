# Users, Roles, Permissions & Subscriptions Fix - Continuation Prompt

## CONTEXT FOR NEW CONVERSATION

You are continuing a major refactoring task for the users, roles, permissions, and subscriptions system. The previous session completed approximately 60% of the work.

## WHAT WAS COMPLETED

### Database Migrations (ALL DONE - Applied to Production)
1. `20251227_007_consolidate_agent_roles.sql` - Merged `active_agent` into `agent` role
2. `20251227_008_verify_super_admin.sql` - Set super admin flag for nickneessen@thestandardhq.com
3. `20251227_009_trainer_imo_access.sql` - Trainer/contracting manager IMO-wide access
4. `20251227_010_subscription_bypass.sql` - Subscription bypass function for staff roles
5. `20251227_011_role_management_rls.sql` - RLS policies for role CRUD

### Type System Changes (PARTIALLY DONE)
- ✅ Removed `active_agent` from `RoleName` type in `src/types/permissions.types.ts`
- ✅ Removed deprecated `User`, `Agent`, `CreateUserData`, `UpdateUserData` types from `src/types/user.types.ts`
- ✅ Updated `AuthContext.tsx` to use `Partial<UserProfile>` instead of `User`
- ✅ Changed `mapAuthUserToUser()` to `mapAuthUserToProfile()` in AuthContext
- ✅ Deleted legacy files: `src/types/legacy/user-v1.types.ts`, `src/services/settings/AgentRepository.ts`
- ✅ Fixed `src/services/users/index.ts` - removed legacy type exports
- ✅ Fixed `src/hooks/settings/useUpdateUserProfile.ts` - uses `UpdateUserProfileData`

### Code Fixes for active_agent Removal (DONE)
- ✅ `src/components/auth/ApprovalGuard.tsx` - removed `isActiveAgent` check
- ✅ `src/components/auth/RouteGuard.tsx` - removed `isActiveAgent` check
- ✅ `src/features/admin/components/AddUserDialog.tsx` - removed all `active_agent` references
- ✅ `src/test/checkUser.tsx` - removed `active_agent` role check

### Property Name Fixes (PARTIALLY DONE)
- ✅ `src/App.tsx` - changed `user.name` to use `getDisplayName()` helper
- ✅ `src/features/policies/PolicyForm.tsx` - changed `contractCompLevel` to `contract_level`
- ✅ `src/features/settings/components/UserProfile.tsx` - fixed `contractCompLevel` and `user.name`

## WHAT REMAINS TO BE DONE

### 1. Fix Remaining Property Name Mismatches
Files still need `contractCompLevel` → `contract_level` or `name` → `first_name/last_name`:
- `src/features/test/TestCompGuide.tsx` - line 21: `user?.contractCompLevel`
- `src/features/training-hub/components/ActionConfigPanel.tsx` - line 792: `user.name`

### 2. Fix Optional user.id Type Errors (user.id is now `string | undefined`)
Many files assume `user.id` is always defined. Need to add null checks or use `user?.id`:
- `src/contexts/AuthContext.tsx` - line 399
- `src/features/messages/hooks/useContactBrowser.ts` - lines 72, 88, 101, 115
- `src/features/messages/hooks/useContacts.ts` - line 66
- `src/features/messages/hooks/useFolderCounts.ts` - lines 89, 97
- `src/features/messages/hooks/useLabels.ts` - lines 29, 30, 38, 53, 60
- `src/features/messages/hooks/useSendEmail.ts` - lines 27, 47, 54, 75, 97, 103
- `src/features/messages/hooks/useThread.ts` - lines 32, 38
- `src/features/messages/hooks/useThreads.ts` - lines 44, 140
- `src/hooks/permissions/usePermissions.ts` - lines 79, 93, 107, 121, 135

### 3. Phase 3: Super Admin Implementation (NOT STARTED)
- Remove hardcoded `ADMIN_EMAILS` array from `src/components/auth/RouteGuard.tsx`
- Replace with `is_super_admin` flag check from user profile
- Add `useIsSuperAdmin` hook to `src/hooks/permissions/usePermissions.ts`

### 4. Phase 4: Trainer/Contracting Manager Fixes (NOT STARTED)
- Fix agent list filtering to exclude trainer/contracting_manager
- Fix recruiting list filtering
- Add subscription bypass check in `src/hooks/subscription/useFeatureAccess.ts`

### 5. Phase 5: AddUser Dialog - IMO/Agency Selection (NOT STARTED)
- Add IMO dropdown (required for all users)
- Add Agency dropdown (required for recruit/agent, optional for staff)
- File: `src/features/admin/components/AddUserDialog.tsx`

### 6. Phase 6: Role CRUD Implementation (NOT STARTED)
- Fix broken role action buttons in `src/features/admin/components/RoleManagementPage.tsx`
- Verify mutations work with new RLS policies

### 7. Run Build and Verify
- `npm run build` must pass with zero TypeScript errors
- Test the app manually

## COMMANDS TO RUN FIRST

```bash
# Check current build errors
npm run build 2>&1 | head -60

# The build should show remaining errors to fix
```

## KEY FILES REFERENCE

| File | Purpose |
|------|---------|
| `src/types/user.types.ts` | Canonical UserProfile type |
| `src/types/permissions.types.ts` | RoleName, ROLES constants |
| `src/contexts/AuthContext.tsx` | Auth state using Partial<UserProfile> |
| `src/components/auth/RouteGuard.tsx` | Has hardcoded ADMIN_EMAILS to remove |
| `src/hooks/subscription/useFeatureAccess.ts` | Needs subscription bypass for staff |
| `src/features/admin/components/AddUserDialog.tsx` | Needs IMO/Agency fields |

## PLAN FILE LOCATION

Full plan details: `/Users/nickneessen/.claude/plans/floating-noodling-lampson.md`

## CONTINUATION PROMPT

```
Continue the users/roles/permissions fix from the previous session.

Read plans/active/users-roles-permissions-continuation.md for context on what was done and what remains.

Start by running `npm run build` to see remaining errors, then fix them in order:
1. Fix remaining property name mismatches (TestCompGuide.tsx, ActionConfigPanel.tsx)
2. Fix optional user.id type errors in all message hooks and usePermissions
3. Remove hardcoded ADMIN_EMAILS from RouteGuard, use is_super_admin flag
4. Add subscription bypass for trainer/contracting_manager in useFeatureAccess
5. Add IMO/Agency selection to AddUserDialog
6. Verify role CRUD works in admin page
7. Run final build and test
```
