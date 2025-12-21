# Continuation: Join Request Flow - Cache Invalidation Fix

## Session Context

Multi-IMO user onboarding flow was implemented and tested. One issue remains.

**Last Commit:** `5e10040` - fix(join-request): use __none__ instead of empty string for optional agency select

---

## What Was Built (Complete & Working)

### Join Request System
- `supabase/migrations/20251221_007_join_requests.sql` - Table, RLS, functions
- `src/types/join-request.types.ts` - TypeScript types
- `src/services/join-request/` - Repository + Service
- `src/hooks/join-request/` - TanStack Query hooks
- `src/features/settings/join-request/` - UI components
- `src/features/auth/PendingApproval.tsx` - Updated to show join form

### Invitation Inheritance Fix
- `supabase/migrations/20251221_006_fix_invitation_inheritance.sql`
- When invitation accepted → inherit imo_id/agency_id from inviter

### Agency Request Code Review Fixes
- `supabase/migrations/20251221_005_fix_agency_request_issues.sql`
- Fixed hierarchy_path LIKE pattern
- Fixed RLS policy gap
- Added unique constraint on pending codes

---

## Tested Flow (All Working)

1. ✅ Admin creates new user (no upline)
2. ✅ User sets password
3. ✅ User logs in → sees "Complete Your Setup" page
4. ✅ User selects IMO from dropdown
5. ✅ User selects Agency from dropdown
6. ✅ User submits join request
7. ✅ User sees "Request Pending" status
8. ✅ Admin sees pending request in Settings → Join tab
9. ✅ Admin approves request
10. ✅ User now has imo_id, agency_id, approval_status = approved
11. ✅ User can access full app

---

## Issue Found

### Bug: Team Page Requires Hard Refresh After Setting Upline

**Steps to Reproduce:**
1. Admin logs in
2. Goes to user management, finds new user
3. Sets upline to themselves
4. Goes to Team/Hierarchy page
5. **New user NOT visible in table**
6. Hard refresh (Cmd+R) → user appears

**Root Cause:** Query cache not invalidated when upline is updated.

**Location to Investigate:**
- `src/hooks/hierarchy/useMyDownlines.ts` - Query that fetches downlines
- `src/hooks/admin/` - Where upline is set
- Look for missing `queryClient.invalidateQueries()` after upline update

**Fix Pattern:**
```typescript
// After updating upline, invalidate hierarchy queries:
queryClient.invalidateQueries({ queryKey: ['hierarchy'] });
queryClient.invalidateQueries({ queryKey: ['my-downlines'] });
queryClient.invalidateQueries({ queryKey: ['team'] });
```

---

## Files to Check

1. **Where upline is set:**
   - `src/features/admin/components/EditUserDialog.tsx`
   - `src/hooks/admin/useUserMutations.ts` (or similar)

2. **Hierarchy queries to invalidate:**
   - `src/hooks/hierarchy/useMyDownlines.ts`
   - `src/hooks/hierarchy/useHierarchyTree.ts`

---

## Commands to Start

```bash
# Find where upline is updated
grep -r "upline_id" src/hooks/admin/ src/features/admin/ --include="*.ts" --include="*.tsx"

# Find hierarchy query keys
grep -r "queryKey.*hierarchy\|queryKey.*downline\|queryKey.*team" src/hooks/ --include="*.ts"

# Run dev server
npm run dev
```

---

## Success Criteria

- [ ] Setting upline immediately reflects in Team page without refresh
- [ ] All hierarchy-related queries invalidated on upline change
- [ ] `npm run build` passes
