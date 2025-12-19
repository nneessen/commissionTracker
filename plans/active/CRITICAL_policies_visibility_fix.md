# CRITICAL: Policies Page Visibility Fix

## Summary

**Critical Security Issue**: Users can currently see policies belonging to their downlines on the Policies page. The Policies page should ONLY display the user's own policies.

**Additional Issue**: Query invalidation not working on user deletion - team page doesn't update after deleting a user.

---

## Issue Analysis

### Issue 1: Policies Page Showing Downline Policies

**Root Cause Analysis:**

1. **RLS Policies on `policies` table** (correctly configured):
   - `policies_select_own_only`: `user_id = auth.uid()` → users can see own policies
   - `Uplines can view downline policies`: `is_upline_of(user_id)` → uplines can see downlines' policies
   - Both are PERMISSIVE (OR logic) - this is correct behavior

2. **Frontend/Service Issue**:
   - `PolicyRepository.findAll()` does NOT filter by user_id
   - Relies entirely on RLS to filter results
   - RLS returns ALL accessible policies (own + downlines for uplines)
   - Policies page displays ALL returned policies

**Why current architecture is problematic:**
- RLS defines "what data can be accessed" (maximum access)
- Frontend should define "what data is displayed" (contextual filtering)
- Missing explicit `user_id` filter for "my policies" context

### Issue 2: Query Invalidation on User Delete

**Root Cause:**
- `userService.delete()` calls `admin_deleteuser` RPC
- No query cache invalidation after successful delete
- React Query cache still contains stale user data
- Team/hierarchy page displays outdated data

---

## Solution Design

### Solution for Issue 1: Explicit User Filtering for Policies Page

**Approach**: Add explicit `userId` filter to PolicyRepository and use it from the Policies page context.

**Why NOT change RLS:**
- RLS is correct - it defines what users CAN access
- Team/Hierarchy pages need access to downline policies
- The issue is frontend not filtering for the specific context

**Files to Modify:**

1. **`src/services/policies/PolicyRepository.ts`**
   - Add optional `userId` parameter to `findAll()` method
   - When provided, add `.eq('user_id', userId)` to query

2. **`src/services/policies/policyService.ts`**
   - Add method to get current user ID via Supabase auth
   - Update `getAll()`, `getFiltered()`, `getPaginated()` to filter by current user

3. **`src/features/policies/queries.ts`**
   - Include userId in query key for proper cache separation

4. **`src/features/policies/hooks/usePolicies.ts`**
   - Use auth context to get current user ID
   - Pass userId to service layer

### Solution for Issue 2: Query Invalidation on User Delete

**Approach**: Add mutation hooks with proper cache invalidation.

**Files to Modify:**

1. **`src/hooks/users/useDeleteUser.ts`** (create)
   - Create mutation hook wrapping `userService.delete()`
   - On success, invalidate hierarchy and team query keys

2. **`src/features/hierarchy/components/AgentTable.tsx`** (or wherever delete is called)
   - Use the mutation hook instead of direct service call

---

## Implementation Plan

### Phase 1: Policy Visibility Fix (CRITICAL)

#### Step 1: Update PolicyRepository
```typescript
// src/services/policies/PolicyRepository.ts
// Add userId to findAll options
async findAll(
  options?: {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    orderDirection?: "asc" | "desc";
    userId?: string; // NEW: Filter by specific user
  },
  filters?: {...}
): Promise<Policy[]> {
  let query = this.client.from(this.tableName).select(`...`);

  // NEW: Filter by user if specified
  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }

  // ... rest of method
}
```

#### Step 2: Update PolicyService
```typescript
// src/services/policies/policyService.ts
// Add method to get current user's policies only
async getMyPolicies(): Promise<Policy[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  return this.repository.findAll({ userId: user.id });
}

// Update getPaginated to accept userId
async getPaginated(
  page: number,
  pageSize: number,
  filters?: PolicyFilters,
  sortConfig?: { field: string; direction: "asc" | "desc" },
  userId?: string // NEW
): Promise<Policy[]> {
  const options = {
    page,
    pageSize,
    orderBy: sortConfig?.field || "created_at",
    orderDirection: sortConfig?.direction || "desc",
    userId, // Pass through
  };
  // ...
}
```

