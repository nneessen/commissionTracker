# Supabase Migration Workflow - CRITICAL

## Database Password
**Password**: `N123j234n345!$!$`

## How to Run Migrations

**ALWAYS use the migration script in scripts folder:**

```bash
echo "N123j234n345!\$!\$" | ./scripts/run-migration.sh supabase/migrations/MIGRATION_FILE.sql
```

## Important Rules

1. **NEVER** manually run `npx supabase db push` or `npx supabase db reset`
2. **NEVER** use local database - we only work with remote Supabase at `pcyaqwodnyrpkaiojnpz.supabase.co`
3. **ALWAYS** use the `run-migration.sh` script to apply migrations
4. **ALWAYS** remember the password is `N123j234n345!$!$`

## Migration Script Location
`./scripts/run-migration.sh`

## When Creating Migrations

1. Create migration file in `supabase/migrations/` with format: `YYYYMMDD_NNN_description.sql`
2. Test SQL syntax if possible
3. Run using the script above
4. Verify in Supabase dashboard

## Common Issues & Fixes

### Issue: "record 'v_commission' has no field 'commission_amount'"

**Root Cause**: Multiple conflicting triggers or functions trying to handle the same database event, with old migrations using wrong field names.

**How to Diagnose**:
```sql
-- Find all triggers on a table
SELECT trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'policies';

-- Find functions with wrong field references
SELECT proname, prosrc
FROM pg_proc
WHERE prosrc LIKE '%commission_amount%'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Get actual column names
SELECT column_name FROM information_schema.columns
WHERE table_name = 'commissions'
AND column_name IN ('amount', 'commission_amount', 'advance_amount');
```

**Fix Process**:

1. **Identify duplicate triggers**: Look for multiple triggers on the same table handling the same event (e.g., multiple UPDATE triggers)
2. **Check which is old**: The old trigger will reference wrong field names like `commission_amount` or `advance_amount`
3. **Remove the old trigger and function**:
   ```sql
   DROP TRIGGER IF EXISTS old_trigger_name ON table_name;
   DROP FUNCTION IF EXISTS old_function_name();
   ```
4. **Keep only the newest, corrected version** that uses proper field names like `amount`
5. **Test the fix** by running the operation that previously failed

**Note**: The actual commissions table column is `amount`, NOT `commission_amount` or `advance_amount`. All functions must reference `amount` when selecting commission records.

### Issue: "Field name mismatch"

**Correct field names in commissions table**:
- `amount` - Total commission amount (NOT commission_amount, NOT advance_amount)
- `advance_months` - Number of months for advance
- `months_paid` - Months already paid
- `earned_amount` - Amount earned so far
- `unearned_amount` - Amount still at risk
- `chargeback_amount` - Amount subject to chargeback
- `status` - Commission status (pending, earned, paid, charged_back, cancelled)

**Check for conflicts**: Multiple migrations may have created functions with different field name assumptions. Always use `SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'function_name'` to see actual code in database.

## Trigger Management

Always check for multiple triggers on the same table:

```sql
SELECT trigger_name, event_object_table, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('policies', 'commissions')
ORDER BY event_object_table, trigger_name;
```

**Good practice**: Each table should have ONE trigger per event type (INSERT, UPDATE, DELETE). If you see duplicates, it means:
- Old migrations created triggers that weren't cleaned up
- New migrations created similar triggers for the same purpose
- The old one will execute FIRST and may fail, blocking the new one