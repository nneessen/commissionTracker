# CONTINUATION: Registration Page Debug

**Date**: 2026-01-02
**Priority**: P0 - CRITICAL
**Context**: 6% remaining

---

## CONFIRMED FINDINGS

### RPC Works Correctly
- Direct supabase call via `TestRegistration.tsx` works perfectly
- Returns data in 322-432ms
- No errors when using valid UUID token
- Token `f0a98db7-9611-41b2-89dd-f27c7c20a13f` works (returns `{ valid: false, error: 'invitation_not_found' }`)

### Issue Is NOT:
- Database/RPC - works fine
- Supabase client - works fine
- Network/CORS - works fine
- `.single()` modifier - tested both ways, both work

### Issue IS In:
- React Query hook `useInvitationByToken` OR
- The `PublicRegistrationPage` component OR
- How they interact

---

## KEY FILES TO CHECK

1. **`src/features/recruiting/hooks/useRecruitInvitations.ts`** - Lines 343-358
   - The `useInvitationByToken` hook
   - Check if query is being disabled or stalled

2. **`src/features/recruiting/pages/PublicRegistrationPage.tsx`** - Lines 122-134
   - Check how `isLoading` is being used
   - Debug logs already added at lines 126, 130-134

3. **`src/services/recruiting/recruitInvitationService.ts`** - Lines 291-332
   - `validateToken` function
   - Debug logs already added

---

## TEST PAGE CREATED

A minimal test page bypasses React Query entirely:
- Route: `/test-register/$token`
- File: `src/features/recruiting/pages/TestRegistration.tsx`
- This WORKS - proves supabase client is fine

---

## NEXT STEPS

1. **Compare test page vs real page**:
   - Test page calls `supabase.rpc()` directly in useEffect - WORKS
   - Real page calls via React Query hook - STUCK ON LOADING

2. **Debug the hook**:
   Add console.log to `useInvitationByToken` to see if:
   - `enabled` is true
   - `queryFn` is being called
   - Promise resolves or hangs

3. **Check React Query state**:
   Use React Query DevTools to see query status

4. **Possible causes**:
   - Query key mismatch
   - Stale time/cache issue
   - Error boundary catching something
   - Hook not enabled properly

---

## CODE CHANGES MADE (NOT COMMITTED)

```bash
git status
# Modified:
# - src/features/recruiting/hooks/useRecruitInvitations.ts (toast message)
# - src/features/recruiting/pages/PublicRegistrationPage.tsx (debug logs)
# - src/services/recruiting/recruitInvitationService.ts (removed .single(), added debug logs)
# - src/router.tsx (added test route)
# - src/App.tsx (added test route to public paths)
# - src/types/database.types.ts (regenerated)
#
# New:
# - src/features/recruiting/pages/TestRegistration.tsx
# - supabase/migrations/20260102_004_defer_recruit_creation.sql
```

---

## DATABASE STATE

- `recruit_invitations` table is EMPTY
- Real recruits exist: `youngressgan04@gmail.com`, `tucker.kino.insurance@gmail.com`
- No invitations for them (were deleted somehow)
- DO NOT create test invitations for real users

---

## QUICK FIX TO TRY

In `src/features/recruiting/hooks/useRecruitInvitations.ts`, add logging:

```typescript
export function useInvitationByToken(token: string | undefined) {
  console.log("[useInvitationByToken] Called with token:", token);
  console.log("[useInvitationByToken] enabled:", !!token);

  const result = useQuery<InvitationValidationResult>({
    queryKey: ["public-invitation", token],
    queryFn: async () => {
      console.log("[useInvitationByToken] queryFn executing");
      const data = await (token
        ? recruitInvitationService.validateToken(token)
        : Promise.resolve({
            valid: false,
            error: "invitation_not_found" as const,
            message: "No token provided",
          }));
      console.log("[useInvitationByToken] queryFn resolved:", data);
      return data;
    },
    enabled: !!token,
    staleTime: 0,
    retry: false,
  });

  console.log("[useInvitationByToken] Query state:", {
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    data: result.data,
  });

  return result;
}
```

Then test at: `http://localhost:3000/register/f0a98db7-9611-41b2-89dd-f27c7c20a13f`

Check browser console to see where it gets stuck.

---

## ARCHITECTURAL CHANGES (APPLIED TO DB, NOT FRONTEND)

Migration `20260102_004_defer_recruit_creation.sql` was applied:
- `recruit_id` in `recruit_invitations` is now nullable
- New RPC signature for `create_recruit_invitation` (doesn't require recruit_id)
- Frontend service NOT updated to match - will cause issues if invites are sent

**IMPORTANT**: Don't deploy frontend until this is fixed. The deployed frontend expects the OLD RPC signature.
