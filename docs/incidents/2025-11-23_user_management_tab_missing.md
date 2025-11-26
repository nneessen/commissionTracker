# Incident Report: User Management Tab Missing for Admin

**Date**: 2025-11-23
**Severity**: High
**Status**: Investigating
**Reporter**: Nick Neessen (Admin User)

---

## Executive Summary

The admin user can no longer see the "User Management" tab in the sidebar after recent RLS policy changes. This prevents the admin from approving/denying users, which is a critical function of the application.

---

## Timeline of Changes

### Recent Commits (Last 2 Weeks)

1. **commit c2cdc04** (2025-11-22): `fix(rls): remove infinite recursion policy on user_profiles`
   - **What changed**: Dropped `user_profiles_admin_all` policy that allowed admins to read all profiles
   - **Why**: The policy created infinite recursion (queried user_profiles to check if user is admin, which triggered the same policy again)
   - **Migration**: `20251122015832_remove_infinite_recursion_policy.sql`
   - **Result**: Only 3 simple policies remain: `user_profiles_select_own`, `user_profiles_update_own`, `user_profiles_insert_own`

2. **commit 20251123175906** (2025-11-23): `update_rls_for_hierarchy.sql`
   - **What changed**: Added "Users can view downline profiles" policy
   - **Purpose**: Allow uplines to view downline data in hierarchy system
   - **Side effect**: Added additional policy for viewing user_profiles

3. **commit 0e6f76a** (2025-11-23): `docs: multiple changes in date formatting`
   - **What changed**: Date formatting improvements in services/hooks
   - **Impact**: None on admin access

---

## Technical Investigation

### Database Schema Status

✅ **Admin user profile exists and is correct:**

```sql
SELECT id, email, is_admin, approval_status
FROM user_profiles
WHERE email = 'nick@nickneessen.com';

-- Result:
-- d0d3edea-af6d-4990-80b8-1765ba829896 | nick@nickneessen.com | t | approved
```

### Current RLS Policies on user_profiles

```sql
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'user_profiles';
```

| Policy Name | Roles | Command | Logic |
|------------|-------|---------|-------|
| `Users can view downline profiles` | `public` | SELECT | `id IN (get_downline_ids(auth.uid())) AND is_user_approved()` |
| `user_profiles_select_own` | `authenticated` | SELECT | `auth.uid() = id` |
| `user_profiles_update_own` | `authenticated` | UPDATE | `auth.uid() = id` |
| `user_profiles_insert_own` | `authenticated` | INSERT | `auth.uid() = id` |

**Note**: Multiple PERMISSIVE SELECT policies are combined with OR logic. So an authenticated user can select a profile if:
- They own it (`auth.uid() = id`), OR
- It's in their downline AND they are approved

### Supporting Functions

✅ **`is_user_approved()` function works correctly:**

```sql
-- Returns: BOOLEAN
-- Logic: EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND (approval_status = 'approved' OR is_admin = true))
-- Security: DEFINER (bypasses RLS)
-- Result: t (true) for admin user
```

✅ **`get_downline_ids()` function works correctly:**

```sql
SELECT * FROM get_downline_ids('d0d3edea-af6d-4990-80b8-1765ba829896');

-- Result: d0d3edea-af6d-4990-80b8-1765ba829896
-- (User themselves is included in downline tree)
```

### Code Flow Analysis

```typescript
// Sidebar.tsx (line 57)
const { data: isAdmin } = useIsAdmin();

// Line 178-199: Conditional rendering
{isAdmin && (
  <Link to="/admin/users">
    <Button>
      <Shield size={16} />
      {!isCollapsed && <span>User Management</span>}
    </Button>
  </Link>
)}
```

```typescript
// hooks/admin/useUserApproval.ts (line 78-84)
export function useIsAdmin() {
  return useQuery({
    queryKey: userApprovalKeys.isAdmin(),
    queryFn: () => userApprovalService.isCurrentUserAdmin(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
```

