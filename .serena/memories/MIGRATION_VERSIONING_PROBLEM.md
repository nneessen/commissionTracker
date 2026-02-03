# Migration Versioning Problem - CRITICAL

## The Problem Discovered (2026-02-03)

### Symptom
The `get_slack_leaderboard_with_periods` function was using a buggy `COALESCE(p.submit_date, p.created_at)` filter instead of strict `p.submit_date` filtering, even though a fix migration existed.

### Root Cause
Supabase's migration tracking table (`supabase_migrations.schema_migrations`) only tracks migrations up to version `20260117_001_*`. Newer migrations with full timestamps (e.g., `20260202184953_*`) are **NOT being tracked**.

This means:
1. Direct `psql` commands apply migrations but don't record them in Supabase's tracking
2. When `supabase db push` runs, it may re-apply old migrations
3. Multiple migrations can update the same function, with the wrong one potentially being the last applied

### Evidence
```sql
-- These migrations exist in files but aren't tracked:
20260202184953_slack_wtd_mtd_functions.sql  -- BUGGY: uses COALESCE with created_at
20260202191502_fix_submit_totals_no_status_filter.sql  -- CORRECT: uses submit_date only
20260203111935_fix_slack_leaderboard_submit_date_only.sql  -- FIX: applied manually

-- Migration tracking only shows old format:
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;
-- Returns: 20260117_001_*, 20260116_001_*, etc.
```

## Prevention Rules - NON-NEGOTIABLE

### 1. Function Updates Must Be Idempotent
When updating database functions:
- Always use `DROP FUNCTION IF EXISTS ... ; CREATE OR REPLACE FUNCTION ...`
- Include a version comment in the function with the migration timestamp
- Example: `-- Version: 20260203111935`

### 2. Always Verify After Applying
After applying any migration that modifies a function:
```sql
-- Verify the function source contains expected markers
SELECT prosrc FROM pg_proc WHERE proname = 'function_name';
```

### 3. Use Migration Script
Always use the script to apply migrations:
```bash
./scripts/migrations/apply-migration.sh supabase/migrations/MIGRATION_FILE.sql
```

### 4. Track Applied Migrations Manually
When using direct psql, also record in the tracking table:
```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20260203111935', 'fix_slack_leaderboard_submit_date_only', 'migration content...');
```

## Affected Functions

Functions that have had multiple conflicting migrations:

| Function | Latest Correct Migration | Issue Fixed |
|----------|--------------------------|-------------|
| `get_slack_leaderboard_with_periods` | `20260203111935` | submit_date vs created_at |
| `get_all_agencies_submit_totals` | `20260202211533` | hierarchy_path filtering |

## Solution Implemented (2026-02-03)

### 1. Backfilled Migration Tracking Table
Created `scripts/migrations/backfill-tracking.sql` to insert all 77 new-format migrations into `supabase_migrations.schema_migrations`.

**Result:** Tracking table went from 17 → 94 tracked migrations.

### 2. Created Verification Script
Created `scripts/migrations/verify-tracking.sh` that:
- Compares migrations on disk vs tracked in database
- Returns exit code 1 if any new-format migrations are untracked
- Can be used in CI/CD pipelines

### 3. Updated Apply-Migration Script
Enhanced `scripts/migrations/apply-migration.sh` to auto-track migrations after successful application:
- Parses version and name from filename
- Inserts into schema_migrations with ON CONFLICT DO NOTHING
- Works with both old-format (YYYYMMDD_NNN_*) and new-format (YYYYMMDDHHMMSS_*)

### 4. Created Audit Script
Created `scripts/migrations/audit-critical-functions.sh` that verifies:
- `get_slack_leaderboard_with_periods` uses strict submit_date filtering
- `get_all_agencies_submit_totals` uses strict submit_date filtering

## Migration Format Rules

| Format | Example | Version Extracted | Notes |
|--------|---------|-------------------|-------|
| Old | `20260102_001_name.sql` | `20260102` | ⚠️ Version collision - only one tracked per day |
| New | `20260130122627_name.sql` | `20260130122627` | ✓ Unique per second |

**ALWAYS use new format** (YYYYMMDDHHMMSS) for new migrations. Generate with: `date +%Y%m%d%H%M%S`

## Verification Commands

```bash
# Verify all migrations are tracked
./scripts/migrations/verify-tracking.sh

# Audit critical functions
./scripts/migrations/audit-critical-functions.sh

# Apply a new migration (auto-tracks)
./scripts/migrations/apply-migration.sh supabase/migrations/MIGRATION_FILE.sql
```

## Current State (as of 2026-02-03)

| Metric | Value |
|--------|-------|
| Total migration files | 217 |
| Tracked (new-format) | 77/77 ✓ |
| Tracked (old-format) | 17/140 (one per day due to version collision) |
| Critical functions verified | ✓ |
