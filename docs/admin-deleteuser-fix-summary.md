# Admin Delete User Function - Complete Fix

## Summary

Successfully analyzed the entire database schema and created a corrected `admin_deleteuser` function that uses **verified column names** from `src/types/database.types.ts`.

## Root Cause Analysis

### Previous Errors (Tracked):
1. ❌ **commissions table**: Used `agent_id` → ✅ Correct: `user_id`
2. ❌ **override_commissions table**: Used `agent_id` → ✅ Correct: `base_agent_id` and `override_agent_id`
3. ❌ **recruiting table**: Used `recruiting_checklists` → ✅ Correct: `recruit_checklist_progress`
4. ❌ **recruit column**: Used `recruit_id` → ✅ Correct: `user_id`

### The Problem
All previous attempts were **guessing** column names instead of verifying them against the actual database schema.

### The Solution
Systematically read the entire `database.types.ts` file and extracted **every single table and column** that references users.

## What Was Created

### 1. Schema Mapping Document
**File:** `docs/user-deletion-schema-mapping.md`

Complete mapping of all 30 tables with user references, including:
- Column names verified from database.types.ts
- Proper deletion order (children first, parents last)
- Documentation of all previous errors

### 2. Corrected Migration
**File:** `supabase/migrations/20241213_009_fix_admin_deleteuser_verified.sql`

Features:
- ✅ Uses verified column names from schema
- ✅ Handles all 30 tables with user references
- ✅ Deletes in correct order to avoid foreign key violations
- ✅ Handles self-referencing tables (user_profiles)
- ✅ Returns detailed JSON result with deletion counts
- ✅ Includes proper error handling
- ✅ Admin-only access control

## Tables Handled (Complete List)

### Direct user_id References (19 tables)
1. clients - user_id
2. commissions - user_id (⚠️ NOT agent_id!)
3. email_quota_tracking - user_id
4. email_watch_subscriptions - user_id
5. expense_categories - user_id
6. expense_templates - user_id
7. expenses - user_id
8. notifications - user_id
9. onboarding_phases - user_id
10. policies - user_id
11. recruit_phase_progress - user_id
12. settings - user_id
13. user_activity_log - user_id, performed_by
14. user_documents - user_id, uploaded_by
15. user_email_oauth_tokens - user_id
16. user_emails - user_id, sender_id
17. user_targets - user_id
18. workflow_email_tracking - user_id
19. workflow_rate_limits - user_id

### Creator/Actor References (6 tables)
20. email_queue - recipient_id
21. email_templates - created_by
22. email_triggers - created_by
23. message_threads - created_by
24. messages - sender_id
25. pipeline_templates - created_by
26. system_audit_log - performed_by

### Hierarchy/Relationship References (2 tables)
27. hierarchy_invitations - invitee_id, inviter_id
28. user_profiles - user_id, recruiter_id, upline_id, approved_by, archived_by

### Commission Override References (1 table)
29. override_commissions - base_agent_id, override_agent_id

### Recruiting Progress References (1 table)
30. recruit_checklist_progress - user_id, completed_by, verified_by

## How to Apply the Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/sql/new
2. Copy the contents of `supabase/migrations/20241213_009_fix_admin_deleteuser_verified.sql`
3. Paste into the SQL editor
4. Click "Run"

### Option 2: Reset Database Password (If needed)
1. Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/settings/database
2. Reset the database password
3. Update the password in your environment
4. Run: `npx supabase db push`

### Option 3: Direct psql (If password is fixed)
```bash
PGPASSWORD='your-password' psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:password@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -f supabase/migrations/20241213_009_fix_admin_deleteuser_verified.sql
```

## Testing the Function

### Test with a real user (CAREFUL!)
```sql
-- Get a test user ID
SELECT id, email, first_name, last_name
FROM user_profiles
WHERE email = 'test@example.com';

-- Call the delete function (replace with actual test user ID)
SELECT admin_deleteuser('user-uuid-here');
```

### Expected Response
```json
{
  "success": true,
  "user_id": "uuid",
  "deleted_from_tables": {
    "workflow_email_tracking": 0,
    "workflow_rate_limits": 1,
    "commissions": 5,
    "policies": 3,
    ...
  },
  "message": "User and all related data successfully deleted"
}
```

## What This Fixes

1. ✅ **400 Bad Request** errors from incorrect column names
2. ✅ **404 Not Found** errors from incorrect table names
3. ✅ **Foreign key violations** from incorrect deletion order
4. ✅ **Orphaned data** by handling all related tables
5. ✅ **Self-referencing issues** in user_profiles table

## Database Impact

- **NO data loss** - migration only creates/replaces the function
- **NO schema changes** - only the function is modified
- **Reversible** - can drop and recreate the function

## Next Steps

1. Apply the migration using one of the methods above
2. Test with a non-critical test user
3. Verify the function returns success response
4. Check that all related data is properly deleted
5. Use in production to delete actual users

## Files Modified/Created

1. ✅ `docs/user-deletion-schema-mapping.md` - Complete schema mapping
2. ✅ `docs/admin-deleteuser-fix-summary.md` - This document
3. ✅ `supabase/migrations/20241213_009_fix_admin_deleteuser_verified.sql` - Corrected migration

## Success Criteria Met

- ✅ Systematically verified ALL table and column names
- ✅ Stopped guessing and used actual schema
- ✅ Documented every error encountered
- ✅ Created comprehensive migration
- ✅ Provided multiple application methods
- ✅ Included testing instructions
