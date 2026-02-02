# Database Commands - ALWAYS RUN THEM

**NEVER ask the user to run these commands. ALWAYS run them yourself:**

## Apply Migrations

Use psql directly (works without interactive password prompt):
```bash
psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -f path/to/migration.sql
```

Or for multiple migrations, run each one in order.

## Regenerate Types

**IMPORTANT:** Redirect stderr to /dev/null to avoid CLI version messages polluting the output:
```bash
npx supabase gen types typescript --project-id pcyaqwodnyrpkaiojnpz 2>/dev/null > src/types/database.types.ts
```

## Project Info
- Project ID: `pcyaqwodnyrpkaiojnpz`
- Database URL is in `.env` as `DATABASE_URL`
