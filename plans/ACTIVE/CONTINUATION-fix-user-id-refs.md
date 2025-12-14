# URGENT: Fix Remaining user_id References in TypeScript

## Context
We unified `user_profiles.id` with `auth.users.id` (single UUID). The `user_id` column was **dropped** from `user_profiles` table. However, there are still ~100 TypeScript references querying `user_profiles` with `.eq('user_id', ...)` which is breaking the app.

## Current Errors
```
GET .../user_profiles?select=*&user_id=eq.d0d3edea... 400 (Bad Request)
column user_profiles.user_id does not exist

GET .../user_profiles?select=roles&user_id=eq.d0d3edea... 400 (Bad Request)
column user_profiles.user_id does not exist
```

## Key Principle
**For `user_profiles` table ONLY:** Change `.eq('user_id', userId)` to `.eq('id', userId)`

**Other tables still have `user_id` columns** (commissions, policies, notifications, etc.) - leave those alone!

## Files That Need Fixing (query user_profiles with user_id)

### 1. src/services/users/userService.ts
Lines 83 and 153 query user_profiles with user_id:
```typescript
// WRONG
.from("user_profiles").select("*").eq("user_id", user.id)

// CORRECT
.from("user_profiles").select("*").eq("id", user.id)
```

### 2. src/services/permissions/permissionService.ts
Lines 95, 276, 300, 321, 349 query user_profiles with user_id:
```typescript
// WRONG
.from('user_profiles').select('roles').eq('user_id', userId)

// CORRECT
.from('user_profiles').select('roles').eq('id', userId)
```

### 3. src/services/hierarchy/hierarchyService.ts
Lines 30, 90, 127, 183, 206, 505, 635, 664, 731, 772 - CHECK if querying user_profiles

### 4. src/hooks/reports/useReportFilterOptions.ts
Line 69 - CHECK if querying user_profiles

### 5. src/components/notifications/useNotifications.ts
Lines 134, 147, 172, 186 - CHECK if querying user_profiles

### 6. Other services to check:
- src/services/notifications/notificationService.ts
- src/services/messaging/messagingService.ts
- src/features/email/services/emailConnectionService.ts
- src/services/userTargets/userTargetsService.ts

## How to Find the Right Ones

Run this to find queries against user_profiles specifically:
```bash
grep -rn "from.*user_profiles.*\.eq.*user_id\|\.from(['\"]user_profiles['\"]).*user_id" src/ --include="*.ts"
```

Or search for the pattern in each file:
```
.from("user_profiles")  ... .eq("user_id"
.from('user_profiles')  ... .eq('user_id'
```

## DO NOT Change
- Queries to `commissions` table (has user_id column)
- Queries to `policies` table (has user_id column)
- Queries to `notifications` table (has user_id column)
- Queries to `clients` table (has user_id column)
- Queries to `expenses` table (has user_id column)
- Any other table that is NOT `user_profiles`

## After Fixing
1. Run `npm run build` - must pass with zero errors
2. Test app loads without `user_id does not exist` errors
3. Test user can login and see dashboard

## Database Already Fixed
The following DB functions were already updated:
- get_user_permissions
- get_current_user_profile_id
- is_admin_user
- has_role
- log_document_changes
- log_email_events
- log_user_profile_changes
- handle_new_user
- admin_deleteuser

## Commit When Done
```bash
git add -A && git commit -m "fix: update all user_profiles queries to use id instead of user_id"
```
