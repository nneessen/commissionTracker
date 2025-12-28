# Continuation: Trainer/Recruit Pipeline Fix

## Session Date: 2025-12-28
## Status: P0/P1/P2 COMPLETE - Final Testing Needed

---

## COMPLETED FIXES

### P0 - Critical Fixes (DONE)
1. **Created `src/constants/roles.ts`** - Centralized STAFF_ROLES constants
2. **Fixed `RecruitRepository.ts`** - Changed queries to ONLY select users with `recruit` role
3. **Fixed `RouteGuard.tsx:187`** - Permission check was bypassed for approved users
4. **Updated imports** in AddUserDialog.tsx and RouteGuard.tsx

### P1 - Service Validation (DONE)
- **`userService.ts`** - Staff roles automatically get `onboarding_status = null` in create/update

### P2 - Database Constraint (APPLIED)
- **Migration applied**: `20251228_002_staff_role_constraints.sql`
- CHECK constraint `check_staff_no_onboarding` enforced at DB level
- GIN index on `roles` column added

---

## FILES CHANGED
```
src/constants/roles.ts                                    (NEW)
src/services/recruiting/repositories/RecruitRepository.ts (MODIFIED)
src/features/admin/components/AddUserDialog.tsx           (MODIFIED)
src/components/auth/RouteGuard.tsx                        (MODIFIED)
src/services/users/userService.ts                         (MODIFIED)
supabase/migrations/20251228_002_staff_role_constraints.sql        (NEW)
supabase/migrations/reverts/20251228_002_staff_role_constraints_revert.sql (NEW)
```

---

## REMAINING TASKS

### 1. Test the CHECK constraint
```sql
-- This should FAIL with constraint violation
UPDATE user_profiles
SET onboarding_status = 'pre_licensing'
WHERE roles @> ARRAY['trainer']::text[];
```

### 2. Test recruiting pipeline query
```sql
-- Should return ONLY users with recruit role
SELECT id, email, roles, onboarding_status
FROM user_profiles
WHERE roles @> ARRAY['recruit']::text[];
```

### 3. UI Testing
- Start dev server (`npm run dev`)
- Navigate to Recruiting Pipeline
- Verify trainers don't appear
- Create new trainer via AddUserDialog - verify no onboarding_status set

### 4. Commit Changes
```bash
git add -A
git commit -m "fix(recruiting): prevent trainers from appearing in pipeline

- Centralized STAFF_ROLES constants in src/constants/roles.ts
- Fixed RecruitRepository to only query users with recruit role
- Fixed RouteGuard permission bypass bug (approved users bypassed checks)
- Added validation in UserService to prevent staff roles with onboarding_status
- Added DB CHECK constraint check_staff_no_onboarding

🤖 Generated with Claude Code"
```

---

## BUILD STATUS
- ✅ `npm run build` passes
- ✅ Migration applied
- ✅ CHECK constraint verified in database
