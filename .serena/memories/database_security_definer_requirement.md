# Database Functions Requiring SECURITY DEFINER

## Critical Rule: Functions Accessing auth.users Table

**When creating database functions that access `auth.users` table, you MUST use SECURITY DEFINER.**

### Why This Is Required:

1. **RLS Blocks Access**: Authenticated users do NOT have SELECT permission on `auth.users` table
2. **Only postgres Role Has Access**: The `auth.users` table can only be accessed by the `postgres` role
3. **SECURITY INVOKER Fails**: If a function uses the default SECURITY INVOKER, it runs with the caller's permissions and will fail with "permission denied for table users"
4. **SECURITY DEFINER Fixes It**: Functions with SECURITY DEFINER run with the owner's (postgres) permissions

### Correct Pattern:

```sql
CREATE OR REPLACE FUNCTION my_function_accessing_users()
RETURNS TRIGGER  -- or any return type
LANGUAGE plpgsql
SECURITY DEFINER  -- CRITICAL: Run with postgres permissions
SET search_path = public, pg_temp  -- SECURITY: Prevent search_path attacks
AS $$
DECLARE
  v_user_data RECORD;
BEGIN
  -- This will work because function runs with postgres permissions
  SELECT * INTO v_user_data
  FROM auth.users
  WHERE id = some_user_id;
  
  -- ... rest of function logic
  
  RETURN NEW;  -- or appropriate return value
END;
$$;
```

### Security Best Practices:

1. **Always add `SET search_path = public, pg_temp`** to prevent search path attacks
2. **Only access user data that the function actually needs** (principle of least privilege)
3. **Don't expose sensitive data** from auth.users to the caller
4. **Validate all inputs** to prevent SQL injection

### Real-World Example (Policy Creation Fix):

**Problem:**
The `auto_create_commission_record()` trigger function needed to read `contract_comp_level` from `auth.users.raw_user_meta_data`, but was failing with "permission denied for table users".

**Solution:**
```sql
CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- THE FIX!
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contract_level DECIMAL;
BEGIN
  -- Get user's contract level from auth.users
  v_contract_level := COALESCE(
    (
      SELECT (raw_user_meta_data->>'contract_comp_level')::DECIMAL / 100.0
      FROM auth.users  -- Now accessible!
      WHERE id = NEW.user_id
    ),
    1.0
  );
  
  -- ... rest of function
END;
$$;
```

### Functions Currently Using SECURITY DEFINER:

1. `get_user_profile` - Reads from auth.users
2. `update_user_metadata` - Updates auth.users.raw_user_meta_data
3. `auto_create_commission_record` - Reads contract_comp_level from auth.users

### How to Check If a Function Has SECURITY DEFINER:

```sql
-- Check function security setting
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'your_function_name'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- prosecdef = 't' means SECURITY DEFINER (correct)
-- prosecdef = 'f' means SECURITY INVOKER (will fail if accessing auth.users)
```

### Migration Template:

When creating a migration for a function that needs SECURITY DEFINER:

```sql
BEGIN;

DROP FUNCTION IF EXISTS my_function() CASCADE;

CREATE OR REPLACE FUNCTION my_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Required for auth.users access
SET search_path = public, pg_temp  -- Security best practice
AS $$
DECLARE
  -- variables here
BEGIN
  -- function logic here
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION my_function IS
'Description of what this function does. Uses SECURITY DEFINER to access auth.users table.';

-- Recreate triggers if needed
CREATE TRIGGER my_trigger
  AFTER INSERT ON my_table
  FOR EACH ROW
  EXECUTE FUNCTION my_function();

COMMIT;
```

### Related Error Messages:

If you see these errors, the function likely needs SECURITY DEFINER:
- "permission denied for table users"
- "permission denied for schema auth"
- "permission denied for table auth.users"

### References:

- Migration: `supabase/migrations/20251024_001_fix_auto_create_commission_security_definer.sql`
- Plan: `plans/active/add-policy-broken.md` (to be moved to completed/)
- PostgreSQL Docs: SECURITY DEFINER Functions
- Supabase Docs: Row Level Security
