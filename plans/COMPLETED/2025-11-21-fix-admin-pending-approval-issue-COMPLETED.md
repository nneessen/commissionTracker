# Fix Admin Pending Approval Issue

## Problem Statement
The app creator (nick@nickneessen.com) is seeing a "pending approval" message when trying to access the dashboard, despite being marked as approved and admin in the database.

## Current Status
- Database shows user is approved with `approval_status = 'approved'` and `is_admin = true`
- Auth.users record exists and matches user_profiles ID
- The ApprovalGuard is blocking access and showing pending screen

## Root Cause Analysis

### Possible Causes
1. **Auth Session Mismatch**: The Supabase auth session might have a different user ID than what's in the database
2. **Cache Issues**: TanStack Query might be caching an old profile state
3. **Browser Storage**: Local/session storage might have stale auth tokens
4. **Service Error**: The getCurrentUserProfile() might be returning null due to an error
5. **Database Connection**: RLS policies might be blocking the query
6. **Frontend Logic Error**: The ApprovalGuard might have a logic bug

## Diagnostic Steps

### Step 1: Check for Multiple User Records
```sql
-- Check all user records for the email
SELECT au.id as auth_id, au.email, au.created_at as auth_created,
       up.id as profile_id, up.approval_status, up.is_admin, up.created_at as profile_created
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE au.email = 'nick@nickneessen.com'
ORDER BY au.created_at DESC;

-- Check for orphaned profiles
SELECT * FROM user_profiles
WHERE email = 'nick@nickneessen.com'
AND id NOT IN (SELECT id FROM auth.users);
```

### Step 2: Test the is_user_approved() Function
```sql
-- Run as the authenticated user
SELECT is_user_approved();

-- Check the function definition
SELECT prosrc FROM pg_proc WHERE proname = 'is_user_approved';
```

### Step 3: Create Diagnostic Component
Create a temporary component to display the current auth state and profile data:

```typescript
// src/features/admin/components/AuthDiagnostic.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase/client';
import { useCurrentUserProfile, useAuthorizationStatus } from '@/hooks/admin/useUserApproval';

export function AuthDiagnostic() {
  const [authUser, setAuthUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const { data: profile, error: profileError } = useCurrentUserProfile();
  const authStatus = useAuthorizationStatus();

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) setAuthError(error.message);
      else setAuthUser(data.user);
    });
  }, []);

  return (
    <div className="p-4 bg-card rounded-lg space-y-4">
      <h2 className="text-lg font-bold">Auth Diagnostic</h2>

      <div>
        <h3 className="font-semibold">Auth User:</h3>
        <pre className="text-xs bg-muted p-2 rounded">
          {authUser ? JSON.stringify({
            id: authUser.id,
            email: authUser.email,
            role: authUser.role,
            app_metadata: authUser.app_metadata,
            user_metadata: authUser.user_metadata
          }, null, 2) : 'Loading...'}
        </pre>
        {authError && <p className="text-red-500">Error: {authError}</p>}
      </div>

      <div>
        <h3 className="font-semibold">User Profile:</h3>
        <pre className="text-xs bg-muted p-2 rounded">
          {profile ? JSON.stringify(profile, null, 2) : 'No profile'}
        </pre>
        {profileError && <p className="text-red-500">Error: {profileError.message}</p>}
      </div>

      <div>
        <h3 className="font-semibold">Authorization Status:</h3>
        <pre className="text-xs bg-muted p-2 rounded">
          {JSON.stringify(authStatus, null, 2)}
        </pre>
      </div>

      <div>
        <h3 className="font-semibold">Quick Actions:</h3>
        <button
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
          }}
          className="px-4 py-2 bg-red-500 text-white rounded mr-2"
        >
          Clear Storage & Reload
        </button>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
```

### Step 4: Manual Fixes

#### Option A: Force Refresh Auth Session
```typescript
// Add to App.tsx or a service
async function refreshAuthSession() {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    console.error('Failed to refresh session:', error);
    // Force re-login
    await supabase.auth.signOut();
    window.location.href = '/login';
  } else {
    console.log('Session refreshed:', data);
    window.location.reload();
  }
}
```

#### Option B: Direct Database Fix
```sql
-- Ensure the user profile is correct
UPDATE user_profiles
SET
  approval_status = 'approved',
  is_admin = true,
  approved_at = COALESCE(approved_at, NOW()),
  updated_at = NOW()
WHERE email = 'nick@nickneessen.com';

-- Verify the fix
SELECT * FROM user_profiles WHERE email = 'nick@nickneessen.com';
```

#### Option C: Add Bypass for Admin Email
Update the ApprovalGuard component to always allow the admin email:

```typescript
// In ApprovalGuard.tsx
const ADMIN_EMAIL = 'nick@nickneessen.com';

export const ApprovalGuard: React.FC<ApprovalGuardProps> = ({ children }) => {
  const { /* ... existing code ... */ } = useAuthorizationStatus();
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserEmail(data.user?.email || null);
    });
  }, []);

  // Admin bypass
  if (currentUserEmail === ADMIN_EMAIL) {
    return <>{children}</>;
  }

  // ... rest of the existing logic
};
```

## Implementation Plan

1. **Immediate Actions**:
   - Clear browser cache and localStorage
   - Sign out and sign back in
   - Check if issue persists

2. **If Issue Persists**:
   - Deploy the AuthDiagnostic component temporarily
   - Check what data is being returned
   - Identify if it's an auth session issue or profile query issue

3. **Apply Fix**:
   - Based on diagnostic results, apply appropriate fix
   - Most likely: Force refresh auth session or add admin bypass

4. **Long-term Solution**:
   - Add better error handling in getCurrentUserProfile()
   - Add admin email bypass as failsafe
   - Implement session refresh on app load
   - Add monitoring/logging for auth issues

## Testing Checklist

- [ ] Sign out completely
- [ ] Clear all browser storage
- [ ] Sign in with admin email
- [ ] Verify immediate access to dashboard
- [ ] Check user management page is visible
- [ ] Create test user and verify approval flow still works
- [ ] Test that non-admin users still see pending screen

## Rollback Plan

If fixes cause issues:
1. Remove any code changes
2. Run database query to ensure admin user is approved
3. Clear browser cache
4. Use direct database access if needed