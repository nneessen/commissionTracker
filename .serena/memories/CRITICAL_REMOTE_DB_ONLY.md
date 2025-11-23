# CRITICAL: ALWAYS USE REMOTE SUPABASE DATABASE

## Rule: NO LOCAL DATABASE OPERATIONS EVER

**ALWAYS** connect to the remote Supabase database at:
- Host: aws-1-us-east-2.pooler.supabase.com
- Port: 6543
- User: postgres.pcyaqwodnyrpkaiojnpz
- Database: postgres
- Password: (stored in scripts/apply-migration-auto.sh)

## Migration Process:

1. **NEVER** use `npx supabase db reset` (this is for local DB)
2. **NEVER** use `npx supabase migration up` (this is for local DB)
3. **ALWAYS** use the scripts in `/scripts/` directory to apply migrations

## Available Migration Scripts:
- `/scripts/apply-migration-auto.sh` - Main script to apply migrations
- `/scripts/run-migration.sh` - Alternative migration runner
- `/scripts/apply-migrations.sh` - Batch migration runner

## When Creating Migrations:
1. Create the .sql file in `supabase/migrations/`
2. Update the MIGRATION_FILE variable in the script
3. Run the script to apply to remote database

## Remember:
- User works on multiple machines
- All state must be in remote Supabase
- No local database state should exist
- Migrations are applied via scripts, not manual Supabase dashboard login