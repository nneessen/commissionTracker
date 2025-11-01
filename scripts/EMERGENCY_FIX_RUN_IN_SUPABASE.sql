-- ============================================================================
-- EMERGENCY DATABASE FIX
-- ============================================================================
-- Run this script in Supabase SQL Editor to fix broken dashboard
--
-- HOW TO RUN:
-- 1. Go to: https://supabase.com/dashboard/project/pcyaqwodnyrpkaiojnpz/sql/new
-- 2. Copy and paste this entire file
-- 3. Click "Run" button
-- 4. Refresh your dashboard
--
-- ============================================================================

-- Step 1: Remove problematic database function
DROP FUNCTION IF EXISTS get_user_commission_profile(UUID, INTEGER) CASCADE;

-- Step 2: Remove problematic indexes
DROP INDEX IF EXISTS idx_comp_guide_lookup;
DROP INDEX IF EXISTS idx_policies_user_product_date;

-- Step 3: Remove problematic RLS policy
DO $$
BEGIN
    DROP POLICY IF EXISTS "comp_guide_public_read" ON comp_guide;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Step 4: Verify data is accessible (this should show your actual counts)
SELECT
  'VERIFICATION RESULTS:' as message,
  (SELECT COUNT(*) FROM policies) as total_policies,
  (SELECT COUNT(*) FROM policies WHERE status = 'active') as active_policies,
  (SELECT COUNT(*) FROM commissions) as total_commissions,
  (SELECT COUNT(*) FROM expenses) as total_expenses;

-- ============================================================================
-- If you see your actual data counts above, the fix worked!
-- Refresh your dashboard - it should now show metrics correctly.
-- ============================================================================
