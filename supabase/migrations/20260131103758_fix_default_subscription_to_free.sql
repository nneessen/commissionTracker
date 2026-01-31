-- supabase/migrations/20260131103758_fix_default_subscription_to_free.sql
-- Fix: New users should be assigned to FREE plan, not Team
-- The previous trigger was giving all users Team plan during temporary free access period
-- Now that temporary access is disabled, new users should get Free plan

-- Update the trigger function to assign Free plan instead of Team
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  -- Get the Free plan ID (default tier for new users)
  SELECT id INTO v_free_plan_id
  FROM subscription_plans
  WHERE name = 'free';

  -- If free plan doesn't exist, log warning and continue (don't fail user creation)
  IF v_free_plan_id IS NULL THEN
    RAISE WARNING 'create_default_subscription: Free plan not found, skipping subscription creation for user %', NEW.id;
    RETURN NEW;
  END IF;

  -- Create subscription with Free plan
  -- No grandfathered_until since they're on free tier
  INSERT INTO user_subscriptions (
    user_id,
    plan_id,
    status,
    billing_interval,
    current_period_start,
    current_period_end
  )
  VALUES (
    NEW.id,
    v_free_plan_id,
    'active',
    'monthly',
    now(),
    NULL  -- Free tier doesn't expire
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log but don't fail user creation - subscription can be added later
    RAISE WARNING 'create_default_subscription: Failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION create_default_subscription() IS
'Creates a default Free subscription for new users.
Updated 2026-01-31 to assign Free plan instead of Team (temporary free access period ended).';

-- Migrate existing users who were incorrectly assigned Team plan
-- Only update those who:
-- 1. Are on Team plan
-- 2. Have grandfathered_until set (indicates they were auto-assigned, not paying customers)
-- 3. Don't have a Lemon Squeezy subscription (not a paid customer)
UPDATE user_subscriptions
SET
  plan_id = (SELECT id FROM subscription_plans WHERE name = 'free'),
  grandfathered_until = NULL,
  current_period_end = NULL
WHERE plan_id = (SELECT id FROM subscription_plans WHERE name = 'team')
  AND grandfathered_until IS NOT NULL
  AND lemon_subscription_id IS NULL
  AND lemon_customer_id IS NULL;
