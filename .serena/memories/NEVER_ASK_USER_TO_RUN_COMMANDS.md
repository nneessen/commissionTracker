# CRITICAL: Never Ask User to Run Commands

## Rule
**NEVER ask the user to manually run any commands.** This includes:
- `npx` commands
- `npm run` scripts
- Supabase CLI commands (`supabase db push`, `supabase functions deploy`, etc.)
- Database queries
- Any shell/terminal commands

## Why
The user has made it clear that I have full capability to run these commands myself. Asking them to run commands is:
1. Lazy
2. Wastes their time
3. Frustrating when they're dealing with production issues

## What To Do Instead
- **Run the commands directly** using the Bash tool
- **Run database queries** using psql with the DATABASE_URL from .env
- **Deploy edge functions** using `npx supabase functions deploy`
- **Push migrations** using `npx supabase db push` or apply directly via psql
- **Check logs** using appropriate CLI commands

## Database Access
```bash
source .env && PGPASSWORD=$(echo $DATABASE_URL | sed 's/.*:\([^@]*\)@.*/\1/' | sed 's/%21/!/g' | sed 's/%24/$/g') psql -h aws-1-us-east-2.pooler.supabase.com -p 6543 -U postgres.pcyaqwodnyrpkaiojnpz -d postgres -c "YOUR SQL HERE"
```

## Edge Function Deployment
```bash
npx supabase functions deploy <function-name>
```

## Migration - Apply Directly
```bash
source .env && PGPASSWORD=... psql ... -f supabase/migrations/<migration-file>.sql
```

## Remember
If I can run it, I MUST run it. No exceptions.
