-- supabase/migrations/20260127144007_fix_subscription_rls_and_remove_starter.sql
-- Fix RLS policies for subscription admin and remove Starter plan

-- ============================================
-- 1. Fix SELECT policy for super admins
-- ============================================
-- The existing policy only allows viewing active plans.
-- Super admins need to see ALL plans (including inactive) for management.

-- First, drop the restrictive select policy
DROP POLICY IF EXISTS "subscription_plans_select_active" ON subscription_plans;

-- Create a new SELECT policy that allows:
-- - Everyone can see active plans
-- - Super admins can see ALL plans (including inactive)
CREATE POLICY "subscription_plans_select"
  ON subscription_plans FOR SELECT
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- ============================================
-- 2. Remove Starter plan (consolidate to 3 tiers)
-- ============================================
-- New tier structure: Free, Pro, Team
-- Starter features will be absorbed into Pro

-- Step 2a: Get the Pro plan ID for migration
DO $$
DECLARE
  v_pro_plan_id UUID;
  v_starter_plan_id UUID;
BEGIN
  -- Get plan IDs
  SELECT id INTO v_pro_plan_id FROM subscription_plans WHERE name = 'pro';
  SELECT id INTO v_starter_plan_id FROM subscription_plans WHERE name = 'starter';

  -- Only proceed if both plans exist
  IF v_starter_plan_id IS NOT NULL AND v_pro_plan_id IS NOT NULL THEN
    -- Migrate any users on Starter to Pro
    UPDATE user_subscriptions
    SET plan_id = v_pro_plan_id,
        updated_at = now()
    WHERE plan_id = v_starter_plan_id;

    RAISE NOTICE 'Migrated users from Starter to Pro plan';
  END IF;
END $$;

-- Step 2b: Mark Starter plan as inactive (soft delete)
UPDATE subscription_plans
SET is_active = false,
    updated_at = now()
WHERE name = 'starter';

-- Step 2c: Update sort order for remaining plans
UPDATE subscription_plans SET sort_order = 1 WHERE name = 'free';
UPDATE subscription_plans SET sort_order = 2 WHERE name = 'pro';
UPDATE subscription_plans SET sort_order = 3 WHERE name = 'team';

-- ============================================
-- 3. Update Pro plan to include former Starter features
-- ============================================
-- Ensure Pro has all the features that Starter had
UPDATE subscription_plans
SET features = features || jsonb_build_object(
  'expenses', true,
  'targets_basic', true,
  'reports_view', true
)
WHERE name = 'pro';

-- ============================================
-- 4. Log the change in audit table
-- ============================================
INSERT INTO subscription_plan_changes (
  plan_id,
  changed_by,
  change_type,
  old_value,
  new_value,
  notes
)
SELECT
  id,
  (SELECT id FROM user_profiles WHERE is_super_admin = true LIMIT 1),
  'metadata',
  jsonb_build_object('is_active', true),
  jsonb_build_object('is_active', false),
  'Starter plan removed - users migrated to Pro. Consolidating to 3-tier system: Free, Pro, Team.'
FROM subscription_plans
WHERE name = 'starter';
