# CRITICAL FIX: User List Empty in User Management

**Date**: 2025-11-23
**Issue**: Admin can see User Management tab, but user list is empty (only shows admin themselves)
**Related**: Follows fix for User Management tab visibility
**Severity**: HIGH - Prevents user approval/denial
**Status**: FIX APPLIED - TESTING REQUIRED

---

## What Happened

After fixing the User Management tab visibility issue, the admin can now see the tab and navigate to `/admin/users`. However, the user list only shows the admin themselves, not other users (like newly registered users awaiting approval).

### Database Investigation

✅ **New user EXISTS in database:**

```sql
SELECT id, email, is_admin, approval_status FROM user_profiles;

-- Results:
-- d0d3edea-af6d-4990-80b8-1765ba829896 | nick@nickneessen.com   | t | approved
-- 19678a49-8c2e-4cc3-85c0-d0436aa53ed5 | nick.neessen@gmail.com | f | pending
```

The new user is there, but the admin cannot see them!

---

## Root Cause

### The RLS Problem

When we removed the `user_profiles_admin_all` policy (to fix infinite recursion), we left admins with only 2 ways to query user_profiles:

1. **`user_profiles_select_own`** - Can only see their OWN profile (`auth.uid() = id`)
2. **"Users can view downline profiles"** - Can only see users in their downline tree

### Why New Users Are Invisible

New users have `upline_id = NULL` (no upline assigned), so they're NOT in anyone's downline tree:

```sql
SELECT id, email, upline_id FROM user_profiles;

-- d0d3edea-af6d-4990-80b8-1765ba829896 | nick@nickneessen.com   | NULL
-- 19678a49-8c2e-4cc3-85c0-d0436aa53ed5 | nick.neessen@gmail.com | NULL
```

The admin's downline query returns:

```sql
SELECT * FROM get_downline_ids('d0d3edea-af6d-4990-80b8-1765ba829896');
-- Result: Only the admin themselves
```

**Therefore**: Admin can only see themselves, not the new pending user!

### Why We Can't Just Re-Add the Policy

We can't create a simple policy like:

```sql
CREATE POLICY "admins_see_all" ON user_profiles
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND is_admin = true));
```

**Problem**: This causes INFINITE RECURSION:
- To check if user is admin, query user_profiles
- But querying user_profiles requires checking the policy
- Which requires checking if user is admin
- Which requires querying user_profiles... ♾️

---

## The Solution

Created **SECURITY DEFINER** functions that bypass RLS and check admin status differently:

### How It Works

1. **Check admin status from `auth.users` metadata** (not `user_profiles`)
   - Avoids circular dependency
   - `auth.users.raw_user_meta_data->>'is_admin'`

2. **Bypass RLS with SECURITY DEFINER**
   - Functions run with postgres privileges
   - Can query all user_profiles regardless of RLS

3. **Return data only if caller is admin**
   - Non-admins get empty results
   - Secure and safe

### Functions Created

#### 1. `admin_get_all_users()`
Returns all user profiles for admin users.

```sql
SELECT * FROM admin_get_all_users();
```

#### 2. `admin_get_pending_users()`
Returns only pending users for admin users.

```sql
SELECT * FROM admin_get_pending_users();
```

#### 3. `admin_get_user_profile(UUID)`
Returns a specific user's profile for admin users.

```sql
SELECT * FROM admin_get_user_profile('19678a49-8c2e-4cc3-85c0-d0436aa53ed5');
```

---

## Changes Made

### 1. Database Migration

**File**: `supabase/migrations/20251123230307_admin_functions_for_user_management.sql`

- Created 3 SECURITY DEFINER functions
- Set `is_admin` flag in `auth.users.raw_user_meta_data` for admin user
- Granted EXECUTE permissions to authenticated users

**Applied to database**: ✅ November 23, 2025

### 2. Updated `userApprovalService.ts`

Changed three methods to use the new functions:

#### `getAllUsers()` - Line 137
```typescript
// OLD (blocked by RLS):
const { data, error } = await supabase
  .from("user_profiles")
  .select("*")
  .order("created_at", { ascending: false });

// NEW (bypasses RLS):
const { data, error } = await supabase.rpc('admin_get_all_users');
```

#### `getPendingUsers()` - Line 166
```typescript
// OLD (blocked by RLS):
const { data, error } = await supabase
  .from("user_profiles")
  .select("*")
  .eq("approval_status", "pending")
  .order("created_at", { ascending: false });

// NEW (bypasses RLS):
const { data, error } = await supabase.rpc('admin_get_pending_users');
```

#### `getUserProfile(userId)` - Line 106
```typescript
// OLD (blocked by RLS):
const { data, error } = await supabase
  .from("user_profiles")
  .select("*")
  .eq("id", userId)
  .single();

// NEW (bypasses RLS):
const { data, error } = await supabase.rpc('admin_get_user_profile', {
  target_user_id: userId
});

// Note: RPC returns array, extract first element
const profile = Array.isArray(data) && data.length > 0 ? data[0] : null;
```

