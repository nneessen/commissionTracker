# Fix Policy Creation "Permission Denied for Table Users" Error

**Status:** ✅ Fix Deployed - Ready for Testing
**Created:** 2025-10-24
**Updated:** 2025-10-24
**Priority:** 🔴 Critical - Blocking core functionality (FIX APPLIED)

---

## Problem Statement

Policy creation is completely broken, throwing error:
```
Error: policies.create failed: permission denied for table users
```

This error occurs when trying to create a new policy from:
- Dashboard page quick actions section
- Policies page

**Impact:** Users cannot create new policies at all - core functionality is broken.

---

## Root Cause Analysis ✅ COMPLETED

### Investigation Steps Completed:
1. ✅ Fetched current database schema from remote Supabase
2. ✅ Examined policies table structure and all triggers
3. ✅ Reviewed `auto_create_commission_record()` function source code
4. ✅ Checked function security settings
5. ✅ Identified exact permission issue
6. ✅ Reviewed policy creation code flow

### Root Cause Identified:

**The Problem:**
```
Database Trigger Function → Tries to Access auth.users → RLS Blocks Access → Error
```

**Detailed Explanation:**
1. When a policy is created via INSERT, the `trigger_auto_create_commission` fires AFTER INSERT
2. This trigger calls the `auto_create_commission_record()` function
3. The function tries to SELECT from `auth.users` table to get `contract_comp_level`:
   ```sql
   SELECT (raw_user_meta_data->>'contract_comp_level')::DECIMAL / 100.0
   FROM auth.users
   WHERE id = NEW.user_id
   ```
4. **Critical Issue:** The function is set to `SECURITY INVOKER` (default)
5. This means it runs with the authenticated user's permissions, NOT postgres's permissions
6. Authenticated users do NOT have SELECT permission on `auth.users` table
7. Only the `postgres` role has SELECT on `auth.users`
8. Result: **"permission denied for table users"**

**Function Security Setting:**
```
Security: invoker  ← THIS IS THE PROBLEM!
```

**Should be:**
```
Security: definer  ← THIS FIXES IT!
```

---

## Solution Design

### The Fix: SECURITY DEFINER

**Change the function to use SECURITY DEFINER:**
- `SECURITY INVOKER` (current): Function runs with caller's permissions → FAILS
- `SECURITY DEFINER` (fix): Function runs with owner's (postgres) permissions → WORKS

**Why this is safe:**
- The function only reads data for `NEW.user_id` (the policy being created)
- It doesn't expose sensitive data to the caller
- The function is owned by postgres, which has proper access to auth.users
- Adding `SET search_path = public, pg_temp` prevents search path attacks

---

## Implementation Plan

### Phase 1: Create Migration ✅ COMPLETED
- [x] Create migration file with proper naming
- [x] Drop and recreate `auto_create_commission_record()` with SECURITY DEFINER
- [x] Add search_path protection
- [x] Include verification steps

