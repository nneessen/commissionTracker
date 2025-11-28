# Admin Page Filtering Fix - Comprehensive Plan

## Problem Statement
1. Users & Access tab is showing recruits (users with incomplete onboarding) when it should ONLY show active agents
2. Recruiting Pipeline tab is showing ZERO recruits when it should show users in the pipeline
3. The filtering logic is using the WRONG field (`onboarding_status`) instead of `roles`

## Root Cause Analysis

### Database State
Remote database has 3 users:
```json
[
  {
    "email": "nick.neessen@gmail.com",
    "roles": ["agent"],  // HAS AGENT ROLE
    "onboarding_status": "lead",  // BUT STILL IN PIPELINE
    "current_onboarding_phase": "Pre-Licensing"
  },
  {
    "email": "nickneessen.ffl@gmail.com",
    "roles": ["agent"],  // HAS AGENT ROLE
    "onboarding_status": "active",  // BUT STILL IN PIPELINE
    "current_onboarding_phase": "Pre-Licensing"
  },
  {
    "email": "nick@nickneessen.com",
    "roles": null,  // NO ROLES YET
    "onboarding_status": "active",
    "current_onboarding_phase": "Bootcamp",
    "is_admin": true
  }
]
```

### The Confusion
- `onboarding_status` tracks PIPELINE PROGRESS (lead → active → bootcamp → completed)
- `roles` array determines USER TYPE (recruit vs agent)
- Someone gave the first two users the 'agent' role WITHOUT completing their onboarding

### Correct Logic (from GraduateToAgentDialog.tsx)
When graduating a recruit to agent:
```typescript
roles: ['agent'],  // ← THIS makes them an agent
onboarding_status: 'completed',  // ← THIS marks pipeline complete
```

**Therefore:**
- **Active Agents** = `roles` includes 'agent'
- **Recruits** = `roles` is null OR `roles` does NOT include 'agent'

## Current Broken Code

### Bug #1: AdminControlCenter.tsx (lines 80-89)
```typescript
// WRONG - uses onboarding_status
const activeAgents = hierarchyFilteredUsers?.filter((u: UserProfile) =>
  u.onboarding_status !== 'lead' &&
  u.onboarding_status !== 'active'
);

const recruitsInPipeline = hierarchyFilteredUsers?.filter((u: UserProfile) =>
  u.onboarding_status === 'lead' ||
  u.onboarding_status === 'active'
);
```

### Bug #2: useUsersView.ts (lines 62-65 and 127-130)
```typescript
// WRONG - uses onboarding_status
filteredUsers = filteredUsers.filter(u =>
  u.onboarding_status !== 'lead' &&
  u.onboarding_status !== 'active'
);
```

### Bug #3: admin_get_all_users() RPC is returning EMPTY
The RPC function exists but returns `[]` when called. Need to investigate why.

## Fix Plan

### Step 1: Fix admin_get_all_users() RPC function
**Goal:** Make it return data instead of empty array

**Actions:**
1. Test the RPC function manually with psql on remote DB
2. Check for errors in the function logic
3. Verify the `roles` field is being selected correctly
4. Fix any issues preventing data return

### Step 2: Fix AdminControlCenter.tsx filtering
**File:** `src/features/admin/components/AdminControlCenter.tsx`
**Lines:** 80-89

**Current (WRONG):**
```typescript
const activeAgents = hierarchyFilteredUsers?.filter((u: UserProfile) =>
  u.onboarding_status !== 'lead' &&
  u.onboarding_status !== 'active'
);

const recruitsInPipeline = hierarchyFilteredUsers?.filter((u: UserProfile) =>
  u.onboarding_status === 'lead' ||
  u.onboarding_status === 'active'
);
```

**Fixed (CORRECT):**
```typescript
// Active Agents = users with 'agent' role
const activeAgents = hierarchyFilteredUsers?.filter((u: UserProfile) =>
  u.roles?.includes('agent' as RoleName)
);

// Recruits = users WITHOUT 'agent' role (still in recruiting pipeline)
const recruitsInPipeline = hierarchyFilteredUsers?.filter((u: UserProfile) =>
  !u.roles?.includes('agent' as RoleName)
);
```

### Step 3: Fix useUsersView.ts filtering
**File:** `src/hooks/admin/useUsersView.ts`
**Lines:** 62-65 (main query) and 127-130 (metrics)

