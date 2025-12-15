# CRITICAL: Correct Migration Script Path

## ✅ ALWAYS USE THIS:
```bash
./scripts/migrations/apply-migration.sh supabase/migrations/YYYYMMDD_NNN_description.sql
```

## ❌ NEVER USE:
- `scripts/apply-migration.sh` (OLD, WRONG HOST)
- Any manual dashboard actions
- Any HTTP/REST API methods

## Why This Matters
- The OLD script at `scripts/apply-migration.sh` uses wrong host: `aws-0-us-east-1`
- The CORRECT script at `scripts/migrations/apply-migration.sh` uses: `aws-1-us-east-2`

## Connection Details (Correct)
- Host: `aws-1-us-east-2.pooler.supabase.com`
- Port: `6543`
- User: `postgres.pcyaqwodnyrpkaiojnpz`

## READ THIS MEMORY BEFORE ANY MIGRATION TASK
