# CRITICAL DATABASE RULES - NEVER VIOLATE

## Database Configuration

**NO LOCAL DATABASE - REMOTE SUPABASE ONLY**

- There is NO local Supabase instance running
- There is NO local database whatsoever
- ALL database work is done on the REMOTE Supabase instance at `pcyaqwodnyrpkaiojnpz.supabase.co`
- NEVER attempt to start local Supabase (`npx supabase start`)
- NEVER attempt to test migrations locally (`npx supabase db reset`)
- NEVER modify seed files unless explicitly asked

## Migration Workflow

When creating migrations:
1. Create migration file in `supabase/migrations/` with naming: `NNN_description.sql` (e.g., `002_fix_policies_commission.sql`)
2. Test SQL syntax if possible, but DO NOT run locally
3. User will apply migrations to remote database via Supabase Dashboard SQL Editor
4. NEVER use `npx supabase db push` or any local db commands

## What NOT to do

- ❌ NEVER run `npx supabase start`
- ❌ NEVER run `npx supabase db reset`
- ❌ NEVER run `npx supabase db push`
- ❌ NEVER modify `supabase/seed.sql` unless explicitly asked
- ❌ NEVER touch carriers, products, or comp_guide data unless explicitly asked
- ❌ NEVER test migrations locally

## What TO do

- ✅ Create migration SQL files only
- ✅ Let user apply them via Supabase Dashboard
- ✅ Run TypeScript/linting tests
- ✅ Run unit tests (npm test)
- ✅ Verify app still runs (check dev server)

## Current Task Focus

User reported: Commission column showing $0 in policies table
Solution: Created `002_fix_policies_commission.sql` migration
Next step: User will run it in Supabase Dashboard SQL Editor
