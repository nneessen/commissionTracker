# Working Migration Script - FINAL VERSION

## ✅ THE ONLY SCRIPT TO USE

**File:** `scripts/apply-migration.sh`

**Usage:**
```bash
./scripts/apply-migration.sh supabase/migrations/YYYYMMDD_migration_name.sql
```

## Why This Works

Uses the PostgreSQL connection string format:
```bash
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

**Connection Details:**
- Host: `aws-1-us-east-2.pooler.supabase.com`
- Port: `6543` (Supabase Pooler)
- Database: `postgres`
- User: `postgres.pcyaqwodnyrpkaiojnpz`
- Password: `N123j234n345!\$!\$` (escaped in bash)

## Alternative: Node.js

**File:** `scripts/run-migration-direct.cjs`

Uses Node.js `pg` library with same connection details.

## ❌ Scripts Removed (DO NOT USE)

- `apply-migration-auto.sh` - All 5 methods failed
- `apply-migration-http.py` - HTTP API doesn't support DDL
- `apply-migration-via-http-rpc.mjs` - Requires non-existent RPC function
- `apply-migration-management-api.mjs` - Wrong API for SQL execution
- `fix-wsl-network-and-migrate.sh` - Overly complex, unnecessary

## Full Documentation

See: `docs/DATABASE_MIGRATION_GUIDE.md` for complete guide

## REMEMBER

- ✅ Always use `scripts/apply-migration.sh`
- ❌ NEVER create new migration scripts
- ❌ NEVER try HTTP/REST API methods
- ❌ NEVER modify WSL networking
