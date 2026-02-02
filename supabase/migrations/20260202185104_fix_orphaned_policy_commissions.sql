-- supabase/migrations/20260202185104_fix_orphaned_policy_commissions.sql
-- Fix: Create commission records for 10 orphaned policies that were created
-- when the silent error swallowing bug existed in policyService.create
--
-- Affected policies had transient errors during commission creation but
-- the errors were silently caught and the policies were returned as "successful"
-- leaving users unaware their commissions were never created.
--
-- The root cause bug has been fixed - this migration repairs historical data.

-- Create commissions for all orphaned policies using comp_guide rates
INSERT INTO commissions (
  id,
  user_id,
  policy_id,
  amount,
  type,
  status,
  advance_months,
  earned_amount,
  unearned_amount,
  imo_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  p.user_id,
  p.id as policy_id,
  -- Calculate: monthly_premium * commission_rate * 9 months advance
  -- Use 90% fallback if no comp_guide entry (e.g., NULL product_id)
  ROUND((p.monthly_premium * COALESCE(cg.commission_percentage, 0.90) * 9)::numeric, 2) as amount,
  'advance',
  'pending',
  9,
  0,
  ROUND((p.monthly_premium * COALESCE(cg.commission_percentage, 0.90) * 9)::numeric, 2) as unearned_amount,
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  NOW(),
  NOW()
FROM policies p
LEFT JOIN commissions c ON c.policy_id = p.id
LEFT JOIN user_profiles up ON up.id = p.user_id
LEFT JOIN comp_guide cg ON cg.product_id = p.product_id
  AND cg.contract_level = up.contract_level
WHERE c.id IS NULL
  AND p.monthly_premium > 0
  AND p.status = 'active';

-- Log how many were fixed (will show in migration output)
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM policies p
  INNER JOIN commissions c ON c.policy_id = p.id
  WHERE c.created_at >= NOW() - INTERVAL '1 minute';

  RAISE NOTICE 'Fixed % orphaned policies with missing commissions', fixed_count;
END $$;
