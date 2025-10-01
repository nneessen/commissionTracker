# How to Apply Database Migrations

**Project:** Commission Tracker
**Database:** Supabase (Project ID: pcyaqwodnyrpkaiojnpz)
**Date:** 2025-10-01

---

## Quick Start (Recommended Method)

### Apply via Supabase Dashboard

**Time:** ~10 minutes
**Risk:** Low (copy-paste SQL)

#### Steps:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz
   - Login if needed

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query"

3. **Apply Migrations in Order**

   Run each migration file in this exact order:

   **Migration 1:** `001_initial_schema.sql`
   - Open the file in your editor
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - ✅ Verify it completes without errors

   **Migration 2:** `002_create_agent_settings.sql`
   - Copy contents → Paste → Run
   - ✅ Verify completion

   **Migration 3:** `003_optimize_performance_schema.sql`
   - Copy contents → Paste → Run
   - ✅ Verify completion

   **Migration 4:** `20250927235242_create_missing_tables.sql`
   - Copy contents → Paste → Run
   - ✅ Verify completion

   **Migration 5:** `20250930_002_remove_agents_use_users.sql`
   - Copy contents → Paste → Run
   - ✅ Verify user_id columns are created
   - This renames agent_id → user_id across tables

   **Migration 6:** `20250930_003_rls_policies_auth.sql`
   - Copy contents → Paste → Run
   - ✅ Verify RLS policies are created

   **Migration 7:** `20250930_004_user_metadata_setup.sql`
   - Copy contents → Paste → Run
   - ✅ Verify user metadata function exists

   **Migration 8:** `20250930_005_fix_rls_security.sql`
   - Copy contents → Paste → Run
   - ✅ Verify RLS policies are secured

   **Migration 9:** `20251001_006_add_performance_indexes.sql`
   - Copy contents → Paste → Run
   - ✅ Verify 30+ indexes are created

4. **Verify Migrations Applied**

   Run this verification query:

   ```sql
   -- Check for user_id columns
   SELECT table_name, column_name
   FROM information_schema.columns
   WHERE column_name = 'user_id'
     AND table_schema = 'public'
   ORDER BY table_name;

   -- Should return: policies, commissions, expenses, carriers, etc.

   -- Check RLS is enabled
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
     AND rowsecurity = true;

   -- Should show all main tables with RLS enabled

   -- Check indexes
   SELECT schemaname, tablename, indexname
   FROM pg_indexes
   WHERE schemaname = 'public'
     AND indexname LIKE 'idx_%'
   ORDER BY tablename;

   -- Should show 30+ performance indexes
   ```

---

## Alternative: Apply via CLI

If you prefer using Supabase CLI (requires password):

### One-Time Link (if not already linked)

```bash
supabase link --project-ref pcyaqwodnyrpkaiojnpz
```

### Apply All Migrations

```bash
# You'll be prompted for database password
supabase db push
```

**Note:** CLI connection has been having issues with pooler. Dashboard method is more reliable.

---

## Migration Details

### What These Migrations Do

1. **001_initial_schema.sql**
   - Creates base tables (policies, commissions, expenses, etc.)
   - Sets up initial structure

2. **002_create_agent_settings.sql**
   - Adds agent_settings table
   - User preferences and configuration

3. **003_optimize_performance_schema.sql**
   - Adds performance-related columns
   - Optimizes existing schema

4. **20250927235242_create_missing_tables.sql**
   - Adds any missing tables (clients, carriers, chargebacks)

5. **20250930_002_remove_agents_use_users.sql** ⚠️ CRITICAL
   - Renames agent_id → user_id across all tables
   - Adds foreign keys to auth.users
   - Migrates existing data

6. **20250930_003_rls_policies_auth.sql** 🔒 SECURITY
   - Enables RLS on all tables
   - Creates policies for auth.uid() access
   - Ensures multi-user isolation

7. **20250930_004_user_metadata_setup.sql**
   - Creates user metadata management functions
   - Handles auth.users integration

8. **20250930_005_fix_rls_security.sql** 🔒 SECURITY FIX
   - Removes insecure USING(true) policies
   - Enforces proper user_id checks

9. **20251001_006_add_performance_indexes.sql** ⚡ PERFORMANCE
   - Adds 30+ indexes on:
     - user_id columns (for RLS queries)
     - Foreign keys (carriers, policies, etc.)
     - Date columns (for filtering)
     - Status columns (for dashboard views)
     - Composite indexes (common query patterns)

---

## Rollback Plan

If something goes wrong:

### Option 1: Restore from Backup
1. Go to Dashboard → Database → Backups
2. Select backup from before migration
3. Click "Restore"

### Option 2: Manual Rollback
Run these commands in reverse order to undo changes.

**⚠️ Warning:** This will lose data! Only do if absolutely necessary.

```sql
-- Rollback indexes
DROP INDEX IF EXISTS idx_commissions_user_id;
-- ... (drop all indexes from migration 006)

-- Rollback RLS fixes
-- (restore old policies - not recommended)

-- Rollback user metadata
DROP FUNCTION IF EXISTS public.update_user_metadata;

-- Rollback RLS policies
-- (would need to drop all policies individually)

-- Rollback agent_id → user_id change
ALTER TABLE policies RENAME COLUMN user_id TO agent_id;
ALTER TABLE commissions RENAME COLUMN user_id TO agent_id;
-- ... (for all tables)
```

---

## Verification Checklist

After applying all migrations:

- [ ] All 9 migrations completed without errors
- [ ] user_id column exists in main tables
- [ ] RLS is enabled on all tables
- [ ] RLS policies exist and use auth.uid()
- [ ] 30+ indexes created
- [ ] Foreign keys point to auth.users
- [ ] Test CRUD operations work
- [ ] Test multi-user isolation (create 2 test users)

---

## Troubleshooting

### "Column already exists" error
**Cause:** Migration already partially applied
**Solution:** Check which step failed, skip completed steps

### "Permission denied" error
**Cause:** Using non-superuser account
**Solution:** Use Supabase Dashboard (runs as postgres user)

### "Syntax error" near ...
**Cause:** Copy-paste introduced special characters
**Solution:** Re-copy from source file, ensure plain text

### Policies blocking queries
**Cause:** auth.uid() returning null
**Solution:** Ensure you're authenticated in your app

---

## Next Steps After Migration

1. ✅ Test application login
2. ✅ Create a test commission
3. ✅ Verify user isolation (other users can't see your data)
4. ✅ Check performance (should be faster with indexes)
5. ✅ Monitor logs for any RLS policy violations

---

## Migration Status Tracking

Track which migrations you've applied:

- [ ] 001_initial_schema.sql
- [ ] 002_create_agent_settings.sql
- [ ] 003_optimize_performance_schema.sql
- [ ] 20250927235242_create_missing_tables.sql
- [ ] 20250930_002_remove_agents_use_users.sql
- [ ] 20250930_003_rls_policies_auth.sql
- [ ] 20250930_004_user_metadata_setup.sql
- [ ] 20250930_005_fix_rls_security.sql
- [ ] 20251001_006_add_performance_indexes.sql

---

**Created:** 2025-10-01
**Project:** Commission Tracker
**Supabase Project:** pcyaqwodnyrpkaiojnpz
