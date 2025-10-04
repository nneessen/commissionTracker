# Migration Best Practices

**How to Write Supabase PostgreSQL Migrations That Work Everywhere**

---

## Core Principles

1. **Idempotent**: Can run multiple times safely
2. **Portable**: Works on any machine, any time
3. **Atomic**: All changes succeed or all fail
4. **Documented**: Clear comments explaining what and why

---

## File Naming Convention

```
YYYYMMDD_HHmmss_descriptive_name.sql
```

**Examples**:
- `20251004_001_complete_schema.sql`
- `20251004_002_add_earning_tracking.sql`

**Rules**:
- Use timestamps for ordering
- Descriptive names (no vague terms like "update" or "fix")
- Lowercase with underscores
- Never rename migration files after creation

---

## Idempotent Patterns

### Creating Tables

```sql
-- ✅ CORRECT
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- ...columns
);

-- ❌ WRONG
CREATE TABLE policies (...);  -- Fails if table exists
```

### Adding Columns

```sql
-- ✅ CORRECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'commissions'
      AND column_name = 'months_paid'
  ) THEN
    ALTER TABLE commissions ADD COLUMN months_paid INTEGER DEFAULT 0;
  END IF;
END $$;

-- ❌ WRONG
ALTER TABLE commissions ADD COLUMN months_paid INTEGER;  -- Fails if exists
```

### Creating Indexes

```sql
-- ✅ CORRECT
CREATE INDEX IF NOT EXISTS idx_policies_user_id ON policies(user_id);

-- ❌ WRONG
CREATE INDEX idx_policies_user_id ON policies(user_id);  -- Fails if exists
```

### Creating RLS Policies

**IMPORTANT**: PostgreSQL does NOT support `CREATE POLICY IF NOT EXISTS`

```sql
-- ✅ CORRECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'policies'
      AND policyname = 'Users can view own policies'
  ) THEN
    CREATE POLICY "Users can view own policies" ON policies
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;

-- OR: Drop then create
DROP POLICY IF EXISTS "Users can view own policies" ON policies;
CREATE POLICY "Users can view own policies" ON policies
  FOR SELECT
  USING (user_id = auth.uid());

-- ❌ WRONG
CREATE POLICY IF NOT EXISTS "..." ON policies ...;  -- Syntax error!
```

---

## Common PostgreSQL Gotchas

### 1. CURRENT_DATE in Index Predicates

```sql
-- ❌ WRONG - CURRENT_DATE is not immutable
CREATE INDEX idx_recent ON policies(created_at)
WHERE created_at >= CURRENT_DATE - INTERVAL '1 year';

-- ✅ CORRECT - Remove the predicate or use a different approach
CREATE INDEX idx_created_at ON policies(created_at);
```

### 2. Array Slicing

```sql
-- ❌ WRONG - Array slicing syntax not portable
SELECT string_to_array(name, ' ')[2:]

-- ✅ CORRECT - Use SUBSTRING or other functions
SELECT SUBSTRING(name FROM POSITION(' ' IN name) + 1)
```

### 3. IF NOT EXISTS for Extensions

```sql
-- ✅ CORRECT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ❌ WRONG
CREATE EXTENSION "uuid-ossp";  -- Fails if exists
```

---

## Migration Template

```sql
-- supabase/migrations/YYYYMMDD_HHmmss_description.sql
-- Description: What this migration does and why
--
-- Tables affected: policies, commissions
-- Adds: months_paid, earned_amount columns
-- Changes: None
-- Removes: None

-- ==============================================
-- STEP 1: Add new columns
-- ==============================================

DO $$
BEGIN
  -- Add months_paid column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'commissions'
      AND column_name = 'months_paid'
  ) THEN
    ALTER TABLE commissions
    ADD COLUMN months_paid INTEGER DEFAULT 0 NOT NULL;

    RAISE NOTICE 'Added months_paid column to commissions';
  ELSE
    RAISE NOTICE 'months_paid column already exists';
  END IF;
END $$;

-- ==============================================
-- STEP 2: Create indexes
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_commissions_months_paid
  ON commissions(months_paid);

-- ==============================================
-- STEP 3: Add RLS policies
-- ==============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'commissions'
      AND policyname = 'Users can view own commissions'
  ) THEN
    CREATE POLICY "Users can view own commissions" ON commissions
      FOR SELECT
      USING (user_id = auth.uid());

    RAISE NOTICE 'Created RLS policy for commissions';
  END IF;
END $$;

-- ==============================================
-- STEP 4: Add comments
-- ==============================================

COMMENT ON COLUMN commissions.months_paid IS
'Number of months client has paid premiums. Used to calculate earned commission.';

-- ==============================================
-- STEP 5: Verification
-- ==============================================

DO $$
DECLARE
  v_column_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'commissions'
    AND column_name IN ('months_paid', 'earned_amount');

  RAISE NOTICE 'Migration complete. Added % columns.', v_column_count;
END $$;
```

---

## Testing Migrations

### Local Testing

```bash
# Reset database and run all migrations
npx supabase db reset

# Check for errors
npx supabase db lint

# View current schema
npx supabase db dump --schema public
```

### Verify Idempotency

```bash
# Run migration twice - should succeed both times
npx supabase db reset
npx supabase db reset  # Should not error
```

### Test on Fresh Clone

```bash
# On a different machine or directory
git clone <repo>
cd commissionTracker
npx supabase start  # Should work first try
```

---

## Common Mistakes to Avoid

1. ❌ Using `CREATE TABLE` without `IF NOT EXISTS`
2. ❌ Using `CREATE POLICY IF NOT EXISTS` (doesn't exist in PostgreSQL)
3. ❌ Not handling existing columns when adding
4. ❌ Using non-immutable functions in index predicates
5. ❌ Forgetting to enable RLS on new tables
6. ❌ Not adding user_id to tables that need RLS
7. ❌ Creating circular foreign key dependencies
8. ❌ Not testing migration on fresh database

---

## Emergency Rollback

If migration fails in production:

```sql
-- Create a rollback migration
-- YYYYMMDD_HHmmss_rollback_description.sql

-- Drop added columns
ALTER TABLE commissions DROP COLUMN IF EXISTS months_paid;

-- Drop added tables
DROP TABLE IF EXISTS new_table CASCADE;

-- Drop added policies
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

**Better approach**: Test thoroughly before production!

---

## Supabase-Specific Notes

- Migrations run automatically on `supabase start`
- Migration order determined by filename
- Failed migrations stop the process
- Use `supabase db reset` to start fresh locally
- Production migrations applied via dashboard or CLI

---

## Summary Checklist

Before committing a migration:

- [ ] Uses `IF NOT EXISTS` for tables, indexes, extensions
- [ ] Uses DO $$ blocks for columns and policies
- [ ] No non-immutable functions in indexes
- [ ] All tables have RLS enabled
- [ ] All tables have user_id column
- [ ] Includes COMMENT ON for new columns
- [ ] Includes RAISE NOTICE for logging
- [ ] Tested with `supabase db reset` (twice)
- [ ] Tested on fresh clone
- [ ] Clear comments explaining changes