```typescript
// services/admin/userApprovalService.ts (line 363-375)
async isCurrentUserAdmin(): Promise<boolean> {
  try {
    const profile = await this.getCurrentUserProfile();
    return profile?.is_admin === true;
  } catch (error) {
    logger.error("Error in isCurrentUserAdmin", error, "UserApprovalService");
    return false;
  }
}
```

```typescript
// services/admin/userApprovalService.ts (line 30-88)
async getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      // FALLBACK for admin user
      if (user.email === "nick@nickneessen.com") {
        return {
          id: user.id,
          email: user.email,
          approval_status: "approved",
          is_admin: true,
          // ...
        } as UserProfile;
      }
      return null;
    }

    return data as UserProfile;
  } catch (error) {
    return null;
  }
}
```

---

## Root Cause Analysis

### Likely Issue: RLS Policy Blocking Query

**Hypothesis**: The Supabase query in `getCurrentUserProfile()` is failing due to RLS policies, but the error is being silently caught and the fallback is not being triggered.

**Why the fallback might not work:**

1. The fallback only triggers if `error` is truthy (line 52)
2. If the query succeeds but returns 0 rows (due to RLS), `error` might be null, and `data` would be null
3. The function would return `null` instead of the fallback
4. `isCurrentUserAdmin()` would return `false`
5. The sidebar would not show the User Management tab

**Testing this hypothesis:**

```typescript
// The query might be:
// - Succeeding (no error object)
// - But returning 0 rows (data = null)
// - Because RLS policies are blocking access

// In Supabase, when RLS blocks a query:
// - error = null (no PostgreSQL error)
// - data = null (filtered out by RLS)
// - This is NOT the same as a query error!
```

### Why RLS Might Be Blocking

The admin user should be able to see their own profile through EITHER:

1. **Policy 1**: `user_profiles_select_own` - `auth.uid() = id` ✅ Should work
2. **Policy 2**: `Users can view downline profiles` - `id IN (get_downline_ids(auth.uid())) AND is_user_approved()` ✅ Should work

**BUT**: There might be an issue with:

- Session state not being properly set when `auth.uid()` is called
- The `is_user_approved()` function being called before the policies are evaluated (chicken-and-egg problem)
- Browser caching preventing the latest policies from being used
- TanStack Query caching returning stale data

---

## Potential Fixes

### Option 1: Fix the Fallback Logic (Recommended)

Update `getCurrentUserProfile()` to check for both `error` AND empty `data`:

```typescript
if (error || !data) {  // Changed from just 'if (error)'
  logger.error("Failed to fetch user profile", error, "UserApprovalService");

  if (user.email === "nick@nickneessen.com") {
    console.warn("Admin user profile not found or blocked by RLS, using fallback");
    return {
      id: user.id,
      email: user.email,
      approval_status: "approved",
      is_admin: true,
      // ...
    } as UserProfile;
  }

  return null;
}
```

**Pros:**
- Quick fix
- Ensures admin always has access
- Already has fallback logic, just needs to trigger correctly

**Cons:**
- Doesn't fix the root RLS issue
- Hardcoded email check

### Option 2: Create SECURITY DEFINER Function for Admin Check

Create a PostgreSQL function that bypasses RLS:

```sql
CREATE OR REPLACE FUNCTION get_current_user_profile()
RETURNS TABLE (
  id UUID,
  email TEXT,
  is_admin BOOLEAN,
  approval_status TEXT,
  -- ... other fields
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id,
    up.email,
    up.is_admin,
    up.approval_status
    -- ... other fields
  FROM user_profiles up
  WHERE up.id = auth.uid();
END;
$$;
```

Update `getCurrentUserProfile()` to call this function instead:

```typescript
const { data, error } = await supabase.rpc('get_current_user_profile');
```

**Pros:**
- Bypasses RLS completely for current user's own profile
- Cleaner solution
- No hardcoded emails

**Cons:**
- Requires database migration
- More complex

### Option 3: Simplify RLS Policies

