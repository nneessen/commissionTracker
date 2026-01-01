# Continuation: Scalable User/Upline Search Combobox

## Session Date: 2026-01-01

## Task Summary
Implementing a reusable server-side searchable `UserSearchCombobox` component to replace all upline dropdown selects across the application. The current dropdowns load ALL users into memory which doesn't scale.

## What's Been Completed ✅

### 1. Database Migration
- **File**: `supabase/migrations/20260102_001_user_search_rpc.sql`
- Created `search_users_for_assignment` RPC function
- Supports: role filtering, approval status, exclude IDs, search term, limit
- **APPLIED TO PRODUCTION** ✅

### 2. Service Layer
- **File**: `src/services/users/userSearchService.ts`
- `searchUsersForAssignment()` function
- `getUserDisplayName()` helper
- Types: `UserSearchResult`, `SearchUsersParams`

### 3. React Query Hook
- **File**: `src/hooks/users/useUserSearch.ts`
- `useSearchUsers(query, options)` - Server-side search with 200ms debounce
- `useUserById(userId)` - Fetch single user for displaying current selection
- Query key factory: `userSearchKeys`
- Follows patterns from `docs/TANSTACK_QUERY_IMPLEMENTATION_GUIDE.md`

### 4. Reusable Component
- **File**: `src/components/user-search-combobox.tsx`
- `UserSearchCombobox` component with props:
  - `value`, `onChange`, `placeholder`, `roles`, `approvalStatus`, `excludeIds`, `showNoUplineOption`, `noUplineLabel`, `disabled`, `className`
- Uses Command/cmdk for searchable dropdown
- Shows name + email for disambiguation
- Loading/empty states

### 5. URL Fix
- Fixed incorrect `app.thestandardhq.com` → `www.thestandardhq.com` in:
  - `src/services/recruiting/recruitInvitationService.ts`
  - `supabase/functions/send-notification-digests/index.ts`

### 6. Types Regenerated
- `src/types/database.types.ts` regenerated with new RPC

## What Remains To Do 🔲

### Phase 4: Replace Dropdowns in All 8 Dialogs

The following dialogs need to be updated to use `UserSearchCombobox` instead of their current Select/Combobox patterns:

#### 1. `src/features/recruiting/components/SendInviteDialog.tsx` (NEXT)
**Current pattern**: Uses `useQuery` to fetch all uplines, renders with `<Select>`
**Changes needed**:
- Remove the `useQuery` for `potential-uplines` (lines 70-88)
- Remove `Select` imports
- Import `UserSearchCombobox` from `@/components/user-search-combobox`
- Replace the Select block (lines 218-237) with:
```tsx
<UserSearchCombobox
  value={watch("upline_id") || null}
  onChange={(id) => setValue("upline_id", id || "")}
  roles={["agent", "admin", "trainer"]}
  placeholder="Search for upline..."
  showNoUplineOption={false}
/>
```

#### 2. `src/features/recruiting/components/AddRecruitDialog.tsx`
**Current pattern**: Uses `useQuery` to fetch all users, filters client-side by role
**Changes needed**:
- Remove the `potentialUplines` query (around lines 185-209)
- Replace the upline Select (around lines 809-840) with `UserSearchCombobox`
- Props: `roles={["agent", "admin", "trainer", "upline_manager"]}`, `showNoUplineOption={true}`

#### 3. `src/features/admin/components/EditUserDialog.tsx`
**Current pattern**: Uses `allUsers` hook, filters to `approvedUplines`
**Changes needed**:
- Can remove dependency on `allUsers` for uplines (lines 520-523)
- Replace Select (around line 662-689) with `UserSearchCombobox`
- Props: `excludeIds={[user.id]}`, `showNoUplineOption={true}`, `approvalStatus="approved"`

#### 4. `src/features/admin/components/AddUserDialog.tsx`
**Current pattern**: Already uses Popover+Command combobox but with client-side data
**Changes needed**:
- Remove the client-side filtering of `approvedUplines`
- Replace the entire Popover/Command block (lines 319-394) with `UserSearchCombobox`
- Props: `showNoUplineOption={true}`, `approvalStatus="approved"`

#### 5. `src/features/recruiting/components/DeleteRecruitDialog.optimized.tsx`
**Current pattern**: Complex query excluding downlines
**Changes needed**:
- Keep the downline ID fetching logic (needed for `excludeIds`)
- Replace the Select with `UserSearchCombobox`
- Props: `roles={["agent", "admin"]}`, `excludeIds={[recruit.id, ...downlineIds]}`

#### 6. `src/features/recruiting/components/FilterDialog.tsx`
- Check if it has upline filtering, update if so

#### 7. `src/features/hierarchy/components/HierarchyManagement.tsx`
**Current pattern**: Uses native `<select>` element
**Changes needed**:
- Replace with `UserSearchCombobox`
- Check what filters are needed

#### 8. `src/features/hierarchy/components/InviteDownline.tsx`
- Check pattern and update

### Phase 5: Cleanup
- Remove any unused `potential-uplines` query patterns
- Run `npm run typecheck`
- Run `npm run build`
- Test each dialog manually

## Plan File Reference
Full plan with architecture details: `/home/nneessen/.claude/plans/wondrous-squishing-sky.md`

## Key Code References

### UserSearchCombobox Usage Example
```tsx
import { UserSearchCombobox } from "@/components/user-search-combobox";

<UserSearchCombobox
  value={uplineId}
  onChange={setUplineId}
  placeholder="Search for upline..."
  roles={['agent', 'admin', 'trainer']}
  excludeIds={[currentUserId]}
  showNoUplineOption={true}
  noUplineLabel="No upline"
/>
```

### Hook Usage
```tsx
import { useSearchUsers, useUserById } from "@/hooks/users/useUserSearch";

// Search users
const { data: users, isLoading } = useSearchUsers(searchTerm, {
  roles: ['agent', 'admin'],
  excludeIds: [selfId],
});

// Get single user by ID
const { data: user } = useUserById(selectedUserId);
```

## Current Todo List Status
1. ✅ Create migration with search_users_for_assignment RPC
2. ✅ Apply migration and regenerate database.types.ts
3. ✅ Create userSearchService.ts with RPC wrapper
4. ✅ Create useUserSearch.ts hook with debouncing
5. ✅ Create UserSearchCombobox component
6. 🔲 Update SendInviteDialog.tsx (START HERE)
7. 🔲 Update AddRecruitDialog.tsx
8. 🔲 Update EditUserDialog.tsx
9. 🔲 Update AddUserDialog.tsx
10. 🔲 Update remaining dialogs (DeleteRecruitDialog, FilterDialog, HierarchyManagement, InviteDownline)
11. 🔲 Run typecheck and test

## Instructions for Next Session
1. Read this file first
2. Start with `SendInviteDialog.tsx` - it's the simplest
3. Work through each dialog one at a time
4. Run `npm run typecheck` after each change
5. After all dialogs updated, run `npm run build`
6. Commit changes with appropriate message