#### Step 3: Update PolicyQueries and Hooks
- Include `userId` in query keys
- Hooks should get current user from auth context and pass to service

#### Step 4: Update usePolicies Hook
```typescript
// Use current user from auth context
const { user } = useAuth();

// Pass user.id to service layer
queryFn: () => policyService.getPaginated(page, pageSize, filters, sortConfig, user?.id),
```

### Phase 2: Query Invalidation Fix

#### Step 1: Create useDeleteUser Mutation Hook
```typescript
// src/hooks/users/useDeleteUser.ts
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userService.delete(userId),
    onSuccess: () => {
      // Invalidate all hierarchy and team queries
      queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['downlines'] });
    },
  });
}
```

#### Step 2: Update Components Using Delete
- Replace direct `userService.delete()` calls with `useDeleteUser` hook
- Ensure proper invalidation occurs after delete

---

## Files Changed Summary

### Policy Visibility Fix:
1. `src/services/policies/PolicyRepository.ts` - Add userId filter
2. `src/services/policies/policyService.ts` - Get current user, pass to repository
3. `src/features/policies/queries.ts` - Include userId in query keys
4. `src/features/policies/hooks/usePolicies.ts` - Use auth context

### Query Invalidation Fix:
1. `src/hooks/users/useDeleteUser.ts` (NEW) - Mutation hook with invalidation
2. `src/features/hierarchy/components/AgentTable.tsx` - Use mutation hook
3. Any other components calling userService.delete()

---

## Testing Plan

### Policy Visibility Tests:

1. **Login as user with no downlines**
   - Verify Policies page shows only own policies
   - Create a policy, verify it appears

2. **Login as user with downlines**
   - Verify Policies page shows ONLY own policies (not downlines')
   - Navigate to Team page → click downline → verify their policies are visible

3. **Verify Hierarchy page still works**
   - As upline, view Team/Hierarchy dashboard
   - Click on downline to view their policies
   - Verify downline policies are visible in that context

### Query Invalidation Tests:

1. **Delete user from Team page**
   - Delete a team member
   - Verify they disappear from list immediately (no refresh needed)

2. **Verify cache is properly invalidated**
   - After delete, navigate away and back
   - Verify deleted user is gone

---

## Security Considerations

1. **RLS remains unchanged** - Database-level security intact
2. **Defense in depth** - Frontend filter adds extra layer
3. **No data exposure risk** - RLS still enforces access limits
4. **Audit trail** - Consider logging policy access for compliance

---

## Rollback Plan

If issues occur:
1. Remove userId filter from PolicyRepository (revert to RLS-only)
2. Users will see downline policies again on Policies page
3. This is a "too permissive" state, not a security breach (RLS still applies)

---

## Estimated Impact

- **Bundle size**: Minimal (a few lines of code)
- **Performance**: Slightly better (smaller result sets when userId specified)
- **Breaking changes**: None - backward compatible
- **Database migrations**: None required

---

## Status: IMPLEMENTED ✓

Implementation completed on 2025-12-19.

### Files Modified:
1. `src/services/policies/PolicyRepository.ts` - Added userId filter to findAll, countPolicies, getAggregateMetrics
2. `src/services/policies/policyService.ts` - Added getCurrentUserId helper, updated all query methods to filter by current user
3. `src/hooks/admin/useUserApproval.ts` - Added useDeleteUser mutation hook with comprehensive query invalidation
4. `src/features/admin/components/AdminControlCenter.tsx` - Updated to use useDeleteUser hook
5. `src/features/admin/components/EditUserDialog.tsx` - Updated to use useDeleteUser hook

### Testing Required:
1. Login as user with downlines → Policies page should show ONLY their policies
2. Navigate to Team/Hierarchy → Should still be able to view downline policies
3. Delete a user from Admin panel → User should disappear immediately without refresh

This plan addresses both critical issues with minimal code changes while maintaining security and backward compatibility.
