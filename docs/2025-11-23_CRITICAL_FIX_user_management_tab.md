# CRITICAL FIX: User Management Tab Missing for Admin

**Date**: 2025-11-23
**Issue**: Admin user cannot see User Management tab in sidebar
**Severity**: HIGH - Prevents user approval/denial
**Status**: FIX APPLIED - TESTING REQUIRED

---

## What Happened

After recent RLS (Row Level Security) policy changes to fix infinite recursion issues, the admin user lost access to the User Management tab in the sidebar. This prevents approving/denying new users.

---

## Root Cause

The `getCurrentUserProfile()` function in `userApprovalService.ts` had a flaw in its error handling:

```typescript
// OLD CODE (BROKEN):
if (error) {  // Only checked for explicit errors
  // Admin fallback
  if (user.email === "nick@nickneessen.com") {
    return fallbackAdminProfile;
  }
}
```

**The Problem**: When RLS policies block a query, Supabase returns:
- `error` = `null` (no PostgreSQL error)
- `data` = `null` (filtered by RLS)

So the fallback never triggered, and the function returned `null`, making `isAdmin` = `false`.

---

## What Was Changed

### 1. Fixed Fallback Logic

**File**: `/src/services/admin/userApprovalService.ts` (line 63)

```typescript
// NEW CODE (FIXED):
if (error || !data) {  // Check for BOTH error AND missing data
  // Admin fallback
  if (user.email === "nick@nickneessen.com") {
    console.warn("[UserApprovalService] Admin user profile not found or blocked by RLS, using fallback");
    return fallbackAdminProfile;
  }
}
```

### 2. Added Debug Logging

Added comprehensive console logging throughout `getCurrentUserProfile()` to track:
- User email and ID
- Query results (data, error, hasData, hasError)
- Whether fallback is triggered
- Profile fetch success/failure

**Why**: Helps diagnose RLS issues in the browser console.

---

## Testing Required

### Step 1: Build and Run

```bash
npm run build
npm run dev
```

### Step 2: Test Admin Access

1. Open browser and navigate to http://localhost:5173 (or your dev URL)
2. Log in as admin: `nick@nickneessen.com`
3. Open browser DevTools (Cmd+Option+I on Mac, F12 on Windows)
4. Go to Console tab
5. Check for logs starting with `[UserApprovalService]`

**Expected logs:**

```
[UserApprovalService] Getting profile for user: nick@nickneessen.com d0d3edea-af6d-4990-80b8-1765ba829896
[UserApprovalService] Profile query result: { data: {...}, error: null, hasData: true, hasError: false }
[UserApprovalService] Successfully fetched profile: nick@nickneessen.com is_admin: true
```

**OR (if RLS is blocking):**

```
[UserApprovalService] Getting profile for user: nick@nickneessen.com d0d3edea-af6d-4990-80b8-1765ba829896
[UserApprovalService] Profile query result: { data: null, error: null, hasData: false, hasError: false }
[UserApprovalService] Profile fetch error or no data: null
[UserApprovalService] Checking fallback for: nick@nickneessen.com
[UserApprovalService] Admin user profile not found or blocked by RLS, using fallback
```

### Step 3: Verify User Management Tab

Check the sidebar (left side):

- [ ] "User Management" tab is visible (with Shield icon)
- [ ] Click on it to navigate to `/admin/users`
- [ ] Users list loads successfully
- [ ] Can approve/deny users

### Step 4: Test Non-Admin User (if you have one)

Log in as a non-admin user:

- [ ] "User Management" tab is NOT visible
- [ ] Cannot navigate to `/admin/users` (should redirect or error)

---

## If Still Not Working

### Clear Cache

1. Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Clear all site data:
   - Open DevTools → Application → Storage → Clear site data
3. Re-login

### Check TanStack Query

1. Install TanStack Query DevTools (if not already):

```bash
npm install @tanstack/react-query-devtools
```

2. Add to your App.tsx:

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// In your component:
<ReactQueryDevtools initialIsOpen={false} />
```

3. Open the devtools panel
4. Look for query key: `['userApproval', 'isAdmin']`
5. Check its status: success/error/loading
6. Check its data: should be `true`

### Run Test Script

```bash
# This requires you to be logged in first in the browser
# Open browser console and run:
localStorage.getItem('sb-[project-id]-auth-token')
# Copy the token

# Then in terminal:
export SUPABASE_TOKEN="<paste-token-here>"
npx tsx scripts/test-admin-access.ts
```

---

## Related Documentation

- **Full incident report**: `/docs/incidents/2025-11-23_user_management_tab_missing.md`
- **Previous RLS fix**: `/.serena/memories/admin_approval_bypass_fix.md`
- **RLS policy migration**: `/supabase/migrations/20251122015832_remove_infinite_recursion_policy.sql`

---

## Summary of All Changes

### Latest Commit (2025-11-23)

**Commit 0e6f76a**: Date formatting improvements
- **Files**: Various service and hook files
- **Impact**: None on admin access (just date handling)

### Recent RLS Fixes (2025-11-22)

**Commit c2cdc04**: Remove infinite recursion policy
- **What**: Dropped `user_profiles_admin_all` policy
- **Why**: Caused infinite loop (policy checked same table it protected)
- **Result**: Kept only 3 simple policies for viewing own profile

**Commit 4d45df0**: Fix RLS policies to not query auth.users
- **What**: Updated policies to avoid querying tables users can't access
- **Why**: Was causing 403 errors

**Commit cde7886**: Resolve 403 errors on user_profiles
- **What**: Added proper RLS policies for profile access
- **Why**: Users couldn't fetch their own profiles

---

## Next Steps

1. ✅ **FIX APPLIED**: Updated `userApprovalService.ts` with improved fallback logic and debug logging
2. ⏭️ **TEST REQUIRED**: Run the app and verify User Management tab appears
3. ⏭️ **MONITOR**: Check console logs to see if RLS is blocking or allowing queries
4. ⏭️ **OPTIONAL**: If RLS is blocking, create SECURITY DEFINER function for permanent fix (see incident report)

---

## Questions?

If the User Management tab is still not showing after testing:

1. Share the console logs from `[UserApprovalService]`
2. Check TanStack Query devtools for the `isAdmin` query status
3. Verify you're logged in as `nick@nickneessen.com`
4. Check for any JavaScript errors in the console
