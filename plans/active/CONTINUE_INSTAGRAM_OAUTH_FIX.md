# Instagram OAuth Connection Fix - Continuation

**Last Updated:** 2026-01-07
**Status:** FIXED

---

## Issue Resolution

### Problem
After OAuth success, the UI was showing "Connect Instagram" card instead of the connected state, even though:
1. Edge function completed successfully (logs confirmed)
2. Database had the correct record with `is_active=true`, `connection_status='connected'`
3. Success toast was showing ("Instagram connected: @nickneessen")
4. Query invalidation was triggered

### Root Cause
Race condition between auth loading and the `useActiveInstagramIntegration` query:

1. When the page loads after OAuth redirect, auth context starts loading
2. `useActiveInstagramIntegration` query has `enabled: !!user?.id` - disabled until auth loads
3. TanStack Query v5 behavior when query is disabled:
   - `isPending`: `true` (no data yet)
   - `isLoading`: `false` (not fetching because disabled)
   - `isFetching`: `false`
4. `InstagramTabContent` only checked `isLoading`, not `isPending`
5. Since `isLoading` was `false` and `integration` was `undefined`, it showed the connect card

### Fix Applied
File: `src/features/messages/components/instagram/InstagramTabContent.tsx`

```typescript
// Before
const { data: integration, isLoading, error, refetch } = useActiveInstagramIntegration();
if (isLoading) {
  return <TabContentSkeleton />;
}

// After
const { data: integration, isLoading, isPending, error, refetch } = useActiveInstagramIntegration();
if (isLoading || isPending) {
  return <TabContentSkeleton />;
}
```

Now the skeleton is shown while:
- Auth is loading (query disabled, `isPending=true`)
- Query is fetching (`isLoading=true`)

Once auth loads, the query enables and fetches the integration from DB, then shows the connected state.

---

## Files Modified

1. `src/features/messages/components/instagram/InstagramTabContent.tsx`
   - Added `isPending` to destructured query result
   - Updated loading condition to include `isPending`

---

## Verification

- Build passes with zero TypeScript errors
- Database has correct record: `user_id=b99eccad-...`, `is_active=true`, `connection_status='connected'`
- RLS policy allows SELECT (user's imo_id matches integration's imo_id)

---

## Test Steps

1. Go to Messages > Instagram tab
2. Should show skeleton briefly while auth loads
3. Should show connected state with @nickneessen profile
4. If not connected, clicking Connect should work and return to connected state
