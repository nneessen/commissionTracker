-- Fix user_targets with proper default values and clean up RLS

BEGIN;

-- 1. Clean up duplicate RLS policies (keep only the simple ones)
DROP POLICY IF EXISTS "Approved users can view own targets" ON user_targets;
DROP POLICY IF EXISTS "Approved users can create own targets" ON user_targets;
DROP POLICY IF EXISTS "Approved users can update own targets" ON user_targets;
DROP POLICY IF EXISTS "Approved users can delete own targets" ON user_targets;
DROP POLICY IF EXISTS "Users can insert own targets" ON user_targets;

-- 2. Update nick's targets with reasonable default values
UPDATE user_targets
SET
    annual_income_target = 100000,      -- $100k annual goal
    monthly_income_target = 8333,       -- ~$8.3k monthly
    quarterly_income_target = 25000,    -- $25k quarterly
    annual_policies_target = 50,        -- 50 policies per year
    monthly_policies_target = 4,        -- ~4 policies per month
    avg_premium_target = 2500,          -- $2500 average premium
    persistency_13_month_target = 0.80, -- 80% persistency at 13 months
    persistency_25_month_target = 0.75, -- 75% persistency at 25 months
    monthly_expense_target = 2500,      -- $2500 monthly expenses
    expense_ratio_target = 0.30,        -- 30% expense ratio
    updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'nick.neessen@gmail.com')
  AND (annual_income_target = 0 OR annual_income_target IS NULL);

-- 3. Create default targets for ALL users who don't have them
INSERT INTO user_targets (
    user_id,
    annual_income_target,
    monthly_income_target,
    quarterly_income_target,
    annual_policies_target,
    monthly_policies_target,
    avg_premium_target,
    persistency_13_month_target,
    persistency_25_month_target,
    monthly_expense_target,
    expense_ratio_target
)
SELECT
    u.id,
    100000,  -- $100k default annual goal
    8333,    -- Monthly goal
    25000,   -- Quarterly goal
    50,      -- 50 policies/year
    4,       -- 4 policies/month
    2500,    -- $2500 avg premium
    0.80,    -- 80% persistency
    0.75,    -- 75% long-term persistency
    2500,    -- $2500 expenses
    0.30     -- 30% expense ratio
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_targets t WHERE t.user_id = u.id
);

-- 4. Verify the fix
SELECT
    u.email,
    t.annual_income_target,
    t.monthly_income_target,
    t.monthly_policies_target,
    t.avg_premium_target
FROM user_targets t
JOIN auth.users u ON t.user_id = u.id
WHERE u.email = 'nick.neessen@gmail.com';

COMMIT;

-- Show final RLS policy count
SELECT
    'RLS Policies After Cleanup' as status,
    COUNT(*)::text as count
FROM pg_policies
WHERE tablename = 'user_targets';