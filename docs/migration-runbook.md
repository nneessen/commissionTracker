# Database Migration Runbook

## Overview

This runbook provides step-by-step procedures for creating, testing, and applying database migrations for the Commission Tracker application.

**Critical Rule**: There is ONLY ONE migration directory - `supabase/migrations/`. Never create duplicate directories.

---

## Table of Contents

1. [Creating Migrations](#creating-migrations)
2. [Testing Migrations Locally](#testing-migrations-locally)
3. [Applying Migrations to Production](#applying-migrations-to-production)
4. [Verification](#verification)
5. [Rollback Procedures](#rollback-procedures)
6. [Common Issues](#common-issues)
7. [Migration Checklist](#migration-checklist)

---

## Creating Migrations

### Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Local development environment set up
- Database connection configured in `.env`

### Steps

1. **Create Migration File**
   ```bash
   supabase migration new <descriptive_name>
   ```

   **Naming Convention**: `YYYYMMDD_NNN_descriptive_name.sql`
   - Example: `20251031_003_user_commission_rates_system.sql`

2. **Write Migration SQL**
   - Open the generated file in `supabase/migrations/`
   - Write SQL using transactions:
     ```sql
     BEGIN;

     -- Your migration code here
     CREATE TABLE IF NOT EXISTS ...
     ALTER TABLE ...
     CREATE INDEX IF NOT EXISTS ...

     COMMIT;
     ```

3. **Make Migrations Idempotent**
   - Use `IF NOT EXISTS` / `IF EXISTS`
   - Use `CREATE OR REPLACE` for functions
   - Test that migration can run multiple times safely

4. **Add Comments**
   ```sql
   COMMENT ON FUNCTION my_function IS 'Description of what it does';
   COMMENT ON TABLE my_table IS 'Purpose of this table';
   ```

---

## Testing Migrations Locally

### Method 1: Supabase CLI (Recommended)

1. **Reset Local Database**
   ```bash
   supabase db reset
   ```
   - This drops the database and re-applies all migrations

2. **Verify Schema**
   ```bash
   supabase db diff
   ```
   - Shows differences between local and remote

3. **Test Application**
   ```bash
   npm run dev
   ```
   - Verify app works with new schema

### Method 2: Direct SQL Execution

1. **Connect to Local Database**
   ```bash
   psql "postgresql://postgres:postgres@localhost:54322/postgres"
   ```

2. **Run Migration**
   ```sql
   \i supabase/migrations/YYYYMMDD_NNN_your_migration.sql
   ```

3. **Verify Results**
   ```sql
   \d table_name
   \df function_name
   ```

### Method 3: Automated Testing

Run database health checks:
```bash
npm run check-db-health
./scripts/verify-migrations.sh
```

---

## Applying Migrations to Production

### Method 1: Supabase Dashboard (Manual)

**Best for**: One-off migrations, emergency fixes

1. **Open SQL Editor**
   - Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/sql/new

2. **Copy Migration Contents**
   - Open migration file from `supabase/migrations/`
   - Copy entire contents (including BEGIN/COMMIT)

3. **Execute in SQL Editor**
   - Paste into SQL editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify Success**
   - Check for success message
   - Run verification queries

5. **Test Application**
   - Visit production site
   - Test affected features

### Method 2: Supabase CLI Push

**Best for**: Regular deployments, CI/CD integration

1. **Link to Project**
   ```bash
   supabase link --project-ref pcyaqwodnyrpkaiojnpz
   ```

2. **Push Migrations**
   ```bash
   supabase db push
   ```

3. **Verify**
   ```bash
   supabase db diff
   ```

### Method 3: Automated via psql

**Best for**: Scripts, automation

```bash
PGPASSWORD="N123j234n345!\$!" psql \
  "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -f supabase/migrations/YYYYMMDD_NNN_your_migration.sql
```

---

## Verification

### 1. Database Function Check

Run automated health check:
```bash
PGPASSWORD="N123j234n345!\$!" psql \
  "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -f scripts/test-db-functions.sql
```

Expected output: All tests show ✅ PASS

### 2. Application Testing

1. **Clear Browser Cache**
   - Hard refresh (Cmd/Ctrl + Shift + R)
   - Clear local storage

2. **Test Affected Features**
   - Navigate to impacted pages
   - Verify data loads correctly
   - Check browser console for errors

3. **Verify Calculations**
   - Test any new calculations
   - Compare with expected results

### 3. Performance Verification

1. **Check Query Performance**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM your_function();
   ```

2. **Verify Indexes**
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'your_table';
   ```

---

## Rollback Procedures

### Emergency Rollback

If a migration causes critical issues:

1. **Immediate Action**
   - Revert code changes
   - Deploy previous version

2. **Database Rollback** (If needed)
   ```sql
   BEGIN;

   -- Drop problematic objects
   DROP FUNCTION IF EXISTS problematic_function CASCADE;
   DROP TABLE IF EXISTS problematic_table CASCADE;

   -- Restore previous state
   -- (paste SQL from previous migration or backup)

   COMMIT;
   ```

3. **Verify Rollback**
   - Test application
   - Check data integrity

### Planned Rollback

Create a rollback migration:

```bash
supabase migration new rollback_feature_name
```

```sql
BEGIN;

-- Undo changes from original migration
DROP FUNCTION IF EXISTS new_function CASCADE;
ALTER TABLE my_table DROP COLUMN IF EXISTS new_column;

COMMIT;
```

---

## Common Issues

### Issue 1: Function Already Exists

**Symptom**: `ERROR: function "xyz" already exists`

**Solution**:
```sql
CREATE OR REPLACE FUNCTION xyz() ...
-- OR
DROP FUNCTION IF EXISTS xyz CASCADE;
CREATE FUNCTION xyz() ...
```

### Issue 2: Duplicate Triggers

**Symptom**: Multiple triggers executing on same table/event

**Solution**:
```sql
-- Find duplicate triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'your_table';

-- Drop old trigger
DROP TRIGGER IF EXISTS old_trigger_name ON your_table;
```

### Issue 3: Permission Denied

**Symptom**: `ERROR: permission denied for function`

**Solution**:
```sql
GRANT EXECUTE ON FUNCTION function_name TO authenticated;
GRANT EXECUTE ON FUNCTION function_name TO anon;
```

### Issue 4: RLS Blocking Queries

**Symptom**: Queries return empty results unexpectedly

**Solution**:
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Create policy
CREATE POLICY "policy_name" ON your_table
  FOR SELECT
  TO authenticated
  USING (true);
```

### Issue 5: Missing Function in Production

**Symptom**: `Could not find the function public.xyz`

**Solution**:
1. Verify migration file exists locally
2. Check if migration was applied:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations;
   ```
3. Apply missing migration manually via Supabase dashboard

---

## Migration Checklist

### Before Creating Migration

- [ ] Understand the schema change required
- [ ] Check for existing similar migrations
- [ ] Review current database schema
- [ ] Plan rollback strategy

### While Writing Migration

- [ ] Use transactions (BEGIN/COMMIT)
- [ ] Make migration idempotent
- [ ] Add proper indexes for new columns
- [ ] Configure RLS policies if needed
- [ ] Grant appropriate permissions
- [ ] Add documentation comments
- [ ] Test migration can run multiple times

### Before Applying to Production

- [ ] Test locally with `supabase db reset`
- [ ] Verify application works with changes
- [ ] Run database health checks
- [ ] Review migration file for errors
- [ ] Backup current database state (if major change)
- [ ] Plan deployment timing (low-traffic period)

### After Applying Migration

- [ ] Verify success message in SQL editor
- [ ] Run verification queries
- [ ] Check database function tests
- [ ] Test application in production
- [ ] Monitor error logs
- [ ] Verify performance metrics
- [ ] Update documentation
- [ ] Commit migration file to git

### If Migration Fails

- [ ] Read error message carefully
- [ ] Check database logs
- [ ] Verify syntax and permissions
- [ ] Test migration locally
- [ ] Fix issues and retry
- [ ] Document issue and resolution

---

## Quick Reference Commands

### Supabase CLI

```bash
# Create migration
supabase migration new <name>

# Reset local database
supabase db reset

# Check differences
supabase db diff

# Push migrations to remote
supabase db push

# Generate TypeScript types
supabase gen types typescript --project-id pcyaqwodnyrpkaiojnpz > src/types/database.types.ts
```

### psql Commands

```bash
# Connect to local database
psql "postgresql://postgres:postgres@localhost:54322/postgres"

# Connect to production database
PGPASSWORD="N123j234n345!\$!" psql \
  "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

# Run migration file
\i supabase/migrations/your_migration.sql

# List tables
\dt

# Describe table
\d table_name

# List functions
\df

# List indexes
\di
```

### Verification Scripts

```bash
# Run database function tests
PGPASSWORD="N123j234n345!\$!" psql \
  "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" \
  -f scripts/test-db-functions.sql

# Verify migrations
./scripts/verify-migrations.sh

# Check database health
npm run check-db-health
```

---

## Resources

- [Supabase Migration Docs](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/current/)
- [Project CLAUDE.md](../CLAUDE.md) - Migration rules and guidelines
- [Commission Tracker Architecture](./commission-tracker-architecture.md)

---

## Support

For issues or questions:
1. Check this runbook first
2. Search project docs in `/docs`
3. Review past migrations in `supabase/migrations/`
4. Check project memories in `.serena/memories/`

---

**Last Updated**: 2025-11-02
**Version**: 1.0
