# Continuation Prompt: Post-Permission System Fix

## What Was Fixed (Session 2024-12-14)

### Root Cause: Permission Column Name Mismatch
The `getUserPermissions()` function in `permissionService.ts` was extracting `row.permission_code` but the `get_user_permissions` RPC function returns `{ code: string }`. This resulted in an array of 49 `null` values instead of actual permission strings.

**Fix:** Changed `row.permission_code` to `row.code` in line 30 of `permissionService.ts`.

### Additional Changes Made
1. **userService.ts** - Complete rewrite using proper database types from `user.types.ts`
2. **user_id → id migration** - Updated all queries to `user_profiles` table to use `.eq('id', ...)` instead of `.eq('user_id', ...)`
3. **lib/constants.ts** - Created constants file for `VALID_CONTRACT_LEVELS`
4. **Removed deprecated files** - Deleted `userService.optimized.ts`
5. **Debug logging** - Cleaned up after identifying the issue

## Potential Issues to Verify

### 1. Other RPC Functions with Column Name Mismatches
Check if any other RPC functions might have similar column name issues:

**Files using `.rpc()` calls:**
- `src/services/reports/insightsService.ts` - `getuser_commission_profile`
- `src/services/clients/clientService.ts` - `get_clients_with_stats`
- `src/services/commissions/CommissionStatusService.ts` - `calculate_months_paid`, `calculate_chargeback_on_policy_lapse`, `get_at_risk_commissions`
- `src/services/hierarchy/invitationService.ts` - `validate_invitation_eligibility`, `validate_invitation_acceptance`
- `src/services/workflowService.ts` - `can_workflow_run`
- `src/services/workflow-recipient-resolver.ts` - `get_downline_with_emails`, `get_upline_chain`
- `src/services/commissions/commissionRateService.ts` - `getuser_commission_profile`
- `src/hooks/admin/useUsersView.ts` - `admin_get_allusers`
- `src/features/hierarchy/components/InviteDownline.tsx` - `lookupuser_by_email`

**Verification approach:** For each RPC, compare the returned column names (from `pg_proc`) with what the TypeScript code expects.

### 2. Permission Service - `get_role_permissions_with_inheritance`
This RPC aliases `p.code as permission_code` in the SQL, so the TypeScript code using `row.permission_code` is CORRECT for this specific function. No fix needed.

### 3. Remaining `user_id` References
All `user_profiles.user_id` references have been updated to use `id`. Verify no new code has been added that uses the old pattern:
```bash
grep -r "user_profiles.*user_id" src/
```

### 4. Type Definitions
The `database.types.ts` file should be regenerated if schema changes were made:
```bash
npx supabase gen types typescript --project-id <project-id> > src/types/database.types.ts
```

## Testing Checklist

- [ ] Login as admin (nick@nickneessen.com) - sidebar shows all navigation items
- [ ] Login as regular agent - sidebar shows appropriate items
- [ ] Login as recruit - sidebar shows only recruit navigation
- [ ] Permission-guarded routes work correctly
- [ ] Admin functions (user management, approvals) work correctly
- [ ] User profile updates work correctly
- [ ] Contract level changes work correctly

## Files Changed in This Session

```
src/services/permissions/permissionService.ts  - CRITICAL FIX (row.code)
src/services/users/userService.ts              - Complete rewrite
src/services/users/index.ts                    - Updated exports
src/types/user.types.ts                        - Added null to optional fields
src/lib/constants.ts                           - NEW: Contract level constants
src/components/layout/Sidebar.tsx              - Cleaned up debug code
src/contexts/AuthContext.tsx                   - Cleaned up debug code
src/hooks/permissions/usePermissions.ts        - Cleaned up debug code
+ Multiple files with user_id → id fixes
```

## Next Steps

1. Test all permission-based functionality thoroughly
2. Verify RPC column names match TypeScript expectations for all RPC calls
3. Consider adding runtime validation for RPC responses to catch similar issues early
4. Remove any remaining deprecated code patterns
