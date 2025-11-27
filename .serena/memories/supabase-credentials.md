# Supabase Database Credentials

**Remote Supabase Database URL**: https://pcyaqwodnyrpkaiojnpz.supabase.co

**Database Password**: N123j234n345!$!$ 
**Status**: Password authentication is failing (SASL auth error). May need to be reset from Supabase Dashboard.

**Usage**: For `npx supabase db push` and other database operations

**Important**: User has provided this password multiple times. DO NOT ask for it again. Always use this password for database operations.

## Connection String Format
```
postgresql://postgres.pcyaqwodnyrpkaiojnpz:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

## Common Commands
```bash
# Push migrations to remote
npx supabase db push

# Reset local DB (not used - we only work on remote)
npx supabase db reset

# Check migration status
npx supabase migration list
```

**Critical Rule**: This project NEVER uses local Supabase database. Always work on remote database only.
