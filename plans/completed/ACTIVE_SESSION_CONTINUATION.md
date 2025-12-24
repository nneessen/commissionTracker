# Active Session Continuation - Recruiting Pipeline Fixes

**Created:** 2025-12-22
**Updated:** 2025-12-22
**Status:** ROOT CAUSE FIXED - Deployed (c2518bb)

---

## ROOT CAUSE IDENTIFIED AND FIXED

### The Problem
Page required hard reload because `useCurrentUserProfile()` hook ran immediately on mount WITHOUT waiting for auth. When auth wasn't ready:

1. Query fetched immediately → `supabase.auth.getUser()` returned null
2. Null result cached for 5 minutes (staleTime)
3. All subsequent renders used cached null
4. Hard reload cleared cache, allowing fresh fetch

### The Fix (c2518bb)
**File:** `src/hooks/admin/useUserApproval.ts`

```typescript
// BEFORE (broken)
export function useCurrentUserProfile() {
  return useQuery({
    queryKey: userApprovalKeys.currentProfile(),
    queryFn: () => userApprovalService.getCurrentUserProfile(),
    staleTime: 1000 * 60 * 5, // Caches null for 5 min!
    // NO enabled check - runs immediately
  });
}

// AFTER (fixed)
export function useCurrentUserProfile() {
  const { user, loading: authLoading } = useAuth();

  return useQuery({
    queryKey: userApprovalKeys.currentProfile(),
    queryFn: () => userApprovalService.getCurrentUserProfile(),
    enabled: !authLoading && !!user?.id, // Wait for auth!
    staleTime: 1000 * 60 * 5,
    retry: 3,
  });
}
```

### Impact
This fix affects **ALL routes using RouteGuard**, not just `/recruiting/my-pipeline`.

---

## All Commits This Session

| Commit | Description |
|--------|-------------|
| c2518bb | **ROOT CAUSE FIX**: useCurrentUserProfile waits for auth |
| 2fae42b | Spinner visibility (400ms min) + band-aid refetch |
| decc932 | Spinner, sanitization, error handling, trigger fix |
| d58af9d | Email from field, RLS policies, initial refetch |

---

## Testing Checklist

After Vercel deployment (~2-3 minutes):

1. [x] Navigate to `/recruiting/my-pipeline` - **should load immediately without refresh**
2. [ ] Click checklist checkbox - should see 400ms spinner
3. [ ] Send email - should work without 400 error
4. [ ] Upload document - should work without 403 error

---

## Technical Notes

The chain of components that depend on `useCurrentUserProfile`:
```
RouteGuard → useAuthorizationStatus → useCurrentUserProfile
```

When `useCurrentUserProfile` returns null (because query was disabled or failed), `RouteGuard` was showing either:
- Loading spinner forever (if `isLoading` was stuck true)
- "Profile Not Found" (if null was returned)