### 3. Added Debug Logging

All three methods now log:
- When they're called
- Success/failure status
- Number of records returned
- Any errors encountered

**Look for**: `[UserApprovalService]` prefix in browser console

---

## Testing Instructions

### Step 1: Build and Run

```bash
npm run build
npm run dev
```

### Step 2: Test as Admin

1. Log in as admin: `nick@nickneessen.com`
2. Navigate to User Management (sidebar or `/admin/users`)
3. Open browser console (Cmd+Option+I)

**Expected Console Logs:**

```
[UserApprovalService] Getting profile for user: nick@nickneessen.com d0d3edea-af6d-4990-80b8-1765ba829896
[UserApprovalService] Successfully fetched profile: nick@nickneessen.com is_admin: true
[UserApprovalService] Fetching all users via admin_get_all_users()
[UserApprovalService] Successfully fetched 2 users
```

**Expected UI:**

- ✅ User list shows 2 users:
  1. nick@nickneessen.com (admin, approved)
  2. nick.neessen@gmail.com (pending)

- ✅ Can click "Approve" or "Deny" on pending user
- ✅ Actions work correctly

### Step 3: Test as Non-Admin (Optional)

1. Log out
2. Log in as: `nick.neessen@gmail.com`
3. Try to navigate to `/admin/users`

**Expected:**
- ❌ User Management tab NOT visible in sidebar
- ❌ Cannot access `/admin/users` route

---

## Security Considerations

### Why This is Safe

1. **Admin check happens in the database function**
   - Non-admins get empty results
   - Can't bypass by manipulating client code

2. **Uses `auth.users.raw_user_meta_data`**
   - Only Supabase can write to `auth.users` table
   - Users cannot set their own `is_admin` flag

3. **SECURITY DEFINER is controlled**
   - Only specific functions have it
   - Each function has explicit admin check
   - No way to bypass

4. **Functions are read-only**
   - Only SELECT data
   - Don't modify anything
   - Safe from data corruption

### When Someone Becomes Admin

When you make a user an admin, you must set the flag in TWO places:

1. **`user_profiles.is_admin`** - For application logic
2. **`auth.users.raw_user_meta_data`** - For SECURITY DEFINER functions

```sql
-- Make user admin
UPDATE user_profiles
SET is_admin = true
WHERE email = 'newadmin@example.com';

-- ALSO update auth.users metadata
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
WHERE email = 'newadmin@example.com';
```

**Important**: The migration already did this for `nick@nickneessen.com`.

---

## Troubleshooting

### Users Still Not Showing

1. **Check console logs** for `[UserApprovalService]`
   - Should see "Successfully fetched X users"
   - If error, check error message

2. **Verify admin metadata**:
   ```sql
   SELECT email, raw_user_meta_data->>'is_admin'
   FROM auth.users
   WHERE email = 'nick@nickneessen.com';
   -- Should return: t (true)
   ```

3. **Test function directly** (via database console):
   ```sql
   SELECT * FROM admin_get_all_users();
   -- Should return all users (when called by authenticated admin)
   ```

4. **Clear cache**:
   - Hard refresh: Cmd+Shift+R
   - Clear site data: DevTools → Application → Clear site data

### Functions Return Empty

If functions return 0 rows:

1. **Check if logged in as admin**
   - Functions only work for authenticated users
   - Must be logged in as `nick@nickneessen.com`

2. **Check metadata**:
   ```sql
   SELECT raw_user_meta_data FROM auth.users WHERE email = 'nick@nickneessen.com';
   -- Should contain: {"is_admin": true}
   ```

3. **Re-run migration** if metadata missing:
   ```bash
   PGPASSWORD="..." psql "..." -f supabase/migrations/20251123230307_admin_functions_for_user_management.sql
   ```

---

## Related Files

- `/supabase/migrations/20251123230307_admin_functions_for_user_management.sql` - SECURITY DEFINER functions
- `/src/services/admin/userApprovalService.ts` - Updated service methods
- `/docs/2025-11-23_CRITICAL_FIX_user_management_tab.md` - Previous fix documentation
- `/docs/incidents/2025-11-23_user_management_tab_missing.md` - Full incident report

---

## Summary

**Problem**: RLS policies blocked admin from viewing other users' profiles

**Solution**: SECURITY DEFINER functions that:
- Check admin status from `auth.users` metadata (avoids infinite recursion)
- Bypass RLS to return all users (for admins only)
- Are secure and cannot be exploited by non-admins

**Testing**: Log in as admin, navigate to User Management, verify all users are visible

**Next**: Test the complete flow (view users, approve/deny, verify changes persist)
