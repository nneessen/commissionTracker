# Migration Workflow - ALWAYS RUN MIGRATIONS

## CRITICAL REMINDER
When creating new migration files, ALWAYS apply them to the database immediately. Do NOT tell the user to run them manually.

## How to Apply Migrations

### Method 1: Direct psql (Preferred for single migrations)
```bash
source .env && psql "$DATABASE_URL" -f supabase/migrations/<migration_file>.sql
```

### Method 2: Supabase CLI (For multiple migrations)
```bash
source .env && POOLER_URL="${DATABASE_URL}?pgbouncer=true&statement_cache_mode=describe" && npx supabase db push --db-url "$POOLER_URL" --include-all
```

Note: The `--include-all` flag is needed if there are migrations that haven't been applied yet.

## After Migrations

1. Regenerate types (discard stderr to avoid CLI warnings in output):
```bash
npx supabase gen types typescript --project-id pcyaqwodnyrpkaiojnpz 2>/dev/null > src/types/database.types.ts
```

2. Run build to verify:
```bash
npm run build
```

## Database Connection Info
- Project ID: pcyaqwodnyrpkaiojnpz
- DATABASE_URL is in `.env` file
- Uses pooler connection on port 6543
