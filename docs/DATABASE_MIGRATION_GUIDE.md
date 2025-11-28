# Database Migration Guide

## THE CORRECT WAY TO APPLY MIGRATIONS

### ✅ Use This Script ONLY

**File:** `scripts/apply-migration.sh`

**Usage:**
```bash
./scripts/apply-migration.sh supabase/migrations/YYYYMMDD_migration_name.sql
```

### How It Works

The script uses the **PostgreSQL connection string format** that actually works:

```bash
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

**Connection Details:**
- Host: `aws-1-us-east-2.pooler.supabase.com` (Supabase Pooler)
- Port: `6543` (Pooler port, NOT 5432)
- Database: `postgres`
- User: `postgres.pcyaqwodnyrpkaiojnpz`
- Password: `N123j234n345!$!$` (escaped with `\$` in bash)

### Why This Works

1. **Uses Supabase Pooler** - Avoids direct database connection issues
2. **Simple psql execution** - No complex workarounds needed
3. **Proper password escaping** - Special characters handled correctly
4. **Direct file execution** - Runs entire migration file as-is

### Alternative: Node.js Method

If you need to run migrations via Node.js (e.g., from scripts):

**File:** `scripts/run-migration-direct.cjs`

```javascript
const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.pcyaqwodnyrpkaiojnpz',
  password: 'N123j234n345!$!$',
  ssl: { rejectUnauthorized: false }
});

await client.connect();
const sql = fs.readFileSync('migration_file.sql', 'utf8');
await client.query(sql);
await client.end();
```

## ❌ Scripts That Were Removed (DO NOT USE)

These scripts were removed because they DO NOT WORK:

1. **`apply-migration-auto.sh`**
   - Tried 5 different methods (Windows psql, WSL IPv4, Node.js, network restart, PowerShell)
   - All methods failed on WSL2
   - Overly complex and unreliable

2. **`apply-migration-http.py`**
   - Attempted to use Supabase HTTP REST API
   - HTTP API does NOT support DDL statements (CREATE, DROP, ALTER)
   - Only works for simple SELECT/INSERT/UPDATE

3. **`apply-migration-via-http-rpc.mjs`**
   - Tried to use RPC endpoint
   - Requires custom `exec_sql()` function in database (doesn't exist)
   - Cannot execute migrations

4. **`apply-migration-management-api.mjs`**
   - Attempted to use Supabase Management API
   - Management API is for project-level operations (not SQL execution)
   - Wrong tool for the job

5. **`fix-wsl-network-and-migrate.sh`**
   - Tried to fix WSL2 networking issues
   - Overly complex (DNS fixes, network restarts)
   - Simple connection string method works without network fixes

## Migration Workflow

### 1. Create Migration

```bash
supabase migration new <descriptive_name>
```

This creates: `supabase/migrations/YYYYMMDD_NNN_descriptive_name.sql`

### 2. Write SQL

Edit the generated file with your migration SQL:

```sql
BEGIN;

-- Your migration SQL here
CREATE TABLE IF NOT EXISTS my_table (...);
ALTER TABLE existing_table ADD COLUMN new_col TEXT;

COMMIT;
```

### 3. Test Locally (Optional)

```bash
supabase db reset  # Resets local DB and applies all migrations
```

### 4. Apply to Remote Supabase

```bash
./scripts/apply-migration.sh supabase/migrations/YYYYMMDD_NNN_descriptive_name.sql
```

### 5. Verify

Connect to your app and verify the changes took effect.

## Troubleshooting

### "Password contains special characters"

The script handles this correctly by escaping `$` as `\$` in bash:
```bash
DB_PASS="N123j234n345!\$!\$"
```

### "Connection timeout" or "Connection refused"

- ✅ Make sure you're using the **pooler** host (aws-1-us-east-2.pooler.supabase.com)
- ✅ Use port **6543** (pooler), NOT 5432 (direct)
- ❌ Do NOT try to "fix" WSL2 networking
- ❌ Do NOT try to restart WSL or modify DNS

### "Function already exists"

If you get errors about functions/triggers existing:

```sql
-- Add to your migration BEFORE CREATE statements
DROP FUNCTION IF EXISTS function_name() CASCADE;
DROP TRIGGER IF EXISTS trigger_name ON table_name;
```

### "Cannot change return type of existing function"

Must drop and recreate:

```sql
DROP FUNCTION IF EXISTS admin_get_all_users();

CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS TABLE (
  -- new return type
) ...
```

## Best Practices

1. **Always use transactions** (`BEGIN;` ... `COMMIT;`)
2. **Make migrations idempotent** (safe to run multiple times)
3. **Drop before create** when changing function signatures
4. **Test locally first** with `supabase db reset`
5. **One migration per logical change** (don't bundle unrelated changes)
6. **Document migration purpose** (add comments explaining why)

## Example Migration

```sql
-- Migration: Add contract_level to user_profiles
-- Purpose: Track insurance agent contract compensation levels
-- Date: 2025-11-28

BEGIN;

-- Add new column (idempotent - IF NOT EXISTS equivalent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'contract_level'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN contract_level INTEGER CHECK (contract_level IN (80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145));
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_contract_level
ON user_profiles(contract_level);

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: contract_level column added to user_profiles';
END $$;
```

## Quick Reference

### The One Command You Need

```bash
./scripts/apply-migration.sh supabase/migrations/<your_migration_file>.sql
```

### If That Fails

1. Check the migration file exists
2. Check your internet connection
3. Verify Supabase project is not paused
4. Look at the error message (usually tells you what's wrong)

### DO NOT

- ❌ Create new migration scripts
- ❌ Try HTTP/REST API methods
- ❌ Modify WSL networking
- ❌ Use `supabase db push` (requires Supabase CLI setup)
- ❌ Try to "improve" the working script

### DO

- ✅ Use `scripts/apply-migration.sh`
- ✅ Test migrations locally first
- ✅ Read the error messages
- ✅ Make migrations idempotent
- ✅ Use transactions

## Summary

**The ONLY migration script you need:** `scripts/apply-migration.sh`

**Connection format:** `postgresql://USER:PASS@HOST:PORT/DB`

**Alternative:** `scripts/run-migration-direct.cjs` (Node.js pg client)

**Everything else:** Removed because it didn't work

**Remember:** The simplest solution is usually the correct one. Don't overcomplicate migrations.
