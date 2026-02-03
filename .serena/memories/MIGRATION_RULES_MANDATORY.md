# MANDATORY MIGRATION RULES - NEVER VIOLATE

## The One Rule

**NEVER run psql directly for migrations or function changes.**
**ALWAYS use: `./scripts/migrations/run-migration.sh <file>`**

## Commands

| Task | Command |
|------|---------|
| Apply migration | `./scripts/migrations/run-migration.sh supabase/migrations/FILE.sql` |
| Run a query | `./scripts/migrations/run-sql.sh "SELECT ..."` |
| Interactive psql | `./scripts/migrations/run-sql.sh --interactive` |
| Create migration timestamp | `date +%Y%m%d%H%M%S` |
| Verify tracking | `./scripts/migrations/verify-tracking.sh` |
| Audit functions | `./scripts/migrations/audit-critical-functions.sh` |

## Why This Exists

On Feb 3, 2026, an old migration silently overwrote a fixed function because:
1. Migrations weren't tracked properly
2. There was no downgrade protection
3. Direct `psql` bypassed all safeguards

The `run-migration.sh` script prevents this by:
- Blocking already-applied migrations
- Blocking downgrades (older migration overwriting newer function)
- Tracking everything automatically

## Correct vs Wrong

```bash
# ✅ CORRECT - Always do this
./scripts/migrations/run-migration.sh supabase/migrations/20260203164500_my_change.sql

# ❌ WRONG - NEVER do this for migrations
psql $DATABASE_URL -f supabase/migrations/whatever.sql
source .env && psql "${DATABASE_URL}" -f migration.sql
```

## Migration File Format

- Format: `YYYYMMDDHHMMSS_description.sql`
- Generate timestamp: `date +%Y%m%d%H%M%S`
- Location: `supabase/migrations/` only

## Verification

Run these periodically:
```bash
./scripts/migrations/verify-tracking.sh      # All migrations tracked?
./scripts/migrations/audit-critical-functions.sh  # Functions correct?
```
