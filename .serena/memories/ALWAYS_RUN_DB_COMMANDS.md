# Database Commands - Always Run Directly

## Migration Application
You have FULL ACCESS to apply migrations yourself. Stop asking the user.

**Connection string** (from .env DATABASE_URL):
```
postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

**Apply migration via psql**:
```bash
psql "postgresql://postgres.pcyaqwodnyrpkaiojnpz:N123j234n345%21%24%21%24@aws-1-us-east-2.pooler.supabase.com:6543/postgres" -f /path/to/migration.sql
```

## Type Generation
After applying migrations, regenerate types:
```bash
npx supabase gen types typescript --project-id pcyaqwodnyrpkaiojnpz > src/types/database.types.ts
```

**IMPORTANT**: The Supabase CLI prints an update warning that gets appended to the file. Always check and remove these lines:
```
A new version of Supabase CLI is available: v2.72.7 (currently installed v2.12.1)
We recommend updating regularly for new features and bug fixes: ...
```

## Edge Function Deployment
```bash
npx supabase functions deploy <function-name> --project-ref pcyaqwodnyrpkaiojnpz
```

## Project ID
- **Project ID**: pcyaqwodnyrpkaiojnpz
- **Region**: aws-1-us-east-2