Remove the "Users can view downline profiles" policy temporarily to debug:

```sql
DROP POLICY IF EXISTS "Users can view downline profiles" ON user_profiles;
```

Test if the admin can now see the User Management tab with just the `user_profiles_select_own` policy.

**Pros:**
- Identifies if the downline policy is causing conflicts
- Simple test

**Cons:**
- Breaks hierarchy functionality
- Not a permanent fix

### Option 4: Add Debug Logging

Add comprehensive logging to see what's actually happening:

```typescript
async getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log('[UserApprovalService] Getting profile for user:', user?.email, user?.id);

    if (authError || !user) {
      console.error('[UserApprovalService] Auth error or no user:', authError);
      return null;
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    console.log('[UserApprovalService] Profile query result:', { data, error, hasData: !!data, hasError: !!error });

    if (error || !data) {
      console.error('[UserApprovalService] Profile fetch error or no data:', error);
      console.log('[UserApprovalService] Checking fallback for:', user.email);

      if (user.email === "nick@nickneessen.com") {
        console.warn('[UserApprovalService] Using admin fallback profile');
        return {
          id: user.id,
          email: user.email,
          approval_status: "approved",
          is_admin: true,
          approved_at: new Date().toISOString(),
          created_at: user.created_at,
          updated_at: new Date().toISOString(),
        } as UserProfile;
      }

      return null;
    }

    console.log('[UserApprovalService] Successfully fetched profile:', data.email, 'is_admin:', data.is_admin);
    return data as UserProfile;
  } catch (error) {
    console.error('[UserApprovalService] Unexpected error in getCurrentUserProfile:', error);
    return null;
  }
}
```

**Pros:**
- Helps identify exact failure point
- No schema changes needed
- Easy to implement

**Cons:**
- Need to check browser console
- Not a fix, just debugging

---

## Recommended Action Plan

1. ✅ **Immediate**: Add debug logging (Option 4) to identify exact failure
2. ⏭️ **Short-term**: Fix the fallback logic (Option 1) to ensure admin always has access
3. ⏭️ **Medium-term**: Create SECURITY DEFINER function (Option 2) for cleaner solution
4. ⏭️ **Long-term**: Review all RLS policies for potential conflicts

---

## Testing Checklist

After implementing fix:

- [ ] Admin user can see their own profile in database
- [ ] Admin user can log in successfully
- [ ] User Management tab appears in sidebar for admin
- [ ] Admin can navigate to /admin/users route
- [ ] Admin can see list of all users
- [ ] Admin can approve/deny users
- [ ] Non-admin users cannot see User Management tab
- [ ] Non-admin users cannot access /admin/users route (should redirect or show error)
- [ ] Browser console shows no errors
- [ ] TanStack Query devtools show successful query for `isAdmin`

---

## Related Files

- `/src/components/layout/Sidebar.tsx` - Where User Management tab is conditionally rendered
- `/src/hooks/admin/useUserApproval.ts` - Hooks for admin functionality
- `/src/services/admin/userApprovalService.ts` - Service that queries user profile
- `/supabase/migrations/20251122015832_remove_infinite_recursion_policy.sql` - RLS policy fix migration
- `/supabase/migrations/20251123175906_update_rls_for_hierarchy.sql` - Hierarchy RLS migration
- `/.serena/memories/admin_approval_bypass_fix.md` - Previous admin fix documentation

---

## Notes

- The database schema is correct - no issues there
- The RLS policies *should* work based on their logic
- The issue is likely in how the query result is handled (error vs no data)
- The fallback logic exists but may not be triggering correctly
- Browser caching or TanStack Query caching could also be factors

---

## Follow-up Required

1. Check browser console for actual errors when logged in as admin
2. Check TanStack Query devtools to see query status
3. Implement Option 1 (fix fallback logic) as immediate mitigation
4. Test if clearing browser cache helps
5. Consider Option 2 (SECURITY DEFINER function) for permanent solution