### Phase 2: Verify Related Functions ✅ COMPLETED
- [x] Check `calculate_commission_advance()` function - SECURITY INVOKER (OK - doesn't access auth.users)
- [x] Check `update_commission_on_policy_status()` function - SECURITY INVOKER (OK - doesn't access auth.users)
- [x] Review all functions accessing auth.users table - Found 3 functions:
  - `get_user_profile` - Already has SECURITY DEFINER ✓
  - `update_user_metadata` - Already has SECURITY DEFINER ✓
  - `auto_create_commission_record` - Fixed with this migration ✓

### Phase 3: Database Migration Deployed ✅ COMPLETED
- [x] Applied migration to remote Supabase database
- [x] Verified function has SECURITY DEFINER enabled
- [x] Verified trigger exists on policies table
- [x] Migration verification passed all checks

### Phase 4: Create Test Script ✅ COMPLETED
- [x] Created `scripts/test-policy-creation.sh`
- [x] Script verifies database function security settings
- [x] Script checks trigger status
- [x] Script provides manual testing instructions

### Phase 5: Manual Testing Required ⏳ PENDING USER ACTION
- [ ] Start dev server: `npm run dev`
- [ ] Test policy creation from Dashboard quick actions
- [ ] Test policy creation from Policies page
- [ ] Verify commission auto-creation in database
- [ ] Check for any errors in console/logs

### Phase 6: Documentation & Cleanup ⏳ PENDING
- [ ] Document fix in memory
- [ ] Move plan to completed/
- [ ] Clean up any test policies created during testing

---

## Technical Details

### Current Function (BROKEN):
```sql
CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER
LANGUAGE plpgsql
-- No SECURITY DEFINER = defaults to SECURITY INVOKER
AS $$
DECLARE
  v_contract_level DECIMAL;
BEGIN
  -- This SELECT fails with "permission denied for table users"
  v_contract_level := COALESCE(
    (
      SELECT (raw_user_meta_data->>'contract_comp_level')::DECIMAL / 100.0
      FROM auth.users  -- ← Authenticated user can't access this!
      WHERE id = NEW.user_id
    ),
    1.0
  );
  -- ... rest of function
END;
$$;
```

### Fixed Function (WORKING):
```sql
CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- ← THE FIX!
SET search_path = public, pg_temp  -- ← Security best practice
AS $$
DECLARE
  v_contract_level DECIMAL;
BEGIN
  -- This SELECT now works because function runs with postgres permissions
  v_contract_level := COALESCE(
    (
      SELECT (raw_user_meta_data->>'contract_comp_level')::DECIMAL / 100.0
      FROM auth.users  -- ← Now accessible!
      WHERE id = NEW.user_id
    ),
    1.0
  );
  -- ... rest of function
END;
$$;
```

---

## Files Modified

### Database Migrations:
- `supabase/migrations/20251024_001_fix_auto_create_commission_security_definer.sql` (CREATED)

### Test Scripts:
- `scripts/test-policy-creation.ts` (TO BE CREATED)

### Documentation:
- `plans/active/add-policy-broken.md` (THIS FILE)
- Will move to `plans/completed/` when done

---

## Success Criteria

- ✅ Migration created and tested locally
- ✅ Migration deployed to production database
- ✅ Function security verified (SECURITY DEFINER enabled)
- ✅ Trigger verified (exists on policies table)
- ✅ Test script created
- ⏳ **READY FOR TESTING:** Policy creation from Dashboard quick actions
- ⏳ **READY FOR TESTING:** Policy creation from Policies page
- ⏳ **READY FOR TESTING:** Commission record auto-created with correct contract level
- ⏳ **READY FOR TESTING:** No "permission denied" errors in logs

---

## Notes & Observations

### Why This Wasn't Caught Earlier:
- The function was likely created before we had proper RLS testing
- Previous testing may have been done with service_role key (bypasses RLS)
- The issue only manifests when using authenticated user tokens

### Related Issues to Watch:
- Any other database functions accessing `auth.users` may have the same issue
- Functions accessing other auth schema tables need review
- Consider creating a memory note about SECURITY DEFINER requirements

### Database Functions Accessing auth.users:
1. `auto_create_commission_record()` - NEEDS FIX ✅
2. Others to be identified during verification phase

---

## Timeline

- **Investigation:** 2025-10-24 ✅ (Completed)
- **Fix Implementation:** 2025-10-24 ✅ (Completed)
- **Database Deployment:** 2025-10-24 ✅ (Completed)
- **Manual Testing:** 2025-10-24 ⏳ (Pending User Action)
- **Completion:** Awaiting test results

---

## Summary of Changes

### Database Changes:
- ✅ Created migration: `supabase/migrations/20251024_001_fix_auto_create_commission_security_definer.sql`
- ✅ Modified `auto_create_commission_record()` function to use SECURITY DEFINER
- ✅ Added `SET search_path = public, pg_temp` for security
- ✅ Recreated trigger `trigger_auto_create_commission` on policies table

### Files Created:
- ✅ `plans/active/add-policy-broken.md` (this file)
- ✅ `supabase/migrations/20251024_001_fix_auto_create_commission_security_definer.sql`
- ✅ `scripts/test-policy-creation.sh`

### What Changed:
**Before (BROKEN):**
```sql
CREATE FUNCTION auto_create_commission_record()
RETURNS TRIGGER
-- Defaults to SECURITY INVOKER
-- Runs with authenticated user's permissions
-- FAILS when accessing auth.users
```

**After (FIXED):**
```sql
CREATE FUNCTION auto_create_commission_record()
RETURNS TRIGGER
SECURITY DEFINER  -- Runs with postgres permissions
SET search_path = public, pg_temp  -- Security protection
-- NOW WORKS when accessing auth.users
```

### Testing Instructions:

**Quick Test (Recommended):**
1. Run `npm run dev` to start the application
2. Navigate to Dashboard
3. Click "New Policy" button
4. Fill out the form and submit
5. **Expected:** Policy creates successfully without "permission denied" error
6. Check database commissions table for auto-created commission record

**Detailed Test (Thorough):**
Run the automated test script:
```bash
./scripts/test-policy-creation.sh
```

This will verify database changes and provide step-by-step manual testing instructions.

---

## Related Documentation

- Project CLAUDE.md: Database Migration Rules
- Supabase Docs: Row Level Security
- PostgreSQL Docs: SECURITY DEFINER Functions
- Memory: critical_database_rules.md
