-- ============================================================================
-- COMPLETE FIX FOR DASHBOARD SHOWING ZEROS
-- ============================================================================
-- The problematic migration created artifacts that are blocking data access
-- This script removes EVERYTHING that migration added
-- ============================================================================

-- 1. Check what migrations were applied
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE name LIKE '%commission%' OR name LIKE '%target%' OR version LIKE '2025103%'
ORDER BY version DESC;

-- 2. Remove the problematic function and ALL its dependencies
DROP FUNCTION IF EXISTS get_user_commission_profile(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_commission_profile(UUID, INTEGER) CASCADE;

-- 3. Remove ALL indexes that were added
DROP INDEX IF EXISTS idx_comp_guide_lookup CASCADE;
DROP INDEX IF EXISTS idx_policies_user_product_date CASCADE;
DROP INDEX IF EXISTS public.idx_comp_guide_lookup CASCADE;
DROP INDEX IF EXISTS public.idx_policies_user_product_date CASCADE;

-- 4. Remove any RLS policies that might have been added
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on comp_guide
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'comp_guide'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON comp_guide', r.policyname);
    END LOOP;
END $$;

-- 5. Check and remove any triggers that might be broken
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%commission%'
ORDER BY event_object_table;

-- 6. Re-enable RLS properly on main tables
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- 7. Recreate the basic RLS policies
DROP POLICY IF EXISTS "Users can view own policies" ON policies;
CREATE POLICY "Users can view own policies" ON policies
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own commissions" ON commissions;
CREATE POLICY "Users can view own commissions" ON commissions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
CREATE POLICY "Users can view own expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own clients" ON clients;
CREATE POLICY "Users can view own clients" ON clients
  FOR ALL USING (auth.uid() = user_id);

-- 8. Delete the problematic migration from the migrations table
DELETE FROM supabase_migrations.schema_migrations
WHERE name = '003_user_commission_rates_system'
   OR name LIKE '%commission_rate%'
   OR version = '20251031003';

-- 9. Verify data is accessible
SELECT
  'Data Check:' as status,
  (SELECT COUNT(*) FROM policies) as policies,
  (SELECT COUNT(*) FROM commissions) as commissions,
  (SELECT COUNT(*) FROM expenses) as expenses,
  (SELECT COUNT(*) FROM clients) as clients;

-- 10. Test that auth.uid() is working
SELECT
  'Auth Check:' as status,
  auth.uid() as current_user_id,
  EXISTS(SELECT 1 FROM policies WHERE user_id = auth.uid()) as can_see_policies;

-- ============================================================================
-- After running this, refresh your dashboard
-- ============================================================================