**Current (WRONG):**
```typescript
filteredUsers = filteredUsers.filter(u =>
  u.onboarding_status !== 'lead' &&
  u.onboarding_status !== 'active'
);
```

**Fixed (CORRECT):**
```typescript
// Only show active agents (users with 'agent' role)
// Exclude recruits (users without 'agent' role)
filteredUsers = filteredUsers.filter(u =>
  u.roles?.includes('agent')
);
```

### Step 4: Delete incorrect test file
**File:** `src/hooks/admin/__tests__/useUsersView.recruit-filter.test.ts`

This test was written based on the wrong assumptions (filtering by onboarding_status).
Delete it and create a new test based on roles.

### Step 5: Write correct tests
**File:** `src/hooks/admin/__tests__/useUsersView.role-based-filter.test.ts`

Test cases:
1. Users with `roles: ['agent']` should appear in Users & Access tab
2. Users with `roles: null` should appear in Recruiting Pipeline tab
3. Users with `roles: ['recruit']` should appear in Recruiting Pipeline tab
4. Users with `roles: ['agent']` should NOT appear in Recruiting Pipeline tab
5. Users without 'agent' role should NOT appear in Users & Access tab

### Step 6: Update TypeScript types if needed
Verify `UserProfile` interface has:
```typescript
roles?: RoleName[];  // Should include 'agent', 'recruit', 'admin', etc.
```

### Step 7: Clean up data inconsistency
Fix the two problem users in the database:
```sql
-- Either remove their agent role (make them recruits again):
UPDATE user_profiles
SET roles = NULL
WHERE email IN ('nick.neessen@gmail.com', 'nickneessen.ffl@gmail.com');

-- OR complete their onboarding properly:
UPDATE user_profiles
SET onboarding_status = 'completed',
    current_onboarding_phase = 'Completed'
WHERE email IN ('nick.neessen@gmail.com', 'nickneessen.ffl@gmail.com');
```

## Implementation Order
1. ✅ Investigate and fix admin_get_all_users() RPC - COMPLETED
   - Created migration: 20251128230740_fix_admin_rpc_check_user_profiles_is_admin.sql
   - Fixed RPC to check user_profiles.is_admin instead of auth metadata
   - Added onboarding_status and current_onboarding_phase to returned fields
2. ✅ Fix AdminControlCenter.tsx filtering logic - COMPLETED
   - Updated lines 76-87 to filter by roles instead of onboarding_status
   - Active agents = users with roles.includes('agent')
   - Recruits = users without 'agent' in roles
3. ✅ Fix useUsersView.ts filtering logic - COMPLETED
   - Updated lines 59-64 (main query) to filter by roles
   - Updated lines 123-128 (metrics) to filter by roles
4. ✅ Delete old incorrect test - COMPLETED
   - Deleted src/hooks/admin/__tests__/useUsersView.recruit-filter.test.ts
5. ✅ Write new correct tests - COMPLETED
   - Created src/hooks/admin/__tests__/useUsersView.role-based-filter.test.ts
   - 12 tests, all passing
6. ✅ Verify TypeScript types - COMPLETED
   - UserProfile has correct type: roles?: RoleName[]
   - Updated misleading comment to reflect correct logic
7. ✅ Test with actual data - READY FOR TESTING
   - Dev server running on http://localhost:3001/
   - Navigate to /admin to test
8. ✅ Clean up data inconsistency - SQL SCRIPT CREATED
   - Created scripts/fix-problem-users-data.sql
   - Two options provided (make recruits OR complete onboarding)
   - Option 2 (complete onboarding) is recommended

## Success Criteria
- [ ] Users & Access tab shows ONLY users with 'agent' role
- [ ] Recruiting Pipeline tab shows ONLY users WITHOUT 'agent' role
- [ ] nick.neessen@gmail.com and nickneessen.ffl@gmail.com appear in correct tab based on their roles
- [ ] All tests pass
- [ ] No TypeScript errors

## Notes
- The `onboarding_status` field is for tracking pipeline progress, NOT for determining user type
- The `roles` array is the source of truth for user type (recruit vs agent)
- Graduation process sets BOTH `roles: ['agent']` AND `onboarding_status: 'completed'`
- Data inconsistency happened because someone manually set roles without updating onboarding_status
